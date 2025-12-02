# Image Upload System Design - Sahra Camping Platform

## Overview

This document outlines the comprehensive design for implementing a robust image upload and management system for camp listings on the Sahra platform. The system will leverage Firebase Storage for secure, scalable image hosting with integrated compression, multiple upload support, and intuitive management features.

---

## 1. Firebase Storage Integration Architecture

### 1.1 Storage Structure

```
sahra-camps-storage/
├── camps/
│   ├── {campId}/
│   │   ├── images/
│   │   │   ├── {imageId}_original.jpg
│   │   │   ├── {imageId}_large.jpg (1920x1080)
│   │   │   ├── {imageId}_medium.jpg (1280x720)
│   │   │   ├── {imageId}_thumbnail.jpg (400x300)
│   │   │   └── ...
│   │   └── metadata.json
│   └── ...
├── users/
│   ├── {userId}/
│   │   └── profile/
│   │       └── avatar.jpg
│   └── ...
└── temp/
    └── {uploadSessionId}/
        └── {tempImageId}.jpg
```

### 1.2 Firebase Storage Configuration

**File**: `src/lib/storage.ts`

```typescript
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { app } from './firebase';

// Initialize Firebase Storage
export const storage = getStorage(app);

// Storage paths
export const STORAGE_PATHS = {
  CAMPS: 'camps',
  USERS: 'users',
  TEMP: 'temp',
} as const;

// Image size configurations
export const IMAGE_SIZES = {
  ORIGINAL: { width: null, height: null, suffix: 'original' },
  LARGE: { width: 1920, height: 1080, suffix: 'large' },
  MEDIUM: { width: 1280, height: 720, suffix: 'medium' },
  THUMBNAIL: { width: 400, height: 300, suffix: 'thumbnail' },
} as const;

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Maximum number of images per camp
export const MAX_IMAGES_PER_CAMP = 20;
```

### 1.3 Storage Helper Functions

```typescript
/**
 * Generate storage path for camp image
 */
export function getCampImagePath(
  campId: string,
  imageId: string,
  size: keyof typeof IMAGE_SIZES = 'ORIGINAL'
): string {
  const suffix = IMAGE_SIZES[size].suffix;
  return `${STORAGE_PATHS.CAMPS}/${campId}/images/${imageId}_${suffix}.jpg`;
}

/**
 * Generate temporary storage path
 */
export function getTempImagePath(sessionId: string, imageId: string): string {
  return `${STORAGE_PATHS.TEMP}/${sessionId}/${imageId}.jpg`;
}

/**
 * Get storage reference
 */
export function getStorageRef(path: string) {
  return ref(storage, path);
}
```

---

## 2. Multiple Image Upload Functionality

### 2.1 Image Upload Component

