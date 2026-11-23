import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FuelType, StationWithPrices } from '@/types/database.types';
import { ProfecoBadge } from '@/components/ProfecoBadge';
import {
  formatDistanceKm,
  formatPriceMXN,
  getFuelPrice,
} from '@/utils/distanceHelper';
import { getStationScheduleStatus } from '@/utils/scheduleHelper';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

interface StationCardProps {
  station: StationWithPrices;
  selectedFuel: FuelType;
  onPress: (station: StationWithPrices) => void;
  highlighted?: boolean;
  compact?: boolean;
}

function getBrandColors(brand: string): { bg: string; text: string } {
  const normalized = brand.toLowerCase();
  if (normalized.includes('pemex')) return { bg: '#DCFCE7', text: '#166534' };
  if (normalized.includes('mobil')) return { bg: '#DBEAFE', text: '#1E40AF' };
  if (normalized.includes('oxxo')) return { bg: '#FEE2E2', text: '#991B1B' };
  if (normalized.includes('petro')) return { bg: '#FFEDD5', text: '#9A3412' };
  if (normalized.includes('bp')) return { bg: '#ECFCCB', text: '#3F6212' };
  return { bg: colors.primaryLight, text: colors.primaryDark };
}

/**
 * Tarjeta reutilizable de gasolinera:
 * muestra logotipo/marca, nombre, precio en MXN, dirección, badge Profeco,
 * distancia en km, calificación promedio y estado Abierta / Cerrada ahora.
 */
export function StationCard({
  station,
  selectedFuel,
  onPress,
  highlighted = false,
  compact = false,
}: StationCardProps) {
  const activePrice = getFuelPrice(station, selectedFuel);
  const schedule = getStationScheduleStatus(
    station.is_24_hours,
    station.opens_at,
    station.closes_at
  );
  const brandStyle = getBrandColors(station.brand);

  return (
    <Pressable
      onPress={() => onPress(station)}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        highlighted && styles.cardHighlighted,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${station.name}, precio ${formatPriceMXN(activePrice)}, ${schedule.label}`}
    >
      <View style={styles.topSection}>
        {/* Logotipo o iniciales de marca */}
        {station.logo_url ? (
          <Image source={{ uri: station.logo_url }} style={styles.logoImage} />
        ) : (
          <View style={[styles.brandAvatar, { backgroundColor: brandStyle.bg }]}>
            <Text style={[styles.brandInitials, { color: brandStyle.text }]}>
              {station.brand.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Información central */}
        <View style={styles.infoColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {station.address}
          </Text>

          <View style={styles.metaRow}>
            {/* Calificación */}
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color={colors.accent} />
              <Text style={styles.ratingText}>
                {station.avg_rating > 0 ? station.avg_rating.toFixed(1) : 'Nuevo'}
              </Text>
              <Text style={styles.reviewCountText}>({station.reviews_count})</Text>
            </View>

            {/* Distancia */}
            {station.distance_km !== null ? (
              <View style={styles.distanceChip}>
                <Ionicons name="navigate" size={11} color={colors.primary} />
                <Text style={styles.distanceText}>
                  {formatDistanceKm(station.distance_km)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Precio MXN destacado */}
        <View style={styles.priceColumn}>
          <Text style={styles.priceValue}>{formatPriceMXN(activePrice)}</Text>
          <Text style={styles.priceUnit}>MXN / L</Text>
        </View>
      </View>

      {/* Pie de tarjeta: Estado Abierta/Cerrada + Badge Profeco */}
      <View style={styles.footerRow}>
        <View
          style={[
            styles.statusBadge,
            schedule.isOpen ? styles.statusOpen : styles.statusClosed,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: schedule.isOpen ? colors.success : colors.danger },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: schedule.isOpen ? colors.success : colors.danger },
            ]}
          >
            {schedule.label}
          </Text>
          {!compact ? (
            <Text style={styles.scheduleSubtext}> · {schedule.scheduleText}</Text>
          ) : null}
        </View>

        <ProfecoBadge certified={station.profeco_certified} compact />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompact: {
    padding: 10,
  },
  cardHighlighted: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.primarySurface,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    resizeMode: 'contain',
    backgroundColor: colors.surfaceMuted,
  },
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitials: {
    ...typography.subtitle,
    fontWeight: '800',
  },
  infoColumn: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  address: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewCountText: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '400',
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  priceValue: {
    ...typography.priceMedium,
    color: colors.primaryDark,
  },
  priceUnit: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 1,
  },
  statusOpen: {
    backgroundColor: colors.successBg,
  },
  statusClosed: {
    backgroundColor: colors.dangerBg,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    marginRight: 5,
  },
  statusText: {
    ...typography.micro,
    fontWeight: '700',
  },
  scheduleSubtext: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
