import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORTED_LANGUAGES } from '../services/translationService';
import { CHARACTER_DISPLAY_INFO } from '../services/characterService';

const ResultScreen = ({ route, navigation }) => {
  const { result, videoFile, targetLanguages } = route.params;
  const [activeLanguage, setActiveLanguage] = useState(targetLanguages[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [isDubbing, setIsDubbing] = useState(false);

  const videoRef = useRef(null);
  const soundRef = useRef(null);
  const timerRef = useRef(null);

  const getLangName = (code) =>
    SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;
  const getLangFlag = (code) =>
    SUPPORTED_LANGUAGES.find(l => l.code === code)?.flag || '🌍';

  useEffect(() => {
    return () => {
      stopDubbing();
    };
  }, []);

  const stopDubbing = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (e) {}
    }
    setIsDubbing(false);
    setCurrentSegmentIndex(-1);
  };

  // Play dubbed audio synced with video
  const playDubbedVersion = async (language) => {
    if (isDubbing) {
      await stopDubbing();
      if (videoRef.current) await videoRef.current.pauseAsync();
      return;
    }

    const segments = result.translations?.[language] || [];
    if (segments.length === 0) {
      Alert.alert('No Translation', 'No dubbed content available for this language.');
      return;
    }

    setIsDubbing(true);

    // Restart video
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
    }

    // Play each segment at correct time
    const playSegment = async (index) => {
      if (index >= segments.length) {
        setIsDubbing(false);
        setCurrentSegmentIndex(-1);
        return;
      }

      const seg = segments[index];
      setCurrentSegmentIndex(index);

      // Wait until segment start time
      const now = Date.now();
      const delay = Math.max(0, seg.start - (Date.now() - now));

      timerRef.current = setTimeout(async () => {
        // Stop previous sound
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch (e) {}
          soundRef.current = null;
        }

        // Play TTS audio for this segment
        if (seg.ttsUrl) {
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: seg.ttsUrl },
              { shouldPlay: true, volume: 1.0 }
            );
            soundRef.current = sound;

            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) {
                playSegment(index + 1);
              }
            });
          } catch (e) {
            console.log('TTS play error:', e);
            // Move to next segment after original duration
            timerRef.current = setTimeout(
              () => playSegment(index + 1),
              seg.end - seg.start
            );
          }
        } else {
          timerRef.current = setTimeout(
            () => playSegment(index + 1),
            seg.end - seg.start
          );
        }
      }, seg.start);
    };

    playSegment(0);
  };

  const downloadVideo = async (language) => {
    setIsDownloading(true);
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();

      if (status === 'denied' && !canAskAgain) {
        Alert.alert(
          'Permission Required',
          'Enable Storage permission from Settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel' }
          ]
        );
        setIsDownloading(false);
        return;
      }

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Storage permission required.');
        setIsDownloading(false);
        return;
      }

      const timestamp = Date.now();
      const destPath = FileSystem.documentDirectory +
        `dubbed_${language}_${timestamp}.mp4`;

      await FileSystem.copyAsync({ from: videoFile.uri, to: destPath });

      const asset = await MediaLibrary.createAssetAsync(destPath);

      try {
        const album = await MediaLibrary.getAlbumAsync('AI Dubbed Videos');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('AI Dubbed Videos', asset, false);
        }
      } catch (albumErr) {
        console.log('Album error:', albumErr);
      }

      await FileSystem.deleteAsync(destPath, { idempotent: true });

      Alert.alert(
        '✅ Saved!',
        `${getLangName(language)} video saved to Gallery → "AI Dubbed Videos".\n\nTip: Press "▶ Play Dubbed" to hear the ${getLangName(language)} voice!`
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Save Failed',
        'Try using Share instead.',
        [
          { text: 'Share', onPress: () => shareVideo() },
          { text: 'Cancel' }
        ]
      );
    }
    setIsDownloading(false);
  };

  const shareVideo = async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(videoFile.uri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Share Dubbed Video'
        });
      }
    } catch (e) {
      Alert.alert('Share Failed', e.message);
    }
  };

  const activeSegments = result.translations?.[activeLanguage] || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            stopDubbing();
            navigation.goBack();
          }}>
            <Ionicons name="arrow-back" size={24} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={styles.title}>🎉 Dubbing Complete!</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successText}>
            ✅ Successfully dubbed to {targetLanguages.length} language{targetLanguages.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.successSubtext}>
            Source: {result.sourceLanguage?.toUpperCase() || 'AUTO'} •{' '}
            {result.characters?.length || 0} character(s) detected
          </Text>
        </View>

        {/* Characters */}
        {result.characters?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Detected Characters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.characterRow}>
                {result.characters.map((char, i) => {
                  const info = CHARACTER_DISPLAY_INFO[char.characterType] ||
                    CHARACTER_DISPLAY_INFO['male'];
                  return (
                    <View key={i} style={[styles.charChip, { borderColor: info?.color }]}>
                      <Text style={styles.charIcon}>{info?.icon}</Text>
                      <Text style={[styles.charLabel, { color: info?.color }]}>
                        {info?.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Language Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Select Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.languageTabs}>
              {targetLanguages.map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageTab,
                    activeLanguage === lang && styles.languageTabActive
                  ]}
                  onPress={() => {
                    stopDubbing();
                    setActiveLanguage(lang);
                  }}
                >
                  <Text style={styles.tabFlag}>{getLangFlag(lang)}</Text>
                  <Text style={[
                    styles.tabName,
                    activeLanguage === lang && styles.tabNameActive
                  ]}>
                    {getLangName(lang)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Video + Play Dubbed Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📺 {getLangFlag(activeLanguage)} {getLangName(activeLanguage)} Preview
          </Text>
          <Video
            ref={videoRef}
            source={{ uri: videoFile.uri }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            isLooping={false}
            onPlaybackStatusUpdate={(status) => {
              if (status.didJustFinish && isDubbing) stopDubbing();
            }}
          />

          {/* Play Dubbed Button */}
          <TouchableOpacity
            style={[styles.playDubbedBtn, isDubbing && styles.playDubbedBtnActive]}
            onPress={() => playDubbedVersion(activeLanguage)}
          >
            <Ionicons
              name={isDubbing ? 'stop-circle' : 'play-circle'}
              size={24}
              color="#ffffff"
            />
            <Text style={styles.playDubbedText}>
              {isDubbing
                ? `⏹ Stop ${getLangName(activeLanguage)} Audio`
                : `▶ Play ${getLangName(activeLanguage)} Dubbed Audio`}
            </Text>
          </TouchableOpacity>

          {isDubbing && currentSegmentIndex >= 0 && (
            <View style={styles.nowPlaying}>
              <Text style={styles.nowPlayingText}>
                🔊 Now: "{activeSegments[currentSegmentIndex]?.translatedText}"
              </Text>
            </View>
          )}
        </View>

        {/* Translated Script */}
        {activeSegments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Translated Script</Text>
            <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
              {activeSegments.map((seg, i) => (
                <View
                  key={i}
                  style={[
                    styles.transcriptItem,
                    currentSegmentIndex === i && styles.transcriptItemActive
                  ]}
                >
                  <Text style={styles.transcriptTime}>
                    {Math.floor((seg.start || 0) / 1000)}s –{' '}
                    {Math.floor((seg.end || 0) / 1000)}s
                  </Text>
                  <Text style={styles.transcriptOriginal}>
                    {seg.originalText || seg.text}
                  </Text>
                  <Text style={styles.transcriptTranslated}>
                    → {seg.translatedText}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Save & Share */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Save & Share</Text>
          {targetLanguages.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[styles.downloadButton, isDownloading && styles.buttonDisabled]}
              onPress={() => downloadVideo(lang)}
              disabled={isDownloading}
            >
              <Text style={styles.downloadFlag}>{getLangFlag(lang)}</Text>
              <Text style={styles.downloadText}>
                {isDownloading ? 'Saving...' : `Save ${getLangName(lang)} Version`}
              </Text>
              <Ionicons
                name={isDownloading ? 'hourglass-outline' : 'download-outline'}
                size={20}
                color="#ffffff"
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.shareButton} onPress={shareVideo}>
            <Ionicons name="share-outline" size={20} color="#6C63FF" />
            <Text style={styles.shareText}>Share Video</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.newVideoButton}
          onPress={() => { stopDubbing(); navigation.goBack(); }}
        >
          <Text style={styles.newVideoText}>+ Dub Another Video</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a1a' },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  backButton: {
    width: 40, height: 40, alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 20,
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  successBanner: {
    backgroundColor: 'rgba(0,200,100,0.1)', borderRadius: 12,
    padding: 16, borderWidth: 1,
    borderColor: 'rgba(0,200,100,0.3)', marginBottom: 16,
  },
  successText: { color: '#00cc66', fontSize: 15, fontWeight: '700' },
  successSubtext: { color: '#aaaaaa', fontSize: 13, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  characterRow: { flexDirection: 'row', gap: 8 },
  charChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1.5, gap: 6,
  },
  charIcon: { fontSize: 20 },
  charLabel: { fontSize: 13, fontWeight: '600' },
  languageTabs: { flexDirection: 'row', gap: 8 },
  languageTab: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#333', gap: 6,
  },
  languageTabActive: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.15)',
  },
  tabFlag: { fontSize: 18 },
  tabName: { color: '#aaaaaa', fontSize: 13 },
  tabNameActive: { color: '#ffffff', fontWeight: '700' },
  video: {
    width: '100%', height: 220,
    backgroundColor: '#000', borderRadius: 16,
    marginBottom: 12,
  },
  playDubbedBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00aa55', borderRadius: 14,
    padding: 14, gap: 8,
  },
  playDubbedBtnActive: { backgroundColor: '#cc3300' },
  playDubbedText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  nowPlaying: {
    backgroundColor: 'rgba(0,170,85,0.1)', borderRadius: 10,
    padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(0,170,85,0.3)',
  },
  nowPlayingText: { color: '#00aa55', fontSize: 13 },
  transcriptScroll: { maxHeight: 280 },
  transcriptItem: {
    backgroundColor: '#1a1a2e', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  transcriptItemActive: {
    borderWidth: 1, borderColor: '#00aa55',
    backgroundColor: 'rgba(0,170,85,0.1)',
  },
  transcriptTime: { color: '#6C63FF', fontSize: 11, marginBottom: 4 },
  transcriptOriginal: { color: '#888', fontSize: 13, marginBottom: 4 },
  transcriptTranslated: { color: '#ffffff', fontSize: 13 },
  downloadButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, marginBottom: 10, gap: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  downloadFlag: { fontSize: 22 },
  downloadText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flex: 1 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#6C63FF',
    borderRadius: 14, padding: 14, gap: 8, marginTop: 4,
  },
  shareText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  newVideoButton: {
    backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  newVideoText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
});

export default ResultScreen;
