import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Lock, Phone, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Phone is optional — validate only when provided.
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length > 0 && (phoneDigits.length < 8 || phoneDigits.length > 15)) {
      toast.error(t('reserve.phoneValidFormat'));
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, name, phone);
      navigate('/profile');
    } catch (error) {
      // Error is already handled in useAuth hook
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/profile');
    } catch (error) {
      // Error is already handled in useAuth hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}assets/mukhymat-logo.jpg`} alt="MUKHYMAT" className="h-20 w-20 mx-auto object-cover rounded-full shadow-[0_0_20px_rgba(212,175,55,0.2)] mb-6" />
          <h1 className="text-4xl font-bold text-foreground mb-3 font-sans tracking-wide uppercase">{t('authSignUp.join')}</h1>
          <p className="text-muted-foreground font-light">{t('authSignUp.subtitle')}</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-md border border-border/50 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-2xl">
          <form onSubmit={handleEmailSignUp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-semibold font-sans tracking-widest uppercase text-xs">{t('authSignUp.fullName')}</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/70" />
                <Input
                  id="name"
                  type="text"
                  placeholder={t('authSignUp.fullName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-12 border-border/80 focus:border-primary text-foreground bg-background/50 h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground font-semibold font-sans tracking-widest uppercase text-xs">{t('reserve.phone')} <span className="normal-case text-muted-foreground font-normal text-xs tracking-normal">({t('common.optional', 'optional')})</span></Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/70" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+973 XXXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="pl-12 border-border/80 focus:border-primary text-foreground bg-background/50 h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold font-sans tracking-widest uppercase text-xs">{t('authSignUp.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary/70" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('authSignUp.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-12 border-border/80 focus:border-primary text-foreground bg-background/50 h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold font-sans tracking-widest uppercase text-xs">{t('authSignUp.password')}</Label>
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
                  minLength={6}
                  className="pl-12 border-border/80 focus:border-primary text-foreground bg-background/50 h-12 rounded-2xl"
                />
              </div>
              <p className="text-xs text-muted-foreground font-light">{t('authSignUp.passwordHint')}</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-2xl uppercase tracking-widest font-sans text-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('authSignUp.creating')}
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  {t('authSignUp.createAccount')}
                </>
              )}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-card text-muted-foreground font-light tracking-widest uppercase">{t('authSignUp.orContinue')}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignUp}
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
            {t('authSignUp.google')}
          </Button>

          <div className="mt-8 text-center text-sm text-muted-foreground font-light">
            {t('authSignUp.haveAccount')}{' '}
            <button
              onClick={() => navigate('/signin')}
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              {t('authSignUp.signIn')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
