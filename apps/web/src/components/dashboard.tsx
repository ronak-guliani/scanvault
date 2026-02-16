"use client";

import type { Asset, Category, UserSettings } from "@scanvault/shared";
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

export function Dashboard(): JSX.Element {
  const { data: session, isPending } = authClient.useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({});
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
    setRenameInputs(
      categoryData.reduce<Record<string, string>>((acc, c) => { acc[c.id] = c.name; return acc; }, {})
    );
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

  const handleCreateCategory = useCallback(async (): Promise<void> => {
    const name = newCategoryName.trim(); if (!name) return;
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      await client.createCategory(name); setNewCategoryName("");
      const next = await client.listCategories(); setCategories(next);
      setRenameInputs(next.reduce<Record<string, string>>((a, c) => { a[c.id] = c.name; return a; }, {}));
      setNotice("Category created");
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Category create failed"); }
    finally { setIsBusy(false); }
  }, [client, newCategoryName]);

  const handleRenameCategory = useCallback(async (cat: Category): Promise<void> => {
    const name = (renameInputs[cat.id] ?? "").trim(); if (!name || name === cat.name) return;
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try { await client.updateCategory(cat.id, { name }); setCategories(await client.listCategories()); setNotice("Category updated"); }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : "Category update failed"); }
    finally { setIsBusy(false); }
  }, [client, renameInputs]);

  const handleDeleteCategory = useCallback(async (cat: Category): Promise<void> => {
    if (cat.slug === "general") return;
    setErrorMessage(null); setNotice(null); setIsBusy(true);
    try {
      await client.deleteCategory(cat.id);
      const [nc, na] = await Promise.all([client.listCategories(), client.listAssets({ limit: 50 })]);
      setCategories(nc); setAssets(na.items); setNotice("Category deleted");
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
                  </div>
                  <p className="font-body text-sm text-zinc-400 leading-relaxed">{selectedAsset.summary || "No summary yet"}</p>
                  {selectedAsset.fields.length > 0 && (
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
                  )}
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

      {/* Categories tab */}
      {activeTab === "categories" && (
        <div className="card p-5 animate-fade-in">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreateCategory()}
              placeholder="New category name" className="input-field max-w-xs" />
            <button type="button" onClick={() => void handleCreateCategory()} disabled={isBusy || !newCategoryName.trim()} className="btn-primary text-xs">
              <IconPlus /> Create
            </button>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800/60 bg-surface-2 px-4 py-3">
                <input value={renameInputs[cat.id] ?? cat.name}
                  onChange={(e) => setRenameInputs((p) => ({ ...p, [cat.id]: e.target.value }))}
                  className="input-field min-w-[200px] flex-1 max-w-sm" />
                <span className="font-mono text-[10px] text-zinc-600">{cat.slug}</span>
                <span className="font-mono text-[10px] text-zinc-600">{cat.assetCount} assets</span>
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={() => void handleRenameCategory(cat)} disabled={isBusy} className="btn-secondary text-xs">Save</button>
                  <button type="button" onClick={() => void handleDeleteCategory(cat)} disabled={isBusy || cat.slug === "general"} className="btn-danger text-xs">Delete</button>
                </div>
              </div>
            ))}
          </div>
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
