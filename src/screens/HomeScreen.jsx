import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoUploader from '../components/VideoUploader';
import LanguageSelector from '../components/LanguageSelector';
import CharacterDetector from '../components/CharacterDetector';
import DubbingProgress from '../components/DubbingProgress';
import { processVideoDubbing } from '../services/aiService';

const HomeScreen = ({ navigation }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [targetLanguages, setTargetLanguages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [detectedCharacters, setDetectedCharacters] = useState([]);
  const [processingResult, setProcessingResult] = useState(null);

  const handleVideoSelected = (video) => {
    setVideoFile(video);
    setProcessingResult(null);
    setDetectedCharacters([]);
  };

  const startDubbing = async () => {
    if (!videoFile) {
      Alert.alert('No Video', 'Please select a video first');
      return;
    }
    if (targetLanguages.length === 0) {
      Alert.alert('No Languages', 'Please select at least one target language');
      return;
    }

    setIsProcessing(true);
    setProgress({ step: 0, overallPercent: 0, message: 'Starting...' });

    const result = await processVideoDubbing(
      videoFile,
      targetLanguages,
      (progressData) => {
        setProgress(progressData);
        // Update characters when detected
        if (progressData.step === 2 && progressData.characters) {
          setDetectedCharacters(progressData.characters);
        }
      }
    );

    setIsProcessing(false);

    if (result.success) {
      setDetectedCharacters(result.characters || []);
      setProcessingResult(result);
      
      navigation.navigate('Result', {
        result,
        videoFile,
        targetLanguages
      });
    } else {
      Alert.alert(
        'Processing Failed',
        result.error || 'An error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🎬</Text>
          <Text style={styles.title}>AI Video Dubber</Text>
          <Text style={styles.subtitle}>
            Dub any video into 25+ languages with AI voices
          </Text>
        </View>

        {/* Free Badge */}
        <View style={styles.freeBadgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>100% FREE</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI POWERED</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>5 LANGUAGES</Text>
          </View>
        </View>

        {/* Video Uploader */}
        <VideoUploader
          onVideoSelected={handleVideoSelected}
          disabled={isProcessing}
        />

        {/* Character Detection Display */}
        {detectedCharacters.length > 0 && (
          <CharacterDetector
            characters={detectedCharacters}
            isLoading={isProcessing && detectedCharacters.length === 0}
          />
        )}

        {/* Language Selector */}
        <LanguageSelector
          selectedLanguages={targetLanguages}
          onLanguagesChange={setTargetLanguages}
          disabled={isProcessing}
        />

        {/* Progress Display */}
        {isProcessing && progress && (
          <DubbingProgress progress={progress} />
        )}

        {/* Start Button */}
        {!isProcessing && (
          <TouchableOpacity
            style={[
              styles.startButton,
              (!videoFile || targetLanguages.length === 0) && styles.startButtonDisabled
            ]}
            onPress={startDubbing}
            disabled={!videoFile || targetLanguages.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>
              🚀 Start Dubbing ({targetLanguages.length} language{targetLanguages.length !== 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          {[
            '🎤 AI detects all speakers automatically',
            '👥 Identifies Male, Female, Child, Old voices',
            '🌍 Translates to your chosen languages',
            '🔊 Generates matching AI voices',
            '⏱ Syncs audio perfectly with video',
            '📥 Download dubbed video instantly'
          ].map((item, i) => (
            <Text key={i} style={styles.infoItem}>{item}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    marginTop: 4,
  },
  freeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  badgeText: {
    color: '#6C63FF',
    fontSize: 11,
    fontWeight: '700',
  },
  startButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#333',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 8,
  },
  infoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoItem: {
    color: '#aaaaaa',
    fontSize: 14,
    lineHeight: 22,
  },
});

export default HomeScreen;
