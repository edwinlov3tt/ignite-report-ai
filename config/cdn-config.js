/**
 * CDN Configuration and Asset Optimization
 * Handles CDN integration, asset loading, and performance optimizations
 */

class CDNConfig {
    constructor() {
        this.cdnProviders = {
            jsDelivr: 'https://cdn.jsdelivr.net/npm',
            unpkg: 'https://unpkg.com',
            cdnjs: 'https://cdnjs.cloudflare.com/ajax/libs'
        };
        
        this.assetConfig = {
            critical: [], // Assets to load immediately
            deferred: [], // Assets to load after page load
            lazy: []      // Assets to load on demand
        };
        
        this.performanceConfig = {
            enablePreload: true,
            enablePrefetch: true,
            enableCompression: true,
            enableCaching: true,
            bundleOptimization: true
        };
        
        this.initializeAssetOptimization();
    }
    
    /**
     * Initialize asset optimization system
     */
    initializeAssetOptimization() {
        this.setupCriticalAssets();
        this.setupDeferredAssets();
        this.setupLazyAssets();
        this.enablePerformanceOptimizations();
    }
    
    /**
     * Setup critical assets that must load immediately
     */
    setupCriticalAssets() {
        this.assetConfig.critical = [
            {
                name: 'chart-js',
                type: 'script',
                url: `${this.cdnProviders.jsDelivr}/chart.js@4.4.0/dist/chart.min.js`,
                integrity: 'sha384-...',
                crossorigin: 'anonymous',
                preload: true
            },
            {
                name: 'lodash',
                type: 'script',
                url: `${this.cdnProviders.jsDelivr}/lodash@4.17.21/lodash.min.js`,
                integrity: 'sha384-...',
                crossorigin: 'anonymous',
                preload: true
            },
            {
                name: 'moment-js',
                type: 'script',
                url: `${this.cdnProviders.jsDelivr}/moment@2.29.4/min/moment.min.js`,
                integrity: 'sha384-...',
                crossorigin: 'anonymous',
                preload: false
            }
        ];
    }
    
    /**
     * Setup deferred assets for after page load
     */
    setupDeferredAssets() {
        this.assetConfig.deferred = [
            {
                name: 'file-saver',
                type: 'script',
                url: `${this.cdnProviders.jsDelivr}/file-saver@2.0.5/dist/FileSaver.min.js`,
                condition: () => document.querySelector('.download-button')
            },
            {
                name: 'highlight-js',
                type: 'script',
                url: `${this.cdnProviders.cdnjs}/highlight.js/11.9.0/highlight.min.js`,
                condition: () => document.querySelector('pre code')
            },
            {
                name: 'highlight-css',
                type: 'stylesheet',
                url: `${this.cdnProviders.cdnjs}/highlight.js/11.9.0/styles/github.min.css`,
                condition: () => document.querySelector('pre code')
            }
        ];
    }
    
    /**
     * Setup lazy-loaded assets
     */
    setupLazyAssets() {
        this.assetConfig.lazy = [
            {
                name: 'pdf-lib',
                type: 'script',
                url: `${this.cdnProviders.jsDelivr}/pdf-lib@1.17.1/dist/pdf-lib.min.js`,
                trigger: 'pdf-generation'
            },
            {
                name: 'xlsx',
                type: 'script',
                url: `${this.cdnProviders.jsDelivr}/xlsx@0.18.5/dist/xlsx.full.min.js`,
                trigger: 'excel-export'
            }
        ];
    }
    
    /**
     * Load critical assets with preloading
     */
    loadCriticalAssets() {
        const fragment = document.createDocumentFragment();
        
        this.assetConfig.critical.forEach(asset => {
            // Create preload link if enabled
            if (asset.preload && this.performanceConfig.enablePreload) {
                const preloadLink = this.createPreloadLink(asset);
                fragment.appendChild(preloadLink);
            }
            
            // Create actual script/style element
            const element = this.createElement(asset);
            fragment.appendChild(element);
        });
        
        document.head.appendChild(fragment);
    }
    
    /**
     * Load deferred assets after page load
     */
    loadDeferredAssets() {
        window.addEventListener('load', () => {
            // Small delay to ensure critical rendering is complete
            setTimeout(() => {
                this.assetConfig.deferred.forEach(asset => {
                    if (!asset.condition || asset.condition()) {
                        this.loadAsset(asset);
                    }
                });
            }, 100);
        });
    }
    
    /**
     * Setup lazy asset loading
     */
    setupLazyAssetLoading() {
        // Create event listeners for lazy loading triggers
        this.assetConfig.lazy.forEach(asset => {
            document.addEventListener(asset.trigger, () => {
                this.loadAsset(asset);
            });
        });
        
        // Setup intersection observer for scroll-based lazy loading
        this.setupIntersectionObserver();
    }
    
