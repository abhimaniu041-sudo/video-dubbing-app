import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const STEPS = [
  { id: 1, icon: '🎵', label: 'Extracting Audio' },
  { id: 2, icon: '🎤', label: 'Speech Recognition' },
  { id: 3, icon: '🌍', label: 'Language Detection' },
  { id: 4, icon: '🔄', label: 'Translation' },
  { id: 5, icon: '🔊', label: 'AI Voice Generation' },
  { id: 6, icon: '🎬', label: 'Video Sync' },
];

const DubbingProgress = ({ progress }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress?.overallPercent || 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress?.overallPercent]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚡ Processing Your Video</Text>
      
      {/* Overall Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              })
            }
          ]}
        />
        <Text style={styles.progressText}>
          {progress?.overallPercent || 0}%
        </Text>
      </View>

      {/* Current Step Message */}
      {progress?.message && (
        <Text style={styles.currentMessage}>{progress.message}</Text>
      )}

      {/* Step Indicators */}
      <View style={styles.stepsContainer}>
        {STEPS.map(step => {
          const isCompleted = (progress?.step || 0) > step.id;
          const isCurrent = progress?.step === step.id;
          const isPending = (progress?.step || 0) < step.id;
          
          return (
            <View key={step.id} style={styles.stepItem}>
              <View style={[
                styles.stepIcon,
                isCompleted && styles.stepCompleted,
                isCurrent && styles.stepCurrent,
                isPending && styles.stepPending,
              ]}>
                <Text style={styles.stepIconText}>
                  {isCompleted ? '✓' : step.icon}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                isCompleted && styles.stepLabelCompleted,
                isCurrent && styles.stepLabelCurrent,
              ]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    marginVertical: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 24,
    backgroundColor: '#0d0d1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 12,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 24,
  },
  currentMessage: {
    color: '#6C63FF',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepItem: {
    alignItems: 'center',
    width: '30%',
    gap: 4,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d1a',
    borderWidth: 2,
    borderColor: '#333',
  },
  stepCompleted: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderColor: '#6C63FF',
  },
  stepCurrent: {
    borderColor: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  stepPending: {
    opacity: 0.4,
  },
  stepIconText: {
    fontSize: 18,
  },
  stepLabel: {
    color: '#666666',
    fontSize: 10,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#6C63FF',
  },
  stepLabelCurrent: {
    color: '#00ff88',
    fontWeight: '700',
  },
});

export default DubbingProgress;
