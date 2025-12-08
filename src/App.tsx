import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Search, Calendar, Home as HomeIcon, User } from 'lucide-react';
import Header from './components/Header';
import Index from './pages/Index';
import CampDetails from './pages/CampDetails';
import Reserve from './pages/Reserve';
import Bookings from './pages/Bookings';
import Host from './pages/Host';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import MyListings from './pages/MyListings';
import HostBookings from './pages/host/Bookings';
import ManageAvailability from './pages/host/ManageAvailability';
import Profile from './pages/Profile';
import BecomeHost from './pages/BecomeHost';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import NotFound from './pages/NotFound';
import './lib/i18n';
import { useTranslation } from 'react-i18next';
import { LoadingProvider } from './contexts/LoadingContext';
import { LanguageDirectionHandler } from './components/LanguageDirectionHandler';

// Admin imports
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminCamps from './pages/admin/Camps';
import AdminBookings from './pages/admin/Bookings';
import AdminReviews from './pages/admin/Reviews';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';

const queryClient = new QueryClient();

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const tabs = [
    { path: '/', icon: Search, label: t('nav.search') },
    { path: '/bookings', icon: Calendar, label: t('nav.bookings') },
    { path: '/host', icon: HomeIcon, label: t('nav.host') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  // Don't show bottom nav on certain pages
  const hideNav = location.pathname.includes('/camp/') || 
                  location.pathname.includes('/reserve') ||
                  location.pathname.includes('/host/create') ||
                  location.pathname.includes('/host/listings') ||
                  location.pathname.includes('/host/availability') ||
                  location.pathname.includes('/edit-listing') ||
                  location.pathname.includes('/become-host') ||
                  location.pathname.includes('/signup') ||
                  location.pathname.includes('/signin') ||
                  location.pathname.includes('/payment/') ||
                  location.pathname.includes('/admin');

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-amber-200 z-50 shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto rtl:flex-row-reverse">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isActive ? 'text-orange-600' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LoadingProvider>
        <LanguageDirectionHandler />
        <Toaster />
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 pb-16">
            <Header />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/camp/:slug" element={<CampDetails />} />
              <Route path="/reserve" element={<Reserve />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/host" element={<Host />} />
              <Route path="/host/create" element={<CreateListing />} />
              <Route path="/host/listings" element={<MyListings />} />
              <Route path="/host/availability" element={<ManageAvailability />} />
              <Route path="/host/bookings" element={<HostBookings />} />
              <Route path="/edit-listing/:campId" element={<EditListing />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/become-host" element={<BecomeHost />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="camps" element={<AdminCamps />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </LoadingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;