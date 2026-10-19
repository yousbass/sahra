import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Camp } from '@/lib/firestore';
import { CampMapPin } from './CampMapPin';

/** Bahrain island — fits the whole country comfortably on a phone screen. */
const BAHRAIN_REGION: Region = {
  latitude: 26.0667,
  longitude: 50.5577,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

interface Props {
  camps: Camp[];
  selectedCampId: string | null;
  onCampSelect: (camp: Camp | null) => void;
  showUserLocation: boolean;
}

export function CampMapView({ camps, selectedCampId, onCampSelect, showUserLocation }: Props) {
  const mapRef = useRef<MapView>(null);

  // Only camps that have valid coordinates — others are still shown in list mode.
  const mappable = camps.filter(
    c => typeof c.coordinates?.lat === 'number' && typeof c.coordinates?.lng === 'number'
  );

  const handleMarkerPress = useCallback(
    (camp: Camp) => {
      // Tapping the already-selected pin deselects it.
      onCampSelect(camp.id === selectedCampId ? null : camp);
    },
    [selectedCampId, onCampSelect]
  );

  const handleMapPress = useCallback(() => {
    if (selectedCampId) onCampSelect(null);
  }, [selectedCampId, onCampSelect]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={BAHRAIN_REGION}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        onPress={handleMapPress}
      >
        {mappable.map(camp => (
          <Marker
            key={camp.id}
            coordinate={{
              latitude: camp.coordinates!.lat,
              longitude: camp.coordinates!.lng,
            }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            onPress={() => handleMarkerPress(camp)}
          >
            <CampMapPin
              price={camp.pricePerNight}
              isKashta={camp.listingType === 'kashta'}
              selected={camp.id === selectedCampId}
            />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
