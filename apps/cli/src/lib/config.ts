import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

const VAULT_DIR = join(homedir(), ".vault");
const CONFIG_PATH = join(VAULT_DIR, "config.json");
const CREDENTIALS_PATH = join(VAULT_DIR, "credentials.json");

const DEFAULT_CONFIG: VaultConfig = {
  apiBaseUrl:
    process.env.VAULT_API_BASE_URL ??
    "https://func-scanvault-dev-a9e0bre8hfapg4h4.westus-01.azurewebsites.net/api",
  copilotExtractorCommand: process.env.VAULT_COPILOT_EXTRACTOR_CMD
};

async function ensureVaultDir(): Promise<void> {
  await mkdir(VAULT_DIR, { recursive: true, mode: 0o700 });
  await chmod(VAULT_DIR, 0o700);
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJson(path: string, value: unknown, mode: number): Promise<void> {
  await ensureVaultDir();
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode });
  await chmod(path, mode);
}

export async function getConfig(): Promise<VaultConfig> {
  const config = await readJson<VaultConfig>(CONFIG_PATH);
  return {
    ...DEFAULT_CONFIG,
    ...(config ?? {})
  };
}

export async function setConfig(config: VaultConfig): Promise<void> {
  await writeJson(CONFIG_PATH, config, 0o600);
}

export async function getCredentials(): Promise<VaultCredentials | null> {
  return readJson<VaultCredentials>(CREDENTIALS_PATH);
}

export async function setCredentials(credentials: VaultCredentials): Promise<void> {
  await writeJson(CREDENTIALS_PATH, credentials, 0o600);
}

export async function clearCredentials(): Promise<void> {
  await rm(CREDENTIALS_PATH, { force: true });
}

export async function hasCredentialsFile(): Promise<boolean> {
  try {
    await ensureVaultDir();
    await readFile(CREDENTIALS_PATH, "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function assertVaultDirPermissions(): Promise<void> {
  await ensureVaultDir();
  try {
    await chmod(VAULT_DIR, fsConstants.S_IRUSR | fsConstants.S_IWUSR | fsConstants.S_IXUSR);
  } catch {
    // Best effort.
  }
}
