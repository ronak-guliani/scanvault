# VaultScan — Implementation Plan

## 1. Project Overview

VaultScan is a secure document intelligence platform that transforms unstructured files (images, PDFs, screenshots, documents) into structured, searchable, and programmable data. Users upload files, VaultScan extracts key numbers, entities, and metadata using AI or OCR, and makes everything searchable via a web UI, mobile app, and CLI tool.

### Build Order (Sequential Priority)
1. **Backend API** (Azure Functions + Cosmos DB + Blob Storage)
2. **CLI Tool** (`vault` command)
3. **Web App** (Next.js)
4. **Mobile App** (Expo React Native — iOS/Android)
5. **Desktop App** (Expo Desktop)

### Key Architectural Decisions
| Decision | Choice |
|---|---|
| Language | TypeScript (Node.js) everywhere |
| Repo structure | Monorepo (Turborepo) |
| Backend hosting | Azure Functions + Azure Static Web Apps |
| Database | Azure Cosmos DB (NoSQL / SQL API) |
| File storage | Azure Blob Storage (container per user) |
| Search | Azure AI Search + Cosmos DB |
| Auth | Azure Entra ID B2C (email+social+magic link) |
| Secrets | Azure Key Vault |
| OCR | Tesseract.js (client-side) |
| AI providers | OpenAI, Anthropic, Google (user-configured) |
| IaC | Bicep |
| Web framework | Next.js |
| Mobile framework | Expo (React Native) |
| Cost | Optimize for Azure free/low-cost tiers |

---

## 2. Monorepo Structure

```
scanvault/
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-api.yml
│       ├── deploy-web.yml
│       └── deploy-cli.yml
├── infra/
│   ├── main.bicep
│   ├── modules/
│   │   ├── cosmos.bicep
│   │   ├── storage.bicep
│   │   ├── functions.bicep
│   │   ├── keyvault.bicep
│   │   ├── search.bicep
│   │   ├── b2c.bicep
│   │   └── staticwebapp.bicep
│   └── parameters/
│       ├── dev.bicepparam
│       └── prod.bicepparam
├── packages/
│   ├── shared/                    # Shared types, schemas, utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── asset.ts
│   │   │   │   ├── category.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── extraction.ts
│   │   │   │   └── search.ts
│   │   │   ├── schemas/           # Zod validation schemas
│   │   │   │   ├── asset.ts
│   │   │   │   ├── category.ts
│   │   │   │   ├── extraction.ts
│   │   │   │   └── search.ts
│   │   │   ├── constants/
│   │   │   │   ├── categories.ts
│   │   │   │   └── limits.ts
│   │   │   └── utils/
│   │   │       ├── search-parser.ts
│   │   │       └── field-helpers.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── ai-extract/                # AI provider abstraction
│       ├── src/
│       │   ├── providers/
│       │   │   ├── openai.ts
│       │   │   ├── anthropic.ts
│       │   │   └── google.ts
│       │   ├── types.ts
│       │   ├── prompt.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── api/                       # Azure Functions API
│   │   ├── src/
│   │   │   ├── functions/
│   │   │   │   ├── auth/
│   │   │   │   │   └── callback.ts
│   │   │   │   ├── assets/
│   │   │   │   │   ├── upload.ts
│   │   │   │   │   ├── get.ts
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── delete.ts
│   │   │   │   │   └── export.ts
│   │   │   │   ├── categories/
│   │   │   │   │   ├── list.ts
│   │   │   │   │   ├── create.ts
│   │   │   │   │   ├── update.ts
│   │   │   │   │   └── delete.ts
│   │   │   │   ├── search/
│   │   │   │   │   └── query.ts
│   │   │   │   ├── extraction/
│   │   │   │   │   ├── process.ts       # Queue-triggered
│   │   │   │   │   └── status.ts
│   │   │   │   └── settings/
│   │   │   │       ├── get.ts
│   │   │   │       └── update.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── validation.ts
│   │   │   ├── services/
│   │   │   │   ├── cosmos.ts
│   │   │   │   ├── blob.ts
│   │   │   │   ├── keyvault.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── extraction.ts
│   │   │   │   ├── ocr.ts
│   │   │   │   ├── pdf.ts
│   │   │   │   └── queue.ts
│   │   │   └── config/
│   │   │       └── index.ts
│   │   ├── host.json
│   │   ├── local.settings.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/                       # CLI tool
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── login.ts
│   │   │   │   ├── logout.ts
│   │   │   │   ├── upload.ts
│   │   │   │   ├── search.ts
│   │   │   │   ├── extract.ts
│   │   │   │   ├── export.ts
│   │   │   │   ├── list.ts
│   │   │   │   └── config.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── output.ts
│   │   │   └── index.ts
│   │   ├── bin/
│   │   │   └── vault.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/                       # Next.js web app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── assets/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── categories/
│   │   │   │   ├── search/
│   │   │   │   └── settings/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── upload/
│   │   │   │   ├── asset-card/
│   │   │   │   ├── search-bar/
│   │   │   │   ├── category-nav/
│   │   │   │   └── field-display/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── api.ts
│   │   │   │   └── auth.ts
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/                    # Expo React Native app
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx       # Dashboard
│       │   │   ├── upload.tsx
│       │   │   ├── search.tsx
│       │   │   ├── categories.tsx
│       │   │   └── settings.tsx
│       │   ├── asset/
│       │   │   └── [id].tsx
│       │   └── _layout.tsx
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
└── tests/
    ├── api/
    ├── cli/
    ├── shared/
    └── ai-extract/
```

