const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const configPath = path.resolve(
  __dirname,
  '..',
  '..',
  'frontend',
  'public',
  'staticwebapp.config.json'
)

test('Static Web Apps requires authentication for the app and API', () => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const apiRoute = config.routes.find((rule) => rule.route === '/api/*')
  const appRoute = config.routes.find((rule) => rule.route === '/*')

  assert.deepEqual(apiRoute.allowedRoles, ['authenticated'])
  assert.deepEqual(appRoute.allowedRoles, ['authenticated'])
  assert.equal(config.responseOverrides['401'].redirect, '/.auth/login/aad')
})

test('Static Web Apps sends the required security headers', () => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const headers = config.globalHeaders

  assert.match(headers['Content-Security-Policy'], /default-src 'self'/)
  assert.match(headers['Content-Security-Policy'], /object-src 'none'/)
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/)
  assert.equal(headers['X-Content-Type-Options'], 'nosniff')
  assert.equal(headers['X-Frame-Options'], 'DENY')
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()')
  assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000')
})
