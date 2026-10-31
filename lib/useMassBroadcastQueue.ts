'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lead } from './types';
import { normalizeWaPhone, waLink, type WaTemplate } from './outreach';

export type BroadcastPhase = 'idle' | 'running' | 'paused' | 'done' | 'stopped';

export type BroadcastSnapshot = {
  phase: BroadcastPhase;
  total: number;
  sent: number;
  blocked: number;
  currentName: string | null;
  nextIn: number;
  elapsed: number;
};

export type BroadcastStartInput = {
  leads: Lead[];
  template: WaTemplate;
  /** Jeda acak antar chat (detik) — mitigasi anti-spam WhatsApp. */
  delayMinSec: number;
  delayMaxSec: number;
  city: string;
};

type QueueItem = { lead: Lead };

const INITIAL: BroadcastSnapshot = {
  phase: 'idle',
  total: 0,
  sent: 0,
  blocked: 0,
  currentName: null,
  nextIn: 0,
  elapsed: 0,
};

/**
 * Antrean broadcast WhatsApp di sisi client.
 *
 * Membuka satu tab wa.me per kontak dengan jeda acak di antara pengiriman,
 * memperbarui progress, dan menyediakan pause / resume / stop. Pesan di-render
 * ulang per penerima sehingga spintax menghasilkan variasi teks yang unik.
 * Tab dibuka lewat `window.open` — pop-up blocker browser bisa memblokir tab
 * ke-2 dan seterusnya, sehingga jumlah tab yang gagal dihitung di `blocked`.
 */
export function useMassBroadcastQueue(handlers: { onSent?: (lead: Lead) => void } = {}) {
  const [snapshot, setSnapshot] = useState<BroadcastSnapshot>(INITIAL);

  const onSentRef = useRef(handlers.onSent);
  onSentRef.current = handlers.onSent;
  const templateRef = useRef<WaTemplate | null>(null);
  const cityRef = useRef('');

  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);
  const delayMinRef = useRef(5);
  const delayMaxRef = useRef(15);
  const nextDelayRef = useRef(5);
  const timerRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const phaseRef = useRef<BroadcastPhase>('idle');
  const sentRef = useRef(0);
  const blockedRef = useRef(0);

  function clearTimers() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (tickerRef.current !== null) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  function elapsedNow() {
    if (!startedAtRef.current) return 0;
    const paused = pausedTotalRef.current + (pauseStartRef.current ? Date.now() - pauseStartRef.current : 0);
    return Math.max(0, Date.now() - startedAtRef.current - paused);
  }

  function startTicker() {
    if (tickerRef.current !== null) return;
    tickerRef.current = window.setInterval(() => {
      const nextIn = deadlineRef.current > Date.now() ? Math.ceil((deadlineRef.current - Date.now()) / 1000) : 0;
      setSnapshot((prev) => ({ ...prev, elapsed: elapsedNow(), nextIn: prev.phase === 'running' ? nextIn : 0 }));
    }, 500);
  }

  function finish(phase: 'done' | 'stopped') {
    clearTimers();
    deadlineRef.current = 0;
    phaseRef.current = phase;
    setSnapshot((prev) => ({ ...prev, phase, nextIn: 0, elapsed: elapsedNow() }));
  }

  /** Jeda acak 5–15 detik (dapat dikonfigurasi) per pengiriman. */
  function randomDelay(): number {
    const min = Math.max(1, delayMinRef.current);
    const max = Math.max(min, delayMaxRef.current);
    return min + Math.random() * (max - min);
  }

  function schedule() {
    nextDelayRef.current = randomDelay();
    const ms = Math.round(nextDelayRef.current * 1000);
    deadlineRef.current = Date.now() + ms;
    setSnapshot((prev) => ({ ...prev, nextIn: Math.ceil(nextDelayRef.current) }));
    timerRef.current = window.setTimeout(sendNext, ms);
  }

  function sendNext() {
    timerRef.current = null;
    if (phaseRef.current !== 'running') return;

    const item = queueRef.current[indexRef.current];
    if (!item) {
      finish('done');
      return;
    }

    const template = templateRef.current;
    const url = template ? waLink(item.lead, template.body, cityRef.current || item.lead.city || '') : null;

    let win: Window | null = null;
    if (url) {
      try {
        win = window.open(url, '_blank');
      } catch {
        win = null;
      }
    }
    if (!win) {
      blockedRef.current += 1;
    } else {
      try {
        win.opener = null;
      } catch {
        // cross-origin window — abaikan
      }
    }

    indexRef.current += 1;
    sentRef.current += 1;
    onSentRef.current?.(item.lead);

    const isLast = indexRef.current >= queueRef.current.length;
    setSnapshot((prev) => ({
      ...prev,
      sent: sentRef.current,
      blocked: blockedRef.current,
      currentName: item.lead.name,
      nextIn: isLast ? 0 : Math.ceil(nextDelayRef.current),
    }));

    if (isLast) finish('done');
    else schedule();
  }

  const start = useCallback(({ leads, template, delayMinSec, delayMaxSec, city }: BroadcastStartInput) => {
    clearTimers();

    const queue: QueueItem[] = [];
    for (const lead of leads) {
      if (!normalizeWaPhone(lead.whatsapp ?? lead.phoneRaw)) continue;
      queue.push({ lead });
    }
    if (queue.length === 0) return false;

    templateRef.current = template;
    cityRef.current = city;
    queueRef.current = queue;
    indexRef.current = 0;
    sentRef.current = 0;
    blockedRef.current = 0;
    delayMinRef.current = Math.max(1, Math.min(delayMinSec, delayMaxSec));
    delayMaxRef.current = Math.max(delayMinRef.current, delayMaxSec);
    nextDelayRef.current = randomDelay();
    startedAtRef.current = Date.now();
    pausedTotalRef.current = 0;
    pauseStartRef.current = 0;
    phaseRef.current = 'running';

    setSnapshot({
      phase: 'running',
      total: queue.length,
      sent: 0,
      blocked: 0,
      currentName: null,
      nextIn: 0,
      elapsed: 0,
    });
    startTicker();
    sendNext();
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    clearTimers();
    pauseStartRef.current = Date.now();
    phaseRef.current = 'paused';
    setSnapshot((prev) => ({ ...prev, phase: 'paused', nextIn: 0, elapsed: elapsedNow() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    if (pauseStartRef.current) {
      pausedTotalRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
    phaseRef.current = 'running';
    setSnapshot((prev) => ({ ...prev, phase: 'running', elapsed: elapsedNow() }));
    startTicker();
    schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    if (phaseRef.current !== 'running' && phaseRef.current !== 'paused') return;
    finish('stopped');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    queueRef.current = [];
    indexRef.current = 0;
    sentRef.current = 0;
    blockedRef.current = 0;
    startedAtRef.current = 0;
    pausedTotalRef.current = 0;
    pauseStartRef.current = 0;
    deadlineRef.current = 0;
    phaseRef.current = 'idle';
    setSnapshot(INITIAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => clearTimers, []);

  return { snapshot, start, pause, resume, stop, reset };
}
