param environment string
param location string
param suffix string
param sku string

var searchServiceName = 'search-scanvault-${environment}-${suffix}'

resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServiceName
  location: location
  sku: {
    name: sku
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
  }
}

output searchServiceName string = searchService.name
