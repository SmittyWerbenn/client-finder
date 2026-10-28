'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/client-api';

type LoginResult = {
  user: { id: string; email: string; name: string; role: string };
};

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch<LoginResult>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const next = nextPath;
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/console');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk. Coba lagi.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <div className="alert alert-error" role="alert">
          <span>!</span>
          <span>{error}</span>
        </div>
      ) : null}

      <label className="field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@perusahaan.com"
          autoComplete="username"
          autoFocus
          required
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          className="input"
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
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
        <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} />
        Tampilkan password
      </label>

      <button className="btn btn-primary btn-block" type="submit" disabled={loading || !email || !password}>
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
        Sesi tersimpan di cookie httpOnly yang tidak bisa dibaca JavaScript.
      </p>
    </form>
  );
}
