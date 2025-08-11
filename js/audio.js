/**
 * AudioManager - Handles audio playback for the word builder game
 * 
 * EAL PEDAGOGY: PHONETIC AWARENESS AND PRONUNCIATION SUPPORT
 * 
 * This class implements research-based audio support for EAL vocabulary acquisition:
 * 
 * 1. PRONUNCIATION MODELING:
 *    - Native speaker pronunciation models provide accurate phonetic input
 *    - Slower speech rate (0.8x) aids comprehension for EAL learners
 *    - Reference: Input Processing Theory (VanPatten) - clear input aids acquisition
 * 
 * 2. PHONOLOGICAL AWARENESS DEVELOPMENT:
 *    - Immediate pronunciation feedback links orthography to phonology
 *    - Supports development of English phonemic awareness
 *    - Reference: Phonological Awareness in L2 Reading (Koda)
 * 
 * 3. AFFECTIVE SUPPORT THROUGH AUDIO:
 *    - Gentle, encouraging sound effects maintain positive learning environment
 *    - Success sounds trigger positive emotional associations with learning
 *    - Reference: Affective Filter Hypothesis - positive emotions aid acquisition
 * 
 * 4. MULTIMODAL LEARNING SUPPORT:
 *    - Audio reinforces visual word presentation
 *    - Supports different learning style preferences
 *    - Reference: Multimodal Learning Theory (Fleming & Mills)
 * 
 * 5. ACCESSIBILITY AND INCLUSION:
 *    - Fallback options ensure access for learners with different abilities
 *    - Volume controls accommodate different learning environments
 *    - Reference: Universal Design for Learning (UDL) principles
 * 
 * Provides Web Speech API integration with fallbacks and gentle sound effects
 * Designed for EAL learners with supportive audio feedback
 */
class AudioManager {
    constructor() {
        this.isEnabled = true;
        this.volume = 1.0;
        this.speechVolume = 1.0;
        this.effectsVolume = 0.7;
        this.speechRate = 0.8;
        this.speechPitch = 1.0;
        this.preferredVoice = null;
        this.audioContext = null;
        this.soundEffects = {};
        
        // Load preferences from localStorage
        this.loadPreferences();
        
        this.init();
    }

