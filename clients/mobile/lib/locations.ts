export interface CampingLocation {
  value: string;
  label: string;
  region: string;
}

export const BAHRAIN_CAMPING_LOCATIONS: CampingLocation[] = [
  // Capital Governorate
  { value: 'manama', label: 'Manama (المنامة)', region: 'Capital Governorate' },
  { value: 'juffair', label: 'Juffair (الجفير)', region: 'Capital Governorate' },
  { value: 'adliya', label: 'Adliya (العدلية)', region: 'Capital Governorate' },
  { value: 'hoora', label: 'Hoora (الحورة)', region: 'Capital Governorate' },
  { value: 'gudaibiya', label: 'Gudaibiya (القضيبية)', region: 'Capital Governorate' },
  
  // Muharraq Governorate
  { value: 'muharraq', label: 'Muharraq (المحرق)', region: 'Muharraq Governorate' },
  { value: 'arad', label: 'Arad (عراد)', region: 'Muharraq Governorate' },
  { value: 'hidd', label: 'Hidd (الحد)', region: 'Muharraq Governorate' },
  { value: 'busaiteen', label: 'Busaiteen (البسيتين)', region: 'Muharraq Governorate' },
  { value: 'dair', label: 'Dair (الدير)', region: 'Muharraq Governorate' },
  
  // Northern Governorate
  { value: 'hamad-town', label: 'Hamad Town (مدينة حمد)', region: 'Northern Governorate' },
  { value: 'budaiya', label: 'Budaiya (البديع)', region: 'Northern Governorate' },
  { value: 'saar', label: 'Saar (سار)', region: 'Northern Governorate' },
  { value: 'janabiyah', label: 'Janabiyah (الجنبية)', region: 'Northern Governorate' },
  { value: 'diraz', label: 'Diraz (الدراز)', region: 'Northern Governorate' },
  { value: 'barbar', label: 'Barbar (باربار)', region: 'Northern Governorate' },
  { value: 'bani-jamra', label: 'Bani Jamra (بني جمرة)', region: 'Northern Governorate' },
  
  // Southern Governorate
  { value: 'isa-town', label: 'Isa Town (مدينة عيسى)', region: 'Southern Governorate' },
  { value: 'riffa', label: 'Riffa (الرفاع)', region: 'Southern Governorate' },
  { value: 'zallaq', label: 'Zallaq (الزلاق)', region: 'Southern Governorate' },
  { value: 'awali', label: 'Awali (العوالي)', region: 'Southern Governorate' },
  { value: 'durrat-al-bahrain', label: 'Durrat Al Bahrain (درة البحرين)', region: 'Southern Governorate' },
  
  // Sakhir Desert
  { value: 'al-masna-at', label: "Al-Masna'at (المصنعات)", region: 'Sakhir Desert' },
  { value: 'hafira', label: 'Hafira (حفيرة)', region: 'Sakhir Desert' },
  { value: 'al-qarra', label: 'Al-Qarra (القارة)', region: 'Sakhir Desert' },
  { value: 'janoub-al-qarra', label: 'Janoub Al-Qarra (جنوب القارة)', region: 'Sakhir Desert' },
  { value: 'al-amr', label: 'Al-Amr (العمر)', region: 'Sakhir Desert' },
  { value: 'sharq-al-amr', label: 'Sharq Al-Amr (شرق العمر)', region: 'Sakhir Desert' },
  { value: 'hmeira', label: 'Hmeira (حميرة)', region: 'Sakhir Desert' },
  { value: 'al-aqeesh', label: 'Tree of Life Area (العقيش)', region: 'Sakhir Desert' },
  { value: 'jabal-al-dukhan', label: 'Smoke Mountain (جبل الدخان)', region: 'Sakhir Desert' },
  
  // Other Areas
  { value: 'al-areen', label: 'Al Areen Wildlife Park', region: 'Al Areen' },
  { value: 'sitra', label: 'Sitra (سترة)', region: 'Central Bahrain' },
  { value: 'tubli', label: 'Tubli (توبلي)', region: 'Central Bahrain' },
  { value: 'amwaj-islands', label: 'Amwaj Islands (جزر أمواج)', region: 'Muharraq Governorate' },
];

export const getLocationLabel = (value: string): string => {
  const location = BAHRAIN_CAMPING_LOCATIONS.find(loc => loc.value === value);
  return location ? location.label : value;
};

const REGION_LABELS_AR: Record<string, string> = {
  'Capital Governorate': 'محافظة العاصمة',
  'Muharraq Governorate': 'محافظة المحرق',
  'Northern Governorate': 'المحافظة الشمالية',
  'Southern Governorate': 'المحافظة الجنوبية',
  'Sakhir Desert': 'صحراء الصخير',
  'Al Areen': 'العرين',
  'Central Bahrain': 'وسط البحرين',
};

export const getRegionLabel = (region: string, lang?: string): string =>
  lang === 'ar' ? REGION_LABELS_AR[region] ?? region : region;

export const getRegions = (): string[] => {
  const regions = new Set(BAHRAIN_CAMPING_LOCATIONS.map(loc => loc.region));
  return Array.from(regions);
};

export const getLocationsByRegion = (region: string): CampingLocation[] => {
  return BAHRAIN_CAMPING_LOCATIONS.filter(loc => loc.region === region);
};