---

## 3. Data Models

### 3.1 Asset Document (Cosmos DB)

**Container:** `assets`
**Partition key:** `/userId`

```typescript
interface Asset {
  id: string;                      // UUID
  userId: string;                  // Partition key — user who owns this
  originalBlobUrl: string;         // Path in user's blob container
  normalizedBlobUrls: string[];    // Converted image paths (for PDFs: one per page)
  originalFileName: string;
  mimeType: string;                // "image/png" | "application/pdf" | etc
  fileSizeBytes: number;
  summary: string;                 // 2-sentence summary
  categoryId: string;              // Reference to category
  fields: ExtractedField[];
  entities: string[];              // ["Amazon", "Visa", ...]
  extractionMode: "ai" | "ocr";   // Which mode was used
  extractionProvider?: string;     // "openai" | "anthropic" | "google" (if AI)
  status: "uploading" | "processing" | "ready" | "failed";
  errorMessage?: string;           // If status === "failed"
  rawOcrText?: string;             // Full OCR text for search fallback
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}

interface ExtractedField {
  key: string;                     // "total", "date", "invoice_number", etc
  value: string | number;
  unit?: string;                   // "USD", "kg", "miles", etc
  confidence: number;              // 0.0 – 1.0
  source: "ai" | "ocr";
}
```

### 3.2 Category Document (Cosmos DB)

**Container:** `categories`
**Partition key:** `/userId`

```typescript
interface Category {
  id: string;                      // UUID
  userId: string;                  // Partition key
  name: string;                    // Display name
  slug: string;                    // URL-safe identifier ("finance", "work")
  isDefault: boolean;              // Whether this is a system default
  fieldPriorities: string[];       // Ordered list of preferred field keys for display
  assetCount: number;              // Denormalized count
  createdAt: string;
  updatedAt: string;
}
```

**Default categories (seeded on user creation):**
1. **Finance** — receipts, invoices, bills, transactions (`fieldPriorities: ["total", "vendor", "date"]`)
2. **Work** — contracts, timesheets, pay stubs (`fieldPriorities: ["employer", "date", "amount"]`)
3. **Health** — medical records, prescriptions, lab results (`fieldPriorities: ["provider", "date", "metric"]`)
4. **Fitness** — workout screenshots, nutrition logs (`fieldPriorities: ["calories", "weight", "duration"]`)
5. **Travel** — boarding passes, hotel confirmations, itineraries (`fieldPriorities: ["destination", "date", "cost"]`)
6. **General** — catch-all for uncategorizable assets (`fieldPriorities: ["date"]`)

### 3.3 User Settings Document (Cosmos DB)

**Container:** `users`
**Partition key:** `/id`

```typescript
interface UserSettings {
  id: string;                      // Same as userId from B2C
  email: string;
  displayName: string;
  extractionMode: "ai" | "ocr";   // Global setting
  aiProvider?: "openai" | "anthropic" | "google";
  aiKeyVaultRef?: string;          // Key Vault secret name (not the key itself)
  blobContainerName: string;       // User's dedicated container name
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 Extraction Job (Azure Storage Queue message)

```typescript
interface ExtractionJob {
  assetId: string;
  userId: string;
  blobPath: string;
  normalizedBlobPaths: string[];
  extractionMode: "ai" | "ocr";
  aiProvider?: string;
  aiKeyVaultRef?: string;
  attemptNumber: number;           // For retry tracking
}
```

---

## 4. API Design

**Base URL:** `https://<function-app>.azurewebsites.net/api`

