import { randomUUID } from "node:crypto";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createCategorySchema } from "@scanvault/shared";
import { errorResponse, success } from "../../http/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { ensureDefaultCategories, upsertCategory } from "../../services/cosmos.js";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function createCategoryHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const auth = await requireAuth(request);
    const body = createCategorySchema.parse(await request.json());

    const existing = await ensureDefaultCategories(auth.userId);
    const now = new Date().toISOString();

    const baseSlug = toSlug(body.name);
    const slugExists = existing.some((category) => category.slug === baseSlug);
    const finalSlug = slugExists ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug;

    const category = {
      id: randomUUID(),
      userId: auth.userId,
      name: body.name,
      slug: finalSlug,
      isDefault: false,
      fieldPriorities: body.fieldPriorities,
      assetCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await upsertCategory(category);

    return success(category, 201);
  } catch (error) {
    return errorResponse(error, context);
  }
}
