import { QueueServiceClient } from "@azure/storage-queue";
import { appConfig, getStorageConnectionString } from "../config/index.js";
let queueServiceClient;
function getQueueServiceClient() {
    if (!queueServiceClient) {
        queueServiceClient = QueueServiceClient.fromConnectionString(getStorageConnectionString());
    }
    return queueServiceClient;
}
export async function enqueueExtractionJob(job) {
    const queueClient = getQueueServiceClient().getQueueClient(appConfig.extractionQueueName);
    await queueClient.createIfNotExists();
    await queueClient.sendMessage(JSON.stringify(job));
}
//# sourceMappingURL=queue.js.map