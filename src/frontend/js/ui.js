/**
 * UIManager - Handles visual feedback, animations, and responsive UI adaptations
 * 
 * EAL PEDAGOGY: VISUAL FEEDBACK AND INTERFACE DESIGN PRINCIPLES
 * 
 * This class implements research-based visual design principles for EAL learners:
 * 
 * 1. GENTLE, ENCOURAGING VISUAL FEEDBACK:
 *    - Success animations use warm colors and celebratory icons (🎉)
 *    - Error feedback uses thoughtful emoji (🤔) rather than harsh symbols (❌)
 *    - Smooth animations reduce cognitive load and maintain engagement
 *    - Reference: Affective Filter Hypothesis - positive emotions aid learning
 * 
 * 2. ACCESSIBILITY AND UNIVERSAL DESIGN:
 *    - Large touch targets (44px minimum) for diverse motor abilities
 *    - High contrast colors for visual accessibility
 *    - Reduced motion support for users with vestibular disorders
 *    - Reference: Universal Design for Learning (UDL) principles
 * 
 * 3. RESPONSIVE DESIGN FOR DIVERSE CONTEXTS:
 *    - Mobile-first approach accommodates various device access
 *    - Adaptive layouts support different learning environments
 *    - Touch-friendly interactions for young learners
 *    - Reference: Digital Divide research in educational technology
 * 
 * 4. COGNITIVE LOAD MANAGEMENT:
 *    - Animation queuing prevents overwhelming visual stimuli
 *    - Clear visual hierarchy guides attention appropriately
 *    - Consistent visual patterns reduce cognitive processing demands
 *    - Reference: Cognitive Load Theory (Sweller) in multimedia learning
 * 
 * 5. MOTIVATIONAL DESIGN ELEMENTS:
 *    - Progress visualization builds sense of achievement
 *    - Level-up celebrations maintain intrinsic motivation
 *    - Gentle error recovery maintains confidence
 *    - Reference: Self-Determination Theory - competence and autonomy needs
 * 
 * Provides gentle, encouraging feedback for EAL learners
 */
class UIManager {
    constructor() {
        this.animationQueue = [];
        this.isAnimating = false;
        this.currentBreakpoint = this.getCurrentBreakpoint();
        
        // Initialize UI manager
        this.init();
    }

    /**
     * Initialize the UI manager
     */
    init() {
        this.setupResponsiveHandlers();
        this.setupAnimationStyles();
        this.adaptToScreenSize();
        
        console.log('UIManager initialized');
    }

