import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { CampfireLoader } from '@/components/CampfireLoader';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { startTapPayment, notify } from '@/lib/payments';

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_MS = 30_000;

export default function PaymentResultScreen() {
  const { bookingId, tap_id, error } = useLocalSearchParams();
  const { t } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  
  const [verifying, setVerifying] = useState(true);
  const [polling, setPolling] = useState(false);
  const [success, setSuccess] = useState(false);
  // pollTimedOut: charge was captured by Tap but webhook hasn't settled yet
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [campName, setCampName] = useState<string | null>(null);
  const [checkInDate, setCheckInDate] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const { user, userData } = useAuth();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollElapsed = useRef(0);

  const handleRetry = async () => {
    if (retrying || !bookingId || !db) return;
    setRetrying(true);
    try {
      const snap = await getDoc(doc(db, 'bookings', bookingId as string));
      if (!snap.exists()) {
        notify(t('errAuthGeneric'), undefined, 'error');
        return;
      }
      const b = snap.data() as Record<string, any>;
      // Stale-state guards: never restart payment for a settled booking.
      if (['paid', 'refunded', 'pending_verification'].includes(String(b.paymentStatus)) || String(b.status) === 'confirmed') {
        setSuccess(true);
        return;
      }
      if (String(b.status) === 'cancelled') {
        notify(t('bookingCancelled'), undefined, 'success');
        router.replace('/(tabs)/bookings');
        return;
      }
      const r = await startTapPayment({
        bookingId: String(bookingId),
        amount: Number(b.totalPrice) || 0,
        customerName: userData?.displayName || user?.email || 'Guest',
        customerEmail: user?.email || undefined,
      });
      if (!r.started) {
        if (r.reason === 'already_settled') {
          // Tap charge is CAPTURED, but re-read the booking to confirm the
          // webhook has actually settled it — amount/currency guard may have
          // rejected settlement even though the charge exists.
          const freshSnap = await getDoc(doc(db, 'bookings', bookingId as string));
          const fresh = freshSnap.exists() ? freshSnap.data() as Record<string, any> : null;
          if (fresh && (fresh.paymentStatus === 'paid' || fresh.status === 'confirmed')) {
            setSuccess(true);
          } else {
            notify(
              t('paymentConfirming') || 'Payment confirming…',
              t('paymentConfirmingMsg') || 'Your payment was received. Please wait while we confirm your booking.',
              'info',
            );
          }
        } else if (r.reason === 'expired') {
          // Booking window passed — the slot was released, guest must re-book.
          notify(
            t('bookingExpired') || 'Booking expired',
            t('bookingExpiredMsg') || 'Your 30-minute payment window has passed. Please book again.',
            'error',
          );
          router.replace('/(tabs)/bookings');
        } else {
          notify(t('paymentFailed'), r.error || t('couldNotStartPayment'), 'error');
        }
      }
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      // Tap returned an explicit error — no charge was made, show failure.
      if (error) {
        setSuccess(false);
        setVerifying(false);
        return;
      }

      // No tap_id means Tap never redirected back with a charge reference —
      // treat as failure (no charge could have been made).
      if (!tap_id || !bookingId || !db) {
        setSuccess(false);
        setVerifying(false);
        return;
      }

      // Load booking details for display (read-only).
      let bookingData: Record<string, unknown> | null = null;
      try {
        const bookingSnap = await getDoc(doc(db, 'bookings', bookingId as string));
        bookingData = bookingSnap.exists() ? (bookingSnap.data() as Record<string, unknown>) : null;
      } catch {}

      const loadCampDetails = async (data: Record<string, unknown>) => {
        if (data.campId && db) {
          try {
            const campSnap = await getDoc(doc(db, 'camps', data.campId as string));
            if (campSnap.exists()) setCampName((campSnap.data().title as string) || null);
          } catch {}
        }
        setCheckInDate((data.checkIn as string) || null);
        setTotalPrice(data.totalPrice != null ? Number(data.totalPrice) : null);
      };

      // Wait for Firebase auth restoration before polling. After a full
      // browser/deep-link round trip through Tap, the auth singleton may still
      // be restoring the persisted session when this screen mounts. Reading
      // `auth.currentUser` fresh each attempt (instead of the render-time
      // context value) plus this bounded wait prevents a 30s run of 401s.
      const waitForAuthUser = async (timeoutMs: number): Promise<void> => {
        if (!auth || auth.currentUser) return;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            unsub();
            resolve();
          }, timeoutMs);
          const unsub = onAuthStateChanged(auth!, (u) => {
            if (u) {
              clearTimeout(timer);
              unsub();
              resolve();
            }
          });
        });
      };
      await waitForAuthUser(10_000);

      const getAuthHeader = async (): Promise<Record<string, string>> => {
        // Always read the live singleton — the context `user` may be stale null.
        const currentUser = auth?.currentUser;
        if (!currentUser) return {};
        try {
          const token = await currentUser.getIdToken();
          return { Authorization: `Bearer ${token}` };
        } catch {
          return {};
        }
      };

      // Distinguishes the three outcomes the verify endpoint can express:
      //  'settled'  — webhook recorded payment; safe to show success.
      //  'captured' — Tap captured the charge but settlement hasn't landed;
      //               keep polling, and if we time out show "pending", never
      //               plain failure (the guest WAS charged).
      //  'failed'   — Tap reports a terminal non-captured status (DECLINED,
      //               FAILED, CANCELLED, …); stop polling, show failure/retry.
      //  'unknown'  — network error / 401 during auth restore; keep polling.
      type VerifyOutcome = 'settled' | 'captured' | 'failed' | 'unknown';
      const TERMINAL_FAILURE_STATUSES = new Set([
        'DECLINED', 'FAILED', 'CANCELLED', 'VOID', 'REVERSED', 'ABANDONED',
        'RESTRICTED', 'TIMEDOUT', 'UNKNOWN', 'EXPIRED',
      ]);

      const tryVerify = async (): Promise<VerifyOutcome> => {
        try {
          const headers = await getAuthHeader();
          const verifyUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/payments/verify?tap_id=${encodeURIComponent(tap_id as string)}&bookingId=${encodeURIComponent(bookingId as string)}`;
          const res = await fetch(verifyUrl, { headers });
          const data = await res.json();
          if (!res.ok || !data.success) return 'unknown';

          const chargeStatus = String(data.status || '').toUpperCase();
          const settled = !!(
            data.verified &&
            data.bookingId === bookingId &&
            bookingData &&
            Number(data.amount) === Number(bookingData.totalPrice) &&
            String(data.currency || '').toUpperCase() === 'BHD'
          );
          if (settled) return 'settled';
          if (chargeStatus === 'CAPTURED') return 'captured';
          if (TERMINAL_FAILURE_STATUSES.has(chargeStatus)) return 'failed';
          // INITIATED / IN_PROGRESS / AUTHORIZED etc. — not terminal, keep polling.
          return 'unknown';
        } catch {
          // Network error — keep polling
          return 'unknown';
        }
      };

      const finishSuccess = async () => {
        if (bookingData) await loadCampDetails(bookingData);
        setSuccess(true);
      };

      // First attempt immediately
      const first = await tryVerify();
      if (first === 'settled') {
        await finishSuccess();
        setVerifying(false);
        return;
      }
      if (first === 'failed') {
        setSuccess(false);
        setVerifying(false);
        return;
      }

      // 'captured' or 'unknown' — webhook may be in-flight. Poll until settled,
      // terminal failure, or timeout (mirrors web PaymentSuccess behaviour).
      // Show "confirming" spinner while polling — never the failure screen yet.
      let sawCaptured = first === 'captured';
      setVerifying(false);
      setPolling(true);
      pollElapsed.current = POLL_INTERVAL_MS; // first tick already consumed

      pollRef.current = setInterval(async () => {
        const outcome = await tryVerify();
        if (outcome === 'settled') {
          clearInterval(pollRef.current!);
          setPolling(false);
          await finishSuccess();
          return;
        }
        if (outcome === 'failed') {
          clearInterval(pollRef.current!);
          setPolling(false);
          setSuccess(false);
          return;
        }
        if (outcome === 'captured') sawCaptured = true;
        pollElapsed.current += POLL_INTERVAL_MS;
        if (pollElapsed.current >= POLL_MAX_MS) {
          clearInterval(pollRef.current!);
          setPolling(false);
          if (sawCaptured) {
            // Tap DID capture the charge; webhook just hasn't confirmed yet.
            // Show pending — never plain failure (the guest was charged).
            setPollTimedOut(true);
          } else {
            // Never saw a captured charge — do not claim payment was received.
            setSuccess(false);
          }
        }
      }, POLL_INTERVAL_MS);
    };

    run();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tap_id, error, bookingId]);

  if (verifying || polling) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CampfireLoader size="lg" />
        <AppText variant="h3" style={{ marginTop: 24 }}>
          {polling
            ? (t('paymentConfirming') || 'Confirming payment…')
            : t('verifyingPayment')}
        </AppText>
        {polling && (
          <AppText variant="bodySm" color={colors.mutedForeground} align="center" style={{ marginTop: 12, paddingHorizontal: 32 }}>
            {t('paymentConfirmingMsg') || 'Your payment was received. Please wait while we confirm your booking.'}
          </AppText>
        )}
      </View>
    );
  }

  if (pollTimedOut) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="time-outline" size={80} color={colors.primary} />
        </View>
        <AppText variant="h2" align="center" style={styles.title}>
          {t('paymentPendingTitle') || 'Payment Pending'}
        </AppText>
        <AppText variant="body" color={colors.mutedForeground} align="center" style={styles.errorText}>
          {t('paymentPendingMsg') || 'Your payment was received by Tap. Your booking will be confirmed shortly — check My Bookings in a few minutes.'}
        </AppText>
        <View style={styles.actions}>
          <PressableScale
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(tabs)/bookings')}
          >
            <AppText variant="label" color={colors.primaryForeground} weight="bold">
              {t('myBookings')}
            </AppText>
          </PressableScale>
          <PressableScale
            style={[styles.outlineBtn, { borderColor: colors.border }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <AppText variant="label" color={colors.foreground} weight="bold">
              {t('explore')}
            </AppText>
          </PressableScale>
        </View>
      </View>
    );
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(isRTL ? 'ar-BH' : 'en-BH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  if (success) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.successScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#4CAF5020' }]}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        </View>

        <AppText variant="h2" align="center" style={styles.title}>
          {t('paymentSuccess')}
        </AppText>

        <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {bookingId && (
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}>
              <AppText variant="bodySm" color={colors.mutedForeground}>{t('bookingRef')}</AppText>
              <AppText variant="label" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                #{(bookingId as string).slice(-8).toUpperCase()}
              </AppText>
            </View>
          )}

          {campName && (
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}>
              <AppText variant="bodySm" color={colors.mutedForeground}>{t('camp')}</AppText>
              <AppText variant="label" weight="semibold" style={{ flexShrink: 1, textAlign: isRTL ? 'left' : 'right' }}>
                {campName}
              </AppText>
            </View>
          )}

          {checkInDate && (
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}>
              <AppText variant="bodySm" color={colors.mutedForeground}>{t('checkIn')}</AppText>
              <AppText variant="label" weight="semibold" style={{ flexShrink: 1, textAlign: isRTL ? 'left' : 'right' }}>
                {formatDate(checkInDate)}
              </AppText>
            </View>
          )}

          {totalPrice !== null && (
            <View style={[styles.detailRow, isRTL && styles.rtlRow]}>
              <AppText variant="bodySm" color={colors.mutedForeground}>{t('totalPaid')}</AppText>
              <AppText variant="label" weight="bold" color={colors.primary}>
                {totalPrice.toFixed(3)} {t('currency')}
              </AppText>
            </View>
          )}
        </View>

        <View style={[styles.whatsNextCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <View style={styles.whatsNextHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <AppText variant="label" weight="bold" style={{ marginLeft: 8 }}>{t('whatsNext')}</AppText>
          </View>
          <AppText variant="bodySm" color={colors.mutedForeground} style={[{ marginTop: 8 }, isRTL && { textAlign: 'right' }]}>
            {t('whatsNextNote')}
          </AppText>
        </View>

        <View style={styles.actions}>
          <PressableScale
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(tabs)/bookings')}
          >
            <AppText variant="label" color={colors.primaryForeground} weight="bold">
              {t('myBookings')}
            </AppText>
          </PressableScale>

          <PressableScale
            style={[styles.outlineBtn, { borderColor: colors.border }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <AppText variant="label" color={colors.foreground} weight="bold">
              {t('explore')}
            </AppText>
          </PressableScale>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.destructive + '20' }]}>
        <Ionicons name="close-circle" size={80} color={colors.destructive} />
      </View>

      <AppText variant="h2" align="center" style={styles.title}>
        {t('paymentFailed')}
      </AppText>

      <AppText variant="body" color={colors.mutedForeground} align="center" style={styles.errorText}>
        {error === 'cancelled' ? t('paymentCancelledMsg') : t('paymentNotVerifiedMsg')}
      </AppText>

      <View style={styles.actions}>
        <PressableScale
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, retrying && { opacity: 0.7 }]}
          disabled={retrying}
          onPress={handleRetry}
        >
          <AppText variant="label" color={colors.primaryForeground} weight="bold">
            {retrying ? t('startingPayment') : t('retry')}
          </AppText>
        </PressableScale>

        <PressableScale
          style={[styles.outlineBtn, { borderColor: colors.border }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <AppText variant="label" color={colors.foreground} weight="bold">
            {t('explore')}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 48 },
  iconContainer: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { marginBottom: 24 },
  errorText: { marginBottom: 32 },
  detailsCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  whatsNextCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  whatsNextHeader: { flexDirection: 'row', alignItems: 'center' },
  actions: { width: '100%', gap: 12 },
  primaryBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