All endpoints require `Authorization: Bearer <jwt>` header (except auth callback).
All responses follow this envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: { continuationToken?: string; totalCount?: number };
}
```

### 4.1 Authentication

| Method | Path | Description |
|---|---|---|
| GET | `/auth/login` | Initiates B2C login flow, returns redirect URL |
| POST | `/auth/callback` | Handles B2C callback, returns JWT |
| POST | `/auth/refresh` | Refresh expired JWT |
| POST | `/auth/logout` | Invalidate session |

### 4.2 Assets

| Method | Path | Description |
|---|---|---|
| POST | `/assets/upload` | Upload file, returns SAS URL for direct blob upload + assetId |
| POST | `/assets/upload/confirm` | Client confirms upload complete, triggers extraction |
| GET | `/assets/:id` | Get single asset with all fields |
| GET | `/assets` | List assets (paginated, filterable by category/status) |
| DELETE | `/assets/:id` | Hard delete asset (blob + Cosmos + search index) |
| POST | `/assets/:id/move` | Move asset to different category |
| GET | `/assets/:id/export` | Export asset data as JSON |

**Upload flow (two-step):**
1. `POST /assets/upload` with metadata (fileName, mimeType, fileSize) → returns `{ assetId, sasUploadUrl, blobPath }`
2. Client uploads file directly to Blob Storage via SAS URL
3. `POST /assets/upload/confirm` with `{ assetId }` → triggers normalization + extraction queue

### 4.3 Categories

| Method | Path | Description |
|---|---|---|
| GET | `/categories` | List all categories for user (with asset counts) |
| POST | `/categories` | Create new category |
| PATCH | `/categories/:id` | Update category name or field priorities |
| DELETE | `/categories/:id` | Delete category (moves assets to "General") |

### 4.4 Search

| Method | Path | Description |
|---|---|---|
| GET | `/search?q=<query>` | Unified search endpoint |

Query syntax supported:
- **Keyword:** `amazon`, `protein`, `invoice`
- **Field filter:** `total>100`, `total<50`, `total=42.19`
- **Date filter:** `date:2026-02-*`, `date:2026-02-14`
- **Entity filter:** `vendor:amazon`
- **Category filter:** `category:finance`
- **Combined:** `category:finance vendor:amazon total>50`

Query parameters:
- `q` — search query string
- `category` — optional category filter (alternative to query syntax)
- `limit` — page size (default 20, max 100)
- `continuationToken` — for pagination
- `sort` — `createdAt` | `updatedAt` (default: `createdAt`)
- `order` — `asc` | `desc` (default: `desc`)

### 4.5 Extraction Status

| Method | Path | Description |
|---|---|---|
| GET | `/assets/:id/status` | Returns extraction status + progress |

Response:
```json
{
  "assetId": "...",
  "status": "processing",
  "extractionMode": "ai",
  "queuedAt": "...",
  "startedAt": "..."
}
```

Client polls this endpoint every 2 seconds until status is `ready` or `failed`.

### 4.6 User Settings

| Method | Path | Description |
|---|---|---|
| GET | `/settings` | Get current user settings |
| PATCH | `/settings` | Update settings (extraction mode, AI provider, API key) |

When updating AI key: the API encrypts and stores it in Key Vault, saves the Key Vault secret reference in Cosmos DB. The raw key is never stored in Cosmos.

---

## 5. Azure Infrastructure

### 5.1 Resource Groups
- `rg-scanvault-dev` — development environment
- `rg-scanvault-prod` — production environment

### 5.2 Resources Per Environment

| Resource | Service | SKU / Tier | Notes |
|---|---|---|---|
| `cosmos-scanvault-{env}` | Cosmos DB | Serverless | 3 containers: assets, categories, users |
| `st-scanvault-{env}` | Storage Account | Standard LRS | Blob containers (one per user) + queues |
| `func-scanvault-{env}` | Azure Functions | Consumption plan | Node.js 20 runtime |
| `kv-scanvault-{env}` | Key Vault | Standard | User AI keys, connection strings |
| `search-scanvault-{env}` | Azure AI Search | Free (dev) / Basic (prod) | Asset search index |
| `swa-scanvault-{env}` | Static Web Apps | Free | Next.js web app hosting |
| `b2c-scanvault` | Entra ID B2C | Free tier (50k MAU) | Shared across environments |

### 5.3 Cosmos DB Containers

| Container | Partition Key | Indexing |
|---|---|---|
| `assets` | `/userId` | Include: all field paths. Composite index on `(userId, createdAt desc)`, `(userId, categoryId, createdAt desc)` |
| `categories` | `/userId` | Include: `/userId`, `/slug`, `/name` |
| `users` | `/id` | Include: `/email` |

### 5.4 Azure AI Search Index

**Index name:** `assets-index`

Fields:
| Field | Type | Searchable | Filterable | Sortable |
|---|---|---|---|---|
| `id` | String | No | Yes | No |
| `userId` | String | No | Yes | No |
| `summary` | String | Yes | No | No |
| `categoryId` | String | No | Yes | No |
| `rawOcrText` | String | Yes | No | No |
| `entities` | Collection(String) | Yes | Yes | No |
| `fieldKeys` | Collection(String) | No | Yes | No |
| `fieldValues` | Collection(String) | Yes | Yes | No |
| `createdAt` | DateTimeOffset | No | Yes | Yes |

The search index is updated by the extraction pipeline after fields are stored in Cosmos DB. Use Azure AI Search indexer or push API from the Azure Function.

### 5.5 Azure Storage Queues

| Queue | Purpose |
|---|---|
| `extraction-jobs` | New extraction requests |
| `extraction-jobs-poison` | Failed extraction messages (after max retries) |

### 5.6 Bicep Module Overview

`infra/main.bicep` orchestrates all modules:

```bicep
// Parameters
param environment string // 'dev' | 'prod'
param location string = resourceGroup().location

// Modules
module cosmos 'modules/cosmos.bicep' = { ... }
module storage 'modules/storage.bicep' = { ... }
module functions 'modules/functions.bicep' = { ... }
module keyvault 'modules/keyvault.bicep' = { ... }
module search 'modules/search.bicep' = { ... }
module staticwebapp 'modules/staticwebapp.bicep' = { ... }
```

Each module provisions its respective resource with appropriate RBAC role assignments so the Functions app can access Cosmos, Blob, Key Vault, and Search using managed identity (no connection strings in code).

---

## 6. Authentication Flow

### 6.1 Azure Entra ID B2C Configuration

**User flows:**
- Sign up / Sign in (email + password, Google, Apple, Microsoft)
- Password reset
- Magic link sign-in (passwordless)

**Token configuration:**
- ID token claims: `sub`, `email`, `name`
- Access token audience: `api://scanvault`
- Access token lifetime: 1 hour
- Refresh token lifetime: 14 days

