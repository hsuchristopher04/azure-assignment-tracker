const PRIORITIES = new Set(['Low', 'Medium', 'High'])
const STATUSES = new Set(['Not Started', 'In Progress', 'Done'])
const ALLOWED_FIELDS = new Set([
  'title',
  'course',
  'dueDate',
  'priority',
  'status',
  'notes'
])

function validateTask(body, { partial = false } = {}) {
  const errors = []

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a JSON object.'] }
  }

  const unknownFields = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key))
  if (unknownFields.length > 0) {
    errors.push(`Unknown field(s): ${unknownFields.join(', ')}.`)
  }

  if (partial && Object.keys(body).length === 0) {
    errors.push('At least one task field must be provided.')
  }

  validateRequiredText(body, 'title', 200, partial, errors)
  validateRequiredText(body, 'course', 100, partial, errors)
  validateDueDate(body, partial, errors)
  validateEnum(body, 'priority', PRIORITIES, partial, errors)
  validateEnum(body, 'status', STATUSES, partial, errors)

  if (Object.hasOwn(body, 'notes')) {
    if (typeof body.notes !== 'string') {
      errors.push('notes must be a string.')
    } else if (body.notes.length > 2000) {
      errors.push('notes must be 2000 characters or fewer.')
    }
  }

  if (errors.length > 0) return { errors }

  const value = {}
  for (const field of ALLOWED_FIELDS) {
    if (Object.hasOwn(body, field)) {
      value[field] = typeof body[field] === 'string'
        ? body[field].trim()
        : body[field]
    }
  }

  return { value }
}

function validateRequiredText(body, field, maxLength, partial, errors) {
  if (!Object.hasOwn(body, field)) {
    if (!partial) errors.push(`${field} is required.`)
    return
  }

  if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
    errors.push(`${field} must be a non-empty string.`)
  } else if (body[field].trim().length > maxLength) {
    errors.push(`${field} must be ${maxLength} characters or fewer.`)
  }
}

function validateDueDate(body, partial, errors) {
  if (!Object.hasOwn(body, 'dueDate')) {
    if (!partial) errors.push('dueDate is required.')
    return
  }

  if (typeof body.dueDate !== 'string' || !isValidIsoDate(body.dueDate)) {
    errors.push('dueDate must be a valid date in YYYY-MM-DD format.')
  }
}

function isValidIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

function validateEnum(body, field, allowedValues, partial, errors) {
  if (!Object.hasOwn(body, field)) {
    if (!partial) return
    return
  }

  if (typeof body[field] !== 'string' || !allowedValues.has(body[field])) {
    errors.push(`${field} must be one of: ${[...allowedValues].join(', ')}.`)
  }
}

module.exports = {
  validateTask
}
