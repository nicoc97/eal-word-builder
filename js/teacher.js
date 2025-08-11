/**
 * TeacherDashboard - Manages the teacher dashboard interface
 * 
 * EAL PEDAGOGY: TEACHER-INFORMED ASSESSMENT AND INTERVENTION
 * 
 * This class implements research-based principles for EAL teacher support:
 * 
 * 1. FORMATIVE ASSESSMENT TOOLS:
 *    - Real-time progress monitoring enables responsive teaching
 *    - Error pattern analysis identifies specific learning needs
 *    - Reference: Black & Wiliam (1998) - formative assessment in learning
 * 
 * 2. DIFFERENTIATED INSTRUCTION SUPPORT:
 *    - Individual student analytics inform personalized instruction
 *    - Progress visualization helps teachers identify struggling learners
 *    - Reference: Tomlinson (2001) - differentiated instruction principles
 * 
 * 3. DATA-DRIVEN DECISION MAKING:
 *    - Comprehensive analytics support evidence-based teaching decisions
 *    - Trend analysis helps predict learner needs and interventions
 *    - Reference: Data-Driven Instruction in Language Learning (Chapelle)
 * 
 * 4. EAL-SPECIFIC ERROR ANALYSIS:
 *    - Identifies common EAL learner challenges (phonetic confusion, etc.)
 *    - Provides pedagogical recommendations based on error patterns
 *    - Reference: Error Analysis in Second Language Acquisition (Corder)
 * 
 * 5. COLLABORATIVE LEARNING SUPPORT:
 *    - Session management enables group activities and peer learning
 *    - Progress sharing facilitates collaborative reflection
 *    - Reference: Sociocultural Theory (Vygotsky) - learning through interaction
 * 
 * Provides comprehensive session management for teachers including:
 * - Session overview with all active students
 * - New session creation with simple name input
 * - Detailed progress view for individual students
 * - Error pattern analysis display
 * 
 * This class integrates with the backend TeacherManager API to provide
 * real-time data and analytics for EAL learning assessment.
 */
class TeacherDashboard {
    constructor() {
        this.sessions = [];
        this.currentSession = null;
        this.currentView = 'overview';
        // Fix: Auto-detect the correct API base URL
        this.apiBaseUrl = this.detectApiBaseUrl();
        this.refreshInterval = null;
        this.init();
    }

    /**
     * Detect the correct API base URL based on current location
     */
    detectApiBaseUrl() {
        // If we're running on localhost:8000, use relative path
        if (window.location.port === '8000' || window.location.href.includes('localhost:8000')) {
            return 'api/';
        }
        // If we're on a different port or host, construct the full URL
        return `http://localhost:8000/api/`;
    }

    init() {
        this.setupEventListeners();
        this.loadAllSessions();
        this.trackSessionActivity();
        this.identifyCommonErrorPatterns();
        this.startAutoRefresh();
        console.log('TeacherDashboard initialized with API integration and reporting');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Navigation buttons
        const backToGameBtn = document.getElementById('back-to-game-btn');
        const newSessionBtn = document.getElementById('new-session-btn');
        const backToOverviewBtn = document.getElementById('back-to-overview-btn');

        if (backToGameBtn) {
            // Update button text to reflect landing page navigation
            backToGameBtn.textContent = 'Back to Landing';
            backToGameBtn.title = 'Return to landing page';
            
            backToGameBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        if (newSessionBtn) {
            newSessionBtn.addEventListener('click', () => {
                this.showNewSessionModal();
            });
        }

        if (backToOverviewBtn) {
            backToOverviewBtn.addEventListener('click', () => {
                this.showSessionsOverview();
            });
        }

        // Delete buttons
        const deleteAllBtn = document.getElementById('delete-all-btn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.confirmDeleteAllStudents();
            });
        }

        // Modal handlers
        const cancelSessionBtn = document.getElementById('cancel-session-btn');
        const newSessionForm = document.getElementById('new-session-form');

        if (cancelSessionBtn) {
            cancelSessionBtn.addEventListener('click', () => {
                this.hideNewSessionModal();
            });
        }