### 6.2 Auth Flow — Web & Mobile

1. Client redirects to B2C authorization endpoint
2. User authenticates (email/password, social, or magic link)
3. B2C redirects to app callback with authorization code
4. Client sends code to `POST /auth/callback`
5. API exchanges code for tokens, returns JWT to client
6. Client stores JWT securely (httpOnly cookie for web, secure storage for mobile)
7. All subsequent requests include `Authorization: Bearer <jwt>`

### 6.3 Auth Flow — CLI

1. `vault login` opens browser to B2C login page
2. CLI starts temporary local HTTP server on `localhost:9876`
3. B2C redirects to `http://localhost:9876/callback` with auth code
4. CLI exchanges code for tokens via `POST /auth/callback`
5. Tokens stored in `~/.vault/credentials.json` (file permissions: 600)
6. Subsequent commands read token from credentials file
7. CLI auto-refreshes expired tokens using refresh token

---

## 7. Extraction Pipeline

### 7.1 Pipeline Overview

```
Upload Confirm → Queue Message → Azure Function (queue trigger)
                                       │
                           ┌───────────┴───────────┐
                           │                       │
                     PDF detected?            Image ready
                           │                       │
                     Convert pages              Continue
                     to images                     │
                           │                       │
                           └───────────┬───────────┘
                                       │
                              Check extraction mode
                                       │
                           ┌───────────┴───────────┐
                           │                       │
                        AI Mode               OCR Mode
                           │                       │
                   Fetch key from KV        Tesseract.js
                   Call AI provider         Heuristic parse
                   Parse response           Template summary
                           │                       │
                           └───────────┬───────────┘
                                       │
                              Store fields in Cosmos
                              Update search index
                              Mark asset "ready"
```

### 7.2 PDF Normalization

When a PDF is uploaded:
1. Use `pdf-lib` or `pdfjs-dist` to determine page count
2. Convert each page to a PNG image using `sharp` + `pdfjs-dist` (or `pdf2pic`)
3. Store each page image in blob storage under `{userId}/{assetId}/page-{n}.png`
4. Save all page paths in `normalizedBlobUrls`
5. For extraction: process all pages (AI mode sends all page images; OCR mode runs on each)

### 7.3 AI Extraction

**Supported providers:**

| Provider | Model | Package |
|---|---|---|
| OpenAI | `gpt-4o` | `openai` |
| Anthropic | `claude-sonnet-4-20250514` | `@anthropic-ai/sdk` |
| Google | `gemini-2.0-flash` | `@google/generative-ai` |

**Provider abstraction** (`packages/ai-extract`):

```typescript
interface AIExtractor {
  extract(images: Buffer[], apiKey: string): Promise<ExtractionResult>;
}

interface ExtractionResult {
  summary: string;
  fields: ExtractedField[];
  suggestedCategory: string;
  entities: string[];
}
```

Each provider implements the `AIExtractor` interface. The prompt is shared across providers:

**System prompt:**
```
You are a document analysis assistant. Analyze the provided document image(s) and extract structured information.

Return a JSON object with exactly this schema:
{
  "summary": "A concise 2-sentence summary of the document content.",
  "fields": [
    {
      "key": "descriptive_snake_case_name",
      "value": <string or number>,
      "unit": "<unit if applicable, e.g. USD, kg, miles, or null>",
      "confidence": <0.0 to 1.0>
    }
  ],
  "suggested_category": "<one of: finance, work, health, fitness, travel, general>",
  "entities": ["list", "of", "named", "entities"]
}

Rules:
- Extract ALL important numbers, dates, totals, quantities, and identifiers.
- Use descriptive keys: "total_amount", "invoice_number", "date", "tax_amount", etc.
- Confidence should reflect how certain you are about the extracted value.
- If the document doesn't fit default categories, suggest a new descriptive category slug.
- Entities should include company names, person names, product names, and locations.
- Return ONLY valid JSON. No markdown, no explanation.
```

### 7.4 OCR Extraction (Tesseract.js)

When AI is disabled, server-side extraction uses Tesseract.js:

1. Run Tesseract.js on each normalized image
2. Concatenate all page texts into `rawOcrText`
3. Run heuristic parsers to extract fields:

**Heuristic rules:**

| Pattern | Field Key | Unit |
|---|---|---|
| `$X,XXX.XX` or `USD X.XX` | `total_amount` | `USD` |
| `€X.XX` | `total_amount` | `EUR` |
| `MM/DD/YYYY`, `YYYY-MM-DD`, `Month DD, YYYY` | `date` | — |
| `#XXXXX` or `Invoice #...` | `invoice_number` | — |
| Email regex | `email` | — |
| Phone regex | `phone` | — |
| `XX kg`, `XX lbs` | `weight` | extracted |
| `XX cal`, `XX kcal` | `calories` | `kcal` |

