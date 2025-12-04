import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      header: {
        brand: 'Sahra',
        admin: 'Admin',
        profile: 'Profile',
        signOut: 'Sign Out',
        signIn: 'Sign In',
        signUp: 'Sign Up',
      },
      nav: {
        search: 'Search',
        bookings: 'Bookings',
        host: 'Host',
        profile: 'Profile',
      },
      host: {
        bookingsTitle: 'My Camp Bookings',
        bookingsCount: '{{count}} booking',
        bookingsCount_plural: '{{count}} bookings',
        noBookings: 'No bookings yet',
        noBookingsHint: 'Your camp bookings will appear here once guests reserve.',
        refresh: 'Refresh',
        back: 'Back to Host Dashboard',
      },
    },
  },
  ar: {
    translation: {
      header: {
        brand: 'صحرا',
        admin: 'لوحة المشرف',
        profile: 'حسابي',
        signOut: 'تسجيل خروج',
        signIn: 'تسجيل الدخول',
        signUp: 'إنشاء حساب',
      },
      nav: {
        search: 'بحث',
        bookings: 'الحجوزات',
        host: 'المضيف',
        profile: 'الملف الشخصي',
      },
      host: {
        bookingsTitle: 'حجوزات مخيماتي',
        bookingsCount: '{{count}} حجز',
        bookingsCount_plural: '{{count}} حجز',
        noBookings: 'لا توجد حجوزات بعد',
        noBookingsHint: 'ستظهر حجوزات مخيمك هنا عند قيام الضيوف بالحجز.',
        refresh: 'تحديث',
        back: 'العودة للوحة المضيف',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
