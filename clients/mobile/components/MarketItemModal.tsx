import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { AppText } from './AppText';
import { MarketItem } from '@/lib/marketplace';

const NIGHT = '#0A1128';

const CATEGORY_LABEL_KEY: Record<MarketItem['category'], string> = {
  food: 'serviceCampFood',
  firewood: 'serviceFirewood',
  gear: 'serviceGear',
};

interface MarketItemModalProps {
  item: MarketItem | null;
  onClose: () => void;
}

/** Bottom-sheet detail view for a marketplace item. Browse-only: the photo
 *  carries the category + name caption, and a night-indigo band holds the
 *  price alongside the "ordering not available" note. */
export function MarketItemModal({ item, onClose }: MarketItemModalProps) {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const isAr = (i18n.language || 'en').startsWith('ar');

  return (
    <Modal visible={item !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        {item ? (
          <View style={[
            styles.modalSheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 },
          ]}>
            {/* Edge-to-edge photo with caption overlay */}
            <View style={styles.modalImageWrap}>
              <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['rgba(10,17,40,0.20)', 'transparent', 'rgba(10,17,40,0.88)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabHandle} />
              <View style={[styles.soonBadge, isRTL ? styles.soonBadgeRtl : null, { backgroundColor: colors.primary }]}>
                <AppText variant="labelSm" color={colors.primaryForeground} weight="bold" style={{ fontSize: 12 }}>
                  {t('comingSoon')}
                </AppText>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={[styles.modalClose, isRTL ? styles.modalCloseRtl : null]}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </Pressable>
              <View style={[styles.imageCaption, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <AppText variant="labelSm" color={colors.primary} weight="bold" style={{ letterSpacing: 1.5 }}>
                  {t(CATEGORY_LABEL_KEY[item.category]).toUpperCase()}
                </AppText>
                <AppText variant="h2" color="#FFF" weight="bold" style={{ marginTop: 2 }} numberOfLines={2}>
                  {isAr ? item.nameAr : item.nameEn}
                </AppText>
              </View>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              <AppText
                variant="body"
                color={colors.mutedForeground}
                style={{ marginTop: 14, lineHeight: 21, textAlign: isRTL ? 'right' : 'left', alignSelf: 'stretch' }}
              >
                {isAr ? item.descAr : item.descEn}
              </AppText>

              {/* Night-indigo price band */}
              <View style={[styles.priceBand, isRTL ? styles.rtlRow : null]}>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <View style={[styles.priceRow, isRTL ? styles.rtlRow : null]}>
                    <AppText variant="h2" weight="bold" color={colors.primary} style={{ fontVariant: ['tabular-nums'] }}>
                      {item.price} {isAr ? 'د.ب' : 'BD'}
                    </AppText>
                  </View>
                  <AppText variant="labelSm" color="rgba(255,255,255,0.6)" style={{ marginTop: 2 }}>
                    / {isAr ? item.unitAr : item.unitEn}
                  </AppText>
                </View>
                <View style={styles.vDivider} />
                <View style={[styles.noteCol, isRTL ? styles.rtlRow : null]}>
                  <Ionicons name="information-circle-outline" size={15} color="rgba(255,255,255,0.65)" />
                  <AppText
                    variant="labelSm"
                    color="rgba(255,255,255,0.75)"
                    style={{ flex: 1, marginHorizontal: 7, textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t('itemDialogNote')}
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rtlRow: { flexDirection: 'row-reverse' },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,17,40,0.55)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalImageWrap: {
    height: 250,
  },
  grabHandle: {
    position: 'absolute',
    top: 10,
    left: '50%',
    marginLeft: -22,
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  soonBadge: {
    position: 'absolute',
    top: 16, left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soonBadgeRtl: {
    left: undefined,
    right: 16,
  },
  modalClose: {
    position: 'absolute',
    top: 16, right: 16,
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,17,40,0.45)',
  },
  modalCloseRtl: {
    right: undefined,
    left: 16,
  },
  imageCaption: {
    position: 'absolute',
    left: 16, right: 16, bottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceBand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: NIGHT,
  },
  vDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: 14,
  },
  noteCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