    /**
     * Initialize the AudioManager with feature detection and setup
     */
    init() {
        // Check Web Speech API support
        this.speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
        
        // Check Web Audio API support for sound effects
        this.webAudioSupported = 'AudioContext' in window || 'webkitAudioContext' in window;
        
        // Initialize Web Audio Context for sound effects
        if (this.webAudioSupported) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.createSoundEffects();
            } catch (error) {
                console.warn('Could not initialize Web Audio API:', error);
                this.webAudioSupported = false;
            }
        }

        // Load available voices for speech synthesis
        if (this.speechSupported) {
            this.loadVoices();
            
            // Listen for voice changes (some browsers load voices asynchronously)
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
        }

        console.log('AudioManager initialized:', {
            speechSupported: this.speechSupported,
            webAudioSupported: this.webAudioSupported,
            voicesAvailable: this.speechSupported ? speechSynthesis.getVoices().length : 0
        });
    }

    /**
     * Load and filter available voices for optimal EAL learning
     */
    loadVoices() {
        if (!this.speechSupported) return;

        const voices = speechSynthesis.getVoices();
        
        // Prefer English voices, prioritizing clear, native speakers
        const englishVoices = voices.filter(voice => 
            voice.lang.startsWith('en-') && !voice.name.includes('Google')
        );
        
        // Fallback to any English voice if no native ones found
        const fallbackVoices = voices.filter(voice => voice.lang.startsWith('en-'));
        
        const availableVoices = englishVoices.length > 0 ? englishVoices : fallbackVoices;
        
        if (availableVoices.length > 0) {
            // Prefer female voices for young learners (often perceived as more nurturing)
            this.preferredVoice = availableVoices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('samantha') ||
                voice.name.toLowerCase().includes('karen')
            ) || availableVoices[0];
        }

        console.log('Voices loaded:', {
            total: voices.length,
            english: availableVoices.length,
            preferred: this.preferredVoice?.name
        });
    }

    /**
     * Create gentle sound effects using Web Audio API
     */
    createSoundEffects() {
        if (!this.webAudioSupported || !this.audioContext) return;

        // Create success sound (gentle chime)
        this.soundEffects.success = this.createChimeSound([523.25, 659.25, 783.99], 0.8); // C5, E5, G5
        
        // Create gentle error sound (soft descending tone)
        this.soundEffects.error = this.createToneSound([440, 392], 0.5); // A4 to G4
        
        // Create level up sound (ascending arpeggio)
        this.soundEffects.levelUp = this.createChimeSound([261.63, 329.63, 392.00, 523.25], 1.2); // C4, E4, G4, C5
        
        // Create gentle click sound for interactions
        this.soundEffects.click = this.createClickSound();
    }

    /**
     * Create a chime sound effect
     */
    createChimeSound(frequencies, duration) {
        return () => {
            if (!this.audioContext || !this.isEnabled) return;

            const now = this.audioContext.currentTime;
            
            frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, now);
                oscillator.type = 'sine';
                
                const startTime = now + (index * 0.1);
                const endTime = startTime + duration;
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(this.effectsVolume * this.volume * 0.3, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
                
                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        };
    }

    /**
     * Create a gentle tone sound
     */
    createToneSound(frequencies, duration) {
        return () => {
            if (!this.audioContext || !this.isEnabled) return;

            const now = this.audioContext.currentTime;
            
            frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                const startTime = now + (index * duration / frequencies.length);
                const endTime = startTime + (duration / frequencies.length);
                
                oscillator.frequency.setValueAtTime(freq, startTime);
                oscillator.type = 'triangle';
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(this.effectsVolume * this.volume * 0.2, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
                
                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        };
    }

    /**
     * Create a gentle click sound
     */
    createClickSound() {
        return () => {
            if (!this.audioContext || !this.isEnabled) return;

            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.effectsVolume * this.volume * 0.1, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            
            oscillator.start(now);
            oscillator.stop(now + 0.1);
        };
    }

    /**
     * Play word pronunciation with fallback options
     */
    async playPronunciation(word) {
        if (!this.isEnabled || !word) return false;

        // Primary: Web Speech API
        if (this.speechSupported) {
            try {
                await this.speakWord(word);
                return true;
            } catch (error) {
                console.warn('Speech synthesis failed:', error);
            }
        }

        // Fallback: Show phonetic text if available
        this.showPhoneticFallback(word);
        return false;
    }

    /**
     * Speak a word using Web Speech API
     */
    speakWord(word) {
        return new Promise((resolve, reject) => {
            if (!this.speechSupported) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            try {
                // Cancel any ongoing speech
                speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(word);
                
                // Configure utterance
                utterance.rate = this.speechRate;
                utterance.pitch = this.speechPitch;
                utterance.volume = this.speechVolume * this.volume;
                utterance.lang = 'en-US';
                
                if (this.preferredVoice) {
                    utterance.voice = this.preferredVoice;
                }

                // Set up event handlers
                utterance.onend = () => resolve();
                utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));
                
                // Timeout fallback
                const timeout = setTimeout(() => {
                    speechSynthesis.cancel();
                    reject(new Error('Speech timeout'));
                }, 5000);

                utterance.onend = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                speechSynthesis.speak(utterance);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Show phonetic fallback when speech is unavailable
     */
    showPhoneticFallback(word) {
        // Create a temporary phonetic display
        const phoneticDisplay = document.createElement('div');
        phoneticDisplay.className = 'phonetic-fallback';
        phoneticDisplay.textContent = `🔊 ${word}`;
        phoneticDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 1rem 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            font-size: 1.5rem;
            font-weight: 600;
            z-index: 10000;
            animation: fadeInOut 2s ease;
        `;

        // Add animation styles if not already present
        if (!document.querySelector('#phonetic-fallback-styles')) {
            const style = document.createElement('style');
            style.id = 'phonetic-fallback-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20%, 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(phoneticDisplay);

        // Remove after animation
        setTimeout(() => {
            if (phoneticDisplay.parentNode) {
                phoneticDisplay.parentNode.removeChild(phoneticDisplay);
            }
        }, 2000);
    }

    /**
     * Play success sound effect
     */
    playSuccess() {
        if (!this.isEnabled) return;

        if (this.soundEffects.success) {
            this.soundEffects.success();
        } else {
            // Fallback: brief encouraging speech
            if (this.speechSupported) {
                const phrases = ['Great!', 'Well done!', 'Excellent!', 'Perfect!'];
                const phrase = phrases[Math.floor(Math.random() * phrases.length)];
                this.playPronunciation(phrase);
            }
        }
    }

    /**
     * Play gentle error sound effect
     */
    playError() {
        if (!this.isEnabled) return;

        if (this.soundEffects.error) {
            this.soundEffects.error();
        } else {
            // Fallback: gentle encouraging speech
            if (this.speechSupported) {
                const phrases = ['Try again', 'Almost there', 'Keep going'];
                const phrase = phrases[Math.floor(Math.random() * phrases.length)];
                this.playPronunciation(phrase);
            }
        }
    }

    /**
     * Play level up sound effect
     */
    playLevelUp() {
        if (!this.isEnabled) return;

        if (this.soundEffects.levelUp) {
            this.soundEffects.levelUp();
        } else {
            // Fallback: celebratory speech
            this.playPronunciation('Level up!');
        }
    }

    /**
     * Play gentle click sound
     */
    playClick() {
        if (!this.isEnabled) return;

        if (this.soundEffects.click) {
            this.soundEffects.click();
        }
    }

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.savePreferences();
        return this.isEnabled;
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.savePreferences();
    }

    /**
     * Set speech volume (0-1)
     */
    setSpeechVolume(volume) {
        this.speechVolume = Math.max(0, Math.min(1, volume));
        this.savePreferences();
    }

    /**
     * Set effects volume (0-1)
     */
    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        this.savePreferences();
    }

    /**
     * Set speech rate (0.1-2.0)
     */
    setSpeechRate(rate) {
        this.speechRate = Math.max(0.1, Math.min(2.0, rate));
        this.savePreferences();
    }

    /**
     * Set speech pitch (0-2)
     */
    setSpeechPitch(pitch) {
        this.speechPitch = Math.max(0, Math.min(2, pitch));
        this.savePreferences();
    }

    /**
     * Get available voices
     */
    getAvailableVoices() {
        if (!this.speechSupported) return [];
        return speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('en-'));
    }

    /**
     * Set preferred voice
     */
    setPreferredVoice(voiceName) {
        const voices = this.getAvailableVoices();
        this.preferredVoice = voices.find(voice => voice.name === voiceName) || null;
        this.savePreferences();
    }

    /**
     * Get current audio preferences
     */
    getPreferences() {
        return {
            isEnabled: this.isEnabled,
            volume: this.volume,
            speechVolume: this.speechVolume,
            effectsVolume: this.effectsVolume,
            speechRate: this.speechRate,
            speechPitch: this.speechPitch,
            preferredVoice: this.preferredVoice?.name || null
        };
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('wordBuilderAudioPreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.isEnabled = prefs.isEnabled !== undefined ? prefs.isEnabled : true;
                this.volume = prefs.volume || 1.0;
                this.speechVolume = prefs.speechVolume || 1.0;
                this.effectsVolume = prefs.effectsVolume || 0.7;
                this.speechRate = prefs.speechRate || 0.8;
                this.speechPitch = prefs.speechPitch || 1.0;
                // Voice will be set after voices are loaded
            }
        } catch (error) {
            console.warn('Could not load audio preferences:', error);
        }
    }

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        try {
            const prefs = this.getPreferences();
            localStorage.setItem('wordBuilderAudioPreferences', JSON.stringify(prefs));
        } catch (error) {
            console.warn('Could not save audio preferences:', error);
        }
    }

    /**
     * Resume audio context (required for some browsers)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio context resumed');
            } catch (error) {
                console.warn('Could not resume audio context:', error);
            }
        }
    }

    /**
     * Test audio functionality
     */
    async testAudio() {
        console.log('Testing audio functionality...');
        
        // Resume audio context if needed
        await this.resumeAudioContext();
        
        // Test speech
        if (this.speechSupported) {
            console.log('Testing speech synthesis...');
            await this.playPronunciation('test');
        }
        
        // Test sound effects
        if (this.webAudioSupported) {
            console.log('Testing sound effects...');
            this.playSuccess();
            setTimeout(() => this.playError(), 1000);
        }
        
        console.log('Audio test complete');
    }

    /**
     * Get audio capability information
     */
    getCapabilities() {
        return {
            speechSynthesis: this.speechSupported,
            webAudio: this.webAudioSupported,
            voicesCount: this.speechSupported ? speechSynthesis.getVoices().length : 0,
            preferredVoice: this.preferredVoice?.name || 'None',
            audioContextState: this.audioContext?.state || 'Not available'
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Cancel any ongoing speech
        if (this.speechSupported) {
            speechSynthesis.cancel();
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        // Clear references
        this.soundEffects = {};
        this.preferredVoice = null;
        this.audioContext = null;
    }
}

// Create global instance
window.AudioManager = new AudioManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}