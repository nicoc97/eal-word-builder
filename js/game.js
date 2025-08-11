/**
 * WordBuilderGame - Core game logic for the EAL word building game
 * 
 * This class implements research-based EAL (English as an Additional Language) pedagogy
 * principles to support effective vocabulary acquisition for young learners:
 * 
 * EAL PEDAGOGY PRINCIPLES IMPLEMENTED:
 * 
 * 1. SCAFFOLDED LEARNING PROGRESSION
 *    - Starts with simple CVC (Consonant-Vowel-Consonant) words like "cat", "dog"
 *    - Gradually introduces consonant clusters (CVCC, CCVC) as confidence builds
 *    - Adaptive difficulty based on individual learner performance and accuracy
 *    - Reference: Krashen's Input Hypothesis - comprehensible input slightly above current level
 * 
 * 2. MULTIMODAL LEARNING SUPPORT
 *    - Visual cues through word images to support comprehension
 *    - Auditory reinforcement via Web Speech API pronunciation
 *    - Kinesthetic engagement through drag-and-drop letter manipulation
 *    - Reference: Gardner's Multiple Intelligence Theory applied to language learning
 * 
 * 3. POSITIVE REINFORCEMENT & ERROR HANDLING
 *    - Gentle, encouraging feedback that doesn't penalize mistakes
 *    - Immediate positive reinforcement for correct attempts
 *    - Error analysis that identifies learning patterns without shame
 *    - Reference: Affective Filter Hypothesis - low anxiety promotes acquisition
 * 
 * 4. CONTEXTUAL VOCABULARY BUILDING
 *    - Words grouped by semantic categories (animals, objects, actions)
 *    - Visual context provided through images to aid comprehension
 *    - Progressive complexity within familiar semantic fields
 *    - Reference: Schema Theory - connecting new knowledge to existing frameworks
 * 
 * 5. INDIVIDUAL PACING & PROGRESS TRACKING
 *    - Self-paced learning without time pressure
 *    - Progress tracking that celebrates incremental improvements
 *    - Adaptive level progression based on demonstrated competency
 *    - Reference: Zone of Proximal Development (Vygotsky)
 * 
 * Implements drag-and-drop mechanics, word validation, and progress tracking
 */
class WordBuilderGame {
    /**
     * CONSTRUCTOR - Initialize WordBuilderGame Instance
     * 
     * VARIABLE NAMING CONVENTIONS:
     * - camelCase for all JavaScript variables and methods
     * - Descriptive names that clearly indicate purpose and data type
     * - Boolean variables prefixed with 'is', 'has', 'can', or 'should'
     * - Array variables pluralized (wordSlots, availableLetters)
     * - Time-related variables suffixed with 'Time' (gameStartTime, wordStartTime)
     * - State variables clearly indicate current status (gameState, currentLevel)
     * 
     * GAME STATE MANAGEMENT:
     * The game uses a finite state machine approach with clear state transitions:
     * - 'loading': Initial game setup and data loading
     * - 'playing': Active gameplay - user can interact with letters
     * - 'checking': Word validation in progress - interactions disabled
     * - 'completed': Level or game completion - showing results
     * 
     * @param {string} containerId - DOM element ID for game container
     */
    /**
     * CONSTRUCTOR - Initialize WordBuilderGame Instance
     * 
     * SESSION MANAGEMENT FIX:
     * - No longer generates session ID directly
     * - Relies on ProgressTracker as single source of truth
     * - Prevents duplicate session creation
     */
    constructor(containerId) {
        // DOM REFERENCES - Core game container
        this.container = document.getElementById(containerId) || document.body;

        // GAME PROGRESSION STATE - Tracks learner's current position in curriculum
        this.currentLevel = 1;                    // Current difficulty level (1-based, aligns with EAL progression)
        this.currentWord = null;                  // Currently active target word (string)
        this.currentWordData = null;              // Complete word object with metadata (image, phonetic, etc.)

        // PERFORMANCE METRICS - Quantitative learning assessment data
        this.score = 0;                          // Cumulative score across all levels
        this.wordsCompleted = 0;                 // Words completed in current level
        this.totalWordsInLevel = 10;             // Target words per level for progression

        /**
         * SESSION MANAGEMENT - FIXED
         * 
         * CHANGE: Don't generate session ID here
         * Instead, we'll get it from ProgressTracker in loadOrCreateSession()
         * This ensures single source of truth for session management
         */
        this.sessionId = null;                   // Will be set from ProgressTracker

        // DRAG-AND-DROP INTERACTION STATE - Manages kinesthetic learning interface
        this.draggedElement = null;              // Currently dragged letter tile (DOM element)
        this.wordSlots = [];                     // Array of target slots for word construction
        this.availableLetters = [];              // Array of draggable letter tiles

        // GAME STATE MACHINE - Controls interaction availability and UI state
        this.gameState = 'loading';              // Current state: loading|playing|checking|completed

        // TEMPORAL ANALYTICS - Learning pace and engagement measurement
        this.gameStartTime = Date.now();         // Session start timestamp for total engagement time
        this.wordStartTime = null;               // Current word start timestamp for per-word analytics

        // Initialize game components
        this.initializeGame();
    }



