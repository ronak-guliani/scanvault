export declare function userContainerName(userId: string): string;
export declare function createUploadSas(userId: string, assetId: string, fileName: string): Promise<{
    sasUploadUrl: string;
    blobPath: string;
}>;
export declare function deleteBlobByPath(blobPath: string): Promise<void>;
export declare function readBlobByPath(blobPath: string): Promise<Buffer>;
export declare function createReadSasForBlobPath(blobPath: string): Promise<string>;
