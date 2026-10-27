'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CategoryManager from './CategoryManager';
import ProspectTable from './ProspectTable';
import { DEMO, demoCsv, demoSearch } from '@/lib/demo';
import { DEFAULT_CITY, DEFAULT_PROVINCE, JAVA_PROVINCES, citiesForProvince, defaultCityFor, provinceOfCity } from '@/lib/locations';
import type { Category, Prospect, SearchMeta } from '@/lib/types';

type Toast = { message: string; error?: boolean; id: number };

const numberId = new Intl.NumberFormat('id-ID');

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Dashboard({
  initialCategories,
  mockMode,
}: {
  initialCategories: Category[];
  mockMode: boolean;
}) {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.id ?? '');
  const [province, setProvince] = useState(DEFAULT_PROVINCE);
  const [city, setCity] = useState(DEFAULT_CITY);

  const [results, setResults] = useState<Prospect[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, error: isError, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const selected = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? categories[0] ?? null,
    [categories, categoryId],
  );

  const sectors = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      const list = map.get(c.sector) ?? [];
      list.push(c);
      map.set(c.sector, list);
    }
    return [...map.entries()];
  }, [categories]);

  const cityOptions = useMemo(() => citiesForProvince(province), [province]);

  const stats = useMemo(() => {
    const rated = results.filter((r) => typeof r.rating === 'number');
    const avg = rated.length
      ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
      : null;
    return {
      withPhone: results.filter((r) => r.whatsapp).length,
      avg,
    };
  }, [results]);

  const requestSearch = useCallback(
    async (refresh: boolean) => {
      const category = categories.find((c) => c.id === categoryId) ?? categories[0];
      if (!category) {
        setError('Belum ada kategori. Tambahkan kategori terlebih dahulu.');
        return null;
      }
      if (DEMO) {
        // GitHub Pages: tidak ada server — data dibangkitkan lokal di browser.
        await new Promise((resolve) => setTimeout(resolve, 550));
        return demoSearch(category, city.trim(), refresh);
      }
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: category.id,
          city: city.trim(),
          refresh,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        results?: Prospect[];
        meta?: SearchMeta;
      };
      if (!res.ok || !data.ok || !data.results || !data.meta) {
        throw new Error(data.error ?? 'Pencarian gagal. Coba lagi.');
      }
      return data as { results: Prospect[]; meta: SearchMeta };
    },
    [categories, categoryId, city],
  );

  const runSearch = useCallback(
    async (refresh = false) => {
      if (loading) return;
      if (city.trim().length < 2) {
        setError('Pilih provinsi dan kota terlebih dahulu.');
        return;
      }
      if (!selected) {
        setError('Pilih kategori usaha terlebih dahulu.');
        return;
      }
      setLoading(true);
      setSearched(true);
      setError(null);
      try {
        const data = await requestSearch(refresh);
        if (!data) return;
        setResults(data.results);
        setMeta(data.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pencarian gagal.');
      } finally {
        setLoading(false);
      }
    },
    [city, loading, requestSearch, selected],
  );

  async function exportCsv() {
    if (!results.length || exporting) return;
    setExporting(true);
    try {
      // Satu pencarian sudah memuat sampai 100 prospek — tidak perlu halaman lain.
      const seen = new Set<string>();
      const rows = results.filter((r) => (seen.has(r.placeId) ? false : seen.add(r.placeId)));

      if (DEMO) {
        const { csv, fileName } = demoCsv(rows, meta?.sector, meta?.city ?? city);
        saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName);
        notify(`${rows.length} prospek diexport ke CSV.`);
        return;
      }

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, sector: meta?.sector, city: meta?.city ?? city }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Export gagal.');
      }

      const disposition = res.headers.get('content-disposition') ?? '';
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const fileName = match?.[1] ?? `prospek-${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      notify(`${rows.length} prospek diexport ke CSV.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export gagal.', true);
    } finally {
      setExporting(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/login');
    router.refresh();
  }

  const canSearch = Boolean(selected) && city.trim().length >= 2;

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="brand-mark">CF</div>
          <div>
            <div className="brand-name">Client Finder</div>
            <div className="brand-sub">Prospect Engine</div>
          </div>
          <div className="topbar-spacer" />
          {mockMode ? (
            <span
              className="topbar-badge warn hide-sm"
              title={
                DEMO
                  ? 'Demo statis GitHub Pages — data dibangkitkan di browser, bukan dari Google Places'
                  : 'Isi GOOGLE_PLACES_API_KEY di .env.local untuk data asli'
              }
            >
              {DEMO ? 'Demo statis — data contoh' : 'Mode demo — data contoh'}
            </span>
          ) : (
            <span className="topbar-badge">
              <span className="dot-live" />
              Places API aktif
            </span>
          )}
          {!DEMO && (
            <>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowCategories(true)}>
                Kelola Kategori
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={logout}>
                Keluar
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="page-head">
          <div>
            <h1>Cari Prospek Usaha Tanpa Website</h1>
            <p>
              Pilih kategori dan wilayah. Setiap tempat yang sudah punya website otomatis dibuang
              dari daftar.
            </p>
          </div>
          <span className="filter-note">Filter aktif: tanpa website</span>
        </div>

        <div className="metrics">
          <div className="metric m-navy">
            <div className="metric-label">Total Prospek</div>
            <div className="metric-value">
              {meta ? numberId.format(meta.totalQualified) : '—'}
            </div>
            <div className="metric-hint">lolos filter tanpa website</div>
          </div>
          <div className="metric m-green">
            <div className="metric-label">Dipindai</div>
            <div className="metric-value">{meta ? numberId.format(meta.scanned) : '—'}</div>
            <div className="metric-hint">
              {meta ? `${meta.pagesScanned} halaman Google` : 'belum ada pencarian'}
            </div>
          </div>
          <div className="metric m-amber">
            <div className="metric-label">Dilewati</div>
            <div className="metric-value">
              {meta ? numberId.format(meta.skippedWithWebsite) : '—'}
            </div>
            <div className="metric-hint">sudah punya website</div>
          </div>
          <div className="metric">
            <div className="metric-label">Rating Rata-rata</div>
            <div className="metric-value">
              {stats.avg === null ? '—' : stats.avg.toFixed(1)}
            </div>
            <div className="metric-hint">{stats.withPhone} punya nomor telepon</div>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <h2>Parameter Pencarian</h2>
            <span className="sub">Google Places · Text Search</span>
          </div>
          <div className="card-pad">
            <form
              className="search-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch(false);
              }}
            >
              <label className="field">
                <span>Kategori Usaha</span>
                <select
                  className="select"
                  value={selected?.id ?? ''}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {sectors.map(([sector, items]) => (
                    <optgroup key={sector} label={sector}>
                      {items.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.subCategory}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Provinsi</span>
                <select
                  className="select"
                  value={province}
                  onChange={(e) => {
                    const next = e.target.value;
                    setProvince(next);
                    setCity(defaultCityFor(next));
                  }}
                >
                  {JAVA_PROVINCES.map(({ province: name }) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Kota / Kabupaten</span>
                <select
                  className="select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {cityOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <button className="btn btn-primary" type="submit" disabled={loading || !canSearch}>
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Memindai…
                  </>
                ) : (
                  'Cari Prospek'
                )}
              </button>
            </form>

            <div className="pitch-preview">
              <div>
                <span className="pitch-label">Query Text Search</span>
                <code>
                  {(selected?.keyword ?? 'kategori')} di {city || 'kota'}
                </code>{' '}
                — seluruh area kota, tanpa radius. Maksimal{' '}
                <strong>100 prospek tanpa website</strong> per pencarian.
              </div>
            </div>

            {selected && (
              <div className="pitch-preview">
                <div>
                  <span className="pitch-label">
                    Pitch angle — {selected.subCategory} · keyword &quot;{selected.keyword}&quot;
                  </span>
                  {selected.pitch}
                </div>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>!</span>
            <span>{error}</span>
          </div>
        )}

        <section className="card">
          <div className="card-head">
            <h2>Daftar Prospek</h2>
            <span className="sub">
              {meta
                ? `${meta.subCategory} · ${meta.city}${provinceOfCity(meta.city) ? `, ${provinceOfCity(meta.city)}` : ''}`
                : 'belum ada data'}
            </span>
            <span className="spacer" />
            <button
              className="btn btn-navy btn-sm"
              type="button"
              onClick={exportCsv}
              disabled={!results.length || exporting}
            >
              {exporting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Menyiapkan…
                </>
              ) : (
                'Export CSV'
              )}
            </button>
          </div>

          <ProspectTable results={results} loading={loading} searched={searched} />

          <div className="table-toolbar">
            <span>
              {meta
                ? `${numberId.format(meta.totalQualified)} prospek tanpa website dari ${numberId.format(meta.scanned)} tempat dipindai${
                    meta.capped ? ` · batas ${meta.limit} tercapai` : ''
                  }`
                : 'Tekan "Cari Prospek" untuk mulai'}
            </span>
            <div className="pager">
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={loading || !searched}
                onClick={() => void runSearch(true)}
                title="Pindai ulang dari awal (buang cache)"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </section>
      </main>

      {showCategories && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategories(false)}
          onChange={(next) => {
            setCategories(next);
            if (next.length && !next.some((c) => c.id === categoryId)) {
              setCategoryId(next[0].id);
            }
          }}
          notify={notify}
        />
      )}

      {toast && (
        <div className="toast-wrap">
          <div className={`toast${toast.error ? ' error' : ''}`} role="status">
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
