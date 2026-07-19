const test = require('node:test')
const assert = require('node:assert/strict')
const { validateTask } = require('../src/lib/taskValidation')

const validTask = {
  title: '  Write report  ',
  course: ' CSCI 1234 ',
  dueDate: '2026-07-31',
  priority: 'High',
  status: 'In Progress',
  notes: ' Draft introduction. '
}

test('accepts and trims valid task data', () => {
  const result = validateTask(validTask)

  assert.equal(result.errors, undefined)
  assert.equal(result.value.title, 'Write report')
  assert.equal(result.value.course, 'CSCI 1234')
  assert.equal(result.value.notes, 'Draft introduction.')
})

test('rejects missing required fields and invalid enum values', () => {
  const result = validateTask({ priority: 'Urgent', status: 'Started' })

  assert.ok(result.errors.includes('title is required.'))
  assert.ok(result.errors.includes('course is required.'))
  assert.ok(result.errors.includes('dueDate is required.'))
  assert.ok(result.errors.some((error) => error.startsWith('priority must be one of:')))
  assert.ok(result.errors.some((error) => error.startsWith('status must be one of:')))
})

test('rejects impossible dates, oversized values, and unknown fields', () => {
  const result = validateTask({
    ...validTask,
    title: 'x'.repeat(201),
    dueDate: '2026-02-30',
    ownerId: 'someone-else'
  })

  assert.ok(result.errors.includes('title must be 200 characters or fewer.'))
  assert.ok(result.errors.includes('dueDate must be a valid date in YYYY-MM-DD format.'))
  assert.ok(result.errors.includes('Unknown field(s): ownerId.'))
})

test('allows valid partial updates but rejects empty updates', () => {
  assert.deepEqual(
    validateTask({ status: 'Done' }, { partial: true }),
    { value: { status: 'Done' } }
  )

  assert.ok(
    validateTask({}, { partial: true }).errors.includes(
      'At least one task field must be provided.'
    )
  )
})
