import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../design-system';
import { useAppTheme } from '../../design-system/theme';

export interface OtpDigitInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
}

export const OtpDigitInput: React.FC<OtpDigitInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
}) => {
  const { colors, spacing, radii } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Auto-focus on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, length);
    onChange(clean);

    if (clean.length === length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (onComplete) {
        onComplete(clean);
      }
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const handleCellPress = () => {
    inputRef.current?.focus();
  };

  const digits = value.split('');

  return (
    <Pressable onPress={handleCellPress} style={styles.container}>
      {/* Hidden real input that captures keyboard, SMS autofill & paste */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.hiddenInput}
        caretHidden
      />

      {/* Render individual visual digit boxes */}
      <View style={styles.boxesRow}>
        {Array.from({ length }).map((_, index) => {
          const digit = digits[index] || '';
          const isCurrentActive = isFocused && (index === digits.length || (index === length - 1 && digits.length === length));

          return (
            <View
              key={index}
              style={[
                styles.digitBox,
                {
                  borderRadius: radii.md,
                  borderColor: isCurrentActive
                    ? colors.primary
                    : digit
                      ? colors.borderStrong
                      : colors.border,
                  backgroundColor: colors.surface,
                  borderWidth: isCurrentActive ? 2 : 1.5,
                },
              ]}
            >
              <AppText
                variant="heading1"
                style={[
                  styles.digitText,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {digit}
              </AppText>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 18,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  digitBox: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
  },
});
