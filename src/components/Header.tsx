import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getUserProfile, UserProfile } from '@/lib/firestore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { cn } from '@/lib/utils';

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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-amber-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex items-center gap-3 flex-wrap h-auto md:h-16 md:flex-nowrap',
            i18n.language === 'ar' ? 'flex-row-reverse' : 'flex-row',
            'justify-center md:justify-between'
          )}
        >
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-terracotta-600 to-amber-600 bg-clip-text text-transparent">
              {t('header.brand')}
            </span>
          </button>

          {/* Navigation */}
          <div
            className={cn(
              'flex items-center gap-2 flex-wrap w-full md:w-auto',
              i18n.language === 'ar' ? 'justify-start md:justify-end' : 'justify-end'
            )}
          >
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {user ? (
              <>
                {/* Admin Link - Only show if user is admin */}
                {userProfile?.isAdmin && (
                  <Button
                    onClick={() => navigate('/admin')}
                    variant="outline"
                    className="border-2 border-terracotta-500 text-terracotta-700 hover:bg-terracotta-50 font-semibold"
                  >
                    <Shield className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                    {t('header.admin')}
                  </Button>
                )}

                {/* Profile Button */}
                <Button
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  className="border-2 border-amber-300 hover:bg-amber-50"
                >
                  <User className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('header.profile')}
                </Button>

                {/* Sign Out Button */}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="border-2 border-gray-300 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t('header.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  className="border-2 border-amber-300 hover:bg-amber-50"
                >
                  {t('header.signIn')}
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold"
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