    /**
     * Set up responsive design handlers
     */
    setupResponsiveHandlers() {
        // Listen for window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.adaptToScreenSize();
            }, 250);
        });

        // Listen for orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adaptToScreenSize();
            }, 100);
        });

        // Listen for reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addListener(() => {
            this.updateAnimationPreferences();
        });
    }

    /**
     * Get current breakpoint based on screen width
     */
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        if (width <= 480) return 'xs';
        if (width <= 768) return 'sm';
        if (width <= 1024) return 'md';
        return 'lg';
    }

    /**
     * Adapt UI to current screen size
     */
    adaptToScreenSize() {
        const newBreakpoint = this.getCurrentBreakpoint();
        const hasChanged = newBreakpoint !== this.currentBreakpoint;
        this.currentBreakpoint = newBreakpoint;

        // Update CSS custom properties for responsive design
        document.documentElement.style.setProperty('--current-breakpoint', newBreakpoint);

        // Adjust letter tile sizes for mobile
        this.adjustTileSizes();

        // Adjust modal positioning
        this.adjustModalPositioning();

        // Update touch targets for accessibility
        this.updateTouchTargets();

        if (hasChanged) {
            console.log(`Breakpoint changed to: ${newBreakpoint}`);
            this.triggerBreakpointChange(newBreakpoint);
        }
    }

    /**
     * Adjust letter tile and slot sizes based on screen size
     */
    adjustTileSizes() {
        const tiles = document.querySelectorAll('.letter-tile, .letter-slot');
        const isSmallScreen = this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm';
        
        tiles.forEach(tile => {
            if (isSmallScreen) {
                tile.style.width = '45px';
                tile.style.height = '45px';
                tile.style.fontSize = '1.1rem';
            } else {
                tile.style.width = '';
                tile.style.height = '';
                tile.style.fontSize = '';
            }
        });
    }

    /**
     * Adjust modal positioning for different screen sizes
     */
    adjustModalPositioning() {
        const modals = document.querySelectorAll('.modal-content');
        const isSmallScreen = this.currentBreakpoint === 'xs';
        
        modals.forEach(modal => {
            if (isSmallScreen) {
                modal.style.margin = '1rem';
                modal.style.maxHeight = 'calc(100vh - 2rem)';
                modal.style.overflow = 'auto';
            } else {
                modal.style.margin = '';
                modal.style.maxHeight = '';
                modal.style.overflow = '';
            }
        });
    }

    /**
     * Update touch targets to meet accessibility guidelines
     */
    updateTouchTargets() {
        const interactiveElements = document.querySelectorAll('button, .letter-tile, .letter-slot');
        
        interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
            }
        });
    }

    /**
     * Show success animation with encouraging feedback
     */
    showSuccess(word, message = 'Great job!') {
        this.queueAnimation(() => {
            // Create success overlay
            const successOverlay = this.createAnimationOverlay('success');
            
            // Add success content
            const content = document.createElement('div');
            content.className = 'success-content';
            content.innerHTML = `
                <div class="success-icon">🎉</div>
                <div class="success-word">${word.toUpperCase()}</div>
                <div class="success-message">${message}</div>
            `;
            
            successOverlay.appendChild(content);
            document.body.appendChild(successOverlay);

            // Animate in
            requestAnimationFrame(() => {
                successOverlay.classList.add('show');
                this.animateSuccessElements(content);
            });

            // Remove after animation
            setTimeout(() => {
                successOverlay.classList.remove('show');
                setTimeout(() => {
                    if (successOverlay.parentNode) {
                        successOverlay.parentNode.removeChild(successOverlay);
                    }
                    this.nextAnimation();
                }, 300);
            }, 2000);
        });
    }

    /**
     * Animate success elements with staggered timing
     */
    animateSuccessElements(container) {
        const elements = container.children;
        
        Array.from(elements).forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('animate-in');
            }, index * 200);
        });
    }

    /**
     * Show gentle error feedback
     */
    showError(message = 'Try again!', gentle = true) {
        this.queueAnimation(() => {
            // Create error overlay
            const errorOverlay = this.createAnimationOverlay('error');
            
            // Add error content
            const content = document.createElement('div');
            content.className = 'error-content';
            content.innerHTML = `
                <div class="error-icon">${gentle ? '🤔' : '❌'}</div>
                <div class="error-message">${message}</div>
                <div class="error-encouragement">You're doing great! Keep trying!</div>
            `;
            
            errorOverlay.appendChild(content);
            document.body.appendChild(errorOverlay);

            // Animate in
            requestAnimationFrame(() => {
                errorOverlay.classList.add('show');
                content.classList.add('animate-in');
            });

            // Remove after animation
            setTimeout(() => {
                errorOverlay.classList.remove('show');
                setTimeout(() => {
                    if (errorOverlay.parentNode) {
                        errorOverlay.parentNode.removeChild(errorOverlay);
                    }
                    this.nextAnimation();
                }, 300);
            }, 1500);
        });
    }

    /**
     * Update progress bar with smooth animation
     */
    updateProgressBar(progress, total) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            const percentage = (progress / total) * 100;
            
            // Animate progress bar
            progressFill.style.transition = 'width 0.5s ease-out';
            progressFill.style.width = `${percentage}%`;
            
            // Add pulse effect when progress increases
            progressFill.classList.add('progress-pulse');
            setTimeout(() => {
                progressFill.classList.remove('progress-pulse');
            }, 600);
        }
        
        if (progressText) {
            // Animate text change
            progressText.style.opacity = '0';
            setTimeout(() => {
                progressText.textContent = `${progress}/${total} words`;
                progressText.style.opacity = '1';
            }, 250);
        }
    }

    /**
     * Show level indicator with celebration animation
     */
    showLevelUp(newLevel) {
        this.queueAnimation(() => {
            const levelElement = document.getElementById('current-level');
            
            if (levelElement) {
                // Create level up overlay
                const levelUpOverlay = this.createAnimationOverlay('level-up');
                
                const content = document.createElement('div');
                content.className = 'level-up-content';
                content.innerHTML = `
                    <div class="level-up-icon">⭐</div>
                    <div class="level-up-title">Level Up!</div>
                    <div class="level-up-number">Level ${newLevel}</div>
                    <div class="level-up-message">You're getting better!</div>
                `;
                
                levelUpOverlay.appendChild(content);
                document.body.appendChild(levelUpOverlay);

                // Animate level number change
                this.animateNumberChange(levelElement, newLevel);

                // Show overlay
                requestAnimationFrame(() => {
                    levelUpOverlay.classList.add('show');
                    content.classList.add('animate-in');
                });

                // Remove after animation
                setTimeout(() => {
                    levelUpOverlay.classList.remove('show');
                    setTimeout(() => {
                        if (levelUpOverlay.parentNode) {
                            levelUpOverlay.parentNode.removeChild(levelUpOverlay);
                        }
                        this.nextAnimation();
                    }, 300);
                }, 3000);
            }
        });
    }

    /**
     * Animate number change with counting effect
     */
    animateNumberChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const steps = 20;
        const increment = (newValue - currentValue) / steps;
        let current = currentValue;
        let step = 0;

        const animate = () => {
            if (step < steps) {
                current += increment;
                element.textContent = Math.round(current);
                element.classList.add('number-changing');
                step++;
                setTimeout(animate, duration / steps);
            } else {
                element.textContent = newValue;
                element.classList.remove('number-changing');
            }
        };

        animate();
    }

    /**
     * Show loading state with spinner - DISABLED
     */
    showLoading(show, message = 'Loading...') {
        // Loading overlay disabled
        return;
    }

    /**
     * Show message toast
     */
    showMessage(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Position toast
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '10000';
        toast.style.padding = '1rem 1.5rem';
        toast.style.borderRadius = '12px';
        toast.style.background = 'rgba(255, 255, 255, 0.9)';
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'transform 0.3s ease';

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Remove after duration
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
     * Add drag feedback to elements
     */
    addDragFeedback(element, isDragging) {
        if (isDragging) {
            element.classList.add('dragging');
            this.addDragGhost(element);
        } else {
            element.classList.remove('dragging');
            this.removeDragGhost();
        }
    }

    /**
     * Add visual drag ghost
     */
    addDragGhost(element) {
        const ghost = element.cloneNode(true);
        ghost.className = 'drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.opacity = '0.8';
        ghost.style.transform = 'rotate(5deg) scale(1.1)';
        
        document.body.appendChild(ghost);
        this.currentDragGhost = ghost;
    }

    /**
     * Remove drag ghost
     */
    removeDragGhost() {
        if (this.currentDragGhost && this.currentDragGhost.parentNode) {
            this.currentDragGhost.parentNode.removeChild(this.currentDragGhost);
            this.currentDragGhost = null;
        }
    }

    /**
     * Create animation overlay
     */
    createAnimationOverlay(type) {
        const overlay = document.createElement('div');
        overlay.className = `animation-overlay ${type}-overlay`;
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.pointerEvents = 'none';
        
        return overlay;
    }

    /**
     * Queue animation to prevent overlapping
     */
    queueAnimation(animationFn) {
        this.animationQueue.push(animationFn);
        if (!this.isAnimating) {
            this.nextAnimation();
        }
    }

    /**
     * Execute next animation in queue
     */
    nextAnimation() {
        if (this.animationQueue.length > 0) {
            this.isAnimating = true;
            const nextAnimation = this.animationQueue.shift();
            nextAnimation();
        } else {
            this.isAnimating = false;
        }
    }

    /**
     * Setup animation styles
     */
    setupAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Animation styles */
            .animation-overlay.show {
                opacity: 1;
            }

            .success-content {
                text-align: center;
                color: white;
            }

            .success-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                transform: scale(0);
                transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            .success-word {
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.5s ease;
            }

            .success-message {
                font-size: 1.2rem;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.5s ease;
            }

            .success-content .animate-in .success-icon {
                transform: scale(1);
            }

            .success-content .animate-in .success-word,
            .success-content .animate-in .success-message {
                opacity: 1;
                transform: translateY(0);
            }

            .error-content {
                text-align: center;
                color: white;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.5s ease;
            }

            .error-content.animate-in {
                opacity: 1;
                transform: translateY(0);
            }

            .error-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }

            .error-message {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }

            .error-encouragement {
                font-size: 1rem;
                opacity: 0.8;
            }

            .level-up-content {
                text-align: center;
                color: white;
            }

            .level-up-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                animation: starPulse 2s infinite;
            }

            .level-up-title {
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
            }

            .level-up-number {
                font-size: 3rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                color: #ffd700;
            }

            .level-up-message {
                font-size: 1.2rem;
                opacity: 0.9;
            }

            .level-up-content.animate-in {
                animation: levelUpBounce 0.8s ease;
            }

            @keyframes starPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            @keyframes levelUpBounce {
                0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                50% { transform: scale(1.1) rotate(5deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }

            .progress-pulse {
                animation: progressPulse 0.6s ease;
            }

            @keyframes progressPulse {
                0% { box-shadow: 0 0 0 0 rgba(79, 172, 254, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(79, 172, 254, 0); }
                100% { box-shadow: 0 0 0 0 rgba(79, 172, 254, 0); }
            }

            .number-changing {
                animation: numberChange 0.3s ease;
            }

            @keyframes numberChange {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); color: #4facfe; }
                100% { transform: scale(1); }
            }

            .dragging {
                transform: rotate(5deg) scale(1.05);
                z-index: 1000;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .drag-ghost {
                animation: dragFloat 0.5s ease infinite alternate;
            }

            @keyframes dragFloat {
                0% { transform: rotate(5deg) scale(1.1) translateY(0); }
                100% { transform: rotate(5deg) scale(1.1) translateY(-5px); }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .success-icon,
                .success-word,
                .success-message,
                .error-content,
                .level-up-content,
                .progress-pulse,
                .number-changing,
                .dragging,
                .drag-ghost {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Update animation preferences based on user settings
     */
    updateAnimationPreferences() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.documentElement.style.setProperty('--animation-duration', prefersReducedMotion ? '0.01ms' : '0.3s');
    }

    /**
     * Trigger breakpoint change event
     */
    triggerBreakpointChange(breakpoint) {
        const event = new CustomEvent('breakpointChange', {
            detail: { breakpoint, previousBreakpoint: this.currentBreakpoint }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get current theme (light/dark)
     */
    getCurrentTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * Apply theme-specific styles
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.animationQueue = [];
        this.isAnimating = false;
        
        if (this.currentDragGhost) {
            this.removeDragGhost();
        }
    }
}

// Create global instance
window.UIManager = new UIManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}