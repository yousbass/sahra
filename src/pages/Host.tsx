import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, List, BarChart3, Crown, Loader2, Calendar, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Host() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Safety timeout: Force loading to stop after 5 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingStats) {
        console.warn('Stats loading timed out - forcing completion');
        setLoadingStats(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [loadingStats]);

  // Auth check redirect
  useEffect(() => {
    if (!authLoading && !userData) {
      toast.error('Please sign in to access the host dashboard');
      navigate('/signin');
    } else if (!authLoading && userData && !userData.isHost) {
      toast.error('You need to become a host first');
      navigate('/profile');
    }
  }, [userData, authLoading, navigate]);

  // Data fetching
  useEffect(() => {
    const fetchStats = async () => {
      // 1. If auth is still loading, wait
      if (authLoading) return;

      // 2. If no user (and auth finished), stop loading immediately
      // Use user.uid instead of userData.uid because UserProfile interface has 'id', not 'uid'
      if (!user?.uid) {
        console.log('No user data available for stats');
        setLoadingStats(false);
        return;
      }
      
      console.log('Starting stats fetch for:', user.uid);
      setLoadingStats(true);
      
      try {
        // Fetch listings
        const listingsQuery = query(
          collection(db, 'camps'),
          where('hostId', '==', user.uid)
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const totalListings = listingsSnapshot.size;
        const activeListings = listingsSnapshot.docs.filter(doc => doc.data().status === 'active').length;

        console.log('Listings fetched:', { totalListings, activeListings });

        // Fetch bookings
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('hostId', '==', user.uid)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const totalBookings = bookingsSnapshot.size;
        const pendingBookings = bookingsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;

        console.log('Bookings fetched:', { totalBookings, pendingBookings });

        setStats({
          totalListings,
          activeListings,
          totalBookings,
          pendingBookings,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep default 0 values on error, but ensure loading stops
      } finally {
        console.log('Stats fetch finished');
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user, userData, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-900 animate-spin" />
      </div>
    );
  }

  if (!userData || !userData.isHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
      <div className="max-w-7xl mx-auto pt-8 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {t('host.dashboardTitle')}
              </h1>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                {t('host.dashboardSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <List className="w-8 h-8 opacity-80" />
              {loadingStats ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="text-3xl font-bold">{stats.totalListings}</span>
              )}
            </div>
            <p className="text-sm font-medium opacity-90">{t('host.stats.totalListings')}</p>
            <p className="text-xs opacity-75 mt-1">
              {stats.activeListings} {t('host.stats.active')}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
              {loadingStats ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="text-3xl font-bold">{stats.totalBookings}</span>
              )}
            </div>
            <p className="text-sm font-medium opacity-90">{t('host.stats.totalBookings')}</p>
            <p className="text-xs opacity-75 mt-1">
              {stats.pendingBookings} {t('host.stats.pending')}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">-</span>
            </div>
            <p className="text-sm font-medium opacity-90">{t('host.stats.revenue')}</p>
            <p className="text-xs opacity-75 mt-1">{t('host.stats.comingSoon')}</p>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">-</span>
            </div>
            <p className="text-sm font-medium opacity-90">{t('host.stats.guests')}</p>
            <p className="text-xs opacity-75 mt-1">{t('host.stats.comingSoon')}</p>
          </Card>
        </div>

        {/* Primary Action Card - FIXED: Changed to dark brown background with white text for better contrast */}
        <Card 
          onClick={() => navigate('/host/create')}
          className="bg-gradient-to-br from-amber-800 via-amber-900 to-stone-900 text-white p-8 md:p-10 shadow-xl hover:shadow-2xl transition-all cursor-pointer group mb-8 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 group-hover:scale-150 transition-transform duration-700"></div>
          
          <div className="relative z-10 max-w-3xl">
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <h2 className="text-2xl md:text-3xl font-bold drop-shadow-lg text-white">
                  {t('host.heroTitle')}
                </h2>
              </div>
            </div>
            <p className={`text-white text-base md:text-lg mb-6 drop-shadow-md font-medium max-w-2xl ${isRTL ? 'text-right' : ''}`}>
              {t('host.heroDesc')}
            </p>
            <Button
              className="bg-white text-amber-900 hover:bg-gray-50 font-semibold shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg group-hover:scale-105"
            >
              <Plus className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('host.heroCreate')}
            </Button>
          </div>
        </Card>

        {/* Quick Actions Grid */}
        <div className="mb-6">
          <h3 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {t('host.quickActions')}
          </h3>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            onClick={() => navigate('/host/listings')}
            className="bg-white border-2 border-orange-200 p-6 cursor-pointer hover:shadow-xl hover:border-orange-300 transition-all hover:-translate-y-1 group"
          >
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-700 to-amber-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <List className="w-7 h-7 text-white" />
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-amber-900 transition-colors">
                  {t('host.manageTitle')}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('host.manageDesc')}
                </p>
              </div>
            </div>
          </Card>

          <Card
            onClick={() => navigate('/host/bookings')}
            className="bg-white border-2 border-orange-200 p-6 cursor-pointer hover:shadow-xl hover:border-orange-300 transition-all hover:-translate-y-1 group"
          >
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                  {t('host.bookingsCardTitle')}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('host.bookingsCardDesc')}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-white border-2 border-orange-200 p-6 opacity-60 cursor-not-allowed">
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {t('host.analyticsTitle')}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('host.analyticsDesc')}
                </p>
                <span className="inline-block mt-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {t('host.stats.comingSoon')}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}