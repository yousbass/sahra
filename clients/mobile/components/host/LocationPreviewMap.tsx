/**
 * Web fallback — react-native-maps is not available on web.
 * Mirrors the CampMapView.tsx pattern: exists so the import doesn't pull
 * react-native-maps into the web bundle. Renders nothing on web.
 */
interface Props {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LocationPreviewMap(_props: Props) {
  return null;
}
