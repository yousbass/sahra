import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  Alert,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Booking, submitReview, editReview, deleteReview } from '@/lib/firestore';
import { ExistingReview } from '@/hooks/useBookingReview';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  booking: Booking | null;
  existing?: ExistingReview | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RateStaySheet({ booking, existing, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  const { user, userData } = useAuth();

  const isEditing = !!existing;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const visible = booking !== null;

  useEffect(() => {
    if (visible) {
      // Pre-fill when editing, otherwise reset
      setRating(existing?.rating ?? 0);
      setComment(existing?.text ?? '');
      setError('');
      setSubmitting(false);
      setDeleting(false);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  }, [visible, existing, slideAnim]);

  if (!booking) return null;

  const close = () => {
    if (submitting || deleting) return;
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      onSuccess();
    });
  };

  const handleSubmit = async () => {
    if (submitting || deleting || rating === 0) return;
    setSubmitting(true);
    setError('');
    try {
      if (isEditing && existing) {
        await editReview({
          reviewId: existing.id,
          campId: booking.campId,
          oldRating: existing.rating,
          newRating: rating,
          comment: comment.trim(),
        });
      } else {
        await submitReview({
          campId: booking.campId,
          bookingId: booking.id,
          userId: user!.uid,
          userName: userData?.displayName || user?.email || 'Guest',
          userPhoto: userData?.photoURL || undefined,
          rating,
          comment: comment.trim(),
        });
      }
      dismiss();
    } catch {
      setError(isEditing ? t('reviewUpdateError') : t('reviewSubmitError'));
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (submitting || deleting || !existing) return;
    Alert.alert(
      t('deleteReview'),
      t('deleteReviewConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteReview'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            setError('');
            try {
              await deleteReview({
                reviewId: existing.id,
                campId: booking.campId,
                oldRating: existing.rating,
              });
              dismiss();
            } catch {
              setError(t('reviewDeleteError'));
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const busy = submitting || deleting;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={close}
          activeOpacity={1}
        />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
            <AppText variant="h3" weight="bold">
              {isEditing ? t('editReview') : t('rateYourStay')}
            </AppText>
            <View style={[styles.headerActions, isRTL && styles.rtlRow]}>
              {/* Delete button — only shown when editing */}
              {isEditing && (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={busy}
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + '18' }]}
                >
                  {deleting ? (
                    <CampfireLoader size="sm" />
                  ) : (
                    <Ionicons name="trash-outline" size={17} color={colors.destructive} />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={close}
                disabled={busy}
                style={[styles.iconBtn, { backgroundColor: colors.muted }]}
              >
                <Ionicons name="close" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Camp name */}
          <View style={styles.content}>
            <AppText
              variant="label"
              color={colors.mutedForeground}
              style={[styles.campName, isRTL && { textAlign: 'right' }]}
              numberOfLines={1}
            >
              {booking.campTitle}
            </AppText>

            {/* Star picker */}
            <View style={[styles.starRow, isRTL && styles.rtlRow]}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => !busy && setRating(star)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? colors.primary : colors.mutedForeground}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Rating label */}
            {rating > 0 && (
              <AppText
                variant="labelSm"
                color={colors.mutedForeground}
                style={[styles.ratingLabel, isRTL && { textAlign: 'right' }]}
              >
                {t(`ratingLabel_${rating}` as any)}
              </AppText>
            )}

            {/* Comment input */}
            <AppText
              variant="labelSm"
              color={colors.mutedForeground}
              style={[styles.commentLabel, isRTL && { textAlign: 'right' }]}
            >
              {t('reviewCommentOptional')}
            </AppText>
            <TextInput
              style={[
                styles.commentInput,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={t('reviewCommentPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              editable={!busy}
              maxLength={500}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
                <AppText variant="labelSm" color={colors.destructive}>
                  {error}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }, isRTL && styles.rtlRow]}>
            <PressableScale
              onPress={close}
              disabled={busy}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <AppText variant="label" weight="semibold">
                {t('cancel')}
              </AppText>
            </PressableScale>
            <PressableScale
              onPress={handleSubmit}
              disabled={busy || rating === 0}
              style={[
                styles.submitBtn,
                { backgroundColor: rating === 0 ? colors.muted : colors.primary },
                (busy || rating === 0) && { opacity: 0.7 },
              ]}
            >
              {submitting ? (
                <CampfireLoader size="sm" />
              ) : (
                <AppText
                  variant="label"
                  weight="bold"
                  color={rating === 0 ? colors.mutedForeground : colors.primaryForeground}
                >
                  {isEditing ? t('updateReview') : t('submitReview')}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
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
  campName: {
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    textAlign: 'center',
    marginBottom: 20,
  },
  commentLabel: {
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 80,
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
