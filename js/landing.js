/**
 * LandingPage - Manages the landing page interface for role selection
 * 
 * Handles navigation between student and teacher modes, manages student
 * profile selection, and maintains session state across the application.
 * 
 * Features:
 * - Role selection (Student/Teacher)
 * - Student profile selection from existing sessions
 * - Session persistence and retrieval
 * - Navigation to appropriate application modes
 */
class LandingPage {
    constructor() {
        this.availableStudents = [];
        this.selectedStudent = null;
        // Fix: Auto-detect the correct API base URL
        this.apiBaseUrl = this.detectApiBaseUrl();
        this.currentView = 'roles';
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
        // If we're on Railway production, use relative path
        return 'api/';
    }

    init() {
        this.bindEvents();
        this.loadAvailableStudents();
    }

    bindEvents() {
        // Role selection events
        const teacherBtn = document.getElementById('teacher-role-btn');
        const studentBtn = document.getElementById('student-role-btn');
        
        if (teacherBtn) {
            teacherBtn.addEventListener('click', () => this.selectTeacherRole());
            teacherBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectTeacherRole();
                }
            });
        }

        if (studentBtn) {
            studentBtn.addEventListener('click', () => this.selectStudentRole());
            studentBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectStudentRole();
                }
            });
        }

        // Navigation events
        const backToRolesBtn = document.getElementById('back-to-roles-btn');
        const goToTeacherBtn = document.getElementById('go-to-teacher-btn');
        
        if (backToRolesBtn) {
            backToRolesBtn.addEventListener('click', () => this.showRoleSelection());
        }
        
        if (goToTeacherBtn) {
            goToTeacherBtn.addEventListener('click', () => this.selectTeacherRole());
        }
    }

    selectTeacherRole() {
        this.showLoading(true);
        // Navigate to teacher dashboard
        setTimeout(() => {
            window.location.href = 'teacher.html';
        }, 500);
    }

    selectStudentRole() {
        this.showLoading(true);
        this.loadAvailableStudents()
            .then(() => {
                this.showLoading(false);
                this.showStudentSelection();
            })
            .catch((error) => {
                console.error('Failed to load students:', error);
                this.showLoading(false);
                // Still show selection with any local data available
                this.showStudentSelection();
            })
            .finally(() => {
                // Ensure loading is always hidden, even if other handlers fail
                setTimeout(() => {
                    this.showLoading(false);
                }, 100);
            });
    }

    showRoleSelection() {
        this.currentView = 'roles';
        document.querySelector('.role-selection-section').style.display = 'block';
        document.getElementById('student-selection').style.display = 'none';
    }

    showStudentSelection() {
        this.currentView = 'student-selection';
        document.querySelector('.role-selection-section').style.display = 'none';
        document.getElementById('student-selection').style.display = 'block';
        this.renderStudentProfiles();
    }

    async loadAvailableStudents() {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout
            
            const response = await fetch(`${this.apiBaseUrl}teacher/sessions`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Failed to load student sessions');
            }
            
            const data = await response.json();
            
            // Transform API data to expected format
            this.availableStudents = (data.data.sessions || []).map(session => {
                const transformedSession = {
                    sessionId: session.session_id,
                    studentName: session.student_name,
                    currentLevel: session.current_level,
                    wordsCompleted: session.total_words_completed,
                    lastPlayed: session.last_active,
                    accuracy: session.average_accuracy,
                    isActive: session.is_active
                };
                
                console.log('Transformed session:', {
                    original: session,
                    transformed: transformedSession
                });
                
                return transformedSession;
            });
            
            console.log(`LandingPage: Loaded ${this.availableStudents.length} students from API`);
            
            // Also check localStorage for any locally stored sessions
            const localSessions = this.getLocalSessions();
            if (localSessions.length > 0) {
                // Merge with server sessions, avoiding duplicates
                const serverSessionIds = this.availableStudents.map(s => s.sessionId);
                const uniqueLocalSessions = localSessions.filter(
                    local => !serverSessionIds.includes(local.sessionId)
                );
                this.availableStudents = [...this.availableStudents, ...uniqueLocalSessions];
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('API request timed out, using local sessions only');
            } else {
                console.warn('Could not load students from server, checking local storage:', error);
            }
            this.availableStudents = this.getLocalSessions();
        }
    }

    getLocalSessions() {
        try {
            const stored = localStorage.getItem('wordbuilder_sessions');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading local sessions:', error);
            return [];
        }
    }

    renderStudentProfiles() {
        const profilesContainer = document.getElementById('student-profiles');
        const noStudentsMessage = document.getElementById('no-students-message');
        
        if (!profilesContainer) return;

        if (this.availableStudents.length === 0) {
            profilesContainer.innerHTML = '';
            if (noStudentsMessage) {
                noStudentsMessage.style.display = 'block';
            }
            return;
        }

        if (noStudentsMessage) {
            noStudentsMessage.style.display = 'none';
        }

        const profilesHTML = this.availableStudents.map(student => {
            // Ensure we have the required data
            const sessionId = student.sessionId || student.session_id;
            const studentName = student.studentName || student.student_name || 'Student';
            const currentLevel = student.currentLevel || student.current_level || 1;
            const wordsCompleted = student.wordsCompleted || student.total_words_completed || 0;
            const lastPlayedDate = student.lastPlayed || student.last_active;
            const lastPlayed = lastPlayedDate ? 
                new Date(lastPlayedDate).toLocaleDateString() : 'Never';
            
            return `
                <div class="student-profile-card" data-session-id="${sessionId}">
                    <div class="profile-avatar">
                        <span class="avatar-initials">${this.getInitials(studentName)}</span>
                    </div>
                    <div class="profile-info">
                        <h3 class="profile-name">${studentName}</h3>
                        <div class="profile-stats">
                            <span class="stat">Level ${currentLevel}</span>
                            <span class="stat">${wordsCompleted} words</span>
                        </div>
                        <div class="profile-last-played">
                            Last played: ${lastPlayed}
                        </div>
                    </div>
                    <button class="btn btn-primary profile-play-btn" 
                            data-session-id="${sessionId}"
                            aria-label="Continue playing as ${studentName}">
                        Continue Playing
                    </button>
                </div>
            `;
        }).join('');

        profilesContainer.innerHTML = profilesHTML;

        // Bind click events for profile selection
        profilesContainer.querySelectorAll('.profile-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionId = e.target.getAttribute('data-session-id');
                console.log('Continue Playing button clicked for session:', sessionId);
                
                // Add visual feedback
                e.target.disabled = true;
                e.target.textContent = 'Loading...';
                
                // Reset button after a delay if navigation fails
                setTimeout(() => {
                    e.target.disabled = false;
                    e.target.textContent = 'Continue Playing';
                }, 3000);
                
                this.selectStudentProfile(sessionId);
            });
        });
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    selectStudentProfile(sessionId) {
        const student = this.availableStudents.find(s => 
            (s.sessionId === sessionId) || (s.session_id === sessionId)
        );
        
        if (!student) {
            console.error('Student not found:', sessionId);
            console.log('Available students:', this.availableStudents);
            alert('Error: Student profile not found. Please refresh the page and try again.');
            return;
        }

        this.selectedStudent = student;
        
        // Ensure we use the correct field names
        const finalSessionId = student.sessionId || student.session_id;
        const finalStudentName = student.studentName || student.student_name || 'Student';
        
        console.log(`LandingPage: Selected student ${finalStudentName} (${finalSessionId})`);
        
        // Validate session ID
        if (!finalSessionId || finalSessionId === 'undefined') {
            console.error('Invalid session ID:', finalSessionId);
            alert('Error: Invalid student session. Please refresh the page and try again.');
            return;
        }
        
        // Store the selected session for the game to use
        const sessionData = {
            sessionId: finalSessionId,
            studentName: finalStudentName,
            returnToLanding: true
        };
        
        sessionStorage.setItem('wordbuilder_current_session', JSON.stringify(sessionData));
        
        // Verify the data was stored correctly
        const storedData = sessionStorage.getItem('wordbuilder_current_session');
        console.log(`LandingPage: Stored session data:`, JSON.parse(storedData));
        console.log(`LandingPage: Navigating to game as ${finalStudentName}`);

        this.showLoading(true);
        
        // Navigate to the game with a shorter delay
        setTimeout(() => {
            window.location.href = 'game.html';
        }, 200);
    }

    showLoading(show) {
        // Loading overlay disabled
        return;
    }

    // Utility method to refresh available students (can be called externally)
    refresh() {
        if (this.currentView === 'student-selection') {
            this.loadAvailableStudents().then(() => {
                this.renderStudentProfiles();
            });
        }
    }
}