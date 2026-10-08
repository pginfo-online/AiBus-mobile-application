import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppDivider,
  AppEmptyState,
  AppErrorState,
  AppSectionHeader,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useCitiesQuery, POPULAR_CITIES } from '../../features/cities/useCitiesQuery';
import { useBookingStore, CitySelection } from '../../stores/bookingStore';

export default function FromCityScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useAppTheme();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const setFromCity = useBookingStore((s) => s.setFromCity);

  // 300ms Debounce to prevent unnecessary backend requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: cities, isLoading, isError, refetch } = useCitiesQuery(debouncedQuery);

  const handleSelectCity = (city: CitySelection) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    setFromCity(city);
    router.back();
  };

  const renderCityItem = ({ item }: { item: CitySelection }) => (
    <Pressable
      onPress={() => handleSelectCity(item)}
      style={({ pressed }) => [
        styles.cityRow,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.divider,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Select city ${item.name}`}
    >
      <View
        style={[
          styles.cityIconBox,
          {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: radii.md,
          },
        ]}
      >
        <Ionicons name="location-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ marginLeft: spacing.md, flex: 1 }}>
        <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
          {item.name}
        </AppText>
        <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
          India
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Search Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View
          style={[
            styles.inputBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.md,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('city.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <AppErrorState
          error="Could not load cities. Please check your connection."
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={cities || []}
          keyExtractor={(item) => String(item.providerCityId || item.id)}
          renderItem={renderCityItem}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={() =>
            !debouncedQuery ? (
              <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.md }}>
                <AppSectionHeader title={t('city.popular')} />
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <AppEmptyState
              icon={<Ionicons name="map-outline" size={38} color={colors.textMuted} />}
              title={t('city.no_results')}
              description="Check the spelling or try searching for another major city in India."
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  inputBox: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  cityIconBox: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
