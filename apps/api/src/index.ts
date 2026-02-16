import { app } from "@azure/functions";
import { authCallbackHandler } from "./functions/auth/callback.js";
import { authLoginHandler } from "./functions/auth/login.js";
import { authLogoutHandler } from "./functions/auth/logout.js";
import { authRefreshHandler } from "./functions/auth/refresh.js";
import { confirmUploadHandler } from "./functions/assets/confirm.js";
import { deleteAssetHandler } from "./functions/assets/delete.js";
import { getAssetHandler } from "./functions/assets/get.js";
import { listAssetsHandler } from "./functions/assets/list.js";
import { updateAssetCategoryHandler } from "./functions/assets/update-category.js";
import { updateAssetExtractionHandler } from "./functions/assets/update-extraction.js";
import { uploadAssetHandler } from "./functions/assets/upload.js";
import { getAssetViewUrlHandler } from "./functions/assets/view-url.js";
import { createCategoryHandler } from "./functions/categories/create.js";
import { deleteCategoryHandler } from "./functions/categories/delete.js";
import { listCategoriesHandler } from "./functions/categories/list.js";
import { updateCategoryHandler } from "./functions/categories/update.js";
import { processExtractionHandler } from "./functions/extraction/process.js";
import { searchAssetsHandler } from "./functions/search/query.js";
import { getSettingsHandler } from "./functions/settings/get.js";
import { updateSettingsHandler } from "./functions/settings/update.js";

app.http("assets-upload", {
  authLevel: "anonymous",
  methods: ["POST"],
  route: "assets/upload",
  handler: uploadAssetHandler
});

app.http("auth-callback", {
  authLevel: "anonymous",
  methods: ["POST"],
  route: "auth/callback",
  handler: authCallbackHandler
});

app.http("auth-login", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "auth/login",
  handler: authLoginHandler
});

app.http("auth-refresh", {
  authLevel: "anonymous",
  methods: ["POST"],
  route: "auth/refresh",
  handler: authRefreshHandler
});

app.http("auth-logout", {
  authLevel: "anonymous",
  methods: ["POST"],
  route: "auth/logout",
  handler: authLogoutHandler
});

app.http("assets-upload-confirm", {
  authLevel: "anonymous",
  methods: ["POST"],
  route: "assets/upload/confirm",
  handler: confirmUploadHandler
});

app.http("assets-get", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "assets/{id}",
  handler: getAssetHandler
});

app.http("assets-view-url", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "assets/{id}/view-url",
  handler: getAssetViewUrlHandler
});

app.http("assets-list", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "assets",
  handler: listAssetsHandler
});

app.http("assets-delete", {
  authLevel: "anonymous",
  methods: ["DELETE"],
  route: "assets/{id}",
  handler: deleteAssetHandler
});

app.http("assets-category-update", {
  authLevel: "anonymous",
  methods: ["PATCH"],
  route: "assets/{id}/category",
  handler: updateAssetCategoryHandler
});

app.http("assets-extraction-update", {
  authLevel: "anonymous",
  methods: ["PATCH"],
  route: "assets/{id}/extraction",
  handler: updateAssetExtractionHandler
});

app.http("categories-list", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "categories",
  handler: listCategoriesHandler
});

app.http("categories-create", {
  authLevel: "anonymous",
  methods: ["POST"],
  route: "categories",
  handler: createCategoryHandler
});

app.http("categories-update", {
  authLevel: "anonymous",
  methods: ["PATCH"],
  route: "categories/{id}",
  handler: updateCategoryHandler
});

app.http("categories-delete", {
  authLevel: "anonymous",
  methods: ["DELETE"],
  route: "categories/{id}",
  handler: deleteCategoryHandler
});

app.http("search-query", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "search",
  handler: searchAssetsHandler
});

app.http("settings-get", {
  authLevel: "anonymous",
  methods: ["GET"],
  route: "settings",
  handler: getSettingsHandler
});

app.http("settings-update", {
  authLevel: "anonymous",
  methods: ["PATCH"],
  route: "settings",
  handler: updateSettingsHandler
});

app.storageQueue("extraction-process", {
  queueName: "extraction-jobs",
  connection: "AzureWebJobsStorage",
  handler: processExtractionHandler
});
