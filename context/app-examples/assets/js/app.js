/**
 * Report.AI - Main Application
 * Simple HTML/CSS/JS/PHP implementation
 */

class CampaignAnalyzer {
    constructor() {
        this.currentStep = 1;
        this.campaignData = null;
        this.detectedTactics = [];
        this.uploadedFiles = {};
        this.companyInfo = {};
        this.analysisResults = null;
        
        this.init();
    }

    init() {
        this.initTheme();
        this.initEventListeners();
        this.updateStepVisibility();
        
        // Initialize charts (empty state)
        this.initCharts();
        
        console.log('Report.AI initialized');
    }

    initTheme() {
        // Check for saved theme or default to light
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
        
        // Update theme toggle icon
        const sunIcon = document.querySelector('[data-lucide="sun"]');
        const moonIcon = document.querySelector('[data-lucide="moon"]');
        
        if (theme === 'dark') {
            sunIcon?.classList.add('hidden');
            moonIcon?.classList.remove('hidden');
        } else {
            sunIcon?.classList.remove('hidden');
            moonIcon?.classList.add('hidden');
        }
    }

    initEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });

        // Reset button
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            this.resetAnalysis();
        });

        // Step 1: Campaign Data
        document.getElementById('fetchCampaignBtn')?.addEventListener('click', () => {
            this.fetchCampaignData();
        });

        // Step 2: Tactics and Upload
        document.getElementById('detectTacticsBtn')?.addEventListener('click', () => {
            this.detectTactics();
        });

        document.getElementById('bulkUploadBtn')?.addEventListener('click', () => {
            document.getElementById('bulkUploadInput').click();
        });

        document.getElementById('bulkUploadInput')?.addEventListener('change', (e) => {
            this.handleBulkUpload(e.target.files);
        });

        // Add folder upload button listener
        document.getElementById('bulkFolderBtn')?.addEventListener('click', () => {
            document.getElementById('bulkFolderInput').click();
        });

        document.getElementById('bulkFolderInput')?.addEventListener('change', (e) => {
            this.handleBulkUpload(e.target.files);
        });

        // Step 3: Company info auto-save
        ['companyName', 'industry', 'objectives', 'notes'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.saveCompanyInfo());
            }
        });

        // Step 4: Analysis
        document.getElementById('runAnalysisBtn')?.addEventListener('click', () => {
            this.runAnalysis();
        });

        document.getElementById('copyResultsBtn')?.addEventListener('click', () => {
            this.copyResults();
        });

        document.getElementById('exportBtn')?.addEventListener('click', () => {
            this.exportResults();
        });
    }

    updateStepVisibility() {
        for (let i = 1; i <= 4; i++) {
            const stepElement = document.getElementById(`step${i}`);
            const progressStep = document.querySelector(`[data-step="${i}"]`);
            
            if (stepElement && progressStep) {
                if (i <= this.currentStep) {
                    stepElement.classList.remove('hidden');
                    stepElement.classList.add('animate-fade-in');
                } else {
                    stepElement.classList.add('hidden');
                }

                // Update progress indicator
                const circle = progressStep.querySelector('.w-8');
                const text = progressStep.querySelector('span:not(.w-8)');
                
                if (i < this.currentStep) {
                    circle.className = 'w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium';
                    text.className = 'text-sm text-gray-900 dark:text-white';
                } else if (i === this.currentStep) {
                    circle.className = 'w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center text-sm font-medium';
                    text.className = 'text-sm font-medium text-gray-900 dark:text-white';
                } else {
                    circle.className = 'w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-medium';
                    text.className = 'text-sm text-gray-500 dark:text-gray-400';
                }
            }
        }
    }

    async fetchCampaignData() {
        const luminaUrl = document.getElementById('luminaUrl').value.trim();
        
        if (!luminaUrl) {
            this.showMessage('Please enter a Lumina URL', 'error');
            return;
        }

        // Validate URL format
        const urlPattern = /^https:\/\/townsquarelumina\.com\/lumina\/view\/order\/([a-fA-F0-9]{24})$/;
        const match = luminaUrl.match(urlPattern);
        
        if (!match) {
            this.showMessage('Invalid Lumina URL format', 'error');
            return;
        }

        const orderId = match[1];
        this.updateStatus('campaignStatus', 'Fetching...', 'info');

        try {
            const response = await fetch('api/lumina.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderId })
            });

            const result = await response.json();

            if (result.success) {
                this.campaignData = result.data;
                this.displayCampaignMeta(this.campaignData);
                this.updateStatus('campaignStatus', 'Success', 'success');
                this.showMessage('Campaign data fetched successfully!', 'success');
                
                // Auto-advance to next step
                setTimeout(() => {
                    this.currentStep = 2;
                    this.updateStepVisibility();
                }, 1000);
            } else {
                throw new Error(result.message || 'Failed to fetch campaign data');
            }
        } catch (error) {
            console.error('Error fetching campaign data:', error);
            this.updateStatus('campaignStatus', 'Error', 'error');
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    displayCampaignMeta(data) {
        document.getElementById('metaName').textContent = data.name || '—';
        document.getElementById('metaStart').textContent = data.startDate ? 
            new Date(data.startDate).toLocaleDateString() : '—';
        document.getElementById('metaEnd').textContent = data.endDate ? 
            new Date(data.endDate).toLocaleDateString() : '—';
        document.getElementById('metaStatus').textContent = data.status || '—';
        
        document.getElementById('campaignMeta').classList.remove('hidden');
        document.getElementById('campaignMeta').classList.add('animate-slide-up');
    }

    async detectTactics() {
        if (!this.campaignData) {
            this.showMessage('Please fetch campaign data first', 'error');
            return;
        }

        try {
            const response = await fetch('api/tactics.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ campaignData: this.campaignData })
            });

            const result = await response.json();

            if (result.success) {
                this.detectedTactics = result.tactics;
                this.renderTacticCards();
                this.showMessage(`Detected ${this.detectedTactics.length} tactics`, 'success');
            } else {
                throw new Error(result.message || 'Failed to detect tactics');
            }
        } catch (error) {
            console.error('Error detecting tactics:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    renderTacticCards() {
        const container = document.getElementById('tacticsGrid');
        container.innerHTML = '';

        this.detectedTactics.forEach(tactic => {
            const card = this.createTacticCard(tactic);
            container.appendChild(card);
        });
    }

    createTacticCard(tactic) {
        const card = document.createElement('div');
        card.className = 'tactic-card';
        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-gray-900 dark:text-white">${tactic.displayName}</h4>
                <div class="upload-status pending" id="status-${tactic.id}">
                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                    <span>Pending</span>
                </div>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Suggested tables: ${tactic.tables.join(', ')}
                <div class="text-xs text-gray-500 mt-1">(Upload any available files)</div>
            </div>
            <div class="flex space-x-2 mb-3">
                <input type="file" id="upload-${tactic.id}" class="hidden" multiple accept=".csv" webkitdirectory directory>
                <button onclick="document.getElementById('upload-${tactic.id}').click()" 
                        class="btn btn-sm flex-1" id="upload-btn-${tactic.id}">
                    <i data-lucide="upload" class="w-4 h-4 mr-1"></i>
                    Upload Files/Folder
                </button>
                <button onclick="app.downloadSample('${tactic.id}')" 
                        class="btn btn-outline btn-sm">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </button>
            </div>
            <div id="uploaded-files-${tactic.id}" class="space-y-2">
            </div>
        `;

        // Add upload listener
        card.querySelector(`#upload-${tactic.id}`).addEventListener('change', (e) => {
            this.handleTacticUpload(tactic.id, e.target.files);
        });

        return card;
    }

    async handleTacticUpload(tacticId, files) {
        if (!files.length) return;

        const statusElement = document.getElementById(`status-${tacticId}`);
        this.updateUploadStatus(statusElement, 'Processing...', 'info');

        try {
            // Sort files by table name for better organization
            const sortedFiles = await this.sortFilesByTable(tacticId, files);
            
            for (const file of sortedFiles) {
                if (!file.name.endsWith('.csv')) {
                    console.warn(`Skipping non-CSV file: ${file.name}`);
                    continue;
                }

                const csvText = await this.readFileAsText(file);
                const parsedData = Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true
                });

                if (parsedData.errors.length > 0) {
                    console.warn(`CSV parsing warning for ${file.name}: ${parsedData.errors[0].message}`);
                }

                // Store the uploaded data
                if (!this.uploadedFiles[tacticId]) {
                    this.uploadedFiles[tacticId] = [];
                }
                
                this.uploadedFiles[tacticId].push({
                    filename: file.name,
                    tableName: this.extractTableName(file.name),
                    data: parsedData.data,
                    headers: parsedData.meta.fields
                });
            }

            // Sort uploaded files by table priority
            this.uploadedFiles[tacticId] = this.sortUploadedFilesByPriority(tacticId, this.uploadedFiles[tacticId]);

            this.updateUploadStatus(statusElement, 'Uploaded', 'success');
            this.updateTacticCardAppearance(tacticId, true);
            this.renderUploadedFiles(tacticId);
            
            // Auto-advance if any tactic has uploads (removed requirement for all tactics)
            if (Object.keys(this.uploadedFiles).length > 0) {
                this.currentStep = 3;
                this.updateStepVisibility();
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.updateUploadStatus(statusElement, 'Error', 'error');
            this.showMessage(`Upload error: ${error.message}`, 'error');
        }
    }

    async handleBulkUpload(files) {
        if (!files.length) return;

        // Support both files and folder structures
        const allFiles = await this.extractAllFiles(files);
        const csvFiles = allFiles.filter(file => file.name.endsWith('.csv'));
        
        if (csvFiles.length === 0) {
            this.showMessage('No CSV files found', 'error');
            return;
        }

        this.showMessage(`Processing ${csvFiles.length} CSV files...`, 'info');

        // Group files by tactic
        const filesByTactic = {};
        
        for (const file of csvFiles) {
            const matchedTactic = this.matchFileToTactic(file.name);
            
            if (matchedTactic) {
                if (!filesByTactic[matchedTactic.id]) {
                    filesByTactic[matchedTactic.id] = [];
                }
                filesByTactic[matchedTactic.id].push(file);
            } else {
                console.warn(`Could not match file to tactic: ${file.name}`);
            }
        }

        // Process all files for each tactic
        try {
            for (const [tacticId, tacticFiles] of Object.entries(filesByTactic)) {
                await this.handleTacticUpload(tacticId, tacticFiles);
            }

            this.showMessage(`Bulk upload completed for ${csvFiles.length} files`, 'success');
        } catch (error) {
            console.error('Bulk upload error:', error);
            this.showMessage(`Bulk upload error: ${error.message}`, 'error');
        }
    }

    matchFileToTactic(filename) {
        // Simple filename matching logic
        const name = filename.toLowerCase();
        
        return this.detectedTactics.find(tactic => {
            const tacticName = tactic.name.toLowerCase();
            return name.includes(tacticName) || 
                   name.includes(tacticName.replace(/([A-Z])/g, '-$1').toLowerCase());
        });
    }

    saveCompanyInfo() {
        this.companyInfo = {
            name: document.getElementById('companyName').value,
            industry: document.getElementById('industry').value,
            objectives: document.getElementById('objectives').value,
            notes: document.getElementById('notes').value
        };

        // Auto-advance if all required fields are filled
        if (this.companyInfo.name && this.companyInfo.industry && this.companyInfo.objectives) {
            this.currentStep = 4;
            this.updateStepVisibility();
        }
    }

    async runAnalysis() {
        if (!this.campaignData || !Object.keys(this.uploadedFiles).length) {
            this.showMessage('Please complete campaign data and file uploads first', 'error');
            return;
        }

        // Show loading state
        document.getElementById('analysisLoading').classList.remove('hidden');
        document.getElementById('analysisResults').classList.add('hidden');

        try {
            const response = await fetch('api/analyze.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    campaignData: this.campaignData,
                    uploadedFiles: this.uploadedFiles,
                    companyInfo: this.companyInfo,
                    tactics: this.detectedTactics
                })
            });

            const result = await response.json();

            if (result.success) {
                this.analysisResults = result.analysis;
                this.displayAnalysisResults();
                this.showMessage('Analysis completed successfully!', 'success');
            } else {
                throw new Error(result.message || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showMessage(`Analysis error: ${error.message}`, 'error');
        } finally {
            document.getElementById('analysisLoading').classList.add('hidden');
        }
    }

    displayAnalysisResults() {
        if (!this.analysisResults) return;

        // Show results container
        document.getElementById('analysisResults').classList.remove('hidden');
        document.getElementById('copyResultsBtn').classList.remove('hidden');
        document.getElementById('exportBtn').classList.remove('hidden');

        // Display executive summary (tied to objectives)
        document.getElementById('executiveSummary').innerHTML = 
            this.formatText(this.analysisResults.executiveSummary);

        // Display tactic-specific performance if available
        if (this.analysisResults.tacticPerformance) {
            const perfSection = document.getElementById('tacticPerformance');
            if (perfSection) {
                perfSection.innerHTML = this.formatTacticContent(this.analysisResults.tacticPerformance);
                perfSection.classList.remove('hidden');
            }
        }

        // Display tactic-specific trends if available
        if (this.analysisResults.tacticTrends) {
            const trendsSection = document.getElementById('tacticTrends');
            if (trendsSection) {
                trendsSection.innerHTML = this.formatTacticContent(this.analysisResults.tacticTrends);
                trendsSection.classList.remove('hidden');
            }
        }

        // Display metrics BY TACTIC if available
        if (this.analysisResults.metricsByTactic) {
            this.renderMetricsByTactic(this.analysisResults.metricsByTactic);
        } else {
            // Fallback to overall metrics
            this.renderMetrics(this.analysisResults.metrics);
        }

        // Update charts BY TACTIC if available
        if (this.analysisResults.chartsByTactic) {
            this.updateChartsByTactic(this.analysisResults.chartsByTactic);
        } else {
            // Fallback to overall charts
            this.updateCharts(this.analysisResults.chartData);
        }

        // Display tactic-specific recommendations if available
        if (this.analysisResults.tacticRecommendations) {
            document.getElementById('recommendations').innerHTML = 
                this.formatTacticContent(this.analysisResults.tacticRecommendations);
        } else {
            // Fallback to general recommendations
            document.getElementById('recommendations').innerHTML = 
                this.formatText(this.analysisResults.recommendations);
        }
    }

    renderMetrics(metrics) {
        const container = document.getElementById('metricsGrid');
        container.innerHTML = '';

        metrics.forEach(metric => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `
                <div class="metric-value">${metric.value}</div>
                <div class="metric-label">${metric.label}</div>
                ${metric.change ? `<div class="metric-change ${metric.change > 0 ? 'positive' : metric.change < 0 ? 'negative' : 'neutral'}">
                    ${metric.change > 0 ? '+' : ''}${metric.change}%
                </div>` : ''}
            `;
            container.appendChild(card);
        });
    }

    initCharts() {
        // Initialize empty charts
        const performanceCtx = document.getElementById('performanceChart');
        const trendsCtx = document.getElementById('trendsChart');

        if (performanceCtx) {
            this.performanceChart = new Chart(performanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Loading...'],
                    datasets: [{
                        label: 'Performance',
                        data: [0],
                        backgroundColor: '#cf0e0f'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Channel Performance'
                        }
                    }
                }
            });
        }

        if (trendsCtx) {
            this.trendsChart = new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: ['Loading...'],
                    datasets: [{
                        label: 'Trends',
                        data: [0],
                        borderColor: '#cf0e0f',
                        backgroundColor: 'rgba(207, 14, 15, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Performance Trends'
                        }
                    }
                }
            });
        }
    }

    updateCharts(chartData) {
        if (this.performanceChart && chartData.performance) {
            this.performanceChart.data = chartData.performance;
            this.performanceChart.update();
        }

        if (this.trendsChart && chartData.trends) {
            this.trendsChart.data = chartData.trends;
            this.trendsChart.update();
        }
    }

    // Utility methods
    updateStatus(elementId, text, type = 'default') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.className = `badge badge-${type}`;
        }
    }

    updateUploadStatus(element, text, type = 'default') {
        const icon = element.querySelector('i');
        const span = element.querySelector('span');
        
        if (span) span.textContent = text;
        element.className = `upload-status ${type}`;
        
        // Update icon based on status
        if (icon) {
            icon.setAttribute('data-lucide', 
                type === 'success' ? 'check-circle' : 
                type === 'error' ? 'x-circle' : 
                type === 'info' ? 'loader' : 'upload-cloud'
            );
            lucide.createIcons();
        }
    }

    updateTacticCardAppearance(tacticId, uploaded) {
        const card = document.querySelector(`#status-${tacticId}`).closest('.tactic-card');
        if (uploaded) {
            card.classList.add('uploaded');
        } else {
            card.classList.remove('uploaded');
        }
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        } text-white max-w-sm`;
        
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-lucide="${
                    type === 'success' ? 'check-circle' :
                    type === 'error' ? 'x-circle' :
                    type === 'warning' ? 'alert-triangle' :
                    'info'
                }" class="w-5 h-5"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        lucide.createIcons();
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    formatText(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    formatTacticContent(text) {
        if (!text) return '';
        // Format markdown-style headers and content
        return text
            .replace(/### (.*?)\n/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">$1</h3>')
            .replace(/\n- /g, '<br>• ')
            .replace(/\n(\d+)\. /g, '<br>$1. ')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    renderMetricsByTactic(metricsByTactic) {
        const container = document.getElementById('metricsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Create section for each tactic's metrics
        Object.entries(metricsByTactic).forEach(([tacticId, metrics]) => {
            const tacticSection = document.createElement('div');
            tacticSection.className = 'col-span-full';
            tacticSection.innerHTML = `
                <h4 class="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">${tacticId} Metrics</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    ${metrics.map(metric => `
                        <div class="metric-card">
                            <div class="metric-value">${metric.value}</div>
                            <div class="metric-label">${metric.label}</div>
                            ${metric.change ? `<div class="metric-change ${metric.change > 0 ? 'positive' : metric.change < 0 ? 'negative' : 'neutral'}">
                                ${metric.change > 0 ? '+' : ''}${metric.change}%
                            </div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(tacticSection);
        });
    }

    updateChartsByTactic(chartsByTactic) {
        // Create or update charts for each tactic
        Object.entries(chartsByTactic).forEach(([tacticId, chartData]) => {
            // You can create separate chart containers for each tactic
            // For now, we'll update the main charts with the first tactic's data
            if (this.performanceChart && chartData.performance) {
                this.performanceChart.data = chartData.performance;
                this.performanceChart.options.plugins.title.text = `${tacticId} Performance`;
                this.performanceChart.update();
            }
        });
    }

    // New helper methods for improved file handling
    async extractAllFiles(fileList) {
        const files = [];
        for (const item of fileList) {
            if (item.webkitRelativePath || item.relativePath) {
                // It's from a folder selection
                files.push(item);
            } else {
                // Regular file
                files.push(item);
            }
        }
        return files;
    }

    extractTableName(filename) {
        // Extract table name from filename pattern: report-{product}-{table}-{anything}.csv
        const parts = filename.toLowerCase().split('-');
        if (parts.length >= 3) {
            // Return the table part (3rd segment and possibly more)
            return parts.slice(2).join('-').replace('.csv', '').replace(/_/g, ' ');
        }
        return filename.replace('.csv', '');
    }

    async sortFilesByTable(tacticId, files) {
        const tactic = this.detectedTactics.find(t => t.id === tacticId);
        if (!tactic) return Array.from(files);

        const tablePriority = {
            'monthly performance': 1,
            'campaign performance': 2,
            'ad set performance': 3,
            'ad performance': 4,
            'search terms': 5,
            'demographics': 6
        };

        return Array.from(files).sort((a, b) => {
            const tableA = this.extractTableName(a.name).toLowerCase();
            const tableB = this.extractTableName(b.name).toLowerCase();
            const priorityA = tablePriority[tableA] || 999;
            const priorityB = tablePriority[tableB] || 999;
            return priorityA - priorityB;
        });
    }

    sortUploadedFilesByPriority(tacticId, uploadedFiles) {
        const tablePriority = {
            'monthly performance': 1,
            'campaign performance': 2,
            'ad set performance': 3,
            'ad performance': 4,
            'search terms': 5,
            'demographics': 6
        };

        return uploadedFiles.sort((a, b) => {
            const priorityA = tablePriority[a.tableName?.toLowerCase()] || 999;
            const priorityB = tablePriority[b.tableName?.toLowerCase()] || 999;
            return priorityA - priorityB;
        });
    }

    renderUploadedFiles(tacticId) {
        const container = document.getElementById(`uploaded-files-${tacticId}`);
        if (!container || !this.uploadedFiles[tacticId]) return;

        container.innerHTML = '';
        this.uploadedFiles[tacticId].forEach((file, index) => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded';
            fileDiv.innerHTML = `
                <div class="flex items-center space-x-2 flex-1">
                    <i data-lucide="file-text" class="w-4 h-4 text-gray-500"></i>
                    <span class="text-sm text-gray-700 dark:text-gray-300 truncate">${file.filename}</span>
                    <span class="text-xs text-gray-500">(${file.data.length} rows)</span>
                </div>
                <button onclick="app.removeFile('${tacticId}', ${index})" 
                        class="btn btn-sm btn-outline text-red-500 hover:bg-red-50">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    Remove
                </button>
            `;
            container.appendChild(fileDiv);
        });
        lucide.createIcons();
    }

    removeFile(tacticId, fileIndex) {
        if (this.uploadedFiles[tacticId]) {
            this.uploadedFiles[tacticId].splice(fileIndex, 1);
            if (this.uploadedFiles[tacticId].length === 0) {
                delete this.uploadedFiles[tacticId];
                this.updateUploadStatus(document.getElementById(`status-${tacticId}`), 'Pending', 'pending');
                this.updateTacticCardAppearance(tacticId, false);
            }
            this.renderUploadedFiles(tacticId);
        }
    }

    downloadSample(tacticId) {
        // Implement sample CSV download
        const tactic = this.detectedTactics.find(t => t.id === tacticId);
        if (tactic && tactic.sampleData) {
            const csv = Papa.unparse(tactic.sampleData);
            this.downloadFile(`${tactic.name}-sample.csv`, csv, 'text/csv');
        }
    }

    downloadFile(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    copyResults() {
        if (!this.analysisResults) return;
        
        let text = `Campaign Performance Analysis\n\n`;
        text += `Executive Summary:\n${this.analysisResults.executiveSummary}\n\n`;
        
        if (this.analysisResults.tacticPerformance) {
            text += `Performance by Tactic:\n${this.analysisResults.tacticPerformance}\n\n`;
        }
        
        if (this.analysisResults.tacticTrends) {
            text += `Trends by Tactic:\n${this.analysisResults.tacticTrends}\n\n`;
        }
        
        text += `Recommendations:\n${this.analysisResults.tacticRecommendations || this.analysisResults.recommendations}`;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage('Results copied to clipboard!', 'success');
        });
    }

    exportResults() {
        if (!this.analysisResults) return;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            campaignData: this.campaignData,
            companyInfo: this.companyInfo,
            analysis: this.analysisResults
        };
        
        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile('campaign-analysis-export.json', json, 'application/json');
    }

    resetAnalysis() {
        if (confirm('Are you sure you want to reset the entire analysis?')) {
            this.currentStep = 1;
            this.campaignData = null;
            this.detectedTactics = [];
            this.uploadedFiles = {};
            this.companyInfo = {};
            this.analysisResults = null;
            
            // Clear UI
            document.getElementById('luminaUrl').value = '';
            document.getElementById('campaignMeta').classList.add('hidden');
            document.getElementById('tacticsGrid').innerHTML = '';
            document.getElementById('companyName').value = '';
            document.getElementById('industry').value = '';
            document.getElementById('objectives').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('analysisResults').classList.add('hidden');
            
            this.updateStepVisibility();
            this.updateStatus('campaignStatus', 'Ready', 'default');
            this.showMessage('Analysis reset successfully', 'success');
        }
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CampaignAnalyzer();
});