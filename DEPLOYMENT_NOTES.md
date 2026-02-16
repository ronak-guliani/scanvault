# ScanVault Deployment Notes (Azure API + Railway Web)

## Final architecture
- `apps/api` deployed to Azure Functions: `https://func-scanvault-dev-dev001.azurewebsites.net/api`
- `apps/web` deployed to Railway: `https://web-production-4b258.up.railway.app`
- Web calls API via proxy route (`/api/scanvault`) using `SCANVAULT_API_UPSTREAM_URL`.

## What was configured

### Azure
- Created resource group and deployed infra (Cosmos, Storage, Key Vault, Search).
- Function App was created on **Consumption** plan (Basic plan failed due quota).
- API app settings configured (Cosmos/Storage/Search/JWT/etc).
- Blob CORS configured for Railway origin to allow browser upload PUT/OPTIONS.
- Temporary reliability workaround enabled: `SCANVAULT_INLINE_EXTRACTION=true`.

### Railway
- Linked project/service and deployed monorepo root.
- Added `railway.json` with explicit build/start commands:
  - build: `npm run -w @scanvault/shared build && npm run -w @scanvault/web build`
  - start: `npm run -w @scanvault/web start -- -p $PORT`
- Set env vars (`SCANVAULT_API_UPSTREAM_URL`, `NEXT_PUBLIC_SCANVAULT_API_URL`, `API_JWT_SECRET`, Better Auth vars, Microsoft OAuth vars).

### Microsoft OAuth
- Created App Registration (`scanvault-web`).
- Account type set to include personal Microsoft accounts.
- Redirect URI configured for production callback.
- Client ID/Secret wired into Railway env vars.

## Main issues hit and fixes
- Azure Functions deploy showed success but indexed zero functions.
  - Cause: monorepo/workspace packaging + run-from-package behavior.
  - Fix: publish from standalone packaged folder and `--no-build`.
- Railway build failed with `npm ci` / lockfile errors.
  - Cause: temporary duplicate workspace-like folders in repo path.
  - Fix: remove temp folders; redeploy from repo root.
- Upload failed with `Failed to fetch`.
  - Cause: Azure Blob CORS missing for Railway origin.
  - Fix: added blob CORS rule for `https://web-production-4b258.up.railway.app`.
- Uploads then queued but extraction stalled.
  - Signal: messages moved to `extraction-jobs-poison` after max dequeue.
  - Temporary fix: `SCANVAULT_INLINE_EXTRACTION=true` (bypass queue path).

## Current known caveat
- Queue-based extraction path still needs a proper root-cause fix (message handling/trigger path), even though inline extraction unblocks usage now.

## Post-deploy checks
- Login works via Microsoft OAuth.
- Upload no longer blocked by CORS.
- New uploads should process via inline extraction and move to `ready`.

## Security follow-up
- Rotate any secrets that were pasted in chat/terminal history:
  - `API_JWT_SECRET`
  - `MICROSOFT_CLIENT_SECRET`
  - `BETTER_AUTH_SECRET`
