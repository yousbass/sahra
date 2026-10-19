import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, LogOut, Menu, Star, Home, Tent, Waves, Map } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getUserProfile, UserProfile } from '@/lib/firestore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggle } from './theme/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [unreadReviews, setUnreadReviews] = useState(0);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setUserProfile);
    } else {
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    const sync = () => {
      const n = parseInt(localStorage.getItem('mukhymat_unread_reviews') || '0', 10);
      setUnreadReviews(isNaN(n) ? 0 : n);
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    // Set initial direction and language from localStorage or default
    const savedLanguage = localStorage.getItem('language') || i18n.language || 'en';
    if (savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
    document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLanguage;
  }, []);

  useEffect(() => {
    // Update direction when language changes
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Don't show header on auth pages or admin pages
  const hideHeader = location.pathname.includes('/signin') || 
                     location.pathname.includes('/signup') ||
                     location.pathname.includes('/admin');

  if (hideHeader) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <img 
              src={`${import.meta.env.BASE_URL}assets/mukhymat-logo.jpg`} 
              alt="MUKHYMAT" 
              className="h-10 sm:h-12 w-10 sm:w-12 object-cover rounded-full shadow-sm"
            />
            <span className="text-xl sm:text-2xl font-bold font-sans text-primary">
              {t('header.brand')}
            </span>
          </button>

          {/* Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Desktop primary nav */}
            <div className="hidden md:flex items-center gap-1 mr-2 rtl:mr-0 rtl:ml-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className={`font-semibold rounded-xl ${location.pathname === '/' ? 'text-foreground bg-primary/20' : 'text-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                {t('nav.home')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/camps')}
                className={`font-semibold rounded-xl ${location.pathname === '/camps' ? 'text-foreground bg-primary/20' : 'text-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                {t('nav.camps')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/kashtas')}
                className={`font-semibold rounded-xl ${location.pathname === '/kashtas' ? 'text-foreground bg-primary/20' : 'text-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                {t('nav.kashtas')}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/search')}
                className={`font-semibold rounded-xl ${location.pathname === '/search' ? 'text-foreground bg-primary/20' : 'text-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                {t('nav.search')}
              </Button>
            </div>
            
            <ThemeToggle />
            {/* Language Switcher */}
            <LanguageSwitcher />

            {user ? (
              /* Desktop account buttons — hidden on mobile */
              <div className="hidden md:flex items-center gap-2">
                {userProfile?.isAdmin && (
                  <Button
                    onClick={() => navigate('/admin')}
                    variant="outline"
                    size="sm"
                    className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold rounded-xl"
                  >
                    <Shield className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
                    <span className="hidden lg:inline">{t('header.admin')}</span>
                  </Button>
                )}

                {(userProfile as any)?.isHost && (
                  <Button
                    onClick={() => { navigate('/host/reviews'); localStorage.setItem('mukhymat_unread_reviews', '0'); setUnreadReviews(0); }}
                    variant="outline"
                    size="sm"
                    className="border-2 border-border hover:bg-secondary rounded-xl relative"
                  >
                    <Star className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
                    <span className="hidden lg:inline">{t('header.reviews', 'Reviews')}</span>
                    {unreadReviews > 0 && (
                      <span className="absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 h-4 min-w-[1rem] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                        {unreadReviews > 9 ? '9+' : unreadReviews}
                      </span>
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  size="sm"
                  className="border-2 border-border hover:bg-secondary rounded-xl"
                >
                  <User className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
                  <span className="hidden lg:inline">{t('header.profile')}</span>
                </Button>

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="border-2 border-border hover:bg-secondary text-muted-foreground rounded-xl"
                >
                  <LogOut className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
                  <span className="hidden lg:inline">{t('header.signOut')}</span>
                </Button>
              </div>
            ) : (
              /* Desktop sign-in / sign-up — hidden on mobile */
              <>
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex border-2 border-border hover:bg-secondary text-sm px-4 rounded-xl"
                >
                  {t('header.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  size="sm"
                  className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-4 rounded-xl"
                >
                  {t('header.signUp')}
                </Button>
              </>
            )}

            {/* Mobile hamburger — always visible on phone screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden border-2 border-border rounded-xl" aria-label={t('nav.menu', 'Menu')}>
                  <Menu className="w-4 h-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                {/* Discovery routes — always shown */}
                <DropdownMenuItem
                  onClick={() => navigate('/')}
                  className={`rounded-xl ${location.pathname === '/' ? 'bg-primary/10 text-foreground font-semibold' : ''}`}
                >
                  <Home className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.home')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/camps')}
                  className={`rounded-xl ${location.pathname === '/camps' ? 'bg-primary/10 text-foreground font-semibold' : ''}`}
                >
                  <Tent className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.camps')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/kashtas')}
                  className={`rounded-xl ${location.pathname === '/kashtas' ? 'bg-primary/10 text-foreground font-semibold' : ''}`}
                >
                  <Waves className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.kashtas')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/search')}
                  className={`rounded-xl ${location.pathname === '/search' ? 'bg-primary/10 text-foreground font-semibold' : ''}`}
                >
                  <Map className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.search')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {user ? (
                  /* Logged-in account items */
                  <>
                    {userProfile?.isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl">
                        <Shield className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t('header.admin')}
                      </DropdownMenuItem>
                    )}
                    {(userProfile as any)?.isHost && (
                      <DropdownMenuItem onClick={() => { navigate('/host/reviews'); localStorage.setItem('mukhymat_unread_reviews', '0'); setUnreadReviews(0); }} className="rounded-xl">
                        <Star className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t('header.reviews', 'Reviews')}
                        {unreadReviews > 0 && (
                          <span className="ltr:ml-auto rtl:mr-auto h-5 min-w-[1.25rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadReviews > 9 ? '9+' : unreadReviews}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl">
                      <User className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('header.profile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="rounded-xl">
                      <LogOut className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('header.signOut')}
                    </DropdownMenuItem>
                  </>
                ) : (
                  /* Guest sign-in / sign-up */
                  <>
                    <DropdownMenuItem onClick={() => navigate('/signin')} className="rounded-xl">
                      {t('header.signIn')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/signup')} className="rounded-xl">
                      {t('header.signUp')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}