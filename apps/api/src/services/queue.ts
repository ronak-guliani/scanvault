import { QueueServiceClient } from "@azure/storage-queue";
import type { ExtractionJob } from "@scanvault/shared";
import { appConfig, getStorageConnectionString } from "../config/index.js";

let queueServiceClient: QueueServiceClient | undefined;

function getQueueServiceClient(): QueueServiceClient {
  if (!queueServiceClient) {
    queueServiceClient = QueueServiceClient.fromConnectionString(getStorageConnectionString());
  }
  return queueServiceClient;
}

export async function enqueueExtractionJob(job: ExtractionJob): Promise<void> {
  const queueClient = getQueueServiceClient().getQueueClient(appConfig.extractionQueueName);
  await queueClient.createIfNotExists();
  await queueClient.sendMessage(JSON.stringify(job));
}
