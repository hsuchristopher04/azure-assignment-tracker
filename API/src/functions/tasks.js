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
  handler: async (request) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

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

    return {
      status: 200,
      jsonBody: tasks
    }
  }
})

app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    const parsedBody = await parseJsonBody(request)
    if (parsedBody.error) return parsedBody.error

    const validation = validateTask(parsedBody.value)
    if (validation.errors) return validationResponse(validation.errors)

    await ensureTasksTable()
    const id = randomUUID()

    const entity = toTaskEntity({
      id,
      ...validation.value
    }, partitionKey)

    await tableClient.createEntity(entity)

    return {
      status: 201,
      jsonBody: fromTaskEntity(entity)
    }
  }
})

app.http('updateTask', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: async (request) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    const parsedBody = await parseJsonBody(request)
    if (parsedBody.error) return parsedBody.error

    const validation = validateTask(parsedBody.value, { partial: true })
    if (validation.errors) return validationResponse(validation.errors)

    await ensureTasksTable()

    const { id } = request.params
    const body = validation.value

    let existing
    try {
      existing = await tableClient.getEntity(partitionKey, id)
    } catch {
      return {
        status: 404,
        jsonBody: { error: 'Task not found' }
      }
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

    return {
      status: 200,
      jsonBody: fromTaskEntity(updatedEntity)
    }
  }
})

app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: async (request) => {
    const partitionKey = getUserPartitionKey(request)
    if (!partitionKey) return unauthorizedResponse()

    await ensureTasksTable()

    const { id } = request.params

    try {
      await tableClient.deleteEntity(partitionKey, id)
    } catch {
      return {
        status: 404,
        jsonBody: { error: 'Task not found' }
      }
    }

    return {
      status: 204
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

function unauthorizedResponse() {
  return {
    status: 401,
    jsonBody: { error: 'Authentication required.' }
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
