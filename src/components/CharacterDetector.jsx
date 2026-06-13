import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CHARACTER_DISPLAY_INFO } from '../services/characterService';

const CharacterDetector = ({ characters = [], isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔍 Detecting Characters...</Text>
        <View style={styles.loadingRow}>
          {[1,2,3].map(i => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  if (characters.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        👥 {characters.length} Character{characters.length !== 1 ? 's' : ''} Detected
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {characters.map((char, index) => {
            const info = CHARACTER_DISPLAY_INFO[char.characterType] || CHARACTER_DISPLAY_INFO['male'];
            return (
              <View key={char.id || index} style={[styles.card, { borderColor: info.color }]}>
                <Text style={styles.icon}>{info.icon}</Text>
                <Text style={[styles.label, { color: info.color }]}>{info.label}</Text>
                <Text style={styles.name}>{char.name || `Speaker ${index + 1}`}</Text>
                {char.utterances && (
                  <Text style={styles.lines}>{char.utterances.length} lines</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    minWidth: 110,
    gap: 4,
  },
  icon: {
    fontSize: 36,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  name: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  lines: {
    color: '#666666',
    fontSize: 11,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCard: {
    width: 110,
    height: 120,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    opacity: 0.5,
  },
});

export default CharacterDetector;
