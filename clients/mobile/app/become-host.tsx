import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, TextInput, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';
import { PageLoader } from '@/components/PageLoader';
import { goBack } from '@/lib/nav';
import { getHostApplicationByUserId, createHostApplication } from '@/lib/hostApplication';

const { width } = Dimensions.get('window');

const STEPS = ['intro', 'phone', 'cpr', 'review'];

export default function BecomeHostScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL } = useI18n();
  const { user, userData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<'wizard' | 'already-host' | 'under-review' | 'rejected' | 'success'>('wizard');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submittedDate, setSubmittedDate] = useState<Date | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const animValue = useRef(new Animated.Value(0)).current;

  const [phone, setPhone] = useState('');
  const [cpr, setCpr] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [cprError, setCprError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    if (userData?.isHost) {
      setAppState('already-host');
      setLoading(false);
      return;
    }

    let active = true;
    getHostApplicationByUserId(user.uid)
      .then(app => {
        if (!active) return;
        if (app?.status === 'approved') {
          setAppState('already-host');
        } else if (app?.status === 'pending') {
          setAppState('under-review');
          setSubmittedDate(app.submittedAt && typeof app.submittedAt === 'object' && 'seconds' in app.submittedAt ? new Date(app.submittedAt.seconds * 1000) : new Date());
        } else if (app?.status === 'rejected') {
          setAppState('rejected');
          setRejectionReason(app.rejectionReason || '');
          if (app.phoneNumber) setPhone(app.phoneNumber.replace(/^\+973/, ''));
          if (app.cprNumber) setCpr(app.cprNumber);
        } else {
          setAppState('wizard');
          if (user.phoneNumber?.startsWith('+973')) {
            setPhone(user.phoneNumber.replace('+973', ''));
          } else if (userData?.phone && /^[367]\d{7}$/.test(userData.phone)) {
            setPhone(userData.phone);
          }
        }
      })
      .catch(() => {
        if (active) setAppState('wizard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user, userData]);

  const animateToStep = (newIndex: number) => {
    Animated.spring(animValue, {
      toValue: newIndex,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20
    }).start();
    setStepIndex(newIndex);
  };

  const handleNext = () => {
    if (stepIndex === 1) {
      if (!/^[367]\d{7}$/.test(phone)) {
        setPhoneError(t('errInvalidPhoneHost'));
        return;
      }
      setPhoneError('');
    } else if (stepIndex === 2) {
      if (!/^\d{9}$/.test(cpr)) {
        setCprError(t('errInvalidCpr'));
        return;
      }
      setCprError('');
    }

    if (stepIndex < STEPS.length - 1) {
      animateToStep(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      animateToStep(stepIndex - 1);
    } else {
      goBack();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const isVerified = user.phoneNumber === '+973' + phone;
      await createHostApplication(
        user.uid,
        user.email || '',
        userData?.displayName || user.email || 'User',
        phone,
        cpr,
        isVerified
      );
      setSubmittedDate(new Date());
      setAppState('success');
    } catch (e) {
      console.error(e);
      setSubmitError(t('submitFailedMsg'));
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (appState === 'success') {
      const timer = setTimeout(() => {
        setAppState('under-review');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  if (loading) {
    return <PageLoader />;
  }

  if (appState === 'already-host') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingHorizontal: 20 }, isRTL && styles.rtlRow]}>
          <TouchableOpacity onPress={() => goBack()} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20', marginBottom: 24 }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
          </View>
          <AppText variant="h2" weight="bold" align="center" style={{ marginBottom: 12 }}>{t('alreadyHostTitle')}</AppText>
          <AppText variant="body" color={colors.mutedForeground} align="center" style={{ paddingHorizontal: 40 }}>
            {t('alreadyHostDesc')}
          </AppText>
        </View>
      </View>
    );
  }

  if (appState === 'under-review' || appState === 'success') {
    const isSuccess = appState === 'success';
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingHorizontal: 20 }, isRTL && styles.rtlRow]}>
          <TouchableOpacity onPress={() => goBack()} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: (isSuccess ? '#4BB543' : colors.primary) + '20', marginBottom: 24 }]}>
            <Ionicons name={isSuccess ? "checkmark" : "time"} size={48} color={isSuccess ? '#4BB543' : colors.primary} />
          </View>
          <AppText variant="h2" weight="bold" align="center" style={{ marginBottom: 12 }}>
            {isSuccess ? t('appSubmittedTitle') : t('appReviewTitle')}
          </AppText>
          <AppText variant="body" color={colors.mutedForeground} align="center" style={{ paddingHorizontal: 40 }}>
            {t('appReviewDesc')}
          </AppText>
          {submittedDate && !isSuccess && (
            <View style={[styles.dateChip, { backgroundColor: colors.muted, marginTop: 24 }]}>
              <AppText variant="labelSm" color={colors.mutedForeground}>
                {t('submittedOn')} {submittedDate.toLocaleDateString(isRTL ? 'ar' : 'en-US')}
              </AppText>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (appState === 'rejected') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingHorizontal: 20 }, isRTL && styles.rtlRow]}>
          <TouchableOpacity onPress={() => goBack()} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.destructive + '20', marginBottom: 24 }]}>
            <Ionicons name="close-circle" size={48} color={colors.destructive} />
          </View>
          <AppText variant="h2" weight="bold" align="center" style={{ marginBottom: 12 }}>{t('appRejectedTitle')}</AppText>
          <AppText variant="body" color={colors.mutedForeground} align="center" style={{ paddingHorizontal: 40, marginBottom: 24 }}>
            {t('appRejectedDesc')}
          </AppText>
          {rejectionReason ? (
            <View style={[styles.rejectionBox, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '30' }]}>
              <AppText variant="labelSm" color={colors.destructive} weight="bold" style={{ marginBottom: 4 }}>{t('rejectionReason')}</AppText>
              <AppText variant="bodySm" color={colors.foreground}>{rejectionReason}</AppText>
            </View>
          ) : null}
          <PressableScale onPress={() => setAppState('wizard')} style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 32 }]}>
            <AppText variant="label" color={colors.primaryForeground} weight="bold">{t('applyAgain')}</AppText>
          </PressableScale>
        </View>
      </View>
    );
  }

  const renderStep = (index: number) => {
    const inputRange = [index - 1, index, index + 1];
    const translateX = animValue.interpolate({
      inputRange,
      outputRange: isRTL ? [-width, 0, width] : [width, 0, -width],
    });
    const opacity = animValue.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
    });

    const isVerified = user?.phoneNumber === '+973' + phone;
    const hasDifferentVerified = user?.phoneNumber && user?.phoneNumber !== '+973' + phone;

    return (
      <Animated.View key={index} style={[styles.stepContainer, { transform: [{ translateX }], opacity, zIndex: stepIndex === index ? 1 : 0 }]} pointerEvents={stepIndex === index ? 'auto' : 'none'}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {index === 0 && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={[styles.introIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="home" size={48} color={colors.primary} />
              </View>
              <AppText variant="h1" align="center" weight="bold" style={{ marginBottom: 16 }}>{t('hostIntroTitle')}</AppText>
              <AppText variant="bodyLg" align="center" color={colors.mutedForeground} style={{ lineHeight: 28, marginBottom: 40 }}>
                {t('hostIntroDesc')}
              </AppText>
              
              <View style={styles.features}>
                <View style={[styles.featureRow, isRTL && styles.rtlRow]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  <AppText variant="body" style={[{ flex: 1 }, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>{t('hostFeature1')}</AppText>
                </View>
                <View style={[styles.featureRow, isRTL && styles.rtlRow]}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                  <AppText variant="body" style={[{ flex: 1 }, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>{t('hostFeature2')}</AppText>
                </View>
                <View style={[styles.featureRow, isRTL && styles.rtlRow]}>
                  <Ionicons name="cash" size={24} color={colors.primary} />
                  <AppText variant="body" style={[{ flex: 1 }, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>{t('hostFeature3')}</AppText>
                </View>
              </View>
            </View>
          )}

          {index === 1 && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <AppText variant="h2" weight="bold" style={{ marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t('hostPhoneTitle')}</AppText>
              <AppText variant="body" color={colors.mutedForeground} style={{ marginBottom: 32, textAlign: isRTL ? 'right' : 'left' }}>{t('hostPhoneDesc')}</AppText>
              
              <View style={[styles.phoneInputRow, { backgroundColor: colors.card, borderColor: phoneError ? colors.destructive : colors.border }, isRTL && styles.rtlRow]}>
                <View style={[styles.phonePrefix, { borderRightWidth: isRTL ? 0 : 1, borderLeftWidth: isRTL ? 1 : 0, borderColor: colors.border }]}>
                  <AppText variant="body" weight="medium">{'\u200E'}+973</AppText>
                </View>
                <TextInput
                  style={[styles.input, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="3XXXXXXX"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={8}
                  value={phone}
                  onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setPhoneError(''); }}
                />
              </View>
              {phoneError ? <AppText variant="labelSm" color={colors.destructive} style={{ marginTop: 8, textAlign: isRTL ? 'right' : 'left' }}>{phoneError}</AppText> : null}
              
              {phone.length === 8 && (
                <View style={[styles.verificationNote, { backgroundColor: isVerified ? colors.primary + '10' : colors.muted }, isRTL && styles.rtlRow, { marginTop: 24 }]}>
                  <Ionicons name={isVerified ? "checkmark-circle" : "information-circle"} size={20} color={isVerified ? colors.primary : colors.mutedForeground} />
                  <AppText variant="labelSm" color={isVerified ? colors.primary : colors.foreground} style={[{ flex: 1 }, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                    {isVerified ? t('phoneVerifiedMsg') : t('phoneWillVerifyMsg')}
                  </AppText>
                </View>
              )}
              
              {hasDifferentVerified && !isVerified && phone.length === 8 && (
                <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 12, textAlign: isRTL ? 'right' : 'left' }}>
                  {t('differentPhoneVerifiedMsg')}
                </AppText>
              )}
            </View>
          )}

          {index === 2 && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <AppText variant="h2" weight="bold" style={{ marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t('hostCprTitle')}</AppText>
              <AppText variant="body" color={colors.mutedForeground} style={{ marginBottom: 32, textAlign: isRTL ? 'right' : 'left' }}>{t('hostCprDesc')}</AppText>
              
              <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: cprError ? colors.destructive : colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="XXXXXXXXX"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={9}
                  value={cpr}
                  onChangeText={(t) => { setCpr(t.replace(/\D/g, '')); setCprError(''); }}
                />
              </View>
              {cprError ? <AppText variant="labelSm" color={colors.destructive} style={{ marginTop: 8, textAlign: isRTL ? 'right' : 'left' }}>{cprError}</AppText> : null}
              
              <View style={[styles.cprNote, { backgroundColor: colors.muted }, isRTL && styles.rtlRow]}>
                <Ionicons name="shield-checkmark" size={20} color={colors.mutedForeground} />
                <AppText variant="labelSm" color={colors.mutedForeground} style={[{ flex: 1 }, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                  {t('cprPrivacyNote')}
                </AppText>
              </View>
            </View>
          )}

          {index === 3 && (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <AppText variant="h2" weight="bold" style={{ marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{t('hostReviewTitle')}</AppText>
              <AppText variant="body" color={colors.mutedForeground} style={{ marginBottom: 32, textAlign: isRTL ? 'right' : 'left' }}>{t('hostReviewDesc')}</AppText>
              
              <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.reviewRow, isRTL && styles.rtlRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="labelSm" color={colors.mutedForeground} style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 4 }}>{t('phoneNumber')}</AppText>
                    <AppText variant="body" weight="medium" style={{ textAlign: isRTL ? 'right' : 'left' }}>{'\u200E'}+973 {phone}</AppText>
                  </View>
                  <TouchableOpacity onPress={() => animateToStep(1)}>
                    <AppText variant="label" color={colors.primary}>{t('edit')}</AppText>
                  </TouchableOpacity>
                </View>
                <View style={[styles.reviewRow, isRTL && styles.rtlRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="labelSm" color={colors.mutedForeground} style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 4 }}>{t('cprNumber')}</AppText>
                    <AppText variant="body" weight="medium" style={{ textAlign: isRTL ? 'right' : 'left' }}>{cpr}</AppText>
                  </View>
                  <TouchableOpacity onPress={() => animateToStep(2)}>
                    <AppText variant="label" color={colors.primary}>{t('edit')}</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  const isNextDisabled = () => false;

  const progressScaleX = animValue.interpolate({
    inputRange: [0, STEPS.length - 1],
    outputRange: [0.25, 1],
    extrapolate: 'clamp',
  });

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingHorizontal: 20 }, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={handleBack} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name={stepIndex === 0 ? "close" : (isRTL ? "arrow-forward" : "arrow-back")} size={24} color={colors.foreground} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.muted, transform: isRTL ? [{ scaleX: -1 }] : [] }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary, transform: [{ scaleX: progressScaleX }], transformOrigin: 'left' }]} />
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {STEPS.map((_, i) => renderStep(i))}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), borderTopColor: colors.border }]}>
        {submitError ? (
          <AppText variant="labelSm" color={colors.destructive} align="center" style={{ marginBottom: 12 }}>
            {submitError}
          </AppText>
        ) : null}
        <PressableScale
          style={[styles.nextBtn, { backgroundColor: colors.primary, opacity: isNextDisabled() || submitting ? 0.5 : 1 }]}
          onPress={stepIndex === STEPS.length - 1 ? handleSubmit : handleNext}
          disabled={isNextDisabled() || submitting}
        >
          {submitting ? (
            <CampfireLoader size="sm" />
          ) : (
            <AppText variant="label" color={colors.primaryForeground} weight="bold">
              {stepIndex === 0 ? t('getStarted') : stepIndex === STEPS.length - 1 ? t('submitApplication') : t('continue')}
            </AppText>
          )}
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flex: 1, paddingHorizontal: 20 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { ...StyleSheet.absoluteFillObject },
  rtlRow: { flexDirection: 'row-reverse' },
  content: { flex: 1, position: 'relative' },
  stepContainer: { ...StyleSheet.absoluteFillObject },
  
  footer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  nextBtn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  dateChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  rejectionBox: { padding: 16, borderRadius: 12, borderWidth: 1, width: '100%' },
  actionBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 24 },
  
  introIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 },
  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  phonePrefix: { paddingHorizontal: 16, height: '100%', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.02)' },
  input: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium' },
  
  inputRow: { height: 56, borderRadius: 12, borderWidth: 1 },
  
  verificationNote: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12 },
  cprNote: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 24 },
  
  reviewCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
