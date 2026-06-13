import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

const VideoUploader = ({ onVideoSelected, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const pickVideo = async () => {
    try {
      setUploading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
        multiple: false
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];
      
      // Check file size (max 500MB for 30 min video)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 500) {
        Alert.alert(
          'File Too Large',
          `File size is ${Math.round(fileSizeMB)}MB. Maximum allowed is 500MB for 30-minute videos.`,
          [{ text: 'OK' }]
        );
        setUploading(false);
        return;
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      
      const videoData = {
        uri: file.uri,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        sizeMB: Math.round(fileSizeMB * 10) / 10
      };

      setSelectedFile(videoData);
      onVideoSelected(videoData);
      setUploading(false);
      
    } catch (error) {
      console.error('File pick error:', error);
      Alert.alert('Error', 'Could not select video. Please try again.');
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.uploadArea, disabled && styles.disabled, selectedFile && styles.selected]}
        onPress={pickVideo}
        disabled={disabled || uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.uploadingText}>Loading video...</Text>
          </View>
        ) : selectedFile ? (
          <View style={styles.fileInfoContainer}>
            <Ionicons name="videocam" size={48} color="#6C63FF" />
            <Text style={styles.fileName} numberOfLines={2}>
              {selectedFile.name}
            </Text>
            <Text style={styles.fileSize}>{selectedFile.sizeMB} MB</Text>
            <Text style={styles.changeText}>Tap to change video</Text>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="cloud-upload-outline" size={64} color="#6C63FF" />
            <Text style={styles.uploadTitle}>Upload Video</Text>
            <Text style={styles.uploadSubtitle}>Any language • Up to 30 minutes</Text>
            <Text style={styles.uploadHint}>MP4, AVI, MOV, MKV supported</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>MAX 500 MB</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    minHeight: 200,
  },
  selected: {
    borderStyle: 'solid',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderColor: '#6C63FF',
  },
  disabled: {
    opacity: 0.5,
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 8,
  },
  uploadTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  uploadSubtitle: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  uploadHint: {
    color: '#666666',
    fontSize: 12,
  },
  badge: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  fileInfoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  fileName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '90%',
  },
  fileSize: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '500',
  },
  changeText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 8,
  },
});

export default VideoUploader;
