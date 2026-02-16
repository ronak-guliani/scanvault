param environment string
param location string
param suffix string

var accountName = 'cosmos-scanvault-${environment}-${suffix}'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    minimalTlsVersion: 'Tls12'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'scanvault'
  properties: {
    resource: {
      id: 'scanvault'
    }
    options: {}
  }
}

resource assetsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDb
  name: 'assets'
  properties: {
    resource: {
      id: 'assets'
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
        compositeIndexes: [
          [
            {
              path: '/userId'
              order: 'ascending'
            }
            {
              path: '/createdAt'
              order: 'descending'
            }
          ]
          [
            {
              path: '/userId'
              order: 'ascending'
            }
            {
              path: '/categoryId'
              order: 'ascending'
            }
            {
              path: '/createdAt'
              order: 'descending'
            }
          ]
        ]
      }
    }
    options: {}
  }
}

resource categoriesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDb
  name: 'categories'
  properties: {
    resource: {
      id: 'categories'
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/userId/?'
          }
          {
            path: '/slug/?'
          }
          {
            path: '/name/?'
          }
        ]
        excludedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
    options: {}
  }
}

resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDb
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/email/?'
          }
        ]
        excludedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
    options: {}
  }
}

output cosmosAccountName string = cosmosAccount.name
