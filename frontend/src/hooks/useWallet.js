/**
 * useWallet.js
 * Manages connected wallet state + subscription status.
 * Wallet is stored in localStorage so it persists across refreshes.
 *
 * "Connecting" = user manually enters their public key (G...).
 * In production this would use Freighter browser extension.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchSubscriptionStatus } from '../api';

const WALLET_KEY = 'sgx_connected_wallet';

export function useWallet() {
  const [wallet, setWallet]           = useState(() => localStorage.getItem(WALLET_KEY) || null);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading]   = useState(false);

  // Load subscription status whenever wallet changes
  const refreshSubscription = useCallback(async (addr) => {
    if (!addr) { setSubscription(null); return; }
    setSubLoading(true);
    try {
      const data = await fetchSubscriptionStatus(addr);
      setSubscription(data.subscription);
    } catch {
      setSubscription(null);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscription(wallet);
  }, [wallet, refreshSubscription]);

  const connect = useCallback((address) => {
    localStorage.setItem(WALLET_KEY, address);
    setWallet(address);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(WALLET_KEY);
    setWallet(null);
    setSubscription(null);
  }, []);

  const isSubscribed = subscription?.active === true;

  return {
    wallet,
    subscription,
    subLoading,
    isSubscribed,
    connect,
    disconnect,
    refreshSubscription: () => refreshSubscription(wallet),
  };
}
