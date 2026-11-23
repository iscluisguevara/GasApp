import { Coordinates, FuelType, StationWithPrices } from '@/types/database.types';

/**
 * Coordenadas centrales de referencia en Heroica Matamoros, Tamaulipas.
 */
export const MATAMOROS_CENTER: Coordinates = {
  latitude: 25.869,
  longitude: -97.5027,
};

/**
 * Formatea un precio en pesos mexicanos (ej. 19.89 -> "$19.89").
 */
export function formatPriceMXN(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return 'N/D';
  }
  return `$${Number(price).toFixed(2)}`;
}

/**
 * Formatea una distancia en kilómetros (o metros si es menor a 1 km).
 */
export function formatDistanceKm(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined || Number.isNaN(distanceKm)) {
    return '-- km';
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Obtiene el precio correspondiente al tipo de combustible seleccionado.
 */
export function getFuelPrice(
  station: Pick<StationWithPrices, 'regular_price' | 'premium_price' | 'diesel_price'>,
  fuelType: FuelType
): number | null {
  switch (fuelType) {
    case 'regular':
      return station.regular_price;
    case 'premium':
      return station.premium_price;
    case 'diesel':
      return station.diesel_price;
  }
}

/**
 * Etiqueta legible en español mexicano para cada tipo de combustible.
 */
export function getFuelLabel(fuelType: FuelType): string {
  switch (fuelType) {
    case 'regular':
      return 'Regular (Magna)';
    case 'premium':
      return 'Premium';
    case 'diesel':
      return 'Diésel';
  }
}

/**
 * Fórmula de Haversine como cálculo de respaldo en cliente (en kilómetros).
 */
export function calculateHaversineKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}
