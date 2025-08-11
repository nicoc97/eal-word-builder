/**
 * ResponsiveTester - Comprehensive responsive design testing utility
 * 
 * This class provides automated testing for responsive design across different
 * screen sizes and device orientations, ensuring the game works well on all devices.
 */
class ResponsiveTester {
    constructor() {
        this.breakpoints = {
            xs: { min: 0, max: 480, name: 'Extra Small (Mobile)' },
            sm: { min: 481, max: 768, name: 'Small (Mobile/Tablet)' },
            md: { min: 769, max: 1024, name: 'Medium (Tablet)' },
            lg: { min: 1025, max: Infinity, name: 'Large (Desktop)' }
        };
        
        this.testResults = [];
        this.currentBreakpoint = this.getCurrentBreakpoint();
        
        this.init();
    }

    /**
     * Initialize responsive tester
     */
    init() {
        this.setupViewportMeta();
        this.detectDeviceCapabilities();
        
        console.log('ResponsiveTester initialized');
    }

    /**
     * Set up viewport meta tag for proper mobile rendering
     */
    setupViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        // Optimal viewport settings for responsive design
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
    }

    /**
     * Get current breakpoint
     */
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        
        for (const [key, breakpoint] of Object.entries(this.breakpoints)) {
            if (width >= breakpoint.min && width <= breakpoint.max) {
                return { key, ...breakpoint };
            }
        }
        
        return { key: 'lg', ...this.breakpoints.lg };
    }

    /**
     * Detect device capabilities
     */
    detectDeviceCapabilities() {
        this.deviceInfo = {
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            screenSize: {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio || 1,
            orientation: this.getOrientation(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isMobile: this.isMobileDevice(),
            isTablet: this.isTabletDevice(),
            isDesktop: this.isDesktopDevice()
        };
    }

    /**
     * Get current orientation
     */
    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.type;
        } else if (window.orientation !== undefined) {
            return Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait';
        } else {
            return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        }
    }

    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    /**
     * Check if device is tablet
     */
    isTabletDevice() {
        return /iPad|Android/i.test(navigator.userAgent) && 
               window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    /**
     * Check if device is desktop
     */
    isDesktopDevice() {
        return !this.isMobileDevice() && !this.isTabletDevice();
    }

    /**
     * Run comprehensive responsive tests
     */
    async runResponsiveTests() {
        console.log('Running responsive design tests...');
        
        this.testResults = [];
        
        // Test 1: Viewport configuration
        await this.testViewportConfiguration();
        
        // Test 2: Breakpoint behavior
        await this.testBreakpointBehavior();
        
        // Test 3: Touch target sizes
        await this.testTouchTargetSizes();
        
        // Test 4: Layout adaptation
        await this.testLayoutAdaptation();
        
        // Test 5: Text readability
        await this.testTextReadability();
        
        // Test 6: Image scaling
        await this.testImageScaling();
        
        // Test 7: Navigation usability
        await this.testNavigationUsability();
        
        // Test 8: Form accessibility
        await this.testFormAccessibility();
        
        // Test 9: Performance on mobile
        await this.testMobilePerformance();
        
        // Test 10: Orientation handling
        await this.testOrientationHandling();
        
        return this.generateTestReport();
    }

    /**
     * Test viewport configuration
     */
    async testViewportConfiguration() {
        const viewport = document.querySelector('meta[name="viewport"]');
        const hasViewport = !!viewport;
        const hasCorrectContent = viewport && viewport.content.includes('width=device-width');
        
        this.testResults.push({
            category: 'Viewport',
            name: 'Viewport Meta Tag',
            passed: hasViewport && hasCorrectContent,
            details: hasViewport 
                ? `Content: ${viewport.content}`
                : 'No viewport meta tag found',
            importance: 'critical'
        });
    }

    /**
     * Test breakpoint behavior
     */
    async testBreakpointBehavior() {
        const currentBreakpoint = this.getCurrentBreakpoint();
        
        // Test CSS breakpoint consistency
        const computedStyle = getComputedStyle(document.documentElement);
        const cssBreakpoint = computedStyle.getPropertyValue('--current-breakpoint').trim();
        
        this.testResults.push({
            category: 'Breakpoints',
            name: 'Breakpoint Detection',
            passed: cssBreakpoint === currentBreakpoint.key || cssBreakpoint === '',
            details: `Detected: ${currentBreakpoint.key} (${currentBreakpoint.name}), CSS: ${cssBreakpoint || 'not set'}`,
            importance: 'high'
        });
    }

    /**
     * Test touch target sizes
     */
    async testTouchTargetSizes() {
        const interactiveElements = document.querySelectorAll(
            'button, .btn, .letter-tile, .letter-slot, [role="button"], input, select, textarea'
        );
        
        let violations = 0;
        const minSize = 44; // WCAG 2.1 AA requirement
        
        interactiveElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < minSize || rect.height < minSize) {
                violations++;
            }
        });
        
        this.testResults.push({
            category: 'Touch Targets',
            name: 'Minimum Size Compliance',
            passed: violations === 0,
            details: violations === 0 
                ? `All ${interactiveElements.length} elements meet 44x44px minimum`
                : `${violations} of ${interactiveElements.length} elements below minimum size`,
            importance: 'critical'
        });
    }

    /**
     * Test layout adaptation
     */
    async testLayoutAdaptation() {
        const gameContainer = document.querySelector('.game-main, .app-container');
        const hasFlexLayout = gameContainer && getComputedStyle(gameContainer).display.includes('flex');
        
        // Test for horizontal scrolling
        const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
        
        // Test for responsive grid
        const gridElements = document.querySelectorAll('.sessions-grid, .progress-summary');
        let hasResponsiveGrid = true;
        
        gridElements.forEach(grid => {
            const style = getComputedStyle(grid);
            if (!style.gridTemplateColumns.includes('minmax') && !style.gridTemplateColumns.includes('auto-fit')) {
                hasResponsiveGrid = false;
            }
        });
        
        this.testResults.push({
            category: 'Layout',
            name: 'Flexible Layout',
            passed: hasFlexLayout,
            details: hasFlexLayout ? 'Uses flexible layout system' : 'Layout may not be flexible',
            importance: 'high'
        });
        
        this.testResults.push({
            category: 'Layout',
            name: 'No Horizontal Scroll',
            passed: !hasHorizontalScroll,
            details: hasHorizontalScroll ? 'Horizontal scrolling detected' : 'No horizontal scrolling',
            importance: 'high'
        });
        
        this.testResults.push({
            category: 'Layout',
            name: 'Responsive Grid',
            passed: hasResponsiveGrid,
            details: hasResponsiveGrid ? 'Grids use responsive patterns' : 'Some grids may not be responsive',
            importance: 'medium'
        });
    }

    /**
     * Test text readability
     */
    async testTextReadability() {
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
        let readabilityIssues = 0;
        const minFontSize = 16; // Minimum readable font size on mobile
        
        textElements.forEach(element => {
            const style = getComputedStyle(element);
            const fontSize = parseFloat(style.fontSize);
            
            if (fontSize < minFontSize && element.textContent.trim()) {
                readabilityIssues++;
            }
        });
        
        this.testResults.push({
            category: 'Typography',
            name: 'Font Size Readability',
            passed: readabilityIssues === 0,
            details: readabilityIssues === 0 
                ? 'All text meets minimum size requirements'
                : `${readabilityIssues} elements with small font sizes`,
            importance: 'medium'
        });
    }

    /**
     * Test image scaling
     */
    async testImageScaling() {
        const images = document.querySelectorAll('img');
        let scalingIssues = 0;
        
        images.forEach(img => {
            const style = getComputedStyle(img);
            const hasMaxWidth = style.maxWidth === '100%' || style.width === '100%';
            const hasObjectFit = style.objectFit !== 'initial';
            
            if (!hasMaxWidth && !hasObjectFit) {
                scalingIssues++;
            }
        });
        
        this.testResults.push({
            category: 'Images',
            name: 'Responsive Image Scaling',
            passed: scalingIssues === 0,
            details: scalingIssues === 0 
                ? 'All images scale responsively'
                : `${scalingIssues} images may not scale properly`,
            importance: 'medium'
        });
    }

    /**
     * Test navigation usability
     */
    async testNavigationUsability() {
        const navElements = document.querySelectorAll('nav, .header-controls, .controls-container');
        let usabilityScore = 0;
        
        navElements.forEach(nav => {
            const style = getComputedStyle(nav);
            
            // Check for flexible layout
            if (style.display.includes('flex')) usabilityScore++;
            
            // Check for wrap behavior
            if (style.flexWrap === 'wrap') usabilityScore++;
            
            // Check for appropriate gaps
            if (parseFloat(style.gap) > 0) usabilityScore++;
        });
        
        const maxScore = navElements.length * 3;
        const passed = maxScore === 0 || (usabilityScore / maxScore) >= 0.7;
        
        this.testResults.push({
            category: 'Navigation',
            name: 'Mobile Navigation Usability',
            passed: passed,
            details: `Usability score: ${usabilityScore}/${maxScore}`,
            importance: 'high'
        });
    }

    /**
     * Test form accessibility
     */
    async testFormAccessibility() {
        const formElements = document.querySelectorAll('input, select, textarea');
        let accessibilityIssues = 0;
        
        formElements.forEach(element => {
            const hasLabel = element.labels && element.labels.length > 0;
            const hasAriaLabel = element.getAttribute('aria-label');
            const hasPlaceholder = element.placeholder;
            
            if (!hasLabel && !hasAriaLabel && !hasPlaceholder) {
                accessibilityIssues++;
            }
        });
        
        this.testResults.push({
            category: 'Forms',
            name: 'Form Accessibility',
            passed: accessibilityIssues === 0,
            details: accessibilityIssues === 0 
                ? 'All form elements have proper labels'
                : `${accessibilityIssues} form elements missing labels`,
            importance: 'high'
        });
    }

    /**
     * Test mobile performance
     */
    async testMobilePerformance() {
        const startTime = performance.now();
        
        // Simulate some DOM operations
        const testDiv = document.createElement('div');
        testDiv.innerHTML = '<div>'.repeat(100) + '</div>'.repeat(100);
        document.body.appendChild(testDiv);
        
        // Force reflow
        testDiv.offsetHeight;
        
        document.body.removeChild(testDiv);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Check for performance issues
        const hasPerformanceIssues = renderTime > 50; // 50ms threshold
        
        this.testResults.push({
            category: 'Performance',
            name: 'DOM Manipulation Speed',
            passed: !hasPerformanceIssues,
            details: `Render time: ${renderTime.toFixed(2)}ms`,
            importance: 'medium'
        });
    }

    /**
     * Test orientation handling
     */
    async testOrientationHandling() {
        const currentOrientation = this.getOrientation();
        const hasOrientationCSS = document.querySelector('style, link[rel="stylesheet"]');
        
        // Check if layout adapts to orientation
        const gameMain = document.querySelector('.game-main');
        const hasFlexDirection = gameMain && getComputedStyle(gameMain).flexDirection;
        
        this.testResults.push({
            category: 'Orientation',
            name: 'Orientation Detection',
            passed: true,
            details: `Current orientation: ${currentOrientation}`,
            importance: 'medium'
        });
        
        this.testResults.push({
            category: 'Orientation',
            name: 'Layout Adaptation',
            passed: !!hasFlexDirection,
            details: hasFlexDirection 
                ? `Layout uses flex-direction: ${hasFlexDirection}`
                : 'Layout may not adapt to orientation changes',
            importance: 'medium'
        });
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const report = {
            timestamp: new Date().toISOString(),
            deviceInfo: this.deviceInfo,
            currentBreakpoint: this.currentBreakpoint,
            testResults: this.testResults,
            summary: this.generateSummary()
        };
        
        console.log('Responsive Design Test Report:', report);
        return report;
    }

    /**
     * Generate test summary
     */
    generateSummary() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(test => test.passed).length;
        const failed = total - passed;
        
        const criticalIssues = this.testResults.filter(
            test => !test.passed && test.importance === 'critical'
        ).length;
        
        const highIssues = this.testResults.filter(
            test => !test.passed && test.importance === 'high'
        ).length;
        
        return {
            total,
            passed,
            failed,
            passRate: ((passed / total) * 100).toFixed(1) + '%',
            criticalIssues,
            highIssues,
            overallStatus: criticalIssues === 0 && highIssues <= 1 ? 'PASS' : 'NEEDS_ATTENTION'
        };
    }

    /**
     * Simulate different screen sizes for testing
     */
    async simulateScreenSizes() {
        const testSizes = [
            { width: 320, height: 568, name: 'iPhone SE' },
            { width: 375, height: 667, name: 'iPhone 8' },
            { width: 414, height: 896, name: 'iPhone 11' },
            { width: 768, height: 1024, name: 'iPad' },
            { width: 1024, height: 768, name: 'iPad Landscape' },
            { width: 1920, height: 1080, name: 'Desktop' }
        ];
        
        const results = [];
        
        for (const size of testSizes) {
            // Note: We can't actually resize the window in a real browser
            // This would be used in a testing environment like Puppeteer
            console.log(`Testing ${size.name} (${size.width}x${size.height})`);
            
            // Simulate the test by checking if our CSS would work at this size
            const breakpoint = this.getBreakpointForWidth(size.width);
            
            results.push({
                size,
                breakpoint,
                wouldWork: this.validateLayoutForSize(size)
            });
        }
        
        return results;
    }

    /**
     * Get breakpoint for specific width
     */
    getBreakpointForWidth(width) {
        for (const [key, breakpoint] of Object.entries(this.breakpoints)) {
            if (width >= breakpoint.min && width <= breakpoint.max) {
                return { key, ...breakpoint };
            }
        }
        return { key: 'lg', ...this.breakpoints.lg };
    }

    /**
     * Validate layout for specific size
     */
    validateLayoutForSize(size) {
        // This is a simplified validation
        // In a real test, we'd check specific layout properties
        
        const issues = [];
        
        // Check if touch targets would be appropriate
        if (size.width <= 768) {
            const touchTargets = document.querySelectorAll('.letter-tile, .btn');
            touchTargets.forEach(target => {
                const rect = target.getBoundingClientRect();
                if (rect.width < 44 || rect.height < 44) {
                    issues.push('Touch targets too small');
                }
            });
        }
        
        // Check for potential overflow
        if (size.width < 480) {
            const wideElements = document.querySelectorAll('.progress-container, .controls-container');
            wideElements.forEach(element => {
                const style = getComputedStyle(element);
                if (style.flexWrap !== 'wrap' && style.display === 'flex') {
                    issues.push('Elements may overflow on small screens');
                }
            });
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Create visual test report
     */
    createVisualReport() {
        const reportContainer = document.createElement('div');
        reportContainer.id = 'responsive-test-report';
        reportContainer.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 80vh;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                overflow-y: auto;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                line-height: 1.4;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #333;">Responsive Test Report</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: #666;
                    ">×</button>
                </div>
                
                <div style="margin-bottom: 15px; padding: 10px; background: #f0f8ff; border-radius: 6px;">
                    <strong>Device:</strong> ${this.deviceInfo.isMobile ? 'Mobile' : this.deviceInfo.isTablet ? 'Tablet' : 'Desktop'}<br>
                    <strong>Screen:</strong> ${this.deviceInfo.viewport.width}×${this.deviceInfo.viewport.height}<br>
                    <strong>Breakpoint:</strong> ${this.currentBreakpoint.name}<br>
                    <strong>Touch:</strong> ${this.deviceInfo.touchSupport ? 'Supported' : 'Not supported'}
                </div>
                
                <div id="test-results-list"></div>
                
                <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 6px; text-align: center;">
                    <button onclick="window.ResponsiveTester.runResponsiveTests().then(report => console.log('Updated report:', report))" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 10px;
                    ">Re-run Tests</button>
                    <button onclick="console.log('Full report:', window.ResponsiveTester.generateTestReport())" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Export Report</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(reportContainer);
        this.updateVisualReport();
        
        return reportContainer;
    }

    /**
     * Update visual report with current test results
     */
    updateVisualReport() {
        const resultsList = document.getElementById('test-results-list');
        if (!resultsList) return;
        
        const summary = this.generateSummary();
        
        resultsList.innerHTML = `
            <div style="margin-bottom: 15px; padding: 10px; border-radius: 6px; background: ${summary.overallStatus === 'PASS' ? '#d4edda' : '#f8d7da'};">
                <strong>Overall Status:</strong> ${summary.overallStatus}<br>
                <strong>Pass Rate:</strong> ${summary.passRate} (${summary.passed}/${summary.total})<br>
                ${summary.criticalIssues > 0 ? `<strong style="color: #dc3545;">Critical Issues:</strong> ${summary.criticalIssues}<br>` : ''}
                ${summary.highIssues > 0 ? `<strong style="color: #fd7e14;">High Priority Issues:</strong> ${summary.highIssues}<br>` : ''}
            </div>
            
            ${this.testResults.map(test => `
                <div style="
                    margin-bottom: 8px;
                    padding: 8px;
                    border-left: 4px solid ${test.passed ? '#28a745' : test.importance === 'critical' ? '#dc3545' : test.importance === 'high' ? '#fd7e14' : '#ffc107'};
                    background: ${test.passed ? '#f8f9fa' : '#fff3cd'};
                    border-radius: 0 4px 4px 0;
                ">
                    <div style="font-weight: bold; color: ${test.passed ? '#155724' : '#856404'};">
                        ${test.passed ? '✓' : '⚠'} ${test.name}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">
                        ${test.details}
                    </div>
                </div>
            `).join('')}
        `;
    }
}

// Create global instance
window.ResponsiveTester = new ResponsiveTester();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveTester;
}