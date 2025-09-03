/**
 * Path Configuration System for Report.AI
 * Handles dynamic base paths for localhost vs production deployment
 */

class PathConfig {
    constructor() {
        this.init();
    }

    init() {
        // Detect environment based on hostname
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
        
        // Set base paths
        this.basePath = isLocalhost ? '' : '/report-ai';
        this.apiPath = `${this.basePath}/api`;
        this.schemaAdminPath = `${this.basePath}/schema-admin`;
        this.docsPath = `${this.basePath}/docs`;
        
        // Store environment info
        this.isLocalhost = isLocalhost;
        this.isProduction = !isLocalhost;
        
        // Log configuration for debugging
        console.log('PathConfig initialized:', {
            hostname,
            isLocalhost,
            basePath: this.basePath,
            apiPath: this.apiPath,
            schemaAdminPath: this.schemaAdminPath
        });
        
        // Make globally available
        window.PathConfig = this;
    }

    /**
     * Get API endpoint URL
     */
    api(endpoint) {
        // Remove leading slash if present to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.apiPath}/${cleanEndpoint}`;
    }

    /**
     * Get schema admin URL
     */
    schemaAdmin(path = '') {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return cleanPath ? `${this.schemaAdminPath}/${cleanPath}` : this.schemaAdminPath;
    }

    /**
     * Get docs URL
     */
    docs(path = '') {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return cleanPath ? `${this.docsPath}/${cleanPath}` : this.docsPath;
    }

    /**
     * Get base application URL
     */
    app(path = '') {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return cleanPath ? `${this.basePath}/${cleanPath}` : this.basePath || '/';
    }

    /**
     * Build full URL with current protocol and host
     */
    fullUrl(path) {
        const protocol = window.location.protocol;
        const host = window.location.host;
        return `${protocol}//${host}${path}`;
    }

    /**
     * Get current page path relative to base
     */
    getCurrentPath() {
        let path = window.location.pathname;
        if (this.basePath && path.startsWith(this.basePath)) {
            path = path.slice(this.basePath.length) || '/';
        }
        return path;
    }

    /**
     * Check if current path matches given path
     */
    isCurrentPath(path, exact = false) {
        const currentPath = this.getCurrentPath();
        if (exact) {
            return currentPath === path || currentPath === (path + '/');
        }
        return currentPath.startsWith(path);
    }

    /**
     * Update all links on page to use correct base paths
     */
    updatePageLinks() {
        // Update navigation links
        this.updateNavigationLinks();
        
        // Update API endpoints in forms
        this.updateFormActions();
        
        // Update any href attributes that need fixing
        this.updateHrefAttributes();
    }

    updateNavigationLinks() {
        const navLinks = document.querySelectorAll('a[href]');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // Skip external links and anchors
            if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) {
                return;
            }

            let newHref = href;
            
            // Handle different types of internal links
            if (href.startsWith('/api/')) {
                newHref = this.api(href.slice(5));
            } else if (href.startsWith('/schema-admin/') || href === '/schema-admin') {
                newHref = this.schemaAdmin(href.slice(14));
            } else if (href.startsWith('/docs/') || href === '/docs') {
                newHref = this.docs(href.slice(6));
            } else if (href.startsWith('/report-ai/')) {
                // Remove /report-ai/ prefix for localhost
                if (this.isLocalhost) {
                    newHref = href.slice(11) || '/';
                }
            } else if (href === '/' || href === '') {
                newHref = this.app();
            }
            
            // Update the link if it changed
            if (newHref !== href) {
                link.setAttribute('href', newHref);
            }
        });
    }

    updateFormActions() {
        const forms = document.querySelectorAll('form[action]');
        forms.forEach(form => {
            const action = form.getAttribute('action');
            if (action && action.startsWith('/api/')) {
                form.setAttribute('action', this.api(action.slice(5)));
            }
        });
    }

    updateHrefAttributes() {
        // Update any data attributes that contain paths
        const elements = document.querySelectorAll('[data-api-url], [data-schema-admin-url]');
        elements.forEach(element => {
            if (element.hasAttribute('data-api-url')) {
                const apiUrl = element.getAttribute('data-api-url');
                if (apiUrl.startsWith('/api/')) {
                    element.setAttribute('data-api-url', this.api(apiUrl.slice(5)));
                }
            }
            
            if (element.hasAttribute('data-schema-admin-url')) {
                const schemaUrl = element.getAttribute('data-schema-admin-url');
                if (schemaUrl.startsWith('/schema-admin/')) {
                    element.setAttribute('data-schema-admin-url', this.schemaAdmin(schemaUrl.slice(14)));
                }
            }
        });
    }
}

// Initialize immediately
const pathConfig = new PathConfig();

// Update links when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        pathConfig.updatePageLinks();
    });
} else {
    pathConfig.updatePageLinks();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathConfig;
}