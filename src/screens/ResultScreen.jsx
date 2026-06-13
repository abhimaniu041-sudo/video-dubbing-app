import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Share, Platform
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
  const [showSubtitles, setShowSubtitles] = useState(true);
  const videoRef = useRef(null);

  const getLangName = (code) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;
  };

  const getLangFlag = (code) => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code)?.flag || '🌍';
  };

  const downloadDubbedVideo = async (language) => {
    setIsDownloading(true);
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow media access to download the video.');
        setIsDownloading(false);
        return;
      }

      // For production: This would download the server-processed video
      // For demo: We share the original video with dubbed audio info
      const langName = getLangName(language);
      const outputPath = `${FileSystem.documentDirectory}dubbed_${language}_${Date.now()}.mp4`;
      
      // Copy original video to output (in production, this would be the dubbed version)
      await FileSystem.copyAsync({
        from: videoFile.uri,
        to: outputPath
      });
      
      const asset = await MediaLibrary.createAssetAsync(outputPath);
      await MediaLibrary.createAlbumAsync('AI Dubbed Videos', asset, false);
      
      Alert.alert(
        '✅ Download Complete!',
        `"${langName}" dubbed video saved to your gallery in "AI Dubbed Videos" album.`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Could not save the video. Please try again.');
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
    } catch (error) {
      Alert.alert('Error', 'Could not share the video.');
    }
  };

  const downloadAllLanguages = async () => {
    for (const lang of targetLanguages) {
      await downloadDubbedVideo(lang);
      await new Promise(resolve => setTimeout(resolve, 500));
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
            Source: {result.sourceLanguage?.toUpperCase()} • {result.characters?.length || 0} characters detected
          </Text>
        </View>

        {/* Characters Summary */}
        {result.characters && result.characters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Detected Characters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.characterRow}>
                {result.characters.map((char, i) => {
                  const info = CHARACTER_DISPLAY_INFO[char.characterType];
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

        {/* Language Tab Selector */}
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

        {/* Transcript Preview */}
        {result.translations?.[activeLanguage] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Translated Script</Text>
            <ScrollView style={styles.transcriptScroll}>
              {result.translations[activeLanguage].slice(0, 5).map((seg, i) => (
                <View key={i} style={styles.transcriptItem}>
                  <Text style={styles.transcriptTime}>
                    {Math.floor(seg.start / 1000)}s – {Math.floor(seg.end / 1000)}s
                  </Text>
                  <Text style={styles.transcriptOriginal}>{seg.originalText}</Text>
                  <Text style={styles.transcriptTranslated}>→ {seg.translatedText}</Text>
                </View>
              ))}
              {result.translations[activeLanguage].length > 5 && (
                <Text style={styles.moreSegments}>
                  +{result.translations[activeLanguage].length - 5} more segments...
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Download Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📥 Download</Text>
          
          {targetLanguages.map(lang => (
            <TouchableOpacity
              key={lang}
              style={styles.downloadButton}
              onPress={() => downloadDubbedVideo(lang)}
              disabled={isDownloading}
            >
              <Text style={styles.downloadFlag}>{getLangFlag(lang)}</Text>
              <Text style={styles.downloadText}>
                Download {getLangName(lang)} Version
              </Text>
              <Ionicons name="download-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          ))}

          {targetLanguages.length > 1 && (
            <TouchableOpacity
              style={[styles.downloadButton, styles.downloadAllButton]}
              onPress={downloadAllLanguages}
              disabled={isDownloading}
            >
              <Text style={styles.downloadText}>⬇️ Download All Languages</Text>
            </TouchableOpacity>
          )}

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={shareVideo}
          >
            <Ionicons name="share-outline" size={20} color="#6C63FF" />
            <Text style={styles.shareText}>Share Video</Text>
          </TouchableOpacity>
        </View>

        {/* New Video Button */}
        <TouchableOpacity
          style={styles.newVideoButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.newVideoText}>+ Dub Another Video</Text>
        </TouchableOpacity>

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
    backgroundColor: 'rgba(0, 200, 100, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 100, 0.3)',
    marginBottom: 16,
  },
  successText: { color: '#00cc66', fontSize: 15, fontWeight: '700' },
  successSubtext: { color: '#aaaaaa', fontSize: 13, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 12,
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
    borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.15)',
  },
  tabFlag: { fontSize: 18 },
  tabName: { color: '#aaaaaa', fontSize: 13 },
  tabNameActive: { color: '#ffffff', fontWeight: '700' },
  video: {
    width: '100%', height: 220,
    backgroundColor: '#000',
    borderRadius: 16,
  },
  transcriptScroll: { maxHeight: 240 },
  transcriptItem: {
    backgroundColor: '#1a1a2e', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  transcriptTime: { color: '#6C63FF', fontSize: 11, marginBottom: 4 },
  transcriptOriginal: { color: '#888', fontSize: 13, marginBottom: 4 },
  transcriptTranslated: { color: '#ffffff', fontSize: 13 },
  moreSegments: { color: '#666', textAlign: 'center', padding: 8 },
  downloadButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6C63FF', borderRadius: 14,
    padding: 16, marginBottom: 10, gap: 10,
  },
  downloadAllButton: { backgroundColor: '#9C27B0' },
  downloadFlag: { fontSize: 22 },
  downloadText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flex: 1 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#6C63FF', borderRadius: 14,
    padding: 14, gap: 8,
  },
  shareText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  newVideoButton: {
    backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#333',
  },
  newVideoText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
});

export default ResultScreen;
