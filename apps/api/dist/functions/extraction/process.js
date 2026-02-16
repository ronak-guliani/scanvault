import { markAssetFailed } from "../../services/cosmos.js";
import { processExtractionJob } from "../../services/extraction.js";
export async function processExtractionHandler(message, context) {
    let job;
    try {
        job = typeof message === "string" ? JSON.parse(message) : message;
        await processExtractionJob(job);
    }
    catch (error) {
        if (job?.userId && job.assetId) {
            const errorMessage = error instanceof Error ? error.message : "Extraction failed";
            await markAssetFailed(job.userId, job.assetId, errorMessage);
        }
        throw error;
    }
}
//# sourceMappingURL=process.js.map