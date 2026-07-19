const test = require('node:test')
const assert = require('node:assert/strict')
const { getAuthenticatedUser, partitionKeyForUser } = require('../src/lib/auth')

function requestWithPrincipal(principal) {
  const encoded = Buffer.from(JSON.stringify(principal)).toString('base64')
  return { headers: new Headers({ 'x-ms-client-principal': encoded }) }
}

test('accepts an authenticated Static Web Apps principal', () => {
  const request = requestWithPrincipal({
    userId: 'user-123',
    userRoles: ['anonymous', 'authenticated'],
    identityProvider: 'aad',
    userDetails: 'student@example.com'
  })

  assert.deepEqual(getAuthenticatedUser(request), {
    id: 'user-123',
    identityProvider: 'aad',
    username: 'student@example.com'
  })
})

test('rejects missing, malformed, and unauthenticated principals', () => {
  assert.equal(getAuthenticatedUser({ headers: new Headers() }), null)
  assert.equal(getAuthenticatedUser({
    headers: new Headers({ 'x-ms-client-principal': 'not-base64-json' })
  }), null)
  assert.equal(getAuthenticatedUser(requestWithPrincipal({
    userId: 'user-123',
    userRoles: ['anonymous']
  })), null)
})

test('creates stable and distinct storage partition keys without exposing user IDs', () => {
  const first = partitionKeyForUser('user-123')
  const same = partitionKeyForUser('user-123')
  const other = partitionKeyForUser('user-456')

  assert.equal(first, same)
  assert.notEqual(first, other)
  assert.match(first, /^USER_[a-f0-9]{64}$/)
  assert.equal(first.includes('user-123'), false)
})
