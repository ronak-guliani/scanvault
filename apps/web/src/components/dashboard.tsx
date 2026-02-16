"use client";

import type { Asset, Category, ExtractedField, UserSettings } from "@scanvault/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebApiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

interface SearchResult {
  query: unknown;
  items: Asset[];
}

function statusBadge(status: Asset["status"]): string {
  if (status === "ready") return "badge badge-ready";
  if (status === "processing" || status === "uploading") return "badge badge-processing";
  return "badge badge-failed";
}

/* ---------- Icons (inline SVG) ---------- */

function IconVault() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
      <rect x="2" y="4" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      <line x1="22" y1="16" x2="26" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14V3m0 0L6 7m4-4l4 4" />
      <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3.5 3.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function IconMicrosoft() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function IconGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.99-.15-1.17z" fill="#4285F4" />
      <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.71.48-1.63.77-2.7.77-2.08 0-3.84-1.4-4.47-3.3H1.83v2.07A8 8 0 008.98 17z" fill="#34A853" />
      <path d="M4.51 10.52a4.8 4.8 0 010-3.04V5.41H1.83A8 8 0 001 9c0 1.29.3 2.51.83 3.59l2.68-2.07z" fill="#FBBC05" />
      <path d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 008.98 1a8 8 0 00-7.15 4.41l2.68 2.07c.63-1.9 2.4-3.3 4.47-3.3z" fill="#EA4335" />
    </svg>
  );
}

interface ReceiptLineItem {
  index: number;
  name: string;
  qty?: number;
  unitPrice?: string;
  price?: string;
}

interface ReceiptDetailsView {
  isReceipt: boolean;
  metadata: Array<{ key: string; label: string; value: string }>;
  lineItems: ReceiptLineItem[];
  totals: Array<{ key: string; label: string; value: string }>;
  extraFields: ExtractedField[];
}

function toDisplayValue(value: string | number): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return value;
}

function toMoneyValue(value: string | number | undefined): string | undefined {
  if (typeof value === "number") return `$${value.toFixed(2)}`;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(numeric)) return value;
  return `$${numeric.toFixed(2)}`;
}

function fieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function parseReceiptDetails(fields: ExtractedField[]): ReceiptDetailsView {
  const lineItemMap = new Map<number, ReceiptLineItem>();
  const consumedKeys = new Set<string>();
  const lineItemPattern = /^line_item_(\d+)_(name|qty|unit_price|price)$/;

  for (const field of fields) {
    const match = field.key.match(lineItemPattern);
    if (!match) continue;
    const index = Number(match[1]);
    const part = match[2];
    const current = lineItemMap.get(index) ?? { index, name: "" };
    if (part === "name") current.name = toDisplayValue(field.value);
    if (part === "qty") current.qty = Number(field.value);
    if (part === "unit_price") current.unitPrice = toMoneyValue(field.value) ?? toDisplayValue(field.value);
    if (part === "price") current.price = toMoneyValue(field.value) ?? toDisplayValue(field.value);
    lineItemMap.set(index, current);
    consumedKeys.add(field.key);
  }

  const metadataKeys: Array<{ key: string; label: string }> = [
    { key: "store_name", label: "Store" },
    { key: "date", label: "Date" },
    { key: "receipt_number", label: "Receipt #" },
    { key: "invoice_number", label: "Invoice #" },
    { key: "po_number", label: "PO #" },
    { key: "phone", label: "Phone" }
  ];
  const totalKeys: Array<{ key: string; label: string }> = [
    { key: "subtotal_amount", label: "Subtotal" },
    { key: "tax_amount", label: "Tax" },
    { key: "total_amount", label: "Total" }
  ];

  const metadata = metadataKeys
    .map((entry) => {
      const field = fields.find((item) => item.key === entry.key);
      if (!field) return null;
      consumedKeys.add(entry.key);
      return { key: entry.key, label: entry.label, value: toDisplayValue(field.value) };
    })
    .filter((item): item is { key: string; label: string; value: string } => item !== null);

  const totals = totalKeys
    .map((entry) => {
      const field = fields.find((item) => item.key === entry.key);
      if (!field) return null;
      consumedKeys.add(entry.key);
      return { key: entry.key, label: entry.label, value: toMoneyValue(field.value) ?? toDisplayValue(field.value) };
    })
    .filter((item): item is { key: string; label: string; value: string } => item !== null);

  const lineItems = [...lineItemMap.values()]
    .filter((item) => item.name.trim().length > 0)
    .filter((item) => !/^receipt total$/i.test(item.name.trim()))
    .filter((item) => !/^[A-Za-z\s]+,\s*[A-Z]{2}$/.test(item.name.trim()))
    .sort((a, b) => a.index - b.index);

  const extraFields = fields.filter((field) => !consumedKeys.has(field.key) && !/^file_(name|size_bytes)$/.test(field.key));
  const hasReceiptSignals =
    lineItems.length > 0 || totals.length > 0 || metadata.some((field) => field.key === "receipt_number" || field.key === "invoice_number");

  return {
    isReceipt: hasReceiptSignals,
    metadata,
    lineItems,
    totals,
    extraFields
  };
}

