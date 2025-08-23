export const removeTrailingSlash = (path: string) => {
  if (path.endsWith('/')) {
    return path.slice(0, -1)
  }

  return path
}

export const removeLeadingSlash = (path: string) => {
  if (path.startsWith('/')) {
    return path.slice(1)
  }

  return path
}
