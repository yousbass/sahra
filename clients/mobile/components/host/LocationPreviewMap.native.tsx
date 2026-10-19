import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, MapPressEvent, MarkerDragStartEndEvent } from 'react-native-maps';

interface Props {
  lat: number;
  lng: number;
  /**
   * When provided, the pin becomes draggable and the map tappable so hosts
   * can fine-tune the exact camp location. Called with the new coordinates.
   */
  onChange?: (lat: number, lng: number) => void;
}

/**
 * Mini map preview showing the host's chosen camp location as a pin.
 * Mirrors the mini-map preview on the web EditListing pages.
 * With `onChange`, the pin can be dragged (or the map tapped) to adjust it.
 */
export function LocationPreviewMap({ lat, lng, onChange }: Props) {
  const interactive = Boolean(onChange);
  const mapRef = useRef<MapView>(null);
  // Skip recentering when the coordinate change originated from the map itself
  const selfUpdate = useRef(false);

  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      300
    );
  }, [lat, lng]);

  const emitChange = (latitude: number, longitude: number) => {
    selfUpdate.current = true;
    onChange?.(latitude, longitude);
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    emitChange(latitude, longitude);
  };

  const handleDragEnd = (e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    emitChange(latitude, longitude);
  };

  return (
    <View style={styles.container} pointerEvents={interactive ? 'auto' : 'none'}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onPress={interactive ? handleMapPress : undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          draggable={interactive}
          onDragEnd={interactive ? handleDragEnd : undefined}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: { flex: 1 },
});
