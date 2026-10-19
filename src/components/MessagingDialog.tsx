import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Thread,
  Message,
  getOrCreateThread,
  subscribeToMessages,
  sendMessage,
  markThreadRead,
} from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  campId: string;
  campTitle: string;
  guestId: string;
  hostId: string;
  /** uid of the currently signed-in user */
  currentUserId: string;
  currentUserRole: 'guest' | 'host';
}

export function MessagingDialog({
  open,
  onClose,
  bookingId,
  campId,
  campTitle,
  guestId,
  hostId,
  currentUserId,
  currentUserRole,
}: Props) {
  const { t } = useTranslation();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [initialising, setInitialising] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Open / create thread when dialog is shown
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setInitialising(true);
    getOrCreateThread({ bookingId, campId, campTitle, guestId, hostId })
      .then((t) => { if (!cancelled) setThread(t); })
      .catch(() => toast.error(t('messaging.errorOpen', 'Could not open conversation')))
      .finally(() => { if (!cancelled) setInitialising(false); });
    return () => { cancelled = true; };
  }, [open, bookingId]);

  // Subscribe to real-time messages once thread is known
  useEffect(() => {
    if (!thread) return;
    const unsub = subscribeToMessages(
      bookingId,
      (msgs) => setMessages(msgs),
      () => {}
    );
    // Mark as read when we open the thread
    markThreadRead(bookingId, currentUserRole);
    return unsub;
  }, [thread?.id]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Re-focus input after send
  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !thread) return;
    setSending(true);
    try {
      const msgId = await sendMessage({ bookingId, senderId: currentUserId, senderRole: currentUserRole, text: trimmed });
      setText('');
      // Best-effort push notification via API — pass messageId for idempotency
      try {
        const idToken = await auth?.currentUser?.getIdToken();
        if (idToken) {
          fetch('/api/notifications/new-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ threadId: thread.id, messageId: msgId }),
          }).catch(() => {});
        }
      } catch { /* best-effort */ }
    } catch {
      toast.error(t('messaging.sendError', 'Could not send message'));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) return t('messaging.today', 'Today');
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-full p-0 flex flex-col h-[75vh] max-h-[600px] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/80 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight truncate">
                  {campTitle}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentUserRole === 'guest'
                    ? t('messaging.withHost', 'Conversation with host')
                    : t('messaging.withGuest', 'Conversation with guest')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* Message list */}
        <div className="flex-1 overflow-hidden">
          {initialising ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground animate-pulse">
                {t('messaging.loading', 'Loading conversation…')}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t('messaging.emptyTitle', 'No messages yet')}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {currentUserRole === 'guest'
                  ? t('messaging.emptyDescGuest', 'Ask the host about arrival details, camp location, or anything you need to know.')
                  : t('messaging.emptyDescHost', 'Send a welcome message or answer any questions your guest may have.')}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full px-4 py-3">
              <div ref={scrollRef as any} className="space-y-1">
                {grouped.map(({ date, msgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-xs text-muted-foreground px-2">{date}</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                    {msgs.map((msg) => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border/80 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('messaging.inputPlaceholder', 'Type a message…')}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-28 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              disabled={!thread || sending}
              maxLength={2000}
            />
            <Button
              onClick={handleSend}
              disabled={!text.trim() || !thread || sending}
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {t('messaging.enterToSend', 'Enter to send · Shift+Enter for new line')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
