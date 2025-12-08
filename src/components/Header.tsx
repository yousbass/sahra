import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getUserProfile, UserProfile } from '@/lib/firestore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { t, i18n } = useTranslation();

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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-orange-200 shadow-sm">
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
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-[#8B5A3C] to-[#FF8C42] bg-clip-text text-transparent">
              {t('header.brand')}
            </span>
          </button>

          {/* Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {user ? (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-2">
                  {userProfile?.isAdmin && (
                    <Button
                      onClick={() => navigate('/admin')}
                      variant="outline"
                      size="sm"
                      className="border-2 border-[#8B5A3C] text-[#8B5A3C] hover:bg-orange-50 font-semibold"
                    >
                      <Shield className="w-4 h-4 ltr:mr-1.5 rtl:ml-1.5" />
                      <span className="hidden lg:inline">{t('header.admin')}</span>
                    </Button>
                  )}

                  <Button
                    onClick={() => navigate('/profile')}
                    variant="outline"
                    size="sm"
                    className="border-2 border-orange-300 hover:bg-orange-50"
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

                {/* Mobile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="md:hidden">
                    <Button variant="outline" size="sm" className="border-2 border-orange-300">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {userProfile?.isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                        {t('header.admin')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('header.profile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <LogOut className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {t('header.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  size="sm"
                  className="border-2 border-orange-300 hover:bg-orange-50 text-xs sm:text-sm px-2 sm:px-4"
                >
                  {t('header.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  size="sm"
                  className="bg-gradient-to-r from-[#8B5A3C] to-[#FF8C42] hover:from-[#6B4423] hover:to-[#E07A3C] text-white font-semibold text-xs sm:text-sm px-2 sm:px-4"
                >
                  {t('header.signUp')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}