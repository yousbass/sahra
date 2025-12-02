import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Tent, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Loader2,
  BarChart
} from 'lucide-react';
import { getAdminStats, getRecentActivity, AdminStats, RecentActivity } from '@/lib/firestore';
import { toast } from 'sonner';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getRevenueStats, getBookingTrendData } from '@/lib/firestore';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookingTrendData, setBookingTrendData] = useState<Array<{ month: string; bookings: number; revenue: number }>>([]);
  const [revenueStats, setRevenueStats] = useState<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    averageBookingValue: number;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading admin dashboard data...');
      
      // Load all dashboard data from Firestore
      const [statsData, trendData, revenue, activity] = await Promise.all([
        getAdminStats(),
        getBookingTrendData(),
        getRevenueStats(),
        getRecentActivity(5)
      ]);
      
      console.log('Dashboard data loaded:', { statsData, trendData, revenue, activity });
      setStats(statsData);
      setBookingTrendData(trendData);
      setRevenueStats(revenue);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 mb-4">{error || 'Failed to load statistics'}</p>
        <Button onClick={loadDashboardData} className="bg-terracotta-600 hover:bg-terracotta-700">
          Retry
        </Button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `${stats.totalHosts} hosts`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      action: () => navigate('/admin/users')
    },
    {
      title: 'Total Camps',
      value: stats.totalCamps,
      subtitle: `${stats.activeCamps} active, ${stats.pendingCamps} pending`,
      icon: Tent,
      color: 'from-green-500 to-green-600',
      action: () => navigate('/admin/camps')
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      subtitle: `${stats.confirmedBookings} confirmed, ${stats.pendingBookings} pending`,
      icon: Calendar,
      color: 'from-purple-500 to-purple-600',
      action: () => navigate('/admin/bookings')
    },
    {
      title: 'Total Revenue',
      value: `${stats.totalRevenue.toFixed(3)} BD`,
      subtitle: `${stats.monthlyRevenue.toFixed(3)} BD this month`,
      icon: DollarSign,
      color: 'from-terracotta-500 to-terracotta-600',
      action: () => navigate('/admin/analytics')
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back, Admin! 👋</h2>
        <p className="text-gray-600">Here's what's happening with your platform today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 hover:shadow-xl transition-all cursor-pointer group"
              onClick={card.action}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-2">{card.value}</p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
              
              <div className="mt-4 flex items-center text-terracotta-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                View Details
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/admin/users')}
            variant="outline"
            className="h-auto flex-col gap-2 py-4 border-2 border-sand-300 hover:bg-sand-50"
          >
            <Users className="w-6 h-6 text-terracotta-600" />
            <span className="text-sm font-semibold">View All Users</span>
          </Button>
          <Button
            onClick={() => navigate('/admin/camps')}
            variant="outline"
            className="h-auto flex-col gap-2 py-4 border-2 border-sand-300 hover:bg-sand-50"
          >
            <Tent className="w-6 h-6 text-terracotta-600" />
            <span className="text-sm font-semibold">Manage Camps</span>
          </Button>
          <Button
            onClick={() => navigate('/admin/bookings')}
            variant="outline"
            className="h-auto flex-col gap-2 py-4 border-2 border-sand-300 hover:bg-sand-50"
          >
            <Calendar className="w-6 h-6 text-terracotta-600" />
            <span className="text-sm font-semibold">View Bookings</span>
          </Button>
          <Button
            onClick={() => navigate('/admin/analytics')}
            variant="outline"
            className="h-auto flex-col gap-2 py-4 border-2 border-sand-300 hover:bg-sand-50"
          >
            <BarChart className="w-6 h-6 text-terracotta-600" />
            <span className="text-sm font-semibold">Analytics</span>
          </Button>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Trend */}
        <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bookings Trend (Last 12 Months)</h3>
          {bookingTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={bookingTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #d1d5db',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#D2691E" 
                  strokeWidth={3}
                  dot={{ fill: '#D2691E', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No booking data available
            </div>
          )}
        </Card>

        {/* Revenue by Month */}
        <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue by Month (BD)</h3>
          {bookingTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={bookingTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #d1d5db',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="url(#colorRevenue)" 
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D2691E" stopOpacity={1} />
                    <stop offset="100%" stopColor="#E07A3C" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No revenue data available
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-sand-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'user' ? 'bg-blue-500' :
                  activity.type === 'camp' ? 'bg-green-500' :
                  activity.type === 'booking' ? 'bg-purple-500' :
                  'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No recent activity
          </div>
        )}
      </Card>
    </div>
  );
}