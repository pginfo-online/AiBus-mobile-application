import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export function TicketDetailsSkeleton() {
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
      {/* 1. Header Bar Skeleton */}
      <View style={styles.headerRow}>
        <View style={styles.backCircle} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Animated.View style={[styles.skeletonLine, { width: 140, height: 18, opacity: animatedOpacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: 90, height: 12, marginTop: 6, opacity: animatedOpacity }]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={styles.actionCircle} />
          <View style={styles.actionCircle} />
        </View>
      </View>

      {/* 2. Tabs Skeleton */}
      <View style={styles.tabsRow}>
        <Animated.View style={[styles.tabSkeleton, { opacity: animatedOpacity }]} />
        <Animated.View style={[styles.tabSkeleton, { opacity: animatedOpacity }]} />
        <Animated.View style={[styles.tabSkeleton, { opacity: animatedOpacity }]} />
      </View>

      {/* 3. Main Journey Ticket Card Skeleton */}
      <View style={styles.ticketCardFrame}>
        {/* Top Dark Block */}
        <Animated.View style={[styles.darkTopBlock, { opacity: animatedOpacity }]}>
          {/* Origin */}
          <View style={styles.stationRow}>
            <View style={styles.stationDot} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={[styles.skeletonWhiteLine, { width: '60%', height: 16 }]} />
              <View style={[styles.skeletonWhiteLine, { width: '80%', height: 12, marginTop: 6 }]} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={[styles.skeletonWhiteLine, { width: 50, height: 16 }]} />
              <View style={[styles.skeletonWhiteLine, { width: 70, height: 12, marginTop: 6 }]} />
            </View>
          </View>

          {/* Center Connector Divider */}
          <View style={styles.connectorWrap}>
            <View style={styles.centerPill} />
          </View>

          {/* Destination */}
          <View style={styles.stationRow}>
            <View style={styles.stationDot} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={[styles.skeletonWhiteLine, { width: '60%', height: 16 }]} />
              <View style={[styles.skeletonWhiteLine, { width: '75%', height: 12, marginTop: 6 }]} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={[styles.skeletonWhiteLine, { width: 50, height: 16 }]} />
              <View style={[styles.skeletonWhiteLine, { width: 70, height: 12, marginTop: 6 }]} />
            </View>
          </View>
        </Animated.View>

        {/* Bottom White Block */}
        <View style={styles.whiteBottomBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Animated.View style={[styles.skeletonLine, { width: '65%', height: 16, opacity: animatedOpacity }]} />
              <Animated.View style={[styles.skeletonLine, { width: '40%', height: 12, marginTop: 6, opacity: animatedOpacity }]} />
            </View>
            <Animated.View style={[styles.seatBadgeSkeleton, { opacity: animatedOpacity }]} />
          </View>

          {/* Perforated Line */}
          <View style={styles.perforatedLine} />

          {/* Button Skeleton */}
          <Animated.View style={[styles.buttonSkeleton, { opacity: animatedOpacity }]} />
        </View>
      </View>

      {/* 4. Action Card Skeletons */}
      <Animated.View style={[styles.actionCardSkeleton, { opacity: animatedOpacity }]} />
      <Animated.View style={[styles.actionCardSkeleton, { opacity: animatedOpacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonWhiteLine: {
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  tabSkeleton: {
    width: '30%',
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  ticketCardFrame: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  darkTopBlock: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 20,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  connectorWrap: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  centerPill: {
    width: 120,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  whiteBottomBlock: {
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  seatBadgeSkeleton: {
    width: 48,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  perforatedLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  buttonSkeleton: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  actionCardSkeleton: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
});
