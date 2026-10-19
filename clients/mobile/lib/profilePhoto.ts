import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const MAX_SIZE = 10 * 1024 * 1024; // must stay under the storage rules' 10MB image cap

/**
 * Upload a profile photo to Firebase Storage under the signed-in user's own
 * folder (users/{uid}/...) — the only path the live storage rules allow the
 * user to write to. Returns the public download URL to store as photoURL on
 * users/{uid}, matching the web app's field name.
 */
export async function uploadProfilePhoto(localUri: string, userId: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage is not initialized');

  const res = await fetch(localUri);
  const blob = await res.blob();

  if (blob.size > MAX_SIZE) {
    throw new Error('image-too-large');
  }
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';

  const filename = `users/${userId}/profile_${Date.now()}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}
