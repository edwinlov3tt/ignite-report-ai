// Admin Navigation Component
class AdminNavigation {
    constructor() {
        this.currentPath = window.location.pathname;
        this.isCollapsed = localStorage.getItem('admin-nav-collapsed') === 'true';
        this.init();
    }

    init() {
        this.createNavigation();
        this.bindEvents();
    }

    createNavigation() {
        // Create navigation element
        const navElement = document.createElement('div');
        navElement.className = `admin-nav ${this.isCollapsed ? 'collapsed' : ''}`;
        navElement.innerHTML = `
            <div class="nav-header">
                <div class="nav-brand">
                    <span class="brand-icon">⚙️</span>
                    <span class="brand-text">Schema Admin</span>
                </div>
                <button class="nav-toggle" id="nav-toggle">
                    <span class="toggle-icon">${this.isCollapsed ? '→' : '←'}</span>
                </button>
            </div>
            
            <nav class="nav-menu">
                <div class="nav-section">
                    <h3 class="nav-section-title">Configuration</h3>
                    <ul class="nav-links">
                        <li class="nav-item">
                            <a href="${window.pathConfig?.schemaAdmin() || '/schema-admin/'}" class="nav-link ${this.isCurrentPath('/schema-admin/', true) ? 'active' : ''}"
                                <span class="nav-icon">🏠</span>
                                <span class="nav-text">Schema Admin</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="${window.pathConfig?.schemaAdmin('sections-manager/') || '/schema-admin/sections-manager/'}" class="nav-link ${this.isCurrentPath('/schema-admin/sections-manager') ? 'active' : ''}">
                                <span class="nav-icon">📑</span>
                                <span class="nav-text">Report Sections</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="nav-section">
                    <h3 class="nav-section-title">Testing & Development</h3>
                    <ul class="nav-links">
                        <li class="nav-item">
                            <a href="${window.pathConfig?.schemaAdmin('ai-testing/') || '/schema-admin/ai-testing/'}" class="nav-link ${this.isCurrentPath('/schema-admin/ai-testing') ? 'active' : ''}">
                                <span class="nav-icon">🧪</span>
                                <span class="nav-text">AI Testing</span>
                            </a>
                        </li>
                    </ul>
                </div>

                <div class="nav-section">
                    <h3 class="nav-section-title">Data Management</h3>
                    <ul class="nav-links">
                        <li class="nav-item">
                            <a href="${window.pathConfig?.schemaAdmin('schema-export/') || '/schema-admin/schema-export/'}" class="nav-link ${this.isCurrentPath('/schema-admin/schema-export') ? 'active' : ''}">
                                <span class="nav-icon">💾</span>
                                <span class="nav-text">Schema Export</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="${window.pathConfig?.schemaAdmin('backup/') || '/schema-admin/backup/'}" class="nav-link ${this.isCurrentPath('/schema-admin/backup') ? 'active' : ''}">
                                <span class="nav-icon">📦</span>
                                <span class="nav-text">Backup & Restore</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            <div class="nav-footer">
                <div class="nav-user">
                    <span class="user-icon">👤</span>
                    <span class="user-text">Admin User</span>
                </div>
                <a href="${window.pathConfig?.app() || '/'}" class="nav-link back-to-app"
                    <span class="nav-icon">↩️</span>
                    <span class="nav-text">Back to App</span>
                </a>
            </div>
        `;

        // Insert navigation at the beginning of body
        document.body.insertBefore(navElement, document.body.firstChild);
        
        // Wrap existing content in main content div
        const adminContainer = document.querySelector('.admin-container');
        if (adminContainer && !adminContainer.classList.contains('admin-main-content')) {
            adminContainer.className = `admin-main-content ${this.isCollapsed ? 'nav-collapsed' : ''}`;
        }
    }

    bindEvents() {
        const toggleBtn = document.getElementById('nav-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleNavigation();
            });
        }

        // Handle escape key to collapse nav
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isCollapsed) {
                this.toggleNavigation();
            }
        });
    }

    toggleNavigation() {
        const nav = document.querySelector('.admin-nav');
        const mainContent = document.querySelector('.admin-main-content');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        this.isCollapsed = !this.isCollapsed;
        
        if (nav) {
            if (this.isCollapsed) {
                nav.classList.add('collapsed');
            } else {
                nav.classList.remove('collapsed');
            }
        }
        
        if (mainContent) {
            if (this.isCollapsed) {
                mainContent.classList.add('nav-collapsed');
            } else {
                mainContent.classList.remove('nav-collapsed');
            }
        }
        
        if (toggleIcon) {
            toggleIcon.textContent = this.isCollapsed ? '→' : '←';
        }
        
        localStorage.setItem('admin-nav-collapsed', this.isCollapsed.toString());
    }

    isCurrentPath(path, exact = false) {
        const normalizedCurrent = this.currentPath.replace(/\/$/, '');
        const normalizedPath = path.replace(/\/$/, '');
        
        if (exact) {
            // For Schema Admin home, only match exact path
            return normalizedCurrent === normalizedPath || normalizedCurrent === normalizedPath + '/';
        }
        
        return normalizedCurrent === normalizedPath || 
               normalizedCurrent === normalizedPath + '/' ||
               normalizedCurrent.startsWith(normalizedPath + '/');
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminNav = new AdminNavigation();
});