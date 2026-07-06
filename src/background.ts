/*
 * Service Worker for Leaflock Chrome Extension
 * Manages authentication tokens and vault unlock state
 */
/// <reference types="chrome"/>
import { sendMessageToContent } from "./hooks/useContentMessage";
import { deriveKey, decryptData, generateIV } from "./utils/cryptography";
// import { decryptVault, encryptVault } from "./hooks/useCryptoVault";
import type { VaultItem, Vault } from "./types";
import { storageGet, storageSet } from "./utils/storage";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, UNLOCK_TIMESTAMP_KEY, VAULT_KEY, UNLOCK_DURATION } from "./constants";
import api from "./axios";
import { isAxiosError } from "axios";

let isHydrated = false; // Indicates if the service worker has loaded initial state from storage

// In-memory token storage (persists while service worker is active)
let accessToken: string | null = null;
let vaultUnlockKey: CryptoKey | null = null;
let unlockTimestamp: number | null = null;

let vault: Vault | null = null;
const vaultItems: VaultItem[] = [];

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

    // Load access token from session storage
    accessToken = await storageGet(ACCESS_TOKEN_KEY, "session");

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

    await initializeVault();

  } catch (error) {
    console.error("[Background] Error initializing service worker:", error);
  } finally {
    isHydrated = true;
  }
}

async function initializeVault() {
  if (!vaultUnlockKey) {
    console.log("[Background] Vault is locked, skipping vault initialization");
    return;
  }
  const isOnline = navigator.onLine;
  const isOnlineFetchPossible = isOnline && accessToken !== null;
  const storedVault = await storageGet(VAULT_KEY, "local");

  try {
    if (isOnlineFetchPossible) {
      console.log("[Background] Online and access token available, fetching vault from API");
      await fetchVault();
    }
  } catch (error) {
    console.warn("[Background] Failed to fetch vault from API, falling back to stored vault:", error);
    
    // If online fetch fails, try offline
    if (storedVault) {
      vault = storedVault as Vault;
      console.log("[Background] Loaded vault from storage");
    } else {
      console.warn("[Background] No vault found in storage");
    }
  } finally {
    if (!vault || !vault.encrypted_blob) {
      console.log("[Background] No vault item is added yet! escaping decryption.");
      return;
    }
    decryptVaultBlobs()
    .catch((error) => {
      console.error("[Background] Failed to decrypt vault blobs:", error);
    });
  }
}

/**
 * Fetch vault blobs from the API and store them in memory & local storage
 */
async function fetchVault() {
  if (!accessToken) {
    console.warn("[Background] Cannot fetch vault without access token");
    throw new Error("Access token is required to fetch vault");
  }

  const apiInstance = api(accessToken);

  try {
    const res = await apiInstance.get("vaults/blobs/");
    console.log("[Background] Fetched vault blobs from API:", res);
    
    vault = res.data as Vault;
    storageSet(VAULT_KEY, vault, "local");
    console.log("[Background] Fetched and stored vault blobs from API");
  } catch (error) {
    if (isAxiosError(error)) {
      console.warn("[Background] Axios error fetching vault:", error.response?.status, error.response?.data);

      if (error.response?.status === 400) {
        // User's hasn't created a vault yet, create a new one
        console.log("[Background] No vault found, creating a new vault");
        await createNewVault();
        return;
      }
      throw new Error(`Failed to fetch vault blobs: ${error.response?.status} - ${error.response?.data?.detail}`);
    }
  }

  
  // if (res.status !== 200)
  //   throw new Error(`Failed to fetch vault blobs: ${res.status} - ${res.data?.detail}`);
  

}

async function createNewVault() {
  const iv = generateIV();
  const emptyVault = {
    encrypted_blob: "",
    iv: iv,
    version: 1,
  }
  const apiInstance = api(accessToken);
  const res = await apiInstance.post("vaults/blobs/", emptyVault);
  console.log("[Background] Created new vault via API:", res.data);

  if (res.status !== 201)
    throw new Error(`Failed to create new vault: ${res.status} - ${res.data?.detail}`);
  
  vault = res.data as Vault;
  storageSet(VAULT_KEY, vault, "local");
  console.log("[Background] Created and stored new vault");
}

