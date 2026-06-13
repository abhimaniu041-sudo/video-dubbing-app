// FREE Translation APIs with Fallback System
// Priority: MyMemory → LibreTranslate → Lingva → Argos

const TRANSLATION_APIS = [
  {
    name: 'MyMemory',
    url: 'https://api.mymemory.translated.net/get',
    free: true,
    rateLimit: '5000 words/day'
  },
  {
    name: 'LibreTranslate',
    url: 'https://libretranslate.com/translate',
    free: true,
    rateLimit: 'Unlimited (self-hosted option)'
  },
  {
    name: 'Lingva',
    url: 'https://lingva.ml/api/v1',
    free: true,
    rateLimit: 'Unlimited'
  }
];

// MyMemory Translation (Free - 5000 words/day)
const translateWithMyMemory = async (text, sourceLang, targetLang) => {
  try {
    const langPair = `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseStatus === 200) {
      return {
        success: true,
        translatedText: data.responseData.translatedText,
        provider: 'MyMemory'
      };
    }
    throw new Error('MyMemory translation failed');
  } catch (error) {
    console.log('MyMemory failed:', error.message);
    return { success: false };
  }
};

// LibreTranslate (Free & Open Source)
const translateWithLibreTranslate = async (text, sourceLang, targetLang) => {
  const servers = [
    'https://libretranslate.com',
    'https://translate.argosopentech.com',
    'https://translate.terraprint.co'
  ];
  
  for (const server of servers) {
    try {
      const response = await fetch(`${server}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      
      const data = await response.json();
      if (data.translatedText) {
        return {
          success: true,
          translatedText: data.translatedText,
          provider: `LibreTranslate (${server})`
        };
      }
    } catch (error) {
      console.log(`LibreTranslate ${server} failed:`, error.message);
    }
  }
  return { success: false };
};

// Lingva Translate (Free, Google Translate proxy)
const translateWithLingva = async (text, sourceLang, targetLang) => {
  const lingvaServers = [
    'https://lingva.ml',
    'https://lingva.garudalinux.org',
    'https://translate.plausibility.cloud'
  ];
  
  for (const server of lingvaServers) {
    try {
      const url = `${server}/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.translation) {
        return {
          success: true,
          translatedText: data.translation,
          provider: `Lingva (${server})`
        };
      }
    } catch (error) {
      console.log(`Lingva ${server} failed:`, error.message);
    }
  }
  return { success: false };
};

// Main Translation Function with Fallback
export const translateText = async (text, sourceLang, targetLang) => {
  console.log(`Translating: ${sourceLang} → ${targetLang}`);
  
  // Split long text into chunks (MyMemory has 500 char limit)
  if (text.length > 500) {
    return translateLongText(text, sourceLang, targetLang);
  }
  
  // Try each API in order
  const apis = [
    () => translateWithMyMemory(text, sourceLang, targetLang),
    () => translateWithLibreTranslate(text, sourceLang, targetLang),
    () => translateWithLingva(text, sourceLang, targetLang)
  ];
  
  for (const api of apis) {
    const result = await api();
    if (result.success) {
      console.log(`Translation successful via ${result.provider}`);
      return result.translatedText;
    }
  }
  
  throw new Error('All translation APIs failed. Please check internet connection.');
};

// Handle long text translation by chunking
const translateLongText = async (text, sourceLang, targetLang) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length < 400) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  
  const translatedChunks = [];
  for (const chunk of chunks) {
    const translated = await translateText(chunk, sourceLang, targetLang);
    translatedChunks.push(translated);
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
  }
  
  return translatedChunks.join(' ');
};

// Language Detection using multiple free APIs
export const detectLanguage = async (text) => {
  // Try MyMemory language detection
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 100))}&langpair=en|es`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseData?.detectedLanguage) {
      return data.responseData.detectedLanguage;
    }
  } catch (e) {}
  
  // Fallback: detect by character patterns
  return detectLanguageByPattern(text);
};

const detectLanguageByPattern = (text) => {
  const patterns = {
    'hi': /[\u0900-\u097F]/,
    'zh': /[\u4e00-\u9fff]/,
    'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
    'ko': /[\uac00-\ud7af]/,
    'ar': /[\u0600-\u06FF]/,
    'ru': /[\u0400-\u04FF]/,
    'el': /[\u0370-\u03FF]/,
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return lang;
  }
  return 'en'; // Default to English
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
];
