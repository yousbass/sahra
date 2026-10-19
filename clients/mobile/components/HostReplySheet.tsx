import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { PatternCanvas } from '@/components/BackgroundPatterns';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';
import { Review, updateReviewResponse } from '@/lib/firestore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  review: Review | null;
  onClose: () => void;
  /** Called with the saved response text so the caller can update local state. */
  onSaved: (reviewId: string, responseText: string) => void;
}

export function HostReplySheet({ review, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const visible = review !== null;

  useEffect(() => {
    if (visible) {
      setText(review?.adminResponse || '');
      setError('');
      setSubmitting(false);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, slideAnim]);

  if (!review) return null;

  const close = () => {
    if (submitting) return;
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const trimmed = text.trim();

  const handleSubmit = async () => {
    if (submitting || !trimmed) return;
    setSubmitting(true);
    setError('');
    try {
      await updateReviewResponse(review.id, trimmed);
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        onClose();
        onSaved(review.id, trimmed);
      });
    } catch {
      setError(t('replySaveError'));
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <PatternCanvas color={colors.foreground} opacity={0.04} />
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
            <AppText variant="h3" weight="bold">
              {t('replyToReview')}
            </AppText>
            <TouchableOpacity
              onPress={close}
              style={[styles.closeBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Guest review being replied to */}
            <View style={[styles.reviewQuote, { backgroundColor: colors.muted }]}>
              <View style={[styles.quoteTopRow, isRTL && styles.rtlRow]}>
                <AppText variant="labelSm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {review.userName}
                </AppText>
                <View style={[styles.quoteStars, isRTL && styles.rtlRow]}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons
                      key={i}
                      name={i <= Math.round(review.rating) ? 'star' : 'star-outline'}
                      size={12}
                      color={colors.primary}
                    />
                  ))}
                </View>
              </View>
              {review.reviewText ? (
                <AppText
                  variant="bodySm"
                  color={colors.mutedForeground}
                  numberOfLines={3}
                  style={[{ marginTop: 6 }, isRTL && { textAlign: 'right' }]}
                >
                  {review.reviewText}
                </AppText>
              ) : null}
            </View>

            <TextInput
              style={[
                styles.replyInput,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={t('replyPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={4}
              editable={!submitting}
              maxLength={1000}
              autoFocus
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
                <AppText variant="labelSm" color={colors.destructive}>
                  {error}
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={[styles.footer, { borderTopColor: colors.border }, isRTL && styles.rtlRow]}>
            <PressableScale
              onPress={close}
              disabled={submitting}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <AppText variant="label" weight="semibold">
                {t('cancel')}
              </AppText>
            </PressableScale>
            <PressableScale
              onPress={handleSubmit}
              disabled={submitting || !trimmed}
              style={[
                styles.submitBtn,
                { backgroundColor: !trimmed ? colors.muted : colors.primary },
                (submitting || !trimmed) && { opacity: 0.7 },
              ]}
            >
              {submitting ? (
                <CampfireLoader size="sm" />
              ) : (
                <AppText
                  variant="label"
                  weight="bold"
                  color={!trimmed ? colors.mutedForeground : colors.primaryForeground}
                >
                  {t('saveReply')}
                </AppText>
              )}
            </PressableScale>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    overflow: 'hidden',
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 8,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  reviewQuote: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  quoteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  quoteStars: {
    flexDirection: 'row',
    gap: 2,
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlignVertical: 'top',
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
});
