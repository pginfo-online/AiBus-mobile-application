import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../design-system';

interface WhereToNextEmptyStateProps {
  onPlanTrip?: () => void;
}

export function WhereToNextEmptyState({ onPlanTrip }: WhereToNextEmptyStateProps) {
  const router = useRouter();

  const handlePressPlan = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }
    if (onPlanTrip) {
      onPlanTrip();
    } else {
      router.navigate('/(tabs)/home' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Destination Illustration Card strictly matching ref-2.png */}
      <View style={styles.illustrationFrame}>
        {/* Row 1: Destination card with thumbnail + 3 skeleton lines */}
        <View style={styles.destinationRow}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=160&q=80',
            }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.rowLines}>
            <View style={[styles.destSkeletonLine, { width: '85%' }]} />
            <View style={[styles.destSkeletonLine, { width: '55%' }]} />
            <View style={[styles.destSkeletonLine, { width: '45%' }]} />
          </View>
        </View>

        {/* Row 2: Destination card with landmark thumbnail + 3 skeleton lines */}
        <View style={[styles.destinationRow, { marginTop: 12 }]}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=160&q=80',
            }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.rowLines}>
            <View style={[styles.destSkeletonLine, { width: '85%' }]} />
            <View style={[styles.destSkeletonLine, { width: '55%' }]} />
            <View style={[styles.destSkeletonLine, { width: '45%' }]} />
          </View>
        </View>
      </View>

      {/* 2. Bold Serif Title strictly matching ref-2.png */}
      <AppText
        variant="heading1"
        style={styles.headline}
      >
        Where to next?
      </AppText>

      {/* 3. Description strictly matching ref-2.png */}
      <AppText
        variant="bodyMedium"
        style={styles.description}
      >
        Browse destinations, build a day-by-day plan, and book it all, right here!
      </AppText>

      {/* 4. Plan a trip Button strictly matching ref-2.png */}
      <Pressable
        onPress={handlePressPlan}
        style={({ pressed }) => [
          styles.planTripButton,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <AppText style={styles.buttonText}>
          Plan a trip
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  illustrationFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: 250,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 36,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  rowLines: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  destSkeletonLine: {
    height: 9,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: 28,
  },
  planTripButton: {
    backgroundColor: '#E65100', // Vibrant amber/orange matching ref-2.png
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