async function decryptVaultBlobs() {
  if (!vaultUnlockKey || !vault) {
    console.warn("[Background] Cannot extract vault blobs without unlock key or vault");
    return;
  }

  const encryptedBlob = vault.encrypted_blob;
  const decryptedBlob = await decryptData(encryptedBlob, vault.iv, vaultUnlockKey);
  const vaultItems: VaultItem[] = JSON.parse(decryptedBlob);
  vaultItems.length = 0;
  vaultItems.push(...vaultItems);
  console.log("[Background] Decrypted vault blobs and stored in memory");
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
async function lockVault(): Promise<void> {
  vaultUnlockKey = null;
  unlockTimestamp = null;

  storageSet(ACCESS_TOKEN_KEY, null, "session");
  storageSet(REFRESH_TOKEN_KEY, null, "session");
  storageSet(UNLOCK_TIMESTAMP_KEY, null, "session");

  chrome.alarms.clear(VAULT_LOCK_ALARM);
  console.log("[Background] Vault locked");

  // Notify all contexts that vault is locked
  await notifyVaultLocked();
}

async function unlockVault(key: CryptoKey): Promise<void> {
  vaultUnlockKey = key;
  unlockTimestamp = Date.now();

  storageSet(UNLOCK_TIMESTAMP_KEY, unlockTimestamp, "session");

  // Schedule auto-lock
  chrome.alarms.clear(VAULT_LOCK_ALARM);
  scheduleVaultLock();
  console.log("[Background] Vault unlocked");

  // Reinitialize vault blobs to ensure they are up-to-date
  await initialize().catch((error) => {
    console.error("[Background] Failed to reinitialize vault after unlock:", error);
  });

  // Notify all contexts that vault is unlocked
  await notifyContentVaultStatus();
}

// async function storeVaultBlobs(vaults: VaultItem[]): Promise<void> {
//   vaultBlobs.length = 0;
//   vaultBlobs.push(...vaults);
//   await storageSet(VAULT_BLOBS_KEY, vaultBlobs, "local");
//   console.log("[Background] Stored vault blobs in memory and local storage");
// }

/**
 * Notify all contexts that vault is locked
 */
async function notifyVaultLocked(): Promise<void> {
  await chrome.runtime.sendMessage({ type: "VAULT_LOCKED" }).catch(() => {
    // Ignore errors if no listeners
  });
}

/**
 * Notify content about vault unlock changes
 * Called when vault unlock or lock
*/
async function notifyContentVaultStatus(): Promise<void> {
  await sendMessageToContent({
    type: "VAULT_STATUS",
    payload: (vaultUnlockKey) ? "unlock" : "lock"
  });
}

// async function decryptVaultItems(encryptedItems: VaultItem[], key: CryptoKey): Promise<VaultItem[]> {
//   const vaults = await Promise.all(
//     encryptedItems.map((vault) => decryptVault(vault, key))
//   );
//   return vaults;
// }

/**
 * Keep the service worker alive by creating a periodic alarm
 * The alarm triggers every 24 seconds to prevent the service worker from being terminated
 */
chrome.alarms.create("KEEP_ALIVE", { periodInMinutes: 0.4 }); // 24 seconds


/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[Background] Alarm triggered: ${alarm.name}`);

  if (alarm.name === "KEEP_ALIVE") {
    // Keep the service worker alive by sending a no-op message to itself
    console.log("[Background] Keep-alive alarm triggered");
  }

  if (alarm.name === VAULT_LOCK_ALARM) {
    await lockVault();
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
          await notifyContentVaultStatus();
          break;
        }

        case "UNLOCK_VAULT": {
          const { password, salt } = message.payload;
          // console.log("[Background] Received unlock request with password and salt: ", password, salt);

          // Implementation for unlocking vault with password and salt
          const vaultUnlockKey = await deriveKey(password, salt);
          await unlockVault(vaultUnlockKey);
          sendResponse({ success: true });
          break;
        }

        case "LOCK_VAULT": {
          await lockVault();
          sendResponse({ success: true });

          // notify context
          await notifyContentVaultStatus();
          break;
        }

        // store vault items in memory
        case "STORE_VAULT_ITEMS": {
          const { items } = message.payload;
          if (!Array.isArray(items) || !items.every((item) => typeof item === "object" && item !== null)) {
            sendResponse({ success: false, error: "Invalid items format" });
            return;
          }
          // await storeVaultBlobs(items);

          sendResponse({ success: true });
          break;
        }

        case "GET_DECRYPTED_VAULT_ITEMS": {
          if (!vaultUnlockKey) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          
          if (!Array.isArray(vaultItems) || !vaultItems.every((item) => typeof item === "object" && item !== null)) {
            sendResponse({ success: false, error: "Invalid vaults format" });
            break;
          }

          const decryptedVaults = vaultItems;
          sendResponse({ success: true, vaults: decryptedVaults });
          break;
        }

        // case "ENCRYPT_VAULT_ITEM": {
        //   if (!vaultUnlockKey) {
        //     sendResponse({ success: false, error: "Vault is locked" });
        //     break;
        //   }
        //   const { vault } = message.payload;
        //   if (typeof vault !== "object" || vault === null) {
        //     sendResponse({ success: false, error: "Invalid vault format" });
        //     break;
        //   }
        //   const encryptedVaultItem = await encryptVault(vault, vaultUnlockKey);
        //   sendResponse({ success: true, blob: encryptedVaultItem });
        //   break;
        // }

        // TODO: Use this to get vault items for autofill based on URL in content script
        // Since vault items are encrypted needs to be decrypted in content script after retrieval
        case "GET_VAULT_ITEMS_FOR_URL": {
          // const { url } = message.payload;
          // Implementation for filtering vault items by URL
          sendResponse({ success: true, blobs: vaultItems });
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
