import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { MAX_LISTING_IMAGES } from '@/lib/listingImages';

export interface ListingImage {
  id: string;
  /** Firebase Storage download URL once uploaded (or prefilled in edit). */
  url?: string;
  /** Device-local URI while picking/uploading. */
  localUri?: string;
  isMain: boolean;
  uploading: boolean;
  progress: number;
  error?: boolean;
}

interface ListingPhotosProps {
  images: ListingImage[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSetMain: (id: string) => void;
  disabled?: boolean;
}

/** Photo grid: tap a photo to make it the main one, X to remove, + to add. */
export function ListingPhotos({ images, onAdd, onRemove, onSetMain, disabled }: ListingPhotosProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useI18n();

  const canAdd = images.length < MAX_LISTING_IMAGES && !disabled;

  return (
    <View>
      <View style={[styles.grid, isRTL ? styles.rtlRow : null]}>
        {images.map((img) => (
          <TouchableOpacity
            key={img.id}
            onPress={() => onSetMain(img.id)}
            disabled={disabled || img.uploading}
            style={[
              styles.tile,
              { borderColor: img.isMain ? colors.primary : colors.border },
              img.isMain ? styles.mainTile : null,
            ]}
          >
            <Image
              source={{ uri: img.url || img.localUri }}
              style={styles.tileImage}
              contentFit="cover"
              transition={100}
            />

            {img.uploading ? (
              <View style={styles.progressOverlay}>
                <AppText variant="labelSm" weight="bold" color="#FFFFFF">
                  {`${img.progress}%`}
                </AppText>
              </View>
            ) : null}

            {img.error ? (
              <View style={[styles.progressOverlay, { backgroundColor: colors.destructive + 'B3' }]}>
                <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
              </View>
            ) : null}

            {img.isMain && !img.uploading ? (
              <View style={[styles.mainBadge, { backgroundColor: colors.primary }]}>
                <AppText variant="labelSm" weight="bold" color={colors.primaryForeground}>
                  {t('hostMainPhoto')}
                </AppText>
              </View>
            ) : null}

            {!disabled && !img.uploading ? (
              <TouchableOpacity
                onPress={() => onRemove(img.id)}
                style={[styles.removeBtn, { backgroundColor: 'rgba(10, 17, 40, 0.75)' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        ))}

        {canAdd ? (
          <TouchableOpacity
            onPress={onAdd}
            style={[styles.tile, styles.addTile, { borderColor: colors.border, backgroundColor: colors.muted }]}
          >
            <Ionicons name="add" size={26} color={colors.mutedForeground} />
            <AppText variant="labelSm" color={colors.mutedForeground}>
              {`${images.length}/${MAX_LISTING_IMAGES}`}
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      {images.length > 0 ? (
        <AppText variant="labelSm" color={colors.mutedForeground} style={styles.hint}>
          {t('hostSetMain')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  tile: {
    width: '30.5%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mainTile: {
    borderWidth: 2,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 17, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 8,
  },
});