    /**
     * Create preload link element
     */
    createPreloadLink(asset) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = asset.type === 'script' ? 'script' : 'style';
        link.href = asset.url;
        
        if (asset.crossorigin) {
            link.crossOrigin = asset.crossorigin;
        }
        
        return link;
    }
    
    /**
     * Create script or stylesheet element
     */
    createElement(asset) {
        if (asset.type === 'script') {
            const script = document.createElement('script');
            script.src = asset.url;
            script.async = true;
            
            if (asset.integrity) {
                script.integrity = asset.integrity;
            }
            
            if (asset.crossorigin) {
                script.crossOrigin = asset.crossorigin;
            }
            
            // Add error handling
            script.onerror = () => {
                console.error(`Failed to load script: ${asset.name}`);
                this.handleAssetLoadError(asset);
            };
            
            script.onload = () => {
                console.log(`Successfully loaded: ${asset.name}`);
                this.handleAssetLoadSuccess(asset);
            };
            
            return script;
            
        } else if (asset.type === 'stylesheet') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = asset.url;
            
            if (asset.crossorigin) {
                link.crossOrigin = asset.crossorigin;
            }
            
            link.onerror = () => {
                console.error(`Failed to load stylesheet: ${asset.name}`);
                this.handleAssetLoadError(asset);
            };
            
            link.onload = () => {
                console.log(`Successfully loaded: ${asset.name}`);
                this.handleAssetLoadSuccess(asset);
            };
            
            return link;
        }
    }
    
    /**
     * Load individual asset
     */
    loadAsset(asset) {
        // Check if already loaded
        if (this.isAssetLoaded(asset)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const element = this.createElement(asset);
            
            const originalOnLoad = element.onload;
            const originalOnError = element.onerror;
            
            element.onload = () => {
                if (originalOnLoad) originalOnLoad();
                resolve();
            };
            
            element.onerror = () => {
                if (originalOnError) originalOnError();
                reject(new Error(`Failed to load ${asset.name}`));
            };
            
            document.head.appendChild(element);
        });
    }
    
    /**
     * Check if asset is already loaded
     */
    isAssetLoaded(asset) {
        if (asset.type === 'script') {
            return Array.from(document.scripts).some(script => 
                script.src === asset.url
            );
        } else if (asset.type === 'stylesheet') {
            return Array.from(document.styleSheets).some(sheet => 
                sheet.href === asset.url
            );
        }
        return false;
    }
    
    /**
     * Handle asset load errors with fallbacks
     */
    handleAssetLoadError(asset) {
        console.warn(`Asset load failed: ${asset.name}, attempting fallback...`);
        
        // Try alternative CDN
        const fallbackAsset = { ...asset };
        
        if (asset.url.includes('jsdelivr')) {
            fallbackAsset.url = asset.url.replace(this.cdnProviders.jsDelivr, this.cdnProviders.unpkg);
        } else if (asset.url.includes('unpkg')) {
            fallbackAsset.url = asset.url.replace(this.cdnProviders.unpkg, this.cdnProviders.cdnjs);
        }
        
        // Attempt fallback load
        if (fallbackAsset.url !== asset.url) {
            this.loadAsset(fallbackAsset);
        }
    }
    
    /**
     * Handle successful asset loads
     */
    handleAssetLoadSuccess(asset) {
        // Track successful loads for analytics
        if (window.reportAI && window.reportAI.analytics) {
            window.reportAI.analytics.trackEvent('asset_loaded', {
                asset_name: asset.name,
                load_time: performance.now()
            });
        }
    }
    
    /**
     * Setup intersection observer for lazy loading
     */
    setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) {
            return; // Fallback for older browsers
        }
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const trigger = entry.target.dataset.lazyTrigger;
                    if (trigger) {
                        document.dispatchEvent(new CustomEvent(trigger));
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        // Observe elements with lazy loading triggers
        document.querySelectorAll('[data-lazy-trigger]').forEach(element => {
            observer.observe(element);
        });
    }
    
    /**
     * Enable performance optimizations
     */
    enablePerformanceOptimizations() {
        this.enableResourceHints();
        this.enableCompressionHeaders();
        this.setupServiceWorker();
        this.optimizeImages();
    }
    
    /**
     * Add resource hints for better performance
     */
    enableResourceHints() {
        if (!this.performanceConfig.enablePrefetch) return;
        
        const resourceHints = [
            {
                rel: 'dns-prefetch',
                href: '//cdn.jsdelivr.net'
            },
            {
                rel: 'dns-prefetch', 
                href: '//unpkg.com'
            },
            {
                rel: 'dns-prefetch',
                href: '//cdnjs.cloudflare.com'
            },
            {
                rel: 'preconnect',
                href: 'https://api.anthropic.com',
                crossorigin: true
            }
        ];
        
        const fragment = document.createDocumentFragment();
        
        resourceHints.forEach(hint => {
            const link = document.createElement('link');
            link.rel = hint.rel;
            link.href = hint.href;
            
            if (hint.crossorigin) {
                link.crossOrigin = hint.crossorigin;
            }
            
            fragment.appendChild(link);
        });
        
        document.head.appendChild(fragment);
    }
    
    /**
     * Enable compression headers
     */
    enableCompressionHeaders() {
        // This would typically be handled server-side,
        // but we can add client-side hints
        
        if ('serviceWorker' in navigator) {
            // Service worker can handle compression
            this.registerCompressionServiceWorker();
        }
    }
    
    /**
     * Setup service worker for advanced caching
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator && this.performanceConfig.enableCaching) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
    
    /**
     * Optimize images with lazy loading and WebP support
     */
    optimizeImages() {
        // Setup lazy loading for images
        if ('loading' in HTMLImageElement.prototype) {
            // Native lazy loading support
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.loading = 'lazy';
                img.src = img.dataset.src;
            });
        } else {
            // Fallback intersection observer
            this.setupImageLazyLoading();
        }
        
        // WebP support detection and conversion
        this.setupWebPSupport();
    }
    
    /**
     * Setup image lazy loading fallback
     */
    setupImageLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    /**
     * Setup WebP support with fallbacks
     */
    setupWebPSupport() {
        const supportsWebP = (callback) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                callback(webP.height === 2);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        };
        
        supportsWebP((hasWebPSupport) => {
            if (hasWebPSupport) {
                document.documentElement.classList.add('webp');
                
                // Replace image sources with WebP versions if available
                document.querySelectorAll('img[data-webp]').forEach(img => {
                    img.src = img.dataset.webp;
                });
            } else {
                document.documentElement.classList.add('no-webp');
            }
        });
    }
    
    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics() {
        if (!('performance' in window)) {
            return null;
        }
        
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        
        return {
            page_load_time: navigation.loadEventEnd - navigation.navigationStart,
            dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            first_paint: this.getFirstPaint(),
            first_contentful_paint: this.getFirstContentfulPaint(),
            largest_contentful_paint: this.getLargestContentfulPaint(),
            cumulative_layout_shift: this.getCumulativeLayoutShift(),
            resource_count: resources.length,
            total_transfer_size: resources.reduce((total, resource) => total + (resource.transferSize || 0), 0)
        };
    }
    
    /**
     * Get First Paint timing
     */
    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }
    
    /**
     * Get First Contentful Paint timing
     */
    getFirstContentfulPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : null;
    }
    
    /**
     * Get Largest Contentful Paint timing
     */
    getLargestContentfulPaint() {
        return new Promise(resolve => {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver(entryList => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    resolve(lastEntry.startTime);
                });
                
                observer.observe({ type: 'largest-contentful-paint', buffered: true });
                
                // Timeout after 10 seconds
                setTimeout(() => resolve(null), 10000);
            } else {
                resolve(null);
            }
        });
    }
    
    /**
     * Get Cumulative Layout Shift
     */
    getCumulativeLayoutShift() {
        return new Promise(resolve => {
            if ('PerformanceObserver' in window) {
                let clsValue = 0;
                
                const observer = new PerformanceObserver(entryList => {
                    for (const entry of entryList.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    resolve(clsValue);
                });
                
                observer.observe({ type: 'layout-shift', buffered: true });
                
                // Timeout after 10 seconds
                setTimeout(() => resolve(clsValue), 10000);
            } else {
                resolve(null);
            }
        });
    }
    
    /**
     * Initialize CDN system
     */
    init() {
        console.log('🚀 Initializing CDN and Asset Optimization System...');
        
        // Load critical assets immediately
        this.loadCriticalAssets();
        
        // Setup deferred loading
        this.loadDeferredAssets();
        
        // Setup lazy loading
        this.setupLazyAssetLoading();
        
        // Track performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const metrics = this.getPerformanceMetrics();
                console.log('📊 Performance Metrics:', metrics);
                
                // Send metrics to monitoring system
                if (window.reportAI && window.reportAI.monitor) {
                    window.reportAI.monitor.recordMetric('page_performance', metrics);
                }
            }, 1000);
        });
        
        console.log('✅ CDN and Asset Optimization System initialized');
    }
}

// Initialize CDN system
window.addEventListener('DOMContentLoaded', () => {
    window.cdnConfig = new CDNConfig();
    window.cdnConfig.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CDNConfig;
}