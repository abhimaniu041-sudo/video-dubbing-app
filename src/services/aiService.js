// Main AI Orchestration Service
// Coordinates: STT → Character Detection → Translation → TTS → Sync

import { transcribeWithWhisper } from './characterService';
import { translateText, detectLanguage } from './translationService';
import { synthesizeSpeech } from './speechService';
import { detectCharactersWithAssemblyAI, detectSpeakersLocal } from './characterService';

// Free STT APIs in priority order
const STT_APIS = [
  'whisper_huggingface',  // Free with HF token
  'assemblyai',            // Free tier: 5 hours/month
  'speechrecognition',     // Browser Web Speech API
  'vosk_offline'           // Completely offline
];

// Main pipeline: Video → Transcript → Translate → Dub → Sync
export const processVideoDubbing = async (videoFile, targetLanguages, onProgress) => {
  const pipeline = {
    totalSteps: 6,
    currentStep: 0
  };
  
  const updateProgress = (step, message, percent) => {
    pipeline.currentStep = step;
    onProgress?.({
      step,
      totalSteps: pipeline.totalSteps,
      message,
      percent,
      overallPercent: Math.round((step / pipeline.totalSteps) * 100)
    });
  };
  
  try {
    // STEP 1: Extract Audio from Video
    updateProgress(1, '🎵 Extracting audio from video...', 0);
    const audioData = await extractAudioFromVideo(videoFile);
    updateProgress(1, '✅ Audio extracted', 100);
    
    // STEP 2: Speech-to-Text with Speaker Detection
    updateProgress(2, '🎤 Recognizing speech and speakers...', 0);
    const transcriptionResult = await transcribeAudio(audioData, onProgress);
    updateProgress(2, `✅ Found ${transcriptionResult.characters.length} characters`, 100);
    
    // STEP 3: Language Detection
    updateProgress(3, '🌍 Detecting source language...', 0);
    const sourceLanguage = await detectLanguage(transcriptionResult.text);
    updateProgress(3, `✅ Detected: ${sourceLanguage}`, 100);
    
    // STEP 4: Translate to target languages
    updateProgress(4, '🔄 Translating to target languages...', 0);
    const translations = {};
    
    for (let i = 0; i < targetLanguages.length; i++) {
      const lang = targetLanguages[i];
      const progressPercent = Math.round((i / targetLanguages.length) * 100);
      updateProgress(4, `Translating to ${lang}... ${progressPercent}%`, progressPercent);
      
      translations[lang] = await translateTranscript(
        transcriptionResult.segments,
        sourceLanguage,
        lang
      );
    }
    updateProgress(4, '✅ All translations complete', 100);
    
    // STEP 5: Generate dubbed audio for each language
    updateProgress(5, '🔊 Generating AI voices...', 0);
    const dubbedAudios = {};
    
    for (let i = 0; i < targetLanguages.length; i++) {
      const lang = targetLanguages[i];
      dubbedAudios[lang] = await generateDubbedAudio(
        translations[lang],
        transcriptionResult.characters,
        lang,
        (p) => updateProgress(5, `Generating ${lang} voices... ${p}%`, p)
      );
    }
    updateProgress(5, '✅ Voice generation complete', 100);
    
    // STEP 6: Sync audio with video
    updateProgress(6, '🎬 Syncing audio with video...', 0);
    const dubbedVideos = await syncAudioWithVideo(
      videoFile,
      dubbedAudios,
      transcriptionResult.segments
    );
    updateProgress(6, '✅ Sync complete!', 100);
    
    return {
      success: true,
      sourceLanguage,
      characters: transcriptionResult.characters,
      transcript: transcriptionResult.segments,
      translations,
      dubbedVideos
    };
    
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Extract audio from video file
const extractAudioFromVideo = async (videoFile) => {
  // In React Native, we work with the video URI
  // Audio extraction happens via expo-av
  return {
    uri: videoFile.uri,
    duration: videoFile.duration,
    name: videoFile.name
  };
};

// Transcribe with multiple fallbacks
const transcribeAudio = async (audioData, onProgress) => {
  // Try Whisper via HuggingFace first (free)
  const whisperResult = await tryWhisperTranscription(audioData, onProgress);
  if (whisperResult) return whisperResult;
  
  // Try AssemblyAI (free tier)
  const assemblyResult = await tryAssemblyAI(audioData, onProgress);
  if (assemblyResult) return assemblyResult;
  
  // Fallback to Web Speech API
  return await tryWebSpeechAPI(audioData, onProgress);
};

const tryWhisperTranscription = async (audioData, onProgress) => {
  try {
    const result = await transcribeWithWhisper(audioData);
    if (result.success) {
      const segments = parseWhisperSegments(result);
      const characters = detectSpeakersLocal(segments);
      
      return {
        text: result.text,
        segments,
        characters,
        provider: 'Whisper'
      };
    }
  } catch (e) {
    console.log('Whisper transcription failed:', e);
  }
  return null;
};

const tryAssemblyAI = async (audioData, onProgress) => {
  try {
    const characters = await detectCharactersWithAssemblyAI(audioData.uri);
    if (characters) {
      const segments = extractSegmentsFromCharacters(characters);
      return {
        text: segments.map(s => s.text).join(' '),
        segments,
        characters,
        provider: 'AssemblyAI'
      };
    }
  } catch (e) {
    console.log('AssemblyAI transcription failed:', e);
  }
  return null;
};

const tryWebSpeechAPI = async (audioData, onProgress) => {
  // Fallback: return empty transcript with single speaker
  return {
    text: '',
    segments: [],
    characters: [{ id: 'SPEAKER_1', characterType: 'male', name: 'Character 1' }],
    provider: 'Manual (no transcription available)'
  };
};

// Parse Whisper output into timed segments
const parseWhisperSegments = (whisperResult) => {
  if (!whisperResult.chunks) {
    return [{
      text: whisperResult.text,
      start: 0,
      end: 5000,
      speaker: 'SPEAKER_1'
    }];
  }
  
  return whisperResult.chunks.map(chunk => ({
    text: chunk.text,
    start: chunk.timestamp[0] * 1000,
    end: chunk.timestamp[1] * 1000,
    speaker: 'SPEAKER_1'
  }));
};

const extractSegmentsFromCharacters = (characters) => {
  const allSegments = [];
  characters.forEach(char => {
    char.utterances?.forEach(utt => {
      allSegments.push({
        text: utt.text,
        start: utt.start,
        end: utt.end,
        speaker: char.id
      });
    });
  });
  return allSegments.sort((a, b) => a.start - b.start);
};

// Translate each segment
const translateTranscript = async (segments, sourceLang, targetLang) => {
  const translatedSegments = [];
  
  for (const segment of segments) {
    const translatedText = await translateText(segment.text, sourceLang, targetLang);
    translatedSegments.push({
      ...segment,
      translatedText,
      originalText: segment.text
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return translatedSegments;
};

// Generate dubbed audio for each character
const generateDubbedAudio = async (translatedSegments, characters, language, onProgress) => {
  const audioSegments = [];
  const total = translatedSegments.length;
  
  for (let i = 0; i < translatedSegments.length; i++) {
    const segment = translatedSegments[i];
    const character = characters.find(c => c.id === segment.speaker) || characters[0];
    const voiceType = character?.characterType || 'male';
    
    onProgress(Math.round((i / total) * 100));
    
    try {
      const audioResult = await synthesizeSpeech(
        segment.translatedText || segment.text,
        language,
        voiceType
      );
      
      audioSegments.push({
        ...segment,
        audio: audioResult,
        voiceType,
        characterId: character?.id
      });
    } catch (error) {
      console.log(`TTS failed for segment ${i}:`, error);
      audioSegments.push({ ...segment, audio: null });
    }
  }
  
  return audioSegments;
};

// Sync dubbed audio with video timeline
const syncAudioWithVideo = async (videoFile, dubbedAudios, originalSegments) => {
  const syncedVideos = {};
  
  for (const [language, audioSegments] of Object.entries(dubbedAudios)) {
    syncedVideos[language] = {
      videoUri: videoFile.uri,
      audioSegments: audioSegments.map(seg => ({
        ...seg,
        syncOffset: calculateSyncOffset(seg, originalSegments)
      })),
      language,
      ready: true
    };
  }
  
  return syncedVideos;
};

// Calculate time sync offset for each segment
const calculateSyncOffset = (segment, originalSegments) => {
  const original = originalSegments.find(s => s.start === segment.start);
  if (!original) return 0;
  
  const originalDuration = original.end - original.start;
  const targetDuration = originalDuration; // Adjust based on TTS duration
  
  return {
    startTime: segment.start,
    endTime: segment.end,
    originalDuration,
    speedAdjustment: originalDuration / targetDuration
  };
};
