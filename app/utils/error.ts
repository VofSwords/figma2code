export const showNotFoundError = (path: string) =>
  showError(
    createError({
      statusCode: 404,
      statusMessage: 'Page not found: ' + path,
    }),
  )
