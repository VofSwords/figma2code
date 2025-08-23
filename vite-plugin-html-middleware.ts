import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { OutgoingHttpHeaders, ServerResponse } from 'node:http'
import type { Options } from 'sirv'
import sirv from 'sirv'
import { resolve, extname } from 'pathe'
import fs from 'node:fs'

const name = 'vite-plugin-html-middleware'

export default function viteHtmlMiddlewarePlugin(): Plugin {
  return {
    name,
    enforce: 'post',
    configureServer(server) {
      return () => {
        server.middlewares.use(serveStaticMiddleware(server))
      }
    },
  }
}

/**
 * The following is modified based on source found in
 * https://github.com/vitejs/vite
 *
 * MIT Licensed
 * Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
 * https://github.com/vitejs/vite/blob/main/LICENSE
 *
 */

const postfixRE = /[?#].*$/
function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

const windowsSlashRE = /\\/g
function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

function withTrailingSlash(path: string): string {
  if (path[path.length - 1] !== '/') {
    return `${path}/`
  }
  return path
}

const ERR_DENIED_FILE = 'ERR_DENIED_FILE'

const sirvOptions = ({
  config,
  getHeaders,
  disableFsServeCheck,
}: {
  config: ResolvedConfig
  getHeaders: () => OutgoingHttpHeaders | undefined
  disableFsServeCheck?: boolean
}): Options & { shouldServe: any } => {
  return {
    dev: true,
    etag: true,
    extensions: [],
    setHeaders(res) {
      const headers = getHeaders()
      if (headers) {
        for (const name in headers) {
          res.setHeader(name, headers[name]!)
        }
      }
    },
    shouldServe: disableFsServeCheck
      ? undefined
      : (filePath: any) => {
          const servingAccessResult = checkLoadingAccess(config, filePath)
          if (servingAccessResult === 'denied') {
            const error: any = new Error('denied access')
            error.code = ERR_DENIED_FILE
            error.path = filePath
            throw error
          }
          if (servingAccessResult === 'fallback') {
            return false
          }
          servingAccessResult satisfies 'allowed'
          return true
        },
  }
}

function serveStaticMiddleware(server: ViteDevServer): Connect.NextHandleFunction {
  const dir = server.config.root
  const serve = sirv(
    dir,
    sirvOptions({
      config: server.config,
      getHeaders: () => server.config.server.headers,
    }),
  )

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function viteServeStaticMiddleware(req, res, next) {
    // only serve the file if it's not an html request or ends with `/`
    // so that html requests can fallthrough to our html middleware for
    // special processing
    // also skip internal requests `/@fs/ /@vite-client` etc...
    const cleanedUrl = cleanUrl(req.url!)
    if (
      cleanedUrl.endsWith('/') ||
      !(extname(cleanedUrl) === '.html') ||
      isInternalRequest(req.url!) ||
      // skip url starting with // as these will be interpreted as
      // scheme relative URLs by new URL() and will not be a valid file path
      req.url?.startsWith('//')
    ) {
      return next()
    }

    const url = new URL(req.url!, 'http://example.com')
    const pathname = decodeURI(url.pathname)

    // apply aliases to static requests as well
    let redirectedPathname: string | undefined
    for (const { find, replacement } of server.config.resolve.alias) {
      const matches = typeof find === 'string' ? pathname.startsWith(find) : find.test(pathname)
      if (matches) {
        redirectedPathname = pathname.replace(find, replacement)
        break
      }
    }
    if (redirectedPathname) {
      // dir is pre-normalized to posix style
      if (redirectedPathname.startsWith(withTrailingSlash(dir))) {
        redirectedPathname = redirectedPathname.slice(dir.length)
      }
    }

    const resolvedPathname = redirectedPathname || pathname
    let fileUrl = resolve(dir, removeLeadingSlash(resolvedPathname))
    if (resolvedPathname.endsWith('/') && fileUrl[fileUrl.length - 1] !== '/') {
      fileUrl = withTrailingSlash(fileUrl)
    }
    if (redirectedPathname) {
      url.pathname = encodeURI(redirectedPathname)
      req.url = url.href.slice(url.origin.length)
    }

    try {
      serve(req, res, next)
    } catch (e: any) {
      if (e && 'code' in e && e.code === ERR_DENIED_FILE) {
        respondWithAccessDenied(e.path, server, res)
        return
      }
      throw e
    }
  }
}

/**
 * Prefix for resolved fs paths, since windows paths may not be valid as URLs.
 */
const FS_PREFIX = `/@fs/`

const CLIENT_PUBLIC_PATH = `/@vite/client`
const ENV_PUBLIC_PATH = `/@vite/env`

export const VALID_ID_PREFIX = `/@id/`

const internalPrefixes = [FS_PREFIX, VALID_ID_PREFIX, CLIENT_PUBLIC_PATH, ENV_PUBLIC_PATH]

const InternalPrefixRE = new RegExp(`^(?:${internalPrefixes.join('|')})`)
const isInternalRequest = (url: string): boolean => InternalPrefixRE.test(url)

/**
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param targetPath - normalized absolute path
 * @param filePath - normalized absolute path
 */
function isFileInTargetPath(targetPath: string, filePath: string) {
  return isSameFilePath(targetPath, filePath) || isParentDirectory(targetPath, filePath)
}

/**
 * Warning: parameters are not validated, only works with normalized absolute paths
 */
function isFileLoadingAllowed(config: ResolvedConfig, filePath: string): boolean {
  const { fs } = config.server

  if (!fs.strict) return true

  if (config.fsDenyGlob(filePath)) return false

  if (config.safeModulePaths.has(filePath)) return true

  if (fs.allow.some((uri) => isFileInTargetPath(uri, filePath))) return true

  return false
}

function checkLoadingAccess(
  config: ResolvedConfig,
  path: string,
): 'allowed' | 'denied' | 'fallback' {
  if (isFileLoadingAllowed(config, slash(path))) {
    return 'allowed'
  }
  if (isFileReadable(path)) {
    return 'denied'
  }
  // if the file doesn't exist, we shouldn't restrict this path as it can
  // be an API call. Middlewares would issue a 404 if the file isn't handled
  return 'fallback'
}

function respondWithAccessDenied(id: string, server: ViteDevServer, res: ServerResponse): void {
  const urlMessage = `The request id "${id}" is outside of Vite serving allow list.`
  const hintMessage = `
${server.config.server.fs.allow.map((i) => `- ${i}`).join('\n')}

Refer to docs https://vite.dev/config/server-options.html#server-fs-allow for configurations and more details.`

  server.config.logger.error(urlMessage)
  server.config.logger.warnOnce(hintMessage + '\n')
  res.statusCode = 403
  res.write('Restricted')
  res.end()
}

function testCaseInsensitiveFS() {
  const currentFileName = name + '.ts'
  const currentFilePath = resolve('./', currentFileName)

  if (!fs.existsSync(currentFilePath)) {
    throw new Error(
      'cannot test case insensitive FS, CLIENT_ENTRY does not point to an existing file: ' +
        currentFilePath,
    )
  }
  return fs.existsSync(currentFilePath.replace('html', 'HTML'))
}

const isCaseInsensitiveFS = testCaseInsensitiveFS()

/**
 * Check if dir is a parent of file
 *
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param dir - normalized absolute path
 * @param file - normalized absolute path
 * @returns true if dir is a parent of file
 */
function isParentDirectory(dir: string, file: string): boolean {
  dir = withTrailingSlash(dir)
  return (
    file.startsWith(dir) ||
    (isCaseInsensitiveFS && file.toLowerCase().startsWith(dir.toLowerCase()))
  )
}

/**
 * Check if 2 file name are identical
 *
 * Warning: parameters are not validated, only works with normalized absolute paths
 *
 * @param file1 - normalized absolute path
 * @param file2 - normalized absolute path
 * @returns true if both files url are identical
 */
function isSameFilePath(file1: string, file2: string): boolean {
  return file1 === file2 || (isCaseInsensitiveFS && file1.toLowerCase() === file2.toLowerCase())
}

function tryStatSync(file: string): fs.Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    return fs.statSync(file, { throwIfNoEntry: false })
  } catch {
    // Ignore errors
  }
}

function isFileReadable(filename: string): boolean {
  if (!tryStatSync(filename)) {
    return false
  }

  try {
    // Check if current process has read permission to the file
    fs.accessSync(filename, fs.constants.R_OK)

    return true
  } catch {
    return false
  }
}

function removeLeadingSlash(str: string): string {
  return str[0] === '/' ? str.slice(1) : str
}
