import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Listing photo pipeline for host tools.
 *
 * Mirrors the web app's image contract (artifacts/sahra/src/lib/imageUpload.ts):
 * - compress on-device to max width 1920, JPEG quality 0.8
 * - upload to the EXACT same Storage path scheme the web uses:
 *   camps/{userId}/{timestamp}_{randomString}.{ext}
 * - max 10 images per listing, first/main image stored as `photo`,
 *   the rest as `photos` (split happens in the form, not here)
 *
 * uploadBytes has no incremental progress; the web fakes staged progress
 * (10/40/80/100) and we mirror that so the UI behaves the same.
 */

export const MAX_LISTING_IMAGES = 10;
const MAX_BYTES = 10 * 1024 * 1024; // storage rules cap images at 10MB
const MAX_WIDTH = 1920; // web parity: imageUpload.ts compressImage maxWidth
const JPEG_QUALITY = 0.8; // web parity: canvas.toBlob(..., 0.8)

export interface PickedListingImage {
  uri: string;
  width?: number;
}

export type PickImagesResult =
  | { kind: 'picked'; images: PickedListingImage[] }
  | { kind: 'cancelled' }
  | { kind: 'permission-denied' };

/** Open the device photo library allowing multi-select up to `remainingSlots`. */
export async function pickListingImages(remainingSlots: number): Promise<PickImagesResult> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { kind: 'permission-denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remainingSlots,
    quality: 1, // full quality here; we compress ourselves for web parity
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { kind: 'cancelled' };
  }

  return {
    kind: 'picked',
    images: result.assets.slice(0, remainingSlots).map((a) => ({ uri: a.uri, width: a.width })),
  };
}

/**
 * Re-encode to JPEG q0.8, downscaling to width 1920 when larger (never
 * upscales — same as the web's canvas `Math.min(1, maxWidth / width)` scale).
 */
export async function compressListingImage(uri: string, sourceWidth?: number): Promise<string> {
  const actions =
    sourceWidth && sourceWidth > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
  try {
    // Legacy API: stable on iOS/Android AND react-native-web (canvas-backed).
    const result = await manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch (e) {
    // Fail open: upload the original rather than blocking the host — the
    // storage rules' 10MB cap still guards oversized files.
    console.warn('[listingImages] compression failed, uploading original:', e);
    return uri;
  }
}

export interface UploadedListingImage {
  url: string;
  path: string;
}

/**
 * Compress + upload one listing image under the signed-in host's folder.
 * Storage rules only allow hosts to write inside camps/{their-uid}/.
 */
export async function uploadListingImage(
  userId: string,
  localUri: string,
  sourceWidth: number | undefined,
  onProgress?: (pct: number) => void
): Promise<UploadedListingImage> {
  if (!storage) throw new Error('Firebase Storage is not initialized');

  onProgress?.(10);
  const compressedUri = await compressListingImage(localUri, sourceWidth);
  onProgress?.(40);

  const res = await fetch(compressedUri);
  const blob = await res.blob();
  if (blob.size > MAX_BYTES) throw new Error('image-too-large');

  // Web parity path scheme: camps/{userId}/{Date.now()}_{random}.{ext}
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;
  const path = `camps/${userId}/${filename}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  onProgress?.(80);
  const url = await getDownloadURL(storageRef);
  onProgress?.(100);

  return { url, path };
}
