export type ConnectedPlatformId = "gmail" | "google-calendar" | "google-tasks";

export type ConnectedPlatform = {
  id: ConnectedPlatformId;
  connectedAt: string;
  syncState: "connected" | "syncing" | "synced";
};

export const connectedPlatformsStorageKey = "digital-calm-os-connected-platforms";

export const googlePlatformIds: ConnectedPlatformId[] = [
  "gmail",
  "google-calendar",
  "google-tasks"
];

export function readConnectedPlatforms() {
  if (typeof window === "undefined") return [] as ConnectedPlatform[];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(connectedPlatformsStorageKey) ?? "[]"
    ) as ConnectedPlatform[];

    return parsed.filter((platform) => googlePlatformIds.includes(platform.id));
  } catch {
    return [];
  }
}

export function writeConnectedPlatforms(platforms: ConnectedPlatform[]) {
  window.localStorage.setItem(connectedPlatformsStorageKey, JSON.stringify(platforms));
}

export function isConnected(platforms: ConnectedPlatform[], id: ConnectedPlatformId) {
  return platforms.some((platform) => platform.id === id);
}
