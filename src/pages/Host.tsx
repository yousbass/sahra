import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, List, BarChart3, Crown, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function Host() {
  const navigate = useNavigate();
  const { userData, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !userData) {
      toast.error('Please sign in to access the host dashboard');
      navigate('/signin');
    } else if (!loading && userData && !userData.isHost) {
      toast.error('You need to become a host first');
      navigate('/profile');
    }
  }, [userData, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  if (!userData || !userData.isHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Host Dashboard</h1>
              <p className="text-gray-700 font-medium">Manage your desert camp listings</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card
            onClick={() => navigate('/host/create')}
            className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Create New Listing</h3>
                <p className="text-sm text-gray-700 font-medium">Add a new camp to your portfolio</p>
              </div>
            </div>
          </Card>

          <Card
            onClick={() => navigate('/host/listings')}
            className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <List className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">My Listings</h3>
                <p className="text-sm text-gray-700 font-medium">View and manage your camps</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 opacity-75">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-sand-400 to-terracotta-400 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Analytics</h3>
                <p className="text-sm text-gray-700 font-medium">Coming soon</p>
              </div>
            </div>
          </Card>

          <Card
            onClick={() => navigate('/host/bookings')}
            className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Bookings</h3>
                <p className="text-sm text-gray-700 font-medium">See all bookings on your camps</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Welcome Card */}
        <Card className="bg-gradient-to-br from-terracotta-500 via-terracotta-600 to-terracotta-700 text-white p-8 shadow-xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 drop-shadow-lg">
              Welcome to Your Host Dashboard! 🏜️
            </h2>
            <p className="text-white/90 mb-6 drop-shadow font-medium">
              Start sharing your desert camps with travelers from around the world. Create your first listing or manage existing ones to grow your hosting business.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate('/host/create')}
                className="bg-white text-terracotta-600 hover:bg-white/90 font-semibold shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Listing
              </Button>
              <Button
                onClick={() => navigate('/host/listings')}
                className="bg-white text-terracotta-600 hover:bg-white/90 font-semibold shadow-lg"
              >
                <List className="w-4 h-4 mr-2" />
                View My Listings
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
