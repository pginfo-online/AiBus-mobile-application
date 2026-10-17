import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppEmptyState,
  AppErrorState,
  AppSkeleton,
} from '../../design-system';
import { useCitiesQuery } from '../../features/cities/useCitiesQuery';
import { useBookingStore, CitySelection } from '../../stores/bookingStore';

export default function ToCityScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useAppTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const setToCity = useBookingStore((s) => s.setToCity);

  // 200ms debounce for responsive autocomplete without excessive requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: cities, isLoading, isError, refetch } = useCitiesQuery(debouncedQuery);

  const handleSelectCity = (city: CitySelection) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
    setToCity(city);
    router.back();
  };

  const renderCityItem = ({ item }: { item: CitySelection }) => (
    <Pressable
      onPress={() => handleSelectCity(item)}
      style={({ pressed }) => [
        styles.cityRow,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Select destination city ${item.name}`}
    >
      <View style={styles.cityIconBox}>
        <Ionicons name="business" size={22} color={colors.text} />
      </View>
      <View style={{ marginLeft: spacing.base, flex: 1 }}>
        <AppText variant="bodyLargeBold" style={[styles.cityName, { color: colors.text }]}>
          {item.name}
        </AppText>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top']}>
      {/* 1. Top Search Header matching ref-2 and ref-3 */}
      <View style={styles.searchHeaderWrapper}>
        <View
          style={[
            styles.pillSearchBar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: radii.full,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search area"
            placeholderTextColor={colors.textMuted}
            style={[styles.textInput, { color: colors.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. Section Header: Popular cities / Search results */}
      <View style={styles.sectionHeaderBox}>
        <AppText variant="heading3" style={[styles.sectionTitle, { color: colors.text }]}>
          {debouncedQuery.trim().length > 0 ? 'Search results' : 'Popular cities'}
        </AppText>
      </View>

      {/* 3. List Content */}
      {isLoading && !cities ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <View key={k} style={styles.skeletonRow}>
              <AppSkeleton width={26} height={26} borderRadius={6} />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <AppSkeleton width={140} height={20} borderRadius={6} />
              </View>
            </View>
          ))}
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <AppEmptyState
              icon={<Ionicons name="location-outline" size={40} color={colors.textMuted} />}
              title="No cities found"
              description="Check the spelling or try searching for another city."
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
  searchHeaderWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  pillSearchBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  backButton: {
    marginRight: 10,
    padding: 2,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
  },
  sectionHeaderBox: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  listContent: {
    paddingBottom: 40,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityIconBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
});
