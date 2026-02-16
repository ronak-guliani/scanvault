import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { getKeyVaultUrl } from "../config/index.js";
let secretClient;
function getSecretClient() {
    if (!secretClient) {
        secretClient = new SecretClient(getKeyVaultUrl(), new DefaultAzureCredential());
    }
    return secretClient;
}
function aiKeySecretName(userId) {
    const normalized = userId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return `ai-key-${normalized}`.slice(0, 127);
}
export async function setUserAIKey(userId, apiKey) {
    const secretName = aiKeySecretName(userId);
    await getSecretClient().setSecret(secretName, apiKey);
    return secretName;
}
export async function getUserAIKey(secretName) {
    const secret = await getSecretClient().getSecret(secretName);
    if (!secret.value) {
        throw new Error(`Key Vault secret ${secretName} has no value`);
    }
    return secret.value;
}
//# sourceMappingURL=keyvault.js.map