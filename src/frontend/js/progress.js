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
        this.initInProgress = false; // Prevent multiple init calls
        this.lastSyncAttempt = null;
        this.syncRetryCount = 0;
        this.maxRetries = 3;
        this.syncInterval = null;
        this.scheduledSyncTimeout = null;

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
        // Prevent multiple initialization calls
        if (this.initInProgress) {
            console.log('Init already in progress, skipping duplicate call');
            return;
        }
        
        this.initInProgress = true;

        try {
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
             * Add delay to prevent race with WordBuilderGame initialization
             */
            if (this.isOnline) {
                // Delay initial sync to avoid collision with game init
                setTimeout(() => {
                    if (!this.syncInProgress && !this.initInProgress) {
                        this.syncWithServer();
                    }
                }, 1500); // Increased delay to 1.5s for Railway cold start
            }

            // Set up periodic sync (passive - only syncs when needed)
            this.setupPeriodicSync();

            console.log('ProgressTracker initialized:', {
                sessionId: this.sessionId,
                isOnline: this.isOnline,
                needsSync: this.data.needsSync
            });
        } finally {
            this.initInProgress = false;
        }
    }

    /**
     * Load a specific session for selected student from landing page
     * 
     * This method forces the ProgressTracker to use a specific session ID
     * and loads the associated progress data from server/local storage.
     */
    async loadSpecificSession(sessionId) {
        if (!sessionId) {
            console.warn('loadSpecificSession called with empty session ID');
            return;
        }

        console.log('Loading specific session:', sessionId);
        
        // CRITICAL FIX: Stop any ongoing initialization to prevent race condition
        // This prevents the init() method from creating a duplicate anonymous session
        this.initInProgress = false;
        
        try {
            // Set the session ID immediately
            this.sessionId = sessionId;
            this.data.sessionId = sessionId;
            
            // Try to load progress for this specific session from server
            if (this.isOnline) {
                try {
                    // Add timeout to prevent hanging
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout
                    
                    const response = await fetch(`${this.getApiBaseUrl()}progress/${sessionId}`, {
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const serverData = await response.json();
                        if (serverData && serverData.sessionId === sessionId) {
                            this.data = { ...this.data, ...this.transformDataFromAPI(serverData) };
                            this.saveToLocal(); // Save to local storage
                            console.log('Loaded specific session from server:', sessionId);
                            return;
                        }
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.warn('Session load timed out, falling back to local storage');
                    } else {
                        console.warn('Failed to load specific session from server:', error);
                    }
                }
            }
            
            // Fallback: Check if we have this session in local storage
            const savedData = localStorage.getItem('wordBuilderProgress');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.sessionId === sessionId && this.validateProgressData(parsed)) {
                    this.data = { ...this.data, ...parsed };
                    console.log('Loaded specific session from local storage:', sessionId);
                    return;
                }
            }
            
            // If we can't find the session, keep the ID but reset progress
            console.log('Session not found, starting with fresh progress for session:', sessionId);
            this.data = {
                ...this.data,
                sessionId: sessionId,
                level: 1,
                score: 0,
                wordsCompleted: 0,
                timeStarted: new Date().toISOString(),
                lastPlayed: new Date().toISOString()
            };
            this.saveToLocal();
            
        } catch (error) {
            console.error('Error loading specific session:', error);
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        // Use shorter format to stay under 100 char validation limit
        const shortTimestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 8);
        return 'session_' + shortTimestamp + '_' + randomPart;
    }

    /**
     * Get the correct API base URL based on current location
     */
    getApiBaseUrl() {
        // If we're running on localhost:8000, use relative path
        if (window.location.port === '8000' || window.location.href.includes('localhost:8000')) {
            return '../src/backend/api/';
        }
        // If we're on Railway production, use relative path
        return '../src/backend/api/';
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
        console.log('🔄 ProgressTracker.updateProgress called with:', updates);
        console.log('Current session ID:', this.sessionId);
        console.log('Is online?', this.isOnline);
        console.log('Sync in progress?', this.syncInProgress);
        
        // Validate updates
        if (!updates || typeof updates !== 'object') {
            console.warn('Invalid progress updates provided');
            return;
        }

        // Update data
        this.data = { ...this.data, ...updates };
        this.data.lastPlayed = new Date().toISOString();
        this.data.needsSync = true;

        console.log('📈 Updated progress data:', this.data);

        // Save locally immediately
        this.saveToLocal();
        console.log('💾 Saved to local storage');

        // Schedule server sync instead of immediate sync to prevent data conflicts
        if (this.isOnline && !this.syncInProgress) {
            console.log('🌐 Scheduling server sync in 2 seconds...');
            clearTimeout(this.scheduledSyncTimeout);
            this.scheduledSyncTimeout = setTimeout(() => {
                if (this.isOnline && !this.syncInProgress) {
                    console.log('⏰ Executing scheduled server sync...');
                    this.syncWithServer();
                }
            }, 2000);
        } else {
            console.log('⏸️ Server sync skipped - online:', this.isOnline, 'syncInProgress:', this.syncInProgress);
        }

        console.log('✅ Progress update completed');
    }

    /**
     * Record a word attempt for detailed analytics
     */
    recordWordAttempt(word, level, success, timeTaken = 0, errorPattern = null, userInput = '') {
        console.log('📝 ProgressTracker.recordWordAttempt called:', {word, level, success, timeTaken});
        
        const attempt = {
            word,
            level,
            success,
            timeTaken,
            errorPattern,
            userInput,
            timestamp: new Date().toISOString()
        };

        this.data.wordAttempts.push(attempt);
        this.data.totalAttempts++;

        if (success) {
            this.data.correctAttempts++;
            this.data.currentStreak++;
            this.data.bestStreak = Math.max(this.data.bestStreak, this.data.currentStreak);
            this.data.wordsCompleted++;
            console.log('✅ Word attempt successful - words completed:', this.data.wordsCompleted);
        } else {
            this.data.currentStreak = 0;
        }

        // Calculate accuracy
        this.data.accuracy = (this.data.correctAttempts / this.data.totalAttempts) * 100;
        
        console.log('📊 Updated progress stats:', {
            totalAttempts: this.data.totalAttempts,
            correctAttempts: this.data.correctAttempts,
            accuracy: this.data.accuracy,
            currentStreak: this.data.currentStreak,
            bestStreak: this.data.bestStreak
        });

        // Keep only last 100 attempts to prevent storage bloat
        if (this.data.wordAttempts.length > 100) {
            this.data.wordAttempts = this.data.wordAttempts.slice(-100);
        }

        // Calculate time spent if we have a timeStarted
        let timeSpent = this.data.timeSpent || 0;
        if (this.data.timeStarted) {
            const sessionTime = Math.floor((new Date() - new Date(this.data.timeStarted)) / 1000);
            timeSpent = Math.max(timeSpent, sessionTime);
            console.log('⏰ Session time calculated:', sessionTime, 'seconds');
        }

        // Update progress with current calculated values
        this.updateProgress({
            totalAttempts: this.data.totalAttempts,
            correctAttempts: this.data.correctAttempts,
            accuracy: this.data.accuracy,
            currentStreak: this.data.currentStreak,
            bestStreak: this.data.bestStreak,
            timeSpent: timeSpent
        });
    }

    /**
     * Sync progress with server
     */
    async syncWithServer() {
        console.log('🔄 syncWithServer called');
        console.log('Conditions - syncInProgress:', this.syncInProgress, 'isOnline:', this.isOnline, 'initInProgress:', this.initInProgress);
        
        if (this.syncInProgress || !this.isOnline || this.initInProgress) {
            console.log('❌ Sync skipped due to conditions');
            return;
        }

        this.syncInProgress = true;
        this.lastSyncAttempt = new Date().toISOString();
        
        console.log('🚀 Starting sync process...');
        console.log('Data to sync:', this.data);

        try {
            // First, try to get server data
            console.log('📡 Fetching server progress...');
            const serverData = await this.fetchServerProgress();
            console.log('📥 Server data received:', serverData);

            // Merge local and server data
            console.log('🔀 Merging local and server data...');
            const mergedData = this.mergeProgressData(this.data, serverData);
            console.log('🔀 Merged data:', mergedData);

            // Save merged data to server
            console.log('📤 Saving merged data to server...');
            await this.saveToServer(mergedData);
            console.log('✅ Data saved to server successfully');

            // Update local data
            this.data = mergedData;
            this.data.needsSync = false;
            this.saveToLocal();

            // Reset retry count on success
            this.syncRetryCount = 0;

            console.log('🎉 Progress synced successfully');

        } catch (error) {
            console.error('💥 Sync failed:', error);
            this.handleSyncError(error);
        } finally {
            this.syncInProgress = false;
            console.log('🏁 Sync process completed');
        }
    }

    /**
     * Fetch progress from server
     */
    async fetchServerProgress() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for Railway

        try {
            const response = await fetch(`${this.getApiBaseUrl()}progress/${this.sessionId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch progress');
            }

            // Transform API data to ProgressTracker format
            return this.transformDataFromAPI(result.data || {});
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out after 30 seconds');
            }
            throw error;
        }
    }

    /**
     * Transform ProgressTracker data format to API format
     */
    transformDataForAPI(data) {
        const apiData = {
            session_id: data.sessionId,
            level: data.level,
            words_completed: data.wordsCompleted || 0,
            total_attempts: data.totalAttempts || 0,
            correct_attempts: data.correctAttempts || 0,
            time_spent: data.timeSpent || 0,
            current_streak: data.currentStreak || 0,
            best_streak: data.bestStreak || 0
        };
        
        console.log('📤 Transforming data for API:', apiData);

        // Include the most recent word attempt if available
        if (data.wordAttempts && data.wordAttempts.length > 0) {
            const lastAttempt = data.wordAttempts[data.wordAttempts.length - 1];
            apiData.word_attempt = {
                word: lastAttempt.word,
                success: lastAttempt.success,
                time_taken: lastAttempt.timeTaken || 0,
                user_input: lastAttempt.userInput || ''
            };
        }

        return apiData;
    }

    /**
     * Transform API data format to ProgressTracker format
     */
    transformDataFromAPI(apiData) {
        if (!apiData || typeof apiData !== 'object') {
            return {};
        }

        // Handle case where API returns an array of progress records
        let progressData = apiData;
        if (Array.isArray(apiData) && apiData.length > 0) {
            // Use the most recent progress record (highest level or most recent)
            progressData = apiData.reduce((latest, current) => {
                const latestTime = new Date(latest.last_played || latest.created_at || 0);
                const currentTime = new Date(current.last_played || current.created_at || 0);
                return currentTime > latestTime ? current : latest;
            });
        }

        // Handle case where API returns empty progress structure
        if (progressData.session_id && !progressData.words_completed) {
            return {
                sessionId: progressData.session_id,
                level: progressData.current_level || 1,
                score: progressData.total_score || 0,
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
        }

        return {
            sessionId: progressData.session_id,
            level: progressData.level || 1,
            score: progressData.score || 0,
            wordsCompleted: progressData.words_completed || 0,
            totalAttempts: progressData.total_attempts || 0,
            correctAttempts: progressData.correct_attempts || 0,
            accuracy: (progressData.accuracy !== undefined) ? progressData.accuracy * 100 : 100,
            currentStreak: progressData.current_streak || 0,
            bestStreak: progressData.best_streak || 0,
            timeSpent: progressData.time_spent || 0,
            timeStarted: progressData.time_started || progressData.created_at || new Date().toISOString(),
            lastPlayed: progressData.last_played || new Date().toISOString(),
            levelProgress: progressData.level_progress || {},
            wordAttempts: progressData.word_attempts || [],
            needsSync: false,
            version: 1
        };
    }

    /**
     * Save progress to server
     */
    async saveToServer(data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for Railway POST

        try {
            // Transform data to match API expectations
            const apiData = this.transformDataForAPI(data);
            
            const response = await fetch(`${this.getApiBaseUrl()}progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to save progress');
            }

            return result.data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Save request timed out after 45 seconds');
            }
            throw error;
        }
    }

    /**
     * Merge local and server progress data
     */
    mergeProgressData(localData, serverData) {
        console.log('🔀 mergeProgressData called');
        console.log('📥 Local data:', localData);
        console.log('📤 Server data:', serverData);
        
        if (!serverData || Object.keys(serverData).length === 0) {
            console.log('📝 No server data - using local data');
            return localData;
        }

        // Use the data with the most recent lastPlayed timestamp
        const localTime = new Date(localData.lastPlayed || 0);
        const serverTime = new Date(serverData.lastPlayed || serverData.last_played || 0);
        
        console.log('🕐 Local time:', localTime);
        console.log('🕐 Server time:', serverTime);
        console.log('🕐 Local is newer?', localTime > serverTime);

        let mergedData;
        
        // Always prioritize local data if it has more progress
        const localHasMoreProgress = (
            (localData.wordsCompleted || 0) > (serverData.wordsCompleted || 0) ||
            (localData.score || 0) > (serverData.score || 0) ||
            (localData.totalAttempts || 0) > (serverData.totalAttempts || 0)
        );
        
        if (localHasMoreProgress || localTime > serverTime) {
            // Local data is newer or has more progress - prioritize local data
            console.log('✅ Using local data as primary (newer or more progress)');
            mergedData = { ...serverData, ...localData };
        } else {
            // Server data is newer and has equal/more progress - use server data
            console.log('⚠️ Using server data as primary (newer with equal/more progress)');
            mergedData = { ...localData, ...serverData };
        }
        
        console.log('🔀 Merged result:', mergedData);

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
        console.error('Sync error details:', error);
        this.syncRetryCount++;

        // Check if error is likely recoverable
        const isRecoverable = error.message.includes('timed out') || 
                            error.message.includes('Network Error') ||
                            error.message.includes('Server responded with 5');

        if (this.syncRetryCount < this.maxRetries && isRecoverable) {
            const retryDelay = Math.pow(2, this.syncRetryCount) * 2000; // Longer exponential backoff
            console.log(`Sync failed (${error.message}), retrying in ${retryDelay}ms (attempt ${this.syncRetryCount}/${this.maxRetries})`);

            setTimeout(() => {
                this.syncWithServer();
            }, retryDelay);
        } else {
            console.error('Max sync retries reached or permanent error, will try again later');
            this.showNetworkStatus(
                this.syncRetryCount >= this.maxRetries ? 
                    'Sync failed after retries - playing offline' : 
                    `Sync error: ${error.message.substring(0, 50)}...`, 
                'warning'
            );
            // Reset retry count for next attempt
            this.syncRetryCount = 0;
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
        this.tracker = new ProgressTracker();
        this._warningShown = false;
    }

    _showDeprecationWarning() {
        // Deprecation warning disabled - ProgressTracker is now stable
        // if (!this._warningShown) {
        //     console.warn('ProgressManager is deprecated, use ProgressTracker instead');
        //     this._warningShown = true;
        // }
    }

    generateSessionId() {
        this._showDeprecationWarning();
        return this.tracker.generateSessionId();
    }

    loadProgress() {
        this._showDeprecationWarning();
        return this.tracker.loadFromLocal();
    }

    saveProgress() {
        this._showDeprecationWarning();
        return this.tracker.saveToLocal();
    }

    updateProgress(updates) {
        this._showDeprecationWarning();
        return this.tracker.updateProgress(updates);
    }

    getProgress() {
        this._showDeprecationWarning();
        return this.tracker.getProgress();
    }

    reset() {
        this._showDeprecationWarning();
        return this.tracker.reset();
    }
}

// Create global instances (prevent duplicate creation)
if (!window.ProgressTracker) {
    window.ProgressTracker = new ProgressTracker();
}
if (!window.ProgressManager) {
    window.ProgressManager = new ProgressManager(); // For backward compatibility
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressTracker, ProgressManager };
}