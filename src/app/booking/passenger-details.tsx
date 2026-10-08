import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppCard,
  AppButton,
  AppInput,
  AppDivider,
  AppBadge,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useBookingStore, PassengerItem } from '../../stores/bookingStore';
import { useAuthStore } from '../../stores/authStore';

export default function PassengerDetailsScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);

  const {
    fromCity,
    toCity,
    selectedBus,
    selectedSeats,
    setPassengers,
    setContactInfo,
    setGstDetails,
  } = useBookingStore();

  // Initialize passenger list per selected seat
  const [passengerForms, setPassengerForms] = useState<PassengerItem[]>(() => {
    return selectedSeats.map((seat, idx) => ({
      seatNo: seat.seatNo,
      seatTypeId: seat.seatType,
      fare: seat.fare,
      gender: 'M',
      age: 28,
      name: idx === 0 && user ? `${user.firstName} ${user.lastName}`.trim() : '',
      isAcSeat: selectedBus?.IsAC ?? false,
    }));
  });

  // Contact details
  const [contactName, setLocalContactName] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : ''
  );
  const [contactEmail, setLocalContactEmail] = useState(user?.email || '');
  const [contactPhone, setLocalContactPhone] = useState(user?.phone || '');

  // GST details
  const [hasGst, setHasGst] = useState(false);
  const [gstin, setLocalGstin] = useState('');
  const [gstCompany, setLocalGstCompany] = useState('');

  const updatePassengerField = (
    index: number,
    field: keyof PassengerItem,
    value: any
  ) => {
    const updated = [...passengerForms];
    updated[index] = { ...updated[index], [field]: value };
    setPassengerForms(updated);
  };

  const handleProceed = () => {
    // 1. Validate passenger inputs
    for (let i = 0; i < passengerForms.length; i++) {
      const p = passengerForms[i];
      if (!p.name || p.name.trim().length < 2) {
        Alert.alert('Validation Error', `Please enter a valid name for Seat ${p.seatNo}.`);
        return;
      }
      if (!p.age || isNaN(p.age) || p.age < 1 || p.age > 120) {
        Alert.alert('Validation Error', `Please enter a valid age (1-120) for Seat ${p.seatNo}.`);
        return;
      }
    }

    // 2. Validate contact details
    if (!contactEmail || !contactEmail.includes('@') || !contactEmail.includes('.')) {
      Alert.alert('Validation Error', 'Please enter a valid email address for booking ticket.');
      return;
    }

    if (!contactPhone || contactPhone.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // 3. Validate GST if enabled
    if (hasGst) {
      if (!gstin || gstin.trim().length !== 15) {
        Alert.alert('Validation Error', 'GSTIN must be exactly 15 alphanumeric characters.');
        return;
      }
      if (!gstCompany || gstCompany.trim().length < 2) {
        Alert.alert('Validation Error', 'Please enter your registered Company Name for GST.');
        return;
      }
    }

    // Save to booking store
    setPassengers(passengerForms);
    setContactInfo({
      name: contactName || passengerForms[0].name,
      email: contactEmail.trim().toLowerCase(),
      phone: contactPhone.trim(),
    });

    if (hasGst) {
      setGstDetails(gstin.trim().toUpperCase(), gstCompany.trim());
    } else {
      setGstDetails(undefined, undefined);
    }

    router.push('/booking/review' as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 1. Header Overview Bar */}
      <View style={[styles.overviewBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
          {fromCity.name} → {toCity.name}
        </AppText>
        <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
          {selectedBus?.CompanyName} • {selectedSeats.length} Seats ({selectedSeats.map((s) => s.seatNo).join(', ')})
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base, paddingBottom: 110 }]}
      >
        {/* 2. Passenger Forms for each seat */}
        <AppText variant="heading3" style={{ color: colors.text, marginBottom: spacing.md }}>
          {t('passenger.summary')}
        </AppText>

        {passengerForms.map((p, index) => (
          <AppCard
            key={`p-seat-${p.seatNo}`}
            variant="elevated"
            padding="base"
            style={[styles.passengerCard, { marginBottom: spacing.md }]}
          >
            <View style={styles.seatHeaderRow}>
              <View style={styles.seatBadgePill}>
                <Ionicons name="bus" size={16} color={colors.primary} />
                <AppText variant="bodySmallMedium" style={{ color: colors.primary, marginLeft: 6, fontWeight: '700' }}>
                  Seat {p.seatNo}
                </AppText>
              </View>

              <AppText variant="bodySmallMedium" style={{ color: colors.textSecondary }}>
                ₹{p.fare}
              </AppText>
            </View>

            {/* Name Input */}
            <AppInput
              label={t('passenger.name')}
              value={p.name}
              onChangeText={(text) => updatePassengerField(index, 'name', text)}
              placeholder={t('passenger.name_placeholder')}
              autoCapitalize="words"
            />

            {/* Age & Gender Row */}
            <View style={styles.ageGenderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <AppInput
                  label={t('passenger.age')}
                  value={p.age ? String(p.age) : ''}
                  onChangeText={(text) => updatePassengerField(index, 'age', parseInt(text, 10) || '')}
                  placeholder={t('passenger.age_placeholder')}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>

              {/* Gender Radio Selector */}
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmallMedium" style={{ color: colors.textSecondary, marginBottom: 4 }}>
                  {t('passenger.gender')}
                </AppText>
                <View style={styles.genderButtonRow}>
                  <Pressable
                    onPress={() => updatePassengerField(index, 'gender', 'M')}
                    style={[
                      styles.genderPill,
                      {
                        backgroundColor: p.gender === 'M' ? colors.primarySoft : colors.surfaceSecondary,
                        borderColor: p.gender === 'M' ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="bodySmallMedium"
                      style={{
                        color: p.gender === 'M' ? colors.primary : colors.text,
                        fontWeight: p.gender === 'M' ? '700' : '500',
                      }}
                    >
                      {t('passenger.male')}
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => updatePassengerField(index, 'gender', 'F')}
                    style={[
                      styles.genderPill,
                      {
                        backgroundColor: p.gender === 'F' ? colors.primarySoft : colors.surfaceSecondary,
                        borderColor: p.gender === 'F' ? colors.primary : colors.border,
                        marginLeft: 8,
                      },
                    ]}
                  >
                    <AppText
                      variant="bodySmallMedium"
                      style={{
                        color: p.gender === 'F' ? colors.primary : colors.text,
                        fontWeight: p.gender === 'F' ? '700' : '500',
                      }}
                    >
                      {t('passenger.female')}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>
          </AppCard>
        ))}

        {/* 3. Contact Information Card */}
        <AppCard variant="elevated" padding="base" style={[styles.contactCard, { marginBottom: spacing.md }]}>
          <AppText variant="heading3" style={{ color: colors.text, marginBottom: 2 }}>
            {t('passenger.contact_title')}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {t('passenger.contact_subtitle')}
          </AppText>

          <AppInput
            label={t('passenger.email')}
            value={contactEmail}
            onChangeText={setLocalContactEmail}
            placeholder="e.g. rahul@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
          />

          <AppInput
            label={t('passenger.phone')}
            value={contactPhone}
            onChangeText={setLocalContactPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={13}
            leftIcon={<Ionicons name="call-outline" size={18} color={colors.textMuted} />}
          />
        </AppCard>

        {/* 4. GSTIN (Optional) */}
        <AppCard variant="outlined" padding="base" style={styles.gstCard}>
          <View style={styles.gstToggleRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppText variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>
                {t('passenger.gst_toggle')}
              </AppText>
              <AppText variant="caption" style={{ color: colors.textSecondary }}>
                Claim tax input credit for business travel
              </AppText>
            </View>
            <Switch
              value={hasGst}
              onValueChange={setHasGst}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {hasGst && (
            <View style={{ marginTop: spacing.md }}>
              <AppInput
                label={t('passenger.gstin')}
                value={gstin}
                onChangeText={(text) => setLocalGstin(text.toUpperCase())}
                placeholder="15-digit GSTIN number"
                autoCapitalize="characters"
                maxLength={15}
              />
              <AppInput
                label={t('passenger.gst_company')}
                value={gstCompany}
                onChangeText={setLocalGstCompany}
                placeholder="Registered business name"
              />
            </View>
          )}
        </AppCard>
      </ScrollView>

      {/* 5. Bottom Proceed Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            ...shadows.lg,
          },
        ]}
      >
        <AppButton
          title={t('passenger.proceed_review')}
          onPress={handleProceed}
          variant="primary"
          size="lg"
          fullWidth
          icon={<Ionicons name="checkmark-done" size={20} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overviewBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  passengerCard: {
    width: '100%',
  },
  seatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seatBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageGenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderButtonRow: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
  },
  genderPill: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCard: {
    width: '100%',
  },
  gstCard: {
    width: '100%',
  },
  gstToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
