import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Check, GripVertical, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadImage, deleteImage, validateImageFile } from '@/lib/imageUpload';

interface ImageData {
  id: string;
  url: string;
  file?: File;
  isMain: boolean;
  uploading?: boolean;
  progress?: number;
}

interface ImageUploadManagerProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  userId: string;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploadManager({
  images,
  onChange,
  userId,
  maxImages = 10,
  disabled = false,
}: ImageUploadManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check if userId is valid
    if (!userId) {
      toast.error('User not authenticated. Please log in to upload images.');
      return;
    }
    
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    // Validate all files first
    for (const file of filesToUpload) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file');
        return;
      }
    }

    // Create temporary image entries with uploading state
    const newImages: ImageData[] = filesToUpload.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      file,
      isMain: images.length === 0 && index === 0,
      uploading: true,
      progress: 0,
    }));

    onChange([...images, ...newImages]);

    // Upload files one by one, keeping a working copy to avoid stale state
    const workingImages = [...images, ...newImages];

    // Upload files one by one
    for (let i = 0; i < newImages.length; i++) {
      const imageData = newImages[i];
      const file = imageData.file!;

      try {
        console.log(`Starting upload for image ${i + 1}/${newImages.length}`);
        
        const downloadURL = await uploadImage(file, userId, (progress) => {
          console.log(`Upload progress for image ${i + 1}: ${progress}%`);
          
          // Update progress on the working array
          const imageIndex = images.length + i;
          if (workingImages[imageIndex]) {
            workingImages[imageIndex] = {
              ...workingImages[imageIndex],
              progress,
            };
            onChange([...workingImages]);
          }
        });

        console.log(`Upload complete for image ${i + 1}. URL:`, downloadURL);

        // Update with final URL
        const imageIndex = images.length + i;
        if (workingImages[imageIndex]) {
          workingImages[imageIndex] = {
            ...workingImages[imageIndex],
            url: downloadURL,
            uploading: false,
            progress: 100,
            file: undefined,
          };
          onChange([...workingImages]);
        }

        toast.success(`Image ${i + 1} uploaded successfully`);
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to upload image ${i + 1}: ${errorMessage}`);
        
        // Remove failed upload
        const imageIndex = images.length + i;
        workingImages.splice(imageIndex, 1);
        onChange([...workingImages]);
      }
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [disabled, images, maxImages, userId]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index];
    
    if (imageToRemove.uploading) {
      toast.error('Please wait for upload to complete');
      return;
    }

    try {
      // Delete from Firebase Storage if it's a Firebase URL
      if (imageToRemove.url.includes('firebasestorage.googleapis.com')) {
        await deleteImage(imageToRemove.url);
      }

      const newImages = images.filter((_, i) => i !== index);
      
      // If removed image was main, set first image as main
      if (imageToRemove.isMain && newImages.length > 0) {
        newImages[0].isMain = true;
      }

      onChange(newImages);
      toast.success('Image removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleSetMainImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isMain: i === index,
    }));
    onChange(newImages);
    toast.success('Main image updated');
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOverImage = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    onChange(newImages);
    setDraggedIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-terracotta-500 bg-terracotta-50'
            : 'border-sand-300 hover:border-terracotta-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-12 h-12 text-terracotta-600" />
          <div>
            <p className="text-gray-900 font-semibold mb-1">
              {isDragging ? 'Drop images here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-gray-600">
              PNG, JPG, WebP up to 10MB each (Max {maxImages} images)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {images.length} / {maxImages} images uploaded
            </p>
          </div>
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || images.length >= maxImages || !userId}
            className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Images
          </Button>
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">
            Uploaded Images ({images.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <Card
                key={image.id}
                draggable={!image.uploading && !disabled}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverImage(e, index)}
                className={cn(
                  'relative group overflow-hidden border-2 transition-all',
                  image.isMain ? 'border-green-500 ring-2 ring-green-200' : 'border-sand-300',
                  draggedIndex === index && 'opacity-50',
                  !image.uploading && !disabled && 'cursor-move'
                )}
              >
                {/* Image */}
                <div className="aspect-square relative">
                  <img
                    src={image.url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Upload Progress */}
                  {image.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <Progress value={image.progress || 0} className="w-3/4" />
                      <p className="text-white text-sm font-medium">
                        {image.progress || 0}%
                      </p>
                    </div>
                  )}

                  {/* Main Badge */}
                  {image.isMain && !image.uploading && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-green-600 text-white">
                        Main Photo
                      </Badge>
                    </div>
                  )}

                  {/* Drag Handle */}
                  {!image.uploading && !disabled && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 rounded p-1">
                        <GripVertical className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Actions Overlay (desktop hover) */}
                  {!image.uploading && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-2">
                      {!image.isMain && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSetMainImage(index)}
                          disabled={disabled}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Set as Main
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleRemoveImage(index)}
                        disabled={disabled}
                        variant="destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mobile-friendly actions */}
                {!image.uploading && (
                  <div className="sm:hidden flex items-center justify-between px-3 py-2 bg-white border-t border-sand-200">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled || image.isMain}
                      onClick={() => handleSetMainImage(index)}
                      className="flex-1 mr-2"
                    >
                      {image.isMain ? 'Main photo' : 'Set as Main'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={disabled}
                      onClick={() => handleRemoveImage(index)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="p-3 bg-sand-50 border border-sand-300 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Tips:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-1 space-y-1 ml-4 list-disc">
              <li>Drag images to reorder them</li>
              <li>The first image is set as the main cover photo by default</li>
              <li>Click "Set as Main" to change the cover photo</li>
              <li>Images are automatically compressed and optimized</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
