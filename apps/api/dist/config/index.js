export const appConfig = {
    cosmosDatabaseName: process.env.COSMOS_DATABASE_NAME ?? "scanvault",
    assetsContainerName: process.env.COSMOS_ASSETS_CONTAINER ?? "assets",
    categoriesContainerName: process.env.COSMOS_CATEGORIES_CONTAINER ?? "categories",
    usersContainerName: process.env.COSMOS_USERS_CONTAINER ?? "users",
    extractionQueueName: process.env.EXTRACTION_QUEUE_NAME ?? "extraction-jobs",
    extractionPoisonQueueName: process.env.EXTRACTION_POISON_QUEUE_NAME ?? "extraction-jobs-poison"
};
export function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
export function getB2CConfig() {
    const jwksUri = process.env.B2C_JWKS_URI;
    const issuer = process.env.B2C_ISSUER;
    const audience = process.env.B2C_AUDIENCE;
    if (!jwksUri || !issuer || !audience)
        return null;
    return { jwksUri, issuer, audience };
}
export function getCosmosConnectionString() {
    return getRequiredEnv("COSMOS_CONNECTION_STRING");
}
export function getStorageConnectionString() {
    return process.env.STORAGE_CONNECTION_STRING ?? getRequiredEnv("AzureWebJobsStorage");
}
export function getKeyVaultUrl() {
    return getRequiredEnv("KEYVAULT_URL");
}
export function getSearchConfig() {
    return {
        endpoint: process.env.SEARCH_ENDPOINT,
        apiKey: process.env.SEARCH_API_KEY,
        indexName: process.env.SEARCH_INDEX_NAME ?? "assets-index"
    };
}
//# sourceMappingURL=index.js.map