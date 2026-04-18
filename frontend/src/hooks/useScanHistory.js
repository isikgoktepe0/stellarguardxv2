/**
 * useScanHistory.js
 * Persists scan history and watchlist to localStorage.
 * History: last 20 scans with full report snapshot.
 * Watchlist: set of wallet addresses to auto-monitor.
 */

import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY   = 'sgx_scan_history';
const WATCHLIST_KEY = 'sgx_watchlist';
const MAX_HISTORY   = 20;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useScanHistory() {
  const [history,   setHistory]   = useState(() => load(HISTORY_KEY, []));
  const [watchlist, setWatchlist] = useState(() => load(WATCHLIST_KEY, []));

  // Persist on change
  useEffect(() => save(HISTORY_KEY,   history),   [history]);
  useEffect(() => save(WATCHLIST_KEY, watchlist), [watchlist]);

  /** Add or update a scan result in history */
  const addScan = useCallback((report) => {
    setHistory((prev) => {
      // Remove existing entry for same wallet, prepend new one
      const filtered = prev.filter((h) => h.wallet !== report.wallet);
      const entry = {
        wallet:       report.wallet,
        risk_score:   report.risk_score,
        risk_level:   report.risk_level,
        tx_count:     report.transaction_count,
        is_blacklisted: report.is_blacklisted,
        patterns_count: report.patterns?.length ?? 0,
        scanned_at:   new Date().toISOString(),
      };
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  /** Remove a single history entry */
  const removeHistory = useCallback((wallet) => {
    setHistory((prev) => prev.filter((h) => h.wallet !== wallet));
  }, []);

  /** Clear all history */
  const clearHistory = useCallback(() => setHistory([]), []);

  /** Add wallet to watchlist */
  const addWatch = useCallback((wallet) => {
    setWatchlist((prev) =>
      prev.includes(wallet) ? prev : [...prev, wallet]
    );
  }, []);

  /** Remove wallet from watchlist */
  const removeWatch = useCallback((wallet) => {
    setWatchlist((prev) => prev.filter((w) => w !== wallet));
  }, []);

  /** Toggle watchlist membership */
  const toggleWatch = useCallback((wallet) => {
    setWatchlist((prev) =>
      prev.includes(wallet)
        ? prev.filter((w) => w !== wallet)
        : [...prev, wallet]
    );
  }, []);

  const isWatched = useCallback(
    (wallet) => watchlist.includes(wallet),
    [watchlist]
  );

  return {
    history, addScan, removeHistory, clearHistory,
    watchlist, addWatch, removeWatch, toggleWatch, isWatched,
  };
}
