const { TableClient, TableServiceClient } = require('@azure/data-tables')
const { DefaultAzureCredential } = require('@azure/identity')

const connectionString = process.env.TABLES_CONNECTION_STRING
const accountName = process.env.TABLES_ACCOUNT_NAME
const tableName = process.env.TASKS_TABLE_NAME || 'Tasks'

let tableClient
let serviceClient

if (connectionString) {
  tableClient = TableClient.fromConnectionString(connectionString, tableName)
  serviceClient = TableServiceClient.fromConnectionString(connectionString)
} else if (accountName) {
  if (!/^[a-z0-9]{3,24}$/.test(accountName)) {
    throw new Error('TABLES_ACCOUNT_NAME must be a valid Azure Storage account name')
  }

  const credential = new DefaultAzureCredential()
  const serviceUrl = `https://${accountName}.table.core.windows.net`

  tableClient = new TableClient(serviceUrl, tableName, credential)
  serviceClient = new TableServiceClient(serviceUrl, credential)
} else {
  throw new Error(
    'Missing storage configuration: set TABLES_CONNECTION_STRING or TABLES_ACCOUNT_NAME'
  )
}

async function ensureTasksTable() {
  await serviceClient.createTable(tableName)
}

module.exports = {
  tableClient,
  ensureTasksTable
}
