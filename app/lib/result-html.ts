const globImportHtml = import.meta.glob<string>('~/content/solutions/*/*.html', {
  query: '?url',
  import: 'default',
})

const htmlImportByPathMap = new Map<string, (typeof globImportHtml)[string]>()

for (const rawPath in globImportHtml) {
  const importFn = globImportHtml[rawPath]
  if (!importFn) {
    break
  }

  const pathStartIndex = rawPath.lastIndexOf(getResultPath('/'))
  const path = rawPath.slice(pathStartIndex, -'.html'.length)

  htmlImportByPathMap.set(path, importFn)
}

export const queryHtmlResult = (path: string) => {
  const importFn = htmlImportByPathMap.get(removeTrailingSlash(path))

  if (!importFn) {
    throw createError({
      statusCode: 500,
      statusMessage: 'HTML of result not found',
    })
  }
  return importFn()
}
