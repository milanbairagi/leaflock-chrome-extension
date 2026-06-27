/*
 * Service Worker for Leaflock Chrome Extension
 * Manages authentication tokens and vault unlock state
 */
/// <reference types="chrome"/>
import { sendMessageToContent } from "./hooks/useContentMessage";
import { type VaultItem } from "./types";

const UNLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

// In-memory token storage (persists while service worker is active)
let accessToken: string | null = null;
let refreshToken: string | null = null;
let vaultUnlockKey: CryptoKey | null = null;
let unlockTimestamp: number | null = null;

// Alarm names
const VAULT_LOCK_ALARM = "leaflock-lock-vault";


const vaultBlobs: VaultItem[] = [];


/**
 * Schedule automatic vault lock
 */
function scheduleVaultLock(): void {
  const lockInterval = UNLOCK_DURATION / 60000; // Convert to minutes
  chrome.alarms.create(VAULT_LOCK_ALARM, {
    delayInMinutes: lockInterval,
  });
  console.log(`[Background] Scheduled vault lock in ${lockInterval} minutes`);
}

/**
 * Check if access token is still valid
 */
function isAccessTokenValid(): boolean {
  if (!accessToken || !unlockTimestamp) {
    return false;
  }
  return Date.now() - unlockTimestamp < UNLOCK_DURATION;
}

/**
 * Check if vault unlock key is still valid
 */
function isVaultUnlockValid(): boolean {
  if (!vaultUnlockKey || !unlockTimestamp) {
    return false;
  }
  return Date.now() - unlockTimestamp < UNLOCK_DURATION;
}

/**
 * Lock the vault
 */
function lockVault(): void {
  accessToken = null;
  refreshToken = null;
  vaultUnlockKey = null;
  unlockTimestamp = null;
  chrome.alarms.clear(VAULT_LOCK_ALARM);
  console.log("[Background] Vault locked");

  // Notify all contexts that vault is locked
  notifyVaultLocked();
}

/**
 * Notify all contexts that vault is locked
 */
function notifyVaultLocked(): void {
  chrome.runtime.sendMessage({ type: "VAULT_LOCKED" }).catch(() => {
    // Ignore errors if no listeners
  });
}

/**
 * Notify content about vault unlock changes
 * Called when vault unlock or lock
*/
function notifyContentVaultStatus(): void {
  sendMessageToContent({
    type: "VAULT_STATUS",
    payload: (vaultUnlockKey) ? "unlock" : "lock"
  });
}


/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`[Background] Alarm triggered: ${alarm.name}`);

  if (alarm.name === VAULT_LOCK_ALARM) {
    lockVault();
  }
});

/**
 * Message handler for communication with popup and other contexts
 */
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  console.log("[Background] Received message:", message.type);

  (async () => {
    try {
      switch (message.type) {
        case "GET_ACCESS_TOKEN": {
          // Return access token if valid, otherwise try to refresh
          const isValid = isAccessTokenValid();
          sendResponse({
            success: isValid ? true : false,
            accessToken: isValid ? accessToken : null,
          });
          break;
        }

        case "GET_REFRESH_TOKEN": {
          const isValid = !!refreshToken && isAccessTokenValid();
          sendResponse({
            success: isValid ? true : false,
            refreshToken: refreshToken,
          });
          break;
        }

        case "GET_VAULT_UNLOCK_KEY": {
          const isValid = isVaultUnlockValid();
          sendResponse({
            success: isValid ? true : false,
            vaultUnlockKey: isValid ? vaultUnlockKey : null,
          });

          // If expired, clear it
          if (!isValid && vaultUnlockKey) {
            lockVault();
          }

          // notify context
          notifyContentVaultStatus();
          break;
        }

        case "SET_AUTH_TOKENS": {
          const { accessToken: newAccess, refreshToken: newRefresh } = message.payload;

          if (!newAccess || !newRefresh) {
            sendResponse({ success: false, error: "Invalid tokens" });
            break;
          }

          if (newAccess && newRefresh) {
            accessToken = newAccess;
            refreshToken = newRefresh;
          }

          console.log("[Background] Auth tokens updated");
          sendResponse({ success: true });
          break;
        }

        case "UNLOCK_VAULT": {
          const { key } = message.payload;
          vaultUnlockKey = key;
          unlockTimestamp = Date.now();

          // Schedule auto-lock
          scheduleVaultLock();

          console.log("[Background] Vault unlocked");
          sendResponse({ success: true });

          // notify context
          notifyContentVaultStatus();
          break;
        }

        case "LOCK_VAULT": {
          lockVault();
          sendResponse({ success: true });

          // notify context
          notifyContentVaultStatus();
          break;
        }

        // store vault items in memory
        case "STORE_VAULT_ITEMS": {
          const { items } = message.payload;
          if (!Array.isArray(items) || !items.every((item) => typeof item === "object" && item !== null)) {
            sendResponse({ success: false, error: "Invalid items format" });
            return;
          }
          vaultBlobs.length = 0;
          vaultBlobs.push(...items);
          console.log("[Background] Stored vault items in memory");
          sendResponse({ success: true });
          break;
        }

        // TODO: Use this to get vault items for autofill based on URL in content script
        // Since vault items are encrypted needs to be decrypted in content script after retrieval
        case "GET_VAULT_ITEMS_FOR_URL": {
          // const { url } = message.payload;
          // Implementation for filtering vault items by URL
          sendResponse({ success: true, blobs: vaultBlobs });
          break;
        }

        default:
          console.warn("[Background] Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("[Background] Error handling message:", error);
      sendResponse({ success: false, error: String(error) });
    }
  })();

  // Return true to indicate we'll send response asynchronously
  return true;
});

console.log("[Background] Service worker loaded");
