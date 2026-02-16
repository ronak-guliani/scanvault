param environment string
param location string
param suffix string

var storageAccountName = toLower('stscanvault${environment}${suffix}')

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  name: '${storageAccount.name}/default'
}

resource extractionJobsQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  name: '${storageAccount.name}/default/extraction-jobs'
}

resource extractionJobsPoisonQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  name: '${storageAccount.name}/default/extraction-jobs-poison'
}

output storageAccountName string = storageAccount.name