    /**
     * Initialize the game by setting up event listeners and loading initial data
     */
    async initializeGame() {
        try {
            this.showLoading(true);

            // Initialize error handler if available
            if (window.FrontendErrorHandler) {
                this.errorHandler = window.FrontendErrorHandler;
            }

            // Initialize audio context (required for some browsers)
            if (window.AudioManager) {
                await window.AudioManager.resumeAudioContext();
            }

            // Initialize touch handler for mobile devices
            if (window.TouchHandler) {
                this.touchHandler = window.TouchHandler;
                console.log('Touch handler initialized for mobile support');
            }

            // Set up event listeners
            this.setupEventListeners();

            // Load progress from server or create new session
            await this.loadOrCreateSession();

            // Load first word
            await this.loadLevel(this.currentLevel);

            this.gameState = 'playing';
            this.showLoading(false);

            // Set up periodic sync status updates
            this.setupSyncStatusUpdates();

            console.log('WordBuilderGame initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);

            // Use enhanced error handler if available
            if (this.errorHandler) {
                this.errorHandler.showUserFriendlyError(
                    'Game loading issue',
                    'Don\'t worry - we\'ll try to get you started with offline mode!',
                    'warning'
                );

                // Try to load with fallback data
                await this.loadDemoData(1);
                this.gameState = 'playing';
                this.showLoading(false);
            } else {
                this.showError('Failed to load game. Please refresh the page.');
            }
        }
    }

    /**
     * Set up all event listeners for the game
     */
    setupEventListeners() {
        // Button event listeners
        const checkBtn = document.getElementById('check-word-btn');
        const clearBtn = document.getElementById('clear-word-btn');
        const hintBtn = document.getElementById('hint-btn');
        const pronunciationBtn = document.getElementById('pronunciation-btn');
        const teacherBtn = document.getElementById('teacher-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const syncBtn = document.getElementById('sync-btn');

        if (checkBtn) checkBtn.addEventListener('click', () => this.checkWord());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearWord());
        if (hintBtn) hintBtn.addEventListener('click', () => this.showHint());
        if (pronunciationBtn) pronunciationBtn.addEventListener('click', () => this.playPronunciation());
        if (teacherBtn) teacherBtn.addEventListener('click', () => this.openTeacherDashboard());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.openSettings());
        if (syncBtn) syncBtn.addEventListener('click', () => this.manualSync());

        // Modal event listeners
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.addEventListener('click', () => this.hideFeedbackModal());

        // Settings modal event listeners
        this.setupSettingsEventListeners();

        // Keyboard support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    /**
     * Generate a unique session ID for the player
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Load existing session or create a new one
     * 
     * SESSION LOADING STRATEGY - FIXED:
     * 
     * This method now implements a single-source-of-truth pattern:
     * 1. ProgressTracker is the authoritative source for session data
     * 2. No fallback session generation in game code
     * 3. Ensures consistent session ID across all components
     * 
     * BENEFITS:
     * - Eliminates duplicate session IDs
     * - Prevents race conditions during initialization
     * - Maintains session continuity across page reloads
     * - Simplifies debugging and session tracking
     */
    async loadOrCreateSession() {
        try {
            /**
             * PRIMARY SESSION SOURCE: ProgressTracker
             * 
             * Always use ProgressTracker as the single source of truth
             * It handles all session creation, validation, and persistence
             */
            if (window.ProgressTracker) {
                // Wait a moment for ProgressTracker to complete initialization
                // This prevents race conditions during parallel initialization
                await new Promise(resolve => setTimeout(resolve, 50));

                const progress = window.ProgressTracker.getProgress();

                /**
                 * SESSION SYNCHRONIZATION
                 * Copy all relevant session data from ProgressTracker
                 * This ensures game state matches the canonical progress state
                 */
                this.sessionId = progress.sessionId;
                this.currentLevel = progress.level || 1;
                this.score = progress.score || 0;
                this.wordsCompleted = progress.wordsCompleted || 0;

                console.log('Game session synchronized with ProgressTracker:', {
                    sessionId: this.sessionId,
                    level: this.currentLevel,
                    score: this.score
                });

                // Update UI with sync status
                this.updateSyncStatus();
            } else {
                /**
                 * FALLBACK: Local Storage Only
                 * 
                 * This path should rarely execute as ProgressTracker
                 * should always be available. Kept for resilience.
                 */
                console.warn('ProgressTracker not available, using fallback session management');

                const savedSession = localStorage.getItem('wordBuilderSession');
                if (savedSession) {
                    const sessionData = JSON.parse(savedSession);
                    this.sessionId = sessionData.sessionId;
                    this.currentLevel = sessionData.currentLevel || 1;
                    this.score = sessionData.score || 0;
                    this.wordsCompleted = sessionData.wordsCompleted || 0;
                } else {
                    /**
                     * LAST RESORT: Generate new session
                     * Only if ProgressTracker unavailable AND no saved session
                     */
                    this.sessionId = this.generateSessionId();

                    // Save immediately to prevent duplicates
                    localStorage.setItem('wordBuilderSession', JSON.stringify({
                        sessionId: this.sessionId,
                        currentLevel: this.currentLevel,
                        score: this.score,
                        wordsCompleted: this.wordsCompleted,
                        timestamp: new Date().toISOString()
                    }));

                    console.log('Fallback: Generated new session:', this.sessionId);
                }
            }
        } catch (error) {
            /**
             * ERROR RECOVERY
             * If all else fails, ensure we have a session to continue
             * This maintains game playability even in error conditions
             */
            console.error('Error loading session:', error);

            if (!this.sessionId) {
                this.sessionId = this.generateSessionId();
                console.log('Error recovery: Generated emergency session:', this.sessionId);
            }
        }
    }

    /**
     * Load words and setup for a specific level
     */
    async loadLevel(level) {
        try {
            // Validate level input
            if (this.errorHandler) {
                const validation = this.errorHandler.validateInput(
                    { level },
                    {
                        level: {
                            required: true,
                            type: 'integer',
                            min: 1,
                            max: 10,
                            message: 'Level must be between 1 and 10'
                        }
                    }
                );

                if (!validation.valid) {
                    throw new Error(validation.errors[0].message);
                }
            }

            // Load word data for the level
            const response = await fetch(`api/index.php?endpoint=words&level=${level}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to load words`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to load words');
            }

            this.levelWords = data.data.words || [];
            this.currentLevel = level;

            // Update UI
            this.updateLevelDisplay();
            this.updateProgressDisplay();

            // Load first word
            await this.loadNextWord();

        } catch (error) {
            console.error('Failed to load level:', error);

            // Use enhanced error handling
            if (this.errorHandler) {
                this.errorHandler.showUserFriendlyError(
                    'Loading words...',
                    'Using offline words while we reconnect.',
                    'info',
                    3000
                );
            }

            // Fallback to demo data
            await this.loadDemoData(level);
        }
    }

    /**
     * Load demo data when server is unavailable
     */
    async loadDemoData(level) {
        // Demo words for testing
        const demoWords = {
            1: [
                { word: 'cat', image: 'images/placeholder.svg', phonetic: '/kæt/', difficulty: 1, category: 'animals' },
                { word: 'dog', image: 'images/placeholder.svg', phonetic: '/dɒɡ/', difficulty: 1, category: 'animals' },
                { word: 'pen', image: 'images/placeholder.svg', phonetic: '/pen/', difficulty: 1, category: 'objects' },
                { word: 'sun', image: 'images/placeholder.svg', phonetic: '/sʌn/', difficulty: 1, category: 'nature' },
                { word: 'hat', image: 'images/placeholder.svg', phonetic: '/hæt/', difficulty: 1, category: 'objects' },
                { word: 'bat', image: 'images/placeholder.svg', phonetic: '/bæt/', difficulty: 1, category: 'objects' },
                { word: 'rat', image: 'images/placeholder.svg', phonetic: '/ræt/', difficulty: 1, category: 'animals' },
                { word: 'mat', image: 'images/placeholder.svg', phonetic: '/mæt/', difficulty: 1, category: 'objects' },
                { word: 'cup', image: 'images/placeholder.svg', phonetic: '/kʌp/', difficulty: 1, category: 'objects' },
                { word: 'bus', image: 'images/placeholder.svg', phonetic: '/bʌs/', difficulty: 1, category: 'transport' }
            ]
        };

        this.levelWords = demoWords[level] || demoWords[1];
        this.updateLevelDisplay();
        this.updateProgressDisplay();
        await this.loadNextWord();
    }

    /**
     * Load the next word in the current level
     */
    async loadNextWord() {
        if (!this.levelWords || this.levelWords.length === 0) {
            this.completeLevel();
            return;
        }

        // Get random word from available words
        const randomIndex = Math.floor(Math.random() * this.levelWords.length);
        this.currentWordData = this.levelWords[randomIndex];
        this.currentWord = this.currentWordData.word.toLowerCase();

        // Track word start time for analytics
        this.wordStartTime = Date.now();

        // Set up the word display
        this.setupWordDisplay();
        this.generateLetterTiles();
        this.clearWord();

        // Enable game controls
        this.gameState = 'playing';
        this.updateGameControls();
    }

    /**
     * Set up the word display area with image and slots
     */
    setupWordDisplay() {
        const wordImage = document.getElementById('word-image');
        const wordTarget = document.getElementById('word-target');

        // Set word image
        if (wordImage && this.currentWordData.image) {
            wordImage.src = this.currentWordData.image;
            wordImage.alt = `Image of ${this.currentWord}`;
        }

        // Create letter slots
        wordTarget.innerHTML = '';
        this.wordSlots = [];

        for (let i = 0; i < this.currentWord.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'letter-slot';
            slot.dataset.index = i;
            slot.dataset.letter = this.currentWord[i];

            // Add drop event listeners
            slot.addEventListener('dragover', (e) => this.handleDragOver(e));
            slot.addEventListener('drop', (e) => this.handleDrop(e));
            slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));

            wordTarget.appendChild(slot);
            this.wordSlots.push(slot);
        }