        if (newSessionForm) {
            newSessionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewSession();
            });
        }

        // Delete modal handlers
        const cancelDeleteStudentBtn = document.getElementById('cancel-delete-student-btn');
        const confirmDeleteStudentBtn = document.getElementById('confirm-delete-student-btn');
        const cancelDeleteAllBtn = document.getElementById('cancel-delete-all-btn');
        const confirmDeleteAllBtn = document.getElementById('confirm-delete-all-btn');
        const deleteAllConfirmationInput = document.getElementById('delete-all-confirmation');

        if (cancelDeleteStudentBtn) {
            cancelDeleteStudentBtn.addEventListener('click', () => {
                this.hideDeleteStudentModal();
            });
        }

        if (confirmDeleteStudentBtn) {
            confirmDeleteStudentBtn.addEventListener('click', () => {
                this.deleteStudent();
            });
        }

        if (cancelDeleteAllBtn) {
            cancelDeleteAllBtn.addEventListener('click', () => {
                this.hideDeleteAllModal();
            });
        }

        if (confirmDeleteAllBtn) {
            confirmDeleteAllBtn.addEventListener('click', () => {
                this.deleteAllStudents();
            });
        }

        if (deleteAllConfirmationInput) {
            deleteAllConfirmationInput.addEventListener('input', (e) => {
                const confirmBtn = document.getElementById('confirm-delete-all-btn');
                if (confirmBtn) {
                    confirmBtn.disabled = e.target.value !== 'DELETE ALL';
                }
            });
        }
    }

    /**
     * Load all sessions from the backend API
     * Provides comprehensive session overview with real-time data
     */
    async loadAllSessions() {
        try {
            this.showLoading(true);
            
            console.log('TeacherDashboard: Loading sessions from:', `${this.apiBaseUrl}teacher/sessions`);
            const response = await fetch(`${this.apiBaseUrl}teacher/sessions`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.sessions = Array.isArray(data.data.sessions) ? data.data.sessions : [];
                console.log('TeacherDashboard: Raw API response:', data);
                console.log('TeacherDashboard: Extracted sessions:', this.sessions);
                this.updateSessionsDisplay();
                this.updateStats();
                console.log(`Loaded ${this.sessions.length} sessions from API`);
            } else {
                throw new Error(data.error || 'Failed to load sessions');
            }
            
        } catch (error) {
            console.error('Failed to load sessions:', error);
            
            // Use enhanced error handler if available
            if (window.FrontendErrorHandler) {
                window.FrontendErrorHandler.showUserFriendlyError(
                    'Loading sessions...',
                    'Using cached data while reconnecting.',
                    'warning',
                    4000
                );
            } else {
                this.showError('Unable to load student sessions. Please check your connection.');
            }
            
            // Fallback to localStorage for offline functionality
            this.loadSessionsFromStorage();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Fallback method to load sessions from localStorage
     */
    loadSessionsFromStorage() {
        try {
            const saved = localStorage.getItem('teacherSessions');
            if (saved) {
                this.sessions = JSON.parse(saved);
                this.updateSessionsDisplay();
                this.updateStats();
                this.showMessage('Working offline - using cached data', 'warning');
            }
        } catch (error) {
            console.warn('Could not load sessions from storage:', error);
            this.sessions = [];
            this.updateSessionsDisplay();
            this.updateStats();
        }
    }

    /**
     * Save sessions to localStorage
     */
    saveSessions() {
        try {
            localStorage.setItem('teacherSessions', JSON.stringify(this.sessions));
        } catch (error) {
            console.warn('Could not save sessions:', error);
        }
    }

    /**
     * Show new session modal
     */
    showNewSessionModal() {
        const modal = document.getElementById('new-session-modal');
        if (modal) {
            modal.classList.add('show');
            const input = document.getElementById('student-name-input');
            if (input) {
                input.focus();
            }
        }
    }

    /**
     * Hide new session modal
     */
    hideNewSessionModal() {
        const modal = document.getElementById('new-session-modal');
        if (modal) {
            modal.classList.remove('show');
            const form = document.getElementById('new-session-form');
            if (form) {
                form.reset();
            }
        }
    }

    /**
     * Create new student session via API
     * Implements simple name input with validation and backend integration
     */
    async createNewSession() {
        const nameInput = document.getElementById('student-name-input');
        const studentName = nameInput?.value.trim();

        // Enhanced input validation
        if (window.FrontendErrorHandler) {
            const validation = window.FrontendErrorHandler.validateInput(
                { studentName },
                {
                    studentName: {
                        required: true,
                        type: 'string',
                        minLength: 2,
                        maxLength: 50,
                        pattern: /^[a-zA-Z\s'-]+$/,
                        message: 'Student name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes'
                    }
                }
            );
            
            if (!validation.valid) {
                window.FrontendErrorHandler.showUserFriendlyError(
                    'Invalid name',
                    validation.errors[0].message,
                    'warning'
                );
                return;
            }
        } else {
            // Fallback validation
            if (!studentName) {
                this.showError('Please enter a student name');
                return;
            }

            if (studentName.length < 2 || studentName.length > 50) {
                this.showError('Student name must be between 2 and 50 characters');
                return;
            }
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBaseUrl}teacher/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_name: studentName
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                // Add the new session to local array
                const newSession = {
                    session_id: data.data.session_id,
                    student_name: data.data.student_name,
                    created_at: data.data.created_at,
                    last_active: data.data.created_at,
                    current_level: 1,
                    total_words_completed: 0,
                    accuracy: 0,
                    total_time_spent: 0,
                    activity_status: 'active'
                };

                this.sessions.unshift(newSession); // Add to beginning
                this.updateSessionsDisplay();
                this.updateStats();
                this.hideNewSessionModal();

                // Use enhanced success message
                if (window.FrontendErrorHandler) {
                    window.FrontendErrorHandler.showUserFriendlyError(
                        'Session created!',
                        `${studentName} can now start playing.`,
                        'success',
                        3000
                    );
                } else {
                    this.showMessage(`Session created for ${studentName}!`, 'success');
                }
                
                console.log('New session created:', data.data);
                
            } else {
                throw new Error(data.error || 'Failed to create session');
            }

        } catch (error) {
            console.error('Failed to create session:', error);
            
            // Use enhanced error handling
            if (window.FrontendErrorHandler) {
                window.FrontendErrorHandler.showUserFriendlyError(
                    'Session creation failed',
                    'Please check your connection and try again.',
                    'error'
                );
            } else {
                this.showError('Unable to create session. Please try again.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update sessions display
     */
    updateSessionsDisplay() {
        const grid = document.getElementById('sessions-grid');
        if (!grid) return;

        grid.innerHTML = '';

        if (this.sessions.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>No student sessions yet.</p>
                    <p>Click "New Student" to create the first session.</p>
                </div>
            `;
            return;
        }

        this.sessions.forEach(session => {
            const card = this.createSessionCard(session);
            grid.appendChild(card);
        });
    }

    /**
     * Create session card element with enhanced data display
     * Shows comprehensive session overview with activity status
     */
    createSessionCard(session) {
        const card = document.createElement('div');
        card.className = `session-card ${session.activity_status || 'inactive'}`;
        card.dataset.sessionId = session.session_id || session.id;

        const lastPlayed = new Date(session.last_active || session.lastPlayed).toLocaleDateString();
        const timeSpent = Math.round((session.total_time_spent || session.totalTime || 0) / 60);
        const accuracy = (session.accuracy || 0) * 100; // Convert from decimal to percentage
        const studentName = session.student_name || session.studentName;

        // Activity status indicator
        const statusClass = this.getActivityStatusClass(session.activity_status);
        const statusText = this.getActivityStatusText(session.activity_status);

        card.innerHTML = `
            <div class="session-header">
                <h3>${studentName}</h3>
                <span class="activity-status ${statusClass}">${statusText}</span>
            </div>
            <div class="session-info">
                <div class="info-row">
                    <span class="info-label">Level:</span>
                    <span class="info-value">${session.current_level || session.level || 1}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Words Completed:</span>
                    <span class="info-value">${session.total_words_completed || session.wordsCompleted || 0}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Accuracy:</span>
                    <span class="info-value">${Math.round(accuracy)}%</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Best Streak:</span>
                    <span class="info-value">${session.best_streak || 0}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Last Played:</span>
                    <span class="info-value">${lastPlayed}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Time Spent:</span>
                    <span class="info-value">${timeSpent} min</span>
                </div>
            </div>
            <div class="session-actions">
                <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); window.teacherDashboard.viewSessionProgressEnhanced('${session.session_id || session.id}')">
                    View Details
                </button>
                <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); window.teacherDashboard.confirmDeleteStudent('${session.session_id || session.id}', '${studentName}')">
                    Delete
                </button>
            </div>
        `;

        card.addEventListener('click', () => {
            this.viewSessionProgressEnhanced(session.session_id || session.id);
        });

        return card;
    }

    /**
     * View detailed progress for individual student
     * Loads comprehensive progress data from API including error patterns
     */
    async viewSessionProgress(sessionId) {
        try {
            this.showLoading(true);
            this.currentView = 'detail';
            
            const response = await fetch(`${this.apiBaseUrl}teacher/progress/${sessionId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.currentSession = data.data;
                this.showDetailView();
                this.updateDetailView(data.data);
                
                // Load error patterns
                await this.loadErrorPatterns(sessionId);
                
                console.log('Loaded detailed progress for session:', sessionId);
            } else {
                throw new Error(data.error || 'Failed to load session progress');
            }
            
        } catch (error) {
            console.error('Failed to load session progress:', error);
            this.showError('Unable to load session details. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load and display error patterns for session
     */
    async loadErrorPatterns(sessionId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}teacher/errors/${sessionId}`);
            
            if (!response.ok) {
                console.warn('Could not load error patterns');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.displayErrorPatterns(data.data);
            }
            
        } catch (error) {
            console.warn('Failed to load error patterns:', error);
        }
    }

    /**
     * Display error pattern analysis
     */
    displayErrorPatterns(errorData) {
        const errorPatternsElement = document.getElementById('error-patterns');
        if (!errorPatternsElement) return;

        if (!errorData.patterns || errorData.patterns.length === 0) {
            errorPatternsElement.innerHTML = `
                <div class="no-errors">
                    <p>No error patterns detected yet.</p>
                    <p>Error analysis will appear as the student completes more words.</p>
                </div>
            `;
            return;
        }

        let patternsHTML = `
            <div class="error-summary">
                <h4>Error Analysis (${errorData.total_errors} total errors)</h4>
            </div>
            <div class="patterns-list">
        `;

        errorData.patterns.forEach(pattern => {
            patternsHTML += `
                <div class="pattern-item">
                    <div class="pattern-header">
                        <span class="pattern-type">${pattern.description}</span>
                        <span class="pattern-frequency">${pattern.frequency} times</span>
                    </div>
                    <div class="pattern-details">
                        <div class="affected-words">
                            <strong>Words affected:</strong> ${pattern.affected_words.slice(0, 5).join(', ')}
                            ${pattern.affected_words.length > 5 ? ` (+${pattern.affected_words.length - 5} more)` : ''}
                        </div>
                        <div class="avg-time">
                            <strong>Average time:</strong> ${Math.round(pattern.avg_time)}s
                        </div>
                    </div>
                </div>
            `;
        });

        patternsHTML += '</div>';

        // Add recommendations if available
        if (errorData.recommendations && errorData.recommendations.length > 0) {
            patternsHTML += `
                <div class="recommendations">
                    <h4>Teaching Recommendations</h4>
                    <div class="recommendations-list">
            `;

            errorData.recommendations.forEach(rec => {
                patternsHTML += `
                    <div class="recommendation-item priority-${rec.priority}">
                        <div class="rec-strategy">${rec.strategy}</div>
                        <div class="rec-activities">
                            <strong>Suggested activities:</strong>
                            <ul>
                                ${rec.activities.map(activity => `<li>${activity}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            });

            patternsHTML += '</div></div>';
        }

        errorPatternsElement.innerHTML = patternsHTML;
    }

    /**
     * Show detail view and hide overview
     */
    showDetailView() {
        const sessionsSection = document.querySelector('.sessions-section');
        const detailSection = document.getElementById('progress-detail');
        
        if (sessionsSection) sessionsSection.style.display = 'none';
        if (detailSection) detailSection.style.display = 'block';
    }

    /**
     * Show sessions overview
     */
    showSessionsOverview() {
        const sessionsSection = document.querySelector('.sessions-section');
        const detailSection = document.getElementById('progress-detail');
        
        if (sessionsSection) sessionsSection.style.display = 'block';
        if (detailSection) detailSection.style.display = 'none';
        
        this.currentSession = null;
        this.currentView = 'overview';
        
        // Refresh sessions when returning to overview
        this.loadAllSessions();
    }

    /**
     * Update detail view with comprehensive session data
     */
    updateDetailView(sessionData) {
        if (!sessionData) {
            console.error('No session data provided to updateDetailView');
            return;
        }
        
        console.log('📊 updateDetailView called with:', sessionData);
        
        const sessionInfo = sessionData.session_info || {};
        const progressRecords = sessionData.progress || [];
        const analytics = sessionData.analytics || {};

        console.log('📈 Progress records:', progressRecords);

        // Calculate totals from all progress records
        let totalWordsCompleted = 0;
        let totalAttempts = 0;
        let totalCorrectAttempts = 0;
        let totalTimeSpent = 0;
        let currentLevel = 1;
        let bestStreak = 0;

        progressRecords.forEach(record => {
            totalWordsCompleted += record.words_completed || 0;
            totalAttempts += record.total_attempts || 0;
            totalCorrectAttempts += record.correct_attempts || 0;
            totalTimeSpent += record.time_spent || 0;
            currentLevel = Math.max(currentLevel, record.level || 1);
            bestStreak = Math.max(bestStreak, record.best_streak || 0);
        });

        console.log('📊 Calculated totals:', {
            totalWordsCompleted,
            totalAttempts,
            totalCorrectAttempts,
            totalTimeSpent,
            currentLevel,
            bestStreak
        });

        // Update header
        const titleElement = document.getElementById('student-name-title');
        if (titleElement) {
            titleElement.textContent = `${sessionInfo.student_name}'s Progress`;
        }

        // Update summary cards
        const levelElement = document.getElementById('detail-level');
        const wordsElement = document.getElementById('detail-words');
        const accuracyElement = document.getElementById('detail-accuracy');
        const timeElement = document.getElementById('detail-time');

        if (levelElement) {
            levelElement.textContent = currentLevel;
            console.log('✅ Updated level to:', currentLevel);
        }
        
        if (wordsElement) {
            wordsElement.textContent = totalWordsCompleted;
            console.log('✅ Updated words completed to:', totalWordsCompleted);
        }
        
        if (accuracyElement) {
            const accuracy = totalAttempts > 0 ? 
                Math.round((totalCorrectAttempts / totalAttempts) * 100) : 0;
            accuracyElement.textContent = `${accuracy}%`;
            console.log('✅ Updated accuracy to:', `${accuracy}%`);
        }
        
        if (timeElement) {
            const minutes = Math.round(totalTimeSpent / 60);
            timeElement.textContent = `${minutes} min`;
            console.log('✅ Updated time to:', `${minutes} min`);
        }

        // Update progress chart placeholder with analytics
        this.updateProgressChart(analytics, { totalWordsCompleted, totalAttempts, totalCorrectAttempts, currentLevel, bestStreak });
    }

    /**
     * Update progress chart with analytics data
     */
    updateProgressChart(analytics) {
        const chartElement = document.getElementById('progress-chart');
        if (!chartElement) return;

        // Create a simple text-based progress display
        // In a full implementation, this would use a charting library
        chartElement.innerHTML = `
            <div class="progress-analytics">
                <div class="analytics-item">
                    <span class="analytics-label">Total Attempts:</span>
                    <span class="analytics-value">${analytics.total_attempts || 0}</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Successful Attempts:</span>
                    <span class="analytics-value">${analytics.successful_attempts || 0}</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Accuracy Trend:</span>
                    <span class="analytics-value trend-${analytics.accuracy_trend}">${analytics.accuracy_trend || 'stable'}</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Speed Trend:</span>
                    <span class="analytics-value trend-${analytics.speed_trend}">${analytics.speed_trend || 'stable'}</span>
                </div>
                <div class="analytics-item">
                    <span class="analytics-label">Difficulty Progression:</span>
                    <span class="analytics-value">${analytics.difficulty_progression || 'appropriate'}</span>
                </div>
            </div>
            ${analytics.learning_indicators && analytics.learning_indicators.length > 0 ? `
                <div class="learning-indicators">
                    <h4>Learning Indicators:</h4>
                    <ul>
                        ${analytics.learning_indicators.map(indicator => `<li>${indicator}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    /**
     * Update dashboard stats
     */
    updateStats() {
        const totalSessionsElement = document.getElementById('total-sessions');
        const activeTodayElement = document.getElementById('active-today');

        if (totalSessionsElement) {
            totalSessionsElement.textContent = this.sessions.length;
        }

        if (activeTodayElement) {
            const today = new Date().toDateString();
            const activeToday = this.sessions.filter(session => {
                const lastPlayed = new Date(session.lastPlayed).toDateString();
                return lastPlayed === today;
            }).length;
            activeTodayElement.textContent = activeToday;
        }
    }

    /**
     * Get activity status CSS class
     */
    getActivityStatusClass(status) {
        const statusClasses = {
            'active': 'status-active',
            'recent': 'status-recent',
            'inactive': 'status-inactive'
        };
        return statusClasses[status] || 'status-inactive';
    }

    /**
     * Get activity status display text
     */
    getActivityStatusText(status) {
        const statusTexts = {
            'active': 'Active',
            'recent': 'Recent',
            'inactive': 'Inactive'
        };
        return statusTexts[status] || 'Inactive';
    }

    /**
     * Start auto-refresh for real-time updates
     */
    startAutoRefresh() {
        // Refresh every 30 seconds when on overview
        this.refreshInterval = setInterval(() => {
            if (this.currentView === 'overview') {
                this.loadAllSessions();
                this.trackSessionActivity();
            }
        }, 30000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(show = true) {
        // Loading overlay disabled
        return;
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show message toast
     */
    showMessage(message, type = 'info') {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            color: ${type === 'error' ? '#d32f2f' : type === 'warning' ? '#f57c00' : '#1976d2'};
            border-left: 4px solid ${type === 'error' ? '#d32f2f' : type === 'warning' ? '#f57c00' : '#1976d2'};
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Remove after 4 seconds for errors, 3 seconds for others
        const duration = type === 'error' ? 4000 : 3000;
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * Save sessions to localStorage as backup
     */
    saveSessions() {
        try {
            localStorage.setItem('teacherSessions', JSON.stringify(this.sessions));
        } catch (error) {
            console.warn('Could not save sessions to storage:', error);
        }
    }

    /**
     * Generate and display progress charts showing student progress over time
     */
    async generateProgressCharts(sessionId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}teacher/timeline/${sessionId}?days=7`);
            
            if (!response.ok) {
                console.warn('Could not load timeline data');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.displayProgressChart(data.data.timeline);
                console.log('Progress chart generated for session:', sessionId);
            }
            
        } catch (error) {
            console.warn('Failed to generate progress charts:', error);
            this.displayFallbackChart();
        }
    }

    /**
     * Display progress chart with timeline data
     */
    displayProgressChart(timelineData) {
        const chartElement = document.getElementById('progress-chart');
        if (!chartElement) return;

        // Create a simple ASCII-style chart for demonstration
        // In production, this would use a proper charting library like Chart.js
        let chartHTML = `
            <div class="timeline-chart">
                <h4>7-Day Activity Timeline</h4>
                <div class="chart-container">
        `;

        const maxAttempts = Math.max(...timelineData.map(day => day.total_attempts), 1);

        timelineData.forEach(day => {
            const date = new Date(day.activity_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            const percentage = (day.total_attempts / maxAttempts) * 100;
            const accuracy = day.total_attempts > 0 ? 
                Math.round((day.successful_attempts / day.total_attempts) * 100) : 0;

            chartHTML += `
                <div class="chart-day">
                    <div class="day-label">${date}</div>
                    <div class="day-bar-container">
                        <div class="day-bar" style="height: ${percentage}%">
                            <div class="bar-success" style="height: ${accuracy}%"></div>
                        </div>
                    </div>
                    <div class="day-stats">
                        <div class="stat-attempts">${day.total_attempts}</div>
                        <div class="stat-accuracy">${accuracy}%</div>
                    </div>
                </div>
            `;
        });

        chartHTML += `
                </div>
                <div class="chart-legend">
                    <div class="legend-item">
                        <div class="legend-color total"></div>
                        <span>Total Attempts</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color success"></div>
                        <span>Success Rate</span>
                    </div>
                </div>
            </div>
        `;

        chartElement.innerHTML = chartHTML;
    }

    /**
     * Display fallback chart when data is unavailable
     */
    displayFallbackChart() {
        const chartElement = document.getElementById('progress-chart');
        if (!chartElement) return;

        chartElement.innerHTML = `
            <div class="chart-placeholder">
                <p>Progress chart will appear here as the student completes more activities.</p>
                <div class="placeholder-chart">
                    <div class="placeholder-bars">
                        <div class="placeholder-bar" style="height: 20%"></div>
                        <div class="placeholder-bar" style="height: 40%"></div>
                        <div class="placeholder-bar" style="height: 60%"></div>
                        <div class="placeholder-bar" style="height: 80%"></div>
                        <div class="placeholder-bar" style="height: 50%"></div>
                        <div class="placeholder-bar" style="height: 90%"></div>
                        <div class="placeholder-bar" style="height: 70%"></div>
                    </div>
                    <div class="placeholder-labels">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate printable progress report for teachers
     */
    async generatePrintableReport(sessionId, format = 'summary') {
        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBaseUrl}teacher/report/${sessionId}?format=${format}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.displayPrintableReport(data.data);
                console.log('Printable report generated:', format);
            } else {
                throw new Error(data.error || 'Failed to generate report');
            }
            
        } catch (error) {
            console.error('Failed to generate printable report:', error);
            this.showError('Unable to generate report. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display printable report in a new window
     */
    displayPrintableReport(reportData) {
        const reportWindow = window.open('', '_blank', 'width=800,height=600');
        
        const reportHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Progress Report - ${reportData.student_name}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 2rem; 
                        line-height: 1.6; 
                        color: #333;
                    }
                    .report-header { 
                        text-align: center; 
                        margin-bottom: 2rem; 
                        border-bottom: 2px solid #ddd; 
                        padding-bottom: 1rem;
                    }
                    .report-title { 
                        font-size: 1.5rem; 
                        margin-bottom: 0.5rem; 
                    }
                    .report-date { 
                        color: #666; 
                        font-size: 0.9rem; 
                    }
                    .report-section { 
                        margin-bottom: 2rem; 
                    }
                    .section-title { 
                        font-size: 1.2rem; 
                        margin-bottom: 1rem; 
                        color: #2c3e50;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 0.5rem;
                    }
                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                        gap: 1rem; 
                        margin-bottom: 1rem;
                    }
                    .stat-item { 
                        padding: 1rem; 
                        border: 1px solid #ddd; 
                        border-radius: 4px; 
                        text-align: center;
                    }
                    .stat-value { 
                        font-size: 1.5rem; 
                        font-weight: bold; 
                        color: #2c3e50; 
                    }
                    .stat-label { 
                        color: #666; 
                        font-size: 0.9rem; 
                    }
                    .recommendations { 
                        background: #f8f9fa; 
                        padding: 1rem; 
                        border-radius: 4px; 
                        border-left: 4px solid #007bff;
                    }
                    .recommendation-item { 
                        margin-bottom: 1rem; 
                    }
                    .recommendation-title { 
                        font-weight: bold; 
                        margin-bottom: 0.5rem; 
                    }
                    @media print {
                        body { margin: 1rem; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <h1 class="report-title">Progress Report: ${reportData.student_name}</h1>
                    <p class="report-date">Generated on ${new Date(reportData.report_date).toLocaleDateString()}</p>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Overall Progress</h2>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${reportData.data.current_level || 1}</div>
                            <div class="stat-label">Current Level</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${reportData.data.total_words || 0}</div>
                            <div class="stat-label">Words Completed</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${reportData.data.accuracy || 0}%</div>
                            <div class="stat-label">Overall Accuracy</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${Math.round((reportData.data.total_time || 0) / 60)}</div>
                            <div class="stat-label">Minutes Played</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Learning Progress</h2>
                    <p><strong>Accuracy Trend:</strong> ${reportData.data.accuracy_trend || 'Stable'}</p>
                    <p><strong>Speed Trend:</strong> ${reportData.data.speed_trend || 'Stable'}</p>
                    <p><strong>Difficulty Progression:</strong> ${reportData.data.difficulty_progression || 'Appropriate'}</p>
                </div>

                ${reportData.data.recommendations ? `
                <div class="report-section">
                    <h2 class="section-title">Teaching Recommendations</h2>
                    <div class="recommendations">
                        ${reportData.data.recommendations.map(rec => `
                            <div class="recommendation-item">
                                <div class="recommendation-title">${rec.strategy}</div>
                                <p>${rec.activities ? rec.activities.join(', ') : 'Continue current approach'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="report-section no-print">
                    <button onclick="window.print()" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Print Report
                    </button>
                    <button onclick="window.close()" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 0.5rem;">
                        Close
                    </button>
                </div>
            </body>
            </html>
        `;

        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }

    /**
     * Identify and display common error patterns across sessions
     */
    async identifyCommonErrorPatterns() {
        try {
            const response = await fetch(`${this.apiBaseUrl}teacher/analytics/comparative`);
            
            if (!response.ok) {
                console.warn('Could not load comparative analytics');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.displayCommonErrorPatterns(data.data.common_error_patterns);
            }
            
        } catch (error) {
            console.warn('Failed to identify common error patterns:', error);
        }
    }

    /**
     * Display common error patterns across all students
     */
    displayCommonErrorPatterns(errorPatterns) {
        // This could be displayed in a separate section or modal
        console.log('Common error patterns across all students:', errorPatterns);
        
        // For now, we'll store this data for potential future display
        this.commonErrorPatterns = errorPatterns;
    }

    /**
     * Track session activity and update displays
     */
    async trackSessionActivity() {
        try {
            const response = await fetch(`${this.apiBaseUrl}teacher/analytics/activity`);
            
            if (!response.ok) {
                console.warn('Could not load activity data');
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.updateActivityTracking(data.data);
            }
            
        } catch (error) {
            console.warn('Failed to track session activity:', error);
        }
    }

    /**
     * Update activity tracking displays
     */
    updateActivityTracking(activityData) {
        // Update the stats in the header
        const totalSessionsElement = document.getElementById('total-sessions');
        const activeTodayElement = document.getElementById('active-today');

        if (totalSessionsElement && activityData.total_sessions) {
            totalSessionsElement.textContent = activityData.total_sessions;
        }

        if (activeTodayElement && activityData.active_today) {
            activeTodayElement.textContent = activityData.active_today;
        }

        // Store activity data for other uses
        this.activityData = activityData;
    }

    /**
     * Enhanced view session progress with charts and reporting
     */
    async viewSessionProgressEnhanced(sessionId) {
        await this.viewSessionProgress(sessionId);
        
        // Generate progress charts
        await this.generateProgressCharts(sessionId);
        
        // Set up print report button
        const printReportBtn = document.getElementById('print-report-btn');
        if (printReportBtn) {
            printReportBtn.onclick = () => {
                this.generatePrintableReport(sessionId, 'printable');
            };
        }
    }

    /**
     * Confirm delete individual student
     */
    confirmDeleteStudent(sessionId, studentName) {
        this.pendingDeleteSessionId = sessionId;
        this.pendingDeleteStudentName = studentName;
        
        const modal = document.getElementById('delete-student-modal');
        const nameElement = document.getElementById('delete-student-name');
        
        if (modal && nameElement) {
            nameElement.textContent = studentName;
            modal.classList.add('show');
        }
    }

    /**
     * Hide delete student modal
     */
    hideDeleteStudentModal() {
        const modal = document.getElementById('delete-student-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.pendingDeleteSessionId = null;
        this.pendingDeleteStudentName = null;
    }

    /**
     * Delete individual student
     */
    async deleteStudent() {
        if (!this.pendingDeleteSessionId) {
            console.error('No student selected for deletion');
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBaseUrl}teacher/delete/${this.pendingDeleteSessionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                // Show success message
                if (window.FrontendErrorHandler) {
                    window.FrontendErrorHandler.showUserFriendlyError(
                        'Student deleted',
                        `${this.pendingDeleteStudentName} has been permanently deleted.`,
                        'success',
                        3000
                    );
                } else {
                    this.showMessage(`Student ${this.pendingDeleteStudentName} deleted successfully!`, 'success');
                }

                // Hide modal and refresh sessions
                this.hideDeleteStudentModal();
                await this.loadAllSessions();
                
            } else {
                throw new Error(result.error || 'Failed to delete student');
            }

        } catch (error) {
            console.error('Failed to delete student:', error);
            
            if (window.FrontendErrorHandler) {
                window.FrontendErrorHandler.showUserFriendlyError(
                    'Delete failed',
                    error.message,
                    'error'
                );
            } else {
                this.showError('Failed to delete student: ' + error.message);
            }
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Confirm delete all students
     */
    confirmDeleteAllStudents() {
        const modal = document.getElementById('delete-all-modal');
        const confirmationInput = document.getElementById('delete-all-confirmation');
        const confirmBtn = document.getElementById('confirm-delete-all-btn');
        
        if (modal) {
            // Reset confirmation input
            if (confirmationInput) {
                confirmationInput.value = '';
            }
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
            
            modal.classList.add('show');
            
            // Focus the confirmation input
            setTimeout(() => {
                if (confirmationInput) {
                    confirmationInput.focus();
                }
            }, 100);
        }
    }

    /**
     * Hide delete all modal
     */
    hideDeleteAllModal() {
        const modal = document.getElementById('delete-all-modal');
        const confirmationInput = document.getElementById('delete-all-confirmation');
        const confirmBtn = document.getElementById('confirm-delete-all-btn');
        
        if (modal) {
            modal.classList.remove('show');
        }
        
        // Reset form
        if (confirmationInput) {
            confirmationInput.value = '';
        }
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
    }

    /**
     * Delete all students
     */
    async deleteAllStudents() {
        const confirmationInput = document.getElementById('delete-all-confirmation');
        
        if (confirmationInput && confirmationInput.value !== 'DELETE ALL') {
            if (window.FrontendErrorHandler) {
                window.FrontendErrorHandler.showUserFriendlyError(
                    'Confirmation required',
                    'Please type "DELETE ALL" to confirm this action.',
                    'warning'
                );
            }
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(`${this.apiBaseUrl}teacher/delete-all`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                // Show success message
                const deletedCount = result.data.deleted_count || 0;
                if (window.FrontendErrorHandler) {
                    window.FrontendErrorHandler.showUserFriendlyError(
                        'All students deleted',
                        `Successfully deleted ${deletedCount} student sessions and all associated data.`,
                        'success',
                        4000
                    );
                } else {
                    this.showMessage(`All students deleted successfully! (${deletedCount} sessions removed)`, 'success');
                }

                // Hide modal and refresh sessions
                this.hideDeleteAllModal();
                await this.loadAllSessions();
                
            } else {
                throw new Error(result.error || 'Failed to delete all students');
            }

        } catch (error) {
            console.error('Failed to delete all students:', error);
            
            if (window.FrontendErrorHandler) {
                window.FrontendErrorHandler.showUserFriendlyError(
                    'Delete all failed',
                    error.message,
                    'error'
                );
            } else {
                this.showError('Failed to delete all students: ' + error.message);
            }
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Cleanup when dashboard is destroyed
     */
    destroy() {
        this.stopAutoRefresh();
        console.log('TeacherDashboard destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeacherDashboard;
}