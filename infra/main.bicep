param environment string = 'dev'
param location string = resourceGroup().location
param suffix string
param searchSku string = environment == 'prod' ? 'basic' : 'free'
param deployFunctions bool = true

module cosmos './modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    environment: environment
    location: location
    suffix: suffix
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage'
  params: {
    environment: environment
    location: location
    suffix: suffix
  }
}

module keyvault './modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    environment: environment
    location: location
    suffix: suffix
  }
}

module search './modules/search.bicep' = {
  name: 'search'
  params: {
    environment: environment
    location: location
    suffix: suffix
    sku: searchSku
  }
}

module functions './modules/functions.bicep' = if (deployFunctions) {
  name: 'functions'
  params: {
    environment: environment
    location: location
    suffix: suffix
    storageAccountName: storage.outputs.storageAccountName
  }
}

output cosmosAccountName string = cosmos.outputs.cosmosAccountName
output storageAccountName string = storage.outputs.storageAccountName
output keyVaultName string = keyvault.outputs.keyVaultName
output searchServiceName string = search.outputs.searchServiceName
output functionAppName string = deployFunctions ? functions!.outputs.functionAppName : ''
