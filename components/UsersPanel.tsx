'use client';

import { useState } from 'react';
import type { PublicUser, Role } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/roles';
import { apiFetch } from '@/lib/client-api';

const ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'USER'];

type CreateForm = { name: string; email: string; password: string; role: Role };
const EMPTY_CREATE: CreateForm = { name: '', email: '', password: '', role: 'USER' };

export default function UsersPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: PublicUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; role: Role; isActive: boolean }>({
    name: '',
    email: '',
    role: 'USER',
    isActive: true,
  });
  const [resetTarget, setResetTarget] = useState<PublicUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sync() {
    const payload = await apiFetch<{ users: PublicUser[] }>('/api/admin/users');
    setUsers(payload.users);
  }

  function flash(message: string, isError = false) {
    if (isError) {
      setError(message);
      setNotice(null);
    } else {
      setNotice(message);
      setError(null);
    }
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(createForm) });
      await sync();
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      flash('User baru dibuat.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal membuat user.', true);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      await sync();
      setEditing(null);
      flash('User diperbarui.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal memperbarui user.', true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: PublicUser) {
    setBusyId(user.id);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await sync();
      flash(user.isActive ? 'User dinonaktifkan.' : 'User diaktifkan.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal mengubah status user.', true);
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!resetTarget || busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(resetTarget.id)}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      setResetTarget(null);
      setNewPassword('');
      flash('Password berhasil direset.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal mereset password.', true);
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(user: PublicUser) {
    if (!window.confirm(`Hapus user "${user.name}" beserta seluruh lead miliknya?`)) return;
    setBusyId(user.id);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      await sync();
      flash('User dihapus.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Gagal menghapus user.', true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>Manajemen User</h1>
          <p>Buat akun, atur role, reset password, dan nonaktifkan akses tanpa menghapus data.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Buat User
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-info">{notice}</div> : null}

      <div className="card">
        <div className="table-wrap">
          <table className="prospects">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Lead</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nama">
                    <div className="biz-name">{user.name}</div>
                    {user.id === currentUserId ? <span className="cell-sub">akun Anda</span> : null}
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <span className={`role-badge role-${user.role.toLowerCase()}`}>{ROLE_LABELS[user.role]}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${user.isActive ? 'is-positive' : 'is-negative'}`}>
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td data-label="Lead">{user.leads ?? 0}</td>
                  <td data-label="Aksi">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setEditing(user);
                          setEditForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
                          setError(null);
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setResetTarget(user)}>
                        Reset Password
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => void toggleActive(user)}
                        disabled={busyId === user.id || user.id === currentUserId}
                      >
                        {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => void removeUser(user)}
                        disabled={busyId === user.id || user.id === currentUserId}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate ? (
        <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setShowCreate(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Buat user">
            <div className="modal-head">
              <div>
                <h2>Buat User Baru</h2>
                <p>Password awal wajib diganti user setelah login pertama.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowCreate(false)} aria-label="Tutup">
                ×
              </button>
            </div>
            <form onSubmit={createUser}>
              <div className="modal-body">
                <label className="field">
                  <span>Nama *</span>
                  <input className="input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required maxLength={80} />
                </label>
                <label className="field">
                  <span>Email *</span>
                  <input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Password awal *</span>
                    <input className="input" type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} minLength={10} required />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select className="select" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}>
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setEditing(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Edit user">
            <div className="modal-head">
              <div>
                <h2>Edit User</h2>
                <p>{editing.email}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditing(null)} aria-label="Tutup">
                ×
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="modal-body">
                <label className="field">
                  <span>Nama</span>
                  <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required maxLength={80} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Role</span>
                    <select
                      className="select"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                      disabled={editing.id === currentUserId}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      className="select"
                      value={editForm.isActive ? '1' : '0'}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === '1' })}
                      disabled={editing.id === currentUserId}
                    >
                      <option value="1">Aktif</option>
                      <option value="0">Nonaktif</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setResetTarget(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Reset password">
            <div className="modal-head">
              <div>
                <h2>Reset Password</h2>
                <p>{resetTarget.name} · {resetTarget.email}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setResetTarget(null)} aria-label="Tutup">
                ×
              </button>
            </div>
            <form onSubmit={resetPassword}>
              <div className="modal-body">
                <label className="field">
                  <span>Password baru (min. 10 karakter)</span>
                  <input className="input" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={10} required />
                </label>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setResetTarget(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy || newPassword.length < 10}>
                  {busy ? 'Menyimpan…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
