import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppDivider,
  AppSectionHeader,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { AppConfig } from '../../core/config/env';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How do I cancel my booked bus ticket?',
    answer:
      'You can cancel your ticket directly from the Bookings tab. Open your confirmed ticket, tap "Cancel Ticket", select the seats you wish to cancel, and review the instant refund quote. Refunds are processed automatically.',
  },
  {
    question: 'When will I receive my refund for cancelled seats?',
    answer:
      'Refunds are initiated immediately upon cancellation. Depending on your bank, UPI and card refunds reflect in your original payment method within 2 to 4 hours.',
  },
  {
    question: 'Can I change my boarding point after booking?',
    answer:
      'Boarding points are locked once confirmed by the operator. However, you can call the bus operator emergency contact provided on your ticket to request a roadside pickup adjustment.',
  },
  {
    question: 'What luggage allowance is permitted on buses?',
    answer:
      'Most operators allow up to 2 pieces of personal luggage (up to 20kg per passenger). Bicycles and oversized commercial packages require extra clearance with the operator at the boarding counter.',
  },
];

export default function HelpScreen() {
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleCall = () => {
    Linking.openURL(`tel:${AppConfig.supportPhone}`).catch(() => {
      Alert.alert('Error', `Could not open dialer for ${AppConfig.supportPhone}`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${AppConfig.supportEmail}?subject=AiBus Support Request`).catch(() => {
      Alert.alert('Error', `Could not open email client for ${AppConfig.supportEmail}`);
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 1. Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppText variant="heading2" style={{ color: colors.text }}>
          {t('tab.help')}
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 32 }]}
      >
        {/* 2. 24/7 Support Banner */}
        <AppCard variant="elevated" padding="base" style={[styles.supportBanner, shadows.sm]}>
          <View style={styles.bannerRow}>
            <View style={[styles.supportIconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="headset" size={28} color={colors.primary} />
            </View>
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <AppText variant="heading3" style={{ color: colors.text }}>
                24/7 Customer Support
              </AppText>
              <AppText variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 2 }}>
                We are here to assist with bookings, delays, and refunds.
              </AppText>
            </View>
          </View>

          <AppDivider spacingMargin="md" />

          {/* Contact Action Buttons */}
          <View style={styles.contactButtonsRow}>
            <AppButton
              title="Call Us"
              onPress={handleCall}
              variant="outline"
              size="md"
              style={{ flex: 1, marginRight: 8 }}
              icon={<Ionicons name="call-outline" size={18} color={colors.text} />}
            />

            <AppButton
              title="Email Support"
              onPress={handleEmail}
              variant="primary"
              size="md"
              style={{ flex: 1, marginLeft: 8 }}
              icon={<Ionicons name="mail-outline" size={18} color="#FFFFFF" />}
            />
          </View>
        </AppCard>

        {/* 3. Frequently Asked Questions */}
        <View style={{ marginTop: spacing.xl }}>
          <AppSectionHeader
            title="Frequently Asked Questions"
            subtitle="Quick solutions for common inquiries"
          />

          {FAQS.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <AppCard
                key={`faq-${index}`}
                variant="outlined"
                padding="md"
                onPress={() => setExpandedIndex(isExpanded ? null : index)}
                style={[styles.faqCard, { marginBottom: 8 }]}
              >
                <View style={styles.faqHeaderRow}>
                  <AppText variant="bodyLargeBold" style={{ color: colors.text, flex: 1, marginRight: 8 }}>
                    {faq.question}
                  </AppText>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </View>

                {isExpanded && (
                  <View style={{ marginTop: spacing.sm }}>
                    <AppText variant="body" style={{ color: colors.textSecondary, lineHeight: 22 }}>
                      {faq.answer}
                    </AppText>
                  </View>
                )}
              </AppCard>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  supportBanner: {
    width: '100%',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactButtonsRow: {
    flexDirection: 'row',
  },
  faqCard: {
    width: '100%',
  },
  faqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
