import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoGalleryProps {
  images: string[];
  altBase?: string;
  isRTL?: boolean;
}

export default function PhotoGallery({ images, altBase = 'Camp photo', isRTL = false }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Deduplicate and limit to 10
  const photos = Array.from(new Set(images.filter(Boolean))).slice(0, 10);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') isRTL ? next() : prev();
      if (e.key === 'ArrowRight') isRTL ? prev() : next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, prev, next, isRTL]);

  if (photos.length === 0) return null;

  const thumbnails = photos.slice(1, 5); // up to 4 thumbnails
  const remaining = photos.length - 5; // photos beyond the first 5

  return (
    <>
      {/* Hero + Thumbnails */}
      <div className="flex flex-col gap-2">
        {/* Hero image */}
        <div
          className="relative w-full aspect-video cursor-pointer overflow-hidden rounded-none"
          onClick={() => openLightbox(0)}
        >
          <img
            src={photos[0]}
            alt={`${altBase} 1`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
        </div>

        {/* Thumbnails row */}
        {thumbnails.length > 0 && (
          <div className="grid grid-cols-4 gap-2 px-4">
            {thumbnails.map((src, i) => {
              const idx = i + 1;
              const isLast = i === thumbnails.length - 1 && remaining > 0;
              return (
                <div
                  key={idx}
                  className="relative aspect-video cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => openLightbox(idx)}
                >
                  <img
                    src={src}
                    alt={`${altBase} ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                    }}
                  />
                  {isLast && remaining > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">+{remaining + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors z-10"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {activeIndex + 1} / {photos.length}
          </div>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors z-10`}
              onClick={(e) => { e.stopPropagation(); isRTL ? next() : prev(); }}
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-5xl max-h-[85vh] mx-auto px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[activeIndex]}
              alt={`${altBase} ${activeIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
              }}
            />
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors z-10`}
              onClick={(e) => { e.stopPropagation(); isRTL ? prev() : next(); }}
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4">
              {photos.map((src, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                  className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all ${
                    i === activeIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
