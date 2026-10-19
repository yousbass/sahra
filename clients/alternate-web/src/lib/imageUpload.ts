import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Compress and optimize an image file
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image as a Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a unique filename for an image
 * @param originalName - Original filename
 * @param userId - User ID for namespacing
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `camps/${userId}/${timestamp}_${randomString}.${extension}`;
}

/**
 * Upload an image to Firebase Storage
 * @param file - The image file to upload
 * @param userId - User ID for namespacing
 * @param onProgress - Optional progress callback (0-100)
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('=== UPLOAD IMAGE ===');
    console.log('File:', file.name, 'Size:', file.size);
    
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 10MB');
    }
    
    // Report initial progress
    if (onProgress) onProgress(10);
    
    // Compress image
    console.log('Compressing image...');
    const compressedBlob = await compressImage(file);
    console.log('Compressed size:', compressedBlob.size);
    
    if (onProgress) onProgress(40);
    
    // Generate unique filename
    const filename = generateUniqueFilename(file.name, userId);
    const storageRef = ref(storage, filename);
    
    console.log('Uploading to:', filename);
    
    // Upload to Firebase Storage
    const snapshot = await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
    });
    
    if (onProgress) onProgress(80);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Upload successful:', downloadURL);
    
    if (onProgress) onProgress(100);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Upload multiple images to Firebase Storage
 * @param files - Array of image files to upload
 * @param userId - User ID for namespacing
 * @param onProgress - Optional progress callback for each file
 * @returns Array of download URLs
 */
export async function uploadMultipleImages(
  files: File[],
  userId: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<string[]> {
  console.log('=== UPLOAD MULTIPLE IMAGES ===');
  console.log('Files count:', files.length);
  
  const uploadPromises = files.map((file, index) => {
    return uploadImage(file, userId, (progress) => {
      if (onProgress) {
        onProgress(index, progress);
      }
    });
  });
  
  const urls = await Promise.all(uploadPromises);
  console.log('✅ All uploads successful');
  return urls;
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The download URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    console.log('=== DELETE IMAGE ===');
    console.log('URL:', imageUrl);
    
    if (!storage) {
      throw new Error('Firebase Storage is not initialized');
    }
    
    // Extract the path from the URL
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlParts = imageUrl.split('/o/');
    if (urlParts.length < 2) {
      throw new Error('Invalid Firebase Storage URL');
    }
    
    const pathWithToken = urlParts[1];
    const path = decodeURIComponent(pathWithToken.split('?')[0]);
    
    console.log('Deleting path:', path);
    
    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
    
    console.log('✅ Image deleted successfully');
  } catch (error) {
    console.error('❌ Delete failed:', error);
    throw error;
  }
}

/**
 * Delete multiple images from Firebase Storage
 * @param imageUrls - Array of download URLs to delete
 */
export async function deleteMultipleImages(imageUrls: string[]): Promise<void> {
  console.log('=== DELETE MULTIPLE IMAGES ===');
  console.log('URLs count:', imageUrls.length);
  
  const deletePromises = imageUrls.map(url => deleteImage(url));
  await Promise.all(deletePromises);
  
  console.log('✅ All images deleted successfully');
}

/**
 * Validate image file
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 10MB' };
  }
  
  // Check file extension
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }
  
  return { valid: true };
}