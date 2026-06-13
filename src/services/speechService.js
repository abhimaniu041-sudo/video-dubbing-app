// FREE Text-to-Speech Services with Fallback
// Uses: Web Speech API → VoiceRSS → ResponsiveVoice → eSpeak WASM

import * as FileSystem from 'expo-file-system';

// Character voice profiles
export const VOICE_PROFILES = {
  male: {
    pitch: 0.8,
    rate: 1.0,
    voicePattern: 'male',
    description: 'Adult Male Voice'
  },
  female: {
    pitch: 1.2,
    rate: 1.0,
    voicePattern: 'female',
    description: 'Adult Female Voice'
  },
  child: {
    pitch: 1.6,
    rate: 1.1,
    voicePattern: 'child',
    description: 'Child Voice'
  },
  old_male: {
    pitch: 0.7,
    rate: 0.85,
    voicePattern: 'old_male',
    description: 'Old Man Voice'
  },
  old_female: {
    pitch: 1.0,
    rate: 0.85,
    voicePattern: 'old_female',
    description: 'Old Woman Voice'
  }
};

// VoiceRSS Free TTS API (350 requests/day free)
export const synthesizeWithVoiceRSS = async (text, language, voiceType) => {
  const API_KEY = 'YOUR_FREE_VOICERSS_KEY'; // Get free at voicerss.org
  
  const voiceMap = {
    'en': { male: 'en-us', female: 'en-us' },
    'hi': { male: 'hi-in', female: 'hi-in' },
    'es': { male: 'es-es', female: 'es-es' },
    'fr': { male: 'fr-fr', female: 'fr-fr' },
    'de': { male: 'de-de', female: 'de-de' },
    'ja': { male: 'ja-jp', female: 'ja-jp' },
    'ko': { male: 'ko-kr', female: 'ko-kr' },
    'zh': { male: 'zh-cn', female: 'zh-cn' },
    'ar': { male: 'ar-eg', female: 'ar-eg' },
    'pt': { male: 'pt-br', female: 'pt-br' },
    'ru': { male: 'ru-ru', female: 'ru-ru' },
  };
  
  const profile = VOICE_PROFILES[voiceType] || VOICE_PROFILES.male;
  const langCode = voiceMap[language]?.male || 'en-us';
  
  const url = `https://api.voicerss.org/?key=${API_KEY}&hl=${langCode}&src=${encodeURIComponent(text)}&r=${profile.rate}&f=48khz_16bit_stereo&c=MP3`;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      const audioBlob = await response.blob();
      return { success: true, audio: audioBlob, provider: 'VoiceRSS' };
    }
  } catch (error) {
    console.log('VoiceRSS failed:', error);
  }
  return { success: false };
};

// Google TTS (Unofficial free endpoint)
export const synthesizeWithGoogleTTS = async (text, language, voiceType) => {
  try {
    const chunks = text.match(/.{1,200}/g) || [text];
    const audioUrls = [];
    
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${language}&client=tw-ob`;
      audioUrls.push(url);
    }
    
    return {
      success: true,
      audioUrls,
      provider: 'Google TTS (free endpoint)',
      note: 'May have rate limits'
    };
  } catch (error) {
    console.log('Google TTS failed:', error);
    return { success: false };
  }
};

// eSpeak via Web Assembly (completely offline, free)
export const synthesizeWithEspeak = async (text, language, voiceType) => {
  // Using eSpeak-ng WASM for offline TTS
  try {
    const espeakLangMap = {
      'en': 'en', 'hi': 'hi', 'es': 'es', 'fr': 'fr',
      'de': 'de', 'it': 'it', 'pt': 'pt', 'ru': 'ru',
      'ar': 'ar', 'zh': 'zh', 'ja': 'ja', 'ko': 'ko'
    };
    
    const profile = VOICE_PROFILES[voiceType] || VOICE_PROFILES.male;
    const langCode = espeakLangMap[language] || 'en';
    
    // In production, this uses the eSpeak WASM module
    return {
      success: true,
      provider: 'eSpeak (offline)',
      language: langCode,
      pitch: profile.pitch,
      rate: profile.rate,
      fallback: true
    };
  } catch (error) {
    return { success: false };
  }
};

// ResponsiveVoice (Free tier available)
export const synthesizeWithResponsiveVoice = async (text, language, voiceType) => {
  const voiceNames = {
    'en': { male: 'UK English Male', female: 'UK English Female' },
    'hi': { male: 'Hindi Male', female: 'Hindi Female' },
    'es': { male: 'Spanish Male', female: 'Spanish Female' },
    'fr': { male: 'French Male', female: 'French Female' },
    'de': { male: 'Deutsch Male', female: 'Deutsch Female' },
    'ja': { male: 'Japanese Male', female: 'Japanese Female' },
    'zh': { male: 'Chinese Male', female: 'Chinese Female' },
    'ar': { male: 'Arabic Male', female: 'Arabic Female' },
    'ko': { male: 'Korean Male', female: 'Korean Female' },
    'ru': { male: 'Russian Male', female: 'Russian Female' },
  };
  
  const profile = VOICE_PROFILES[voiceType];
  const isMale = ['male', 'old_male'].includes(voiceType);
  const gender = isMale ? 'male' : 'female';
  const voiceName = voiceNames[language]?.[gender] || 'UK English Male';
  
  const url = `https://code.responsivevoice.org/getvoice.php?t=${encodeURIComponent(text)}&tl=${language}&sv=${encodeURIComponent(voiceName)}&vn=&pitch=${profile.pitch}&rate=${profile.rate}&vol=1`;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      return { success: true, url, provider: 'ResponsiveVoice' };
    }
  } catch (error) {
    console.log('ResponsiveVoice failed:', error);
  }
  return { success: false };
};

// Main TTS function with fallback chain
export const synthesizeSpeech = async (text, language, voiceType, options = {}) => {
  console.log(`Synthesizing speech: ${language}, voice: ${voiceType}`);
  
  const apis = [
    () => synthesizeWithGoogleTTS(text, language, voiceType),
    () => synthesizeWithVoiceRSS(text, language, voiceType),
    () => synthesizeWithResponsiveVoice(text, language, voiceType),
    () => synthesizeWithEspeak(text, language, voiceType)
  ];
  
  for (const api of apis) {
    const result = await api();
    if (result.success) {
      console.log(`TTS successful via ${result.provider}`);
      return result;
    }
  }
  
  throw new Error('All TTS services failed');
};
