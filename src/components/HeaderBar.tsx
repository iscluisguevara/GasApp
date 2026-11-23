import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FuelType } from '@/types/database.types';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

interface HeaderBarProps {
  selectedFuel: FuelType;
  onSelectFuel: (fuel: FuelType) => void;
  isUsingFallbackLocation: boolean;
  onRefreshLocation?: () => void;
}

const FUEL_OPTIONS: Array<{
  key: FuelType;
  label: string;
  activeBg: string;
  activeText: string;
}> = [
  {
    key: 'regular',
    label: 'Regular',
    activeBg: colors.fuelRegular,
    activeText: colors.textInverse,
  },
  {
    key: 'premium',
    label: 'Premium',
    activeBg: colors.fuelPremium,
    activeText: colors.textInverse,
  },
  {
    key: 'diesel',
    label: 'Diésel',
    activeBg: colors.fuelDiesel,
    activeText: colors.textInverse,
  },
];

/**
 * Barra superior con marca de la app, ciudad activa y selector rápido de combustible.
 */
export function HeaderBar({
  selectedFuel,
  onSelectFuel,
  isUsingFallbackLocation,
  onRefreshLocation,
}: HeaderBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          <View style={styles.logoCircle}>
            <Ionicons name="flame" size={20} color={colors.textInverse} />
          </View>
          <View>
            <Text style={styles.appName}>GasoMatamoros</Text>
            <View style={styles.cityRow}>
              <Ionicons name="location-sharp" size={12} color={colors.primary} />
              <Text style={styles.cityText}>
                Matamoros, Tamps.
                {isUsingFallbackLocation ? ' (Centro)' : ' · GPS activo'}
              </Text>
            </View>
          </View>
        </View>

        {onRefreshLocation ? (
          <Pressable
            onPress={onRefreshLocation}
            style={({ pressed }) => [
              styles.gpsButton,
              pressed && styles.gpsButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Actualizar ubicación GPS"
          >
            <Ionicons name="locate" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.fuelSelector} accessibilityRole="tablist">
        {FUEL_OPTIONS.map((option) => {
          const isActive = selectedFuel === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => onSelectFuel(option.key)}
              style={[
                styles.fuelPill,
                isActive && { backgroundColor: option.activeBg },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.fuelPillText,
                  isActive && { color: option.activeText },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  cityText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  gpsButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsButtonPressed: {
    opacity: 0.7,
  },
  fuelSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 3,
    gap: 4,
  },
  fuelPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuelPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
