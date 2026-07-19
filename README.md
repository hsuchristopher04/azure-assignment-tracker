# Azure Assignment Tracker

## Goal 
Build a cloud-based assignment tracker where users can create, view, update, delete, and filter assignments.

## Core Features
- View all assignments
- Add a new assignment
- Update assignment status
- Delete an assignment
- Filter by course or status

## Tech Stack
- Frontend: React or HTML/CSS/JS
- Backend: Azure Functions
- Storage: Azure Table Storage
- Hosting: Azure Static Web Apps

## Task Model
- id
- title
- course
- dueDate
- priority
- status
- notes

## Storage Configuration

The API supports two mutually exclusive Azure Table Storage authentication modes.

### Static Web Apps managed API or local Azurite

Set these backend environment variables in Azure Static Web Apps or
`API/local.settings.json`:

```text
TABLES_CONNECTION_STRING=<storage connection string or UseDevelopmentStorage=true>
TASKS_TABLE_NAME=Tasks
```

Never expose `TABLES_CONNECTION_STRING` to the frontend or commit
`local.settings.json`. In Azure, add it under the Static Web App's **Environment
variables** settings.

### Keyless managed identity

When the API runs in an identity-enabled Azure Functions backend, omit
`TABLES_CONNECTION_STRING` and set:

```text
TABLES_ACCOUNT_NAME=<storage account name>
TASKS_TABLE_NAME=Tasks
```

Enable a managed identity on the Function App and grant it the **Storage Table
Data Contributor** role scoped to the storage account. The API then uses
`DefaultAzureCredential`; no storage account key is required. A bring-your-own
Functions backend requires an Azure Static Web Apps plan that supports linked
backends and a separate Functions deployment workflow.
