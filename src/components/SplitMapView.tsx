import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import {
  Coordinates,
  FuelType,
  StationWithPrices,
} from '@/types/database.types';
import { StationCard } from '@/components/StationCard';
import {
  formatDistanceKm,
  formatPriceMXN,
  getFuelPrice,
  MATAMOROS_CENTER,
} from '@/utils/distanceHelper';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

interface SplitMapViewProps {
  stations: StationWithPrices[];
  userLocation: Coordinates;
  selectedFuel: FuelType;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelectStation: (station: StationWithPrices) => void;
}

/**
 * Vista dividida 50% / 50% activada en el filtro "Más Cercana":
 * - Mitad superior (50%): Mapa interactivo en Matamoros con pines de precio MXN.
 * - Mitad inferior (50%): Lista ordenada por distancia en kilómetros.
 */
export function SplitMapView({
  stations,
  userLocation,
  selectedFuel,
  isRefreshing,
  onRefresh,
  onSelectStation,
}: SplitMapViewProps) {
  const mapRef = useRef<MapView | null>(null);
  const [focusedStationId, setFocusedStationId] = useState<string | null>(null);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: userLocation.latitude || MATAMOROS_CENTER.latitude,
      longitude: userLocation.longitude || MATAMOROS_CENTER.longitude,
      latitudeDelta: 0.055,
      longitudeDelta: 0.055,
    }),
    [userLocation.latitude, userLocation.longitude]
  );

  const handleMarkerPress = (station: StationWithPrices) => {
    setFocusedStationId(station.id);
    mapRef.current?.animateToRegion(
      {
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      350
    );
  };

  return (
    <View style={styles.container}>
      {/* Mitad superior (50%): Mapa */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {stations.map((station) => {
            const isFocused = focusedStationId === station.id;
            const price = getFuelPrice(station, selectedFuel);

            return (
              <Marker
                key={station.id}
                coordinate={{
                  latitude: station.latitude,
                  longitude: station.longitude,
                }}
                title={station.name}
                description={`${formatPriceMXN(price)} · ${formatDistanceKm(station.distance_km)}`}
                onPress={() => handleMarkerPress(station)}
                onCalloutPress={() => onSelectStation(station)}
              >
                <View
                  style={[
                    styles.pricePin,
                    isFocused && styles.pricePinFocused,
                  ]}
                >
                  <Text
                    style={[
                      styles.pricePinText,
                      isFocused && styles.pricePinTextFocused,
                    ]}
                  >
                    {formatPriceMXN(price)}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* Mitad inferior (50%): Lista ordenada por km */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>
            Ordenadas por distancia ({stations.length})
          </Text>
          <Text style={styles.listHeaderHint}>Toca para ver detalle</Text>
        </View>

        <FlatList
          data={stations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <StationCard
              station={item}
              selectedFuel={selectedFuel}
              onPress={onSelectStation}
              highlighted={focusedStationId === item.id}
              compact
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pricePin: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pricePinFocused: {
    backgroundColor: colors.primary,
    borderColor: colors.textInverse,
    transform: [{ scale: 1.08 }],
  },
  pricePinText: {
    ...typography.micro,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  pricePinTextFocused: {
    color: colors.textInverse,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listHeaderTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listHeaderHint: {
    ...typography.micro,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.sm,
  },
});
