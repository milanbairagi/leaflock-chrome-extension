import type { StorageArea } from "../types";

function getStorageArea(area: StorageArea) {
  return area === "local" ? chrome.storage.local : chrome.storage.session;
}

export async function storageSet(
  key: string,
  value: any,
  area: StorageArea = "local",
): Promise<void> {
  const storageArea = getStorageArea(area);
  await storageArea.set({ [key]: value });
}

export async function storageGet(
  key: string,
  area: StorageArea = "local",
): Promise<any> {
  const storageArea = getStorageArea(area);
  const result = await storageArea.get([key]);
  return result[key];
}

export async function storageRemove(
  key: string,
  area: StorageArea = "local",
): Promise<void> {
  const storageArea = getStorageArea(area);
  await storageArea.remove([key]);
}
