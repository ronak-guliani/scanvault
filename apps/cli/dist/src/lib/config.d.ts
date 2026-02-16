export interface VaultConfig {
    apiBaseUrl: string;
    copilotExtractorCommand?: string;
}
export interface VaultCredentials {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    updatedAt: string;
}
export declare function getConfig(): Promise<VaultConfig>;
export declare function setConfig(config: VaultConfig): Promise<void>;
export declare function getCredentials(): Promise<VaultCredentials | null>;
export declare function setCredentials(credentials: VaultCredentials): Promise<void>;
export declare function clearCredentials(): Promise<void>;
export declare function hasCredentialsFile(): Promise<boolean>;
export declare function assertVaultDirPermissions(): Promise<void>;
