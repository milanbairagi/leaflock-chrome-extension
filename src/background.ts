/*
 * Service Worker for Leaflock Chrome Extension
 * Manages authentication tokens and vault unlock state
 */
/// <reference types="chrome"/>
import { sendMessageToContent } from "./hooks/useContentMessage";
import { deriveKey } from "./utils/cryptography";
import { decryptVault, encryptVault } from "./hooks/useCryptoVault";
import { type VaultItem } from "./types";
import { storageGet, storageSet } from "./utils/storage";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, UNLOCK_TIMESTAMP_KEY, VAULT_BLOBS_KEY, UNLOCK_DURATION } from "./constants";

let isHydrated = false; // Indicates if the service worker has loaded initial state from storage

// In-memory token storage (persists while service worker is active)
let vaultUnlockKey: CryptoKey | null = null;
let unlockTimestamp: number | null = null;

const vaultBlobs: VaultItem[] = [];

// Alarm names
const VAULT_LOCK_ALARM = "leaflock-lock-vault";

/**
 * Initialize the service worker
 * - Load refresh token from storage
 * - Set up alarms
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("[Background] Service worker starting up");
  await initialize();
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Background] Extension installed/updated");
  await initialize();
});

async function initialize() {
  try {
    isHydrated = false;

    // Load unlock timestamp from storage
    const storedUnlockTimestamp = await storageGet(UNLOCK_TIMESTAMP_KEY, "session");
    unlockTimestamp = storedUnlockTimestamp || null;
    
    // If the vault is unlocked, schedule auto-lock
    if (isVaultUnlockValid()) {
      chrome.alarms.clear(VAULT_LOCK_ALARM);
      scheduleVaultLock();
      console.log("[Background] Vault is unlocked, auto-lock scheduled");
    } else {
      lockVault();
      console.log("[Background] Vault is locked on startup");
    }

    initializeVaultBlobs();

  } catch (error) {
    console.error("[Background] Error initializing service worker:", error);
  } finally {
    isHydrated = true;
  }
}

async function initializeVaultBlobs() {
  try {
    const storedVaultBlobs = await storageGet(VAULT_BLOBS_KEY, "local");

    if (storedVaultBlobs) {
      vaultBlobs.length = 0;
      vaultBlobs.push(...storedVaultBlobs);
      console.log("[Background] Loaded vault blobs from storage");
    } else {
      console.log("[Background] No vault blobs found in storage");
    }

  } catch (error) {
    console.error("[Background] Error initializing vault blobs:", error);
  }
}

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
 * Check if vault unlock key is still valid
 */
function isVaultUnlockValid(): boolean {
  if (!vaultUnlockKey || !unlockTimestamp) {
    return false;
  }
  if (!(vaultUnlockKey instanceof CryptoKey)) {
    console.warn("[Background] vaultUnlockKey is not a valid CryptoKey");
    return false;
  }
  return Date.now() - unlockTimestamp < UNLOCK_DURATION;
}

/**
 * Lock the vault
 */
function lockVault(): void {
  vaultUnlockKey = null;
  unlockTimestamp = null;

  storageSet(ACCESS_TOKEN_KEY, null, "session");
  storageSet(REFRESH_TOKEN_KEY, null, "session");
  storageSet(UNLOCK_TIMESTAMP_KEY, null, "session");

  chrome.alarms.clear(VAULT_LOCK_ALARM);
  console.log("[Background] Vault locked");

  // Notify all contexts that vault is locked
  notifyVaultLocked();
}

function unlockVault(key: CryptoKey): void {
  vaultUnlockKey = key;
  unlockTimestamp = Date.now();

  storageSet(UNLOCK_TIMESTAMP_KEY, unlockTimestamp, "session");

  // Schedule auto-lock
  chrome.alarms.clear(VAULT_LOCK_ALARM);
  scheduleVaultLock();
  console.log("[Background] Vault unlocked");

  // Notify all contexts that vault is unlocked
  notifyContentVaultStatus();
}

async function storeVaultBlobs(vaults: VaultItem[]): Promise<void> {
  vaultBlobs.length = 0;
  vaultBlobs.push(...vaults);
  await storageSet(VAULT_BLOBS_KEY, vaultBlobs, "local");
  console.log("[Background] Stored vault blobs in memory and local storage");
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

async function decryptVaultItems(encryptedItems: VaultItem[], key: CryptoKey): Promise<VaultItem[]> {
  const vaults = await Promise.all(
    encryptedItems.map((vault) => decryptVault(vault, key))
  );
  return vaults;
}

/**
 * Keep the service worker alive by creating a periodic alarm
 * The alarm triggers every 24 seconds to prevent the service worker from being terminated
 */
chrome.alarms.create("KEEP_ALIVE", { periodInMinutes: 0.4 }); // 24 seconds


/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`[Background] Alarm triggered: ${alarm.name}`);

  if (alarm.name === "KEEP_ALIVE") {
    // Keep the service worker alive by sending a no-op message to itself
    console.log("[Background] Keep-alive alarm triggered");
  }

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
      while (!isHydrated) {
        console.log("[Background] Waiting for service worker to hydrate...");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      switch (message.type) {

        case "HAS_UNLOCK_KEY": {
          const isValid = isVaultUnlockValid();
          sendResponse({
            success: isValid,
          });

          // notify context
          notifyContentVaultStatus();
          break;
        }

        case "UNLOCK_VAULT": {
          const { password, salt } = message.payload;
          // console.log("[Background] Received unlock request with password and salt: ", password, salt);

          // Implementation for unlocking vault with password and salt
          const vaultUnlockKey = await deriveKey(password, salt);
          unlockVault(vaultUnlockKey);
          sendResponse({ success: true });
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
          await storeVaultBlobs(items);

          sendResponse({ success: true });
          break;
        }

        case "GET_DECRYPTED_VAULT_ITEMS": {
          if (!vaultUnlockKey) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          
          if (!Array.isArray(vaultBlobs) || !vaultBlobs.every((item) => typeof item === "object" && item !== null)) {
            sendResponse({ success: false, error: "Invalid vaults format" });
            break;
          }

          const decryptedVaults = await decryptVaultItems(vaultBlobs, vaultUnlockKey);
          sendResponse({ success: true, vaults: decryptedVaults });
          break;
        }

        case "ENCRYPT_VAULT_ITEM": {
          if (!vaultUnlockKey) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          const { vault } = message.payload;
          if (typeof vault !== "object" || vault === null) {
            sendResponse({ success: false, error: "Invalid vault format" });
            break;
          }
          const encryptedVaultItem = await encryptVault(vault, vaultUnlockKey);
          sendResponse({ success: true, blob: encryptedVaultItem });
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