4. Confidence for OCR-extracted fields: `0.6` (fixed — lower than AI to indicate uncertainty)
5. Summary template: `"Document uploaded on {date}. Contains {fieldCount} extracted fields including {topFieldKeys}."`
6. Category inference rules:
   - Contains `$` or `invoice` or `receipt` → `finance`
   - Contains `cal` or `workout` or `protein` → `fitness`
   - Contains `flight` or `hotel` or `boarding` → `travel`
   - Contains `prescription` or `diagnosis` or `lab` → `health`
   - Contains `salary` or `contract` or `timesheet` → `work`
   - Default → `general`

### 7.5 Error Handling & Retries

- Queue messages have `maxDequeueCount: 3` (3 attempts)
- After 3 failures, message moves to poison queue
- Asset status set to `"failed"` with `errorMessage`
- Common failure reasons:
  - AI provider API error (rate limit, invalid key)
  - Corrupt/unreadable file
  - Timeout (extraction function timeout: 5 minutes)
- Failed assets can be retried by re-queuing from the poison queue (admin/manual)

---

## 8. Search System

### 8.1 Search Query Parser

The search query parser lives in `packages/shared/src/utils/search-parser.ts` and is shared between the API and CLI.

```typescript
interface ParsedQuery {
  keywords: string[];              // Free-text terms
  fieldFilters: FieldFilter[];     // total>100, date:2026-02-*
  categoryFilter?: string;         // category:finance
  entityFilter?: string;           // vendor:amazon
}

interface FieldFilter {
  key: string;
  operator: "=" | ">" | "<" | ">=" | "<=" | ":" ;
  value: string | number;
}
```

**Parsing rules:**
- Tokens separated by spaces
- `key:value` → field filter with `=` operator (or prefix match if `*`)
- `key>value`, `key<value`, `key>=value`, `key<=value` → numeric field filter
- `category:xxx` → category filter
- `vendor:xxx` or `entity:xxx` → entity filter
- Everything else → keyword

### 8.2 Search Execution

1. Parse query string into `ParsedQuery`
2. If keywords present → query Azure AI Search (`summary`, `rawOcrText`, `entities`)
3. Apply field filters → Cosmos DB query with `WHERE` clauses on `fields` array
4. Apply category filter → `WHERE categoryId = @cat`
5. Always apply `WHERE userId = @userId` (mandatory)
6. Merge results, de-duplicate, return sorted by relevance (search) or date (filters only)

### 8.3 Search Query Examples

| Input | Parsed |
|---|---|
| `amazon` | keyword: "amazon" → Azure AI Search |
| `total>100` | fieldFilter: { key: "total", op: ">", value: 100 } → Cosmos query |
| `category:finance vendor:amazon total>50` | categoryFilter: "finance", entityFilter: "amazon", fieldFilter: total>50 → combined |
| `protein date:2026-02-*` | keyword: "protein", fieldFilter: date prefix "2026-02" → AI Search + Cosmos |

---

## 9. CLI Tool (`vault`)

### 9.1 Technology

- Built with `commander` (lightweight, no boilerplate)
- Published as npm package: `@scanvault/cli`
- Binary name: `vault`
- Config stored in `~/.vault/config.json`
- Credentials stored in `~/.vault/credentials.json` (mode 600)

### 9.2 Commands

```
vault login                                    # Opens browser for B2C login
vault logout                                   # Clears stored credentials
vault whoami                                   # Show current user info

vault upload <file> [--category <cat>]         # Upload file, optional category
vault upload <file1> <file2> ...               # Batch upload

vault list [--category <cat>] [--limit N]      # List assets
vault list --status processing                 # List by status

vault get <assetId>                            # Show full asset details
vault get latest                               # Show most recent asset

vault search "<query>"                         # Search with query syntax
vault search "<query>" --json                  # Output as JSON (for piping)
vault search "<query>" --fields-only           # Show only extracted fields

vault extract <assetId> --field <key>          # Extract specific field value
vault extract latest --field total             # From most recent asset

vault export <assetId> --format json           # Export asset as JSON
vault export <assetId> > output.json           # Redirect to file

vault categories                               # List categories
vault categories create <name>                 # Create category

vault config set extraction-mode ai            # Set extraction mode
vault config set ai-provider openai            # Set AI provider
vault config set ai-key <key>                  # Set API key (stored via API → Key Vault)
vault config get                               # Show current config
```

### 9.3 Output Formatting

- Default: human-readable table/card format
- `--json` flag: machine-readable JSON output
- `--quiet` flag: minimal output (IDs only)
- Piping detection: if stdout is not a TTY, auto-switch to JSON

### 9.4 Pipe Examples

```bash
# Get total from latest receipt
vault extract latest --field total_amount
# Output: 42.19

# Pipe to other commands
vault extract latest --field total_amount | xargs echo "Total:"
# Output: Total: 42.19

# Search and process with jq
vault search "category:fitness date:2026-02-*" --json | jq '.[].fields[] | select(.key == "calories")'

# Batch export
vault list --category finance --json | jq '.[].id' | xargs -I {} vault export {} > {}.json
```

---

## 10. Web App (Next.js)

