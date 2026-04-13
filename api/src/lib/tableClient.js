const { TableClient, TableServiceClient } = require('@azure/data-tables')

const connectionString = process.env.TABLES_CONNECTION_STRING
const tableName = process.env.TASKS_TABLE_NAME || 'Tasks'

if (!connectionString) {
  throw new Error('Missing TABLES_CONNECTION_STRING')
}

const tableClient = TableClient.fromConnectionString(connectionString, tableName)
const serviceClient = TableServiceClient.fromConnectionString(connectionString)

async function ensureTasksTable() {
  await serviceClient.createTable(tableName)
}

module.exports = {
  tableClient,
  ensureTasksTable
}
