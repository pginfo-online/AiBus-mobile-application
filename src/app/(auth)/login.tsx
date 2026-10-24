import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../design-system/theme';
import {
  AppText,
  AppButton,
} from '../../design-system';
import { useTranslation } from '../../core/localization';
import { useGooglePhoneNumberHint } from '../../features/auth/useGooglePhoneNumberHint';
import { useAutomaticOtpRetriever } from '../../features/auth/useAutomaticOtpRetriever';
import { SupportOnboardingIllustration } from '../../features/auth/SupportOnboardingIllustration';
import { OtpDigitInput } from '../../features/auth/OtpDigitInput';
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../../features/auth/useAuthMutations';

export default function FastOnboardingScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useAppTheme();
  const { t } = useTranslation();

  // Screen steps: 'PHONE' | 'OTP'
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');

  // Phone input state
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP input state
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(6);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  // Mutations
  const sendOtpMutation = useSendOtpMutation();
  const verifyOtpMutation = useVerifyOtpMutation();

  // Automatic Google Number Hint (Android)
  const { requestHint } = useGooglePhoneNumberHint();

  // Automatic SMS OTP Retriever (Android SMS Retriever API & iOS oneTimeCode)
  const handleOtpDetected = (detectedOtp: string) => {
  //  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setOtp(detectedOtp);
    // Auto-verify when OTP is automatically retrieved
    verifyOtp(detectedOtp);
  };

  const { appHash } = useAutomaticOtpRetriever(
    step === 'OTP' ? handleOtpDetected : undefined,
    otpLength
  );

  // Auto-request Google Phone Number Hint on screen mount
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active && step === 'PHONE' && !phone) {
        requestHint().then((result) => {
          if (active && result) {
            if (result.phoneNumber) setPhone(result.phoneNumber);
            if (result.callingCode) setCountryCode(result.callingCode);
            Haptics.selectionAsync().catch(() => {});
          }
        });
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [requestHint, step]);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 'OTP' || resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Toast animation
  const triggerSuccessToast = () => {
    setShowSuccessToast(true);
    Animated.timing(toastFadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => setShowSuccessToast(false));
    }, 3500);
  };

  const handlePhoneChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 10);
    setPhone(clean);
    if (errorMessage) setErrorMessage(null);
  };

  const requestOtp = async (targetPhone = phone) => {
    const clean = targetPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
      setErrorMessage(t('auth.invalid_phone'));
   //   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setErrorMessage(null);
    try {
      const res = await sendOtpMutation.mutateAsync({
        phone: clean,
        appHash: appHash || undefined,
      });

      if (res?.otpLength) {
        setOtpLength(res.otpLength);
      }
      setResendCooldown(res?.resendCooldownSeconds || 30);
      setStep('OTP');
      setOtp('');
      triggerSuccessToast();
    //  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const verifyOtp = async (otpToVerify = otp) => {
    const cleanOtp = otpToVerify.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage(t('auth.invalid_otp'));
   //   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setErrorMessage(null);
    try {
      await verifyOtpMutation.mutateAsync({
        phone: phone.replace(/\D/g, '').slice(-10),
        otp: cleanOtp,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Successfully authenticated! Dismiss onboarding modal
      router.back();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0 || sendOtpMutation.isPending) return;
    requestOtp();
  };

  const handleEditPhone = () => {
    setStep('PHONE');
    setOtp('');
    setErrorMessage(null);
    Haptics.selectionAsync().catch(() => {});
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isPhoneValid = phone.length === 10 && /^[6-9]\d{9}$/.test(phone);
  const isOtpValid = otp.length >= 4;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'bottom']}>
      {/* Top Header with Close '✕' Button */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
          accessibilityLabel="Close onboarding"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
        >
          {step === 'PHONE' ? (
            /* ================= STEP 1: PHONE NUMBER ENTRY ================= */
            <View style={styles.stepContainer}>
              {/* Illustration banner from ref-1.png */}
              <SupportOnboardingIllustration />

              {/* Title & Headline */}
              <AppText
                variant="heading1"
                style={[styles.headline, { color: colors.text }]}
              >
                {t('auth.onboarding_title')}
              </AppText>

              {/* Error Banner */}
              {errorMessage && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <AppText variant="bodySmall" style={{ color: colors.danger, marginLeft: 6, flex: 1 }}>
                    {errorMessage}
                  </AppText>
                </View>
              )}

              {/* Dual Input Box: Country Code + Mobile Number */}
              <View style={styles.phoneInputRow}>
                {/* Country Code Selector */}
                <View
                  style={[
                    styles.countryCodeBox,
                    {
                      borderColor: colors.borderStrong,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {t('auth.country_code')}
                  </AppText>
                  <View style={styles.codeTextRow}>
                    <AppText variant="bodyLargeBold" style={{ color: colors.text }}>
                      {countryCode}
                    </AppText>
                    <Ionicons name="caret-down" size={12} color={colors.text} style={{ marginLeft: 4 }} />
                  </View>
                </View>

                {/* Mobile Number Input */}
                <View
                  style={[
                    styles.numberBox,
                    {
                      borderColor: phoneFocused ? colors.primary : colors.borderStrong,
                      backgroundColor: colors.surface,
                      borderWidth: phoneFocused ? 1.8 : 1,
                    },
                  ]}
                >
                  <AppText variant="caption" style={{ color: phoneFocused ? colors.primary : colors.textMuted }}>
                    {t('auth.mobile_number')}
                  </AppText>
                  <TextInput
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder="8010056675"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    style={[
                      styles.numberInput,
                      {
                        color: colors.text,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Get OTP Primary Button */}
              <AppButton
                title={t('auth.get_otp')}
                onPress={() => requestOtp()}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!isPhoneValid}
                loading={sendOtpMutation.isPending}
                style={[styles.primaryActionBtn, shadows.sm]}
              />

              {/* Divider '── or ──' */}
              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                <AppText variant="bodySmall" style={[styles.orText, { color: colors.textMuted }]}>
                  {t('auth.or_divider')}
                </AppText>
                <View style={[styles.orLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Fast Google Number Hint Trigger (if available) */}
              <Pressable
                onPress={() => {
                  requestHint().then((res) => {
                    if (res?.phoneNumber) {
                      setPhone(res.phoneNumber);
                      if (res.callingCode) setCountryCode(res.callingCode);
                    }
                  });
                }}
                style={styles.hintPrompt}
              >
                <Ionicons name="flash-outline" size={15} color={colors.primary} />
                <AppText variant="bodySmallMedium" style={{ color: colors.primary, marginLeft: 6 }}>
                  Auto-fill with SIM number
                </AppText>
              </Pressable>
            </View>
          ) : (
            /* ================= STEP 2: OTP VERIFICATION ================= */
            <View style={styles.stepContainer}>
              {/* Title from ref-3.png */}
              <AppText
                variant="heading1"
                style={[styles.headline, { color: colors.text, marginTop: spacing.md }]}
              >
                {t('auth.enter_otp_title')}
              </AppText>

              {/* Phone display with 'Edit' button */}
              <View style={styles.phoneSummaryRow}>
                <View>
                  <AppText variant="heading3" style={{ color: colors.text }}>
                    {countryCode} {phone}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
                    {t('auth.mobile_number')}
                  </AppText>
                </View>
                <Pressable
                  onPress={handleEditPhone}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                >
                  <AppText
                    variant="bodyLargeBold"
                    style={{ color: colors.text, textDecorationLine: 'underline' }}
                  >
                    {t('auth.edit_number')}
                  </AppText>
                </Pressable>
              </View>

              {/* Error Banner */}
              {errorMessage && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft, marginVertical: spacing.sm }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <AppText variant="bodySmall" style={{ color: colors.danger, marginLeft: 6, flex: 1 }}>
                    {errorMessage}
                  </AppText>
                </View>
              )}

              {/* OTP Label */}
              <AppText
                variant="bodySmall"
                style={{ color: colors.textSecondary, marginTop: spacing.lg }}
              >
                {t('auth.enter_otp_label')}
              </AppText>

              {/* OTP Digit Boxes */}
              <OtpDigitInput
                length={otpLength}
                value={otp}
                onChange={setOtp}
                onComplete={verifyOtp}
                disabled={verifyOtpMutation.isPending}
              />

              {/* Verify OTP Button */}
              <AppButton
                title={t('auth.verify_otp')}
                onPress={() => verifyOtp()}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!isOtpValid}
                loading={verifyOtpMutation.isPending}
                style={[styles.primaryActionBtn, shadows.sm]}
              />

              {/* Resend Cooldown Timer / Resend Button */}
              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                    Didn't get the OTP? Try again in{' '}
                    <AppText
                      variant="bodySmallMedium"
                      style={{ color: '#D84E55', fontWeight: '700' }}
                    >
                      {formatTimer(resendCooldown)}
                    </AppText>
                  </AppText>
                ) : (
                  <Pressable onPress={handleResend} disabled={sendOtpMutation.isPending}>
                    <AppText variant="bodySmall" style={{ color: colors.textSecondary }}>
                      Didn't get the OTP?{' '}
                      <AppText variant="bodySmallMedium" style={{ color: colors.primary, fontWeight: '700' }}>
                        Resend OTP
                      </AppText>
                    </AppText>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Notification: "✓ OTP sent successfully" matching ref-3.png */}
      {showSuccessToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastFadeAnim,
              transform: [
                {
                  translateY: toastFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toastBox}>
            <View style={styles.toastCheckCircle}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <AppText variant="bodyMedium" style={{ color: '#FFFFFF', marginLeft: 10 }}>
              {t('auth.otp_sent_success')}
            </AppText>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  stepContainer: {
    width: '100%',
    paddingTop: 8,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 20,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
    gap: 10,
  },
  countryCodeBox: {
    width: 100,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  codeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  numberBox: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  numberInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
    margin: 0,
    marginTop: 2,
  },
  primaryActionBtn: {
    marginTop: 6,
    height: 50,
    borderRadius: 25,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 16,
  },
  hintPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  phoneSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
  },
  toastCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
