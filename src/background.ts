/*
 * Service Worker for Leaflock Chrome Extension
 * Manages authentication tokens and vault unlock state
*/
/// <reference types="chrome"/>

const REFRESH_TOKEN_STORAGE_KEY = "leaflock.refreshToken";
const VAULT_UNLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const ACCESS_TOKEN_DURATION = 55 * 60 * 1000; // 55 minutes (refresh before 1hr expiry)
const BASE_API_URL = import.meta.env.VITE_API_BASE_URL;

// In-memory token storage (persists while service worker is active)
let accessToken: string | null = null;
let refreshToken: string | null = null;
let vaultUnlockToken: string | null = null;
let vaultUnlockTimestamp: number | null = null;
let accessTokenTimestamp: number | null = null;

// Alarm names
const VAULT_LOCK_ALARM = "leaflock-lock-vault";
const TOKEN_REFRESH_ALARM = "leaflock-refresh-token";

/**
 * Initialize the service worker
 * - Load refresh token from storage
 * - Set up alarms
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("[Background] Service worker starting up");
  await initializeTokens();
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Background] Extension installed/updated");
  await initializeTokens();
});

/**
 * Load tokens from storage on service worker startup
 */
async function initializeTokens(): Promise<void> {
  try {
    const result = await chrome.storage.local.get([REFRESH_TOKEN_STORAGE_KEY]);
    if (result[REFRESH_TOKEN_STORAGE_KEY] && typeof result[REFRESH_TOKEN_STORAGE_KEY] === "string") {
      refreshToken = result[REFRESH_TOKEN_STORAGE_KEY];
      console.log("[Background] Loaded refresh token from storage");
      
      // Try to get a fresh access token
      await refreshAccessToken();
    }
  } catch (error) {
    console.error("[Background] Failed to initialize tokens:", error);
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) {
    console.warn("[Background] No refresh token available");
    return false;
  }

  try {
    const response = await fetch(`${BASE_API_URL}/accounts/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.access;
    accessTokenTimestamp = Date.now();

    console.log("[Background] Access token refreshed successfully");

    // Schedule next refresh
    scheduleTokenRefresh();

    return true;
  } catch (error) {
    console.error("[Background] Failed to refresh access token:", error);
    
    // Clear invalid refresh token
    accessToken = null;
    refreshToken = null;
    accessTokenTimestamp = null;
    await chrome.storage.local.remove(REFRESH_TOKEN_STORAGE_KEY);
    
    return false;
  }
}

/**
 * Schedule automatic token refresh before expiration
 */
function scheduleTokenRefresh(): void {
  const refreshInterval = ACCESS_TOKEN_DURATION / 60000; // Convert to minutes
  chrome.alarms.create(TOKEN_REFRESH_ALARM, {
    delayInMinutes: refreshInterval,
  });
  console.log(`[Background] Scheduled token refresh in ${refreshInterval} minutes`);
}

/**
 * Schedule automatic vault lock
 */
function scheduleVaultLock(): void {
  const lockInterval = VAULT_UNLOCK_DURATION / 60000; // Convert to minutes
  chrome.alarms.create(VAULT_LOCK_ALARM, {
    delayInMinutes: lockInterval,
  });
  console.log(`[Background] Scheduled vault lock in ${lockInterval} minutes`);
}

/**
 * Check if access token is still valid
 */
function isAccessTokenValid(): boolean {
  if (!accessToken || !accessTokenTimestamp) {
    return false;
  }
  return Date.now() - accessTokenTimestamp < ACCESS_TOKEN_DURATION;
}

/**
 * Check if vault unlock token is still valid
 */
function isVaultUnlockValid(): boolean {
  if (!vaultUnlockToken || !vaultUnlockTimestamp) {
    return false;
  }
  return Date.now() - vaultUnlockTimestamp < VAULT_UNLOCK_DURATION;
}

/**
 * Lock the vault
 */
function lockVault(): void {
  vaultUnlockToken = null;
  vaultUnlockTimestamp = null;
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
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`[Background] Alarm triggered: ${alarm.name}`);
  
  if (alarm.name === VAULT_LOCK_ALARM) {
    lockVault();
  } else if (alarm.name === TOKEN_REFRESH_ALARM) {
    refreshAccessToken();
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
          if (!isAccessTokenValid() && refreshToken) {
            await refreshAccessToken();
          }
          
          sendResponse({
            success: true,
            accessToken: isAccessTokenValid() ? accessToken : null,
          });
          break;
        }

        case "GET_REFRESH_TOKEN": {
          sendResponse({
            success: true,
            refreshToken: refreshToken,
          });
          break;
        }

        case "GET_VAULT_UNLOCK_TOKEN": {
          const isValid = isVaultUnlockValid();
          sendResponse({
            success: true,
            vaultUnlockToken: isValid ? vaultUnlockToken : null,
          });
          
          // If expired, clear it
          if (!isValid && vaultUnlockToken) {
            lockVault();
          }
          break;
        }

        case "SET_AUTH_TOKENS": {
          const { accessToken: newAccess, refreshToken: newRefresh } = message.payload;
          
          if (newAccess) {
            accessToken = newAccess;
            accessTokenTimestamp = Date.now();
            scheduleTokenRefresh();
          }
          
          if (newRefresh) {
            refreshToken = newRefresh;
            await chrome.storage.local.set({
              [REFRESH_TOKEN_STORAGE_KEY]: newRefresh,
            });
          }
          
          console.log("[Background] Auth tokens updated");
          sendResponse({ success: true });
          break;
        }

        case "CLEAR_AUTH_TOKENS": {
          accessToken = null;
          refreshToken = null;
          accessTokenTimestamp = null;
          
          await chrome.storage.local.remove(REFRESH_TOKEN_STORAGE_KEY);
          chrome.alarms.clear(TOKEN_REFRESH_ALARM);
          
          console.log("[Background] Auth tokens cleared");
          sendResponse({ success: true });
          break;
        }

        case "UNLOCK_VAULT": {
          const { token } = message.payload;
          vaultUnlockToken = token;
          vaultUnlockTimestamp = Date.now();
          
          // Schedule auto-lock
          scheduleVaultLock();
          
          console.log("[Background] Vault unlocked");
          sendResponse({ success: true });
          break;
        }

        case "LOCK_VAULT": {
          lockVault();
          sendResponse({ success: true });
          break;
        }

        case "IS_HYDRATED": {
          // Check if service worker has loaded refresh token
          sendResponse({
            success: true,
            isHydrated: true,
            hasRefreshToken: !!refreshToken,
            hasAccessToken: isAccessTokenValid(),
            hasVaultUnlock: isVaultUnlockValid(),
          });
          break;
        }

        case "REFRESH_ACCESS_TOKEN": {
          const success = await refreshAccessToken();
          sendResponse({
            success,
            accessToken: success ? accessToken : null,
          });
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
