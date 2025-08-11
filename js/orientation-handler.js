/**
 * OrientationHandler - Manages device orientation changes and layout adaptation
 * 
 * This class handles device rotation and ensures the game layout adapts
 * appropriately to different orientations while maintaining usability.
 */
class OrientationHandler {
    constructor() {
        this.currentOrientation = this.getOrientation();
        this.orientationHistory = [];
        this.layoutCache = new Map();
        
        this.init();
    }

    /**
     * Initialize orientation handler
     */
    init() {
        this.setupOrientationListeners();
        this.cacheInitialLayout();
        this.applyOrientationStyles();
        
        console.log('OrientationHandler initialized');
    }

    /**
     * Set up orientation change listeners
     */
    setupOrientationListeners() {
        // Modern orientation API
        if (screen.orientation) {
            screen.orientation.addEventListener('change', () => {
                this.handleOrientationChange();
            });
        }
        
        // Legacy orientation change
        window.addEventListener('orientationchange', () => {
            // Delay to allow browser to update dimensions
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Fallback using resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newOrientation = this.getOrientation();
                if (newOrientation !== this.currentOrientation) {
                    this.handleOrientationChange();
                }
            }, 250);
        });
    }

    /**
     * Get current device orientation
     */
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.type;
        } else if (window.orientation !== undefined) {
            const angle = window.orientation;
            if (angle === 0 || angle === 180) return 'portrait';
            if (angle === 90 || angle === -90) return 'landscape';
        }
        
        // Fallback based on dimensions
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        const previousOrientation = this.currentOrientation;
        this.currentOrientation = this.getOrientation();
        
        // Record orientation change
        this.orientationHistory.push({
            from: previousOrientation,
            to: this.currentOrientation,
            timestamp: Date.now(),
            dimensions: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
        
        console.log(`Orientation changed: ${previousOrientation} → ${this.currentOrientation}`);
        
        // Apply orientation-specific adaptations
        this.adaptLayoutForOrientation();
        
        // Trigger custom event
        this.dispatchOrientationEvent(previousOrientation, this.currentOrientation);
        
        // Update UI manager if available
        if (window.UIManager) {
            window.UIManager.adaptToScreenSize();
        }
        
        // Validate layout after change
        setTimeout(() => {
            this.validateOrientationLayout();
        }, 300);
    }

    /**
     * Cache initial layout measurements
     */
    cacheInitialLayout() {
        const elements = document.querySelectorAll('.game-main, .word-section, .letters-section, .controls-section');
        
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            this.layoutCache.set(element, {
                width: rect.width,
                height: rect.height,
                orientation: this.currentOrientation
            });
        });
    }

    /**
     * Adapt layout for current orientation
     */
    adaptLayoutForOrientation() {
        const isLandscape = this.currentOrientation.includes('landscape');
        const isPortrait = this.currentOrientation.includes('portrait');
        const isSmallScreen = window.innerHeight < 500;
        
        // Apply orientation-specific classes
        document.body.classList.toggle('orientation-landscape', isLandscape);
        document.body.classList.toggle('orientation-portrait', isPortrait);
        document.body.classList.toggle('small-height', isSmallScreen);
        
        // Specific adaptations
        if (isLandscape && isSmallScreen) {
            this.applyLandscapeMobileLayout();
        } else if (isPortrait) {
            this.applyPortraitLayout();
        }
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--orientation', isLandscape ? 'landscape' : 'portrait');
        document.documentElement.style.setProperty('--viewport-height', window.innerHeight + 'px');
        document.documentElement.style.setProperty('--viewport-width', window.innerWidth + 'px');
    }

    /**
     * Apply landscape mobile layout optimizations
     */
    applyLandscapeMobileLayout() {
        const gameMain = document.querySelector('.game-main');
        const wordSection = document.querySelector('.word-section');
        const progressSection = document.querySelector('.progress-section');
        
        if (gameMain) {
            gameMain.style.gap = '0.75rem';
        }
        
        if (wordSection) {
            wordSection.style.padding = '1rem';
        }
        
        if (progressSection) {
            progressSection.style.padding = '0.75rem';
        }
        
        // Compact word image for landscape
        const wordImage = document.getElementById('word-image');
        if (wordImage) {
            wordImage.style.width = '100px';
            wordImage.style.height = '100px';
        }
        
        // Adjust letter tiles for landscape
        const letterTiles = document.querySelectorAll('.letter-tile, .letter-slot');
        letterTiles.forEach(tile => {
            tile.style.width = '40px';
            tile.style.height = '40px';
            tile.style.fontSize = '1rem';
        });
    }

    /**
     * Apply portrait layout optimizations
     */
    applyPortraitLayout() {
        const gameMain = document.querySelector('.game-main');
        const wordSection = document.querySelector('.word-section');
        
        if (gameMain) {
            gameMain.style.gap = '';
        }
        
        if (wordSection) {
            wordSection.style.padding = '';
        }
        
        // Reset word image size
        const wordImage = document.getElementById('word-image');
        if (wordImage) {
            wordImage.style.width = '';
            wordImage.style.height = '';
        }
        
        // Reset letter tile sizes
        const letterTiles = document.querySelectorAll('.letter-tile, .letter-slot');
        letterTiles.forEach(tile => {
            tile.style.width = '';
            tile.style.height = '';
            tile.style.fontSize = '';
        });
    }

    /**
     * Apply orientation-specific CSS
     */
    applyOrientationStyles() {
        const style = document.createElement('style');
        style.id = 'orientation-styles';
        style.textContent = `
            /* Orientation-specific styles */
            body.orientation-landscape.small-height {
                --header-height: 60px;
                --section-padding: 0.75rem;
                --element-gap: 0.5rem;
            }
            
            body.orientation-portrait {
                --header-height: 80px;
                --section-padding: 1.5rem;
                --element-gap: 1rem;
            }
            
            /* Landscape mobile optimizations */
            @media (orientation: landscape) and (max-height: 500px) {
                .game-header {
                    padding: 0.5rem 1rem;
                }
                
                .game-title {
                    font-size: 1rem;
                }
                
                .header-controls .btn {
                    padding: 0.5rem;
                    min-height: 36px;
                    min-width: 36px;
                }
                
                .word-container {
                    gap: 1rem;
                }
                
                .word-image-container {
                    flex-shrink: 0;
                }
                
                .progress-section,
                .word-section,
                .letters-section,
                .controls-section {
                    padding: var(--section-padding);
                }
                
                .game-main {
                    gap: var(--element-gap);
                }
                
                /* Horizontal layout for landscape */
                .word-container {
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-around;
                }
                
                .word-target {
                    flex-direction: column;
                    min-height: 60px;
                }
                
                .letters-container {
                    justify-content: center;
                    min-height: 60px;
                }
            }
            
            /* Portrait optimizations */
            @media (orientation: portrait) {
                .word-container {
                    flex-direction: column;
                    gap: 2rem;
                }
                
                .controls-container {
                    flex-direction: column;
                    align-items: stretch;
                }
            }
            
            /* Very small landscape screens */
            @media (orientation: landscape) and (max-height: 400px) {
                .app-container {
                    padding: 0.25rem;
                }
                
                .modal-content {
                    max-height: 90vh;
                    overflow-y: auto;
                }
                
                .word-image {
                    width: 80px !important;
                    height: 80px !important;
                }
                
                .letter-tile,
                .letter-slot {
                    width: 36px !important;
                    height: 36px !important;
                    font-size: 0.9rem !important;
                    min-width: 36px !important;
                    min-height: 36px !important;
                }
            }
        `;
        
        // Remove existing orientation styles
        const existingStyles = document.getElementById('orientation-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        document.head.appendChild(style);
    }

    /**
     * Validate layout after orientation change
     */
    validateOrientationLayout() {
        const issues = [];
        
        // Check for horizontal overflow
        if (document.body.scrollWidth > window.innerWidth) {
            issues.push('Horizontal overflow detected');
        }
        
        // Check touch target sizes
        const interactiveElements = document.querySelectorAll('.letter-tile, .letter-slot, .btn');
        interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 36 || rect.height < 36) {
                issues.push(`Touch target too small: ${element.className}`);
            }
        });
        
        // Check if content fits in viewport
        const gameMain = document.querySelector('.game-main');
        if (gameMain) {
            const rect = gameMain.getBoundingClientRect();
            if (rect.height > window.innerHeight) {
                issues.push('Content height exceeds viewport');
            }
        }
        
        if (issues.length > 0) {
            console.warn('Orientation layout issues:', issues);
        } else {
            console.log('Orientation layout validation passed');
        }
        
        return issues;
    }

    /**
     * Dispatch custom orientation change event
     */
    dispatchOrientationEvent(from, to) {
        const event = new CustomEvent('orientationChanged', {
            detail: {
                from,
                to,
                dimensions: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                timestamp: Date.now()
            }
        });
        
        window.dispatchEvent(event);
    }

    /**
     * Get orientation statistics
     */
    getOrientationStats() {
        const stats = {
            current: this.currentOrientation,
            changes: this.orientationHistory.length,
            history: this.orientationHistory,
            preferredOrientation: this.getPreferredOrientation(),
            timeInOrientation: this.getTimeInCurrentOrientation()
        };
        
        return stats;
    }

    /**
     * Get preferred orientation based on usage
     */
    getPreferredOrientation() {
        if (this.orientationHistory.length === 0) {
            return this.currentOrientation;
        }
        
        const orientationCounts = {};
        this.orientationHistory.forEach(change => {
            orientationCounts[change.to] = (orientationCounts[change.to] || 0) + 1;
        });
        
        return Object.keys(orientationCounts).reduce((a, b) => 
            orientationCounts[a] > orientationCounts[b] ? a : b
        );
    }

    /**
     * Get time spent in current orientation
     */
    getTimeInCurrentOrientation() {
        const lastChange = this.orientationHistory[this.orientationHistory.length - 1];
        if (!lastChange) {
            return Date.now() - (window.gameStartTime || Date.now());
        }
        
        return Date.now() - lastChange.timestamp;
    }

    /**
     * Test orientation handling
     */
    runOrientationTests() {
        const tests = [];
        
        // Test 1: Orientation detection
        const orientationDetected = this.currentOrientation !== null;
        tests.push({
            name: 'Orientation Detection',
            passed: orientationDetected,
            details: `Current orientation: ${this.currentOrientation}`
        });
        
        // Test 2: Layout adaptation
        const hasOrientationClasses = document.body.classList.contains('orientation-landscape') || 
                                     document.body.classList.contains('orientation-portrait');
        tests.push({
            name: 'Layout Adaptation',
            passed: hasOrientationClasses,
            details: hasOrientationClasses ? 'Orientation classes applied' : 'No orientation classes found'
        });
        
        // Test 3: CSS custom properties
        const hasCustomProps = getComputedStyle(document.documentElement)
            .getPropertyValue('--orientation').trim() !== '';
        tests.push({
            name: 'CSS Custom Properties',
            passed: hasCustomProps,
            details: hasCustomProps ? 'Custom properties set' : 'Custom properties not found'
        });
        
        // Test 4: Touch target validation
        const layoutIssues = this.validateOrientationLayout();
        tests.push({
            name: 'Layout Validation',
            passed: layoutIssues.length === 0,
            details: layoutIssues.length === 0 ? 'No layout issues' : `${layoutIssues.length} issues found`
        });
        
        return tests;
    }

    /**
     * Simulate orientation change for testing
     */
    simulateOrientationChange(orientation) {
        const previousOrientation = this.currentOrientation;
        this.currentOrientation = orientation;
        
        // Apply the change
        this.adaptLayoutForOrientation();
        
        console.log(`Simulated orientation change: ${previousOrientation} → ${orientation}`);
        
        // Validate the result
        return this.validateOrientationLayout();
    }

    /**
     * Clean up orientation handler
     */
    destroy() {
        // Remove event listeners would go here if we stored references
        // Remove orientation styles
        const orientationStyles = document.getElementById('orientation-styles');
        if (orientationStyles) {
            orientationStyles.remove();
        }
        
        // Clear caches
        this.layoutCache.clear();
        this.orientationHistory = [];
    }
}

// Create global instance
window.OrientationHandler = new OrientationHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrientationHandler;
}