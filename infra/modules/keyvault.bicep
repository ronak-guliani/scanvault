param environment string
param location string
param suffix string

var keyVaultName = 'kv-scanvault-${environment}-${suffix}'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForTemplateDeployment: false
    enabledForDiskEncryption: false
    publicNetworkAccess: 'Enabled'
    softDeleteRetentionInDays: 7
  }
}

output keyVaultName string = keyVault.name
