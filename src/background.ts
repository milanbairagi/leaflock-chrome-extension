/*
 * Service Worker for Leaflock Chrome Extension
 * Manages authentication tokens and vault unlock state
 */
/// <reference types="chrome"/>
import { sendMessageToContent } from "./hooks/useContentMessage";
import { deriveKey, decryptData, generateIV, encryptData, authHash } from "./utils/cryptography";
import type { VaultItem, Vault } from "./types";
import { storageGet, storageSet } from "./utils/storage";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, UNLOCK_TIMESTAMP_KEY, VAULT_KEY, UNLOCK_DURATION, USER_DATA_KEY } from "./constants";
import api from "./axios";
import { isAxiosError } from "axios";
import { mergeVaultItems } from "./utils/vaultHelper";

let isHydrated = false; // Indicates if the service worker has loaded initial state from storage

// In-memory token storage (persists while service worker is active)
let accessToken: string | null = null;
let vaultUnlockKey: CryptoKey | null = null;
let unlockTimestamp: number | null = null;

let vault: Vault | null = null;
const vaultItems: VaultItem[] = [];

let authHashValue: string | null = null; // Store the hash of the password and email for background unlock validation

// Alarm names
const VAULT_LOCK_ALARM = "leaflock-lock-vault";
const PENDING_SAVE_PROMPT_KEY = "leaflock-pending-save-prompt";

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
    console.warn("[Background] Error initializing service worker:", error);
  } finally {
    isHydrated = true;
  }
}

async function fetchTokens() {
  if (accessToken) return; // Tokens already fetched
  const user = await storageGet(USER_DATA_KEY, "local");
  if (!user || !user.email) {
    console.warn("[Background] No user data available for fetching tokens");
    return;
  }
  const apiInstance = api(null);

  try {
    const res = await apiInstance.post("/accounts/token/", {
      email: user.email,
      password: authHashValue,
    });
    accessToken = res.data.access;
    storageSet(ACCESS_TOKEN_KEY, accessToken, "session");
    console.log("[Background] Fetched and stored access token");
  } catch (error) {
    console.warn("[Background] Error fetching tokens:", error);
  }
}

async function initializeVault() {
  if (!vaultUnlockKey) {
    console.log("[Background] Vault is locked, skipping vault initialization");
    return;
  }
  
  const storedVault = await storageGet(VAULT_KEY, "local");

  if (storedVault) {
    vault = storedVault as Vault;
    console.log("[Background] Loaded vault from storage: ", storedVault);
    await decryptVaultBlobs().catch((error) => {
      console.warn("[Background] Failed to decrypt vault blobs during initialization:", error);
    });
  } else {
    console.warn("[Background] No vault found in storage");
  }

  
  if (!vault || !vault.encrypted_blob) {
    console.log("[Background] No vault found, fetching from API");
    try {
      const fetchedVault = await fetchVault();
      if (fetchedVault) {
        vault = fetchedVault;
        storageSet(VAULT_KEY, vault, "local");
      }
    } catch (error) {
      console.warn("[Background] Failed to fetch vault from API during initialization:", error);
    }
    return;
  }

  await syncVault();
  
  try {
    await decryptVaultBlobs();
  } catch(error) {
    console.warn("[Background] Failed to decrypt vault blobs during initialization:", error);
  }

}

/**
 * Fetch vault blobs from the API and store them in memory & local storage
 */
