'use client';

import { DEMO_ACCOUNTS, activeAccount, activeUser, type PrototypeState } from '@/lib/prototype';

export default function UserMenu({
  state,
  onSwitch,
  onUpgrade,
  onTemplates,
}: {
  state: PrototypeState;
  onSwitch: (userId: string) => void;
  onUpgrade: () => void;
  onTemplates: () => void;
}) {
  const user = activeUser(state);
  const account = activeAccount(state);
  const empty = account.credits <= 0;

  return (
    <div className="user-menu">
      <span className="user-avatar" aria-hidden="true">
        {user.initials}
      </span>
      <div className="user-meta">
        <span className="user-name">
          {user.name}
          <span className={`plan-badge ${account.plan === 'Pro' ? 'pro' : 'free'}`}>{account.plan}</span>
        </span>
        <span className="user-sub">{user.company}</span>
      </div>

      <span className={`credit-chip ${empty ? 'empty' : ''}`} title="Sisa kuota kredit demo">
        {account.credits} <small>kredit</small>
      </span>

      <select
        className="user-select"
        value={state.activeUserId}
        onChange={(event) => onSwitch(event.target.value)}
        aria-label="Ganti akun demo"
        title="Ganti akun demo (multi-user)"
      >
        {DEMO_ACCOUNTS.map((entry) => {
          const acc = state.accounts[entry.id];
          return (
            <option key={entry.id} value={entry.id}>
              {entry.name} — {acc?.plan ?? entry.plan} ({acc?.credits ?? 0} kredit)
            </option>
          );
        })}
      </select>

      <button type="button" className="top-btn" onClick={onTemplates} title="Kelola template pesan WhatsApp">
        Template WA
      </button>
      <button type="button" className="top-btn accent" onClick={onUpgrade}>
        {account.plan === 'Pro' ? 'Tambah kredit' : 'Upgrade'}
      </button>
    </div>
  );
}
