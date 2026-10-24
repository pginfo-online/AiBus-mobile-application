import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../design-system/theme';

/**
 * Visual illustration recreating ref-1.png & ref-2.png:
 * Customer talking on phone + customer support agent at computer desk with headset.
 */
export function SupportOnboardingIllustration() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: '#E0F2FE' }]}>
      {/* Background soft circle accent */}
      <View style={styles.circleBg} />

      {/* Agent Desk & Monitor */}
      <View style={styles.agentArea}>
        {/* Support Agent with Headset */}
        <View style={styles.agentHead}>
          {/* Headset headband & mic */}
          <View style={styles.headsetBand} />
          <View style={styles.headsetMic} />
        </View>
        <View style={styles.agentBody} />

        {/* Speech Bubble */}
        <View style={styles.speechBubble}>
          <View style={styles.bubbleLine1} />
          <View style={styles.bubbleLine2} />
        </View>

        {/* Computer Screen */}
        <View style={styles.computerScreen}>
          <Ionicons name="desktop-outline" size={32} color="#1E293B" />
        </View>
      </View>

      {/* Customer on Phone */}
      <View style={styles.customerArea}>
        <View style={styles.customerHair} />
        <View style={styles.customerFace}>
          {/* Phone held to ear */}
          <View style={styles.phoneDevice}>
            <Ionicons name="call" size={14} color="#0284C7" />
          </View>
        </View>
        <View style={styles.customerBody} />
        {/* Gesturing hand */}
        <View style={styles.gesturingHand} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleBg: {
    position: 'absolute',
    right: 30,
    top: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F87171',
    opacity: 0.85,
  },
  agentArea: {
    position: 'absolute',
    right: 40,
    bottom: 25,
    alignItems: 'center',
  },
  agentHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FBCFE8',
    marginBottom: 2,
    position: 'relative',
  },
  headsetBand: {
    position: 'absolute',
    top: -2,
    left: 2,
    right: 2,
    height: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    borderColor: '#0F172A',
    borderBottomWidth: 0,
  },
  headsetMic: {
    position: 'absolute',
    bottom: 4,
    left: -4,
    width: 10,
    height: 3,
    backgroundColor: '#0F172A',
    borderRadius: 2,
  },
  agentBody: {
    width: 44,
    height: 34,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#10B981',
  },
  speechBubble: {
    position: 'absolute',
    top: -30,
    left: -35,
    width: 50,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleLine1: {
    width: 34,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 4,
  },
  bubbleLine2: {
    width: 22,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  computerScreen: {
    position: 'absolute',
    left: -36,
    bottom: 4,
  },
  customerArea: {
    position: 'absolute',
    left: 70,
    bottom: 20,
    alignItems: 'center',
  },
  customerHair: {
    position: 'absolute',
    top: -4,
    width: 44,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    zIndex: 1,
  },
  customerFace: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FCD34D',
    zIndex: 2,
    marginTop: 4,
    position: 'relative',
  },
  phoneDevice: {
    position: 'absolute',
    left: -10,
    top: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  customerBody: {
    width: 56,
    height: 52,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#1E3A8A',
    zIndex: 2,
  },
  gesturingHand: {
    position: 'absolute',
    right: -24,
    bottom: 25,
    width: 28,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FCD34D',
    transform: [{ rotate: '-25deg' }],
    zIndex: 3,
  },
});