async function fetchVault(): Promise<Vault | undefined> {
  if (!accessToken) {
    console.warn("[Background] Cannot fetch vault without access token");
    await fetchTokens();
    if (!accessToken)
      throw new Error("Access token is required to fetch vault");
  }

  const apiInstance = api(accessToken);

  try {
    const res = await apiInstance.get("vaults/blobs/");
    console.log("[Background] Fetched vault blobs from API:", res);
    return res.data as Vault;
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
}

/**
 * Update the vault in local storage after adding, updating, or deleting a vault item
 * This function encrypts the vault items and updates the vault in local storage
 * It does not sync with the server; use syncVault() for that
 */
async function updateVaultInStorage() {
  if (!vaultUnlockKey || !vault) {
    console.warn("[Background] Cannot update vault in storage without unlock key or vault");
    return;
  }
  console.log("[Background] Updating vault in storage with current vault items");
  const updatedVaultItemsBlob = JSON.stringify(vaultItems);
  const encryptedBlob = await encryptData(updatedVaultItemsBlob, vaultUnlockKey, vault.iv);
  vault.encrypted_blob = encryptedBlob.ciphertext;
  storageSet(VAULT_KEY, vault, "local");
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

async function updateVault(vaultItem: VaultItem) {
  if (!vaultUnlockKey || !vault) {
    console.warn("[Background] Cannot update vault in storage without unlock key or vault");
    return;
  }
  console.log("[Background] Updating vault item in storage:", vaultItem);
  // Find vault item by ID and update it
  const item = vaultItems.find((item) => item.id === vaultItem.id);
  if (!item) {
    console.warn("[Background] Vault item not found for update");
    throw new Error("Vault item not found for update");
    return;
  }
  vaultItem.updated_at = new Date().toISOString();
  Object.assign(item, vaultItem);

  updateVaultInStorage();

  await syncVault();
}

async function decryptVaultBlobs() {
  if (!vaultUnlockKey || !vault || !vault.encrypted_blob || !vault.iv) {
    console.warn("[Background] Cannot extract vault blobs without unlock key or vault");
    return;
  }

  const encryptedBlob = vault.encrypted_blob;
  const decryptedBlob = await decryptData(encryptedBlob, vault.iv, vaultUnlockKey);
  console.log("[Background] Decrypted vault blobs:", decryptedBlob);
  const parsedVaultItems: VaultItem[] = JSON.parse(decryptedBlob);
  console.log("[Background] Parsed decrypted vault blobs:", parsedVaultItems);
  vaultItems.length = 0;
  vaultItems.push(...parsedVaultItems);
  console.log("[Background] Decrypted vault blobs and stored in memory");
  console.log("[Background] Current vault items:", vaultItems);
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

async function addNewVaultItem(vaultItem: VaultItem) {
  if (!vaultUnlockKey)
    throw new Error("Vault is locked, cannot add new vault item");

  if (!vault)
    throw new Error("Vault is not initialized, cannot add new vault item");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  const newVaultItem: VaultItem = {
    ...vaultItem,
    id,
    created_at: createdAt,
    updated_at: updatedAt,
  };
  vaultItems.push(newVaultItem);

  // Update the vault in storage
  await updateVaultInStorage();

  // Sync to the server
  await syncVault();
  return newVaultItem.id;
}

async function deleteVaultItem(vaultItemId: string) {
  if (!vaultUnlockKey)
    throw new Error("Vault is locked, cannot delete vault item");

  if (!vault)
    throw new Error("Vault is not initialized, cannot delete vault item");

  const itemIndex = vaultItems.findIndex((item) => item.id === vaultItemId);
  if (itemIndex === -1) {
    console.warn("[Background] Vault item not found for deletion");
    throw new Error("Vault item not found for deletion");
  }

  vaultItems[itemIndex].is_deleted = true;
  vaultItems[itemIndex].updated_at = new Date().toISOString();

  // Update the vault in storage
  await updateVaultInStorage();

  // Sync to the server
  await syncVault();
}

async function syncVault() {
  if (!vault) {
    console.warn("[Background] No vault to sync");
    return;
  }
  const isOnline = navigator.onLine;
  if (!isOnline) {
    console.log("[Background] Coundn't connect to the internet!");
    return
  }

  if (!vaultUnlockKey) {
    console.warn("[Background] Vault is locked, cannot sync vault");
    return;
  }

  if (!accessToken) {
    console.log("[Background] No access token, trying to fetch tokens...");
    await fetchTokens();
    if (!accessToken) {
      console.warn("[Background] Failed to fetch access token");
      return;
    }
  }
  
  const localVaultItems: VaultItem[] = vaultItems;
  console.log("[Background] Local vault items before sync:", localVaultItems);
  let remoteVault: Vault | undefined;
  let remoteVaultItems: VaultItem[] = [];
  let mergedVaultItems: VaultItem[] = [];
  
  const apiInstance = api(accessToken);

  // Fetch vault from API if online and access token is available
  try {
    remoteVault = await fetchVault();
  } catch (error) {
    console.warn("[Background] Failed to fetch vault from API:", error);
    return;
  }

  if (!remoteVault) {
    console.warn("[Background] No remote vault found.");
    return;
  }

  if (vault.encrypted_blob === remoteVault.encrypted_blob) {
    console.log("[Background] Vault items are already in sync.");
    return;
  }

  console.log("[Background] Remote vault fetched from API:", remoteVault);
  // Decrypt remote vault items if available
  if (remoteVault && remoteVault.encrypted_blob) {
    try {
      console.log("[Background] Decrypting remote vault blob:");
      const decryptedRemoteBlob = await decryptData(remoteVault.encrypted_blob, remoteVault.iv, vaultUnlockKey);
      console.log("[Background] Decrypted remote vault blob:", decryptedRemoteBlob);
      remoteVaultItems = JSON.parse(decryptedRemoteBlob) as VaultItem[];
      console.log("[Background] Decrypted remote vault items:", remoteVaultItems);
    } catch (error) {
      console.warn("[Background] Failed to decrypt remote vault items:", error);
    }
  }

  // Merge local and remote vault items
  if (localVaultItems && remoteVaultItems) {
    mergedVaultItems = mergeVaultItems(localVaultItems, remoteVaultItems);
  } else if (localVaultItems) {
    mergedVaultItems = localVaultItems;
  } else if (remoteVaultItems) {
    mergedVaultItems = remoteVaultItems;
  }

  // Update the vault items in memory with the merged result
  vaultItems.length = 0;
  vaultItems.push(...mergedVaultItems);
  console.log("[Background] Merged vault items:", vaultItems);

  // Encrypt the merged vault items and update the vault
  const updatedVaultItemsBlob = JSON.stringify(vaultItems);
  const encryptedBlob = await encryptData(updatedVaultItemsBlob, vaultUnlockKey!, vault!.iv);
  vault!.encrypted_blob = encryptedBlob.ciphertext;
  vault!.version = Math.max(vault!.version, (remoteVault?.version || 0));

  // Update the vault in the API
  try {
    const res = await apiInstance.put("vaults/blobs/sync/", vault);
    if (res.status === 200) {
      vault = res.data;
      storageSet(VAULT_KEY, vault, "local");
    }
    console.log("[Background] After syncing the vault: ", vault);
  } catch (error) {
    console.warn("[Background] Failed to sync vault:", error);
  }
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
  console.log("[Background] Vault unlocked with key:", vaultUnlockKey);
  console.log("[Background] Vault unlocked at timestamp:", unlockTimestamp);

  storageSet(UNLOCK_TIMESTAMP_KEY, unlockTimestamp, "session");

  // Schedule auto-lock
  chrome.alarms.clear(VAULT_LOCK_ALARM);
  scheduleVaultLock();
  console.log("[Background] Vault unlocked");

  // Reinitialize vault blobs to ensure they are up-to-date
  await initialize().catch((error) => {
    console.warn("[Background] Failed to reinitialize vault after unlock:", error);
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

async function findItemsByUrl(url: string): Promise<VaultItem[] | null> {
  if (!vaultItems || vaultItems.length === 0) 
    return null;

  const matchingItems = vaultItems.filter((item) => {
    try {
      const targetUrlDomain = new URL(item.url).hostname;
      const currentUrlDomain = new URL(url).hostname;
      return targetUrlDomain === currentUrlDomain;
    } catch (error) {
      console.warn("[Background] Invalid URL in vault item or current URL:", item.url, url);
      return false;
    }
  });
  return matchingItems;
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
 * Handle periodic sync of vault items to the server
 * This is triggered every 5 minutes to ensure vault items are synced
 */
chrome.alarms.create("SYNC_VAULT", { periodInMinutes: 5 });



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

  if (alarm.name === "SYNC_VAULT") {
    await syncVault();
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
          console.log("[Background] Received unlock request with password and salt: ", password, salt);

          // Implementation for unlocking vault with password and salt
          const vaultUnlockKey = await deriveKey(password, salt);
          console.log("[Background] Derived vault unlock key:", vaultUnlockKey);
          await unlockVault(vaultUnlockKey);
          sendResponse({ success: true });

          // Store hash of password and email for future unlocks
          const user = await storageGet(USER_DATA_KEY, "local");
          if (user && user.email) {
            authHashValue = await authHash(password, user.email);
          }
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

        case "GET_PENDING_SAVE_PROMPT": {
          const pendingSavePrompt = await storageGet(PENDING_SAVE_PROMPT_KEY, "session");
          sendResponse({ success: true, data: pendingSavePrompt || null });
          break;
        }

        case "SET_PENDING_SAVE_PROMPT": {
          const { pendingSavePrompt } = message.payload;
          if (!pendingSavePrompt || typeof pendingSavePrompt !== "object") {
            sendResponse({ success: false, error: "Invalid pending save prompt format" });
            break;
          }

          await storageSet(PENDING_SAVE_PROMPT_KEY, pendingSavePrompt, "session");
          sendResponse({ success: true });
          break;
        }

        case "REMOVE_PENDING_SAVE_PROMPT": {
          await storageSet(PENDING_SAVE_PROMPT_KEY, null, "session");
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

        case "ADD_NEW_VAULT_ITEM": {
          if (!vaultUnlockKey) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          const { vaultItem } = message.payload;
          if (typeof vaultItem !== "object" || vaultItem === null) {
            sendResponse({ success: false, error: "Invalid vault item format" });
            break;
          }

          try {
            const newItemId = await addNewVaultItem(vaultItem);
            console.log("[Background] New vault item added successfully");
            console.log("[Background] Current vault items:", vaultItems);
            sendResponse({ success: true, data: { newItemId } });
          } catch (error) {
            console.warn("[Background] Error adding new vault item:", error);
            sendResponse({ success: false, error: String(error) });
          }
          break;
        }

        case "UPDATE_VAULT_ITEM": {
          if (!vaultUnlockKey) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          const { item } = message.payload;
          console.log("[Background] Received request to update vault item:", item);
          if (typeof item !== "object" || item === null) {
            sendResponse({ success: false, error: "Invalid vault item format" });
            break;
          }
          try {
            await updateVault(item);
            sendResponse({ success: true });
          } catch (error) {
            console.warn("[Background] Error updating vault item:", error);
            sendResponse({ success: false, error: String(error) });
          }
          break;
        }

        case "DELETE_VAULT_ITEM": {
          if (!vaultUnlockKey) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          const { id } = message.payload;
          if (typeof id !== "string") {
            sendResponse({ success: false, error: "Invalid vault item ID format" });
            break;
          }
          try {
            await deleteVaultItem(id);
            sendResponse({ success: true });
          } catch (error) {
            console.warn("[Background] Error deleting vault item:", error);
            sendResponse({ success: false, error: String(error) });
          }
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
          const { url } = message.payload;
          if (!isVaultUnlockValid()) {
            sendResponse({ success: false, error: "Vault is locked" });
            break;
          }
          if (typeof url !== "string") {
            sendResponse({ success: false, error: "Invalid URL format" });
            break;
          }
          const matchingItems = await findItemsByUrl(url);
          if (!matchingItems) {
            sendResponse({ success: false, error: "No matching vault items found" });
            break;
          }
          sendResponse({ success: true, items: matchingItems });
          break;
        }

        case "SYNC_VAULT": {
          try {
            await syncVault();
            sendResponse({ success: true });
          } catch (error) {
            console.warn("[Background] Error syncing vault:", error);
            sendResponse({ success: false, error: String(error) });
          }
          break;
        }

        default:
          console.warn("[Background] Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.warn("[Background] Error handling message:", error);
      sendResponse({ success: false, error: String(error) });
    }
  })();

  // Return true to indicate we'll send response asynchronously
  return true;
});

console.log("[Background] Service worker loaded");
