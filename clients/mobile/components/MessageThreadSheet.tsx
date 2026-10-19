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
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useI18nContext as useI18n } from '@/contexts/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { CampfireLoader } from '@/components/CampfireLoader';
import { useAuth } from '@/contexts/AuthContext';
import {
  Booking,
  Thread,
  Message,
  getOrCreateThread,
  subscribeToMessages,
  sendMessage,
  markThreadRead,
  notifyNewMessage,
} from '@/lib/firestore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  booking: Booking | null;
  /** 'guest' for the trips tab, 'host' for the host bookings tab */
  userRole: 'guest' | 'host';
  onClose: () => void;
}

export function MessageThreadSheet({ booking, userRole, onClose }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const { isRTL } = useI18n();
  const { user } = useAuth();

  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [initialising, setInitialising] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);

  const visible = booking !== null;

  // Slide in/out animation
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  }, [visible, slideAnim]);

  // Open / create the thread when sheet becomes visible
  useEffect(() => {
    if (!booking || !user) return;
    let cancelled = false;
    setInitialising(true);
    setText('');
    setMessages([]);
    setThread(null);

    const guestId = userRole === 'guest' ? user.uid : (booking as any).userId || '';
    const hostId = userRole === 'host' ? user.uid : (booking as any).hostId || '';

    getOrCreateThread({
      bookingId: booking.id,
      campId: booking.campId,
      campTitle: booking.campTitle,
      guestId,
      hostId,
    })
      .then((t) => { if (!cancelled) setThread(t); })
      .catch((err) => console.error('MessageThreadSheet: open thread failed', err))
      .finally(() => { if (!cancelled) setInitialising(false); });

    return () => { cancelled = true; };
  }, [booking?.id, user?.uid]);

  // Subscribe to real-time messages once thread is known
  useEffect(() => {
    if (!thread || !booking) return;
    const unsub = subscribeToMessages(
      booking.id,
      (msgs) => {
        setMessages(msgs);
        // Scroll to bottom on new messages
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      },
      (err) => console.error('MessageThreadSheet: messages listener error', err)
    );
    markThreadRead(booking.id, userRole);
    return unsub;
  }, [thread?.id]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !thread || !user || !booking) return;
    setSending(true);
    try {
      const msgId = await sendMessage({
        bookingId: booking.id,
        senderId: user.uid,
        senderRole: userRole,
        text: trimmed,
      });
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      // Best-effort push notification — pass messageId for idempotency
      notifyNewMessage(thread.id, msgId).catch(() => {});
    } catch (err) {
      console.error('MessageThreadSheet: send failed', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) return t('messaging.today', 'Today');
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group messages by date for separators
  const grouped: ({ type: 'separator'; date: string } | { type: 'message'; msg: Message })[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = formatDateLabel(msg.createdAt);
    if (d !== lastDate) {
      grouped.push({ type: 'separator', date: d });
      lastDate = d;
    }
    grouped.push({ type: 'message', msg });
  }

  if (!booking) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Grabber */}
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }, isRTL && styles.rtlRow]}>
            <View style={[styles.headerInfo, isRTL && { alignItems: 'flex-end' }]}>
              <AppText variant="h3" weight="bold" numberOfLines={1}>{booking.campTitle}</AppText>
              <AppText variant="labelSm" color={colors.mutedForeground}>
                {userRole === 'guest'
                  ? t('messaging.withHost', 'Conversation with host')
                  : t('messaging.withGuest', 'Conversation with guest')}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={close}
              style={[styles.closeBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Message list */}
          <View style={styles.listContainer}>
            {initialising ? (
              <View style={styles.centeredState}>
                <CampfireLoader size="md" />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.centeredState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
                </View>
                <AppText variant="label" weight="semibold" style={styles.emptyTitle}>
                  {t('messaging.emptyTitle', 'No messages yet')}
                </AppText>
                <AppText variant="labelSm" color={colors.mutedForeground} style={[styles.emptyDesc, isRTL && { textAlign: 'right' }]}>
                  {userRole === 'guest'
                    ? t('messaging.emptyDescGuest', 'Ask the host about arrival details or anything you need.')
                    : t('messaging.emptyDescHost', 'Send a welcome message or answer your guest\'s questions.')}
                </AppText>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={grouped as any[]}
                keyExtractor={(item, i) =>
                  item.type === 'separator' ? `sep-${item.date}-${i}` : item.msg.id
                }
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item }) => {
                  if (item.type === 'separator') {
                    return (
                      <View style={styles.separator}>
                        <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
                        <AppText variant="labelSm" color={colors.mutedForeground} style={styles.separatorText}>
                          {item.date}
                        </AppText>
                        <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
                      </View>
                    );
                  }
                  const msg = item.msg as Message;
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                      <View
                        style={[
                          styles.bubble,
                          isMe
                            ? { backgroundColor: colors.primary }
                            : { backgroundColor: colors.muted },
                        ]}
                      >
                        <AppText
                          variant="bodySm"
                          color={isMe ? colors.primaryForeground : colors.foreground}
                          style={[styles.bubbleText, isRTL && { textAlign: 'right' }]}
                        >
                          {msg.text}
                        </AppText>
                        <AppText
                          variant="labelSm"
                          color={isMe ? colors.primaryForeground + 'aa' : colors.mutedForeground}
                          style={styles.bubbleTime}
                        >
                          {formatTime(msg.createdAt)}
                        </AppText>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>

          {/* Input bar */}
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t('messaging.inputPlaceholder', 'Type a message…')}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              multiline
              maxLength={2000}
              editable={!!thread && !sending}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: text.trim() ? colors.primary : colors.muted },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || !thread || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <CampfireLoader size="sm" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
                />
              )}
            </TouchableOpacity>
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
    width: '100%',
    height: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rtlRow: { flexDirection: 'row-reverse' },
  headerInfo: { flex: 1, marginRight: 12 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: { flex: 1 },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { textAlign: 'center', marginBottom: 8 },
  emptyDesc: { textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  messagesList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  separatorLine: { flex: 1, height: 1 },
  separatorText: { marginHorizontal: 8 },
  msgRow: { marginBottom: 8, maxWidth: '78%' },
  msgRowMe: { alignSelf: 'flex-end' },
  msgRowThem: { alignSelf: 'flex-start' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleText: { lineHeight: 20 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    maxHeight: 100,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
