import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface BookingCardSkeletonProps {
  count?: number;
}

export function BookingCardSkeleton({ count = 2 }: BookingCardSkeletonProps) {
  const animatedOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.45,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animatedOpacity]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.cardWrapper}>
          {/* Top Lavender/Periwinkle rounded block strictly matching ref-1.png */}
          <Animated.View
            style={[
              styles.topBanner,
              { opacity: animatedOpacity },
            ]}
          />

          {/* Bottom Card Content strictly matching ref-1.png (3 skeleton bars) */}
          <View style={styles.contentWrap}>
            {/* Line 1: 55% width */}
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: '55%', opacity: animatedOpacity },
              ]}
            />

            {/* Line 2: 50% width */}
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: '50%', opacity: animatedOpacity },
              ]}
            />

            {/* Line 3: 95% width */}
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: '95%', opacity: animatedOpacity },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  topBanner: {
    height: 145,
    backgroundColor: '#E0E7FF', // Soft periwinkle/lavender matching ref-1.png
    marginHorizontal: 0,
  },
  contentWrap: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },
  skeletonLine: {
    height: 16,
    borderRadius: 5,
    backgroundColor: '#E2E8F0', // Light slate grey matching ref-1.png
    marginBottom: 10,
  },
});
