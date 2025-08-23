import { removeLeadingSlash, removeTrailingSlash } from './path'

export const getSolutionPath = (path: string) => {
  return '/solutions/' + removeLeadingSlash(path)
}
// Don't forget to also make changes to the file ~/lib/result-html.ts
export const getResultPath = (path: string) => {
  return '/solutions/' + removeLeadingSlash(path)
}
export const getTrialPath = (path: string) => {
  return '/trials/' + removeLeadingSlash(path)
}

export const getSolutionPathByResultPath = (path: string) => {
  const normalizedPath = removeTrailingSlash(path)

  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  return normalizedPath.substring(0, lastSlashIndex)
}

export const getTrialNameByPath = (path: string) => {
  const normalizedPath = removeTrailingSlash(path)

  const lastSlashIndex = normalizedPath.lastIndexOf('/')

  return normalizedPath.substring(lastSlashIndex + 1)
}
