import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput
} from 'react-native';
import { SUPPORTED_LANGUAGES } from '../services/translationService';

const LanguageSelector = ({ selectedLanguages, onLanguagesChange, disabled }) => {
  const [search, setSearch] = useState('');
  
  const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(search.toLowerCase()) ||
    lang.code.includes(search.toLowerCase())
  );

  const toggleLanguage = (code) => {
    if (disabled) return;
    
    if (selectedLanguages.includes(code)) {
      onLanguagesChange(selectedLanguages.filter(l => l !== code));
    } else if (selectedLanguages.length < 5) {
      onLanguagesChange([...selectedLanguages, code]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌍 Select Target Languages</Text>
        <Text style={styles.subtitle}>
          {selectedLanguages.length}/5 selected
        </Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search languages..."
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
        editable={!disabled}
      />

      {selectedLanguages.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>Selected:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.selectedRow}>
              {selectedLanguages.map(code => {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                return (
                  <TouchableOpacity
                    key={code}
                    style={styles.selectedChip}
                    onPress={() => toggleLanguage(code)}
                    disabled={disabled}
                  >
                    <Text style={styles.chipFlag}>{lang?.flag}</Text>
                    <Text style={styles.chipName}>{lang?.name}</Text>
                    <Text style={styles.chipRemove}>×</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.languageList} nestedScrollEnabled>
        <View style={styles.languageGrid}>
          {filteredLanguages.map(lang => {
            const isSelected = selectedLanguages.includes(lang.code);
            const isDisabled = !isSelected && selectedLanguages.length >= 5;
            
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  isSelected && styles.languageItemSelected,
                  isDisabled && styles.languageItemDisabled
                ]}
                onPress={() => toggleLanguage(lang.code)}
                disabled={disabled || isDisabled}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  isSelected && styles.languageNameSelected
                ]}>
                  {lang.name}
                </Text>
                {isSelected && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedContainer: {
    marginBottom: 12,
  },
  selectedTitle: {
    color: '#aaaaaa',
    fontSize: 12,
    marginBottom: 8,
  },
  selectedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  chipFlag: {
    fontSize: 16,
  },
  chipName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  chipRemove: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginLeft: 2,
  },
  languageList: {
    maxHeight: 300,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 6,
    width: '47%',
  },
  languageItemSelected: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
  },
  languageItemDisabled: {
    opacity: 0.4,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageName: {
    color: '#aaaaaa',
    fontSize: 13,
    flex: 1,
  },
  languageNameSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  checkmark: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LanguageSelector;
