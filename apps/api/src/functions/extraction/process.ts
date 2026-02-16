import type { InvocationContext } from "@azure/functions";
import type { ExtractionJob } from "@scanvault/shared";
import { markAssetFailed } from "../../services/cosmos.js";
import { processExtractionJob } from "../../services/extraction.js";

export async function processExtractionHandler(message: unknown, context: InvocationContext): Promise<void> {
  let job: ExtractionJob | undefined;

  try {
    job = typeof message === "string" ? (JSON.parse(message) as ExtractionJob) : (message as ExtractionJob);
    await processExtractionJob(job);
  } catch (error) {
    if (job?.userId && job.assetId) {
      const errorMessage = error instanceof Error ? error.message : "Extraction failed";
      await markAssetFailed(job.userId, job.assetId, errorMessage);
    }

    throw error;
  }
}
