const { createHash } = require('crypto')

function getAuthenticatedUser(request) {
  const encodedPrincipal = request.headers.get('x-ms-client-principal')

  if (!encodedPrincipal) return null

  try {
    const principal = JSON.parse(
      Buffer.from(encodedPrincipal, 'base64').toString('utf8')
    )

    if (
      typeof principal.userId !== 'string' ||
      principal.userId.length === 0 ||
      !Array.isArray(principal.userRoles) ||
      !principal.userRoles.includes('authenticated')
    ) {
      return null
    }

    return {
      id: principal.userId,
      identityProvider: principal.identityProvider,
      username: principal.userDetails
    }
  } catch {
    return null
  }
}

function partitionKeyForUser(userId) {
  return `USER_${createHash('sha256').update(userId).digest('hex')}`
}

module.exports = {
  getAuthenticatedUser,
  partitionKeyForUser
}
