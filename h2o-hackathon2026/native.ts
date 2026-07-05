// ─── Capacitor native bridge ───────────────────────────────────────────────
// Thin, optional helpers that use real native iOS APIs when running inside the
// Capacitor shell, and return null on plain web so callers fall back to the
// existing expo-image-picker / expo-location web implementations (which also
// work inside the Capacitor WKWebView, so wiring these in is an enhancement,
// not a requirement).
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { Preferences } from "@capacitor/preferences";

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

/** Native camera/photo sheet. Returns a data URL, or null on web (fall back). */
export async function takePhotoNative(): Promise<string | null> {
  if (!isNativePlatform()) return null;
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Native GPS. Returns {lat, lon}, or null on web (fall back to expo-location). */
export async function currentPositionNative(): Promise<
  { lat: number; lon: number } | null
> {
  if (!isNativePlatform()) return null;
  try {
    const perm = await Geolocation.requestPermissions();
    if (perm.location === "denied") return null;
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Durable key/value store backed by native Preferences on iOS. */
export const nativeStore = {
  async get(key: string): Promise<string | null> {
    if (!isNativePlatform()) return null;
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    if (!isNativePlatform()) return;
    await Preferences.set({ key, value });
  },
};
