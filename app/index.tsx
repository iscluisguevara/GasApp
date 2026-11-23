import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '@/components/HeaderBar';
import { FilterTabs } from '@/components/FilterTabs';
import { StationCard } from '@/components/StationCard';
import { SplitMapView } from '@/components/SplitMapView';
import { useLocation } from '@/hooks/useLocation';
import { useStations } from '@/hooks/useStations';
import {
  FuelType,
  StationSortOption,
  StationWithPrices,
} from '@/types/database.types';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

/**
 * Pantalla Home principal de GasoMatamoros.
 * Alterna entre lista ordenada ("Menor Precio" / "Mejor Calificada")
 * y vista dividida Mapa 50% + Lista por km 50% ("Más Cercana").
 */
export default function HomeScreen() {
  const router = useRouter();
  const [selectedFuel, setSelectedFuel] = useState<FuelType>('regular');
  const [activeFilter, setActiveFilter] = useState<StationSortOption>('price');

  const {
    location,
    isUsingFallback,
    refreshLocation,
  } = useLocation();

  const {
    stations,
    isLoading,
    isRefreshing,
    error,
    refetch,
  } = useStations({
    userLocation: location,
    sortBy: activeFilter,
    fuelType: selectedFuel,
  });

  const handleOpenStation = (station: StationWithPrices) => {
    router.push({
      pathname: '/station/[id]',
      params: { id: station.id },
    });
  };

  const renderContent = () => {
    if (isLoading && stations.length === 0) {
      return (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateTitle}>Buscando precios en Matamoros...</Text>
          <Text style={styles.stateSubtitle}>
            Consultando estaciones y distancias en tiempo real.
          </Text>
        </View>
      );
    }

    if (error && stations.length === 0) {
      return (
        <View style={styles.centeredState}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
          </View>
          <Text style={styles.stateTitle}>No pudimos cargar las gasolineras</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <Pressable
            onPress={refetch}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Ionicons name="refresh" size={16} color={colors.textInverse} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    if (stations.length === 0) {
      return (
        <View style={styles.centeredState}>
          <Ionicons name="car-outline" size={40} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Sin estaciones disponibles</Text>
          <Text style={styles.stateSubtitle}>
            Aún no hay precios registrados para este combustible.
          </Text>
        </View>
      );
    }

    if (activeFilter === 'distance') {
      return (
        <SplitMapView
          stations={stations}
          userLocation={location}
          selectedFuel={selectedFuel}
          isRefreshing={isRefreshing}
          onRefresh={refetch}
          onSelectStation={handleOpenStation}
        />
      );
    }

    return (
      <FlatList
        data={stations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <StationCard
            station={item}
            selectedFuel={selectedFuel}
            onPress={handleOpenStation}
          />
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <HeaderBar
        selectedFuel={selectedFuel}
        onSelectFuel={setSelectedFuel}
        isUsingFallbackLocation={isUsingFallback}
        onRefreshLocation={refreshLocation}
      />

      <FilterTabs
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      <View style={styles.contentArea}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.md,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
