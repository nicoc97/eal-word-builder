/**
 * ProgressTracker - Enhanced progress tracking with offline capability
 * 
 * EAL PEDAGOGY: LEARNER-CENTERED PROGRESS MONITORING
 * 
 * This class implements research-based progress tracking principles for EAL learners:
 * 
 * 1. COMPREHENSIVE LEARNING ANALYTICS:
 *    - Tracks accuracy, time, streaks, and error patterns
 *    - Provides data for adaptive instruction and intervention
 *    - Reference: Learning Analytics in Language Education (Greller & Drachsler)
 * 
 * 2. MOTIVATIONAL PROGRESS VISUALIZATION:
 *    - Streak tracking builds intrinsic motivation through achievement
 *    - Progress persistence maintains continuity across sessions
 *    - Reference: Self-Determination Theory - competence and autonomy
 * 
 * 3. OFFLINE LEARNING SUPPORT:
 *    - Ensures learning continuity regardless of connectivity
 *    - Reduces barriers to access for diverse learner populations
 *    - Reference: Digital Divide research in educational technology
 * 
 * 4. INDIVIDUAL LEARNING PACE ACCOMMODATION:
 *    - No time pressure or forced progression
 *    - Respects individual differences in language acquisition rates
 *    - Reference: Individual Differences in SLA (Dörnyei)
 * 
 * Handles local storage backup, server sync, and offline mode detection
 */
class ProgressTracker {
    constructor() {
        /**
         * SESSION MANAGEMENT FIX
         * 
         * PROBLEM: Previously generated session ID immediately in constructor
         * causing duplicate sessions when multiple components initialized
         * 
         * SOLUTION: Defer session generation until after checking local storage
         * This ensures we reuse existing sessions rather than creating duplicates
         */
        this.sessionId = null;  // Don't generate yet - wait for init()
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.lastSyncAttempt = null;
        this.syncRetryCount = 0;
        this.maxRetries = 3;
        this.syncInterval = null;

        /**
         * PROGRESS DATA STRUCTURE
         * 
         * Initialize with null sessionId - will be populated during init()
         * This prevents race conditions where multiple components might
         * read different session IDs during initialization
         */
        this.data = {
            sessionId: null,  // Will be set in init()
            level: 1,
            score: 0,
            wordsCompleted: 0,
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: 100,
            currentStreak: 0,
            bestStreak: 0,
            timeSpent: 0,
            timeStarted: new Date().toISOString(),
            lastPlayed: new Date().toISOString(),
            levelProgress: {},
            wordAttempts: [],
            needsSync: false,
            version: 1
        };

        // Initialize asynchronously to properly load existing sessions
        this.init();
    }

    /**
     * Initialize the progress tracker
     * 
     * INITIALIZATION SEQUENCE FIX:
     * 1. Set up network listeners (passive - no API calls)
     * 2. Load from local storage FIRST (check for existing session)
     * 3. Generate session ID only if none exists
     * 4. Sync with server only after session is established
     * 
     * This sequence prevents duplicate session creation and ensures
     * consistent session ID across all components
     */
    async init() {
        // Set up online/offline event listeners (passive setup)
        this.setupNetworkListeners();

        /**
         * CRITICAL FIX: Load existing session before generating new one
         * This is the key to preventing duplicate sessions
         */
        await this.loadFromLocal();

        /**
         * SESSION GENERATION LOGIC
         * Only generate a new session if we don't have one from local storage
         * This ensures session persistence across page reloads
         */
        if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
            this.data.sessionId = this.sessionId;

            // Save immediately to establish this as the canonical session
            this.saveToLocal();

            console.log('Generated new session:', this.sessionId);
        } else {
            console.log('Using existing session:', this.sessionId);
        }

        /**
         * SYNC TIMING FIX
         * Only attempt sync AFTER session is established
         * Add small delay to prevent race with WordBuilderGame initialization
         */
        if (this.isOnline) {
            // Delay initial sync slightly to avoid collision with game init
            setTimeout(() => {
                if (!this.syncInProgress) {
                    this.syncWithServer();
                }
            }, 100);
        }

