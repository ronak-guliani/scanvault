export declare const appConfig: {
    cosmosDatabaseName: string;
    assetsContainerName: string;
    categoriesContainerName: string;
    usersContainerName: string;
    extractionQueueName: string;
    extractionPoisonQueueName: string;
};
export declare function getRequiredEnv(name: string): string;
export declare function getB2CConfig(): {
    jwksUri: string;
    issuer: string;
    audience: string;
} | null;
export declare function getCosmosConnectionString(): string;
export declare function getStorageConnectionString(): string;
export declare function getKeyVaultUrl(): string;
export declare function getSearchConfig(): {
    endpoint?: string;
    apiKey?: string;
    indexName: string;
};
