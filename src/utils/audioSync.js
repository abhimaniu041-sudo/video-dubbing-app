// Audio-Video Synchronization Engine

export class AudioSyncEngine {
  constructor() {
    this.segments = [];
    this.videoElement = null;
    this.audioElements = {};
    this.currentLanguage = null;
    this.isPlaying = false;
    this.syncOffset = 0;
  }
  
  // Load video and dubbed audio segments
  async initialize(videoUri, dubbedAudioData, language) {
    this.currentLanguage = language;
    this.segments = dubbedAudioData[language] || [];
    
    console.log(`AudioSync initialized: ${this.segments.length} segments for ${language}`);
    return true;
  }
  
  // Calculate which audio segment to play at given video time
  getSegmentForTime(timeMs) {
    return this.segments.find(seg => 
      timeMs >= seg.start && timeMs <= seg.end
    );
  }
  
  // Get all segments with their sync data
  getTimeline() {
    return this.segments.map(seg => ({
      id: `${seg.start}-${seg.end}`,
      startMs: seg.start,
      endMs: seg.end,
      duration: seg.end - seg.start,
      text: seg.translatedText,
      originalText: seg.originalText,
      voiceType: seg.voiceType,
      audioUrl: seg.audio?.url || seg.audio?.audioUrls?.[0]
    }));
  }
  
  // Adjust audio speed to match original duration
  calculateSpeedAdjustment(originalDurationMs, ttsDurationMs) {
    if (!ttsDurationMs || ttsDurationMs === 0) return 1.0;
    
    const ratio = originalDurationMs / ttsDurationMs;
    
    // Clamp to reasonable range (50% to 200% speed)
    return Math.max(0.5, Math.min(2.0, ratio));
  }
  
  // Generate subtitle/caption data for sync display
  generateSubtitles(language) {
    return this.segments.map(seg => ({
      startTime: seg.start / 1000, // Convert to seconds
      endTime: seg.end / 1000,
      text: seg.translatedText || seg.text,
      speaker: seg.speaker
    }));
  }
  
  // Export sync data as SRT format
  exportAsSRT() {
    let srt = '';
    this.segments.forEach((seg, index) => {
      const startTime = formatSRTTime(seg.start);
      const endTime = formatSRTTime(seg.end);
      srt += `${index + 1}\n${startTime} --> ${endTime}\n${seg.translatedText || seg.text}\n\n`;
    });
    return srt;
  }
  
  // Export sync data as VTT format
  exportAsVTT() {
    let vtt = 'WEBVTT\n\n';
    this.segments.forEach(seg => {
      const startTime = formatVTTTime(seg.start);
      const endTime = formatVTTTime(seg.end);
      vtt += `${startTime} --> ${endTime}\n${seg.translatedText || seg.text}\n\n`;
    });
    return vtt;
  }
}

const formatSRTTime = (ms) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
};

const formatVTTTime = (ms) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
};

const pad = (num, size = 2) => String(num).padStart(size, '0');
