import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ToastAndroid,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../../design-system/theme';
import { AppText, AppButton, AppCard, AppDivider } from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useOfferDetailsQuery } from '../../features/offers';
import { useBookingStore } from '../../stores/bookingStore';

export default function OfferDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string }>();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const code = params.code || '';
  const { data: offer, isLoading, isError } = useOfferDetailsQuery(code);

  const [copied, setCopied] = useState(false);

  const activeHold = useBookingStore((s) => s.activeHold);
  const applyCoupon = useBookingStore((s) => s.applyCoupon);

  const handleCopyCode = async () => {
    if (!offer) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    await Clipboard.setStringAsync(offer.code);
    setCopied(true);

    if (Platform.OS === 'android') {
      ToastAndroid.show(`Coupon ${offer.code} copied!`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied!', `Coupon code ${offer.code} copied to clipboard.`);
    }

    setTimeout(() => setCopied(false), 3000);
  };

  const handleApplyAndBook = () => {
    if (!offer) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Apply to booking store
    applyCoupon({
      code: offer.code,
      title: offer.title,
      discountAmount: offer.maxDiscount || offer.value,
      coupon: offer,
    });

    if (activeHold) {
      router.navigate('/booking/payment' as any);
    } else {
      Alert.alert(
        'Coupon Saved!',
        `Coupon ${offer.code} will be applied automatically when you book your bus ticket.`,
        [
          {
            text: 'Search Buses',
            onPress: () => router.navigate('/(tabs)/home' as any),
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D92D20" />
          <AppText variant="bodyMedium" style={{ marginTop: 12, color: '#64748B' }}>
            Loading offer details...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!offer || isError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <AppText variant="heading3" style={{ color: '#0F172A', marginTop: 12 }}>
            Offer Not Found
          </AppText>
          <AppText variant="bodySmallMedium" style={{ color: '#64748B', marginTop: 4 }}>
            The requested coupon code could not be retrieved.
          </AppText>
          <AppButton
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]} edges={['top', 'bottom']}>
      {/* 1. Header with back button matching ref-4 */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <AppText variant="heading3" style={styles.headerTitle}>
          Offer Details
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Top Offer Banner Card matching ref-4 */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTopRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="bus" size={22} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="caption" style={styles.bannerCategoryText}>
                {offer.category}
              </AppText>
              <AppText variant="heading2" style={styles.bannerTitle}>
                {offer.title}
              </AppText>
            </View>
          </View>

          <View style={styles.bannerDivider} />

          <View style={styles.bannerBottomRow}>
            <View style={styles.expiryRow}>
              <Ionicons name="time-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
              <AppText variant="bodySmallMedium" style={{ color: '#64748B', fontWeight: '500' }}>
                {offer.formattedExpiry}
              </AppText>
            </View>

            <Pressable
              onPress={handleCopyCode}
              style={({ pressed }) => [
                styles.codeBox,
                {
                  backgroundColor: copied ? '#ECFDF5' : '#F8FAFC',
                  borderColor: copied ? '#10B981' : '#CBD5E1',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Copy ${offer.code}`}
            >
              <AppText
                variant="bodyLargeBold"
                style={[
                  styles.codeText,
                  { color: copied ? '#059669' : '#0F172A' },
                ]}
              >
                {offer.code}
              </AppText>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? '#059669' : '#64748B'}
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          </View>
        </View>

        {/* 3. Numbered Terms & Conditions matching ref-4 */}
        <View style={styles.termsSection}>
          <AppText variant="heading3" style={styles.termsHeading}>
            {t('offers.terms_title')}
          </AppText>

          <View style={styles.termsList}>
            {offer.termsAndConditions.map((term, index) => (
              <View key={index} style={styles.termRow}>
                <View style={styles.termNumberCircle}>
                  <AppText variant="caption" style={styles.termNumberText}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="bodyMedium" style={styles.termText}>
                  {term}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 4. Sticky Bottom Action Bar matching ref-4 */}
      <View style={styles.bottomBar}>
        {activeHold ? (
          <Pressable
            onPress={handleApplyAndBook}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: '#D92D20', opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF' }}>
              {t('offers.apply_and_book')}
            </AppText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleCopyCode}
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: copied ? '#059669' : '#D92D20',
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <AppText variant="bodyLargeBold" style={{ color: '#FFFFFF' }}>
              {copied ? 'Code Copied!' : t('offers.copy_code')}
            </AppText>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCategoryText: {
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  bannerTitle: {
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 26,
  },
  bannerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  bannerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  codeText: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  termsSection: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  termsHeading: {
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 16,
  },
  termsList: {
    gap: 14,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  termNumberText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 11,
  },
  termText: {
    flex: 1,
    color: '#334155',
    lineHeight: 20,
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
});
