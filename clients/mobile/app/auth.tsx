import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Animated, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { CampfireLoader } from '@/components/CampfireLoader';

function FloatingLabelInput({ 
  label, 
  value, 
  onChangeText, 
  secureTextEntry, 
  keyboardType = 'default' 
}: { 
  label: string, 
  value: string, 
  onChangeText: (t: string) => void, 
  secureTextEntry?: boolean,
  keyboardType?: any
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);
  
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedValue, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animatedValue, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  };

  const labelTop = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelFontSize = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });
  const labelColor = animatedValue.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [colors.mutedForeground, colors.primary] 
  });

  return (
    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: isFocused ? colors.primary : colors.border }]}>
      <Animated.Text style={[
        styles.floatingLabel, 
        { top: labelTop, fontSize: labelFontSize, color: labelColor },
        isRTL ? { right: 16 } : { left: 16 }
      ]}>
        {label}
      </Animated.Text>
      <TextInput
        style={[styles.input, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={!showPassword}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {secureTextEntry && (
        <TouchableOpacity style={[styles.eyeBtn, isRTL ? { left: 16 } : { right: 16 }]} onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AuthModal() {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  const insets = useScreenInsets();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState('');
  const [error, setError] = useState('');

  const leaveAuth = () => {
    // dismissAll() throws POP_TO_TOP warnings and dead-ends on web when the
    // auth screen was reached via replace(); fall back to the tabs root.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const friendlyError = (e: any): string => {
    const code: string = e?.code || '';
    if (code.includes('email-already-in-use')) return t('errEmailInUse');
    if (code.includes('invalid-email')) return t('errInvalidEmail');
    if (code.includes('weak-password')) return t('errWeakPassword');
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return t('errBadCredentials');
    if (code.includes('too-many-requests')) return t('errTooManyRequests');
    if (code.includes('network-request-failed')) return t('errNetwork');
    return e?.message || t('errAuthGeneric');
  };

  // Mirrors the web app's resetPassword: requires an email, then sends the
  // Firebase reset link (works from any domain — no OAuth involved).
  const handleForgotPassword = async () => {
    if (resetting) return;
    setError('');
    setResetSent('');
    if (!email.trim()) {
      setError(t('resetNeedEmail'));
      return;
    }
    setResetting(true);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, email.trim());
        setResetSent(t('resetEmailSent'));
      }
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password || (!isLogin && !name.trim())) {
      setError(t('fillAllFields'));
      return;
    }

    if (!isLogin) {
      // Phone is optional — validate format only when provided.
      const digits = phone.replace(/\D/g, '');
      if (digits.length > 0 && (digits.length < 8 || digits.length > 15)) {
        setError(t('phoneInvalid'));
        return;
      }
    }

    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        if (auth) {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          leaveAuth();
        }
      } else {
        if (auth && db) {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          try {
            await setDoc(doc(db, 'users', cred.user.uid), {
              email: cred.user.email,
              displayName: name.trim(),
              phone: phone.trim(),
              // Role flags (isHost, isAdmin) are omitted — Firestore rules block
              // client-side role writes. Absent flags are treated as false.
              createdAt: serverTimestamp()
            });
          } catch {
            // Profile doc write failed; account exists — proceed, profile
            // completes on next sign-in via AuthContext.
          }
          leaveAuth();
        }
      }
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!auth || !db) return;
    setGoogleLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      // Mirror the web app: create the profile doc on first Google sign-in (idempotent).
      try {
        const ref = doc(db, 'users', result.user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: result.user.email || '',
            displayName: result.user.displayName || 'User',
            // Role flags omitted — Firestore rules block client-side role writes.
            ...(result.user.photoURL ? { photoURL: result.user.photoURL } : {}),
            createdAt: serverTimestamp()
          });
        }
      } catch {
        // Signed in fine; profile completes on a later sign-in.
      }
      leaveAuth();
    } catch (e: any) {
      const code: string = e?.code || '';
      if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        // User dismissed the popup — not an error.
      } else if (code.includes('unauthorized-domain')) {
        setError(t('errGoogleDomain'));
      } else if (code.includes('popup-blocked')) {
        setError(t('errPopupBlocked'));
      } else if (code.includes('account-exists-with-different-credential')) {
        setError(t('errAccountExistsDiff'));
      } else {
        setError(friendlyError(e));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }, isRTL && styles.rtlRow]}>
        <TouchableOpacity onPress={leaveAuth} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandMoment}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="bonfire" size={48} color={colors.primary} />
          </View>
          <AppText variant="h1" align="center" style={{ marginTop: 24, marginBottom: 8 }}>
            {isLogin ? t('signIn') : t('createAccount')}
          </AppText>
          <AppText variant="body" color={colors.mutedForeground} align="center">
            {isLogin ? t('welcomeBack') : t('joinCommunity')}
          </AppText>
        </View>
        
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '15' }]}>
            <AppText variant="labelSm" color={colors.destructive}>{error}</AppText>
          </View>
        ) : null}

        {resetSent ? (
          <View style={[styles.errorBox, { backgroundColor: '#10B98115' }]}>
            <AppText variant="labelSm" color="#10B981">{resetSent}</AppText>
          </View>
        ) : null}

        <View style={styles.form}>
          {!isLogin && (
            <FloatingLabelInput 
              label={t('fullName')}
              value={name}
              onChangeText={setName}
            />
          )}

          {!isLogin && (
            <FloatingLabelInput 
              label={t('phoneNumber')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          )}
          
          <FloatingLabelInput 
            label={t('email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          
          <FloatingLabelInput 
            label={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {isLogin ? (
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={resetting}
              style={[styles.forgotBtn, isRTL ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }, resetting ? { opacity: 0.6 } : null]}
            >
              <AppText variant="labelSm" color={colors.primary} weight="semibold">{t('forgotPassword')}</AppText>
            </TouchableOpacity>
          ) : null}
          
          <PressableScale 
            onPress={handleSubmit} 
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          >
            {loading ? <CampfireLoader size="sm" /> : <AppText variant="label" color={colors.primaryForeground} weight="bold">{isLogin ? t('signIn') : t('createAccount')}</AppText>}
          </PressableScale>
          
          {Platform.OS === 'web' ? (
            <>
              <View style={[styles.dividerRow, isRTL && styles.rtlRow]}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 12 }}>
                  {t('orDivider')}
                </AppText>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              <PressableScale
                onPress={handleGoogle}
                disabled={googleLoading || loading}
                style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.card }, googleLoading && { opacity: 0.7 }]}
              >
                {googleLoading ? (
                  <CampfireLoader size="sm" />
                ) : (
                  <View style={[styles.googleInner, isRTL && styles.rtlRow]}>
                    <Ionicons name="logo-google" size={20} color={colors.foreground} />
                    <AppText variant="label" weight="medium" color={colors.foreground} style={{ marginHorizontal: 10 }}>
                      {t('continueWithGoogle')}
                    </AppText>
                  </View>
                )}
              </PressableScale>
            </>
          ) : null}

          {/* Policy consent — shown only on sign-up */}
          {!isLogin && (
            <View style={styles.consentRow}>
              <AppText variant="labelSm" color={colors.mutedForeground} align="center">
                {t('agreeToTerms')}{' '}
                <AppText
                  variant="labelSm"
                  color={colors.primary}
                  onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/legal/terms`).catch(() => {})}
                >
                  {t('termsOfService')}
                </AppText>
                {' '}{t('agreeAnd')}{' '}
                <AppText
                  variant="labelSm"
                  color={colors.primary}
                  onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/legal/privacy`).catch(() => {})}
                >
                  {t('privacyPolicy')}
                </AppText>
              </AppText>
            </View>
          )}

          <TouchableOpacity style={styles.switchBtn} onPress={() => { setIsLogin(!isLogin); setError(''); setResetSent(''); }}>
            <AppText variant="label" color={colors.primary}>
              {isLogin ? t('noAccount') : t('haveAccount')}
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' },
  rtlRow: { flexDirection: 'row-reverse' },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.05)' },
  content: { padding: 24 },
  brandMoment: { alignItems: 'center', marginBottom: 40 },
  iconWrapper: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  errorBox: { padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
  form: { gap: 16 },
  inputContainer: { height: 60, borderRadius: 16, borderWidth: 1, position: 'relative', justifyContent: 'center' },
  floatingLabel: { position: 'absolute', fontFamily: 'PlusJakartaSans_500Medium' },
  input: { flex: 1, paddingHorizontal: 16, paddingTop: 16, fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium' },
  eyeBtn: { position: 'absolute', height: '100%', justifyContent: 'center', paddingHorizontal: 8 },
  submitBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  switchBtn: { alignItems: 'center', paddingVertical: 16 },
  consentRow: { paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  forgotBtn: { marginTop: -8, paddingVertical: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  googleBtn: { height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  googleInner: { flexDirection: 'row', alignItems: 'center' },
});
