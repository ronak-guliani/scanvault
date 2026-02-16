import { BlobSASPermissions, BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters } from "@azure/storage-blob";
import { getStorageConnectionString } from "../config/index.js";
import { HttpError } from "../http/errors.js";
let blobServiceClient;
let sharedKeyCredential;
let accountName;
function parseConnectionString(connectionString) {
    return Object.fromEntries(connectionString
        .split(";")
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => {
        const [key, ...rest] = segment.split("=");
        return [key, rest.join("=")];
    }));
}
function ensureStorageClients() {
    if (blobServiceClient && sharedKeyCredential && accountName) {
        return { serviceClient: blobServiceClient, credential: sharedKeyCredential, account: accountName };
    }
    const connectionString = getStorageConnectionString();
    const parsed = parseConnectionString(connectionString);
    const parsedAccountName = parsed.AccountName;
    const accountKey = parsed.AccountKey;
    if (!parsedAccountName || !accountKey) {
        throw new HttpError(500, "INTERNAL_ERROR", "Storage connection string must include AccountName and AccountKey for SAS generation");
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    sharedKeyCredential = new StorageSharedKeyCredential(parsedAccountName, accountKey);
    accountName = parsedAccountName;
    return {
        serviceClient: blobServiceClient,
        credential: sharedKeyCredential,
        account: accountName
    };
}
function sanitizeFileName(fileName) {
    return fileName.replace(/[^A-Za-z0-9._-]/g, "-");
}
export function userContainerName(userId) {
    const normalizedUser = userId.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return `user-${normalizedUser}`.slice(0, 63);
}
export async function createUploadSas(userId, assetId, fileName) {
    const { serviceClient, credential, account } = ensureStorageClients();
    const containerName = userContainerName(userId);
    const blobName = `${assetId}/${sanitizeFileName(fileName)}`;
    const containerClient = serviceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const startsOn = new Date(Date.now() - 5 * 60 * 1000);
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
    const sas = generateBlobSASQueryParameters({
        containerName,
        blobName,
        startsOn,
        expiresOn,
        permissions: BlobSASPermissions.parse("cw")
    }, credential).toString();
    return {
        sasUploadUrl: `https://${account}.blob.core.windows.net/${containerName}/${blobName}?${sas}`,
        blobPath: `${containerName}/${blobName}`
    };
}
export async function deleteBlobByPath(blobPath) {
    const { serviceClient } = ensureStorageClients();
    const [containerName, ...blobParts] = blobPath.split("/");
    const blobName = blobParts.join("/");
    if (!containerName || !blobName) {
        return;
    }
    const blobClient = serviceClient.getContainerClient(containerName).getBlobClient(blobName);
    await blobClient.deleteIfExists();
}
export async function readBlobByPath(blobPath) {
    const { serviceClient } = ensureStorageClients();
    const [containerName, ...blobParts] = blobPath.split("/");
    const blobName = blobParts.join("/");
    if (!containerName || !blobName) {
        throw new HttpError(400, "VALIDATION_ERROR", "Invalid blob path");
    }
    const blobClient = serviceClient.getContainerClient(containerName).getBlobClient(blobName);
    const download = await blobClient.download();
    const stream = download.readableStreamBody;
    if (!stream) {
        return Buffer.alloc(0);
    }
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
//# sourceMappingURL=blob.js.map