export function Dashboard(): JSX.Element {
  const { data: session, isPending } = authClient.useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});
  const [categoryAssetSelections, setCategoryAssetSelections] = useState<Record<string, string>>({});
  const [settingsMode, setSettingsMode] = useState<"ai" | "ocr">("ocr");
  const [settingsProvider, setSettingsProvider] = useState<"openai" | "anthropic" | "google">("openai");
  const [settingsApiKey, setSettingsApiKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"assets" | "categories" | "settings">("assets");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const client = useMemo(() => new WebApiClient(), []);
  const categoryNameById = useMemo(
    () =>
      categories.reduce<Record<string, string>>((acc, category) => {
        acc[category.id] = category.name;
        return acc;
      }, {}),
    [categories]
  );
  const assetsByCategoryId = useMemo(
    () =>
      assets.reduce<Record<string, Asset[]>>((acc, asset) => {
        if (!acc[asset.categoryId]) {
          acc[asset.categoryId] = [];
        }
        acc[asset.categoryId].push(asset);
        return acc;
      }, {}),
    [assets]
  );

  useEffect(() => {
    setExpandedCategoryIds((previous) => {
      const next: Record<string, boolean> = {};
      for (const category of categories) {
        next[category.id] = previous[category.id] ?? true;
      }
      return next;
    });
  }, [categories]);

  const refreshAssets = useCallback(async (): Promise<void> => {
    const result = await client.listAssets({ limit: 50 });
    setAssets(result.items);
  }, [client]);

  const refreshAll = useCallback(async (): Promise<void> => {
    const [assetData, categoryData, settingsData] = await Promise.all([
      client.listAssets({ limit: 50 }),
      client.listCategories(),
      client.getSettings()
    ]);
    setAssets(assetData.items);
    setCategories(categoryData);
    setSettings(settingsData);
    setSettingsMode(settingsData.extractionMode);
    setSettingsProvider(settingsData.aiProvider ?? "openai");
  }, [client]);

  useEffect(() => {
    if (!session?.user) return;
    void refreshAll().catch((e: unknown) => setErrorMessage(e instanceof Error ? e.message : "Failed to load dashboard"));
    const timer = window.setInterval(() => void refreshAssets().catch(() => {}), 5000);
    return () => window.clearInterval(timer);
  }, [session, refreshAll, refreshAssets]);

  const handleSignIn = useCallback(async (provider: "microsoft" | "google"): Promise<void> => {
    setErrorMessage(null); setIsBusy(true);
    try { await authClient.signIn.social({ provider, callbackURL: "/" }); }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : "Sign-in failed"); setIsBusy(false); }
  }, []);

  const handleLogout = useCallback(async (): Promise<void> => {
    setIsBusy(true);
    try { await authClient.signOut(); } catch {}
    setAssets([]); setCategories([]); setSettings(null); setSelectedAsset(null); setIsBusy(false);
  }, []);

  const handleUpload = useCallback(async (): Promise<void> => {
    if (uploadFiles.length === 0) return;
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      for (const file of uploadFiles) await client.uploadFile(file);
      const count = uploadFiles.length;
      setUploadFiles([]); await refreshAssets();
      setNotice(`Queued ${count} file(s) for extraction`);
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Upload failed"); }
    finally { setIsBusy(false); }
  }, [client, refreshAssets, uploadFiles]);

  const handleDeleteAsset = useCallback(async (id: string): Promise<void> => {
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      await client.deleteAsset(id);
      if (selectedAsset?.id === id) setSelectedAsset(null);
      await refreshAssets(); setNotice("Asset deleted");
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Delete failed"); }
    finally { setIsBusy(false); }
  }, [client, refreshAssets, selectedAsset?.id]);

  const handleAssetDetails = useCallback(async (id: string): Promise<void> => {
    setErrorMessage(null); setIsBusy(true);
    try { setSelectedAsset(await client.getAsset(id)); }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : "Failed to load asset"); }
    finally { setIsBusy(false); }
  }, [client]);

  const handleOpenPreview = useCallback(async (asset: Asset): Promise<void> => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const url = await client.getAssetViewUrl(asset.id);
      setPreviewAssetId(asset.id);
      setPreviewUrl(url);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to load preview");
    } finally {
      setIsBusy(false);
    }
  }, [client]);

  const handleClosePreview = useCallback(() => {
    setPreviewUrl(null);
    setPreviewAssetId(null);
  }, []);

  const handleCreateCategory = useCallback(async (): Promise<void> => {
    const name = newCategoryName.trim(); if (!name) return;
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      await client.createCategory(name); setNewCategoryName("");
      const next = await client.listCategories(); setCategories(next);
      setNotice("Category created");
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Category create failed"); }
    finally { setIsBusy(false); }
  }, [client, newCategoryName]);

  const handleMoveAssetCategory = useCallback(async (assetId: string, categoryId: string, successMessage?: string): Promise<void> => {
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      const updated = await client.moveAssetToCategory(assetId, categoryId);
      setAssets((previous) => previous.map((asset) => (asset.id === assetId ? updated : asset)));
      setSelectedAsset((previous) => (previous?.id === assetId ? updated : previous));
      setNotice(successMessage ?? "Asset moved");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Asset move failed");
    } finally {
      setIsBusy(false);
    }
  }, [client]);

  const handleAddAssetToCategory = useCallback(async (categoryId: string): Promise<void> => {
    const selectedAssetId = categoryAssetSelections[categoryId];
    if (!selectedAssetId) return;
    await handleMoveAssetCategory(selectedAssetId, categoryId, "Asset added to category");
    setCategoryAssetSelections((previous) => ({ ...previous, [categoryId]: "" }));
  }, [categoryAssetSelections, handleMoveAssetCategory]);

  const handleDeleteCategory = useCallback(async (cat: Category, categoryAssetCount: number): Promise<void> => {
    if (cat.slug === "general") return;
    const confirmed = window.confirm(
      `Delete category "${cat.name}" and permanently remove ${categoryAssetCount} asset(s) in it? This cannot be undone.`
    );
    if (!confirmed) return;

    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      await client.deleteCategory(cat.id);
      const [nc, na] = await Promise.all([client.listCategories(), client.listAssets({ limit: 50 })]);
      setCategories(nc); setAssets(na.items); setNotice(`Category deleted with ${categoryAssetCount} asset(s)`);
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Category delete failed"); }
    finally { setIsBusy(false); }
  }, [client]);

  const handleSearch = useCallback(async (): Promise<void> => {
    const q = searchQuery.trim(); if (!q) return;
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try { setSearchResult(await client.search(q, 50)); }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : "Search failed"); }
    finally { setIsBusy(false); }
  }, [client, searchQuery]);

  const handleSaveSettings = useCallback(async (): Promise<void> => {
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      const patch: { extractionMode: "ai" | "ocr"; aiProvider?: "openai" | "anthropic" | "google"; apiKey?: string } = { extractionMode: settingsMode };
      if (settingsMode === "ai") patch.aiProvider = settingsProvider;
      if (settingsApiKey.trim()) patch.apiKey = settingsApiKey.trim();
      const updated = await client.updateSettings(patch);
      setSettings(updated); setSettingsMode(updated.extractionMode);
      setSettingsProvider(updated.aiProvider ?? settingsProvider); setSettingsApiKey(""); setNotice("Settings saved");
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Settings update failed"); }
    finally { setIsBusy(false); }
  }, [client, settingsApiKey, settingsMode, settingsProvider]);

  const toggleCategoryExpanded = useCallback((categoryId: string): void => {
    setExpandedCategoryIds((previous) => ({
      ...previous,
      [categoryId]: !(previous[categoryId] ?? true)
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setUploadFiles(files);
  }, []);

  /* ---------- LOADING ---------- */
  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-vault-500" />
          <p className="font-body text-sm text-zinc-500">Loading&hellip;</p>
        </div>
      </main>
    );
  }

  /* ---------- SIGN-IN ---------- */
  if (!session?.user) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute top-[-30%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(212,160,23,0.15) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
          <div className="flex items-center gap-3 text-vault-500">
            <IconVault />
            <h1 className="font-display text-4xl font-extrabold tracking-tight">
              SCAN<span className="text-zinc-100">VAULT</span>
            </h1>
          </div>

          <p className="max-w-md text-center font-body text-base text-zinc-400 leading-relaxed">
            Your secure document intelligence platform. Upload, extract, categorize, and search — powered by OCR and AI.
          </p>

          <div className="flex flex-col gap-3 w-72 animate-slide-up stagger-2">
            <button type="button" onClick={() => void handleSignIn("microsoft")} disabled={isBusy}
              className="group relative flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-surface-2 px-5 py-3.5 font-body text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-zinc-600 hover:bg-surface-3 disabled:opacity-40">
              <IconMicrosoft />
              <span>Continue with Microsoft</span>
              <svg className="ml-auto h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
            </button>

            {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
              <button type="button" onClick={() => void handleSignIn("google")} disabled={isBusy}
                className="group relative flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-surface-2 px-5 py-3.5 font-body text-sm font-medium text-zinc-200 transition-all duration-200 hover:border-zinc-600 hover:bg-surface-3 disabled:opacity-40">
                <IconGoogle />
                <span>Continue with Google</span>
                <svg className="ml-auto h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
              </button>
            )}
          </div>

          {errorMessage && <p className="rounded-lg bg-red-950/40 px-4 py-2 text-sm text-red-400 ring-1 ring-red-900/50">{errorMessage}</p>}

          <p className="text-xs text-zinc-600 mt-2">Encrypted &middot; Private &middot; Secure</p>
        </div>
      </main>
    );
  }

  /* ---------- DASHBOARD ---------- */
  const tabs = [
    { key: "assets" as const, label: "Assets", count: assets.length },
    { key: "categories" as const, label: "Categories", count: categories.length },
    { key: "settings" as const, label: "Settings" },
  ];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-vault-500"><IconVault /></div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-100">ScanVault</h1>
            <p className="font-body text-xs text-zinc-500">{session.user.name ?? session.user.email}</p>
          </div>
        </div>
        <button type="button" onClick={() => void handleLogout()} disabled={isBusy} className="btn-secondary text-xs">Log out</button>
      </header>

      {/* Toasts */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300 ring-1 ring-red-900/40 animate-slide-up">
          <span className="shrink-0 text-red-400">✕</span>{errorMessage}
          <button type="button" onClick={() => setErrorMessage(null)} className="ml-auto text-red-500 hover:text-red-300 text-xs">dismiss</button>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-900/40 animate-slide-up">
          <span className="shrink-0 text-emerald-400">✓</span>{notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto text-emerald-500 hover:text-emerald-300 text-xs">dismiss</button>
        </div>
      )}

      {/* Upload zone */}
      <div
        className={`card p-5 transition-all duration-200 ${dragOver ? "ring-2 ring-vault-500/40 border-vault-600/40" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-700 bg-surface-2 px-5 py-4 transition-colors hover:border-vault-600/50 hover:bg-surface-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload />
            <div>
              <p className="font-body text-sm font-medium text-zinc-300">Drop files or click to browse</p>
              <p className="font-body text-xs text-zinc-600">PNG, JPG, WebP, PDF</p>
            </div>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))} />
          </div>
          {uploadFiles.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-vault-400">{uploadFiles.length} file(s)</span>
              <button type="button" onClick={() => void handleUpload()} disabled={isBusy} className="btn-primary text-xs">
                Upload &amp; Extract
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"><IconSearch /></div>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              placeholder='Search: category:finance total>20 "starbucks"'
              className="input-field pl-9" />
          </div>
          <button type="button" onClick={() => void handleSearch()} disabled={isBusy || !searchQuery.trim()} className="btn-primary text-xs">Search</button>
        </div>
        {searchResult && (
          <div className="mt-4 space-y-2">
            <p className="font-mono text-xs text-zinc-500">{searchResult.items.length} result(s)</p>
            {searchResult.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/60 bg-surface-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-medium text-zinc-200">{item.originalFileName}</p>
                  <p className="truncate font-body text-xs text-zinc-500">{item.summary || "No summary"}</p>
                </div>
                <span className={statusBadge(item.status)}>{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 font-display text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-surface-4 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {"count" in tab && typeof tab.count === "number" && (
              <span className="font-mono text-[10px] text-zinc-600">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Assets tab */}
      {activeTab === "assets" && (
        <div className="grid gap-4 lg:grid-cols-5 animate-fade-in">
          <div className="lg:col-span-3 space-y-2">
            {assets.length === 0 && (
              <div className="card flex flex-col items-center justify-center py-16 text-center">
                <p className="font-body text-sm text-zinc-500">No assets yet. Upload a document to get started.</p>
              </div>
            )}
            {assets.map((asset, i) => (
              <div key={asset.id}
                className={`card flex items-center gap-4 px-4 py-3 cursor-pointer transition-all ${
                  selectedAsset?.id === asset.id ? "ring-1 ring-vault-500/30 border-vault-700/30" : ""
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => void handleAssetDetails(asset.id)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-zinc-500">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M4 2h6l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
                    <path d="M10 2v4h4" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-medium text-zinc-200">{asset.originalFileName}</p>
                  <p className="truncate font-body text-xs text-zinc-600">{asset.summary || "Processing..."}</p>
                  <p className="truncate font-mono text-[10px] text-zinc-500 mt-0.5">{categoryNameById[asset.categoryId] ?? "Uncategorized"}</p>
                </div>
                <span className={statusBadge(asset.status)}>{asset.status}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); void handleDeleteAsset(asset.id); }}
                  disabled={isBusy} className="btn-danger text-xs px-2 py-1">✕</button>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2">
            <div className="card sticky top-6 p-5">
              <h3 className="section-title mb-4">Details</h3>
               {selectedAsset ? (
                 <div className="space-y-4 animate-fade-in">
                  <div>
                    <p className="font-body text-sm font-medium text-zinc-200">{selectedAsset.originalFileName}</p>
                    <p className="font-mono text-[10px] text-zinc-600 mt-0.5">{selectedAsset.id}</p>
                    <p className="font-mono text-[10px] text-zinc-500 mt-1">{categoryNameById[selectedAsset.categoryId] ?? "Uncategorized"}</p>
                  </div>
                  {(selectedAsset.mimeType.startsWith("image/") || selectedAsset.mimeType === "application/pdf") && (
                    <button
                      type="button"
                      onClick={() => void handleOpenPreview(selectedAsset)}
                      disabled={isBusy}
                      className="btn-secondary text-xs"
                    >
                      Quick Preview
                    </button>
                  )}
                  <p className="font-body text-sm text-zinc-400 leading-relaxed">{selectedAsset.summary || "No summary yet"}</p>
                  {selectedAsset.fields.length > 0 && (() => {
                    const receiptDetails = parseReceiptDetails(selectedAsset.fields);
                    if (!receiptDetails.isReceipt) {
                      return (
                        <div>
                          <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Extracted Fields</h4>
                          <div className="space-y-1.5">
                            {selectedAsset.fields.map((f) => (
                              <div key={`${f.key}-${f.value}`} className="flex items-baseline justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
                                <span className="font-mono text-xs text-zinc-400">{f.key}</span>
                                <span className="font-body text-sm text-zinc-200 text-right">{String(f.value)}{f.unit ? ` ${f.unit}` : ""}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-zinc-500">Receipt View</h4>
                        {receiptDetails.metadata.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {receiptDetails.metadata.map((field) => (
                              <div key={field.key} className="rounded-md border border-zinc-800/80 bg-surface-2 px-3 py-2">
                                <p className="font-display text-[10px] uppercase tracking-widest text-zinc-500">{field.label}</p>
                                <p className="mt-1 font-body text-sm text-zinc-200">{field.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {receiptDetails.lineItems.length > 0 && (
                          <div className="overflow-hidden rounded-md border border-zinc-800/80 bg-surface-2">
                            <div className="overflow-x-auto">
                              <div className="min-w-[540px]">
                                <div className="grid grid-cols-[minmax(220px,1fr)_56px_92px_110px] gap-x-3 border-b border-zinc-800/70 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500">
                                  <span>Item</span>
                                  <span className="text-right">Qty</span>
                                  <span className="text-right">Unit</span>
                                  <span className="text-right">Amount</span>
                                </div>
                                {receiptDetails.lineItems.map((item) => (
                                  <div key={item.index} className="grid grid-cols-[minmax(220px,1fr)_56px_92px_110px] gap-x-3 px-4 py-2 text-sm text-zinc-200 odd:bg-black/10">
                                    <span className="font-body pr-2">{item.name}</span>
                                    <span className="text-right font-mono tabular-nums text-zinc-400">{item.qty ?? "-"}</span>
                                    <span className="text-right font-mono tabular-nums text-zinc-400">{item.unitPrice ?? "-"}</span>
                                    <span className="text-right font-mono tabular-nums">{item.price ?? "-"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {receiptDetails.totals.length > 0 && (
                          <div className="rounded-md border border-vault-800/60 bg-vault-950/20 p-3">
                            {receiptDetails.totals.map((total) => (
                              <div key={total.key} className="flex items-center justify-between py-1">
                                <span className="font-display text-[11px] uppercase tracking-widest text-zinc-500">{total.label}</span>
                                <span className={`font-mono ${total.key === "total_amount" ? "text-base text-vault-300" : "text-sm text-zinc-300"}`}>
                                  {total.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {receiptDetails.extraFields.length > 0 && (
                          <div>
                            <h5 className="mb-2 font-display text-[10px] uppercase tracking-widest text-zinc-600">Additional Fields</h5>
                            <div className="space-y-1.5">
                              {receiptDetails.extraFields.map((field) => (
                                <div key={`${field.key}-${field.value}`} className="flex items-baseline justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
                                  <span className="font-mono text-xs text-zinc-500">{fieldLabel(field.key)}</span>
                                  <span className="font-body text-sm text-zinc-200 text-right">{String(field.value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {selectedAsset.entities.length > 0 && (
                    <div>
                      <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Entities</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAsset.entities.map((e) => (
                          <span key={e} className="rounded-full bg-surface-3 px-2.5 py-1 font-mono text-[11px] text-zinc-400">{e}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="font-body text-sm text-zinc-600">Select an asset to view details.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {previewUrl && previewAssetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClosePreview}>
          <div className="relative w-full max-w-4xl rounded-lg border border-zinc-700 bg-surface p-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={handleClosePreview} className="absolute right-3 top-3 btn-danger text-xs px-2 py-1">
              Close
            </button>
            {selectedAsset?.id === previewAssetId && selectedAsset.mimeType === "application/pdf" ? (
              <iframe src={previewUrl} title="Asset preview" className="h-[75vh] w-full rounded border border-zinc-700 bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Asset preview" className="max-h-[75vh] w-full rounded object-contain" />
            )}
          </div>
        </div>
      )}

      {/* Categories tab */}
      {activeTab === "categories" && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreateCategory()}
                placeholder="New category name" className="input-field max-w-xs" />
              <button type="button" onClick={() => void handleCreateCategory()} disabled={isBusy || !newCategoryName.trim()} className="btn-primary text-xs">
                <IconPlus /> Add Category
              </button>
            </div>
            <p className="font-body text-xs text-amber-300/80">Deleting a category permanently deletes all assets inside it.</p>
          </div>

          {categories.map((category) => {
            const categoryAssets = assetsByCategoryId[category.id] ?? [];
            const isExpanded = expandedCategoryIds[category.id] ?? true;
            const movableAssets = assets.filter((asset) => asset.categoryId !== category.id);
            const selectedAssetId = categoryAssetSelections[category.id] ?? "";

            return (
              <section key={category.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800/60 bg-surface-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpanded(category.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    >
                      <path d="M3 2l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-display text-sm font-semibold text-zinc-100">{category.name}</span>
                  </button>
                  <span className="font-mono text-[10px] text-zinc-500">{category.slug}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{categoryAssets.length} assets</span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCategory(category, categoryAssets.length)}
                    disabled={isBusy || category.slug === "general"}
                    className="btn-danger ml-auto text-xs"
                  >
                    Remove Category
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 p-4">
                    <div className="rounded-lg border border-zinc-800/60 bg-surface-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedAssetId}
                          onChange={(event) =>
                            setCategoryAssetSelections((previous) => ({
                              ...previous,
                              [category.id]: event.target.value
                            }))
                          }
                          className="select-field min-w-[220px]"
                        >
                          <option value="">Select asset to add</option>
                          {movableAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.originalFileName}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleAddAssetToCategory(category.id)}
                          disabled={isBusy || !selectedAssetId}
                          className="btn-secondary text-xs"
                        >
                          Add Asset
                        </button>
                      </div>
                    </div>

                    {categoryAssets.length === 0 && (
                      <p className="rounded-lg border border-zinc-800/60 bg-surface-2 px-4 py-3 font-body text-sm text-zinc-500">
                        No assets in this category.
                      </p>
                    )}

                    {categoryAssets.map((asset) => (
                      <div key={asset.id} className="rounded-lg border border-zinc-800/60 bg-surface-2 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-body text-sm font-medium text-zinc-200">{asset.originalFileName}</p>
                            <p className="font-body text-xs text-zinc-500">{asset.summary || "No preview available yet"}</p>
                          </div>
                          <span className={statusBadge(asset.status)}>{asset.status}</span>
                        </div>

                        <p className="mt-2 font-mono text-[10px] text-zinc-500">
                          Type: {asset.mimeType} · Fields: {asset.fields.length} · Entities: {asset.entities.length} · Added: {new Date(asset.createdAt).toLocaleString()}
                        </p>

                        {asset.fields.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {asset.fields.slice(0, 4).map((field) => (
                              <span key={`${asset.id}-${field.key}-${String(field.value)}`} className="rounded-full bg-surface-3 px-2 py-1 font-mono text-[10px] text-zinc-400">
                                {field.key}: {String(field.value)}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <select
                            value={asset.categoryId}
                            onChange={(event) => void handleMoveAssetCategory(asset.id, event.target.value)}
                            disabled={isBusy}
                            className="select-field min-w-[200px]"
                          >
                            {categories.map((optionCategory) => (
                              <option key={optionCategory.id} value={optionCategory.id}>
                                Move to: {optionCategory.name}
                              </option>
                            ))}
                          </select>
                          {(asset.mimeType.startsWith("image/") || asset.mimeType === "application/pdf") && (
                            <button
                              type="button"
                              onClick={() => void handleOpenPreview(asset)}
                              disabled={isBusy}
                              className="btn-secondary text-xs"
                            >
                              Preview
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteAsset(asset.id)}
                            disabled={isBusy}
                            className="btn-danger text-xs"
                          >
                            Remove Asset
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {categories.length === 0 && (
            <div className="card px-4 py-6">
              <p className="font-body text-sm text-zinc-500">No categories available.</p>
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="card p-5 animate-fade-in">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-zinc-500">Extraction Mode</span>
              <select value={settingsMode} onChange={(e) => setSettingsMode(e.target.value as "ai" | "ocr")} className="select-field">
                <option value="ocr">OCR</option>
                <option value="ai">AI</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-zinc-500">AI Provider</span>
              <select value={settingsProvider} disabled={settingsMode !== "ai"}
                onChange={(e) => setSettingsProvider(e.target.value as "openai" | "anthropic" | "google")} className="select-field">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-zinc-500">AI API Key</span>
              <input type="password" value={settingsApiKey} onChange={(e) => setSettingsApiKey(e.target.value)}
                placeholder="sk-..." className="input-field" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button type="button" onClick={() => void handleSaveSettings()} disabled={isBusy} className="btn-primary text-xs">Save Settings</button>
            {settings && <span className="font-mono text-[10px] text-zinc-600">Last updated: {new Date(settings.updatedAt).toLocaleString()}</span>}
          </div>
        </div>
      )}
    </main>
  );
}
