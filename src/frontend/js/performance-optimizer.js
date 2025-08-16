/**
 * PerformanceOptimizer - Comprehensive performance optimization utilities
 * 
 * This class provides performance monitoring, lazy loading, and optimization
 * features to ensure the game runs smoothly on all devices, especially mobile.
 */
class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            loadTime: 0,
            renderTime: 0,
            memoryUsage: 0,
            networkRequests: [],
            frameRate: 0,
            interactions: []
        };
        
        this.observers = new Map();
        this.loadedResources = new Set();
        this.performanceEntries = [];
        
        this.init();
    }

    /**
     * Initialize performance optimizer
     */
    init() {
        this.measureInitialLoad();
        this.setupPerformanceObservers();
        this.initializeLazyLoading();
        this.optimizeCSS();
        this.setupResourcePreloading();
        
        console.log('PerformanceOptimizer initialized');
    }

    /**
     * Measure initial page load performance
     */
    measureInitialLoad() {
        if (performance.timing) {
            const timing = performance.timing;
            this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
            this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
            this.metrics.firstPaint = timing.responseEnd - timing.navigationStart;
        }
        
        // Use Performance Observer for modern metrics
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.performanceEntries.push(entry);
                        
                        if (entry.entryType === 'paint') {
                            this.metrics[entry.name] = entry.startTime;
                        } else if (entry.entryType === 'largest-contentful-paint') {
                            this.metrics.lcp = entry.startTime;
                        } else if (entry.entryType === 'first-input') {
                            this.metrics.fid = entry.processingStart - entry.startTime;
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });
                this.observers.set('performance', observer);
            } catch (error) {
                console.warn('Performance Observer not supported:', error);
            }
        }
    }

    /**
     * Set up performance observers
     */
    setupPerformanceObservers() {
        // Monitor resource loading
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.metrics.networkRequests.push({
                            name: entry.name,
                            duration: entry.duration,
                            size: entry.transferSize || 0,
                            type: entry.initiatorType
                        });
                    }
                });
                
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.set('resource', resourceObserver);
            } catch (error) {
                console.warn('Resource observer not supported:', error);
            }
        }
        
        // Monitor memory usage
        this.startMemoryMonitoring();
        
        // Monitor frame rate
        this.startFrameRateMonitoring();
    }

    /**
     * Initialize lazy loading for images and resources
     */
    initializeLazyLoading() {
        // Lazy load images
        this.setupImageLazyLoading();
        
        // Lazy load audio resources
        this.setupAudioLazyLoading();
        
        // Lazy load non-critical CSS
        this.setupCSSLazyLoading();
    }

    /**
     * Set up image lazy loading
     */
    setupImageLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            // Observe all images with data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });

            this.observers.set('image', imageObserver);
        } else {
            // Fallback for browsers without IntersectionObserver
            this.loadAllImages();
        }
    }

    /**
     * Load individual image with optimization
     */
    loadImage(img) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            
            // Create a new image element for preloading
            const imageLoader = new Image();
            
            imageLoader.onload = () => {
                const loadTime = performance.now() - startTime;
                
                // Apply the source to the actual image
                img.src = img.dataset.src;
                img.classList.add('loaded');
                img.removeAttribute('data-src');
                
                // Track loading performance
                this.metrics.networkRequests.push({
                    name: img.dataset.src,
                    duration: loadTime,
                    type: 'image',
                    lazy: true
                });
                
                this.loadedResources.add(img.dataset.src);
                resolve(img);
            };
            
            imageLoader.onerror = () => {
                console.warn('Failed to load image:', img.dataset.src);
                img.classList.add('error');
                reject(new Error('Image load failed'));
            };
            
            // Start loading
            imageLoader.src = img.dataset.src;
        });
    }

    /**
     * Load all images (fallback)
     */
    loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => this.loadImage(img));
    }

    /**
     * Set up audio lazy loading
     */
    setupAudioLazyLoading() {
        // Note: Audio effects are generated programmatically by AudioManager
        // No need to preload MP3 files as they're created using Web Audio API
        
        // Lazy load word pronunciation audio
        this.setupWordAudioLazyLoading();
    }

    /**
     * Preload audio file
     */
    preloadAudio(src) {
        if (this.loadedResources.has(src)) return;
        
        const audio = new Audio();
        audio.preload = 'metadata';
        
        audio.addEventListener('canplaythrough', () => {
            this.loadedResources.add(src);
        });
        
        audio.addEventListener('error', () => {
            console.warn('Failed to preload audio:', src);
        });
        
        audio.src = src;
    }

    /**
     * Set up word audio lazy loading
     */
    setupWordAudioLazyLoading() {
        // This would be called when a new word is loaded
        window.addEventListener('wordLoaded', (event) => {
            const word = event.detail.word;
            if (word.audio) {
                this.preloadAudio(word.audio);
            }
        });
    }

    /**
     * Set up CSS lazy loading
     */
    setupCSSLazyLoading() {
        // Load non-critical CSS after initial render
        requestIdleCallback(() => {
            this.loadNonCriticalCSS();
        }, { timeout: 2000 });
    }

    /**
     * Load non-critical CSS
     */
    loadNonCriticalCSS() {
        const nonCriticalCSS = [
            // Add paths to non-critical CSS files here
            // 'css/animations.css',
            // 'css/print.css'
        ];
        
        nonCriticalCSS.forEach(href => {
            this.loadCSS(href);
        });
    }

    /**
     * Load CSS file asynchronously
     */
    loadCSS(href) {
        if (this.loadedResources.has(href)) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.media = 'print';
        link.onload = () => {
            link.media = 'all';
            this.loadedResources.add(href);
        };
        
        document.head.appendChild(link);
    }

    /**
     * Optimize CSS delivery
     */
    optimizeCSS() {
        // Inline critical CSS if not already done
        this.inlineCriticalCSS();
        
        // Remove unused CSS (simplified version)
        this.removeUnusedCSS();
        
        // Optimize CSS animations for performance
        this.optimizeCSSAnimations();
    }

    /**
     * Inline critical CSS
     */
    inlineCriticalCSS() {
        // This would typically be done at build time
        // For now, we ensure critical styles are loaded first
        const criticalStyles = `
            /* Critical above-the-fold styles */
            body { margin: 0; font-family: system-ui, sans-serif; }
            .app-container { min-height: 100vh; }
            .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; }
        `;
        
        const style = document.createElement('style');
        style.textContent = criticalStyles;
        document.head.insertBefore(style, document.head.firstChild);
    }

    /**
     * Remove unused CSS (simplified)
     */
    removeUnusedCSS() {
        // In a real implementation, this would analyze used selectors
        // For now, we just ensure we're not loading unnecessary stylesheets
        const unusedStylesheets = document.querySelectorAll('link[rel="stylesheet"][data-unused]');
        unusedStylesheets.forEach(link => link.remove());
    }

    /**
     * Optimize CSS animations
     */
    optimizeCSSAnimations() {
        // Disable animations on low-end devices
        if (this.isLowEndDevice()) {
            document.documentElement.style.setProperty('--animation-duration', '0.01ms');
            document.documentElement.style.setProperty('--transition-duration', '0.01ms');
        }
        
        // Use transform and opacity for animations (GPU acceleration)
        const style = document.createElement('style');
        style.textContent = `
            /* GPU-accelerated animations */
            .letter-tile,
            .letter-slot,
            .btn {
                will-change: transform;
                transform: translateZ(0);
            }
            
            .dragging {
                will-change: transform, opacity;
            }
            
            /* Optimize for 60fps */
            @media (prefers-reduced-motion: no-preference) {
                .letter-tile:hover {
                    transform: translateY(-3px) translateZ(0);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Set up resource preloading
     */
    setupResourcePreloading() {
        // Preload critical resources
        this.preloadCriticalResources();
        
        // Set up predictive preloading
        this.setupPredictivePreloading();
    }

    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        // Skip API preloading since the game initialization timing doesn't align
        // with browser preload expectations. The game loads data on-demand during initialization.
        console.debug('Skipping API preloading - using on-demand loading strategy');
    }

    /**
     * Set up predictive preloading
     */
    setupPredictivePreloading() {
        // Preload next level resources when user is close to completing current level
        window.addEventListener('progressUpdate', (event) => {
            const progress = event.detail;
            if (progress.completion > 0.8) {
                this.preloadNextLevel(progress.currentLevel + 1);
            }
        });
        
        // Preload resources on hover/focus (for desktop)
        document.addEventListener('mouseover', (event) => {
            if (event.target.matches('[data-preload]')) {
                this.preloadResource(event.target.dataset.preload);
            }
        });
    }

    /**
     * Preload next level resources
     */
    preloadNextLevel(level) {
        const nextLevelUrl = `src/backend/api/words/${level}`;
        
        if (!this.loadedResources.has(nextLevelUrl)) {
            fetch(nextLevelUrl)
                .then(response => response.json())
                .then(data => {
                    this.loadedResources.add(nextLevelUrl);
                    
                    // Using emojis - no image preloading needed
                    console.debug('Next level data preloaded (emoji-based visuals)');
                })
                .catch(error => {
                    console.warn('Failed to preload next level:', error);
                });
        }
    }

    /**
     * Preload individual resource
     */
    preloadResource(url) {
        if (this.loadedResources.has(url)) return;
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        
        link.onload = () => {
            this.loadedResources.add(url);
        };
        
        document.head.appendChild(link);
    }

    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        if ('memory' in performance) {
            setInterval(() => {
                this.metrics.memoryUsage = {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };
            }, 5000);
        }
    }

    /**
     * Start frame rate monitoring
     */
    startFrameRateMonitoring() {
        let frames = 0;
        let lastTime = performance.now();
        
        const measureFPS = (currentTime) => {
            frames++;
            
            if (currentTime >= lastTime + 1000) {
                this.metrics.frameRate = Math.round((frames * 1000) / (currentTime - lastTime));
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    /**
     * Detect low-end device
     */
    isLowEndDevice() {
        // Check various indicators of device performance
        const indicators = {
            memory: navigator.deviceMemory && navigator.deviceMemory < 4,
            cores: navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4,
            connection: navigator.connection && navigator.connection.effectiveType === 'slow-2g',
            battery: navigator.getBattery && navigator.getBattery().then(battery => battery.level < 0.2)
        };
        
        // Simple heuristic: if 2 or more indicators suggest low-end, treat as such
        const lowEndCount = Object.values(indicators).filter(Boolean).length;
        return lowEndCount >= 2;
    }

    /**
     * Optimize for low-end devices
     */
    optimizeForLowEndDevice() {
        if (this.isLowEndDevice()) {
            // Reduce visual effects
            document.documentElement.classList.add('low-end-device');
            
            // Disable non-essential animations
            const style = document.createElement('style');
            style.textContent = `
                .low-end-device * {
                    animation-duration: 0.01ms !important;
                    transition-duration: 0.01ms !important;
                }
                
                .low-end-device .letter-tile:hover {
                    transform: none !important;
                }
                
                .low-end-device .glass {
                    backdrop-filter: none;
                    background: rgba(255, 255, 255, 0.9);
                }
            `;
            
            document.head.appendChild(style);
            
            console.log('Low-end device optimizations applied');
        }
    }

    /**
     * Test offline functionality
     */
    testOfflineFunctionality() {
        const tests = [];
        
        // Test 1: Service Worker registration
        const hasServiceWorker = 'serviceWorker' in navigator;
        tests.push({
            name: 'Service Worker Support',
            passed: hasServiceWorker,
            details: hasServiceWorker ? 'Service Worker API available' : 'Service Worker not supported'
        });
        
        // Test 2: Local Storage availability
        const hasLocalStorage = this.testLocalStorage();
        tests.push({
            name: 'Local Storage',
            passed: hasLocalStorage,
            details: hasLocalStorage ? 'Local Storage available' : 'Local Storage not available'
        });
        
        // Test 3: IndexedDB availability
        const hasIndexedDB = 'indexedDB' in window;
        tests.push({
            name: 'IndexedDB Support',
            passed: hasIndexedDB,
            details: hasIndexedDB ? 'IndexedDB available' : 'IndexedDB not supported'
        });
        
        // Test 4: Cache API
        const hasCacheAPI = 'caches' in window;
        tests.push({
            name: 'Cache API Support',
            passed: hasCacheAPI,
            details: hasCacheAPI ? 'Cache API available' : 'Cache API not supported'
        });
        
        return tests;
    }

    /**
     * Test local storage functionality
     */
    testLocalStorage() {
        try {
            const testKey = 'test-storage';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Validate database query performance
     */
    async validateDatabasePerformance() {
        const tests = [];
        
        try {
            // Test API response time
            const startTime = performance.now();
            const response = await fetch('src/backend/api/words/1');
            const endTime = performance.now();
            
            const responseTime = endTime - startTime;
            const isAcceptable = responseTime < 1000; // 1 second threshold
            
            tests.push({
                name: 'API Response Time',
                passed: isAcceptable,
                details: `Response time: ${responseTime.toFixed(2)}ms`,
                responseTime
            });
            
            // Test data parsing performance
            const parseStartTime = performance.now();
            const data = await response.json();
            const parseEndTime = performance.now();
            
            const parseTime = parseEndTime - parseStartTime;
            const parseAcceptable = parseTime < 100; // 100ms threshold
            
            tests.push({
                name: 'Data Parsing Performance',
                passed: parseAcceptable,
                details: `Parse time: ${parseTime.toFixed(2)}ms`,
                parseTime
            });
            
        } catch (error) {
            tests.push({
                name: 'Database Connection',
                passed: false,
                details: `Error: ${error.message}`,
                error
            });
        }
        
        return tests;
    }

    /**
     * Generate performance report
     */
    generatePerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            loadedResources: Array.from(this.loadedResources),
            deviceInfo: {
                memory: navigator.deviceMemory,
                cores: navigator.hardwareConcurrency,
                connection: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                userAgent: navigator.userAgent
            },
            recommendations: this.generateRecommendations()
        };
        
        console.log('Performance Report:', report);
        return report;
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Check load time
        if (this.metrics.loadTime > 3000) {
            recommendations.push({
                type: 'critical',
                message: 'Page load time is too slow',
                suggestion: 'Optimize critical resources and enable compression'
            });
        }
        
        // Check memory usage
        if (this.metrics.memoryUsage && this.metrics.memoryUsage.used > 50 * 1024 * 1024) {
            recommendations.push({
                type: 'warning',
                message: 'High memory usage detected',
                suggestion: 'Consider implementing resource cleanup and lazy loading'
            });
        }
        
        // Check frame rate
        if (this.metrics.frameRate < 30) {
            recommendations.push({
                type: 'warning',
                message: 'Low frame rate detected',
                suggestion: 'Optimize animations and reduce visual effects'
            });
        }
        
        // Check network requests
        const largeRequests = this.metrics.networkRequests.filter(req => req.size > 1024 * 1024);
        if (largeRequests.length > 0) {
            recommendations.push({
                type: 'info',
                message: 'Large network requests detected',
                suggestion: 'Consider compressing or splitting large resources'
            });
        }
        
        return recommendations;
    }

    /**
     * Run comprehensive performance tests
     */
    async runPerformanceTests() {
        console.log('Running performance tests...');
        
        const testSuites = [
            this.testOfflineFunctionality(),
            await this.validateDatabasePerformance()
        ];
        
        const allTests = testSuites.flat();
        
        const summary = {
            total: allTests.length,
            passed: allTests.filter(test => test.passed).length,
            failed: allTests.filter(test => !test.passed).length,
            tests: allTests
        };
        
        console.log('Performance test results:', summary);
        return summary;
    }

    /**
     * Clean up performance optimizer
     */
    destroy() {
        // Disconnect all observers
        this.observers.forEach(observer => {
            if (observer.disconnect) {
                observer.disconnect();
            }
        });
        
        this.observers.clear();
        this.loadedResources.clear();
        this.performanceEntries = [];
    }
}

// Create global instance
window.PerformanceOptimizer = new PerformanceOptimizer();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}