        // Set up periodic sync (passive - only syncs when needed)
        this.setupPeriodicSync();

        console.log('ProgressTracker initialized:', {
            sessionId: this.sessionId,
            isOnline: this.isOnline,
            needsSync: this.data.needsSync
        });
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Set up network status listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Connection restored');
            this.isOnline = true;
            this.onConnectionRestored();
        });

        window.addEventListener('offline', () => {
            console.log('Connection lost');
            this.isOnline = false;
            this.onConnectionLost();
        });
    }

    /**
     * Handle connection restored
     */
    async onConnectionRestored() {
        this.showNetworkStatus('Connection restored! Syncing progress...', 'success');

        // Reset retry count
        this.syncRetryCount = 0;

        // Attempt to sync
        await this.syncWithServer();

        // Resume periodic sync
        this.setupPeriodicSync();
    }

    /**
     * Handle connection lost
     */
    onConnectionLost() {
        this.showNetworkStatus('Playing offline - progress will sync when connection returns', 'warning');

        // Clear periodic sync
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Load progress from local storage
     * 
     * ENHANCED WITH SESSION RECOVERY:
     * - Prioritizes existing session ID from localStorage
     * - Validates data integrity before accepting
     * - Preserves session continuity across page reloads
     */
    async loadFromLocal() {
        try {
            const savedData = localStorage.getItem('wordBuilderProgress');
            if (savedData) {
                const parsed = JSON.parse(savedData);

                // Validate data integrity
                if (this.validateProgressData(parsed)) {
                    /**
                     * SESSION RESTORATION
                     * Critical: Restore the session ID from saved data
                     * This prevents creating a new session on every page load
                     */
                    this.data = { ...this.data, ...parsed };
                    this.sessionId = parsed.sessionId || this.sessionId;

                    console.log('Progress and session restored from local storage');
                } else {
                    console.warn('Invalid progress data in local storage, will create new session');
                    // Don't save yet - wait for session generation in init()
                }
            } else {
                console.log('No saved progress found, will create new session');
            }
        } catch (loadError) {
            console.error('Error loading progress from local storage:', loadError);
            // Don't save yet - wait for session generation in init()
        }
    }

    /**
     * Save progress to local storage
     */
    saveToLocal() {
        try {
            const dataToSave = {
                ...this.data,
                lastPlayed: new Date().toISOString()
            };

            localStorage.setItem('wordBuilderProgress', JSON.stringify(dataToSave));
            console.log('Progress saved to local storage');
        } catch (error) {
            console.error('Error saving progress to local storage:', error);
            this.showNetworkStatus('Warning: Could not save progress locally', 'error');
        }
    }

    /**
     * Validate progress data integrity
     */
    validateProgressData(data) {
        if (!data || typeof data !== 'object') return false;

        // Check required fields
        const requiredFields = ['sessionId', 'level', 'score', 'wordsCompleted'];
        for (const field of requiredFields) {
            if (!(field in data)) return false;
        }

        // Check data types and ranges
        if (typeof data.level !== 'number' || data.level < 1) return false;
        if (typeof data.score !== 'number' || data.score < 0) return false;
        if (typeof data.wordsCompleted !== 'number' || data.wordsCompleted < 0) return false;

        // Check accuracy is within valid range
        if (data.accuracy !== undefined && (data.accuracy < 0 || data.accuracy > 100)) return false;

        return true;
    }

    /**
     * Update progress data
     */
    updateProgress(updates) {
        // Validate updates
        if (!updates || typeof updates !== 'object') {
            console.warn('Invalid progress updates provided');
            return;
        }

        // Update data
        this.data = { ...this.data, ...updates };
        this.data.lastPlayed = new Date().toISOString();
        this.data.needsSync = true;

        // Save locally immediately
        this.saveToLocal();

        // Attempt server sync if online
        if (this.isOnline && !this.syncInProgress) {
            this.syncWithServer();
        }

        console.log('Progress updated:', updates);
    }

    /**
     * Record a word attempt for detailed analytics
     */
    recordWordAttempt(word, level, success, timeTaken = 0, errorPattern = null) {
        const attempt = {
            word,
            level,
            success,
            timeTaken,
            errorPattern,
            timestamp: new Date().toISOString()
        };

        this.data.wordAttempts.push(attempt);
        this.data.totalAttempts++;

        if (success) {
            this.data.correctAttempts++;
            this.data.currentStreak++;
            this.data.bestStreak = Math.max(this.data.bestStreak, this.data.currentStreak);
        } else {
            this.data.currentStreak = 0;
        }

        // Calculate accuracy
        this.data.accuracy = (this.data.correctAttempts / this.data.totalAttempts) * 100;

        // Keep only last 100 attempts to prevent storage bloat
        if (this.data.wordAttempts.length > 100) {
            this.data.wordAttempts = this.data.wordAttempts.slice(-100);
        }

        this.updateProgress({});
    }

    /**
     * Sync progress with server
     */
    async syncWithServer() {
        if (this.syncInProgress || !this.isOnline) {
            return;
        }

        this.syncInProgress = true;
        this.lastSyncAttempt = new Date().toISOString();

        try {
            // First, try to get server data
            const serverData = await this.fetchServerProgress();

            // Merge local and server data
            const mergedData = this.mergeProgressData(this.data, serverData);

            // Save merged data to server
            await this.saveToServer(mergedData);

            // Update local data
            this.data = mergedData;
            this.data.needsSync = false;
            this.saveToLocal();

            // Reset retry count on success
            this.syncRetryCount = 0;

            console.log('Progress synced successfully');
            this.showNetworkStatus('Progress synced!', 'success', 2000);

        } catch (error) {
            console.error('Sync failed:', error);
            this.handleSyncError(error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Fetch progress from server
     */
    async fetchServerProgress() {
        const response = await fetch(`api/index.php?endpoint=progress&sessionId=${this.sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch progress');
        }

        return result.data || {};
    }

    /**
     * Save progress to server
     */
    async saveToServer(data) {
        const response = await fetch('api/index.php?endpoint=progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to save progress');
        }

        return result.data;
    }

    /**
     * Merge local and server progress data
     */
    mergeProgressData(localData, serverData) {
        if (!serverData || Object.keys(serverData).length === 0) {
            return localData;
        }

        // Use the data with the most recent lastPlayed timestamp
        const localTime = new Date(localData.lastPlayed || 0);
        const serverTime = new Date(serverData.lastPlayed || 0);

        let mergedData;
        if (localTime > serverTime) {
            // Local data is newer
            mergedData = { ...serverData, ...localData };
        } else {
            // Server data is newer or equal
            mergedData = { ...localData, ...serverData };
        }

        // Merge word attempts arrays
        if (localData.wordAttempts && serverData.wordAttempts) {
            const allAttempts = [...localData.wordAttempts, ...serverData.wordAttempts];
            // Remove duplicates and sort by timestamp
            const uniqueAttempts = allAttempts.filter((attempt, index, arr) =>
                arr.findIndex(a => a.timestamp === attempt.timestamp && a.word === attempt.word) === index
            ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            mergedData.wordAttempts = uniqueAttempts.slice(-100); // Keep last 100
        }

        // Merge level progress
        if (localData.levelProgress && serverData.levelProgress) {
            mergedData.levelProgress = { ...serverData.levelProgress, ...localData.levelProgress };
        }

        // Ensure data integrity
        mergedData.accuracy = mergedData.totalAttempts > 0 ?
            (mergedData.correctAttempts / mergedData.totalAttempts) * 100 : 100;

        return mergedData;
    }

    /**
     * Handle sync errors with retry logic
     */
    handleSyncError(error) {
        this.syncRetryCount++;

        if (this.syncRetryCount < this.maxRetries) {
            const retryDelay = Math.pow(2, this.syncRetryCount) * 1000; // Exponential backoff
            console.log(`Sync failed, retrying in ${retryDelay}ms (attempt ${this.syncRetryCount}/${this.maxRetries})`);

            setTimeout(() => {
                this.syncWithServer();
            }, retryDelay);
        } else {
            console.error('Max sync retries reached, will try again later');
            this.showNetworkStatus('Sync failed - playing offline', 'warning');
        }
    }

    /**
     * Set up periodic sync
     */
    setupPeriodicSync() {
        // Clear existing interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Only set up if online
        if (!this.isOnline) return;

        // Sync every 30 seconds if there are changes
        this.syncInterval = setInterval(() => {
            if (this.data.needsSync && !this.syncInProgress) {
                this.syncWithServer();
            }
        }, 30000);
    }

    /**
     * Show network status message to user
     */
    showNetworkStatus(message, type = 'info', duration = 5000) {
        // Create or update status element
        let statusElement = document.getElementById('network-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'network-status';
            statusElement.className = 'network-status';
            document.body.appendChild(statusElement);
        }

        statusElement.textContent = message;
        statusElement.className = `network-status ${type} show`;

        // Auto-hide after duration
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, duration);
    }

    /**
     * Get current progress data
     */
    getProgress() {
        return { ...this.data };
    }

    /**
     * Get offline status
     */
    isOffline() {
        return !this.isOnline;
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
            needsSync: this.data.needsSync,
            lastSyncAttempt: this.lastSyncAttempt,
            syncRetryCount: this.syncRetryCount
        };
    }

    /**
     * Force sync (for manual sync button)
     */
    async forceSync() {
        if (!this.isOnline) {
            this.showNetworkStatus('Cannot sync while offline', 'error');
            return false;
        }

        this.syncRetryCount = 0; // Reset retry count for manual sync
        await this.syncWithServer();
        return true;
    }

    /**
     * Reset progress data
     */
    reset() {
        this.data = {
            sessionId: this.generateSessionId(),
            level: 1,
            score: 0,
            wordsCompleted: 0,
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: 100,
            currentStreak: 0,
            bestStreak: 0,
            timeSpent: 0,
            timeStarted: new Date().toISOString(),
            lastPlayed: new Date().toISOString(),
            levelProgress: {},
            wordAttempts: [],
            needsSync: true,
            version: 1
        };

        this.sessionId = this.data.sessionId;
        this.saveToLocal();

        if (this.isOnline) {
            this.syncWithServer();
        }
    }

    /**
     * Export progress data for backup
     */
    exportProgress() {
        return JSON.stringify(this.data, null, 2);
    }

    /**
     * Import progress data from backup
     */
    importProgress(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            if (this.validateProgressData(importedData)) {
                this.data = { ...this.data, ...importedData };
                this.data.needsSync = true;
                this.saveToLocal();

                if (this.isOnline) {
                    this.syncWithServer();
                }

                return true;
            } else {
                throw new Error('Invalid progress data format');
            }
        } catch (error) {
            console.error('Failed to import progress:', error);
            return false;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        window.removeEventListener('online', this.onConnectionRestored);
        window.removeEventListener('offline', this.onConnectionLost);
    }
}

// Legacy ProgressManager for backward compatibility
class ProgressManager {
    constructor() {
        console.warn('ProgressManager is deprecated, use ProgressTracker instead');
        this.tracker = new ProgressTracker();
    }

    generateSessionId() {
        return this.tracker.generateSessionId();
    }

    loadProgress() {
        return this.tracker.loadFromLocal();
    }

    saveProgress() {
        return this.tracker.saveToLocal();
    }

    updateProgress(updates) {
        return this.tracker.updateProgress(updates);
    }

    getProgress() {
        return this.tracker.getProgress();
    }

    reset() {
        return this.tracker.reset();
    }
}

// Create global instances
window.ProgressTracker = new ProgressTracker();
window.ProgressManager = new ProgressManager(); // For backward compatibility

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressTracker, ProgressManager };
}