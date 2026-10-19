// Official Bahrain Camping Locations
// Centralized list used across the platform for consistency

export interface CampingLocation {
  value: string;
  label: string;
  region: string;
}

// All Bahrain Cities and Areas - Updated for Kashta (can be anywhere in Bahrain)
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
  
  // Sakhir Desert (Traditional Camping Areas)
  { value: 'al-masna-at', label: "Al-Masna'at (المصنعات)", region: 'Sakhir Desert' },
  { value: 'hafira', label: 'Hafira (حفيرة)', region: 'Sakhir Desert' },
  { value: 'al-qarra', label: 'Al-Qarra (القارة)', region: 'Sakhir Desert' },
  { value: 'janoub-al-qarra', label: 'Janoub Al-Qarra - South Al-Qarra (جنوب القارة)', region: 'Sakhir Desert' },
  { value: 'al-amr', label: 'Al-Amr (العمر)', region: 'Sakhir Desert' },
  { value: 'sharq-al-amr', label: 'Sharq Al-Amr - East Al-Amr (شرق العمر)', region: 'Sakhir Desert' },
  { value: 'hmeira', label: 'Hmeira (حميرة)', region: 'Sakhir Desert' },
  { value: 'al-aqeesh', label: 'Al-Aqeesh (Shajarat Al-Hayat) - Tree of Life Area (العقيش)', region: 'Sakhir Desert' },
  { value: 'jabal-al-dukhan', label: 'Jabal Al-Dukhan - Smoke Mountain (جبل الدخان)', region: 'Sakhir Desert' },
  
  // Other Areas
  { value: 'al-areen', label: 'Al Areen Wildlife Park & Reserve', region: 'Al Areen' },
  { value: 'sitra', label: 'Sitra (سترة)', region: 'Central Bahrain' },
  { value: 'tubli', label: 'Tubli (توبلي)', region: 'Central Bahrain' },
  { value: 'amwaj-islands', label: 'Amwaj Islands (جزر أمواج)', region: 'Muharraq Governorate' },
];

// Helper function to get location label by value
export const getLocationLabel = (value: string): string => {
  const location = BAHRAIN_CAMPING_LOCATIONS.find(loc => loc.value === value);
  return location ? location.label : value;
};

// Helper function to get all location labels (for filtering)
export const getAllLocationLabels = (): string[] => {
  return BAHRAIN_CAMPING_LOCATIONS.map(loc => loc.label);
};