**File**: `src/components/ImageUploader.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { uploadCampImage, compressImage } from '@/lib/imageService';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

interface ImageUploaderProps {
  campId?: string;
  existingImages?: CampImage[];
  maxImages?: number;
  onImagesChange: (images: CampImage[]) => void;
}

export function ImageUploader({
  campId,
  existingImages = [],
  maxImages = 20,
  onImagesChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Validate total image count
      const totalImages = existingImages.length + images.length + acceptedFiles.length;
      if (totalImages > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      // Validate file types and sizes
      const validFiles = acceptedFiles.filter((file) => {
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast.error(`${file.name}: Invalid file type`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: File too large (max 10MB)`);
          return false;
        }
        return true;
      });

      // Create image file objects
      const newImages: ImageFile[] = validFiles.map((file) => ({
        id: generateId(),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'pending',
      }));

      setImages((prev) => [...prev, ...newImages]);

      // Auto-upload if campId exists
      if (campId) {
        await uploadImages(newImages);
      }
    },
    [campId, existingImages, images, maxImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const uploadImages = async (imagesToUpload: ImageFile[]) => {
    setUploading(true);

    for (const image of imagesToUpload) {
      try {
        // Update status to uploading
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: 'uploading' } : img
          )
        );

        // Compress image
        const compressedFile = await compressImage(image.file);

        // Upload to Firebase Storage
        const uploadResult = await uploadCampImage(
          campId!,
          compressedFile,
          (progress) => {
            setImages((prev) =>
              prev.map((img) =>
                img.id === image.id ? { ...img, progress } : img
              )
            );
          }
        );

        // Update status to completed
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: 'completed', url: uploadResult.url }
              : img
          )
        );

        // Notify parent component
        onImagesChange([
          ...existingImages,
          {
            id: uploadResult.id,
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            order: existingImages.length + imagesToUpload.indexOf(image),
            isPrimary: existingImages.length === 0 && imagesToUpload.indexOf(image) === 0,
          },
        ]);
      } catch (error) {
        console.error('Upload error:', error);
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: 'error', error: 'Upload failed' }
              : img
          )
        );
        toast.error(`Failed to upload ${image.file.name}`);
      }
    }

    setUploading(false);
  };

  const removeImage = (imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-terracotta-500 bg-terracotta-50' : 'border-sand-300 hover:border-terracotta-400'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-terracotta-600" />
        {isDragActive ? (
          <p className="text-terracotta-700 font-semibold">Drop images here...</p>
        ) : (
          <>
            <p className="text-gray-700 font-semibold mb-2">
              Drag & drop images here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supports: JPG, PNG, WebP (max 10MB per image, up to {maxImages} images)
            </p>
          </>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={image.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Upload Progress */}
              {image.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="w-full px-4">
                    <Progress value={image.progress} className="h-2" />
                    <p className="text-white text-sm text-center mt-2">
                      {image.progress}%
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Status */}
              {image.status === 'completed' && (
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}

              {image.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-lg">
                  <p className="text-red-600 text-sm font-semibold">Failed</p>
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={image.status === 'uploading'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2.2 Drag-and-Drop Features

- **react-dropzone** library for drag-and-drop functionality
- Visual feedback during drag (border color change, background highlight)
- Multiple file selection support
- File type and size validation
- Preview generation using `URL.createObjectURL()`

---

## 3. Image Management Features

### 3.1 Image Management Component

**File**: `src/components/ImageManager.tsx`

```typescript
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Star, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteCampImage, updateImageOrder, setPrimaryImage } from '@/lib/imageService';

interface CampImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  order: number;
  isPrimary: boolean;
}

interface ImageManagerProps {
  campId: string;
  images: CampImage[];
  onImagesChange: (images: CampImage[]) => void;
}

export function ImageManager({ campId, images, onImagesChange }: ImageManagerProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers
    const updatedImages = items.map((img, index) => ({
      ...img,
      order: index,
    }));

    onImagesChange(updatedImages);

    try {
      await updateImageOrder(campId, updatedImages);
      toast.success('Image order updated');
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update image order');
      onImagesChange(images); // Revert on error
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      const updatedImages = images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));

      onImagesChange(updatedImages);
      await setPrimaryImage(campId, imageId);
      toast.success('Primary image updated');
    } catch (error) {
      console.error('Failed to set primary:', error);
      toast.error('Failed to set primary image');
      onImagesChange(images); // Revert on error
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;

    setDeleting(true);
    try {
      await deleteCampImage(campId, imageToDelete);
      const updatedImages = images
        .filter((img) => img.id !== imageToDelete)
        .map((img, index) => ({ ...img, order: index }));

      // If deleted image was primary, set first image as primary
      if (updatedImages.length > 0 && !updatedImages.some((img) => img.isPrimary)) {
        updatedImages[0].isPrimary = true;
      }

      onImagesChange(updatedImages);
      toast.success('Image deleted');
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="images" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {images.map((image, index) => (
                <Draggable key={image.id} draggableId={image.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        relative group rounded-lg overflow-hidden
                        ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-terracotta-500' : ''}
                      `}
                    >
                      {/* Image */}
                      <div className="aspect-video bg-gray-100">
                        <img
                          src={image.thumbnailUrl || image.url}
                          alt={`Camp image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Primary Badge */}
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-terracotta-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Primary
                        </div>
                      )}

                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Action Buttons */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                          {!image.isPrimary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white hover:bg-white/20"
                              onClick={() => handleSetPrimary(image.id)}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Set Primary
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:bg-red-500/20 ml-auto"
                            onClick={() => {
                              setImageToDelete(image.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### 3.2 Management Features

1. **Drag-and-Drop Reordering**
   - Uses `react-beautiful-dnd` library
   - Visual feedback during drag
   - Automatic order number updates
   - Persists to Firestore

2. **Primary Image Selection**
   - Star icon badge on primary image
   - "Set Primary" button on hover
   - First image defaults to primary
   - Updates camp document in Firestore

3. **Image Deletion**
   - Confirmation dialog before deletion
   - Deletes from Firebase Storage
   - Updates Firestore metadata
   - Automatic primary image reassignment

---

## 4. Image Optimization and Compression

### 4.1 Image Service

**File**: `src/lib/imageService.ts`

```typescript
import imageCompression from 'browser-image-compression';
import { uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorageRef, getCampImagePath, IMAGE_SIZES } from './storage';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Compress image before upload
 */
export async function compressImage(file: File): Promise<File> {
  console.log('=== COMPRESSING IMAGE ===');
  console.log('Original size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

  const options = {
    maxSizeMB: 2, // Max 2MB
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log('Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Compression ratio:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');
    return compressedFile;
  } catch (error) {
    console.error('Compression failed:', error);
    return file; // Return original if compression fails
  }
}

/**
 * Generate multiple image sizes
 */
export async function generateImageSizes(file: File): Promise<{
  original: File;
  large: File;
  medium: File;
  thumbnail: File;
}> {
  const [large, medium, thumbnail] = await Promise.all([
    imageCompression(file, {
      maxWidthOrHeight: IMAGE_SIZES.LARGE.width!,
      useWebWorker: true,
    }),
    imageCompression(file, {
      maxWidthOrHeight: IMAGE_SIZES.MEDIUM.width!,
      useWebWorker: true,
    }),
    imageCompression(file, {
      maxWidthOrHeight: IMAGE_SIZES.THUMBNAIL.width!,
      useWebWorker: true,
    }),
  ]);

  return { original: file, large, medium, thumbnail };
}

/**
 * Upload camp image with progress tracking
 */
export async function uploadCampImage(
  campId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  id: string;
  url: string;
  thumbnailUrl: string;
}> {
  console.log('=== UPLOADING CAMP IMAGE ===');
  console.log('Camp ID:', campId);
  console.log('File:', file.name);

  const imageId = generateId();

  try {
    // Generate multiple sizes
    const sizes = await generateImageSizes(file);

    // Upload all sizes
    const uploadPromises = Object.entries(sizes).map(async ([sizeName, sizeFile]) => {
      const path = getCampImagePath(campId, imageId, sizeName.toUpperCase() as keyof typeof IMAGE_SIZES);
      const storageRef = getStorageRef(path);
      const uploadTask = uploadBytesResumable(storageRef, sizeFile);

      return new Promise<{ size: string; url: string }>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (sizeName === 'original' && onProgress) {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(Math.round(progress));
            }
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ size: sizeName, url });
          }
        );
      });
    });

    const results = await Promise.all(uploadPromises);
    const urlMap = Object.fromEntries(results.map((r) => [r.size, r.url]));

    console.log('✅ All sizes uploaded successfully');

    return {
      id: imageId,
      url: urlMap.original,
      thumbnailUrl: urlMap.thumbnail,
    };
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Delete camp image
 */
export async function deleteCampImage(campId: string, imageId: string): Promise<void> {
  console.log('=== DELETING CAMP IMAGE ===');
  console.log('Camp ID:', campId, 'Image ID:', imageId);

  try {
    // Delete all sizes
    const deletePromises = Object.keys(IMAGE_SIZES).map(async (size) => {
      const path = getCampImagePath(campId, imageId, size as keyof typeof IMAGE_SIZES);
      const storageRef = getStorageRef(path);
      try {
        await deleteObject(storageRef);
      } catch (error: any) {
        // Ignore if file doesn't exist
        if (error.code !== 'storage/object-not-found') {
          throw error;
        }
      }
    });

    await Promise.all(deletePromises);
    console.log('✅ Image deleted successfully');
  } catch (error) {
    console.error('❌ Delete failed:', error);
    throw error;
  }
}

/**
 * Update image order
 */
export async function updateImageOrder(
  campId: string,
  images: Array<{ id: string; order: number }>
): Promise<void> {
  console.log('=== UPDATING IMAGE ORDER ===');
  console.log('Camp ID:', campId);

  try {
    const campRef = doc(db, 'camps', campId);
    await updateDoc(campRef, {
      images: images.map((img) => ({
        id: img.id,
        order: img.order,
      })),
    });
    console.log('✅ Image order updated');
  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  }
}

/**
 * Set primary image
 */
export async function setPrimaryImage(campId: string, imageId: string): Promise<void> {
  console.log('=== SETTING PRIMARY IMAGE ===');
  console.log('Camp ID:', campId, 'Image ID:', imageId);

  try {
    const campRef = doc(db, 'camps', campId);
    await updateDoc(campRef, {
      primaryImageId: imageId,
    });
    console.log('✅ Primary image set');
  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

### 4.2 Optimization Strategy

1. **Client-Side Compression**
   - Uses `browser-image-compression` library
   - Reduces file size by 60-80% on average
   - Maintains visual quality
   - Reduces upload time and bandwidth

2. **Multiple Image Sizes**
   - **Original**: Full resolution (for downloads)
   - **Large**: 1920x1080 (for detail views)
   - **Medium**: 1280x720 (for listings)
   - **Thumbnail**: 400x300 (for cards/previews)

3. **Progressive Upload**
   - Upload progress tracking
   - Parallel uploads for multiple sizes
   - Error handling and retry logic

---

## 5. Storage Security Rules

**File**: `storage.rules`

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    function isHost() {
      return isSignedIn() && 
             get(/databases/(default)/documents/users/$(request.auth.uid)).data.isHost == true;
    }
    
    function isCampOwner(campId) {
      return isSignedIn() && 
             get(/databases/(default)/documents/camps/$(campId)).data.hostId == request.auth.uid;
    }
    
    function isValidImageFile() {
      return request.resource.contentType.matches('image/.*') &&
             request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
    
    // Camp images
    match /camps/{campId}/images/{imageFile} {
      // Anyone can read camp images
      allow read: if true;
      
      // Only camp owner or admin can upload
      allow create: if (isHost() && isCampOwner(campId) || isAdmin()) && 
                       isValidImageFile();
      
      // Only camp owner or admin can delete
      allow delete: if (isHost() && isCampOwner(campId)) || isAdmin();
    }
    
    // User profile images
    match /users/{userId}/profile/{imageFile} {
      // Anyone can read profile images
      allow read: if true;
      
      // Only user owner can upload/update
      allow create, update: if isOwner(userId) && isValidImageFile();
      
      // Only user owner or admin can delete
      allow delete: if isOwner(userId) || isAdmin();
    }
    
    // Temporary uploads
    match /temp/{sessionId}/{imageFile} {
      // Only authenticated users can upload to temp
      allow create: if isSignedIn() && isValidImageFile();
      
      // Only uploader can read/delete their temp files
      allow read, delete: if isSignedIn();
      
      // Auto-delete after 24 hours (handled by Cloud Function)
    }
  }
}
```

### 5.1 Security Features

1. **Authentication Required**
   - All uploads require authentication
   - Read access is public for camp images
   - Profile images are public but controlled

2. **Authorization Checks**
   - Camp owners can manage their camp images
   - Admins have full access
   - Users can only manage their own profile images

3. **File Validation**
   - Image file type validation
   - 10MB file size limit
   - Content type verification

4. **Temporary Storage**
   - Separate temp folder for uploads
   - Auto-cleanup after 24 hours
   - Prevents storage bloat

---

## 6. Database Schema for Image Metadata

### 6.1 Firestore Schema

**Collection**: `camps`

```typescript
interface Camp {
  id: string;
  // ... existing fields ...
  
  // Image fields
  images: CampImage[];
  primaryImageId: string;
  photo: string; // Deprecated - kept for backward compatibility
  photos?: string[]; // Deprecated - kept for backward compatibility
  
  // Image metadata
  imageCount: number;
  lastImageUploadAt: Timestamp;
}

interface CampImage {
  id: string;
  url: string; // Original size URL
  thumbnailUrl: string; // Thumbnail size URL
  mediumUrl?: string; // Medium size URL
  largeUrl?: string; // Large size URL
  order: number; // Display order (0-based)
  isPrimary: boolean; // Is this the primary/featured image?
  uploadedAt: Timestamp;
  uploadedBy: string; // User ID
  fileName: string; // Original file name
  fileSize: number; // Original file size in bytes
  width?: number; // Original width
  height?: number; // Original height
  caption?: string; // Optional caption
  altText?: string; // Accessibility alt text
}
```

### 6.2 Firestore Operations

**Update camp with images**:

```typescript
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function addCampImage(
  campId: string,
  imageData: Omit<CampImage, 'uploadedAt' | 'uploadedBy'>
): Promise<void> {
  const campRef = doc(db, 'camps', campId);
  
  const newImage: CampImage = {
    ...imageData,
    uploadedAt: Timestamp.now(),
    uploadedBy: auth.currentUser!.uid,
  };
  
  await updateDoc(campRef, {
    images: arrayUnion(newImage),
    imageCount: increment(1),
    lastImageUploadAt: Timestamp.now(),
    // Set as primary if it's the first image
    ...(imageData.order === 0 && { primaryImageId: imageData.id }),
  });
}

export async function removeCampImage(
  campId: string,
  imageId: string
): Promise<void> {
  const campRef = doc(db, 'camps', campId);
  const campSnap = await getDoc(campRef);
  
  if (!campSnap.exists()) {
    throw new Error('Camp not found');
  }
  
  const camp = campSnap.data() as Camp;
  const updatedImages = camp.images.filter((img) => img.id !== imageId);
  
  // If removed image was primary, set first image as primary
  let updates: any = {
    images: updatedImages,
    imageCount: updatedImages.length,
  };
  
  if (camp.primaryImageId === imageId && updatedImages.length > 0) {
    updates.primaryImageId = updatedImages[0].id;
  }
  
  await updateDoc(campRef, updates);
}
```

### 6.3 Migration Strategy

For existing camps with old `photo` and `photos` fields:

```typescript
export async function migrateCampImages(campId: string): Promise<void> {
  const campRef = doc(db, 'camps', campId);
  const campSnap = await getDoc(campRef);
  
  if (!campSnap.exists()) return;
  
  const camp = campSnap.data();
  
  // Skip if already migrated
  if (camp.images && camp.images.length > 0) return;
  
  const images: CampImage[] = [];
  
  // Migrate primary photo
  if (camp.photo) {
    images.push({
      id: generateId(),
      url: camp.photo,
      thumbnailUrl: camp.photo, // Use same URL initially
      order: 0,
      isPrimary: true,
      uploadedAt: camp.createdAt || Timestamp.now(),
      uploadedBy: camp.hostId,
      fileName: 'migrated-primary.jpg',
      fileSize: 0,
    });
  }
  
  // Migrate additional photos
  if (camp.photos && Array.isArray(camp.photos)) {
    camp.photos.forEach((photoUrl: string, index: number) => {
      if (photoUrl !== camp.photo) {
        images.push({
          id: generateId(),
          url: photoUrl,
          thumbnailUrl: photoUrl,
          order: images.length,
          isPrimary: false,
          uploadedAt: camp.createdAt || Timestamp.now(),
          uploadedBy: camp.hostId,
          fileName: `migrated-${index}.jpg`,
          fileSize: 0,
        });
      }
    });
  }
  
  if (images.length > 0) {
    await updateDoc(campRef, {
      images,
      imageCount: images.length,
      primaryImageId: images[0].id,
    });
  }
}
```

---

## 7. UI/UX Design

### 7.1 CreateListing Page Integration

**File**: `src/pages/CreateListing.tsx` (modifications)

```typescript
import { ImageUploader } from '@/components/ImageUploader';
import { ImageManager } from '@/components/ImageManager';

export default function CreateListing() {
  const [images, setImages] = useState<CampImage[]>([]);
  const [formData, setFormData] = useState({
    // ... existing fields ...
  });

  const handleImagesChange = (newImages: CampImage[]) => {
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate images
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    
    try {
      // Create camp with images
      const campData = {
        ...formData,
        images,
        imageCount: images.length,
        primaryImageId: images.find((img) => img.isPrimary)?.id || images[0].id,
        photo: images[0].url, // For backward compatibility
      };
      
      await createCamp(campData, user.uid);
      toast.success('Camp created successfully!');
      navigate('/host/listings');
    } catch (error) {
      console.error('Failed to create camp:', error);
      toast.error('Failed to create camp');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... existing fields ... */}
      
      {/* Image Upload Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Camp Images
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload high-quality images of your camp. The first image will be the primary image shown in search results.
          </p>
        </div>
        
        {images.length === 0 ? (
          <ImageUploader
            maxImages={20}
            onImagesChange={handleImagesChange}
          />
        ) : (
          <>
            <ImageManager
              campId="" // No campId yet for new listings
              images={images}
              onImagesChange={handleImagesChange}
            />
            <ImageUploader
              existingImages={images}
              maxImages={20}
              onImagesChange={handleImagesChange}
            />
          </>
        )}
      </div>
      
      {/* ... rest of form ... */}
    </form>
  );
}
```

### 7.2 EditListing Page Integration

**File**: `src/pages/EditListing.tsx` (modifications)

```typescript
import { ImageUploader } from '@/components/ImageUploader';
import { ImageManager } from '@/components/ImageManager';

export default function EditListing() {
  const { campId } = useParams();
  const [camp, setCamp] = useState<Camp | null>(null);
  const [images, setImages] = useState<CampImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCamp = async () => {
      try {
        const campData = await getCamp(campId!);
        if (campData) {
          setCamp(campData);
          setImages(campData.images || []);
        }
      } catch (error) {
        console.error('Failed to load camp:', error);
        toast.error('Failed to load camp');
      } finally {
        setLoading(false);
      }
    };
    
    loadCamp();
  }, [campId]);

  const handleImagesChange = (newImages: CampImage[]) => {
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    
    try {
      await updateCamp(campId!, {
        images,
        imageCount: images.length,
        primaryImageId: images.find((img) => img.isPrimary)?.id || images[0].id,
        photo: images[0].url, // For backward compatibility
      });
      
      toast.success('Camp updated successfully!');
    } catch (error) {
      console.error('Failed to update camp:', error);
      toast.error('Failed to update camp');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... existing fields ... */}
      
      {/* Image Management Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Camp Images
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Manage your camp images. Drag to reorder, click the star to set as primary, or delete unwanted images.
          </p>
        </div>
        
        {images.length > 0 && (
          <ImageManager
            campId={campId!}
            images={images}
            onImagesChange={handleImagesChange}
          />
        )}
        
        <ImageUploader
          campId={campId}
          existingImages={images}
          maxImages={20}
          onImagesChange={handleImagesChange}
        />
      </div>
      
      {/* ... rest of form ... */}
    </form>
  );
}
```

### 7.3 UI Components

1. **Image Upload Area**
   - Large dropzone with clear instructions
   - Drag-and-drop visual feedback
   - File type and size information
   - Upload progress indicators

2. **Image Grid**
   - Responsive grid layout (2-4 columns)
   - Aspect ratio maintained (16:9)
   - Hover effects for actions
   - Primary image badge

3. **Action Buttons**
   - Drag handle (grip icon)
   - Set primary (star icon)
   - Delete (trash icon)
   - Confirmation dialogs

4. **Loading States**
   - Upload progress bars
   - Skeleton loaders
   - Disabled states during operations

5. **Error Handling**
   - Toast notifications
   - Inline error messages
   - Retry mechanisms

---

## 8. Implementation Checklist

### Phase 1: Setup (Week 1)
- [ ] Install dependencies (`browser-image-compression`, `react-beautiful-dnd`, `react-dropzone`)
- [ ] Create `src/lib/storage.ts` with Firebase Storage configuration
- [ ] Create `src/lib/imageService.ts` with upload/compression functions
- [ ] Deploy Firebase Storage security rules
- [ ] Test basic upload functionality

### Phase 2: Components (Week 2)
- [ ] Create `ImageUploader` component
- [ ] Create `ImageManager` component
- [ ] Implement drag-and-drop functionality
- [ ] Implement image reordering
- [ ] Add delete confirmation dialogs

### Phase 3: Integration (Week 3)
- [ ] Integrate into `CreateListing` page
- [ ] Integrate into `EditListing` page
- [ ] Update Firestore schema
- [ ] Migrate existing camp images
- [ ] Test end-to-end workflows

### Phase 4: Optimization (Week 4)
- [ ] Implement multiple image sizes
- [ ] Add lazy loading for images
- [ ] Optimize compression settings
- [ ] Add image caching
- [ ] Performance testing

### Phase 5: Polish (Week 5)
- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add accessibility features (alt text, ARIA labels)
- [ ] Mobile responsiveness testing
- [ ] User acceptance testing

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// imageService.test.ts
describe('Image Service', () => {
  describe('compressImage', () => {
    it('should compress large images', async () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const compressed = await compressImage(file);
      expect(compressed.size).toBeLessThan(file.size);
    });
    
    it('should maintain image quality', async () => {
      // Test compression quality
    });
  });
  
  describe('uploadCampImage', () => {
    it('should upload image to Firebase Storage', async () => {
      // Mock Firebase Storage
      // Test upload
    });
    
    it('should track upload progress', async () => {
      // Test progress callback
    });
  });
});
```

### 9.2 Integration Tests

```typescript
// ImageUploader.test.tsx
describe('ImageUploader', () => {
  it('should accept drag-and-drop files', async () => {
    // Test drag-and-drop
  });
  
  it('should validate file types', async () => {
    // Test file type validation
  });
  
  it('should show upload progress', async () => {
    // Test progress display
  });
});

// ImageManager.test.tsx
describe('ImageManager', () => {
  it('should reorder images on drag', async () => {
    // Test reordering
  });
  
  it('should set primary image', async () => {
    // Test primary image selection
  });
  
  it('should delete images', async () => {
    // Test deletion
  });
});
```

### 9.3 E2E Tests

```typescript
// camp-images.spec.ts (Playwright)
test.describe('Camp Image Management', () => {
  test('should upload multiple images', async ({ page }) => {
    await page.goto('/create-listing');
    
    // Upload files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(['test1.jpg', 'test2.jpg']);
    
    // Verify upload
    await expect(page.locator('.image-preview')).toHaveCount(2);
  });
  
  test('should reorder images', async ({ page }) => {
    // Test drag-and-drop reordering
  });
  
  test('should set primary image', async ({ page }) => {
    // Test primary image selection
  });
});
```

---

## 10. Performance Considerations

### 10.1 Optimization Techniques

1. **Lazy Loading**
   - Load images only when visible
   - Use Intersection Observer API
   - Progressive image loading

2. **Image Caching**
   - Browser caching headers
   - Service Worker caching
   - CDN integration

3. **Compression**
   - Client-side compression before upload
   - Server-side optimization (Cloud Functions)
   - WebP format support

4. **Parallel Processing**
   - Upload multiple images simultaneously
   - Generate multiple sizes in parallel
   - Batch Firestore updates

### 10.2 Performance Metrics

- **Upload Time**: < 5 seconds per image
- **Compression Ratio**: 60-80% size reduction
- **Image Load Time**: < 1 second for thumbnails
- **Reorder Response**: < 200ms
- **Delete Response**: < 500ms

---

## 11. Accessibility

### 11.1 ARIA Labels

```typescript
<div
  {...getRootProps()}
  role="button"
  aria-label="Upload images"
  tabIndex={0}
>
  <input {...getInputProps()} aria-label="File input" />
</div>

<button
  aria-label="Delete image"
  onClick={handleDelete}
>
  <Trash2 />
</button>

<button
  aria-label="Set as primary image"
  onClick={handleSetPrimary}
>
  <Star />
</button>
```

### 11.2 Keyboard Navigation

- Tab through images
- Enter/Space to select actions
- Arrow keys for reordering
- Escape to close dialogs

### 11.3 Screen Reader Support

- Descriptive alt text for all images
- Status announcements for uploads
- Error message announcements
- Progress updates

---

## 12. Error Handling

### 12.1 Upload Errors

```typescript
try {
  await uploadCampImage(campId, file);
} catch (error) {
  if (error.code === 'storage/unauthorized') {
    toast.error('You do not have permission to upload images');
  } else if (error.code === 'storage/quota-exceeded') {
    toast.error('Storage quota exceeded. Please contact support.');
  } else if (error.code === 'storage/canceled') {
    toast.info('Upload cancelled');
  } else {
    toast.error('Failed to upload image. Please try again.');
  }
}
```

### 12.2 Network Errors

- Retry logic with exponential backoff
- Offline detection and queuing
- Resume interrupted uploads
- Clear error messages

### 12.3 Validation Errors

- File type validation
- File size validation
- Image count validation
- Dimension validation (optional)

---

## 13. Future Enhancements

### 13.1 Advanced Features

1. **Image Editing**
   - Crop and rotate
   - Filters and adjustments
   - Text overlays

2. **AI-Powered Features**
   - Auto-tagging
   - Smart cropping
   - Quality detection

3. **Bulk Operations**
   - Bulk upload
   - Bulk delete
   - Bulk reorder

4. **Analytics**
   - Image view tracking
   - Click-through rates
   - A/B testing

### 13.2 Integration Opportunities

1. **CDN Integration**
   - Cloudflare Images
   - Imgix
   - Cloudinary

2. **Image Recognition**
   - Google Cloud Vision
   - AWS Rekognition
   - Azure Computer Vision

3. **Social Sharing**
   - Open Graph meta tags
   - Twitter Cards
   - Pinterest Rich Pins

---

## 14. Cost Estimation

### 14.1 Firebase Storage Costs

**Assumptions:**
- 1000 camps
- 10 images per camp (average)
- 4 sizes per image
- 2MB per original image
- 500KB per large image
- 200KB per medium image
- 50KB per thumbnail

**Storage:**
- Total images: 1000 × 10 × 4 = 40,000 images
- Storage: (2MB + 0.5MB + 0.2MB + 0.05MB) × 10,000 = 27.5GB
- Cost: $0.026/GB/month × 27.5GB = **$0.72/month**

**Bandwidth:**
- 10,000 views/month
- 5 images viewed per camp (average)
- Thumbnail size: 50KB
- Total: 10,000 × 5 × 50KB = 2.5GB
- Cost: $0.12/GB × 2.5GB = **$0.30/month**

**Total Monthly Cost: ~$1.00**

### 14.2 Scaling Considerations

At 10,000 camps:
- Storage: ~$7/month
- Bandwidth: ~$3/month
- **Total: ~$10/month**

At 100,000 camps:
- Storage: ~$70/month
- Bandwidth: ~$30/month
- **Total: ~$100/month**

---

## 15. Security Best Practices

### 15.1 Upload Security

1. **File Validation**
   - Verify MIME types
   - Check file signatures (magic numbers)
   - Scan for malware (optional)

2. **Size Limits**
   - Enforce maximum file size
   - Limit total storage per user
   - Rate limiting on uploads

3. **Access Control**
   - Authenticate all uploads
   - Verify ownership before operations
   - Admin override capabilities

### 15.2 Storage Security

1. **Firebase Storage Rules**
   - Strict authentication checks
   - Owner-based access control
   - File type validation

2. **URL Security**
   - Signed URLs for sensitive images
   - Short-lived tokens
   - Referrer checking

3. **Data Privacy**
   - GDPR compliance
   - Right to deletion
   - Data export capabilities

---

## 16. Monitoring and Logging

### 16.1 Key Metrics

1. **Upload Metrics**
   - Upload success rate
   - Average upload time
   - Compression ratio
   - Error rates

2. **Storage Metrics**
   - Total storage used
   - Storage per camp
   - Growth rate
   - Quota utilization

3. **Performance Metrics**
   - Image load times
   - CDN hit rates
   - Bandwidth usage
   - Cache effectiveness

### 16.2 Logging Strategy

```typescript
// Upload logging
console.log('=== IMAGE UPLOAD ===', {
  campId,
  imageId,
  fileName: file.name,
  fileSize: file.size,
  originalSize: file.size,
  compressedSize: compressed.size,
  compressionRatio: (1 - compressed.size / file.size) * 100,
  uploadTime: Date.now() - startTime,
});

// Error logging
console.error('=== IMAGE UPLOAD FAILED ===', {
  campId,
  error: error.message,
  errorCode: error.code,
  fileName: file.name,
  timestamp: new Date().toISOString(),
});
```

---

## 17. Documentation

### 17.1 User Documentation

**Help Article: "How to Upload Camp Images"**

1. Navigate to Create Listing or Edit Listing
2. Scroll to the "Camp Images" section
3. Drag and drop images or click to select files
4. Wait for images to upload (progress bar will show)
5. Reorder images by dragging them
6. Click the star icon to set a primary image
7. Click the trash icon to delete unwanted images
8. Save your listing

### 17.2 Developer Documentation

**API Reference: Image Service**

```typescript
/**
 * Upload a camp image
 * @param campId - The camp ID
 * @param file - The image file to upload
 * @param onProgress - Progress callback (0-100)
 * @returns Upload result with URLs
 */
async function uploadCampImage(
  campId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  id: string;
  url: string;
  thumbnailUrl: string;
}>
```

---

## Conclusion

This comprehensive image upload system provides a robust, scalable, and user-friendly solution for managing camp images on the Sahra platform. The system leverages Firebase Storage for secure hosting, implements client-side compression for optimal performance, and provides intuitive management features including drag-and-drop reordering and primary image selection.

**Key Benefits:**
- ✅ Secure and scalable Firebase Storage integration
- ✅ Multiple image upload with drag-and-drop
- ✅ Image compression (60-80% size reduction)
- ✅ Multiple image sizes for different use cases
- ✅ Intuitive management interface
- ✅ Comprehensive security rules
- ✅ Cost-effective storage solution
- ✅ Excellent performance and user experience

**Next Steps:**
1. Review and approve this design document
2. Begin Phase 1 implementation (Setup)
3. Iteratively implement remaining phases
4. Conduct thorough testing
5. Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Author:** Bob (Architect)  
**Status:** Ready for Implementation