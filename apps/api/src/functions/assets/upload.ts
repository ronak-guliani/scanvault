import { randomUUID } from "node:crypto";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import type { Asset } from "@scanvault/shared";
import { uploadRequestSchema } from "@scanvault/shared";
import { HttpError } from "../../http/errors.js";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { enforceRateLimit } from "../../middleware/rate-limit.js";
import { createUploadSas } from "../../services/blob.js";
import { ensureDefaultCategories, upsertAsset } from "../../services/cosmos.js";

export async function uploadAssetHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    await enforceRateLimit(auth.userId, "upload-minute");
    await enforceRateLimit(auth.userId, "upload-day");
    const body = uploadRequestSchema.parse(await request.json());

    const categories = await ensureDefaultCategories(auth.userId);
    const generalCategory = categories.find((category) => category.slug === "general");
    if (!generalCategory) {
      throw new HttpError(500, "INTERNAL_ERROR", "General category is missing");
    }

    const assetId = randomUUID();
    const now = new Date().toISOString();
    const { sasUploadUrl, blobPath } = await createUploadSas(auth.userId, assetId, body.fileName);

    const asset: Asset = {
      id: assetId,
      userId: auth.userId,
      originalBlobUrl: blobPath,
      normalizedBlobUrls: [],
      originalFileName: body.fileName,
      mimeType: body.mimeType,
      fileSizeBytes: body.fileSize,
      summary: "",
      categoryId: generalCategory.id,
      fields: [],
      entities: [],
      extractionMode: "ocr",
      status: "uploading",
      createdAt: now,
      updatedAt: now
    };

    await upsertAsset(asset);

    return success(
      {
        assetId,
        sasUploadUrl,
        blobPath
      },
      201
    );
  } catch (error) {
    return errorResponse(error, context);
  }
}
