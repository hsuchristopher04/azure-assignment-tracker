const { app } = require('@azure/functions')
const { randomUUID } = require('crypto')
const { tableClient, ensureTasksTable } = require('../lib/tableClient')
const { getAuthenticatedUser, partitionKeyForUser } = require('../lib/auth')
const { validateTask } = require('../lib/taskValidation')

function toTaskEntity(task, partitionKey) {
  return {
    partitionKey,
    rowKey: task.id,
    title: task.title ?? '',
    course: task.course ?? '',
    dueDate: task.dueDate ?? '',
    priority: task.priority ?? 'Medium',
    status: task.status ?? 'Not Started',
    notes: task.notes ?? ''
  }
}

function fromTaskEntity(entity) {
  return {
    id: entity.rowKey,
    title: entity.title ?? '',
    course: entity.course ?? '',
    dueDate: entity.dueDate ?? '',
    priority: entity.priority ?? 'Medium',
    status: entity.status ?? 'Not Started',
    notes: entity.notes ?? ''
  }
}

app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request, context) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    try {
      await ensureTasksTable()

      const tasks = []
      const entities = tableClient.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${partitionKey}'`
        }
      })

      for await (const entity of entities) {
        tasks.push(fromTaskEntity(entity))
      }

      return { status: 200, jsonBody: tasks }
    } catch (error) {
      return storageErrorResponse(error, context, 'list tasks')
    }
  }
})

app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request, context) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    const parsedBody = await parseJsonBody(request)
    if (parsedBody.error) return parsedBody.error

    const validation = validateTask(parsedBody.value)
    if (validation.errors) return validationResponse(validation.errors)

    try {
      await ensureTasksTable()

      const entity = toTaskEntity({
        id: randomUUID(),
        ...validation.value
      }, partitionKey)

      await tableClient.createEntity(entity)

      return { status: 201, jsonBody: fromTaskEntity(entity) }
    } catch (error) {
      return storageErrorResponse(error, context, 'create task')
    }
  }
})

app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: async (request, context) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    const parsedBody = await parseJsonBody(request)
    if (parsedBody.error) return parsedBody.error

    const validation = validateTask(parsedBody.value, { partial: true })
    if (validation.errors) return validationResponse(validation.errors)

    const { id } = request.params
    const body = validation.value

    try {
      await ensureTasksTable()

      let existing
      try {
        existing = await tableClient.getEntity(partitionKey, id)
      } catch (error) {
        if (isResourceNotFound(error)) return notFoundResponse()
        throw error
      }

      const updatedEntity = {
        partitionKey,
        rowKey: id,
        title: body.title ?? existing.title ?? '',
        course: body.course ?? existing.course ?? '',
        dueDate: body.dueDate ?? existing.dueDate ?? '',
        priority: body.priority ?? existing.priority ?? 'Medium',
        status: body.status ?? existing.status ?? 'Not Started',
        notes: body.notes ?? existing.notes ?? ''
      }

      await tableClient.upsertEntity(updatedEntity, 'Replace')

      return { status: 200, jsonBody: fromTaskEntity(updatedEntity) }
    } catch (error) {
      return storageErrorResponse(error, context, 'update task')
    }
  }
})

app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: async (request, context) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    try {
      await ensureTasksTable()
      await tableClient.deleteEntity(partitionKey, request.params.id)

      return { status: 204 }
    } catch (error) {
      if (isResourceNotFound(error)) return notFoundResponse()
      return storageErrorResponse(error, context, 'delete task')
    }
  }
})

function getUserPartitionKey(request) {
  const user = getAuthenticatedUser(request)
  return user ? partitionKeyForUser(user.id) : null
}

async function parseJsonBody(request) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return {
      error: validationResponse(['Content-Type must be application/json.'])
    }
  }

  try {
    return { value: await request.json() }
  } catch {
    return {
      error: validationResponse(['Request body must contain valid JSON.'])
    }
  }
}

function isResourceNotFound(error) {
  return error?.statusCode === 404 || error?.code === 'ResourceNotFound'
}

function unauthorizedResponse() {
  return {
    status: 401,
    jsonBody: { error: 'Authentication required.' }
  }
}

function notFoundResponse() {
  return {
    status: 404,
    jsonBody: { error: 'Task not found.' }
  }
}

function validationResponse(details) {
  return {
    status: 400,
    jsonBody: {
      error: 'Invalid task data.',
      details
    }
  }
}

function storageErrorResponse(error, context, operation) {
  context.error('Azure Table Storage operation failed.', {
    operation,
    code: error?.code || 'Unknown',
    statusCode: error?.statusCode || 500
  })

  if (error?.statusCode === 401 || error?.statusCode === 403) {
    return {
      status: 503,
      jsonBody: { error: 'The assignment store is temporarily unavailable.' }
    }
  }

  if (error?.statusCode === 429) {
    return {
      status: 503,
      headers: { 'Retry-After': '5' },
      jsonBody: { error: 'The assignment store is busy. Please try again.' }
    }
  }

  return {
    status: 500,
    jsonBody: { error: 'Unable to complete the storage operation.' }
  }
}
