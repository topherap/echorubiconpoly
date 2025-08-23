// VoiceManager.js - Enhanced version with proper controls
class VoiceManager {
  constructor() {
    // Core components
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    
    // State flags
    this.isListening = false;
    this.isSpeaking = false;
    
    // Feature toggles (all OFF by default)
    this.features = {
      tts: false,          // Auto-speak AI responses
      stt: false,          // Voice dictation
      wakeWord: false      // "Hi Q" active listening
    };
    
    // Callbacks
    this.callbacks = {
      onResult: null,
      onError: null,
      onStart: null,
      onEnd: null,
      onWakeWord: null
    };
    
    // Load saved preferences
    this.loadPreferences();
    
    // Initialize recognition
    this.initializeRecognition();
    
    console.log('[VoiceManager] Initialized with features:', this.features);
  }
  
  initializeRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('[VoiceManager] Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
      console.log('[VoiceManager] Recognition started');
      this.isListening = true;
      if (this.callbacks.onStart) this.callbacks.onStart();
    };
    
    this.recognition.onend = () => {
      console.log('[VoiceManager] Recognition ended');
      this.isListening = false;
      
      // Restart if wake word listening is active
      if (this.features.wakeWord) {
        setTimeout(() => this.startWakeWordListening(), 500);
      }
      
      if (this.callbacks.onEnd) this.callbacks.onEnd();
    };
    
    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      const isFinal = event.results[event.results.length - 1].isFinal;
      
      // Check for wake word
      if (this.features.wakeWord && transcript.toLowerCase().includes('hi q')) {
        console.log('[VoiceManager] Wake word detected!');
        if (this.callbacks.onWakeWord) {
          this.callbacks.onWakeWord();
        }
        return;
      }
      
      console.log(`[VoiceManager] Transcript: "${transcript}" (final: ${isFinal})`);
      
      if (this.callbacks.onResult) {
        this.callbacks.onResult(transcript, isFinal);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('[VoiceManager] Recognition error:', event.error);
      this.isListening = false;
      
      // Restart wake word listening if it was active
      if (this.features.wakeWord && event.error === 'no-speech') {
        setTimeout(() => this.startWakeWordListening(), 1000);
      }
      
      if (this.callbacks.onError) this.callbacks.onError(event.error);
    };
  }
  
  // STOP ALL - The nuclear option
  stopAll() {
    console.log('[VoiceManager] STOP ALL');
    
    // Stop speech synthesis
    this.synthesis.cancel();
    this.isSpeaking = false;
    
    // Stop recognition
    if (this.isListening) {
      this.recognition.stop();
    }
    
    // Stop any audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Notify backend to stop
    this.stopBackendAudio();
  }
  
  // Stop backend audio streams
  async stopBackendAudio() {
    try {
      await fetch('http://localhost:49200/api/voice/stop', {
        method: 'POST'
      });
    } catch (e) {
      console.error('[VoiceManager] Failed to stop backend audio:', e);
    }
  }
  
  // Toggle TTS (AI response speaking)
  setTTS(enabled) {
    this.features.tts = enabled;
    console.log(`[VoiceManager] TTS ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      this.synthesis.cancel();
    }
    
    this.savePreferences();
  }
  
  // Toggle STT (voice dictation)
  setSTT(enabled) {
    this.features.stt = enabled;
    console.log(`[VoiceManager] STT ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled && this.isListening && !this.features.wakeWord) {
      this.stopListening();
    }
    
    this.savePreferences();
  }
  
  // Toggle Wake Word ("Hi Q")
  setWakeWord(enabled) {
    this.features.wakeWord = enabled;
    console.log(`[VoiceManager] Wake word ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      this.startWakeWordListening();
    } else if (this.isListening) {
      this.stopListening();
    }
    
    this.savePreferences();
  }
  
  // Start wake word listening
  startWakeWordListening() {
    if (!this.features.wakeWord) return;
    
    try {
      this.recognition.continuous = true;
      this.recognition.start();
    } catch (e) {
      // Already listening
    }
  }
  
  // Check if AI responses should be spoken
  shouldSpeakResponse() {
    return this.features.tts;
  }
  
  // Speak text (with TTS check)
  speak(text, options = {}) {
    // Don't speak if TTS is disabled
    if (!this.features.tts && !options.forceSpeak) {
      console.log('[VoiceManager] TTS disabled, not speaking');
      return;
    }
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    
    const voices = this.synthesis.getVoices();
    if (options.voiceIndex && voices[options.voiceIndex]) {
      utterance.voice = voices[options.voiceIndex];
    }
    
    utterance.onstart = () => {
      this.isSpeaking = true;
      console.log(`[VoiceManager] Speaking: "${text.substring(0, 50)}..."`);
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      console.log('[VoiceManager] Speech completed');
      if (options.onEnd) options.onEnd();
    };
    
    utterance.onerror = (event) => {
      this.isSpeaking = false;
      console.error('[VoiceManager] Speech error:', event);
      if (options.onError) options.onError(event);
    };
    
    this.synthesis.speak(utterance);
  }
  
  // Start listening for dictation
  startListening() {
    if (!this.features.stt) {
      console.log('[VoiceManager] STT disabled');
      return;
    }
    
    if (!this.recognition) {
      console.error('[VoiceManager] Recognition not initialized');
      return;
    }
    
    if (this.isListening) {
      console.log('[VoiceManager] Already listening');
      return;
    }
    
    try {
      this.recognition.continuous = false; // One-shot for dictation
      this.recognition.start();
    } catch (error) {
      console.error('[VoiceManager] Failed to start recognition:', error);
    }
  }
  
  // Stop listening
  stopListening() {
    if (!this.isListening) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('[VoiceManager] Failed to stop recognition:', error);
    }
  }
  
  // Save preferences
  savePreferences() {
    localStorage.setItem('echo-voice-features', JSON.stringify(this.features));
  }
  
  // Load preferences
  loadPreferences() {
    try {
      const saved = localStorage.getItem('echo-voice-features');
      if (saved) {
        this.features = { ...this.features, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('[VoiceManager] Failed to load preferences:', e);
    }
  }
  
  // Get current feature states
  getFeatures() {
    return { ...this.features };
  }
  
  // Set callbacks
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }
  
  // Get available voices
  getVoices() {
    return this.synthesis.getVoices();
  }
  
  // Check states
  getIsListening() {
    return this.isListening;
  }
  
  getIsSpeaking() {
    return this.isSpeaking;
  }
  
  // Cleanup
  destroy() {
    this.stopAll();
    this.recognition = null;
    console.log('[VoiceManager] Destroyed');
  }
}

// Initialize and expose globally
window.voiceManager = new VoiceManager();
console.log('[VoiceManager] Available at window.voiceManager');

// Expose quick access methods
window.stopAllAudio = () => window.voiceManager.stopAll();