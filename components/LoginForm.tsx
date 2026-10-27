'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Gagal masuk. Coba lagi.');
        setLoading(false);
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {!configured && (
        <div className="alert alert-warn">
          <span>!</span>
          <span>
            <strong>APP_ADMIN_PASSWORD belum diisi.</strong> Tambahkan variabel tersebut di file{' '}
            <span className="mono">.env.local</span> lalu restart server.
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <span>!</span>
          <span>{error}</span>
        </div>
      )}

      <label className="field">
        <span>Admin Password</span>
        <input
          className="input"
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          autoFocus
          required
        />
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '0 0 20px',
          fontSize: 13,
          color: 'var(--slate-500)',
          cursor: 'pointer',
        }}
      >
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Tampilkan password
      </label>

      <button className="btn btn-primary btn-block" type="submit" disabled={loading || !password}>
        {loading ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Memverifikasi…
          </>
        ) : (
          'Masuk Dashboard'
        )}
      </button>

      <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--slate-400)', textAlign: 'center' }}>
        Sesi tersimpan di cookie httpOnly (tidak bisa dibaca JavaScript).
      </p>
    </form>
  );
}
