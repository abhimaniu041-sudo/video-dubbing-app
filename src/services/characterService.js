// AI Character Detection Service
// Uses: Whisper API (free) → AssemblyAI → Fallback pattern detection

export const CHARACTER_TYPES = {
  MALE: 'male',
  FEMALE: 'female',
  CHILD: 'child',
  OLD_MALE: 'old_male',
  OLD_FEMALE: 'old_female'
};

// Analyze audio pitch and characteristics to determine character type
export const analyzeVoiceCharacteristics = (audioFeatures) => {
  const { fundamentalFrequency, spectralCentroid, speakingRate, duration } = audioFeatures;
  
  // Frequency ranges for character detection
  // Male: 85-180 Hz, Female: 165-255 Hz, Child: 250-400 Hz
  if (fundamentalFrequency < 150) {
    // Male voice
    if (speakingRate < 0.8) {
      return CHARACTER_TYPES.OLD_MALE;
    }
    return CHARACTER_TYPES.MALE;
  } else if (fundamentalFrequency < 220) {
    // Could be female or old female
    if (speakingRate < 0.8) {
      return CHARACTER_TYPES.OLD_FEMALE;
    }
    return CHARACTER_TYPES.FEMALE;
  } else {
    // High pitch - child
    return CHARACTER_TYPES.CHILD;
  }
};

// Speaker diarization using free AssemblyAI
export const detectCharactersWithAssemblyAI = async (audioUrl) => {
  const ASSEMBLY_API_KEY = process.env.EXPO_PUBLIC_ASSEMBLYAI_KEY || '';
  
  if (!ASSEMBLY_API_KEY) {
    console.log('AssemblyAI key not found, using fallback');
    return null;
  }
  
  try {
    // Upload audio
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { authorization: ASSEMBLY_API_KEY },
      body: audioUrl
    });
    
    const uploadData = await uploadResponse.json();
    
    // Request transcription with speaker diarization
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: ASSEMBLY_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: uploadData.upload_url,
        speaker_labels: true,
        speakers_expected: null // Auto-detect number of speakers
      })
    });
    
    const transcriptData = await transcriptResponse.json();
    
    // Poll for completion
    let result = transcriptData;
    while (result.status !== 'completed' && result.status !== 'error') {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const pollResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${result.id}`,
        { headers: { authorization: ASSEMBLY_API_KEY } }
      );
      result = await pollResponse.json();
    }
    
    if (result.status === 'completed') {
      return processAssemblyAIResult(result);
    }
  } catch (error) {
    console.log('AssemblyAI failed:', error);
  }
  return null;
};

// Process AssemblyAI results into character profiles
const processAssemblyAIResult = (result) => {
  const speakers = {};
  
  result.utterances?.forEach(utterance => {
    const speakerId = utterance.speaker;
    
    if (!speakers[speakerId]) {
      speakers[speakerId] = {
        id: speakerId,
        utterances: [],
        totalDuration: 0,
        avgConfidence: 0
      };
    }
    
    speakers[speakerId].utterances.push({
      text: utterance.text,
      start: utterance.start,
      end: utterance.end,
      confidence: utterance.confidence
    });
    
    speakers[speakerId].totalDuration += (utterance.end - utterance.start);
  });
  
  // Assign character types based on speaker patterns
  const characters = Object.values(speakers).map((speaker, index) => ({
    ...speaker,
    characterType: assignCharacterType(speaker, index),
    name: `Character ${index + 1}`
  }));
  
  return characters;
};

// Assign character types using heuristics
const assignCharacterType = (speaker, index) => {
  // In production, use actual audio analysis
  // For now, cycle through types based on patterns
  const types = [
    CHARACTER_TYPES.MALE,
    CHARACTER_TYPES.FEMALE,
    CHARACTER_TYPES.OLD_MALE,
    CHARACTER_TYPES.OLD_FEMALE,
    CHARACTER_TYPES.CHILD
  ];
  
  return types[index % types.length];
};

// Whisper API for free transcription (using Hugging Face)
export const transcribeWithWhisper = async (audioBlob, language = null) => {
  const HF_SERVERS = [
    'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
    'https://api-inference.huggingface.co/models/openai/whisper-medium',
    'https://api-inference.huggingface.co/models/openai/whisper-base'
  ];
  
  const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN || '';
  
  for (const server of HF_SERVERS) {
    try {
      const headers = { 'Content-Type': 'audio/wav' };
      if (HF_TOKEN) headers['Authorization'] = `Bearer ${HF_TOKEN}`;
      
      const response = await fetch(server, {
        method: 'POST',
        headers,
        body: audioBlob
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          text: data.text,
          language: data.language || language,
          provider: 'Whisper (HuggingFace)'
        };
      }
    } catch (error) {
      console.log(`Whisper ${server} failed:`, error);
    }
  }
  
  return { success: false };
};

// Local pattern-based speaker detection fallback
export const detectSpeakersLocal = (transcriptSegments) => {
  // Simple pattern: detect speaker changes by silence and tone changes
  const speakers = [];
  let currentSpeaker = null;
  let speakerCount = 0;
  
  transcriptSegments.forEach((segment, index) => {
    // Detect speaker change by silence gap > 1 second
    const prevSegment = transcriptSegments[index - 1];
    const gapFromPrev = prevSegment ? (segment.start - prevSegment.end) : 0;
    
    if (gapFromPrev > 1000 || index === 0) {
      // Potential speaker change
      speakerCount++;
      currentSpeaker = {
        id: `SPEAKER_${speakerCount}`,
        characterType: CHARACTER_TYPES.MALE,
        segments: []
      };
      speakers.push(currentSpeaker);
    }
    
    if (currentSpeaker) {
      currentSpeaker.segments.push(segment);
    }
  });
  
  // Assign character types
  speakers.forEach((speaker, i) => {
    const types = Object.values(CHARACTER_TYPES);
    speaker.characterType = types[i % types.length];
  });
  
  return speakers;
};

export const CHARACTER_DISPLAY_INFO = {
  [CHARACTER_TYPES.MALE]: {
    icon: '👨',
    label: 'Adult Male',
    color: '#4A90E2',
    voicePitch: 0.8
  },
  [CHARACTER_TYPES.FEMALE]: {
    icon: '👩',
    label: 'Adult Female',
    color: '#E24A90',
    voicePitch: 1.2
  },
  [CHARACTER_TYPES.CHILD]: {
    icon: '👧',
    label: 'Child',
    color: '#90E24A',
    voicePitch: 1.6
  },
  [CHARACTER_TYPES.OLD_MALE]: {
    icon: '👴',
    label: 'Old Man',
    color: '#E2904A',
    voicePitch: 0.7
  },
  [CHARACTER_TYPES.OLD_FEMALE]: {
    icon: '👵',
    label: 'Old Woman',
    color: '#904AE2',
    voicePitch: 1.0
  }
};
