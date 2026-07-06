// import type { VaultItem, CreateVaultItemPayload } from "../types";
// import { encryptData, decryptData } from "../utils/cryptography";


// export async function encryptVault(vaultItem: CreateVaultItemPayload, vaultKey: CryptoKey) {
//   const iv = vaultItem.iv;
//   const skipKeys = new Set(["iv", "url"]);

//   const entries = await Promise.all(
//     Object.entries(vaultItem).map(async ([key, value]) => {
//       if (skipKeys.has(key)) return [key, value];
//       const encryptedObj = await encryptData(value, vaultKey, iv);
//       return [key, encryptedObj.ciphertext];
//     })
//   );

//   return Object.fromEntries(entries) as CreateVaultItemPayload;
// }

// export async function decryptVault(
//   vaultItem: VaultItem, vaultKey: CryptoKey
// ) {
//   const iv = vaultItem.iv;
//   const skipKeys = new Set(["iv", "id", "url", "created_at", "updated_at"]);

//   const entries = await Promise.all(
//     Object.entries(vaultItem).map(async ([key, value]) => {
//       if (skipKeys.has(key) || typeof value !== "string") return [key, value];
      
//       return [key, await decryptData(value, iv, vaultKey)];
//     })
//   )

//   return Object.fromEntries(entries) as VaultItem;
// }