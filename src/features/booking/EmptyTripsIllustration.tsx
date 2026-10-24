import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../../design-system';

/**
 * Delightful stacked luggage & sleeping cat travel illustration inspired by ref-1.png
 */
export function EmptyTripsIllustration() {
  return (
    <View style={styles.container}>
      {/* Plant Pot on Left */}
      <View style={styles.plantContainer}>
        {/* Leaves */}
        <View style={styles.leavesWrap}>
          <View style={[styles.leaf, styles.leaf1]} />
          <View style={[styles.leaf, styles.leaf2]} />
          <View style={[styles.leaf, styles.leaf3]} />
          <View style={[styles.leaf, styles.leaf4]} />
        </View>
        {/* Terra cotta Pot */}
        <View style={styles.potRim} />
        <View style={styles.potBase} />
      </View>

      {/* Luggage Stack */}
      <View style={styles.luggageStack}>
        {/* Sleeping Cat on Top */}
        <View style={styles.catWrap}>
          {/* Cat ears */}
          <View style={[styles.catEar, styles.catEarLeft]} />
          <View style={[styles.catEar, styles.catEarRight]} />
          {/* Cat body */}
          <View style={styles.catBody}>
            {/* Closed sleeping eyes */}
            <View style={styles.catFace}>
              <AppText style={styles.catEyes}>˘ ˘</AppText>
            </View>
          </View>
          {/* Cat tail */}
          <View style={styles.catTail} />
        </View>

        {/* Top Red Suitcase */}
        <View style={styles.redSuitcase}>
          {/* White handle */}
          <View style={styles.redHandle} />
          {/* Center latch */}
          <View style={styles.centerLatch} />
        </View>

        {/* Bottom Blue Suitcase */}
        <View style={styles.blueSuitcase}>
          {/* Suitcase handle */}
          <View style={styles.blueHandle} />
          {/* Corners */}
          <View style={[styles.cornerPlate, styles.cornerLeft]} />
          <View style={[styles.cornerPlate, styles.cornerRight]} />
        </View>

        {/* Shadow oval */}
        <View style={styles.groundShadow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
  },
  plantContainer: {
    position: 'absolute',
    left: 42,
    bottom: 24,
    alignItems: 'center',
    zIndex: 2,
  },
  leavesWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
  },
  leaf: {
    position: 'absolute',
    backgroundColor: '#34D399',
    borderRadius: 20,
  },
  leaf1: {
    width: 18,
    height: 40,
    backgroundColor: '#10B981',
    transform: [{ rotate: '-25deg' }],
    left: 8,
    top: 4,
  },
  leaf2: {
    width: 20,
    height: 44,
    backgroundColor: '#059669',
    transform: [{ rotate: '15deg' }],
    right: 12,
    top: 2,
  },
  leaf3: {
    width: 16,
    height: 34,
    backgroundColor: '#34D399',
    transform: [{ rotate: '-45deg' }],
    left: 2,
    top: 16,
  },
  leaf4: {
    width: 16,
    height: 36,
    backgroundColor: '#047857',
    transform: [{ rotate: '38deg' }],
    right: 4,
    top: 14,
  },
  potRim: {
    width: 44,
    height: 8,
    backgroundColor: '#B45309',
    borderRadius: 4,
  },
  potBase: {
    width: 38,
    height: 36,
    backgroundColor: '#92400E',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  luggageStack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 220,
    height: 170,
  },
  catWrap: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: -6,
    zIndex: 5,
  },
  catEar: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#EA580C',
    borderRadius: 2,
    top: 0,
  },
  catEarLeft: {
    left: 24,
    transform: [{ rotate: '-30deg' }],
  },
  catEarRight: {
    right: 24,
    transform: [{ rotate: '30deg' }],
  },
  catBody: {
    width: 90,
    height: 30,
    backgroundColor: '#F97316',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catFace: {
    marginTop: 2,
  },
  catEyes: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C2D12',
    letterSpacing: 4,
  },
  catTail: {
    position: 'absolute',
    right: -12,
    bottom: 2,
    width: 20,
    height: 12,
    backgroundColor: '#EA580C',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    transform: [{ rotate: '-20deg' }],
  },
  redSuitcase: {
    width: 170,
    height: 48,
    backgroundColor: '#E11D48',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  redHandle: {
    position: 'absolute',
    top: -8,
    width: 44,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 2.5,
    borderColor: '#BE123C',
    borderBottomWidth: 0,
  },
  centerLatch: {
    width: 56,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    opacity: 0.95,
  },
  blueSuitcase: {
    width: 210,
    height: 58,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  blueHandle: {
    width: 46,
    height: 14,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#1D4ED8',
    backgroundColor: 'transparent',
  },
  cornerPlate: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 14,
    backgroundColor: '#1E40AF',
  },
  cornerLeft: {
    left: 0,
    borderBottomLeftRadius: 12,
  },
  cornerRight: {
    right: 0,
    borderBottomRightRadius: 12,
  },
  groundShadow: {
    position: 'absolute',
    bottom: -6,
    width: 240,
    height: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 50,
    zIndex: 1,
  },
});
