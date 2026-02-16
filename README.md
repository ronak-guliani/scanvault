# ScanVault

A document intelligence platform that turns unstructured files — images, PDFs, screenshots, receipts — into structured, searchable data. Upload a file, extract key fields with AI or OCR, and search across everything from a web dashboard or the command line.

## Architecture

TypeScript monorepo (npm workspaces) with three apps and two shared packages:

```
apps/
  api/          Azure Functions HTTP + queue-triggered API
  web/          Next.js dashboard (React 18, Tailwind CSS)
  cli/          `vault` CLI (Commander.js)

packages/
  shared/       Types, Zod schemas, search query parser
  ai-extract/   Multi-provider AI extraction (OpenAI, Anthropic, Google)

infra/          Azure infrastructure as code (Bicep)
```

### Backend Services

| Service | Purpose |
|---|---|
| Azure Functions | Serverless API (auth, assets, search, extraction) |
| Cosmos DB | Document store (assets, categories, user settings) |
| Blob Storage | File storage with per-user containers + SAS tokens |
| Azure AI Search | Full-text + semantic search across extracted data |
| Azure Key Vault | Secret management for API keys |
| Azure B2C | Authentication (email, social, magic link) |
| Tesseract.js | OCR fallback when no AI key is configured |

## Features

- **Upload** any image, PDF, or document
- **AI extraction** — structured fields, entities, and summaries via OpenAI / Anthropic / Google
- **OCR fallback** — Tesseract.js extracts text when no AI provider is set
- **Categories** — organize assets with default and custom categories
- **Full-text search** — query across all extracted data with a natural search syntax
- **Rate limiting** — per-user upload throttling (minute + daily)
- **CLI** — `vault upload`, `vault search`, `vault extract`, `vault export`, and more
- **Infrastructure as Code** — full Bicep templates for one-command Azure deployment

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Azure Functions Core Tools (for local API development)
- An Azure subscription (for deployed services)

### Install

```sh
npm install
npm run build
```

### Run Locally

```sh
# Start the API (requires local.settings.json — copy from local.settings.example.json)
cd apps/api && npm start

# Start the web app
cd apps/web && npm run dev

# Use the CLI
cd apps/cli && node dist/bin/vault.js --help
```

### Test

```sh
npm test
```

### Deploy Infrastructure

```sh
az deployment group create \
  --resource-group <rg-name> \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam
```

## CLI

The `vault` command provides full access to ScanVault from the terminal:

```
vault login          Authenticate via browser
vault upload <file>  Upload and extract a document
vault list           List all assets
vault get <id>       View asset details
vault search <q>     Search across extracted data
vault extract <file> Run local AI extraction (BYO API key)
vault export         Export assets as JSON
vault categories     Manage categories
vault config         View/set configuration
vault whoami         Show current user
```

## Project Scripts

| Script | Description |
|---|---|
| `npm run build` | Build all packages and apps |
| `npm run typecheck` | Type-check across the entire monorepo |
| `npm run lint` | Lint all workspaces |
| `npm test` | Run all workspace tests |