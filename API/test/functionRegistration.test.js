const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('Azure Functions loads every function module', () => {
  const apiRoot = path.resolve(__dirname, '..')
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8')
  )
  const functionFiles = fs.readdirSync(path.join(apiRoot, 'src', 'functions'))

  assert.equal(packageJson.main, 'src/functions/*.js')
  assert.ok(functionFiles.includes('ping.js'))
  assert.ok(functionFiles.includes('tasks.js'))
})
