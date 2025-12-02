// Official Bahrain Camping Locations
// Centralized list used across the platform for consistency

export interface CampingLocation {
  value: string;
  label: string;
  region: string;
}

export const BAHRAIN_CAMPING_LOCATIONS: CampingLocation[] = [
  // Official Sakhir Desert Camping Zones (2023-2024 Season)
  { value: 'al-masna-at', label: "Al-Masna'at (المصنعات)", region: 'Sakhir Desert' },
  { value: 'hafira', label: 'Hafira (حفيرة)', region: 'Sakhir Desert' },
  { value: 'al-qarra', label: 'Al-Qarra (القارة)', region: 'Sakhir Desert' },
  { value: 'janoub-al-qarra', label: 'Janoub Al-Qarra - South Al-Qarra (جنوب القارة)', region: 'Sakhir Desert' },
  { value: 'al-amr', label: 'Al-Amr (العمر)', region: 'Sakhir Desert' },
  { value: 'sharq-al-amr', label: 'Sharq Al-Amr - East Al-Amr (شرق العمر)', region: 'Sakhir Desert' },
  { value: 'hmeira', label: 'Hmeira (حميرة)', region: 'Sakhir Desert' },
  { value: 'al-aqeesh', label: 'Al-Aqeesh (Shajarat Al-Hayat) - Tree of Life Area (العقيش)', region: 'Sakhir Desert' },
  
  // Other Popular Bahrain Camping Areas
  { value: 'jabal-al-dukhan', label: 'Jabal Al-Dukhan - Smoke Mountain (جبل الدخان)', region: 'Central Bahrain' },
  { value: 'al-areen', label: 'Al Areen Wildlife Park & Reserve', region: 'Al Areen' },
  { value: 'zallaq', label: 'Zallaq Beach Area', region: 'Zallaq' },
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