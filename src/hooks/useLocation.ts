import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Coordinates } from '@/types/database.types';
import { MATAMOROS_CENTER } from '@/utils/distanceHelper';

export interface UseLocationResult {
  location: Coordinates;
  hasPermission: boolean;
  isUsingFallback: boolean;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

/**
 * Custom hook para gestionar permisos de GPS y rastreo de coordenadas en tiempo real.
 * Si el usuario deniega permisos, utiliza el centro de Matamoros como fallback seguro.
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<Coordinates>(MATAMOROS_CENTER);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const requestAndFetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setHasPermission(false);
        setIsUsingFallback(true);
        setLocation(MATAMOROS_CENTER);
        setError('Permiso de ubicación denegado. Mostrando distancias desde el centro de Matamoros.');
        return;
      }

      setHasPermission(true);

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
      setIsUsingFallback(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo obtener tu ubicación actual.';
      setError(message);
      setIsUsingFallback(true);
      setLocation(MATAMOROS_CENTER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function initLocationTracking() {
      await requestAndFetchLocation();

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED || !isMounted) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 50,
        },
        (position) => {
          if (!isMounted) return;
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsUsingFallback(false);
        }
      );
    }

    initLocationTracking();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [requestAndFetchLocation]);

  return {
    location,
    hasPermission,
    isUsingFallback,
    isLoading,
    error,
    refreshLocation: requestAndFetchLocation,
  };
}
