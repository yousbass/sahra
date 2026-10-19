import { Camp } from '@/lib/firestore';

/**
 * Web fallback — react-native-maps is not available on web.
 * ExploreScreen automatically stays in list mode on web (Platform.OS === 'web'),
 * so this component is never actually rendered. It exists to satisfy the
 * import without bundling react-native-maps into the web bundle.
 */
interface Props {
  camps: Camp[];
  selectedCampId: string | null;
  onCampSelect: (camp: Camp | null) => void;
  showUserLocation: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CampMapView(_props: Props) {
  return null;
}
