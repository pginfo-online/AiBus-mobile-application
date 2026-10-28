import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../../design-system/theme';
import { AppText, AppCard, AppBadge } from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useOffersQuery } from '../../features/offers';
import { CouponItem } from '../../types/api';
import { useBookingStore } from '../../stores/bookingStore';

const CATEGORIES = ['All', 'Bus', 'Train', 'Metro', 'Hotel'] as const;
type CategoryType = (typeof CATEGORIES)[number];

export default function OffersScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: offers = [], isLoading, refetch, isRefetching } = useOffersQuery(
    selectedCategory === 'All' ? undefined : selectedCategory
  );

  const activeHold = useBookingStore((s) => s.activeHold);
  const applyCoupon = useBookingStore((s) => s.applyCoupon);

  const handleCopyCode = async (code: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    await Clipboard.setStringAsync(code);
    setCopiedCode(code);

    if (Platform.OS === 'android') {
      ToastAndroid.show(`Coupon ${code} copied to clipboard!`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied!', `Coupon code ${code} copied to clipboard.`);
    }

    setTimeout(() => {
      setCopiedCode(null);
    }, 3000);
  };

  const handleSelectOffer = (offer: CouponItem) => {
    try {
      Haptics.selectionAsync();
    } catch {}

    router.push({
      pathname: '/offers/[code]' as any,
      params: { code: offer.code },
    });
  };

  const filteredOffers = useMemo(() => {
    if (selectedCategory === 'All') return offers;
    return offers.filter((o) => o.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [offers, selectedCategory]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]} edges={['top']}>
      {/* 1. Top Header matching ref-3 */}
      <View style={styles.header}>
        <AppText variant="heading2" style={{ color: '#0F172A', fontWeight: '800' }}>
          {t('offers.title')}
        </AppText>
        <AppText variant="caption" style={{ color: '#64748B', marginTop: 2 }}>
          Exclusive discounts & promotional vouchers
        </AppText>
      </View>

      {/* 2. Horizontal Filter Pills matching ref-3 */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedCategory(cat);
                }}
                style={[
                  styles.filterPill,
                  isSelected
                    ? { backgroundColor: '#D92D20', borderColor: '#D92D20' }
                    : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <AppText
                  variant="bodyMedium"
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? '#FFFFFF' : '#334155',
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {cat === 'All'
                    ? t('offers.all')
                    : cat === 'Bus'
                    ? t('offers.bus')
                    : cat === 'Train'
                    ? t('offers.train')
                    : cat === 'Metro'
                    ? t('offers.metro')
                    : t('offers.hotel')}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Offers List matching ref-3 */}
      <ScrollView
        contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={['#D92D20']} />
        }
      >
        {activeHold && (
          <View style={styles.bookingInProgressBanner}>
            <Ionicons name="flash" size={18} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <AppText variant="bodySmallMedium" style={{ color: '#92400E', fontWeight: '700' }}>
                Active Seat Hold Found
              </AppText>
              <AppText variant="caption" style={{ color: '#B45309' }}>
                Tap any coupon to copy code and apply it on your checkout screen.
              </AppText>
            </View>
          </View>
        )}

        {filteredOffers.map((offer) => {
          const isCopied = copiedCode === offer.code;

          return (
            <Pressable
              key={offer.id || offer.code}
              onPress={() => handleSelectOffer(offer)}
              style={({ pressed }) => [
                styles.offerCard,
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                {/* Category Icon */}
                <View
                  style={[
                    styles.categoryIconCircle,
                    {
                      backgroundColor:
                        offer.category === 'Bus'
                          ? '#FEE2E2'
                          : offer.category === 'Train'
                          ? '#E0E7FF'
                          : '#FEF3C7',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      offer.category === 'Bus'
                        ? 'bus'
                        : offer.category === 'Train'
                        ? 'train'
                        : 'business'
                    }
                    size={20}
                    color={
                      offer.category === 'Bus'
                        ? '#DC2626'
                        : offer.category === 'Train'
                        ? '#4338CA'
                        : '#D97706'
                    }
                  />
                </View>

                {/* Offer Headline & Category */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="caption" style={styles.categoryLabel}>
                    {offer.category}
                  </AppText>
                  <AppText variant="bodyLargeBold" style={styles.offerTitle} numberOfLines={2}>
                    {offer.title}
                  </AppText>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                {/* Expiry Pill */}
                <View style={styles.expiryPill}>
                  <Ionicons name="time-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <AppText variant="caption" style={styles.expiryText}>
                    {offer.formattedExpiry}
                  </AppText>
                </View>

                {/* Coupon Code Pill with Copy Action */}
                <Pressable
                  onPress={() => handleCopyCode(offer.code)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.codePill,
                    {
                      backgroundColor: isCopied ? '#ECFDF5' : '#F8FAFC',
                      borderColor: isCopied ? '#10B981' : '#CBD5E1',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Copy coupon code ${offer.code}`}
                >
                  <AppText
                    variant="bodyMedium"
                    style={[
                      styles.codeText,
                      { color: isCopied ? '#059669' : '#0F172A' },
                    ]}
                  >
                    {offer.code}
                  </AppText>
                  <Ionicons
                    name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                    size={16}
                    color={isCopied ? '#059669' : '#64748B'}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {filteredOffers.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={48} color="#94A3B8" />
            <AppText variant="bodyLargeBold" style={{ color: '#475569', marginTop: 12 }}>
              No offers in this category
            </AppText>
            <AppText variant="caption" style={{ color: '#94A3B8', marginTop: 4, textAlign: 'center' }}>
              Check back soon for new discounts and exclusive promotional deals.
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    gap: 14,
  },
  bookingInProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  offerTitle: {
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 20,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  codeText: {
    fontWeight: '800',
    letterSpacing: 0.5,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
});
