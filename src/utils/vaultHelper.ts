import type { VaultItem } from "../types";

export function mergeVaultItems(
  local: VaultItem[],
  remote: VaultItem[],
): VaultItem[] {
  console.log("[mergeVaultItems] Merging vault items. Local:", local, "Remote:", remote);
  const byId = (list: VaultItem[]) => new Map(list.map((i) => [i.id, i]));
  const localMap = byId(local);
  const remoteMap = byId(remote);
  console.log("[mergeVaultItems] Local map:", localMap);
  console.log("[mergeVaultItems] Remote map:", remoteMap);

  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  console.log("[mergeVaultItems] All IDs:", allIds);
  const merged: VaultItem[] = [];

  for (const id of allIds) {
    const l = localMap.get(id);
    const r = remoteMap.get(id);

    if (l && r) {
      // If both exist, prefer the one with the latest updated_at timestamp
      merged.push(new Date(l.updated_at) > new Date(r.updated_at) ? l : r);
    } else if (l) {
      merged.push(l);
    } else if (r) {
      merged.push(r);
    }
  }
  console.log("[mergeVaultItems] Merged result:", merged);

  return merged;
}
