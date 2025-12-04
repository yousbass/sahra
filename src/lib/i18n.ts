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
        dashboardTitle: 'Host Dashboard',
        dashboardSubtitle: 'Manage your desert camp listings',
        createTitle: 'Create New Listing',
        createDesc: 'Add a new camp to your portfolio',
        manageTitle: 'My Listings',
        manageDesc: 'View and manage your camps',
        analyticsTitle: 'Analytics',
        analyticsDesc: 'Coming soon',
        bookingsCardTitle: 'Bookings',
        bookingsCardDesc: 'See all bookings on your camps',
        heroTitle: 'Welcome to Your Host Dashboard! 🏜️',
        heroDesc: 'Start sharing your desert camps with travelers from around the world. Create your first listing or manage existing ones to grow your hosting business.',
        heroCreate: 'Create First Listing',
        heroManage: 'View My Listings'
      },
      bookingsUser: {
        title: 'My Bookings',
        count: '{{count}} booking',
        count_plural: '{{count}} bookings',
        current: 'Current',
        past: 'Past',
        emptyTitle: 'No Active Bookings',
        emptyDesc: 'Start exploring and book your next desert adventure',
        statusTitle: 'Booking Status',
        statusDesc: 'Current reservation status',
        viewDetails: 'View Details',
        payNow: 'Pay Now',
        writeReview: 'Write Review',
        cancel: 'Cancel',
        total: 'Total Price'
      },
      filters: {
        bookingDate: 'Booking Date',
        priceRange: 'Price Range (BD per day)',
        location: 'Location',
        minGuests: 'Minimum Guests',
        tentTypes: 'Tent Types',
        amenities: 'Amenities',
        minRating: 'Minimum Rating',
        apply: 'Apply Filters',
        reset: 'Reset All',
        clearDate: 'Clear date',
        selectDate: 'Select a date',
        findAvailable: 'Find camps available for your selected date',
        largeTents: 'Large Tents',
        smallTents: 'Small Tents',
        entertainmentTents: 'Entertainment Tents',
        allRatings: 'All ratings',
        up: 'and up'
      }
      status: {
        confirmed: 'Confirmed',
        pending: 'Pending',
        cancelled: 'Cancelled',
        na: 'N/A'
      }
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
        dashboardTitle: 'لوحة تحكم المضيف',
        dashboardSubtitle: 'إدارة قوائم مخيماتك الصحراوية',
        createTitle: 'إنشاء قائمة جديدة',
        createDesc: 'أضف مخيماً جديداً إلى مجموعتك',
        manageTitle: 'قوائمي',
        manageDesc: 'عرض وإدارة مخيماتك',
        analyticsTitle: 'التحليلات',
        analyticsDesc: 'قريباً',
        bookingsCardTitle: 'الحجوزات',
        bookingsCardDesc: 'عرض جميع الحجوزات على مخيماتك',
        heroTitle: 'مرحباً بك في لوحة المضيف! 🏜️',
        heroDesc: 'ابدأ بمشاركة مخيماتك الصحراوية مع المسافرين. أنشئ أول قائمة أو أدر القوائم الحالية لتنمية عملك.',
        heroCreate: 'إنشاء أول قائمة',
        heroManage: 'عرض قوائمي'
      },
      bookingsUser: {
        title: 'حجوزاتي',
        count: '{{count}} حجز',
        count_plural: '{{count}} حجز',
        current: 'الحالية',
        past: 'السابقة',
        emptyTitle: 'لا توجد حجوزات نشطة',
        emptyDesc: 'ابدأ بالاستكشاف واحجز مغامرتك الصحراوية القادمة',
        statusTitle: 'حالة الحجز',
        statusDesc: 'حالة الحجز الحالية',
        viewDetails: 'عرض التفاصيل',
        payNow: 'ادفع الآن',
        writeReview: 'اكتب مراجعة',
        cancel: 'إلغاء',
        total: 'السعر الإجمالي'
      },
      filters: {
        bookingDate: 'تاريخ الحجز',
        priceRange: 'نطاق السعر (د.ب في اليوم)',
        location: 'الموقع',
        minGuests: 'الحد الأدنى للضيوف',
        tentTypes: 'أنواع الخيام',
        amenities: 'الخدمات',
        minRating: 'أدنى تقييم',
        apply: 'تطبيق الفلاتر',
        reset: 'إعادة التعيين',
        clearDate: 'مسح التاريخ',
        selectDate: 'اختر تاريخاً',
        findAvailable: 'اعثر على المخيمات المتاحة للتاريخ المحدد',
        largeTents: 'خيام كبيرة',
        smallTents: 'خيام صغيرة',
        entertainmentTents: 'خيام ترفيهية',
        allRatings: 'كل التقييمات',
        up: 'وأعلى'
      },
      status: {
        confirmed: 'مؤكد',
        pending: 'معلق',
        cancelled: 'ملغي',
        na: 'غير متوفر'
      }
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
