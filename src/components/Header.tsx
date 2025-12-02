import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { getUserProfile, UserProfile } from '@/lib/firestore';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setUserProfile);
    } else {
      setUserProfile(null);
    }
  }, [user]);

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
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-terracotta-600 to-amber-600 bg-clip-text text-transparent">
              Sahra
            </span>
          </button>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Admin Link - Only show if user is admin */}
                {userProfile?.isAdmin && (
                  <Button
                    onClick={() => navigate('/admin')}
                    variant="outline"
                    className="border-2 border-terracotta-500 text-terracotta-700 hover:bg-terracotta-50 font-semibold"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                )}

                {/* Profile Button */}
                <Button
                  onClick={() => navigate('/profile')}
                  variant="outline"
                  className="border-2 border-amber-300 hover:bg-amber-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>

                {/* Sign Out Button */}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="border-2 border-gray-300 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  className="border-2 border-amber-300 hover:bg-amber-50"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}