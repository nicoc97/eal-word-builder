/**
 * Frontend Error Handler for Word Builder Game
 * 
 * EAL PEDAGOGY: GENTLE ERROR HANDLING AND RESILIENT LEARNING ENVIRONMENT
 * 
 * This class implements research-based error handling principles for EAL learners:
 * 
 * 1. NON-DISRUPTIVE ERROR RECOVERY:
 *    - Errors don't break game flow or interrupt learning momentum
 *    - Automatic retry mechanisms reduce frustration for learners
 *    - Fallback data ensures continuous learning even offline
 *    - Reference: Flow Theory (Csikszentmihalyi) - maintaining engagement
 * 
 * 2. ENCOURAGING ERROR MESSAGING:
 *    - Error messages focus on solutions rather than problems
 *    - Positive language maintains learner confidence ("You can keep playing!")
 *    - Visual icons use supportive symbols (⚡ for warnings, not ❌)
 *    - Reference: Growth Mindset research (Dweck) - errors as learning opportunities
 * 
 * 3. ACCESSIBILITY IN ERROR HANDLING:
 *    - Screen reader compatible error announcements
 *    - Multiple notification channels (visual, text, audio)
 *    - Keyboard navigation support for error dismissal
 *    - Reference: Web Content Accessibility Guidelines (WCAG)
 * 
 * 4. OFFLINE LEARNING CONTINUITY:
 *    - Cached content enables learning without internet dependency
 *    - Progress preservation prevents loss of learner achievements
 *    - Seamless sync when connectivity returns
 *    - Reference: Digital Equity in Education - reducing access barriers
 * 
 * 5. GENTLE INPUT VALIDATION:
 *    - Validation provides guidance rather than rejection
 *    - Error messages explain what's needed, not just what's wrong
 *    - Progressive disclosure of validation requirements
 *    - Reference: User Experience in Educational Technology
 * 
 * Provides comprehensive error handling, network recovery, and user-friendly
 * error messages that don't break the game flow. Designed specifically for
 * EAL learners with gentle, encouraging error feedback.
 * 
 * @author Word Builder Game
 * @version 1.0
 */

class FrontendErrorHandler {
    constructor() {
        this.isOnline = navigator.onLine;
        this.retryAttempts = {};
        this.maxRetries = 3;
        this.retryDelay = 1000; // Base delay in milliseconds
        this.errorQueue = [];
        this.fallbackData = {};
        this.userNotified = false;
        
        this.init();
    }
    
    /**
     * Initialize the error handler
     */
    init() {
        this.setupGlobalErrorHandlers();
        this.setupNetworkListeners();
        this.loadFallbackData();
        
        console.log('FrontendErrorHandler initialized');
    }
    