### 10.1 Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Marketing page, feature overview, CTA to sign up |
| `/login` | Login | Redirect to B2C or embedded login |
| `/dashboard` | Dashboard | Overview: recent assets, category counts, quick search |
| `/assets` | Asset List | Paginated grid/list of all assets, filters |
| `/assets/[id]` | Asset Detail | Full asset view: image preview, fields, metadata, actions |
| `/categories` | Categories | Category management: view, create, rename, delete |
| `/categories/[slug]` | Category View | Assets filtered by category |
| `/search` | Search | Full search interface with query builder |
| `/settings` | Settings | Account, extraction mode, AI provider config |

### 10.2 Key Components

**UploadZone** — Drag-and-drop or click-to-upload area. Shows upload progress. Supports multiple files. Validates file type and size (max 10 MB) before uploading.

**AssetCard** — Displays: thumbnail, summary (truncated), top 3 fields, category badge, status indicator. Click to navigate to detail page.

**FieldDisplay** — Renders extracted fields as a key-value table with units and confidence indicators. Confidence shown as color-coded badge (green >0.8, yellow 0.5-0.8, red <0.5).

**SearchBar** — Supports free-text input with syntax highlighting for field filters. Autocomplete for category names and common field keys. Debounced search (300ms).

**CategoryNav** — Sidebar or tab navigation showing all categories with asset counts. Active category highlighted. Create new category inline.

**ExtractionStatus** — Shows asset processing state. Polls `/assets/:id/status` every 2 seconds while status is `processing`. Animates transition to `ready`.

### 10.3 State Management

- **Server state:** React Query (TanStack Query) for API data fetching, caching, and polling
- **Client state:** React context for auth state and UI preferences
- No Redux or heavy state management — keep it simple

### 10.4 Styling

- Tailwind CSS
- shadcn/ui for base components (button, input, dialog, etc.)
- Responsive: mobile-friendly layout

---

## 11. Mobile App (Expo)

### 11.1 Screens (Tab-based navigation)

| Tab | Screen | Description |
|---|---|---|
| Home | Dashboard | Recent assets, quick actions |
| Upload | Upload | Camera capture + file picker |
| Search | Search | Search bar + results |
| Categories | Categories | Category list + drill-down |
| Settings | Settings | Account, extraction mode, AI config |

### 11.2 Mobile-Specific Features

- **Camera scan:** Use `expo-camera` to capture documents directly
- **Image picker:** Use `expo-image-picker` for gallery selection
- **Secure storage:** Use `expo-secure-store` for JWT tokens
- **Push notifications:** Future enhancement for extraction completion
- **Offline queue:** Future enhancement — queue uploads when offline

### 11.3 Shared Code with Web

Share via `packages/shared`:
- Types and schemas
- Search query parser
- Field helpers and formatters
- Constants (categories, limits)

API client code is NOT shared — web uses fetch with cookies, mobile uses fetch with Bearer token from secure storage.

---

## 12. Security Implementation

### 12.1 Authentication Middleware

Every Azure Function HTTP trigger runs through auth middleware:

```typescript
// Pseudocode
async function authMiddleware(req: HttpRequest): Promise<AuthContext> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new UnauthorizedError();

  const decoded = await verifyB2CToken(token); // Verify signature, expiry, audience
  return { userId: decoded.sub, email: decoded.email };
}
```

### 12.2 Data Isolation

Every Cosmos DB query includes user filter:

```sql
SELECT * FROM c WHERE c.userId = @userId AND ...
```

Every Blob Storage operation scoped to user's container:
```
Container name: user-{userId}
```

SAS URLs are:
- Read-only (for downloads)
- Write-only (for uploads, single blob only)
- Time-limited: 15 minutes for uploads, 1 hour for downloads
- Scoped to specific blob path

### 12.3 Rate Limiting

Implemented as middleware in Azure Functions:

| Limit | Value | Window |
|---|---|---|
| Uploads | 10 per minute | Per user, sliding window |
| Uploads | 100 per day | Per user, daily reset |
| API calls | 60 per minute | Per user, sliding window |
| Search | 30 per minute | Per user, sliding window |

Rate limit state stored in Cosmos DB (lightweight counter document) or Azure Cache for Redis if needed.

### 12.4 Input Validation

All request bodies validated using Zod schemas from `packages/shared`:

```typescript
const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
  fileSize: z.number().max(10 * 1024 * 1024), // 10 MB
});
```

### 12.5 AI Key Security

1. User submits API key via `PATCH /settings`
2. API stores key in Azure Key Vault as secret: `ai-key-{userId}`
3. Cosmos DB stores only the Key Vault secret name reference
4. During extraction, Azure Function reads key from Key Vault using managed identity
5. Key never appears in logs, responses, or Cosmos DB

---

## 13. File Type Support

### Accepted file types:

| Type | MIME | Normalization |
|---|---|---|
| PNG | `image/png` | None (already image) |
| JPEG | `image/jpeg` | None |
| WebP | `image/webp` | Convert to PNG via `sharp` |
| PDF | `application/pdf` | Convert each page to PNG |

### Rejected:
- Files > 10 MB
- Unsupported MIME types
- Files that fail integrity check (corrupt headers)

Future consideration: HEIC, TIFF, DOCX, XLSX

---

## 14. Testing Strategy

### 14.1 Unit Tests

Framework: **Vitest** (fast, TypeScript-native, compatible with Turborepo)

