const { app } = require('@azure/functions')
const { randomUUID } = require('crypto')
const { tableClient, ensureTasksTable } = require('../lib/tableClient')

const PARTITION_KEY = 'TASK'

function toTaskEntity(task) {
  return {
    partitionKey: PARTITION_KEY,
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
  handler: async () => {
    await ensureTasksTable()

    const tasks = []
    const entities = tableClient.listEntities()

    for await (const entity of entities) {
      if (entity.partitionKey === PARTITION_KEY) {
        tasks.push(fromTaskEntity(entity))
      }
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
    await ensureTasksTable()

    const body = await request.json()
    const id = randomUUID()

    const entity = toTaskEntity({
      id,
      title: body.title,
      course: body.course,
      dueDate: body.dueDate,
      priority: body.priority,
      status: body.status,
      notes: body.notes
    })

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
    await ensureTasksTable()

    const { id } = request.params
    const body = await request.json()

    let existing
    try {
      existing = await tableClient.getEntity(PARTITION_KEY, id)
    } catch {
      return {
        status: 404,
        jsonBody: { error: 'Task not found' }
      }
    }

    const updatedEntity = {
      partitionKey: PARTITION_KEY,
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
    await ensureTasksTable()

    const { id } = request.params

    try {
      await tableClient.deleteEntity(PARTITION_KEY, id)
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
