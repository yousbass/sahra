import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Animated, Dimensions, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/lib/firestore';
import { submitDispute, uploadDisputePhoto, DisputeType } from '@/lib/disputes';
import { notify } from '@/lib/payments';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_DESCRIPTION = 1000;

const ISSUE_TYPES: { value: DisputeType; labelKey: string }[] = [
  { value: 'not_as_described', labelKey: 'issueTypeNotAsDescribed' },
  { value: 'missing_amenity', labelKey: 'issueTypeMissingAmenity' },
  { value: 'safety_concern', labelKey: 'issueTypeSafety' },
  { value: 'other', labelKey: 'issueTypeOther' },
];

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

export function ReportIssueSheet({ booking, onClose }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  const { user } = useAuth();

  const [issueType, setIssueType] = useState<DisputeType>('not_as_described');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const visible = booking !== null;

  useEffect(() => {
    if (visible) {
      setIssueType('not_as_described');
      setDescription('');
      setPhotoUri(null);
      setError('');
      setSubmitting(false);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }, [visible, slideAnim]);

  if (!booking) return null;

  const close = () => {
    if (submitting) return;
    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  const pickPhoto = async () => {
    if (submitting) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmed = description.trim();
    if (!trimmed) {
      setError(t('issueDescRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let photoUrl: string | undefined;
      if (photoUri && user) {
        try {
          photoUrl = await uploadDisputePhoto(photoUri, user.uid);
        } catch {
          // Best-effort: submit the report without the photo.
          notify(t('issuePhotoUploadFailed'), undefined, 'info');
        }
      }
      const r = await submitDispute({
        bookingId: booking.id,
        type: issueType,
        description: trimmed,
        photoUrl,
      });
      if (!r.ok) {
        if (r.error === 'already_reported') {
          notify(t('issueAlreadyReported'), undefined, 'info');
          Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
          return;
        }
        setError(t('issueSubmitFailed'));
        setSubmitting(false);
        return;
      }
      notify(t('issueSubmitted'), undefined, 'success');
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => onClose());
    } catch {
      setError(t('issueSubmitFailed'));
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
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={[styles.headerRow, isRTL ? styles.rtlRow : null]}>
            <AppText variant="h3" weight="bold">{t('reportIssueTitle')}</AppText>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <AppText variant="labelSm" color={colors.mutedForeground} style={isRTL ? { textAlign: 'right' } : null}>
              {t('reportIssueSubtitle')}
            </AppText>

            <AppText variant="label" weight="bold" style={[{ marginTop: 16, marginBottom: 8 }, isRTL ? { textAlign: 'right' } : null]}>
              {t('issueTypeLabel')}
            </AppText>
            <View style={{ gap: 8 }}>
              {ISSUE_TYPES.map(({ value, labelKey }) => {
                const selected = issueType === value;
                return (
                  <PressableScale
                    key={value}
                    onPress={() => setIssueType(value)}
                    style={[
                      styles.typeOption,
                      isRTL ? styles.rtlRow : null,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary + '15' : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
                    <AppText variant="bodySm" weight={selected ? 'bold' : 'medium'} style={{ marginHorizontal: 10, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                      {t(labelKey)}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>

            <AppText variant="label" weight="bold" style={[{ marginTop: 16, marginBottom: 8 }, isRTL ? { textAlign: 'right' } : null]}>
              {t('issueDescLabel')}
            </AppText>
            <TextInput
              style={[styles.descInput, { borderColor: colors.border, color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('issueDescPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, MAX_DESCRIPTION))}
              multiline
              numberOfLines={4}
              maxLength={MAX_DESCRIPTION}
              editable={!submitting}
            />
            <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 4, textAlign: isRTL ? 'left' : 'right' }}>
              {description.length}/{MAX_DESCRIPTION}
            </AppText>

            <AppText variant="label" weight="bold" style={[{ marginTop: 12, marginBottom: 8 }, isRTL ? { textAlign: 'right' } : null]}>
              {t('issuePhotoLabel')}
            </AppText>
            {photoUri ? (
              <View style={[styles.photoRow, isRTL ? styles.rtlRow : null, { borderColor: colors.border }]}>
                <Image source={{ uri: photoUri }} style={styles.photoThumb} />
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={() => setPhotoUri(null)}
                  disabled={submitting}
                  style={[styles.closeBtn, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ) : (
              <PressableScale
                onPress={pickPhoto}
                disabled={submitting}
                style={[styles.addPhotoBtn, { borderColor: colors.border }, isRTL ? styles.rtlRow : null]}
              >
                <Ionicons name="image-outline" size={20} color={colors.mutedForeground} />
                <AppText variant="label" weight="semibold" color={colors.mutedForeground} style={{ marginHorizontal: 8 }}>
                  {t('issueAddPhoto')}
                </AppText>
              </PressableScale>
            )}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
                <AppText variant="labelSm" color={colors.destructive}>{error}</AppText>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }, isRTL ? styles.rtlRow : null]}>
            <PressableScale
              onPress={close}
              disabled={submitting}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <AppText variant="label" weight="semibold">{t('issueCancel')}</AppText>
            </PressableScale>
            <PressableScale
              onPress={handleSubmit}
              disabled={submitting || !description.trim()}
              style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting || !description.trim() ? { opacity: 0.7 } : null]}
            >
              {submitting
                ? <CampfireLoader size="sm" />
                : <AppText variant="label" weight="bold" color={colors.primaryForeground}>{t('issueSubmit')}</AppText>}
            </PressableScale>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { overflow: 'hidden', width: '100%', maxHeight: SCREEN_HEIGHT * 0.88, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 16 },
  rtlRow: { flexDirection: 'row-reverse' },
  typeOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14 },
  descInput: { borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 96, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 10, gap: 10 },
  photoThumb: { width: 56, height: 56, borderRadius: 10 },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 },
  errorBox: { padding: 12, borderRadius: 12, marginTop: 12, alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, borderTopWidth: 1, marginTop: 8 },
  cancelBtn: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { flex: 1, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