| Package | What to test |
|---|---|
| `packages/shared` | Search query parser, field helpers, Zod schemas |
| `packages/ai-extract` | Provider abstraction (mocked API calls), prompt generation |
| `apps/api` | Service layer functions (mocked Cosmos/Blob), extraction heuristics, auth middleware |
| `apps/cli` | Command parsing, output formatting, config management |

### 14.2 Test Structure

```
tests/
├── shared/
│   ├── search-parser.test.ts
│   ├── field-helpers.test.ts
│   └── schemas.test.ts
├── ai-extract/
│   ├── openai.test.ts
│   ├── anthropic.test.ts
│   ├── google.test.ts
│   └── prompt.test.ts
├── api/
│   ├── services/
│   │   ├── extraction.test.ts
│   │   ├── ocr-heuristics.test.ts
│   │   └── search.test.ts
│   └── middleware/
│       ├── auth.test.ts
│       ├── rateLimit.test.ts
│       └── validation.test.ts
└── cli/
    ├── commands/
    │   ├── upload.test.ts
    │   ├── search.test.ts
    │   └── extract.test.ts
    └── lib/
        ├── output.test.ts
        └── config.test.ts
```

---

## 15. CI/CD Pipeline

### 15.1 GitHub Actions Workflows

**`ci.yml`** — Runs on every PR:
1. Install dependencies (`pnpm install`)
2. Lint (`turbo lint`)
3. Type check (`turbo typecheck`)
4. Unit tests (`turbo test`)
5. Build all packages (`turbo build`)

**`deploy-api.yml`** — Runs on push to `main`:
1. Build API package
2. Deploy to Azure Functions (dev on PR merge, prod on release tag)

**`deploy-web.yml`** — Runs on push to `main`:
1. Build Next.js app
2. Deploy to Azure Static Web Apps

**`deploy-cli.yml`** — Runs on release tag:
1. Build CLI package
2. Publish to npm as `@scanvault/cli`

### 15.2 Environment Variables

Stored in GitHub Secrets and Azure Function Application Settings:

| Variable | Where | Purpose |
|---|---|---|
| `COSMOS_CONNECTION_STRING` | Azure Function App Settings | Cosmos DB access |
| `STORAGE_CONNECTION_STRING` | Azure Function App Settings | Blob Storage access |
| `KEYVAULT_URL` | Azure Function App Settings | Key Vault endpoint |
| `B2C_TENANT_ID` | Azure Function App Settings | B2C auth |
| `B2C_CLIENT_ID` | Azure Function App Settings | B2C auth |
| `B2C_CLIENT_SECRET` | Azure Key Vault | B2C auth |
| `SEARCH_ENDPOINT` | Azure Function App Settings | AI Search |
| `SEARCH_ADMIN_KEY` | Azure Key Vault | AI Search |

Note: Prefer managed identity over connection strings wherever Azure supports it (Cosmos, Blob, Key Vault all support managed identity).

---

## 16. Implementation Phases

### Phase 1: Foundation (Backend API + Infrastructure)

**Goal:** Deploy a working API with auth, upload, and OCR extraction.

Tasks:
1. Initialize monorepo with Turborepo, pnpm workspaces, shared tsconfig
2. Create `packages/shared` with types, schemas, constants
3. Write Bicep templates for all Azure resources
4. Deploy infrastructure to dev environment
5. Implement Azure Functions:
   - Auth middleware (B2C JWT verification)
   - `POST /assets/upload` (SAS URL generation)
   - `POST /assets/upload/confirm` (queue extraction job)
   - `GET /assets/:id`, `GET /assets`, `DELETE /assets/:id`
   - Queue-triggered extraction function (OCR mode with Tesseract.js)
   - `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`
   - `GET /settings`, `PATCH /settings`
6. Implement Cosmos DB service layer
7. Implement Blob Storage service layer (container creation, SAS URL generation)
8. Implement OCR extraction pipeline with Tesseract.js and heuristic parsers
9. Implement rate limiting middleware
10. Write unit tests for services, middleware, extraction logic
11. Set up CI workflow

### Phase 2: AI Extraction + Search

**Goal:** Add AI provider support and search functionality.

Tasks:
1. Create `packages/ai-extract` with provider abstraction
2. Implement OpenAI, Anthropic, Google extractors
3. Implement Key Vault integration for user AI keys
4. Update extraction pipeline to support AI mode
5. Implement `PATCH /settings` for AI configuration
6. Set up Azure AI Search index
7. Implement search indexer (push from extraction function)
8. Implement `GET /search` endpoint with query parser
9. Implement search query parser in `packages/shared`
10. Write unit tests for AI extractors (mocked), search parser, search service

### Phase 3: CLI Tool

**Goal:** Ship a working CLI that can login, upload, search, and extract.

Tasks:
1. Set up `apps/cli` with commander
2. Implement `vault login` (browser-based OAuth flow with local callback server)
3. Implement `vault logout`, `vault whoami`
4. Implement `vault upload` (calls upload API, streams file to SAS URL)
5. Implement `vault list`, `vault get`
6. Implement `vault search` with query syntax
7. Implement `vault extract` (extract single field from asset)
8. Implement `vault export`
9. Implement `vault categories`, `vault config`
10. Add `--json` and `--quiet` output modes
11. Add TTY detection for automatic JSON output in pipes
12. Write unit tests for commands and output formatting
13. Publish to npm

