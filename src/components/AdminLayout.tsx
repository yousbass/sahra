import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Tent, 
  Calendar, 
  Star, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loading, userData } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect if not admin
  if (!loading && !isAdmin) {
    navigate('/');
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/camps', icon: Tent, label: 'Camps' },
    { path: '/admin/bookings', icon: Calendar, label: 'Bookings' },
    { path: '/admin/reviews', icon: Star, label: 'Reviews' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 1) return ['Dashboard'];
    
    const breadcrumbs = ['Dashboard'];
    const current = navItems.find(item => item.path === path);
    if (current) {
      breadcrumbs.push(current.label);
    }
    
    return breadcrumbs;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-terracotta-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200">
      {/* Top Header */}
      <header className="bg-white border-b border-sand-300 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Admin Panel</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{userData?.displayName || 'Admin'}</p>
              <p className="text-xs text-gray-600">{userData?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[57px] left-0 h-[calc(100vh-57px)] 
            bg-white border-r border-sand-300 shadow-lg
            transition-all duration-300 z-30
            ${sidebarOpen ? 'w-64' : 'w-0 lg:w-16'}
            overflow-hidden
          `}
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              
              return (
                <Button
                  key={item.path}
                  variant={active ? 'default' : 'ghost'}
                  className={`
                    w-full justify-start gap-3
                    ${active 
                      ? 'bg-gradient-to-r from-terracotta-500 to-terracotta-600 text-white hover:from-terracotta-600 hover:to-terracotta-700' 
                      : 'text-gray-700 hover:bg-sand-50'
                    }
                  `}
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            {getBreadcrumbs().map((crumb, index, arr) => (
              <div key={index} className="flex items-center gap-2">
                <span className={index === arr.length - 1 ? 'text-terracotta-600 font-semibold' : 'text-gray-600'}>
                  {crumb}
                </span>
                {index < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            ))}
          </div>

          {/* Page Content */}
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}