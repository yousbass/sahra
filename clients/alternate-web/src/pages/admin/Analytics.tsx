import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp,
  Users,
  DollarSign,
  Star,
  Download
} from 'lucide-react';
import { 
  getAdminStats, 
  getUserGrowthStats, 
  getPopularCamps,
  getBookingTrendData,
  AdminStats,
} from '@/lib/firestore';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';

export default function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [userGrowthData, setUserGrowthData] = useState<{ currentMonth: number; lastMonth: number; total: number; percentageChange: number } | null>(null);
  const [popularCamps, setPopularCamps] = useState<Array<{ id: string; title?: string; rating?: number; reviewCount?: number; pricePerNight?: number; images?: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading analytics...');
      
      const [statsData, bookingTrend, userGrowth, topCamps] = await Promise.all([
        getAdminStats(),
        getBookingTrendData(),
        getUserGrowthStats(),
        getPopularCamps(10)
      ]);

      console.log('Analytics loaded successfully');
      setStats(statsData);
      
      // Extract revenue data from booking trend
      setRevenueData(bookingTrend.map(item => ({
        month: item.month,
        revenue: item.revenue
      })));
      
      // User growth data
      setUserGrowthData(userGrowth);

      setPopularCamps(topCamps as Array<{ id: string; title?: string; rating?: number; reviewCount?: number; pricePerNight?: number; images?: string[] }>);
    } catch (error) {
      console.error('Error loading analytics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const bookingStatusData = stats ? [
    { name: 'Confirmed', value: stats.confirmedBookings, color: '#10b981' },
    { name: 'Pending', value: stats.pendingBookings, color: '#f59e0b' },
    { name: 'Cancelled', value: stats.cancelledBookings, color: '#94a3b8' },
  ] : [];

  const exportData = () => {
    const data = {
      stats,
      revenueData,
      userGrowthData,
      popularCamps: popularCamps.map(c => ({
        title: c.title,
        rating: c.rating,
        reviews: c.reviewCount
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CampfireLoader size="lg" className="mx-auto mb-4" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">{error || 'Failed to load analytics'}</p>
        <Button onClick={loadAnalytics} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">Comprehensive platform insights and metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={exportData}
            variant="outline"
            className="border-2 border-border hover:bg-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Users</h3>
          <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
          <p className="text-sm text-muted-foreground mt-1">{stats.totalHosts} hosts</p>
        </Card>

        <Card className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-foreground">{stats.totalRevenue.toFixed(0)} BD</p>
          <p className="text-sm text-muted-foreground mt-1">{stats.monthlyRevenue.toFixed(0)} BD this month</p>
        </Card>

        <Card className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg Rating</h3>
          <p className="text-3xl font-bold text-foreground">{stats.averageRating.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground mt-1">{stats.totalReviews} reviews</p>
        </Card>

        <Card className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Bookings</h3>
          <p className="text-3xl font-bold text-foreground">{stats.totalBookings}</p>
          <p className="text-sm text-muted-foreground mt-1">{stats.confirmedBookings} confirmed</p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="modern-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Revenue Trend (Last 12 Months)</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(224 30% 18%)" />
                <XAxis dataKey="month" stroke="hsl(215 20% 65%)" />
                <YAxis stroke="hsl(215 20% 65%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(224 35% 8%)', 
                    border: '1px solid hsl(224 30% 18%)',
                    borderRadius: '8px',
                    color: 'hsl(210 40% 98%)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </Card>

        {/* User Growth */}
        <Card className="modern-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">User Growth</h3>
          {userGrowthData ? (
            <div className="h-[300px] flex flex-col justify-center gap-6 px-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">This Month</p>
                  <p className="text-3xl font-bold text-foreground">{userGrowthData.currentMonth}</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Last Month</p>
                  <p className="text-3xl font-bold text-foreground">{userGrowthData.lastMonth}</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-foreground">{userGrowthData.total}</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">MoM Change</p>
                  <p className={`text-3xl font-bold ${userGrowthData.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {userGrowthData.percentageChange >= 0 ? '+' : ''}{userGrowthData.percentageChange.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No user growth data available
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Distribution */}
        <Card className="modern-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Booking Status Distribution</h3>
          {bookingStatusData.length > 0 && bookingStatusData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No booking data available
            </div>
          )}
        </Card>

        {/* Top Performing Camps */}
        <Card className="modern-card p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Top Performing Camps</h3>
          {popularCamps.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {popularCamps.map((camp, index) => (
                <div key={camp.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-sm">{index + 1}</span>
                  </div>
                  <img
                    src={camp.images?.[0] || 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'}
                    alt={camp.title}
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{camp.title}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1 text-primary">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        {camp.rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="text-muted-foreground">({camp.reviewCount || 0} reviews)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{camp.pricePerNight} BD</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No camps available
            </div>
          )}
        </Card>
      </div>

      {/* Additional Stats */}
      <Card className="modern-card p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Platform Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Active Camps</p>
            <p className="text-2xl font-bold text-foreground">{stats.activeCamps}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Pending Camps</p>
            <p className="text-2xl font-bold text-foreground">{stats.pendingCamps}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Pending Bookings</p>
            <p className="text-2xl font-bold text-foreground">{stats.pendingBookings}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Cancelled Bookings</p>
            <p className="text-2xl font-bold text-foreground">{stats.cancelledBookings}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}