### Phase 4: Web Application

**Goal:** Launch the Next.js web app with full feature parity.

Tasks:
1. Set up `apps/web` with Next.js, Tailwind, shadcn/ui
2. Implement B2C authentication flow
3. Build dashboard page (recent assets, category overview)
4. Build upload interface (drag-and-drop, progress, status polling)
5. Build asset list page (pagination, category filter, status badges)
6. Build asset detail page (image preview, field table, actions)
7. Build search page (search bar with syntax support, results)
8. Build category management page
9. Build settings page (extraction mode, AI provider, API key input)
10. Deploy to Azure Static Web Apps

### Phase 5: Mobile Application

**Goal:** Ship iOS and Android apps via Expo.

Tasks:
1. Set up `apps/mobile` with Expo
2. Implement B2C authentication flow (expo-auth-session)
3. Build tab navigation structure
4. Build camera capture and image picker upload flow
5. Build asset list and detail screens
6. Build search screen
7. Build category screens
8. Build settings screen
9. Test on iOS and Android simulators
10. Prepare for App Store / Google Play submission

---

## 17. Package Dependencies

### Root (`package.json`)
```
devDependencies:
  turbo
  typescript
  vitest
  eslint
  prettier
  @types/node
```

### `packages/shared`
```
dependencies:
  zod
  uuid
```

### `packages/ai-extract`
```
dependencies:
  openai
  @anthropic-ai/sdk
  @google/generative-ai
  @scanvault/shared
```

### `apps/api`
```
dependencies:
  @azure/functions
  @azure/cosmos
  @azure/storage-blob
  @azure/storage-queue
  @azure/keyvault-secrets
  @azure/identity
  @azure/search-documents
  tesseract.js
  sharp
  pdf-lib (or pdfjs-dist)
  jsonwebtoken
  jwks-rsa
  @scanvault/shared
  @scanvault/ai-extract
```

### `apps/cli`
```
dependencies:
  commander
  open (browser opening)
  chalk
  ora (spinners)
  cli-table3
  conf (config storage)
  @scanvault/shared
```

### `apps/web`
```
dependencies:
  next
  react
  react-dom
  @tanstack/react-query
  tailwindcss
  @radix-ui/* (via shadcn/ui)
  @scanvault/shared
```

### `apps/mobile`
```
dependencies:
  expo
  expo-camera
  expo-image-picker
  expo-secure-store
  expo-auth-session
  react-native
  @tanstack/react-query
  @scanvault/shared
```

---

## 18. Configuration & Limits

| Setting | Value |
|---|---|
| Max file size | 10 MB |
| Supported formats | PNG, JPEG, WebP, PDF |
| Max pages per PDF | 20 |
| Upload rate limit | 10/min, 100/day per user |
| API rate limit | 60/min per user |
| Search rate limit | 30/min per user |
| Extraction timeout | 5 minutes |
| Extraction retries | 3 attempts |
| SAS upload URL expiry | 15 minutes |
| SAS download URL expiry | 1 hour |
| JWT access token expiry | 1 hour |
| JWT refresh token expiry | 14 days |
| Search page size (default) | 20 |
| Search page size (max) | 100 |
| Max categories per user | 50 |
| AI extraction confidence | Provider-reported (0.0–1.0) |
| OCR extraction confidence | Fixed 0.6 |
| Polling interval | 2 seconds |
| Default categories | Finance, Work, Health, Fitness, Travel, General |

---

## 19. Error Codes

| Code | HTTP | Description |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Missing or invalid JWT |
| `AUTH_EXPIRED` | 401 | JWT expired |
| `FORBIDDEN` | 403 | Accessing another user's resource |
| `NOT_FOUND` | 404 | Asset, category, or resource not found |
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `FILE_TOO_LARGE` | 413 | File exceeds 10 MB |
| `UNSUPPORTED_TYPE` | 415 | File type not in allowed list |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `EXTRACTION_FAILED` | 500 | Extraction pipeline error |
| `AI_PROVIDER_ERROR` | 502 | AI provider returned error |
| `AI_KEY_INVALID` | 400 | User's AI API key is invalid |
| `CATEGORY_LIMIT` | 400 | Max 50 categories reached |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 20. Key Design Principles

1. **User isolation is absolute.** Every query, every blob operation, every search is scoped to `userId`. There is no cross-user data access path.

2. **Extraction is asynchronous.** Uploads return immediately. Extraction happens in the background via queue. Clients poll for completion.

3. **AI is optional.** The platform works fully without AI using OCR + heuristics. AI is an enhancement, not a dependency.

4. **Types are shared.** The `packages/shared` package is the single source of truth for all data shapes, validation schemas, and constants.

5. **CLI is a first-class citizen.** Every operation available in the UI is also available via CLI. Output is pipe-friendly with `--json`.

6. **Cost-conscious.** Cosmos DB Serverless, Functions Consumption plan, Free tier Static Web Apps, and Free tier AI Search for dev keep costs minimal.

7. **Security by default.** Managed identity over connection strings. Key Vault for secrets. SAS URLs over public blobs. Rate limiting on all endpoints.
