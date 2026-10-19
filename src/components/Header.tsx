import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, LogOut, Menu, Star, Home, Tent, Waves, Map } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getUserProfile, UserProfile } from '@/lib/firestore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { SaduBand } from './SaduBand';
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

  // Sync unread reviews badge from localStorage (written by the Reviews page)
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
    if (user) {
      getUserProfile(user.uid).then(setUserProfile);
    } else {
      setUserProfile(null);
    }
  }, [user]);

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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <img 
              src="/assets/mukhymat-logo.jpg" 
              alt="MUKHYMAT" 
              className="h-10 sm:h-12 w-10 sm:w-12 object-cover rounded-full shadow-sm"
            />
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('header.brand')}
            </span>
          </button>

          {/* Primary Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { path: '/', label: t('nav.home') },
              { path: '/camps', label: t('nav.camps') },
              { path: '/kashtas', label: t('nav.kashtas') },
              { path: '/search', label: t('nav.search') },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  location.pathname === link.path
                    ? 'bg-secondary text-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-3">
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
                    className="border-2 border-primary text-primary hover:bg-secondary font-semibold"
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
                    className="border-2 border-border hover:bg-secondary relative"
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
                  className="border-2 border-border hover:bg-secondary"
                >
                  <User className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
                  <span className="hidden lg:inline">{t('header.profile')}</span>
                </Button>

                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="border-2 border-gray-300 hover:bg-gray-50"
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
                  className="hidden md:inline-flex border-2 border-border hover:bg-secondary text-sm px-4"
                >
                  {t('header.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  size="sm"
                  className="hidden md:inline-flex bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold text-sm px-4"
                >
                  {t('header.signUp')}
                </Button>
              </>
            )}

            {/* Mobile hamburger — always visible on phone screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden border-2 border-border" aria-label={t('nav.menu', 'Menu')}>
                  <Menu className="w-4 h-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Discovery routes — always shown */}
                <DropdownMenuItem
                  onClick={() => navigate('/')}
                  className={location.pathname === '/' ? 'bg-secondary text-primary font-semibold' : ''}
                >
                  <Home className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.home')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/camps')}
                  className={location.pathname === '/camps' ? 'bg-secondary text-primary font-semibold' : ''}
                >
                  <Tent className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.camps')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/kashtas')}
                  className={location.pathname === '/kashtas' ? 'bg-secondary text-primary font-semibold' : ''}
                >
                  <Waves className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.kashtas')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/search')}
                  className={location.pathname === '/search' ? 'bg-secondary text-primary font-semibold' : ''}
                >
                  <Map className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('nav.search')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {user ? (
                  /* Logged-in account items */
                  <>
                    {userProfile?.isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t('header.admin')}
                      </DropdownMenuItem>
                    )}
                    {(userProfile as any)?.isHost && (
                      <DropdownMenuItem onClick={() => { navigate('/host/reviews'); localStorage.setItem('mukhymat_unread_reviews', '0'); setUnreadReviews(0); }}>
                        <Star className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t('header.reviews', 'Reviews')}
                        {unreadReviews > 0 && (
                          <span className="ltr:ml-auto rtl:mr-auto h-5 min-w-[1.25rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadReviews > 9 ? '9+' : unreadReviews}
                          </span>
                        )}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('header.profile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('header.signOut')}
                    </DropdownMenuItem>
                  </>
                ) : (
                  /* Guest sign-in / sign-up */
                  <>
                    <DropdownMenuItem onClick={() => navigate('/signin')}>
                      {t('header.signIn')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/signup')}>
                      {t('header.signUp')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <SaduBand />
    </header>
  );
}