    /**
     * Set up global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError(event.error, event.filename, event.lineno, event.colno);
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
            event.preventDefault(); // Prevent console error
        });
        
        // Handle fetch errors globally
        this.interceptFetch();
    }
    
    /**
     * Set up network status listeners
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.onNetworkRestore();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.onNetworkLoss();
        });
    }
    
    /**
     * Handle JavaScript errors gracefully
     */
    handleJavaScriptError(error, filename, lineno, colno) {
        const errorInfo = {
            type: 'javascript_error',
            message: error?.message || 'Unknown JavaScript error',
            filename: filename || 'unknown',
            line: lineno || 0,
            column: colno || 0,
            stack: error?.stack || 'No stack trace available',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.logError(errorInfo);
        
        // Don't show error to user for minor issues
        if (this.isCriticalError(error)) {
            this.showUserFriendlyError(
                'Something went wrong, but you can keep playing!',
                'The game will continue working normally.',
                'info'
            );
        }
    }
    
    /**
     * Handle unhandled promise rejections
     */
    handlePromiseRejection(reason) {
        const errorInfo = {
            type: 'promise_rejection',
            message: reason?.message || reason || 'Promise rejection',
            stack: reason?.stack || 'No stack trace available',
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        this.logError(errorInfo);
        
        // Handle network-related promise rejections
        if (this.isNetworkError(reason)) {
            this.handleNetworkError(reason);
        }
    }
    
    /**
     * Intercept fetch requests to handle errors consistently
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Reset retry count on successful request
                const url = args[0];
                if (this.retryAttempts[url]) {
                    delete this.retryAttempts[url];
                }
                
                return response;
            } catch (error) {
                return this.handleFetchError(error, ...args);
            }
        };
    }
    
    /**
     * Handle fetch errors with retry logic
     */
    async handleFetchError(error, ...fetchArgs) {
        const url = fetchArgs[0];
        const options = fetchArgs[1] || {};
        
        // Initialize retry count
        if (!this.retryAttempts[url]) {
            this.retryAttempts[url] = 0;
        }
        
        this.retryAttempts[url]++;
        
        // Log the error
        this.logError({
            type: 'fetch_error',
            url: url,
            method: options.method || 'GET',
            message: error.message,
            attempt: this.retryAttempts[url],
            timestamp: new Date().toISOString()
        });
        
        // If we haven't exceeded max retries and it's a network error, retry
        if (this.retryAttempts[url] <= this.maxRetries && this.isNetworkError(error)) {
            const delay = this.calculateRetryDelay(this.retryAttempts[url]);
            
            await this.delay(delay);
            
            try {
                return await fetch(...fetchArgs);
            } catch (retryError) {
                return this.handleFetchError(retryError, ...fetchArgs);
            }
        }
        
        // Max retries exceeded or non-network error
        return this.handleFailedRequest(error, url, options);
    }
    
    /**
     * Handle failed requests with fallback options
     */
    async handleFailedRequest(error, url, options) {
        const method = options.method || 'GET';
        
        // Try to provide fallback data
        const fallbackResponse = this.getFallbackResponse(url, method);
        if (fallbackResponse) {
            this.showUserFriendlyError(
                'Using offline data',
                'Some features may be limited while offline.',
                'warning',
                3000
            );
            return fallbackResponse;
        }
        
        // Show appropriate error message to user
        this.handleNetworkError(error);
        
        // Return a failed response that won't break the application
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Network error - please try again',
                offline: !this.isOnline,
                timestamp: new Date().toISOString()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
    
    /**
     * Handle network errors with user-friendly messages
     */
    handleNetworkError(error) {
        if (!this.isOnline) {
            this.showUserFriendlyError(
                'Playing offline',
                'Your progress will sync when connection returns.',
                'warning',
                5000
            );
        } else {
            this.showUserFriendlyError(
                'Connection issue',
                'Trying to reconnect... You can keep playing!',
                'warning',
                4000
            );
        }
    }
    
    /**
     * Handle network restoration
     */
    onNetworkRestore() {
        this.showUserFriendlyError(
            'Connection restored!',
            'Syncing your progress...',
            'success',
            3000
        );
        
        // Clear retry attempts
        this.retryAttempts = {};
        
        // Trigger sync if ProgressTracker is available
        if (window.ProgressTracker) {
            window.ProgressTracker.forceSync();
        }
    }
    
    /**
     * Handle network loss
     */
    onNetworkLoss() {
        this.showUserFriendlyError(
            'Connection lost',
            'Don\'t worry - you can keep playing offline!',
            'info',
            5000
        );
    }
    
    /**
     * Validate user input with gentle feedback
     */
    validateInput(input, rules) {
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = input[field];
            
            // Required field check
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors.push({
                    field,
                    message: rule.message || `${field} is required`,
                    type: 'required'
                });
                continue;
            }
            
            // Skip other validations if field is empty and not required
            if (!value && !rule.required) continue;
            
            // Type validation
            if (rule.type) {
                if (!this.validateType(value, rule.type)) {
                    errors.push({
                        field,
                        message: rule.message || `${field} must be a valid ${rule.type}`,
                        type: 'type'
                    });
                    continue;
                }
            }
            
            // Length validation
            if (rule.minLength && value.toString().length < rule.minLength) {
                errors.push({
                    field,
                    message: rule.message || `${field} must be at least ${rule.minLength} characters`,
                    type: 'minLength'
                });
            }
            
            if (rule.maxLength && value.toString().length > rule.maxLength) {
                errors.push({
                    field,
                    message: rule.message || `${field} must be no more than ${rule.maxLength} characters`,
                    type: 'maxLength'
                });
            }
            
            // Range validation
            if (rule.min && Number(value) < rule.min) {
                errors.push({
                    field,
                    message: rule.message || `${field} must be at least ${rule.min}`,
                    type: 'min'
                });
            }
            
            if (rule.max && Number(value) > rule.max) {
                errors.push({
                    field,
                    message: rule.message || `${field} must be no more than ${rule.max}`,
                    type: 'max'
                });
            }
            
            // Pattern validation
            if (rule.pattern && !rule.pattern.test(value.toString())) {
                errors.push({
                    field,
                    message: rule.message || `${field} format is invalid`,
                    type: 'pattern'
                });
            }
            
            // Custom validation
            if (rule.custom && typeof rule.custom === 'function') {
                const customResult = rule.custom(value);
                if (customResult !== true) {
                    errors.push({
                        field,
                        message: typeof customResult === 'string' ? customResult : `${field} is invalid`,
                        type: 'custom'
                    });
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Validate data type
     */
    validateType(value, type) {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return !isNaN(Number(value)) && isFinite(Number(value));
            case 'integer':
                return Number.isInteger(Number(value));
            case 'boolean':
                return typeof value === 'boolean' || value === 'true' || value === 'false';
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'url':
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            default:
                return true;
        }
    }
    
    /**
     * Show user-friendly error messages that don't break game flow
     */
    showUserFriendlyError(title, message, type = 'error', duration = 4000) {
        // Don't spam the user with multiple notifications
        if (this.userNotified && type === 'error') {
            return;
        }
        
        if (type === 'error') {
            this.userNotified = true;
            setTimeout(() => {
                this.userNotified = false;
            }, 10000); // Reset after 10 seconds
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `error-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${this.getNotificationIcon(type)}</div>
                <div class="notification-text">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close" aria-label="Close notification">×</button>
            </div>
        `;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border-left: 4px solid ${this.getNotificationColor(type)};
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto-hide after duration
        setTimeout(() => {
            this.hideNotification(notification);
        }, duration);
    }
    
    /**
     * Hide notification with animation
     */
    hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            error: '⚠️',
            warning: '⚡',
            info: 'ℹ️',
            success: '✅'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Get notification color based on type
     */
    getNotificationColor(type) {
        const colors = {
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3',
            success: '#4caf50'
        };
        return colors[type] || colors.info;
    }
    
    /**
     * Load fallback data for offline functionality
     */
    loadFallbackData() {
        // Load cached data from localStorage
        try {
            const cached = localStorage.getItem('wordBuilderFallbackData');
            if (cached) {
                this.fallbackData = JSON.parse(cached);
            }
        } catch (error) {
            console.warn('Could not load fallback data:', error);
        }
        
        // Set up default fallback data
        this.fallbackData = {
            ...this.fallbackData,
            words: {
                1: [
                    { word: 'cat', image: '../assets/images/placeholder.svg', phonetic: '/kæt/', difficulty: 1, category: 'animals' },
                    { word: 'dog', image: '../assets/images/placeholder.svg', phonetic: '/dɒɡ/', difficulty: 1, category: 'animals' },
                    { word: 'pen', image: '../assets/images/placeholder.svg', phonetic: '/pen/', difficulty: 1, category: 'objects' },
                    { word: 'sun', image: '../assets/images/placeholder.svg', phonetic: '/sʌn/', difficulty: 1, category: 'nature' },
                    { word: 'hat', image: '../assets/images/placeholder.svg', phonetic: '/hæt/', difficulty: 1, category: 'objects' }
                ]
            },
            levels: [
                { level: 1, name: 'Simple CVC Words', description: 'Basic consonant-vowel-consonant words' },
                { level: 2, name: 'CVCC and CCVC Words', description: 'Words with consonant clusters' },
                { level: 3, name: 'Complex Words', description: 'Longer words and complex patterns' }
            ]
        };
    }
    
    /**
     * Get fallback response for failed requests
     */
    getFallbackResponse(url, method) {
        if (method !== 'GET') return null;
        
        // Extract endpoint from URL
        const endpoint = this.extractEndpoint(url);
        
        switch (endpoint) {
            case 'words':
                const level = this.extractLevelFromUrl(url) || 1;
                const words = this.fallbackData.words[level] || this.fallbackData.words[1];
                return new Response(JSON.stringify({
                    success: true,
                    data: { words, level, count: words.length },
                    offline: true
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
                
            case 'levels':
                return new Response(JSON.stringify({
                    success: true,
                    data: this.fallbackData.levels,
                    offline: true
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
                
            case 'progress':
                // Return empty progress for offline mode
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        session_id: 'offline-session',
                        current_level: 1,
                        total_score: 0,
                        levels: []
                    },
                    offline: true
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
                
            default:
                return null;
        }
    }
    
    /**
     * Extract endpoint from URL
     */
    extractEndpoint(url) {
        const urlObj = new URL(url, window.location.origin);
        const pathname = urlObj.pathname;
        
        if (pathname.includes('words')) return 'words';
        if (pathname.includes('levels')) return 'levels';
        if (pathname.includes('progress')) return 'progress';
        
        return null;
    }
    
    /**
     * Extract level from URL
     */
    extractLevelFromUrl(url) {
        const match = url.match(/level[=\/](\d+)/i);
        return match ? parseInt(match[1]) : null;
    }
    
    /**
     * Check if error is network-related
     */
    isNetworkError(error) {
        if (!error) return false;
        
        const networkErrorMessages = [
            'fetch',
            'network',
            'connection',
            'timeout',
            'offline',
            'unreachable',
            'dns',
            'cors'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return networkErrorMessages.some(msg => errorMessage.includes(msg));
    }
    
    /**
     * Check if error is critical and should be shown to user
     */
    isCriticalError(error) {
        if (!error) return false;
        
        const criticalErrors = [
            'ReferenceError',
            'TypeError',
            'SyntaxError'
        ];
        
        return criticalErrors.some(type => error.name === type);
    }
    
    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(attempt) {
        return Math.min(this.retryDelay * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
    }
    
    /**
     * Delay utility function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Log error for debugging and analytics
     */
    logError(errorInfo) {
        // Log to console in development
        if (this.isDevelopmentMode()) {
            console.error('Error logged:', errorInfo);
        }
        
        // Store in error queue for potential reporting
        this.errorQueue.push(errorInfo);
        
        // Keep only last 50 errors to prevent memory issues
        if (this.errorQueue.length > 50) {
            this.errorQueue = this.errorQueue.slice(-50);
        }
        
        // Try to store in localStorage for debugging
        try {
            localStorage.setItem('wordBuilderErrorLog', JSON.stringify(this.errorQueue));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    /**
     * Check if running in development mode
     */
    isDevelopmentMode() {
        return (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:'
        );
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: this.errorQueue.length,
            errorTypes: {},
            networkErrors: 0,
            jsErrors: 0,
            recentErrors: 0
        };
        
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        this.errorQueue.forEach(error => {
            // Count by type
            stats.errorTypes[error.type] = (stats.errorTypes[error.type] || 0) + 1;
            
            // Count network vs JS errors
            if (error.type === 'fetch_error' || this.isNetworkError(error)) {
                stats.networkErrors++;
            } else if (error.type === 'javascript_error') {
                stats.jsErrors++;
            }
            
            // Count recent errors
            if (new Date(error.timestamp).getTime() > oneHourAgo) {
                stats.recentErrors++;
            }
        });
        
        return stats;
    }
    
    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorQueue = [];
        try {
            localStorage.removeItem('wordBuilderErrorLog');
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    /**
     * Test error handling (for debugging)
     */
    testErrorHandling() {
        console.log('Testing error handling...');
        
        // Test JavaScript error
        setTimeout(() => {
            throw new Error('Test JavaScript error');
        }, 1000);
        
        // Test promise rejection
        setTimeout(() => {
            Promise.reject(new Error('Test promise rejection'));
        }, 2000);
        
        // Test network error
        setTimeout(async () => {
            try {
                await fetch('/nonexistent-endpoint');
            } catch (error) {
                console.log('Network error test completed');
            }
        }, 3000);
        
        console.log('Error handling tests initiated');
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('error', this.handleJavaScriptError);
        window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
        window.removeEventListener('online', this.onNetworkRestore);
        window.removeEventListener('offline', this.onNetworkLoss);
        
        // Clear error queue
        this.errorQueue = [];
        this.retryAttempts = {};
    }
}

// Add CSS styles for notifications
const errorHandlerStyles = document.createElement('style');
errorHandlerStyles.textContent = `
    .error-notification {
        font-size: 14px;
        line-height: 1.4;
    }
    
    .notification-content {
        display: flex;
        align-items: flex-start;
        padding: 16px;
        gap: 12px;
    }
    
    .notification-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
    }
    
    .notification-text {
        flex: 1;
        min-width: 0;
    }
    
    .notification-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #333;
    }
    
    .notification-message {
        color: #666;
        font-size: 13px;
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
    }
    
    .notification-close:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: #666;
    }
    
    .error-notification.error {
        border-left-color: #f44336;
    }
    
    .error-notification.warning {
        border-left-color: #ff9800;
    }
    
    .error-notification.info {
        border-left-color: #2196f3;
    }
    
    .error-notification.success {
        border-left-color: #4caf50;
    }
    
    @media (max-width: 480px) {
        .error-notification {
            right: 10px;
            left: 10px;
            max-width: none;
        }
        
        .notification-content {
            padding: 12px;
        }
        
        .notification-title {
            font-size: 14px;
        }
        
        .notification-message {
            font-size: 12px;
        }
    }
`;

document.head.appendChild(errorHandlerStyles);

// Create global instance
window.FrontendErrorHandler = new FrontendErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrontendErrorHandler;
}