import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Only allow same-app relative paths (blocks "//host" protocol-relative URLs)
  const rawReturnTo = searchParams.get('returnTo') || '/profile';
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/profile';
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(returnTo, { replace: true });
    } catch (error) {
      // Error is already handled in useAuth hook
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error(t('auth.enterEmailFirst'));
      return;
    }

    setResetting(true);
    try {
      await resetPassword(email);
    } catch (error) {
      // Error handled in hook
    } finally {
      setResetting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate(returnTo, { replace: true });
    } catch (error) {
      // Error is already handled in useAuth hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <img src={`${import.meta.env.BASE_URL}assets/mukhymat-logo.jpg`} alt="MUKHYMAT" className="h-20 w-20 mx-auto object-cover rounded-full shadow-[0_0_20px_rgba(212,175,55,0.2)] mb-6" />
            <h1 className="text-4xl font-bold text-foreground mb-3 font-sans tracking-wide uppercase">{t('auth.welcomeBack')}</h1>
            <p className="text-muted-foreground font-light">{t('auth.signInSubtitle')}</p>
          </div>

        <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
          <form onSubmit={handleEmailSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold font-sans tracking-widest uppercase text-xs">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/70" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-12 border-border/80 focus:border-primary text-foreground bg-background/50 h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground font-semibold font-sans tracking-widest uppercase text-xs">{t('auth.password')}</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetting || loading}
                  className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50 transition-colors"
                >
                  {resetting ? t('auth.sending') : t('auth.forgot')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/70" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-12 border-border/80 focus:border-primary text-foreground bg-background/50 h-12 rounded-2xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-2xl uppercase tracking-widest font-sans text-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('auth.signingIn')}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  {t('auth.signIn')}
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
              <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-card text-muted-foreground font-light tracking-widest uppercase">{t('auth.orContinue')}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            variant="outline"
            className="w-full h-12 border border-border/80 text-foreground bg-background/50 hover:bg-primary/10 hover:border-primary/50 font-bold tracking-widest font-sans text-sm uppercase rounded-2xl transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {t('auth.google')}
          </Button>

          <div className="mt-8 text-center text-sm text-muted-foreground font-light">
            {t('auth.noAccount')}{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              {t('auth.signUp')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
