import type { BlockReasonCategory, TentConfig } from './hostListings';

/**
 * Amenity/feature catalogs for the host listing form.
 *
 * IMPORTANT (shared live Firestore): amenity values, water activity values and
 * block reason labels are stored as the SAME raw English strings the web
 * clients write. Only the DISPLAYED label is translated here.
 */

// Web parity: AMENITIES in sahra pages/CreateListing.tsx
export const CAMP_AMENITIES: Record<string, string[]> = {
  essential: ['Restrooms', 'Kitchen', 'Electricity', 'Lighting', 'Water Supply'],
  cooking: ['Fire Pit', 'BBQ Grill', 'Cooking Equipment', 'Dining Area'],
  entertainment: ['Sound System', 'TV Available', 'Volleyball Court', 'Soccer Court', 'Bouncy Castle'],
  comfort: ['Furnished Tents', 'Carpeted Tents', 'Sofas & Seating', 'Tea Sets', 'Air Conditioning'],
  activities: ['Dune Buggies', 'Desert Tours', 'Camel Rides', 'Stargazing Area', 'Biking'],
  other: ['Parking', 'Pet Friendly', 'Family Friendly', 'Security/Guards', 'Food Truck Access'],
};

// Web parity: KASHTA_AMENITIES in sahra types/listing.ts
export const KASHTA_AMENITIES: Record<string, string[]> = {
  essential: ['Restrooms', 'Fresh Water', 'Lighting', 'Parking Area'],
  seating: ['Cushioned Seating', 'Beach Chairs', 'Umbrellas', 'Pergola', 'Tent Shade'],
  cooking: ['BBQ Grill', 'Cooking Area', 'Dining Setup', 'Ice Cooler'],
  entertainment: ['Sound System', 'Beach Volleyball', 'Water Sports Equipment'],
  comfort: ['Fans', 'Misting System', 'Privacy Screens', 'Beach Mats'],
  activities: ['Swimming Area', 'Fishing Spot', 'Boat Access', 'Snorkeling Gear'],
};

// Arabic labels for stored-in-English values. Camp entries match the web's
// createListing.amenityItems translations; kashta-only entries are new here
// (the web falls back to English for those).
const AMENITY_AR: Record<string, string> = {
  Restrooms: 'دورات مياه',
  Kitchen: 'مطبخ',
  Electricity: 'كهرباء',
  Lighting: 'إضاءة',
  'Water Supply': 'إمدادات المياه',
  'Fire Pit': 'حفرة نار',
  'BBQ Grill': 'شواية باربيكيو',
  'Cooking Equipment': 'معدات الطبخ',
  'Dining Area': 'منطقة تناول الطعام',
  'Sound System': 'نظام صوتي',
  'TV Available': 'تلفزيون متاح',
  'Volleyball Court': 'ملعب كرة طائرة',
  'Soccer Court': 'ملعب كرة قدم',
  'Bouncy Castle': 'قلعة نطاطة',
  'Furnished Tents': 'خيام مفروشة',
  'Carpeted Tents': 'خيام مفروشة بالسجاد',
  'Sofas & Seating': 'أرائك ومقاعد',
  'Tea Sets': 'أطقم شاي',
  'Air Conditioning': 'تكييف هواء',
  'Dune Buggies': 'عربات الكثبان الرملية',
  'Desert Tours': 'جولات صحراوية',
  'Camel Rides': 'ركوب الجمال',
  'Stargazing Area': 'منطقة مراقبة النجوم',
  Biking: 'ركوب الدراجات',
  Parking: 'موقف سيارات',
  'Pet Friendly': 'مناسب للحيوانات الأليفة',
  'Family Friendly': 'مناسب للعائلات',
  'Security/Guards': 'أمن/حراس',
  'Food Truck Access': 'وصول شاحنات الطعام',
  // Kashta-only amenities
  'Fresh Water': 'مياه عذبة',
  'Parking Area': 'موقف سيارات',
  'Cushioned Seating': 'جلسات مريحة',
  'Beach Chairs': 'كراسي شاطئ',
  Umbrellas: 'مظلات',
  Pergola: 'برجولة',
  'Tent Shade': 'مظلة خيمة',
  'Cooking Area': 'منطقة طبخ',
  'Dining Setup': 'تجهيزات طعام',
  'Ice Cooler': 'مبرد ثلج',
  'Beach Volleyball': 'كرة طائرة شاطئية',
  'Water Sports Equipment': 'معدات رياضات مائية',
  Fans: 'مراوح',
  'Misting System': 'نظام رذاذ',
  'Privacy Screens': 'سواتر خصوصية',
  'Beach Mats': 'فرشات شاطئ',
  'Swimming Area': 'منطقة سباحة',
  'Fishing Spot': 'موقع صيد',
  'Boat Access': 'وصول للقوارب',
  'Snorkeling Gear': 'معدات غطس',
};

