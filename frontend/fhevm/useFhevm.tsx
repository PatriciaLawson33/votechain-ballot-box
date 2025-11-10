import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance } from "./internal/fhevm";

function _assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    const m = message ? `Assertion failed: ${message}` : `Assertion failed.`;
    console.error(m);
    throw new Error(m);
  }
}

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
  initialMockChains?: Readonly<Record<number, string>>;
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;

  // Always call hooks in the same order - no conditional returns
  const [isClient, setIsClient] = useState(false);
  const [instance, _setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, _setStatus] = useState<FhevmGoState>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(false); // Start as false, will be set to enabled when client is ready
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(undefined);
  const _chainIdRef = useRef<number | undefined>(undefined);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(initialMockChains);

  // Set client state
  useEffect(() => {
    setIsClient(true);
    _setIsRunning(enabled);
  }, [enabled]);

  const refresh = useCallback(() => {
    // Only execute if we're on the client side
    if (!isClient) return;

    // Abort any ongoing creation
    if (_abortControllerRef.current) {
      _abortControllerRef.current.abort();
    }

    // Create new abort controller
    _abortControllerRef.current = new AbortController();

    // Reset state
    _setInstance(undefined);
    _setStatus("loading");
    _setError(undefined);

    // Check if provider or chain changed
    const providerChanged =
      _providerRef.current !== provider ||
      _chainIdRef.current !== chainId ||
      _mockChainsRef.current !== initialMockChains;

    if (providerChanged) {
      _providerRef.current = provider;
      _chainIdRef.current = chainId;
      _mockChainsRef.current = initialMockChains as Record<number, string> | undefined;
      _setProviderChanged(prev => prev + 1);
    }

    // Don't create instance if not enabled or no provider
    if (!enabled || !provider) {
      _setStatus("idle");
      return;
    }

    // Create FHEVM instance
    createFhevmInstance({
      provider,
      chainId: chainId || 1,
      mockChains: initialMockChains,
      abortSignal: _abortControllerRef.current.signal,
    })
      .then((newInstance) => {
        if (!_abortControllerRef.current?.signal.aborted) {
          _setInstance(newInstance);
          _setStatus("ready");
          _setError(undefined);
        }
      })
      .catch((err) => {
        if (!_abortControllerRef.current?.signal.aborted) {
          console.error("FHEVM instance creation failed:", err);
          _setInstance(undefined);
          _setStatus("error");
          _setError(err instanceof Error ? err : new Error(String(err)));
        }
      });
  }, [provider, chainId, initialMockChains, enabled, isClient]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    if (isClient) {
      refresh();
    }
  }, [_providerChanged, refresh, isClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    instance,
    refresh,
    error,
    status,
  };
}
