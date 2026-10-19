import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Search, Home as HomeIcon, Tent, Waves, Map } from 'lucide-react';
import Header from './components/Header';
import Index from './pages/Index';
import SearchPage from './pages/Search';
import Market from './pages/Market';
import TypeBrowse from './pages/TypeBrowse';
import CampDetails from './pages/CampDetails';
import Reserve from './pages/Reserve';
import Bookings from './pages/Bookings';
import Host from './pages/Host';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import MyListings from './pages/MyListings';
import HostBookings from './pages/host/Bookings';
import HostReviews from './pages/host/Reviews';
import ManageAvailability from './pages/host/ManageAvailability';
import Profile from './pages/Profile';
import BecomeHost from './pages/BecomeHost';
import BecomeSeller from './pages/BecomeSeller';
import Partner from './pages/Partner';
import MyShop from './pages/MyShop';
import AdminSellerApplications from './pages/admin/SellerApplications';
import AdminRefunds from './pages/admin/Refunds';
import AdminDisputes from './pages/admin/Disputes';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import HostProfile from './pages/HostProfile';
import NotFound from './pages/NotFound';
import './lib/i18n';
import { useTranslation } from 'react-i18next';
import { LoadingProvider } from './contexts/LoadingContext';
import { LanguageDirectionHandler } from './components/LanguageDirectionHandler';

import { SaduBand } from './components/SaduBand';
import { ErrorBoundary } from './components/ErrorBoundary';

// Admin imports
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminHostApplications from './pages/admin/HostApplications';
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
    { path: '/', icon: HomeIcon, label: t('nav.home') },
    { path: '/camps', icon: Tent, label: t('nav.camps') },
    { path: '/kashtas', icon: Waves, label: t('nav.kashtas') },
    { path: '/search', icon: Map, label: t('nav.search') },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-border z-50 shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto rtl:flex-row-reverse">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-foreground/70 hover:text-foreground'
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

const AppInner = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LoadingProvider>
        <LanguageDirectionHandler />
        <Toaster />
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-b desert-bg pb-16">
            <Header />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/market" element={<Market />} />
              <Route path="/camps" element={<TypeBrowse type="camp" />} />
              <Route path="/kashtas" element={<TypeBrowse type="kashta" />} />
              <Route path="/camp/:slug" element={<CampDetails />} />
              <Route path="/reserve" element={<Reserve />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/host" element={<Host />} />
              <Route path="/host/create" element={<CreateListing />} />
              <Route path="/host/listings" element={<MyListings />} />
              <Route path="/host/availability" element={<ManageAvailability />} />
              <Route path="/host/bookings" element={<HostBookings />} />
              <Route path="/host/reviews" element={<HostReviews />} />
              <Route path="/edit-listing/:campId" element={<EditListing />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/become-host" element={<BecomeHost />} />
              <Route path="/partner" element={<Partner />} />
              <Route path="/become-seller" element={<BecomeSeller />} />
              <Route path="/my-shop" element={<MyShop />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              <Route path="/host-profile/:hostId" element={<HostProfile />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="host-applications" element={<AdminHostApplications />} />
                <Route path="seller-applications" element={<AdminSellerApplications />} />
                <Route path="camps" element={<AdminCamps />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="refunds" element={<AdminRefunds />} />
                <Route path="disputes" element={<AdminDisputes />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <div className="mt-auto">
              <SaduBand />
              <BottomNav />
            </div>
          </div>
        </BrowserRouter>
      </LoadingProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
);

export default App;