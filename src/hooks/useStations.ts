import { useCallback, useEffect, useState } from 'react';
import { fetchStations } from '@/services/stationsService';
import {
  Coordinates,
  FuelType,
  StationSortOption,
  StationWithPrices,
} from '@/types/database.types';

export interface UseStationsOptions {
  userLocation: Coordinates | null;
  sortBy: StationSortOption;
  fuelType: FuelType;
}

export interface UseStationsResult {
  stations: StationWithPrices[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook de lógica de negocio para consultar, ordenar y refrescar
 * las gasolineras de Matamoros desde Supabase + PostGIS.
 */
export function useStations({
  userLocation,
  sortBy,
  fuelType,
}: UseStationsOptions): UseStationsResult {
  const [stations, setStations] = useState<StationWithPrices[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userLat = userLocation?.latitude ?? null;
  const userLng = userLocation?.longitude ?? null;

  const loadStations = useCallback(
    async (isPullToRefresh: boolean = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const coords: Coordinates | null =
          userLat !== null && userLng !== null
            ? { latitude: userLat, longitude: userLng }
            : null;

        const data = await fetchStations({
          userLocation: coords,
          sortBy,
          fuelType,
        });

        setStations(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al cargar las gasolineras.';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userLat, userLng, sortBy, fuelType]
  );

  useEffect(() => {
    loadStations(false);
  }, [loadStations]);

  const refetch = useCallback(async () => {
    await loadStations(true);
  }, [loadStations]);

  return {
    stations,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
