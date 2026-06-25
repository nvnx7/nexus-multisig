"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";
import { FreighterModule } from "@creit-tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit-tech/stellar-wallets-kit/modules/lobstr";
import { ShieldedWallet } from "@/lib/shielded";
import { passphraseNetwork } from "@/config/env";
import { registerShieldedAddress } from "@/api/pool/register";
import { getShieldedAddress } from "@/api/pool/getShieldedAddress";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

const DERIVATION_MSG = "nexus:v1:derive-shielded-key";

// ── Kit initialisation (lazy, browser-only) ────────────────────────────────

let kitReady = false;

function ensureKit() {
  if (kitReady) return;
  StellarWalletsKit.init({
    modules: [new FreighterModule(), new LobstrModule()],
    network: passphraseNetwork,
  });
  kitReady = true;
}

// ── Shielded key cache ─────────────────────────────────────────────────────

const STELLAR_ADDR_KEY = "nexus_stellar_addr";
const SHIELDED_PREFIX = "nexus_shielded_v1:";

function cacheLoad(stellarAddress: string): ShieldedWallet | null {
  try {
    const hex = localStorage.getItem(SHIELDED_PREFIX + stellarAddress);
    if (!hex) return null;
    return ShieldedWallet.fromMasterKey(hexToBytes(hex));
  } catch {
    return null;
  }
}

function cacheSave(stellarAddress: string, w: ShieldedWallet): void {
  localStorage.setItem(
    SHIELDED_PREFIX + stellarAddress,
    bytesToHex(w.masterSecret),
  );
}

// ── Context types ──────────────────────────────────────────────────────────

export type ConnectPhase =
  | "idle"
  | "connecting"
  | "signing"
  | "registering"
  | "done";

export interface WalletContextValue {
  /** Stellar G... address of the connected wallet. */
  stellarAddress: string | null;
  /** Derived shielded identity — set iff stellarAddress is set and registered. */
  shielded: ShieldedWallet | null;
  /** True once the localStorage restore has completed on mount. */
  isHydrated: boolean;
  /** Which sub-step of the connection flow we are in. */
  connectPhase: ConnectPhase;
  /** Non-null if the last connect() call failed. */
  connectError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [stellarAddress, setStellarAddress] = useState<string | null>(null);
  const [shielded, setShielded] = useState<ShieldedWallet | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [connectPhase, setConnectPhase] = useState<ConnectPhase>("idle");
  const [connectError, setConnectError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const addr = localStorage.getItem(STELLAR_ADDR_KEY);
    if (addr) {
      const cached = cacheLoad(addr);
      if (cached) {
        setStellarAddress(addr);
        setShielded(cached);
      } else {
        localStorage.removeItem(STELLAR_ADDR_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  const connect = useCallback(async () => {
    setConnectError(null);
    ensureKit();
    setConnectPhase("connecting");

    try {
      // Wallet selection modal
      const { address } = await StellarWalletsKit.authModal();

      // Cache hit skips signing; cache miss prompts signature to derive keys
      let shieldedWallet = cacheLoad(address);
      if (!shieldedWallet) {
        setConnectPhase("signing");
        const { signedMessage } = await StellarWalletsKit.signMessage(
          DERIVATION_MSG,
          { address, networkPassphrase: passphraseNetwork },
        );
        shieldedWallet = ShieldedWallet.fromSignature(
          Buffer.from(signedMessage, "base64"),
        );
      }

      // Always check on-chain — cache hit doesn't guarantee registration
      console.log("fetching..");

      const onchainAddr = await getShieldedAddress(address);
      console.log("onchainAddr", onchainAddr);

      if (!onchainAddr) {
        console.log("registering...");
        setConnectPhase("registering");
        await registerShieldedAddress({
          owner: address,
          shieldedAddress: shieldedWallet.shieldedAddress(),
        });
        console.log("registered");
      }

      cacheSave(address, shieldedWallet);
      localStorage.setItem(STELLAR_ADDR_KEY, address);
      setStellarAddress(address);
      setShielded(shieldedWallet);
      setConnectPhase("done");
    } catch (err: unknown) {
      setStellarAddress(null);
      setShielded(null);
      localStorage.removeItem(STELLAR_ADDR_KEY);
      StellarWalletsKit.disconnect().catch(() => {});
      setConnectPhase("idle");

      const isUserCancel =
        typeof err === "object" &&
        err !== null &&
        (err as { code?: number }).code === -1;
      if (!isUserCancel) {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "Wallet connection failed.";
        setConnectError(msg);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setStellarAddress(null);
    setShielded(null);
    setConnectError(null);
    setConnectPhase("idle");
    localStorage.removeItem(STELLAR_ADDR_KEY);
    StellarWalletsKit.disconnect().catch(() => {});
  }, []);

  return (
    <WalletContext.Provider
      value={{
        stellarAddress,
        shielded,
        isHydrated,
        connectPhase,
        connectError,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
