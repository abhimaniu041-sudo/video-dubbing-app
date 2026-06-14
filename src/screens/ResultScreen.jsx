import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
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
  const videoRef = useRef(null);

  const getLangName = (code) =>
    SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;

  const getLangFlag = (code) =>
    SUPPORTED_LANGUAGES.find(l => l.code === code)?.flag || '🌍';

  const requestPermissionAndDownload = async (language) => {
    setIsDownloading(true);

    try {
      // Request permission
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();

      if (status === 'denied' && !canAskAgain) {
        Alert.alert(
          'Permission Required',
          'Please enable Storage permission from Settings to download videos.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel' }
          ]
        );
        setIsDownloading(false);
        return;
      }

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Storage permission is required to save videos.');
        setIsDownloading(false);
        return;
      }

      await saveVideoToGallery(language);

    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    }

    setIsDownloading(false);
  };

  const saveVideoToGallery = async (language) => {
    try {
      const langName = getLangName(language);
      const timestamp = Date.now();
      const destPath = FileSystem.documentDirectory + `dubbed_${language}_${timestamp}.mp4`;

      // Copy video file to document directory first
      const fileInfo = await FileSystem.getInfoAsync(videoFile.uri);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'Source video file not found.');
        return;
      }

      await FileSystem.copyAsync({
        from: videoFile.uri,
        to: destPath
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(destPath);

      // Create album
      try {
        const album = await MediaLibrary.getAlbumAsync('AI Dubbed Videos');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('AI Dubbed Videos', asset, false);
        }
      } catch (albumError) {
        console.log('Album error (non-fatal):', albumError);
      }

      // Clean up temp file
      await FileSystem.deleteAsync(destPath, { idempotent: true });

      Alert.alert(
        '✅ Saved!',
        `Video saved to Gallery → "AI Dubbed Videos" album.\n\nNote: Full AI dubbing requires backend server. Currently saving original video.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Save error:', error);

      // Fallback: try sharing
      Alert.alert(
        'Gallery Save Failed',
        'Could not save to gallery directly. Try sharing instead.',
        [
          {
            text: 'Share Video',
            onPress: () => shareVideo()
          },
          { text: 'Cancel' }
        ]
      );
    }
  };

  const shareVideo = async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(videoFile.uri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Share Dubbed Video',
          UTI: 'public.movie'
        });
      } else {
        Alert.alert('Sharing not available on this device.');
      }
    } catch (error) {
      Alert.alert('Share Failed', error.message || 'Could not share video.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
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
            Source: {result.sourceLanguage?.toUpperCase() || 'AUTO'} • {result.characters?.length || 0} character{(result.characters?.length || 0) !== 1 ? 's' : ''} detected
          </Text>
        </View>

        {/* AI Notice */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            ℹ️ AI translation complete. Voice synthesis runs on device using available TTS. Full cloud dubbing needs backend setup.
          </Text>
        </View>

        {/* Characters */}
        {result.characters && result.characters.length > 0 && (
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
          <Text style={styles.sectionTitle}>🌍 Dubbed Languages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.languageTabs}>
              {targetLanguages.map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageTab,
                    activeLanguage === lang && styles.languageTabActive
                  ]}
                  onPress={() => setActiveLanguage(lang)}
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

        {/* Video Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📺 Preview: {getLangFlag(activeLanguage)} {getLangName(activeLanguage)}
          </Text>
          <Video
            ref={videoRef}
            source={{ uri: videoFile.uri }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
            isLooping={false}
          />
        </View>

        {/* Translated Script */}
        {result.translations?.[activeLanguage] &&
          result.translations[activeLanguage].length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Translated Script</Text>
            <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
              {result.translations[activeLanguage].slice(0, 8).map((seg, i) => (
                <View key={i} style={styles.transcriptItem}>
                  <Text style={styles.transcriptTime}>
                    {Math.floor((seg.start || 0) / 1000)}s – {Math.floor((seg.end || 0) / 1000)}s
                  </Text>
                  <Text style={styles.transcriptOriginal}>
                    {seg.originalText || seg.text || '—'}
                  </Text>
                  <Text style={styles.transcriptTranslated}>
                    → {seg.translatedText || '(translation pending)'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Download Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Save & Share</Text>

          {targetLanguages.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[styles.downloadButton, isDownloading && styles.buttonDisabled]}
              onPress={() => requestPermissionAndDownload(lang)}
              disabled={isDownloading}
              activeOpacity={0.8}
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

          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareVideo}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color="#6C63FF" />
            <Text style={styles.shareText}>Share Video</Text>
          </TouchableOpacity>
        </View>

        {/* New Video */}
        <TouchableOpacity
          style={styles.newVideoButton}
          onPress={() => navigation.goBack()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 20,
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  successBanner: {
    backgroundColor: 'rgba(0,200,100,0.1)',
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,200,100,0.3)',
    marginBottom: 10,
  },
  successText: { color: '#00cc66', fontSize: 15, fontWeight: '700' },
  successSubtext: { color: '#aaaaaa', fontSize: 13, marginTop: 4 },
  noticeBanner: {
    backgroundColor: 'rgba(255,180,0,0.1)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,180,0,0.3)',
    marginBottom: 16,
  },
  noticeText: { color: '#ffb400', fontSize: 12, lineHeight: 18 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#ffffff', fontSize: 16,
    fontWeight: '700', marginBottom: 12,
  },
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
  },
  transcriptScroll: { maxHeight: 280 },
  transcriptItem: {
    backgroundColor: '#1a1a2e', borderRadius: 10,
    padding: 12, marginBottom: 8,
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, borderColor: '#6C63FF',
    borderRadius: 14, padding: 14, gap: 8,
    marginTop: 4,
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
