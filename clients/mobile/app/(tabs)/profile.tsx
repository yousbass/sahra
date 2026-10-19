import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Modal, ActivityIndicator, Linking, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { getBookingsByUser, updateUserProfile } from '@/lib/firestore';
import { notify } from '@/lib/payments';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import { PatternSadu } from '@/components/BackgroundPatterns';
import Constants from 'expo-constants';
import { uploadProfilePhoto } from '@/lib/profilePhoto';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

const nightTexture = require('../../assets/images/texture-night.jpg');

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useScreenInsets();
  const { isRTL, toggleLanguage } = useI18n();
  const { user, userData, refreshUserData } = useAuth();
  const { favorites } = useFavorites();
  
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [policiesVisible, setPoliciesVisible] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editError, setEditError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);

  const [pwdVisible, setPwdVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const openPasswordSheet = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPwdError('');
    setPwdVisible(true);
  };

  const changePassword = async () => {
    const current = auth?.currentUser;
    if (!current || !current.email) return;
    if (!currentPassword) {
      setPwdError(t('errEnterCurrentPassword'));
      return;
    }
    if (!newPassword) {
      setPwdError(t('errEnterNewPassword'));
      return;
    }
    if (newPassword.length < 6) {
      setPwdError(t('errPasswordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(t('errPasswordMismatch'));
      return;
    }
    if (currentPassword === newPassword) {
      setPwdError(t('errSamePassword'));
      return;
    }
    setPwdError('');
    setChangingPassword(true);
    try {
      // Mirror the web flow: reauthenticate with the current password,
      // then update the password on the freshly reauthenticated user.
      const credential = EmailAuthProvider.credential(current.email, currentPassword);
      await reauthenticateWithCredential(current, credential);
      await updatePassword(current, newPassword);
      setPwdVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify(t('pwdChanged'), undefined, 'success');
    } catch (e: any) {
      console.error('Password change error:', e);
      const code = e?.code as string | undefined;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        setPwdError(t('errWrongPassword'));
      } else if (code === 'auth/weak-password') {
        setPwdError(t('errWeakPassword'));
      } else if (code === 'auth/requires-recent-login') {
        setPwdError(t('errRecentLogin'));
      } else if (code === 'auth/network-request-failed') {
        setPwdError(t('errNetwork'));
      } else if (code === 'auth/too-many-requests') {
        setPwdError(t('errWrongPassword'));
      } else {
        setPwdError(t('pwdChangeFailed'));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const openEdit = () => {
    setEditedName(userData?.displayName || '');
    setEditedPhone(userData?.phone || '');
    setPickedPhotoUri(null);
    setEditError('');
    setEditVisible(true);
  };

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setEditError(t('photoPermissionDenied'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPickedPhotoUri(result.assets[0].uri);
        setEditError('');
      }
    } catch (e) {
      console.error('Error picking photo:', e);
      setEditError(t('photoUploadFailed'));
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    const name = editedName.trim();
    const phone = editedPhone.trim();
    if (!name) {
      setEditError(t('errNameRequired'));
      return;
    }
    if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
      setEditError(t('errInvalidPhone'));
      return;
    }
    setEditError('');
    setSavingProfile(true);
    try {
      // Same field names as the web app's profile update (displayName, phone,
      // photoURL), written only to the signed-in user's own users/{uid} doc.
      const updates: { displayName: string; phone: string; photoURL?: string } = { displayName: name, phone };
      if (pickedPhotoUri) {
        try {
          updates.photoURL = await uploadProfilePhoto(pickedPhotoUri, user.uid);
        } catch (e: any) {
          console.error('Error uploading photo:', e);
          setEditError(e?.message === 'image-too-large' ? t('photoTooLarge') : t('photoUploadFailed'));
          setSavingProfile(false);
          return;
        }
      }
      await updateUserProfile(user.uid, updates);
      await refreshUserData();
      setEditVisible(false);
      notify(t('profileUpdated'), undefined, 'success');
    } catch (e) {
      console.error('Error updating profile:', e);
      setEditError(t('profileUpdateFailed'));
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setBookingsCount(0);
      setLoadingStats(false);
      return;
    }
    let alive = true;
    setLoadingStats(true);
    getBookingsByUser(user.uid)
      .then(b => { if (alive) setBookingsCount(b.length); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingStats(false); });
    return () => { alive = false; };
  }, [user]);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    // Shared-device hygiene (Audit v4 H-9): clear per-account local state so
    // the next signed-in user doesn't inherit favorites. Language stays — it
    // is a device preference.
    try {
      await AsyncStorage.removeItem('@mukhymat_favorites');
    } catch {
      // Best-effort cleanup.
    }
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const renderItem = (icon: any, title: string, value: string, onPress: () => void, isDestructive = false, isExternal = false) => (
    <PressableScale
      style={[styles.menuItem, { borderBottomColor: colors.border }, isRTL && styles.rtlRow]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: isDestructive ? colors.destructive + '15' : colors.primary + '10' }]}>
        <Ionicons name={icon} size={20} color={isDestructive ? colors.destructive : colors.primary} />
      </View>
      <View style={[{ flex: 1 }, isRTL ? { paddingRight: 16 } : { paddingLeft: 16 }]}>
        <AppText variant="body" color={isDestructive ? colors.destructive : colors.foreground} style={[isRTL && { textAlign: 'right' }]}>
          {title}
        </AppText>
      </View>
      {value ? (
        <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginHorizontal: 8 }}>
          {value}
        </AppText>
      ) : null}
      <Ionicons name={isExternal ? "open-outline" : (isRTL ? "chevron-back" : "chevron-forward")} size={16} color={colors.mutedForeground} />
    </PressableScale>
  );

  const renderSheet = (title: string, visible: boolean, setVisible: (v: boolean) => void, children: React.ReactNode) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} activeOpacity={1} />
        <View style={[styles.bottomSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }, isRTL && styles.rtlRow]}>
            <AppText variant="h3" weight="bold">{title}</AppText>
            <TouchableOpacity onPress={() => setVisible(false)} style={[styles.sheetCloseBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        
        {user ? (
          <View style={styles.heroAuth}>
            <ImageBackground source={nightTexture} imageStyle={{ opacity: 0.9 }}>
              <LinearGradient colors={['rgba(10,17,40,0.7)', 'rgba(10,17,40,1)']} style={{ paddingTop: insets.top + 20, paddingBottom: 40 }}>
              <PatternSadu color="#FDFBF7" opacity={0.08} />
            <View style={{ paddingHorizontal: 24 }}>
              <View style={[styles.authProfileRow, isRTL && styles.rtlRow]}>
                <View style={[styles.avatarLg, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
                  {userData?.photoURL ? (
                    <Image source={{ uri: userData.photoURL }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <AppText variant="h1" color="#FFF" style={{ fontSize: 32 }}>
                      {userData?.displayName ? userData.displayName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
                    </AppText>
                  )}
                </View>
                <View style={[styles.authProfileInfo, isRTL ? { alignItems: 'flex-end', paddingRight: 16 } : { alignItems: 'flex-start', paddingLeft: 16 }]}>
                  <AppText variant="h2" color="#FFF" weight="bold">{userData?.displayName || t('profile')}</AppText>
                  <AppText variant="body" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }}>{user.email}</AppText>
                  
                  {userData?.createdAt ? (
                    <View style={[styles.memberSinceChip, { backgroundColor: 'rgba(240, 160, 60, 0.2)' }]}>
                      <AppText variant="labelSm" color={colors.primary}>{t('profileMemberSince')} {new Date(userData.createdAt?.seconds * 1000 || userData.createdAt).getFullYear()}</AppText>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={[styles.statsGrid, isRTL && styles.rtlRow]}>
                <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Ionicons name="calendar" size={24} color={colors.primary} style={{ marginBottom: 12 }} />
                  {loadingStats ? <ActivityIndicator color={colors.primary} /> : <AppText variant="h2" color="#FFF" weight="bold">{bookingsCount}</AppText>}
                  <AppText variant="labelSm" color="rgba(255,255,255,0.6)" style={{ marginTop: 4 }}>{t('profileStatsBookings')}</AppText>
                </View>
                <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                  <Ionicons name="heart" size={24} color={colors.destructive} style={{ marginBottom: 12 }} />
                  <AppText variant="h2" color="#FFF" weight="bold">{favorites.length}</AppText>
                  <AppText variant="labelSm" color="rgba(255,255,255,0.6)" style={{ marginTop: 4 }}>{t('profileStatsFavorites')}</AppText>
                </View>
              </View>
            </View>
              </LinearGradient>
            </ImageBackground>
          </View>
        ) : (
          <View style={styles.heroGuest}>
            <ImageBackground source={nightTexture} imageStyle={{ opacity: 0.9 }}>
              <LinearGradient colors={['rgba(10,17,40,0.6)', colors.background]} style={{ paddingTop: insets.top + 40, paddingBottom: 40 }}>
              <PatternSadu color="#FDFBF7" opacity={0.08} />
            <View style={styles.guestContent}>
              <View style={[styles.guestIconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person" size={40} color={colors.primary} />
              </View>
              <AppText variant="h1" color={colors.foreground} align="center" style={{ marginTop: 24, marginBottom: 8 }}>
                {t('welcomeBack')}
              </AppText>
              <AppText variant="body" color={colors.mutedForeground} align="center" style={{ paddingHorizontal: 40, marginBottom: 32 }}>
                {t('joinCommunity')}
              </AppText>
              <PressableScale 
                onPress={() => router.push('/auth')} 
                style={[styles.authBtn, { backgroundColor: colors.primary }]}
              >
                <AppText variant="label" color={colors.primaryForeground} weight="bold">{t('signIn')}</AppText>
              </PressableScale>
            </View>
              </LinearGradient>
            </ImageBackground>
          </View>
        )}

        {user && userData?.isHost ? (
          <View style={[styles.section, { marginBottom: 32 }]}>
            <PressableScale onPress={() => router.push('/host')} style={[styles.becomeHostCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary, borderWidth: 1 }]}>
              <View style={[styles.hostCardContent, isRTL && styles.rtlRow]}>
                <View style={[styles.hostIconCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="briefcase" size={24} color={colors.primaryForeground} />
                </View>
                <View style={[{ flex: 1 }, isRTL ? { paddingRight: 16 } : { paddingLeft: 16 }]}>
                  <AppText variant="h3" color={colors.foreground} weight="bold" style={isRTL && { textAlign: 'right' }}>{t('hostToolsCard')}</AppText>
                  <AppText variant="bodySm" color={colors.mutedForeground} style={[isRTL && { textAlign: 'right' }, { marginTop: 4, lineHeight: 20 }]}>
                    {t('hostToolsCardDesc')}
                  </AppText>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={colors.primary} />
              </View>
            </PressableScale>
          </View>
        ) : user && !userData?.isHost ? (
          <View style={[styles.section, { marginBottom: 32 }]}>
            <PressableScale onPress={() => router.push('/become-host')} style={[styles.becomeHostCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary, borderWidth: 1 }]}>
              <View style={[styles.hostCardContent, isRTL && styles.rtlRow]}>
                <View style={[styles.hostIconCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="home" size={24} color="#FFF" />
                </View>
                <View style={[{ flex: 1 }, isRTL ? { paddingRight: 16 } : { paddingLeft: 16 }]}>
                  <AppText variant="h3" color={colors.foreground} weight="bold" style={isRTL && { textAlign: 'right' }}>{t('becomeHost')}</AppText>
                  <AppText variant="bodySm" color={colors.mutedForeground} style={[isRTL && { textAlign: 'right' }, { marginTop: 4, lineHeight: 20 }]}>
                    {t('becomeHostCardDesc')}
                  </AppText>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={colors.primary} />
              </View>
            </PressableScale>
          </View>
        ) : null}

        {user && userData?.isAdmin ? (
          <View style={[styles.section, { marginBottom: 32 }]}>
            <PressableScale onPress={() => router.push('/admin')} style={[styles.becomeHostCard, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive, borderWidth: 1 }]}>
              <View style={[styles.hostCardContent, isRTL && styles.rtlRow]}>
                <View style={[styles.hostIconCircle, { backgroundColor: colors.destructive }]}>
                  <Ionicons name="shield-checkmark" size={24} color="#FFF" />
                </View>
                <View style={[{ flex: 1 }, isRTL ? { paddingRight: 16 } : { paddingLeft: 16 }]}>
                  <AppText variant="h3" color={colors.foreground} weight="bold" style={isRTL && { textAlign: 'right' }}>{t('adminToolsCard', { defaultValue: 'Admin tools' })}</AppText>
                  <AppText variant="bodySm" color={colors.mutedForeground} style={[isRTL && { textAlign: 'right' }, { marginTop: 4, lineHeight: 20 }]}>
                    {t('adminToolsCardDesc', { defaultValue: 'Manage users, listings, bookings, applications, and platform settings.' })}
                  </AppText>
                </View>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={colors.destructive} />
              </View>
            </PressableScale>
          </View>
        ) : null}

        <View style={styles.section}>
          <AppText variant="label" color={colors.mutedForeground} style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
            {t('settings')}
          </AppText>
          <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {user ? renderItem('person-outline', t('editProfile'), '', openEdit) : null}
            {user ? renderItem('lock-closed-outline', t('changePassword'), '', openPasswordSheet) : null}
            {renderItem('language-outline', t('language'), i18n.language === 'ar' ? 'العربية' : 'English', toggleLanguage)}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label" color={colors.mutedForeground} style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
            {t('about')}
          </AppText>
          <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {renderItem('help-circle-outline', t('helpSupport'), '', () => {
              const wa = 'https://wa.me/97317000000?text=Hi%2C%20I%20need%20help%20with%20MUKHYMAT';
              Linking.openURL(wa).catch(() => Linking.openURL('mailto:support@mukhymat.com'));
            }, false, true)}
            {renderItem('information-circle-outline', t('aboutMukhymat'), '', () => setAboutVisible(true))}
            {renderItem('document-text-outline', t('policies'), '', () => setPoliciesVisible(true))}
          </View>
        </View>

        {user && (
          <View style={styles.section}>
            <View style={[styles.menuSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {renderItem('log-out-outline', t('signOut'), '', handleSignOut, true)}
            </View>
          </View>
        )}
        
        <View style={styles.footer}>
          <AppText variant="labelSm" color={colors.mutedForeground} align="center">
            MUKHYMAT {t('profileVersion')} {appVersion}
          </AppText>
        </View>
      </ScrollView>

      {renderSheet(t('aboutMukhymat'), aboutVisible, setAboutVisible, (
        <View style={styles.sheetBody}>
          <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="bonfire" size={48} color={colors.primary} />
          </View>
          <AppText variant="h2" align="center" style={{ marginBottom: 16 }}>MUKHYMAT</AppText>
          <AppText variant="body" color={colors.mutedForeground} align="center" style={{ lineHeight: 24, marginBottom: 32 }}>
            {t('profileAboutDesc')}
          </AppText>
          <PressableScale
            style={[styles.contactBtn, { backgroundColor: colors.muted }]}
            onPress={() => { Linking.openURL('mailto:support@mukhymat.com').catch(() => {}); }}
          >
            <Ionicons name="mail" size={20} color={colors.foreground} />
            <AppText variant="label" style={{ marginHorizontal: 12 }}>{t('profileSupport')}</AppText>
          </PressableScale>
          <AppText variant="labelSm" color={colors.mutedForeground} align="center" style={{ marginTop: 12 }}>
            support@mukhymat.com
          </AppText>
        </View>
      ))}

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setEditVisible(false)} activeOpacity={1} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }, isRTL && styles.rtlRow]}>
              <AppText variant="h3" weight="bold">{t('editProfile')}</AppText>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={[styles.sheetCloseBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetBody}>
                <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.fieldLabel, { marginTop: 0 }, isRTL && { textAlign: 'right' }]}>
                  {t('profilePhoto')}
                </AppText>
                <View style={[styles.photoRow, isRTL && styles.rtlRow]}>
                  <TouchableOpacity onPress={savingProfile ? undefined : pickPhoto} style={[styles.avatarEdit, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
                    {pickedPhotoUri || userData?.photoURL ? (
                      <Image source={{ uri: pickedPhotoUri || userData?.photoURL }} style={styles.avatarImg} contentFit="cover" />
                    ) : (
                      <Ionicons name="person" size={28} color="#FFF" />
                    )}
                  </TouchableOpacity>
                  <PressableScale
                    onPress={savingProfile ? () => {} : pickPhoto}
                    style={[styles.photoBtn, { backgroundColor: colors.muted }, isRTL ? { marginRight: 16 } : { marginLeft: 16 }]}
                  >
                    <Ionicons name="image-outline" size={18} color={colors.foreground} />
                    <AppText variant="labelSm" color={colors.foreground} style={{ marginHorizontal: 8 }}>
                      {pickedPhotoUri || userData?.photoURL ? t('changePhoto') : t('addPhoto')}
                    </AppText>
                  </PressableScale>
                </View>
                <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>
                  {t('fullName')}
                </AppText>
                <TextInput
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder={t('fullNamePlaceholder')}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                    isRTL && { textAlign: 'right' },
                  ]}
                />
                <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>
                  {t('phoneNumber')}
                </AppText>
                <TextInput
                  value={editedPhone}
                  onChangeText={setEditedPhone}
                  placeholder={t('phonePlaceholder')}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                    isRTL && { textAlign: 'right' },
                  ]}
                />
                {editError ? (
                  <AppText variant="bodySm" color={colors.destructive} style={[{ marginTop: 4 }, isRTL && { textAlign: 'right' }]}>
                    {editError}
                  </AppText>
                ) : null}
                <PressableScale
                  onPress={savingProfile ? () => {} : saveProfile}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: savingProfile ? 0.7 : 1 }]}
                >
                  {savingProfile ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <AppText variant="label" color={colors.primaryForeground} weight="bold">{t('save')}</AppText>
                  )}
                </PressableScale>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={pwdVisible} transparent animationType="slide" onRequestClose={() => setPwdVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setPwdVisible(false)} activeOpacity={1} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }, isRTL && styles.rtlRow]}>
              <AppText variant="h3" weight="bold">{t('changePassword')}</AppText>
              <TouchableOpacity onPress={() => setPwdVisible(false)} style={[styles.sheetCloseBtn, { backgroundColor: colors.muted }]}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.sheetBody}>
                {([
                  { label: 'currentPassword', placeholder: 'currentPasswordPlaceholder', value: currentPassword, setValue: setCurrentPassword, show: showCurrent, setShow: setShowCurrent },
                  { label: 'newPassword', placeholder: 'newPasswordPlaceholder', value: newPassword, setValue: setNewPassword, show: showNew, setShow: setShowNew },
                  { label: 'confirmNewPassword', placeholder: 'confirmNewPasswordPlaceholder', value: confirmPassword, setValue: setConfirmPassword, show: showConfirm, setShow: setShowConfirm },
                ] as const).map((f) => (
                  <View key={f.label}>
                    <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.fieldLabel, isRTL && { textAlign: 'right' }]}>
                      {t(f.label)}
                    </AppText>
                    <View style={[styles.pwdInputWrap, { backgroundColor: colors.card, borderColor: colors.border }, isRTL && styles.rtlRow]}>
                      <TextInput
                        value={f.value}
                        onChangeText={f.setValue}
                        placeholder={t(f.placeholder)}
                        placeholderTextColor={colors.mutedForeground}
                        secureTextEntry={!f.show}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.pwdInput, { color: colors.foreground }, isRTL && { textAlign: 'right' }]}
                      />
                      <TouchableOpacity onPress={() => f.setShow(!f.show)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name={f.show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {pwdError ? (
                  <AppText variant="bodySm" color={colors.destructive} style={[{ marginTop: 8 }, isRTL && { textAlign: 'right' }]}>
                    {pwdError}
                  </AppText>
                ) : null}
                <PressableScale
                  onPress={changingPassword ? () => {} : changePassword}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: changingPassword ? 0.7 : 1 }]}
                >
                  {changingPassword ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <AppText variant="label" color={colors.primaryForeground} weight="bold">{t('save')}</AppText>
                  )}
                </PressableScale>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {renderSheet(t('policies'), policiesVisible, setPoliciesVisible, (
        <View style={styles.sheetBody}>
          {/* Privacy Policy link */}
          <PressableScale
            style={[styles.policyLinkBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/legal/privacy`).catch(() => {})}
          >
            <View style={[styles.policyLinkIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="bold">{t('privacyPolicy')}</AppText>
              <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 2 }}>
                {t('viewPrivacyPolicy')}
              </AppText>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
          </PressableScale>

          {/* Terms of Service link */}
          <PressableScale
            style={[styles.policyLinkBtn, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}
            onPress={() => Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/legal/terms`).catch(() => {})}
          >
            <View style={[styles.policyLinkIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="bold">{t('termsOfService')}</AppText>
              <AppText variant="labelSm" color={colors.mutedForeground} style={{ marginTop: 2 }}>
                {t('viewTermsOfService')}
              </AppText>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.mutedForeground} />
          </PressableScale>

          {/* Refund policy summary */}
          <AppText variant="label" weight="bold" style={{ marginTop: 28, marginBottom: 10 }}>{t('refundPolicyTitle')}</AppText>
          <AppText variant="body" color={colors.mutedForeground} style={{ lineHeight: 24 }}>
            {t('refundPolicyDefault')}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroAuth: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', marginBottom: 24 },
  authProfileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarLg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  avatarEdit: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  photoRow: { flexDirection: 'row', alignItems: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  authProfileInfo: { flex: 1 },
  memberSinceChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8, alignSelf: 'flex-start' },
  statsGrid: { flexDirection: 'row', marginTop: 32, gap: 16 },
  statCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1 },
  
  // The night texture + gradient are NESTED containers (not absolute-fill):
  // on web, absolute-fill layers inside an auto-height hero escape and tint
  // the entire page. Nested containers size to content and cannot escape.
  heroGuest: { overflow: 'hidden', marginBottom: 24 },
  guestContent: { alignItems: 'center', paddingHorizontal: 24 },
  guestIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  authBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  
  hostBadge: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  becomeHostCard: { borderRadius: 20, overflow: 'hidden' },
  hostCardContent: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  hostIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { marginBottom: 12, marginLeft: 8 },
  menuSection: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rtlRow: { flexDirection: 'row-reverse' },
  
  footer: { padding: 40 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1 },
  sheetCloseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetContent: { padding: 24 },
  sheetBody: { paddingBottom: 40 },
  logoPlaceholder: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  policyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  policyLinkIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  pwdInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  pwdInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  saveBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
});
