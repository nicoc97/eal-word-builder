/**
 * TouchHandler - Enhanced touch interaction support for mobile devices
 * 
 * This class provides comprehensive touch support for the word builder game,
 * ensuring smooth drag-and-drop functionality across all touch devices.
 * 
 * TOUCH INTERACTION PRINCIPLES:
 * 1. Touch targets meet WCAG 2.1 AA guidelines (minimum 44x44px)
 * 2. Visual feedback for all touch interactions
 * 3. Gesture recognition for intuitive interactions
 * 4. Fallback support for devices with limited touch capabilities
 */
class TouchHandler {
    constructor() {
        this.touchStartPos = { x: 0, y: 0 };
        this.touchCurrentPos = { x: 0, y: 0 };
        this.isDragging = false;
        this.draggedElement = null;
        this.touchOffset = { x: 0, y: 0 };
        this.dropZones = [];
        this.touchThreshold = 10; // Minimum movement to start drag
        
        this.init();
    }

    /**
     * Initialize touch handler
     */
    init() {
        this.setupTouchEvents();
        this.createTouchFeedback();
        this.validateTouchTargets();
        
        console.log('TouchHandler initialized');
    }

    /**
     * Set up touch event listeners
     */
    setupTouchEvents() {
        // Prevent default touch behaviors that interfere with drag-and-drop
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });

        // Handle touch start on letter tiles
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('letter-tile')) {
                this.handleTouchStart(e);
            }
        }, { passive: false });

        // Handle touch move for dragging
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.handleTouchMove(e);
            }
        }, { passive: false });

        // Handle touch end for dropping
        document.addEventListener('touchend', (e) => {
            if (this.isDragging) {
                this.handleTouchEnd(e);
            }
        });

        // Handle touch cancel
        document.addEventListener('touchcancel', (e) => {
            if (this.isDragging) {
                this.handleTouchCancel(e);
            }
        });
    }

    /**
     * Handle touch start on draggable elements
     */
    handleTouchStart(e) {
        const tile = e.target;
        
        // Don't start drag on used tiles
        if (tile.classList.contains('used')) {
            return;
        }

        const touch = e.touches[0];
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        this.touchCurrentPos = { x: touch.clientX, y: touch.clientY };
        
        // Calculate offset from touch point to element center
        const rect = tile.getBoundingClientRect();
        this.touchOffset = {
            x: touch.clientX - rect.left - rect.width / 2,
            y: touch.clientY - rect.top - rect.height / 2
        };

        // Store reference to dragged element
        this.draggedElement = tile;
        
        // Add visual feedback
        tile.classList.add('touch-active');
        
        // Haptic feedback if available
        this.triggerHapticFeedback('light');
        
        // Start drag detection timer
        this.dragDetectionTimer = setTimeout(() => {
            this.startDrag(tile);
        }, 150);
    }

    /**
     * Handle touch move during drag
     */
    handleTouchMove(e) {
        if (!this.draggedElement) return;

        const touch = e.touches[0];
        this.touchCurrentPos = { x: touch.clientX, y: touch.clientY };

        // Check if we should start dragging
        if (!this.isDragging) {
            const distance = Math.sqrt(
                Math.pow(touch.clientX - this.touchStartPos.x, 2) +
                Math.pow(touch.clientY - this.touchStartPos.y, 2)
            );

            if (distance > this.touchThreshold) {
                this.startDrag(this.draggedElement);
            }
        }

        if (this.isDragging) {
            // Update drag ghost position
            this.updateDragGhost(touch.clientX, touch.clientY);
            
            // Check for drop zone hover
            this.checkDropZoneHover(touch.clientX, touch.clientY);
        }
    }

    /**
     * Handle touch end for dropping
     */
    handleTouchEnd(e) {
        if (this.dragDetectionTimer) {
            clearTimeout(this.dragDetectionTimer);
        }

        if (!this.isDragging && this.draggedElement) {
            // This was a tap, not a drag
            this.handleTileTap(this.draggedElement);
        } else if (this.isDragging) {
            // This was a drag, handle drop
            const touch = e.changedTouches[0];
            this.handleDrop(touch.clientX, touch.clientY);
        }

        this.cleanup();
    }

    /**
     * Handle touch cancel
     */
    handleTouchCancel(e) {
        this.cleanup();
    }

    /**
     * Start drag operation
     */
    startDrag(tile) {
        this.isDragging = true;
        
        // Add dragging class
        tile.classList.add('dragging');
        tile.classList.remove('touch-active');
        
        // Create drag ghost
        this.createDragGhost(tile);
        
        // Highlight drop zones
        this.highlightDropZones(true);
        
        // Haptic feedback
        this.triggerHapticFeedback('medium');
        
        // Update game state
        if (window.game) {
            window.game.draggedElement = tile;
        }
    }

    /**
     * Create visual drag ghost
     */
    createDragGhost(tile) {
        const ghost = tile.cloneNode(true);
        ghost.className = 'drag-ghost touch-ghost';
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.opacity = '0.9';
        ghost.style.transform = 'scale(1.1)';
        ghost.style.transition = 'none';
        
        document.body.appendChild(ghost);
        this.dragGhost = ghost;
        
        // Position initially
        this.updateDragGhost(this.touchCurrentPos.x, this.touchCurrentPos.y);
    }

    /**
     * Update drag ghost position
     */
    updateDragGhost(x, y) {
        if (this.dragGhost) {
            this.dragGhost.style.left = (x - this.touchOffset.x - 30) + 'px';
            this.dragGhost.style.top = (y - this.touchOffset.y - 30) + 'px';
        }
    }

    /**
     * Check for drop zone hover
     */
    checkDropZoneHover(x, y) {
        const element = document.elementFromPoint(x, y);
        
        // Clear previous hover states
        document.querySelectorAll('.letter-slot.touch-hover').forEach(slot => {
            slot.classList.remove('touch-hover');
        });
        
        // Check if over a drop zone
        if (element && element.classList.contains('letter-slot')) {
            element.classList.add('touch-hover');
            this.currentDropZone = element;
        } else {
            this.currentDropZone = null;
        }
    }

    /**
     * Handle drop operation
     */
    handleDrop(x, y) {
        const dropElement = document.elementFromPoint(x, y);
        
        if (dropElement && dropElement.classList.contains('letter-slot')) {
            // Valid drop zone
            const letter = this.draggedElement.dataset.letter;
            
            // Use game's place letter method if available
            if (window.game && typeof window.game.placeLetter === 'function') {
                window.game.placeLetter(dropElement, letter);
            } else {
                // Fallback placement
                this.placeLetter(dropElement, letter);
            }
            
            // Success haptic feedback
            this.triggerHapticFeedback('heavy');
        } else {
            // Invalid drop, return to original position
            this.returnToOriginalPosition();
            
            // Error haptic feedback
            this.triggerHapticFeedback('light');
        }
    }

    /**
     * Handle tile tap (for quick placement)
     */
    handleTileTap(tile) {
        if (tile.classList.contains('used')) return;
        
        // Find first empty slot
        const emptySlot = document.querySelector('.letter-slot:not(.filled)');
        
        if (emptySlot) {
            const letter = tile.dataset.letter;
            
            // Use game's place letter method if available
            if (window.game && typeof window.game.placeLetter === 'function') {
                window.game.placeLetter(emptySlot, letter);
            } else {
                // Fallback placement
                this.placeLetter(emptySlot, letter);
            }
            
            // Success haptic feedback
            this.triggerHapticFeedback('medium');
        }
    }

    /**
     * Fallback letter placement method
     */
    placeLetter(slot, letter) {
        if (slot.textContent) {
            // Slot is occupied, return the letter to available tiles
            this.returnLetterToTiles(slot.textContent.toLowerCase());
        }

        slot.textContent = letter.toUpperCase();
        slot.classList.add('filled');

        // Mark the dragged tile as used
        if (this.draggedElement) {
            this.draggedElement.classList.add('used');
            this.draggedElement.draggable = false;
        }
    }

    /**
     * Return letter to available tiles
     */
    returnLetterToTiles(letter) {
        const usedTile = document.querySelector(
            `.letter-tile[data-letter="${letter}"].used`
        );
        
        if (usedTile) {
            usedTile.classList.remove('used');
            usedTile.draggable = true;
        }
    }

    /**
     * Return dragged element to original position
     */
    returnToOriginalPosition() {
        if (this.draggedElement) {
            // Add return animation
            this.draggedElement.style.transition = 'transform 0.3s ease';
            this.draggedElement.style.transform = 'scale(1)';
            
            setTimeout(() => {
                this.draggedElement.style.transition = '';
                this.draggedElement.style.transform = '';
            }, 300);
        }
    }

    /**
     * Highlight drop zones
     */
    highlightDropZones(highlight) {
        const slots = document.querySelectorAll('.letter-slot');
        
        slots.forEach(slot => {
            if (highlight) {
                slot.classList.add('drop-zone-active');
            } else {
                slot.classList.remove('drop-zone-active', 'touch-hover');
            }
        });
    }

    /**
     * Create touch feedback styles
     */
    createTouchFeedback() {
        const style = document.createElement('style');
        style.textContent = `
            /* Touch feedback styles */
            .touch-active {
                transform: scale(0.95);
                opacity: 0.8;
                transition: all 0.1s ease;
            }

            .touch-ghost {
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                border: 2px solid rgba(79, 172, 254, 0.5);
            }

            .touch-hover {
                background: rgba(79, 172, 254, 0.2);
                border-color: #4facfe;
                transform: scale(1.05);
                transition: all 0.2s ease;
            }

            .drop-zone-active {
                border-style: dashed;
                border-color: rgba(79, 172, 254, 0.6);
                animation: dropZonePulse 2s infinite;
            }

            @keyframes dropZonePulse {
                0%, 100% { border-color: rgba(79, 172, 254, 0.6); }
                50% { border-color: rgba(79, 172, 254, 0.9); }
            }

            /* Ensure touch targets are large enough */
            .letter-tile,
            .letter-slot,
            .btn {
                min-width: 44px;
                min-height: 44px;
                touch-action: manipulation;
            }

            /* Prevent text selection during touch */
            .letter-tile,
            .letter-slot {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-touch-callout: none;
            }

            /* Reduce motion for accessibility */
            @media (prefers-reduced-motion: reduce) {
                .touch-active,
                .touch-hover,
                .drop-zone-active {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Validate touch target sizes
     */
    validateTouchTargets() {
        const interactiveElements = document.querySelectorAll(
            '.letter-tile, .letter-slot, button, .btn, [role="button"]'
        );
        
        const violations = [];
        
        interactiveElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            
            if (rect.width < 44 || rect.height < 44) {
                violations.push({
                    element,
                    index,
                    size: { width: rect.width, height: rect.height },
                    selector: this.getElementSelector(element)
                });
                
                // Auto-fix by setting minimum size
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
            }
        });
        
        if (violations.length > 0) {
            console.warn('Touch target size violations found and fixed:', violations);
        }
        
        return violations;
    }

    /**
     * Get CSS selector for element
     */
    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return element.tagName.toLowerCase();
    }

    /**
     * Trigger haptic feedback if available
     */
    triggerHapticFeedback(intensity = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30]
            };
            
            navigator.vibrate(patterns[intensity] || patterns.light);
        }
    }

    /**
     * Clean up drag state
     */
    cleanup() {
        if (this.dragDetectionTimer) {
            clearTimeout(this.dragDetectionTimer);
            this.dragDetectionTimer = null;
        }

        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging', 'touch-active');
            this.draggedElement = null;
        }

        if (this.dragGhost && this.dragGhost.parentNode) {
            this.dragGhost.parentNode.removeChild(this.dragGhost);
            this.dragGhost = null;
        }

        this.highlightDropZones(false);
        this.isDragging = false;
        this.currentDropZone = null;

        // Clear game drag state
        if (window.game) {
            window.game.draggedElement = null;
        }
    }

    /**
     * Test touch functionality
     */
    runTouchTests() {
        const tests = [];
        
        // Test 1: Touch target sizes
        const targetViolations = this.validateTouchTargets();
        tests.push({
            name: 'Touch Target Sizes',
            passed: targetViolations.length === 0,
            details: targetViolations.length === 0 
                ? 'All touch targets meet 44x44px minimum'
                : `${targetViolations.length} violations found and fixed`
        });
        
        // Test 2: Touch event support
        const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        tests.push({
            name: 'Touch Event Support',
            passed: touchSupported,
            details: touchSupported ? 'Touch events supported' : 'Touch events not supported'
        });
        
        // Test 3: Haptic feedback support
        const hapticSupported = 'vibrate' in navigator;
        tests.push({
            name: 'Haptic Feedback Support',
            passed: hapticSupported,
            details: hapticSupported ? 'Vibration API supported' : 'Vibration API not supported'
        });
        
        return tests;
    }

    /**
     * Destroy touch handler
     */
    destroy() {
        this.cleanup();
        
        // Remove event listeners would go here if we stored references
        // For now, we rely on garbage collection
    }
}

// Create global instance
window.TouchHandler = new TouchHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchHandler;
}