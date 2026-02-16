# ScanVault

A CLI-first document intelligence platform that turns unstructured files — images, PDFs, screenshots, receipts — into structured, searchable data. Upload a file, extract key fields with AI or OCR, and search across everything from the terminal, through GitHub Copilot, or via a web dashboard.

> **Built for the terminal.** ScanVault is designed to be used primarily through the `vault` CLI and integrates natively with GitHub Copilot, so you can extract, upload, and search your documents without leaving your editor or terminal.

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
- **CLI-first** — `vault upload`, `vault search`, `vault extract`, `vault export`, and more — the primary interface
- **GitHub Copilot integration** — use Copilot as an AI extraction provider directly from the CLI (no API key required)
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

The `vault` CLI is the primary interface for ScanVault:

```
vault login          Authenticate via browser
vault upload <file>  Upload and extract a document
vault list           List all assets
vault get <id>       View asset details
vault search <q>     Search across extracted data
vault summarize <category>  Copilot summary (4-5 plain-English sentences)
vault ask "<question>"      Ask Copilot over selected assets/categories
vault extract <id>   Extract a specific field from an asset
vault export         Export assets as JSON
vault categories     Manage categories
vault config         View/set configuration
vault whoami         Show current user
```

### GitHub Copilot Integration

ScanVault ships with a [Copilot extraction skill](apps/cli/SKILL.md) that lets GitHub Copilot act as the AI extraction provider. When no API key is configured (or when `--copilot` is passed), the CLI delegates extraction to Copilot — meaning you get structured field extraction, entity recognition, and auto-categorization without any third-party AI key.

```sh
# Upload with Copilot extraction (automatic when no AI key is set)
vault upload receipt.jpg

# Explicitly use Copilot extraction
vault upload invoice.pdf --copilot

# Override the extractor command
vault upload scan.png --copilot-cmd "gh copilot explain"

# Summarize a category for a time window
vault summarize finance --since 2w

# Ask a question over a category/time range
vault ask --category finance --since 1w how much did i spend last week

# Ask a question over specific assets
vault ask --asset <id1> --asset <id2> what does this whiteboard capture
```

Copilot extraction produces the same structured output as the server-side AI providers — summary, fields, entities, and category — so the rest of the pipeline (search, export, dashboard) works identically regardless of extraction mode.  
By default, `vault summarize` and `vault ask` print readable plain-English text; use `--json` when you need structured output.

## Project Scripts

| Script | Description |
|---|---|
| `npm run build` | Build all packages and apps |
| `npm run typecheck` | Type-check across the entire monorepo |
| `npm run lint` | Lint all workspaces |
| `npm test` | Run all workspace tests |
