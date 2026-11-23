import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StationSortOption } from '@/types/database.types';
import { colors } from '@/theme/colors';
import { radius, spacing, typography } from '@/theme/typography';

interface FilterTabsProps {
  activeFilter: StationSortOption;
  onSelectFilter: (filter: StationSortOption) => void;
}

const FILTER_TABS: Array<{
  key: StationSortOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'price', label: 'Menor Precio', icon: 'pricetag-outline' },
  { key: 'rating', label: 'Mejor Calificada', icon: 'star-outline' },
  { key: 'distance', label: 'Más Cercana', icon: 'navigate-outline' },
];

/**
 * Pestañas de ordenamiento y vista principal:
 * "Menor Precio", "Mejor Calificada" y "Más Cercana" (activa vista dividida con mapa).
 */
export function FilterTabs({ activeFilter, onSelectFilter }: FilterTabsProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectFilter(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={isActive ? colors.textInverse : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabLabel, isActive && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textInverse,
  },
});