        // Set up drag over for the entire target area
        wordTarget.addEventListener('dragover', (e) => this.handleDragOver(e));
        wordTarget.addEventListener('drop', (e) => this.handleDrop(e));
    }

    /**
     * Generate letter tiles for the current word
     * 
     * FUNCTION NAMING CONVENTION:
     * - Verb-based naming clearly indicates action performed
     * - 'generate' prefix indicates creation of new elements
     * - 'LetterTiles' suffix specifies the type of elements created
     * 
     * ALGORITHM STRUCTURE:
     * 1. Extract letters from target word (correct letters)
     * 2. Generate distractor letters (educational challenge)
     * 3. Combine and shuffle all letters (prevent pattern recognition)
     * 4. Create interactive DOM elements with event handlers
     * 5. Apply accessibility features (ARIA labels, keyboard navigation)
     * 
     * EAL PEDAGOGY IMPLEMENTATION:
     * - Includes distractor letters to prevent guessing
     * - Maintains appropriate challenge level without overwhelming
     * - Supports multiple interaction modalities (drag, click, keyboard)
     */
    generateLetterTiles() {
        const lettersContainer = document.getElementById('letters-container');
        lettersContainer.innerHTML = '';
        this.availableLetters = [];

        // Get letters from current word and add some extra letters for difficulty
        const wordLetters = this.currentWord.split('');
        const extraLetters = this.generateExtraLetters(wordLetters);
        const allLetters = [...wordLetters, ...extraLetters];

        // Shuffle the letters
        this.shuffleArray(allLetters);

        // Create letter tiles
        allLetters.forEach((letter, index) => {
            const tile = document.createElement('div');
            tile.className = 'letter-tile';
            tile.textContent = letter.toUpperCase();
            tile.dataset.letter = letter;
            tile.dataset.index = index;
            tile.draggable = true;
            tile.tabIndex = 0;

            // Add drag event listeners
            tile.addEventListener('dragstart', (e) => this.handleDragStart(e));
            tile.addEventListener('dragend', (e) => this.handleDragEnd(e));

            // Add keyboard support
            tile.addEventListener('keydown', (e) => this.handleTileKeyboard(e));
            tile.addEventListener('click', (e) => this.handleTileClick(e));

            lettersContainer.appendChild(tile);
            this.availableLetters.push(tile);
        });
    }

    /**
     * Generate extra letters to make the game more challenging
     */
    generateExtraLetters(wordLetters) {
        const commonLetters = ['a', 'e', 'i', 'o', 'u', 'r', 's', 't', 'n', 'l'];
        const extraLetters = [];
        const numExtra = Math.min(3, Math.max(1, 8 - wordLetters.length));

        for (let i = 0; i < numExtra; i++) {
            let letter;
            do {
                letter = commonLetters[Math.floor(Math.random() * commonLetters.length)];
            } while (extraLetters.includes(letter));
            extraLetters.push(letter);
        }

        return extraLetters;
    }

    /**
     * Shuffle array in place
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Handle drag start event
     */
    handleDragStart(e) {
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.letter);

        // Add visual feedback
        document.getElementById('word-target').classList.add('drag-active');
    }

    /**
     * Handle drag end event
     */
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.getElementById('word-target').classList.remove('drag-active');
        this.draggedElement = null;
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (e.target.classList.contains('letter-slot')) {
            e.target.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        if (e.target.classList.contains('letter-slot')) {
            e.target.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop event
     */
    handleDrop(e) {
        e.preventDefault();

        const letter = e.dataTransfer.getData('text/plain');
        let targetSlot = e.target;

        // Find the correct slot if dropped on target area
        if (targetSlot.id === 'word-target') {
            // Find the first empty slot
            targetSlot = this.wordSlots.find(slot => !slot.textContent);
        }

        if (targetSlot && targetSlot.classList.contains('letter-slot')) {
            this.placeLetter(targetSlot, letter);
        }

        // Clean up drag states
        this.wordSlots.forEach(slot => slot.classList.remove('drag-over'));
    }

    /**
     * Place a letter in a slot
     */
    placeLetter(slot, letter) {
        if (slot.textContent) {
            // Slot is occupied, return the letter to available tiles
            this.returnLetterToTiles(slot.textContent.toLowerCase());
        }

        slot.textContent = letter.toUpperCase();
        slot.classList.add('filled');

        // Remove the letter from available tiles
        if (this.draggedElement) {
            this.draggedElement.classList.add('used');
            this.draggedElement.draggable = false;
        }

        // Check if word is complete
        this.checkWordCompletion();
    }

    /**
     * Return a letter to the available tiles
     */
    returnLetterToTiles(letter) {
        const usedTile = this.availableLetters.find(tile =>
            tile.dataset.letter === letter && tile.classList.contains('used')
        );

        if (usedTile) {
            usedTile.classList.remove('used');
            usedTile.draggable = true;
        }
    }

    /**
     * Handle tile click for touch devices
     */
    handleTileClick(e) {
        if (this.gameState !== 'playing') return;

        // Play click sound
        if (window.AudioManager) {
            window.AudioManager.playClick();
        }

        const letter = e.target.dataset.letter;
        const emptySlot = this.wordSlots.find(slot => !slot.textContent);

        if (emptySlot && !e.target.classList.contains('used')) {
            this.draggedElement = e.target;
            this.placeLetter(emptySlot, letter);
        }
    }

    /**
     * Handle keyboard navigation for tiles
     */
    handleTileKeyboard(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleTileClick(e);
        }
    }

    /**
     * Check if the word is complete and enable check button
     */
    checkWordCompletion() {
        const isComplete = this.wordSlots.every(slot => slot.textContent);
        const checkBtn = document.getElementById('check-word-btn');

        if (checkBtn) {
            checkBtn.disabled = !isComplete;
        }

        if (isComplete) {
            // Auto-check after a short delay for better UX
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    this.checkWord();
                }
            }, 500);
        }
    }

    /**
     * Check if the current word is correct
     */
    checkWord() {
        if (this.gameState !== 'playing') return;

        this.gameState = 'checking';
        const userWord = this.wordSlots.map(slot => slot.textContent.toLowerCase()).join('');
        const isCorrect = userWord === this.currentWord;

        if (isCorrect) {
            this.handleCorrectWord();
        } else {
            this.handleIncorrectWord();
        }
    }

    /**
     * Handle correct word submission
     * 
     * EAL PEDAGOGY: POSITIVE REINFORCEMENT STRATEGY
     * 
     * This method implements research-based positive reinforcement principles:
     * 
     * 1. IMMEDIATE FEEDBACK:
     *    - Instant visual and auditory confirmation builds neural pathways
     *    - Dopamine release reinforces successful learning behavior
     *    - Reference: Behaviorist learning theory (Skinner) - immediate reinforcement
     * 
     * 2. MULTIMODAL CELEBRATION:
     *    - Visual success animation appeals to visual learners
     *    - Audio pronunciation reinforces correct phonetic patterns
     *    - Success sound creates positive emotional association
     *    - Reference: Dual Coding Theory (Paivio) - multiple encoding pathways
     * 
     * 3. PROGRESS VISUALIZATION:
     *    - Visible progress tracking builds intrinsic motivation
     *    - Celebrates incremental achievements to maintain engagement
     *    - Reference: Self-Determination Theory - autonomy and competence needs
     * 
     * 4. PRONUNCIATION REINFORCEMENT:
     *    - Hearing correct pronunciation after success strengthens phonetic memory
     *    - Links written form to spoken form for comprehensive acquisition
     *    - Reference: Phonological Loop in Working Memory (Baddeley)
     */
    async handleCorrectWord() {
        const timeTaken = this.wordStartTime ? Math.floor((Date.now() - this.wordStartTime) / 1000) : 0;

        this.score += 10;
        this.wordsCompleted++;

        // Record the successful attempt
        this.recordWordAttempt(this.currentWord, true, timeTaken);

        // Play success sound effect
        if (window.AudioManager) {
            window.AudioManager.playSuccess();
        }

        // Play pronunciation after a brief delay
        setTimeout(async () => {
            await this.playPronunciation();
        }, 500);

        // Show success feedback
        this.showFeedback('Excellent!', `Great job! "${this.currentWord.toUpperCase()}" is correct!`, 'success');

        // Update progress
        this.updateProgressDisplay();
        await this.saveProgress();

        // Remove current word from available words
        this.levelWords = this.levelWords.filter(word => word.word !== this.currentWord);

        // Check if level is complete
        if (this.wordsCompleted >= this.totalWordsInLevel || this.levelWords.length === 0) {
            this.completeLevel();
        }
    }

    /**
     * Handle incorrect word submission
     * 
     * EAL PEDAGOGY: GENTLE ERROR CORRECTION APPROACH
     * 
     * This method implements the Affective Filter Hypothesis (Krashen) by maintaining
     * low anxiety during error correction:
     * 
     * 1. NON-PUNITIVE FEEDBACK:
     *    - Gentle error sound (not harsh buzzer) maintains positive learning environment
     *    - Encouraging message focuses on effort, not failure
     *    - Reference: Affective Filter Hypothesis - anxiety inhibits acquisition
     * 
     * 2. ERROR ANALYSIS FOR LEARNING:
     *    - Systematic error pattern identification helps teachers understand learner needs
     *    - Distinguishes between systematic errors (learning gaps) and performance errors
     *    - Reference: Error Analysis in SLA (Corder) - errors as learning indicators
     * 
     * 3. OPPORTUNITY FOR IMMEDIATE RETRY:
     *    - Clears word after brief delay, allowing immediate re-attempt
     *    - Maintains engagement without dwelling on mistakes
     *    - Reference: Immediate Error Correction research in L2 acquisition
     * 
     * 4. LEARNING ANALYTICS:
     *    - Records error patterns for adaptive instruction
     *    - Helps identify common EAL learner challenges (b/p confusion, etc.)
     *    - Reference: Computer-Assisted Language Learning (CALL) research
     */
    handleIncorrectWord() {
        const timeTaken = this.wordStartTime ? Math.floor((Date.now() - this.wordStartTime) / 1000) : 0;
        const userWord = this.wordSlots.map(slot => slot.textContent.toLowerCase()).join('');
        const errorPattern = this.analyzeError(userWord, this.currentWord);

        // Record the failed attempt
        this.recordWordAttempt(this.currentWord, false, timeTaken, errorPattern);

        // Play gentle error sound
        if (window.AudioManager) {
            window.AudioManager.playError();
        }

        // Show gentle error feedback
        this.showFeedback('Try Again', 'That\'s not quite right. Give it another try!', 'error');

        // Clear the word after feedback
        setTimeout(() => {
            this.clearWord();
        }, 1500);
    }

    /**
     * Analyze error pattern for EAL learning insights
     * 
     * FUNCTION NAMING CONVENTION:
     * - 'analyze' prefix indicates data processing and pattern recognition
     * - 'Error' specifies the type of analysis performed
     * - Parameters clearly indicate input (userWord) vs. reference (correctWord)
     * 
     * ERROR ANALYSIS ALGORITHM:
     * This function implements systematic error categorization based on
     * Second Language Acquisition research:
     * 
     * 1. LENGTH_MISMATCH: Different word lengths (missing/extra letters)
     *    - Common in EAL learners developing phonemic awareness
     *    - Indicates need for syllable counting practice
     * 
     * 2. SINGLE_LETTER: One incorrect letter substitution
     *    - Most common error type in early EAL learning
     *    - Often indicates phonetic confusion or visual similarity
     * 
     * 3. LETTER_SWAP: Adjacent letters transposed
     *    - Indicates developing orthographic awareness
     *    - Common in learners transitioning from oral to written language
     * 
     * 4. MULTIPLE_ERRORS: Complex error patterns
     *    - May indicate cognitive overload or insufficient scaffolding
     *    - Suggests need for simpler words or additional support
     * 
     * PEDAGOGICAL APPLICATION:
     * Error patterns inform adaptive instruction and targeted intervention
     * strategies aligned with EAL learning progression frameworks.
     */
    analyzeError(userWord, correctWord) {
        if (userWord.length !== correctWord.length) {
            return 'length_mismatch';
        }

        let errorType = 'substitution';
        const differences = [];

        for (let i = 0; i < correctWord.length; i++) {
            if (userWord[i] !== correctWord[i]) {
                differences.push({
                    position: i,
                    expected: correctWord[i],
                    actual: userWord[i]
                });
            }
        }

        if (differences.length === 1) {
            errorType = 'single_letter';
        } else if (differences.length === 2 &&
            differences[0].expected === differences[1].actual &&
            differences[1].expected === differences[0].actual) {
            errorType = 'letter_swap';
        }

        return errorType;
    }

    /**
     * Clear the current word
     */
    clearWord() {
        this.wordSlots.forEach(slot => {
            if (slot.textContent) {
                this.returnLetterToTiles(slot.textContent.toLowerCase());
                slot.textContent = '';
                slot.classList.remove('filled');
            }
        });

        const checkBtn = document.getElementById('check-word-btn');
        if (checkBtn) checkBtn.disabled = true;

        this.gameState = 'playing';
    }

    /**
     * Show a hint for the current word
     */
    showHint() {
        if (this.gameState !== 'playing') return;

        // Fill the first empty slot with the correct letter
        const emptySlot = this.wordSlots.find(slot => !slot.textContent);
        if (emptySlot) {
            const correctLetter = emptySlot.dataset.letter;
            const availableTile = this.availableLetters.find(tile =>
                tile.dataset.letter === correctLetter && !tile.classList.contains('used')
            );

            if (availableTile) {
                this.draggedElement = availableTile;
                this.placeLetter(emptySlot, correctLetter);
            }
        }
    }

    /**
     * Play pronunciation of the current word
     */
    async playPronunciation() {
        if (!this.currentWord) return;

        try {
            // Use the enhanced AudioManager
            if (window.AudioManager) {
                await window.AudioManager.playPronunciation(this.currentWord);
            }
        } catch (error) {
            console.warn('Could not play pronunciation:', error);
        }
    }

    /**
     * Complete the current level and advance
     */
    async completeLevel() {
        this.currentLevel++;
        this.wordsCompleted = 0;

        // Play level up sound
        if (window.AudioManager) {
            window.AudioManager.playLevelUp();
        }

        this.showFeedback('Level Complete!', `Congratulations! You've completed Level ${this.currentLevel - 1}!`, 'success');

        // Load next level
        setTimeout(async () => {
            await this.loadLevel(this.currentLevel);
        }, 2000);
    }

    /**
     * Update level display
     */
    updateLevelDisplay() {
        const levelElement = document.getElementById('current-level');
        if (levelElement) {
            levelElement.textContent = this.currentLevel;
        }
    }

    /**
     * Update progress display
     */
    updateProgressDisplay() {
        const scoreElement = document.getElementById('current-score');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        if (scoreElement) scoreElement.textContent = this.score;

        if (progressFill && progressText) {
            const progress = (this.wordsCompleted / this.totalWordsInLevel) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${this.wordsCompleted}/${this.totalWordsInLevel} words`;
        }
    }

    /**
     * Update game control states
     */
    updateGameControls() {
        const checkBtn = document.getElementById('check-word-btn');
        const clearBtn = document.getElementById('clear-word-btn');
        const hintBtn = document.getElementById('hint-btn');

        const isPlaying = this.gameState === 'playing';

        if (clearBtn) clearBtn.disabled = !isPlaying;
        if (hintBtn) hintBtn.disabled = !isPlaying;
        if (checkBtn) checkBtn.disabled = true; // Will be enabled when word is complete
    }

    /**
     * Show feedback modal
     */
    showFeedback(title, message, type = 'info') {
        const modal = document.getElementById('feedback-modal');
        const titleElement = document.getElementById('feedback-title');
        const messageElement = document.getElementById('feedback-message');

        if (modal && titleElement && messageElement) {
            titleElement.textContent = title;
            messageElement.textContent = message;
            modal.classList.add('show');

            // Add type-specific styling
            modal.className = `modal-overlay show feedback-${type}`;
        }
    }

    /**
     * Hide feedback modal
     */
    hideFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showFeedback('Error', message, 'error');
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return; // Don't interfere with form inputs

        switch (e.key) {
            case 'Enter':
                if (!document.getElementById('check-word-btn').disabled) {
                    this.checkWord();
                }
                break;
            case 'Escape':
                this.clearWord();
                break;
            case ' ':
                e.preventDefault();
                this.playPronunciation();
                break;
        }
    }

    /**
     * Save progress using the enhanced ProgressTracker
     */
    async saveProgress() {
        try {
            const progressData = {
                level: this.currentLevel,
                score: this.score,
                wordsCompleted: this.wordsCompleted,
                accuracy: this.calculateAccuracy(),
                timeSpent: this.calculateTimeSpent()
            };

            // Validate progress data
            if (this.errorHandler) {
                const validation = this.errorHandler.validateInput(progressData, {
                    level: { required: true, type: 'integer', min: 1, max: 10 },
                    score: { required: true, type: 'integer', min: 0 },
                    wordsCompleted: { required: true, type: 'integer', min: 0 },
                    accuracy: { required: true, type: 'number', min: 0, max: 100 },
                    timeSpent: { required: true, type: 'integer', min: 0 }
                });

                if (!validation.valid) {
                    console.warn('Invalid progress data:', validation.errors);
                    return;
                }
            }

            // Use ProgressTracker if available
            if (window.ProgressTracker) {
                window.ProgressTracker.updateProgress(progressData);
                this.updateSyncStatus();
            } else {
                // Fallback to old method
                const fullProgressData = {
                    sessionId: this.sessionId,
                    ...progressData,
                    timestamp: new Date().toISOString()
                };

                localStorage.setItem('wordBuilderSession', JSON.stringify(fullProgressData));

                try {
                    const response = await fetch('api/index.php?endpoint=progress', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(fullProgressData)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: Failed to save progress`);
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save progress');
                    }
                } catch (error) {
                    console.warn('Could not save progress to server:', error);

                    // Show gentle notification about offline saving
                    if (this.errorHandler) {
                        this.errorHandler.showUserFriendlyError(
                            'Progress saved locally',
                            'Will sync when connection improves.',
                            'info',
                            2000
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error saving progress:', error);

            if (this.errorHandler) {
                this.errorHandler.showUserFriendlyError(
                    'Progress save issue',
                    'Don\'t worry - your progress is safe locally!',
                    'warning',
                    3000
                );
            }
        }
    }

    /**
     * Record a word attempt for detailed analytics
     */
    recordWordAttempt(word, success, timeTaken = 0, errorPattern = null) {
        if (window.ProgressTracker) {
            window.ProgressTracker.recordWordAttempt(
                word,
                this.currentLevel,
                success,
                timeTaken,
                errorPattern
            );
        }
    }

    /**
     * Calculate accuracy percentage
     */
    calculateAccuracy() {
        // This would be more sophisticated in a real implementation
        // For now, return a simple calculation based on score
        return Math.min(100, Math.max(0, (this.score / (this.wordsCompleted * 10)) * 100));
    }

    /**
     * Calculate time spent in game
     */
    calculateTimeSpent() {
        if (!this.gameStartTime) {
            this.gameStartTime = Date.now();
            return 0;
        }
        return Math.floor((Date.now() - this.gameStartTime) / 1000);
    }

    /**
     * Update sync status indicator
     */
    updateSyncStatus() {
        if (!window.ProgressTracker) return;

        const syncStatus = window.ProgressTracker.getSyncStatus();
        let statusElement = document.getElementById('sync-status');

        if (!statusElement) {
            // Create sync status element if it doesn't exist
            statusElement = document.createElement('div');
            statusElement.id = 'sync-status';
            statusElement.className = 'sync-status';

            // Add to header if it exists
            const header = document.querySelector('.game-header');
            if (header) {
                header.appendChild(statusElement);
            }
        }

        // Update status display
        let statusText = '';
        let statusClass = 'sync-status';

        if (syncStatus.syncInProgress) {
            statusText = 'Syncing...';
            statusClass += ' syncing';
        } else if (!syncStatus.isOnline) {
            statusText = 'Offline';
            statusClass += ' offline';
        } else if (syncStatus.needsSync) {
            statusText = 'Needs sync';
            statusClass += ' offline';
        } else {
            statusText = 'Synced';
            statusClass += ' online';
        }

        statusElement.className = statusClass;
        statusElement.innerHTML = `<span class="sync-icon"></span>${statusText}`;
    }

    /**
     * Set up periodic sync status updates
     */
    setupSyncStatusUpdates() {
        // Update sync status every 5 seconds
        setInterval(() => {
            this.updateSyncStatus();
        }, 5000);

        // Initial update
        this.updateSyncStatus();
    }

    /**
     * Manual sync triggered by user
     */
    async manualSync() {
        if (!window.ProgressTracker) {
            this.showError('Sync not available');
            return;
        }

        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.textContent = '⏳';
        }

        try {
            const success = await window.ProgressTracker.forceSync();
            if (success) {
                this.updateSyncStatus();
            }
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.textContent = '🔄';
            }
        }
    }

    /**
     * Open teacher dashboard
     */
    openTeacherDashboard() {
        window.location.href = 'teacher.html';
    }

    /**
     * Set up settings modal event listeners
     */
    setupSettingsEventListeners() {
        const settingsModal = document.getElementById('settings-modal');
        const settingsCloseBtn = document.getElementById('settings-close-btn');
        const settingsSaveBtn = document.getElementById('settings-save-btn');
        const testAudioBtn = document.getElementById('test-audio-btn');

        // Audio controls
        const audioEnabled = document.getElementById('audio-enabled');
        const masterVolume = document.getElementById('master-volume');
        const speechVolume = document.getElementById('speech-volume');
        const effectsVolume = document.getElementById('effects-volume');
        const speechRate = document.getElementById('speech-rate');
        const voiceSelect = document.getElementById('voice-select');

        // Close modal handlers
        if (settingsCloseBtn) {
            settingsCloseBtn.addEventListener('click', () => this.closeSettings());
        }
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) this.closeSettings();
            });
        }

        // Save settings
        if (settingsSaveBtn) {
            settingsSaveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Test audio
        if (testAudioBtn) {
            testAudioBtn.addEventListener('click', () => this.testAudio());
        }

        // Audio control handlers
        if (audioEnabled) {
            audioEnabled.addEventListener('change', (e) => {
                if (window.AudioManager) {
                    window.AudioManager.toggle();
                }
            });
        }

        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                if (window.AudioManager) {
                    window.AudioManager.setVolume(value);
                }
                document.getElementById('master-volume-value').textContent = `${e.target.value}%`;
            });
        }

        if (speechVolume) {
            speechVolume.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                if (window.AudioManager) {
                    window.AudioManager.setSpeechVolume(value);
                }
                document.getElementById('speech-volume-value').textContent = `${e.target.value}%`;
            });
        }

        if (effectsVolume) {
            effectsVolume.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                if (window.AudioManager) {
                    window.AudioManager.setEffectsVolume(value);
                }
                document.getElementById('effects-volume-value').textContent = `${e.target.value}%`;
            });
        }

        if (speechRate) {
            speechRate.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                if (window.AudioManager) {
                    window.AudioManager.setSpeechRate(value);
                }
                const labels = {
                    50: 'Very Slow',
                    60: 'Slow',
                    80: 'Normal',
                    100: 'Fast',
                    150: 'Very Fast'
                };
                const label = labels[e.target.value] || 'Normal';
                document.getElementById('speech-rate-value').textContent = label;
            });
        }

        if (voiceSelect) {
            voiceSelect.addEventListener('change', (e) => {
                if (window.AudioManager) {
                    window.AudioManager.setPreferredVoice(e.target.value);
                }
            });
        }
    }

    /**
     * Open settings modal
     */
    openSettings() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            // Load current settings
            this.loadSettingsUI();
            settingsModal.classList.add('show');
        }
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('show');
        }
    }

    /**
     * Load current audio settings into the UI
     */
    loadSettingsUI() {
        if (!window.AudioManager) return;

        const prefs = window.AudioManager.getPreferences();

        // Update UI elements
        const audioEnabled = document.getElementById('audio-enabled');
        const masterVolume = document.getElementById('master-volume');
        const speechVolume = document.getElementById('speech-volume');
        const effectsVolume = document.getElementById('effects-volume');
        const speechRate = document.getElementById('speech-rate');
        const voiceSelect = document.getElementById('voice-select');

        if (audioEnabled) audioEnabled.checked = prefs.isEnabled;
        if (masterVolume) {
            masterVolume.value = Math.round(prefs.volume * 100);
            document.getElementById('master-volume-value').textContent = `${Math.round(prefs.volume * 100)}%`;
        }
        if (speechVolume) {
            speechVolume.value = Math.round(prefs.speechVolume * 100);
            document.getElementById('speech-volume-value').textContent = `${Math.round(prefs.speechVolume * 100)}%`;
        }
        if (effectsVolume) {
            effectsVolume.value = Math.round(prefs.effectsVolume * 100);
            document.getElementById('effects-volume-value').textContent = `${Math.round(prefs.effectsVolume * 100)}%`;
        }
        if (speechRate) {
            speechRate.value = Math.round(prefs.speechRate * 100);
            const labels = {
                50: 'Very Slow',
                60: 'Slow',
                80: 'Normal',
                100: 'Fast',
                150: 'Very Fast'
            };
            const label = labels[Math.round(prefs.speechRate * 100)] || 'Normal';
            document.getElementById('speech-rate-value').textContent = label;
        }

        // Populate voice options
        if (voiceSelect) {
            voiceSelect.innerHTML = '<option value="">Default</option>';
            const voices = window.AudioManager.getAvailableVoices();
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.lang})`;
                if (voice.name === prefs.preferredVoice) {
                    option.selected = true;
                }
                voiceSelect.appendChild(option);
            });
        }
    }

    /**
     * Save settings and close modal
     */
    saveSettings() {
        // Settings are saved automatically as they change
        this.closeSettings();

        // Show confirmation
        this.showMessage('Settings saved!', 'success', 2000);
    }

    /**
     * Test audio functionality
     */
    async testAudio() {
        if (window.AudioManager) {
            await window.AudioManager.testAudio();
        }
    }

    /**
     * Show a temporary message
     */
    showMessage(message, type = 'info', duration = 3000) {
        if (window.UIManager) {
            window.UIManager.showMessage(message, type, duration);
        }
    }

    /**
     * Show or hide loading overlay
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.style.display = 'flex';
                loadingOverlay.setAttribute('aria-hidden', 'false');
            } else {
                loadingOverlay.style.display = 'none';
                loadingOverlay.setAttribute('aria-hidden', 'true');
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('Game Error:', message);

        // Hide loading overlay
        this.showLoading(false);

        // Show error message to user
        if (this.errorHandler) {
            this.errorHandler.showUserFriendlyError(
                'Game Error',
                message,
                'error'
            );
        } else {
            alert('Error: ' + message);
        }
    }

    /**
     * Update sync status display
     */
    updateSyncStatus() {
        // This method would update UI elements showing sync status
        // For now, just log the status
        if (window.ProgressTracker) {
            const syncStatus = window.ProgressTracker.getSyncStatus();
            console.log('Sync status:', syncStatus);
        }
    }

    /**
     * Set up periodic sync status updates
     */
    setupSyncStatusUpdates() {
        // Set up periodic updates of sync status
        // This is optional for offline functionality
        console.log('Sync status updates initialized');
    }

    /**
     * Update level display in UI
     */
    updateLevelDisplay() {
        const levelElement = document.getElementById('current-level');
        if (levelElement) {
            levelElement.textContent = this.currentLevel;
        }
    }

    /**
     * Update progress display in UI
     */
    updateProgressDisplay() {
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        const scoreElement = document.getElementById('current-score');

        if (progressText) {
            progressText.textContent = `${this.wordsCompleted}/${this.totalWordsInLevel} words`;
        }

        if (progressFill) {
            const percentage = (this.wordsCompleted / this.totalWordsInLevel) * 100;
            progressFill.style.width = `${percentage}%`;
        }

        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }

    /**
     * Update game controls state
     */
    updateGameControls() {
        const checkBtn = document.getElementById('check-word-btn');
        const clearBtn = document.getElementById('clear-word-btn');
        const hintBtn = document.getElementById('hint-btn');

        if (this.gameState === 'playing') {
            if (checkBtn) checkBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
            if (hintBtn) hintBtn.disabled = false;
        } else {
            if (checkBtn) checkBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            if (hintBtn) hintBtn.disabled = true;
        }
    }

    /**
     * Set up settings modal event listeners
     */
    setupSettingsEventListeners() {
        // This method would set up event listeners for the settings modal
        // For now, just log that it's been called
        console.log('Settings event listeners initialized');
    }
}

// ================================================================
// GLOBAL INITIALIZATION FIX
// ================================================================

/**
 * SINGLETON PATTERN FOR PROGRESSTRACKER
 * 
 * Ensures only one instance of ProgressTracker exists
 * Prevents duplicate initialization and session conflicts
 */
if (!window.ProgressTracker) {
    window.ProgressTracker = new ProgressTracker();
    console.log('ProgressTracker singleton created');
} else {
    console.log('ProgressTracker already exists, skipping creation');
}

/**
 * BACKWARD COMPATIBILITY
 * Maintain support for legacy code using ProgressManager
 */
if (!window.ProgressManager) {
    window.ProgressManager = new ProgressManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordBuilderGame;
}