export const amenityLabel = (name: string, lang: string): string =>
  lang === 'ar' ? AMENITY_AR[name] || name : name;

export const AMENITY_CATEGORY_KEYS: Record<string, string> = {
  essential: 'amenCatEssential',
  seating: 'amenCatSeating',
  cooking: 'amenCatCooking',
  entertainment: 'amenCatEntertainment',
  comfort: 'amenCatComfort',
  activities: 'amenCatActivities',
  other: 'amenCatOther',
};

export type TentFeatureKey = keyof Pick<
  TentConfig,
  | 'furnished'
  | 'carpeted'
  | 'tv'
  | 'sofas'
  | 'teaSets'
  | 'pingPongTable'
  | 'foosballTable'
  | 'airHockeyTable'
  | 'volleyballField'
  | 'footballField'
>;

export const TENT_FEATURES: { key: TentFeatureKey; i18nKey: string }[] = [
  { key: 'furnished', i18nKey: 'featFurnished' },
  { key: 'carpeted', i18nKey: 'featCarpeted' },
  { key: 'tv', i18nKey: 'featTv' },
  { key: 'sofas', i18nKey: 'featSofas' },
  { key: 'teaSets', i18nKey: 'featTeaSets' },
  { key: 'pingPongTable', i18nKey: 'featPingPong' },
  { key: 'foosballTable', i18nKey: 'featFoosball' },
  { key: 'airHockeyTable', i18nKey: 'featAirHockey' },
  { key: 'volleyballField', i18nKey: 'featVolleyball' },
  { key: 'footballField', i18nKey: 'featFootball' },
];

export const TENT_TYPES: { value: TentConfig['type']; i18nKey: string }[] = [
  { value: 'large', i18nKey: 'hostTentLarge' },
  { value: 'small', i18nKey: 'hostTentSmall' },
  { value: 'entertainment', i18nKey: 'hostTentEntertainment' },
];

// Stored values match the web KashtaSpecificForm exactly.
export const WATER_ACTIVITIES: { value: string; i18nKey: string }[] = [
  { value: 'swimming', i18nKey: 'waSwimming' },
  { value: 'fishing', i18nKey: 'waFishing' },
  { value: 'snorkeling', i18nKey: 'waSnorkeling' },
  { value: 'boating', i18nKey: 'waBoating' },
];

export const SHADE_TYPES: { value: 'tent' | 'umbrella' | 'pergola' | 'natural'; i18nKey: string }[] = [
  { value: 'tent', i18nKey: 'shadeTent' },
  { value: 'umbrella', i18nKey: 'shadeUmbrella' },
  { value: 'pergola', i18nKey: 'shadePergola' },
  { value: 'natural', i18nKey: 'shadeNatural' },
];

export const VIEW_TYPES: { value: 'beach' | 'mixed'; i18nKey: string }[] = [
  { value: 'beach', i18nKey: 'viewBeach' },
  { value: 'mixed', i18nKey: 'viewMixed' },
];

// Web parity: BLOCKING_REASONS in sahra components/DateRangePicker.tsx.
// `label` is the raw English string persisted in blockedDates.reason.
export const BLOCK_REASONS: { value: BlockReasonCategory; label: string; i18nKey: string }[] = [
  { value: 'maintenance', label: 'Maintenance/Repairs', i18nKey: 'reasonMaintenance' },
  { value: 'personal', label: 'Personal Use', i18nKey: 'reasonPersonal' },
  { value: 'weather', label: 'Weather Conditions', i18nKey: 'reasonWeather' },
  { value: 'event', label: 'Special Event', i18nKey: 'reasonEvent' },
  { value: 'seasonal', label: 'Seasonal Closure', i18nKey: 'reasonSeasonal' },
  { value: 'other', label: 'Other', i18nKey: 'reasonOther' },
];
