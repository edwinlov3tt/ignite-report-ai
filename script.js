// Report.AI - Main Application Logic

// Application State Management
const AppState = {
    currentStep: 1,
    campaignData: null,
    companyConfig: {},
    timeRange: {},
    uploadedFiles: {},
    analysisConfig: {},
    analysisResults: null,
    requiredTactics: [],
    removedLineItems: new Set(), // Track removed line item IDs
    tacticLineItems: {}, // Map tactics to their line items
    marketResearchData: null, // Store fetched market research data
    industries: [] // Store available industries for admin updates
};

// Industry management
const IndustryManager = {
    defaultIndustries: [
        'Technology', 'Healthcare', 'Finance & Banking', 'Retail & E-commerce', 
        'Education', 'Automotive', 'Real Estate', 'Food & Beverage',
        'Travel & Tourism', 'Entertainment & Media', 'Professional Services',
        'Manufacturing', 'Non-Profit', 'Government', 'Energy & Utilities',
        'Fashion & Beauty', 'Sports & Fitness', 'Home & Garden', 'Other'
    ],
    
    getIndustries() {
        // Return stored industries or default list
        const stored = localStorage.getItem('customIndustries');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return [...new Set([...this.defaultIndustries, ...parsed])].sort();
            } catch (e) {
                console.error('Error parsing stored industries:', e);
            }
        }
        return this.defaultIndustries.slice().sort();
    },
    
    addIndustry(industry) {
        const trimmed = industry.trim();
        if (!trimmed) return false;
        
        const current = this.getIndustries();
        const exists = current.some(i => i.toLowerCase() === trimmed.toLowerCase());
        
        if (!exists) {
            const stored = localStorage.getItem('customIndustries');
            let custom = [];
            if (stored) {
                try {
                    custom = JSON.parse(stored);
                } catch (e) {
                    custom = [];
                }
            }
            custom.push(trimmed);
            localStorage.setItem('customIndustries', JSON.stringify(custom));
            AppState.industries = this.getIndustries();
            return true;
        }
        return false;
    },
    
    searchIndustries(query) {
        if (!query.trim()) return this.getIndustries();
        
        const lowerQuery = query.toLowerCase();
        return this.getIndustries().filter(industry => 
            industry.toLowerCase().includes(lowerQuery)
        );
    }
};

// DOM Elements Cache
const elements = {
    // Navigation
    progressSteps: document.querySelectorAll('.progress-step'),
    progressFill: document.querySelector('.progress-fill'), // May be null - handled in updateStepProgress
    
    // Step 1: Campaign Data
    campaignUrl: document.getElementById('campaign-url'),
    fetchCampaignBtn: document.getElementById('fetch-campaign-btn'),
    campaignLoading: document.getElementById('campaign-loading'),
    campaignResults: document.getElementById('campaign-results'),
    campaignStatus: document.getElementById('campaign-status'),
    detectedTactics: document.getElementById('detected-tactics'),
    continueToTimeRangeBtn: document.getElementById('continue-to-time-range'),
    
    // Step 2: Company Info
    companyName: document.getElementById('company-name'),
    industry: document.getElementById('industry'),
    industrySearch: document.getElementById('industry-search'),
    industryDropdown: document.getElementById('industry-dropdown'),
    industryOptions: document.getElementById('industry-options'),
    addNewIndustryBtn: document.getElementById('add-new-industry'),
    campaignGoals: document.getElementById('campaign-goals'),
    marketResearchUrl: document.getElementById('market-research-url'),
    apiStatusIcon: document.getElementById('api-status-icon'),
    viewResearchContextBtn: document.getElementById('view-research-context'),
    additionalNotes: document.getElementById('additional-notes'),
    continueToCompanyBtn: document.getElementById('continue-to-company'),
    
    // Research Context Modal
    researchContextModal: document.getElementById('research-context-modal'),
    closeResearchModalBtn: document.getElementById('close-research-modal'),
    researchSections: document.getElementById('research-sections'),
    clearResearchContextBtn: document.getElementById('clear-research-context'),
    saveResearchContextBtn: document.getElementById('save-research-context'),
    
    // Step 3: Time Range
    startDate: document.getElementById('start-date'),
    endDate: document.getElementById('end-date'),
    timeCards: document.querySelectorAll('.time-card'),
    dateInputsSection: document.getElementById('date-inputs-section'),
    currentDateTime: document.getElementById('current-date-time'),
    selectedRange: document.getElementById('selected-range'),
    rangeDuration: document.getElementById('range-duration'),
    continueToPerformanceBtn: document.getElementById('continue-to-performance'),
    
    // Step 4: Performance Data
    fileUploads: document.getElementById('file-uploads'),
    filesUploaded: document.getElementById('files-uploaded'),
    filesTotal: document.getElementById('files-total'),
    uploadProgressFill: document.getElementById('upload-progress-fill'),
    continueToAnalysisBtn: document.getElementById('continue-to-analysis'),
    
    // Step 5: AI Analysis
    aiModel: document.getElementById('ai-model'),
    currentModelBadge: document.getElementById('current-model-badge'),
    modelDescription: document.getElementById('model-description'),
    tempSlider: document.getElementById('temp-slider'),
    tempValue: document.getElementById('temp-value'),
    tempLabel: document.getElementById('temp-label'),
    tempDescription: document.getElementById('temp-description'),
    toneCards: document.querySelectorAll('.tone-card'),
    customInstructions: document.getElementById('custom-instructions'),
    charCounter: document.getElementById('char-counter'),
    summaryModel: document.getElementById('summary-model'),
    summaryTemp: document.getElementById('summary-temp'),
    summaryTone: document.getElementById('summary-tone'),
    summaryInstructions: document.getElementById('summary-instructions'),
    generateAnalysisBtn: document.getElementById('generate-analysis'),
    analysisLoading: document.getElementById('analysis-loading'),
    
    // Results
    analysisResults: document.getElementById('analysis-results'),
    analysisOutput: document.getElementById('analysis-output'),
    
    // Navigation buttons
    backBtns: document.querySelectorAll('[id^="back-to"]'),
    
    // Modal
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    closeErrorModal: document.getElementById('close-error-modal'),
    dismissError: document.getElementById('dismiss-error'),
    
    // Theme
    themeBtns: document.querySelectorAll('.theme-btn')
};

// Event Bus for loose coupling
const EventBus = {
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
};

// Utility Functions
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.classList.remove('hidden');
}

function hideError() {
    elements.errorModal.classList.add('hidden');
}

// Status helper functions
function getStatusClass(status) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('pending submission') || statusLower.includes('pending')) {
        return 'status-pending';
    } else if (statusLower === 'complete' || statusLower === 'completed') {
        return 'status-complete';
    } else if (statusLower === 'revision live' || statusLower === 'live - revision') {
        return 'status-live-revision';
    } else if (statusLower === 'live' || statusLower === 'active') {
        return 'status-live';
    } else if (statusLower === 'cancelled') {
        return 'status-cancelled';
    } else if (statusLower.includes('pending cancellation')) {
        return 'status-pending-cancellation';
    }
    return '';
}

function getMostCommonStatus(lineItems) {
    if (!lineItems || lineItems.length === 0) return 'Unknown';
    
    const statusCounts = {};
    lineItems.forEach(item => {
        const status = item.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    let mostCommon = 'Unknown';
    let maxCount = 0;
    for (const [status, count] of Object.entries(statusCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostCommon = status;
        }
    }
    
    return mostCommon;
}

function removeTactic(event) {
    const tacticIndex = parseInt(event.target.dataset.tacticIndex);
    if (isNaN(tacticIndex)) return;
    
    // Remove from detected tactics
    if (AppState.campaignData.detectedTactics) {
        AppState.campaignData.detectedTactics.splice(tacticIndex, 1);
        AppState.requiredTactics = AppState.campaignData.detectedTactics.map(t => t.name);
    }
    
    // Re-render tactics
    populateCampaignResults(AppState.campaignData);
}

function clearAndReset() {
    // Confirm with user
    if (!confirm('Are you sure you want to clear all data and reset the application?')) {
        return;
    }
    
    // Reset AppState
    AppState.currentStep = 1;
    AppState.campaignData = null;
    AppState.companyConfig = {};
    AppState.timeRange = {};
    AppState.uploadedFiles = {};
    AppState.requiredTactics = [];
    AppState.aiConfig = {};
    AppState.removedLineItems = new Set();
    AppState.tacticLineItems = {};
    
    // Clear all form inputs
    if (elements.campaignUrl) elements.campaignUrl.value = '';
    if (elements.companyName) elements.companyName.value = '';
    if (elements.industry) elements.industry.value = '';
    if (elements.campaignGoals) elements.campaignGoals.value = '';
    if (elements.additionalNotes) elements.additionalNotes.value = '';
    if (elements.startDate) elements.startDate.value = '';
    if (elements.endDate) elements.endDate.value = '';
    // Reset AI Analysis Configuration
    if (elements.aiModel) elements.aiModel.value = 'claude-sonnet-4-20250514';
    if (elements.tempSlider) elements.tempSlider.value = '0.5';
    if (elements.customInstructions) elements.customInstructions.value = '';
    
    // Reset tone cards to default (Professional)
    elements.toneCards.forEach(card => {
        card.classList.remove('active');
        if (card.getAttribute('data-tone') === 'professional') {
            card.classList.add('active');
        }
    });
    
    // Update displays
    updateModel();
    updateTemperature();
    updateCharCounter();
    
    // Clear campaign results
    document.getElementById('campaign-id').textContent = '--';
    document.getElementById('campaign-company').textContent = '--';
    const statusElement = document.getElementById('campaign-status-value');
    statusElement.textContent = '--';
    statusElement.className = 'value status-chip';
    document.getElementById('campaign-dates').textContent = '--';
    document.getElementById('line-items-count').textContent = '0';
    
    // Clear detected tactics
    if (elements.detectedTactics) {
        elements.detectedTactics.innerHTML = '';
    }
    
    // Hide all sections except first
    document.querySelectorAll('.step-section').forEach((section, index) => {
        if (index === 0) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
    
    // Hide campaign results
    if (elements.campaignResults) {
        elements.campaignResults.classList.add('hidden');
    }
    
    // Hide analysis results
    const analysisResults = document.getElementById('analysis-results');
    if (analysisResults) {
        analysisResults.classList.add('hidden');
    }
    
    // Reset progress indicators
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        if (index === 0) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // Reset section statuses
    updateSectionStatus('campaign', 'Pending');
    updateSectionStatus('company', 'Pending');
    updateSectionStatus('timerange', 'Pending');
    updateSectionStatus('performance', 'Pending');
    updateSectionStatus('analysis', 'Pending');
    
    // Clear date summary
    if (elements.selectedRange) elements.selectedRange.textContent = 'No range selected';
    if (elements.rangeDuration) elements.rangeDuration.textContent = '0 days';
    
    // Clear file uploads
    const fileUploads = document.getElementById('file-uploads');
    if (fileUploads) {
        fileUploads.innerHTML = '';
    }
    
    // Reset upload progress
    const uploadedCount = document.getElementById('files-uploaded');
    const totalCount = document.getElementById('files-total');
    const progressFill = document.getElementById('upload-progress-fill');
    if (uploadedCount) uploadedCount.textContent = '0';
    if (totalCount) totalCount.textContent = '0';
    if (progressFill) progressFill.style.width = '0%';
    
    // Clear localStorage
    localStorage.removeItem('campaignAnalyzer');
    
    console.log('Application has been reset');
}

// Tactic Modal Functions
function showTacticModal(tacticIndex, tactic, lineItems) {
    const modal = document.getElementById('tactic-detail-modal');
    const title = document.getElementById('tactic-modal-title');
    const platform = document.getElementById('tactic-modal-platform');
    const description = document.getElementById('tactic-modal-description');
    const lineItemsContainer = document.getElementById('modal-line-items');
    
    // Set modal content
    title.textContent = `${tactic.platform || tactic.name} Details`;
    platform.textContent = tactic.platform || tactic.name;
    
    let descriptionText = '';
    if (tactic.subProduct) descriptionText += `${tactic.subProduct}\n`;
    if (tactic.tacticSpecial) {
        const specialText = Array.isArray(tactic.tacticSpecial) ? 
            tactic.tacticSpecial.join(', ') : tactic.tacticSpecial;
        descriptionText += `Special: ${specialText}\n`;
    }
    if (!descriptionText && tactic.description) descriptionText = tactic.description;
    description.textContent = descriptionText || 'No description available';
    
    // Populate line items
    populateModalLineItems(lineItems, tacticIndex);
    
    // Show modal
    modal.classList.remove('hidden');
}

function populateModalLineItems(lineItems, tacticIndex) {
    const container = document.getElementById('modal-line-items');
    const removedCountEl = document.getElementById('removed-count');
    const removedNumberEl = removedCountEl.querySelector('.removed-number');
    const restoreBtn = document.getElementById('restore-all-btn');
    
    container.innerHTML = '';
    
    let removedCount = 0;
    
    lineItems.forEach((lineItem, index) => {
        const lineItemId = lineItem._id || lineItem.id || `${lineItem.product}-${lineItem.subProduct}-${tacticIndex}-${index}`;
        // Ensure removedLineItems is a Set
        if (!(AppState.removedLineItems instanceof Set)) {
            AppState.removedLineItems = new Set();
        }
        
        const isRemoved = AppState.removedLineItems.has(lineItemId);
        
        if (isRemoved) removedCount++;
        
        const card = document.createElement('div');
        card.className = `line-item-card ${isRemoved ? 'removed' : ''}`;
        card.dataset.lineItemId = lineItemId;
        card.dataset.tacticIndex = tacticIndex;
        
        const productSlug = slugify(lineItem.product || 'unknown');
        const viewLineUrl = `https://townsquarelumina.com/lumina/view/lineitem/${productSlug}/${lineItem.tapLineitemId || lineItem.lineitemId || 'unknown'}`;
        
        // Format budget values
        const totalBudget = formatCurrency(lineItem.totalBudget);
        const monthlyBudget = formatCurrency(lineItem.monthlyBudget);
        
        // Format dates
        const startDate = lineItem.startDate ? new Date(lineItem.startDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '--';
        const endDate = lineItem.endDate ? new Date(lineItem.endDate).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '--';
        
        card.innerHTML = `
            <div class="line-item-header">
                <h5 class="line-item-title">${lineItem.subProduct || lineItem.product || 'Line Item'}</h5>
                <button type="button" class="line-item-remove" data-line-item-id="${lineItemId}" title="Remove from analysis">×</button>
            </div>
            
            <div class="line-item-details">
                <div class="line-item-detail">
                    <span class="label">Campaign Initiative</span>
                    <span class="value">${lineItem.campaignInitiative || '--'}</span>
                </div>
                <div class="line-item-detail">
                    <span class="label">Date Range</span>
                    <span class="value">${startDate} - ${endDate}</span>
                </div>
                <div class="line-item-detail">
                    <span class="label">Total Budget</span>
                    <span class="value">${totalBudget}</span>
                </div>
                <div class="line-item-detail">
                    <span class="label">Monthly Budget</span>
                    <span class="value">${monthlyBudget}</span>
                </div>
                <div class="line-item-detail">
                    <span class="label">Impressions Goal</span>
                    <span class="value">${formatNumber(lineItem.totalImpressionsGoal) || '--'}</span>
                </div>
                <div class="line-item-detail">
                    <span class="label">Status</span>
                    <span class="value status-chip ${getStatusClass(lineItem.workflowStepName || lineItem.status)}">${lineItem.workflowStepName || lineItem.status || '--'}</span>
                </div>
            </div>
            
            <div class="line-item-actions-row">
                <a href="${viewLineUrl}" target="_blank" class="view-line-btn">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15,3 21,3 21,9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    View Line
                </a>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Update removed count display
    if (removedCount > 0) {
        removedNumberEl.textContent = removedCount;
        removedCountEl.classList.remove('hidden');
        restoreBtn.classList.remove('hidden');
    } else {
        removedCountEl.classList.add('hidden');
        restoreBtn.classList.add('hidden');
    }
    
    // Add event listeners
    container.querySelectorAll('.line-item-remove').forEach(btn => {
        btn.addEventListener('click', removeLineItem);
    });
}

function removeLineItem(event) {
    const lineItemId = event.target.dataset.lineItemId;
    const card = event.target.closest('.line-item-card');
    const tacticIndex = card.dataset.tacticIndex;
    
    // Ensure removedLineItems is a Set
    if (!(AppState.removedLineItems instanceof Set)) {
        AppState.removedLineItems = new Set();
    }
    
    // Add to removed set
    AppState.removedLineItems.add(lineItemId);
    
    // Update card appearance
    card.classList.add('removed');
    
    // Update removed count in modal
    const tacticLineItems = AppState.tacticLineItems[tacticIndex] || [];
    populateModalLineItems(tacticLineItems, tacticIndex);
    
    // Refresh tactic cards to show updated counts
    populateCampaignResults(AppState.campaignData);
}

function restoreAllLineItems() {
    const modal = document.getElementById('tactic-detail-modal');
    const lineItemCards = modal.querySelectorAll('.line-item-card');
    
    // Ensure removedLineItems is a Set
    if (!(AppState.removedLineItems instanceof Set)) {
        AppState.removedLineItems = new Set();
    }
    
    // Remove all line items for this tactic from removed set
    lineItemCards.forEach(card => {
        const lineItemId = card.dataset.lineItemId;
        AppState.removedLineItems.delete(lineItemId);
    });
    
    // Refresh modal and tactic cards
    const firstCard = lineItemCards[0];
    if (firstCard) {
        const tacticIndex = firstCard.dataset.tacticIndex;
        const tacticLineItems = AppState.tacticLineItems[tacticIndex] || [];
        populateModalLineItems(tacticLineItems, tacticIndex);
    }
    
    // Refresh tactic cards
    populateCampaignResults(AppState.campaignData);
}

// Helper Functions
function slugify(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '--';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatNumber(number) {
    if (!number || isNaN(number)) return '--';
    return new Intl.NumberFormat('en-US').format(number);
}

function showLoadingState(elementId, message = 'Loading...') {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
        const messageElement = loadingElement.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
}

function hideLoadingState(elementId) {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
}

function updateStepProgress(step) {
    AppState.currentStep = step;
    
    // Update progress indicators
    if (elements.progressSteps && elements.progressSteps.length > 0) {
        elements.progressSteps.forEach((stepEl, index) => {
            const stepNumber = index + 1;
            stepEl.classList.toggle('active', stepNumber === step);
            stepEl.classList.toggle('completed', stepNumber < step);
        });
    }
    
    // Update progress bar if it exists
    if (elements.progressFill) {
        const progressPercent = (step / 5) * 100;
        elements.progressFill.style.width = `${progressPercent}%`;
    }
    
    // Update the progress line fill based on completed steps
    const progressLineFill = document.querySelector('.progress-line-fill');
    if (progressLineFill) {
        // Calculate width based on completed steps (step - 1 because current step is not completed)
        const completedSteps = Math.max(0, step - 1);
        const totalConnections = 4; // 4 connections between 5 steps
        const progressPercent = (completedSteps / totalConnections) * 100;
        progressLineFill.style.width = `${progressPercent}%`;
    }
    
    // Save state
    saveStateToLocalStorage();
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function updateSectionStatus(sectionId, status) {
    const statusElement = document.getElementById(`${sectionId}-status`);
    if (statusElement) {
        // Add "Step" prefix to the status
        const displayStatus = status === 'Complete' ? 'Step Complete' : 'Step Pending';
        statusElement.textContent = displayStatus;
        statusElement.className = `status-indicator ${status.toLowerCase()}`;
    }
}

// State Management
function saveStateToLocalStorage() {
    // Don't save demo data to localStorage
    if (AppState.campaignData && AppState.campaignData.id === '507f1f77bcf86cd799439011') {
        return; // Skip saving demo data
    }
    
    // Don't save empty state
    if (!AppState.campaignData) {
        return; // Skip saving if no real campaign data
    }
    
    // Convert Set to Array for JSON serialization
    const stateToSave = {
        ...AppState,
        removedLineItems: Array.from(AppState.removedLineItems)
    };
    localStorage.setItem('campaignAnalyzer', JSON.stringify(stateToSave));
}

function loadStateFromLocalStorage() {
    const saved = localStorage.getItem('campaignAnalyzer');
    if (saved) {
        try {
            const parsedState = JSON.parse(saved);
            
            // Don't load demo data - clear it if found
            if (parsedState.campaignData && parsedState.campaignData.id === '507f1f77bcf86cd799439011') {
                console.log('Found demo data in localStorage - clearing it');
                localStorage.removeItem('campaignAnalyzer');
                return; // Don't restore demo data
            }
            
            // Only load if there's real campaign data
            if (!parsedState.campaignData) {
                return; // Don't restore empty state
            }
            
            Object.assign(AppState, parsedState);
            
            // Convert Array back to Set after loading from localStorage
            if (AppState.removedLineItems && Array.isArray(AppState.removedLineItems)) {
                AppState.removedLineItems = new Set(AppState.removedLineItems);
            } else {
                AppState.removedLineItems = new Set();
            }
            
            // Restore UI state if data exists
            if (AppState.campaignData) {
                populateCampaignResults(AppState.campaignData);
                // Safely update step progress with error handling
                try {
                    updateStepProgress(Math.max(AppState.currentStep || 1, 2));
                } catch (stepError) {
                    console.warn('Could not update step progress:', stepError);
                    AppState.currentStep = 1;
                }
            }
        } catch (error) {
            console.error('Error loading saved state:', error);
            // Reset to clean state if loading fails
            AppState.currentStep = 1;
            AppState.removedLineItems = new Set();
        }
    }
}

// API Communication
async function makeAPICall(endpoint, data = null) {
    const options = {
        method: data ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(pathConfig.api(endpoint), options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get response text first to debug JSON issues
        const responseText = await response.text();
        console.log('API Response Text:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            throw new Error(`Invalid JSON response from server. Response: ${responseText.substring(0, 200)}...`);
        }
        
        if (!result.success) {
            throw new Error(result.message || 'API call failed');
        }
        
        return result.data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        if (error.name === 'TypeError') {
            throw new Error('Network error - please check your connection');
        }
        throw error;
    }
}

// Step 1: Campaign Data Functions
async function fetchCampaignData() {
    const url = elements.campaignUrl.value.trim();
    
    if (!url) {
        showError('Please enter a campaign URL');
        return;
    }
    
    // Check for demo mode first
    if (url.toLowerCase().trim() === 'demo') {
        fetchDemoData();
        return;
    }
    
    // Strip query parameters from URL
    const cleanUrl = url.split('?')[0];
    
    // Extract order ID from URL - try multiple patterns
    let orderId = null;
    
    // Pattern 1: 24-character hex MongoDB ObjectId
    const objectIdMatch = cleanUrl.match(/[a-f0-9]{24}/i);
    if (objectIdMatch) {
        orderId = objectIdMatch[0];
    }
    
    // Pattern 2: end of path after stripping query params
    const pathMatch = cleanUrl.match(/\/([^\/]+)\/?$/);
    if (!orderId && pathMatch && pathMatch[1].length === 24) {
        orderId = pathMatch[1];
    }
    
    if (!orderId) {
        showError('Could not extract order ID from URL. Please check the URL format.\n\nExpected format: URL containing a 24-character hex ID');
        return;
    }
    
    // Check if this is the demo order ID
    if (orderId === '507f1f77bcf86cd799439011') {
        fetchDemoData();
        return;
    }
    
    try {
        showLoadingState('campaign-loading', 'Fetching campaign data...');
        
        // Fetch campaign data
        const campaignData = await makeAPICall('lumina.php', { orderId });
        
        // Log basic campaign info for debugging
        console.log('✅ Campaign loaded:', campaignData.companyName || 'Unknown', '| Line Items:', campaignData.lineItems?.length || 0);
        
        // Detect tactics
        const tacticData = await makeAPICall('tactics.php', campaignData);
        
        // Combine data
        AppState.campaignData = {
            ...campaignData,
            detectedTactics: tacticData.tactics || []
        };
        
        AppState.requiredTactics = (tacticData.tactics || []).map(tactic => tactic.name);
        
        populateCampaignResults(AppState.campaignData);
        updateSectionStatus('campaign', 'Complete');
        
        EventBus.emit('campaignDataLoaded', AppState.campaignData);
        
    } catch (error) {
        showError(`Failed to fetch campaign data: ${error.message}\n\nTip: Try entering "demo" to see a sample workflow.`);
    } finally {
        hideLoadingState('campaign-loading');
    }
}

function fetchDemoData() {
    showLoadingState('campaign-loading', 'Loading demo campaign data...');
    
    setTimeout(() => {
        const demoData = {
            id: '507f1f77bcf86cd799439011',
            orderNumber: 'DEMO-001',
            woOrderNumber: 'WO-2024-DEMO-001',
            name: 'Q1 2024 Digital Marketing Campaign',
            companyName: 'Sample Company Inc.',
            advertiser: 'Sample Company Inc.',
            status: 'Live',
            order: { status: 'Live' },
            lineItems: [
                { 
                    _id: 'demo-li-001',
                    product: 'Facebook', 
                    subProduct: 'Instagram Stories', 
                    status: 'Active',
                    workflowStepName: 'Live',
                    companyName: 'Sample Company Inc.',
                    woOrderNumber: 'WO-2024-DEMO-001',
                    startDate: '2024-01-01T00:00:00.000Z',
                    endDate: '2024-12-31T00:00:00.000Z',
                    totalBudget: 25000,
                    monthlyBudget: 2083,
                    totalImpressionsGoal: 500000,
                    campaignInitiative: 'Brand Awareness',
                    tapLineitemId: 'TAP-FB-001',
                    tacticTypeSpecial: ['RTG', 'KWT']
                },
                { 
                    _id: 'demo-li-002',
                    product: 'Google', 
                    subProduct: 'Search Ads', 
                    status: 'Active',
                    workflowStepName: 'Live',
                    companyName: 'Sample Company Inc.',
                    woOrderNumber: 'WO-2024-DEMO-001',
                    startDate: '2024-01-01T00:00:00.000Z',
                    endDate: '2024-12-31T00:00:00.000Z',
                    totalBudget: 35000,
                    monthlyBudget: 2917,
                    totalImpressionsGoal: 750000,
                    campaignInitiative: 'Lead Generation',
                    tapLineitemId: 'TAP-GG-001',
                    tacticTypeSpecial: ['SEM']
                },
                { 
                    _id: 'demo-li-003',
                    product: 'LinkedIn', 
                    subProduct: 'Sponsored Content', 
                    status: 'Active',
                    workflowStepName: 'Live',
                    companyName: 'Sample Company Inc.',
                    woOrderNumber: 'WO-2024-DEMO-001',
                    startDate: '2024-01-01T00:00:00.000Z',
                    endDate: '2024-12-31T00:00:00.000Z',
                    totalBudget: 15000,
                    monthlyBudget: 1250,
                    totalImpressionsGoal: 200000,
                    campaignInitiative: 'B2B Engagement',
                    tapLineitemId: 'TAP-LI-001',
                    tacticTypeSpecial: ['B2B']
                }
            ],
            detectedTactics: [
                { 
                    name: 'Facebook-Instagram', 
                    platform: 'Facebook', 
                    subProduct: 'Instagram Stories',
                    description: 'Instagram advertising campaigns',
                    lineItemCount: 1,
                    tacticSpecial: ['RTG', 'KWT']
                },
                { 
                    name: 'Google-Search', 
                    platform: 'Google',
                    subProduct: 'Search Ads', 
                    description: 'Google Search advertising',
                    lineItemCount: 1,
                    tacticSpecial: ['SEM']
                },
                { 
                    name: 'LinkedIn-Sponsored', 
                    platform: 'LinkedIn',
                    subProduct: 'Sponsored Content', 
                    description: 'LinkedIn sponsored content',
                    lineItemCount: 1,
                    tacticSpecial: ['B2B']
                }
            ]
        };
        
        AppState.campaignData = demoData;
        AppState.requiredTactics = demoData.detectedTactics.map(tactic => tactic.name);
        
        populateCampaignResults(demoData);
        updateSectionStatus('campaign', 'Complete');
        hideLoadingState('campaign-loading');
        
        EventBus.emit('campaignDataLoaded', demoData);
    }, 1500);
}

function populateCampaignResults(data) {
    // Populate campaign info from JSON response
    
    // Company name is first - check lineItems for companyName
    const companyName = data.companyName || 
                       (data.lineItems && data.lineItems.length > 0 ? data.lineItems[0].companyName : null) || 
                       data.advertiser || '--';
    document.getElementById('campaign-company').textContent = companyName;
    
    // Wide Orbit Number from woOrderNumber in lineItems
    const woOrderNumber = data.woOrderNumber || 
                         (data.lineItems && data.lineItems.length > 0 ? data.lineItems[0].woOrderNumber : null) || 
                         data.orderNumber || '--';
    document.getElementById('campaign-id').textContent = woOrderNumber;
    
    // Order status from order.status with color-coded chip
    const statusElement = document.getElementById('campaign-status-value');
    const orderStatus = data.order?.status || 
                       (data.lineItems && data.lineItems.length > 0 ? data.lineItems[0].workflowStepName : null) || 
                       data.status || 'Unknown';
    // Set campaign status (removed console log to reduce noise)
    statusElement.textContent = orderStatus;
    statusElement.className = 'value status-chip ' + getStatusClass(orderStatus);
    
    // Order dates from startDate and endDate
    const dateElement = document.getElementById('campaign-dates');
    if (data.lineItems && data.lineItems.length > 0) {
        const startDate = data.lineItems[0].startDate;
        const endDate = data.lineItems[0].endDate;
        if (startDate && endDate) {
            const start = new Date(startDate).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' 
            });
            const end = new Date(endDate).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' 
            });
            dateElement.textContent = `${start} - ${end}`;
        } else {
            dateElement.textContent = '--';
        }
    } else {
        dateElement.textContent = '--';
    }
    
    // Update line items count in heading
    const lineItemCount = data.lineItems?.length || 0;
    document.getElementById('line-items-count').textContent = lineItemCount;
    
    // Populate detected tactics
    const tacticsContainer = elements.detectedTactics;
    tacticsContainer.innerHTML = '';
    
    if (data.detectedTactics && data.detectedTactics.length > 0) {
        data.detectedTactics.forEach((tactic, index) => {
            const tacticCard = document.createElement('div');
            tacticCard.className = 'tactic-card';
            tacticCard.dataset.tacticIndex = index;
            
            // Get line items for this tactic
            const tacticLineItems = data.lineItems?.filter(li => 
                li.product === tactic.platform || li.product === tactic.name.split('-')[0]
            ) || [];
            
            // Store line items in AppState for modal access
            AppState.tacticLineItems[index] = tacticLineItems;
            
            // Calculate active line items (not removed)
            // Ensure removedLineItems is a Set
            if (!(AppState.removedLineItems instanceof Set)) {
                AppState.removedLineItems = new Set();
            }
            
            const activeLineItems = tacticLineItems.filter(li => 
                !AppState.removedLineItems.has(li._id || li.id || `${li.product}-${li.subProduct}-${index}`)
            );
            const removedCount = tacticLineItems.length - activeLineItems.length;
            
            const lineItemStatus = getMostCommonStatus(activeLineItems);
            const statusClass = getStatusClass(lineItemStatus);
            
            // Format tactic special if available
            let tacticSpecialText = '';
            if (tactic.tacticSpecial) {
                tacticSpecialText = Array.isArray(tactic.tacticSpecial) ? 
                    tactic.tacticSpecial.join(', ') : tactic.tacticSpecial;
            }
            
            tacticCard.innerHTML = `
                <div class="tactic-header">
                    <h5>${tactic.platform || tactic.name}</h5>
                    <span class="tactic-badge ${statusClass}">${lineItemStatus}</span>
                </div>
                <div class="tactic-description">
                    ${tactic.subProduct ? `<div><strong>${tactic.subProduct}</strong></div>` : ''}
                    ${tacticSpecialText ? `<div><em>${tacticSpecialText}</em></div>` : ''}
                    ${!tactic.subProduct && !tacticSpecialText ? `<div>${tactic.description || 'No description available'}</div>` : ''}
                </div>
                <div class="tactic-stats">
                    <span>Line Items: ${activeLineItems.length}${removedCount > 0 ? ` <span style="color: var(--color-red-600); font-weight: 600;">Removed: ${removedCount}</span>` : ''}</span>
                </div>
                <button type="button" class="tactic-remove-btn" data-tactic-index="${index}" title="Remove this tactic">×</button>
            `;
            
            // Add click handler for modal (but not on remove button)
            tacticCard.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tactic-remove-btn')) {
                    showTacticModal(index, tactic, tacticLineItems);
                }
            });
            
            tacticsContainer.appendChild(tacticCard);
        });
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.tactic-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent modal from opening
                removeTactic(e);
            });
        });
    } else {
        tacticsContainer.innerHTML = '<p class="no-tactics">No tactics detected. Please verify your campaign data.</p>';
    }
    
    // Show results
    elements.campaignResults.classList.remove('hidden');
}

// Step 2: Company Information Functions
function validateCompanyInfo() {
    const companyName = elements.companyName.value.trim();
    const industry = elements.industry.value;
    
    if (!companyName) {
        showError('Please enter a company name');
        return false;
    }
    
    // Industry is now optional, no validation needed
    
    AppState.companyConfig = {
        name: companyName,
        industry: industry || 'Not specified',
        goals: elements.campaignGoals.value.trim(),
        additionalNotes: elements.additionalNotes.value.trim()
    };
    
    updateSectionStatus('company', 'Complete');
    return true;
}

// Market Research API Functions
async function fetchMarketResearch(url) {
    try {
        // Show loading state
        showApiLoading();
        
        // Extract domain from URL
        const domain = extractDomainFromUrl(url);
        if (!domain) {
            throw new Error('Could not extract domain from URL');
        }
        
        // Try primary API endpoint first
        let apiUrl = `https://ignite.edwinlovett.com/research/?company=${encodeURIComponent(domain)}&format=json`;
        let response = await fetch(apiUrl);
        
        // If that fails, try the fallback endpoint
        if (!response.ok) {
            apiUrl = `https://ignite.edwinlovett.com/research/claude-api.php?company=${encodeURIComponent(domain)}&format=json`;
            response = await fetch(apiUrl);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch market research data');
        }
        
        // Store the research data (excluding metadata)
        const { metadata, ...researchData } = data;
        AppState.marketResearchData = researchData.report;
        
        // Auto-populate campaign goals if available
        populateCampaignGoals(AppState.marketResearchData);
        
        // Show success state
        showApiSuccess();
        
        return AppState.marketResearchData;
        
    } catch (error) {
        console.error('Market research fetch error:', error);
        showApiError();
        throw error;
    }
}

function extractDomainFromUrl(url) {
    try {
        // Handle direct domain input
        if (!url.includes('://')) {
            return url.replace(/^www\./, '');
        }
        
        const urlObj = new URL(url);
        
        // Check if it's a research URL with company parameter
        const companyParam = urlObj.searchParams.get('company');
        if (companyParam) {
            return companyParam.replace(/^www\./, '');
        }
        
        // Otherwise use the hostname
        return urlObj.hostname.replace(/^www\./, '');
        
    } catch (error) {
        console.error('Domain extraction error:', error);
        return null;
    }
}

function populateCampaignGoals(researchData) {
    if (!researchData || !elements.campaignGoals) return;
    
    const goals = [];
    
    // Try to extract marketing objectives
    if (researchData.marketingObjective?.overview) {
        goals.push(`Overview: ${researchData.marketingObjective.overview}`);
    }
    
    if (researchData.marketingObjective?.inferredGoal) {
        goals.push(`Goal: ${researchData.marketingObjective.inferredGoal}`);
    }
    
    if (researchData.marketingObjective?.primaryCTA) {
        goals.push(`Primary CTA: ${researchData.marketingObjective.primaryCTA}`);
    }
    
    // Only populate if field is empty and we have data
    if (goals.length > 0 && !elements.campaignGoals.value.trim()) {
        elements.campaignGoals.value = goals.join('\n\n');
    }
    
    // Also populate company name and industry if available
    if (researchData.companyInfo) {
        // Auto-fill company name
        if (researchData.companyInfo.name && !elements.companyName.value.trim()) {
            elements.companyName.value = researchData.companyInfo.name;
        }
        
        // Auto-fill industry with Capital Case
        if (researchData.companyInfo.industry && !elements.industrySearch.value.trim()) {
            const capitalizedIndustry = toCapitalCase(researchData.companyInfo.industry);
            setIndustryValue(capitalizedIndustry);
        }
    }
}

// Helper function to convert text to Capital Case
function toCapitalCase(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/\s*&\s*/g, ' & ') // Handle ampersands
        .replace(/\s*\/\s*/g, ' / '); // Handle slashes
}

// Industry dropdown management functions
function initializeIndustryDropdown() {
    AppState.industries = IndustryManager.getIndustries();
    renderIndustryOptions('');
}

function renderIndustryOptions(query) {
    if (!elements.industryOptions) return;
    
    const industries = IndustryManager.searchIndustries(query);
    const currentValue = elements.industry.value;
    
    elements.industryOptions.innerHTML = industries.map(industry => `
        <div class="dropdown-option ${industry === currentValue ? 'selected' : ''}" data-value="${industry}">
            ${industry}
        </div>
    `).join('');
    
    // Update "Add new industry" text
    const newIndustryText = elements.addNewIndustryBtn?.querySelector('.new-industry-text');
    if (newIndustryText && query.trim()) {
        newIndustryText.textContent = query.trim();
        const exactMatch = industries.some(i => i.toLowerCase() === query.toLowerCase());
        elements.addNewIndustryBtn.parentElement.style.display = exactMatch ? 'none' : 'block';
    } else if (elements.addNewIndustryBtn) {
        elements.addNewIndustryBtn.parentElement.style.display = 'none';
    }
}

function setIndustryValue(value) {
    if (!elements.industrySearch || !elements.industry) return;
    
    elements.industrySearch.value = value;
    elements.industry.value = value;
    AppState.companyConfig.industry = value;
    
    // Hide dropdown
    elements.industryDropdown.classList.add('hidden');
}

function showIndustryDropdown() {
    if (!elements.industryDropdown) return;
    elements.industryDropdown.classList.remove('hidden');
}

function hideIndustryDropdown() {
    if (!elements.industryDropdown) return;
    elements.industryDropdown.classList.add('hidden');
}

function updateHighlight(options, index) {
    // Remove existing highlight
    options.forEach(option => option.classList.remove('highlighted'));
    
    // Add highlight to current index
    if (index >= 0 && index < options.length) {
        options[index].classList.add('highlighted');
        options[index].scrollIntoView({ block: 'nearest' });
    }
}

// AI Analysis Configuration Functions
function updateModel() {
    if (!elements.aiModel || !elements.currentModelBadge || !elements.modelDescription) return;
    
    const selectedValue = elements.aiModel.value;
    const modelInfo = getModelInfo(selectedValue);
    
    // Update badge text and color class
    elements.currentModelBadge.textContent = modelInfo.name;
    elements.currentModelBadge.className = `model-badge ${modelInfo.provider}`;
    
    // Update description
    elements.modelDescription.textContent = modelInfo.description;
    
    // Update summary
    if (elements.summaryModel) {
        elements.summaryModel.textContent = modelInfo.name;
    }
    
    // Update app state
    AppState.analysisConfig.model = selectedValue;
    AppState.analysisConfig.modelName = modelInfo.name;
    saveStateToLocalStorage();
}

function getModelInfo(modelValue) {
    const modelMap = {
        'gemini-2.5-pro': {
            name: 'Gemini 2.5 Pro',
            provider: 'gemini',
            description: 'Google\'s most advanced model with exceptional multimodal capabilities and reasoning.'
        },
        'claude-opus-4-1-20250805': {
            name: 'Claude Opus 4.1',
            provider: 'claude',
            description: 'The most powerful Claude model for complex reasoning and comprehensive analysis.'
        },
        'claude-sonnet-4-20250514': {
            name: 'Claude Sonnet 4',
            provider: 'claude',
            description: 'Advanced reasoning with balanced performance and speed. Excellent for comprehensive business analysis.'
        },
        'claude-3-7-sonnet-20250219': {
            name: 'Claude 3.7 Sonnet',
            provider: 'claude',
            description: 'Enhanced Claude 3.5 with improved analytical capabilities and business insights.'
        },
        'gpt-5-2025-08-07': {
            name: 'ChatGPT 5',
            provider: 'chatgpt',
            description: 'OpenAI\'s latest model with advanced reasoning and comprehensive knowledge base.'
        }
    };
    
    return modelMap[modelValue] || modelMap['claude-sonnet-4-20250514'];
}

function updateTemperature() {
    if (!elements.tempSlider || !elements.tempValue || !elements.tempLabel || !elements.tempDescription) return;
    
    const value = parseFloat(elements.tempSlider.value);
    elements.tempValue.textContent = value.toFixed(1);
    
    // Remove all temp classes
    elements.tempLabel.classList.remove('focused', 'balanced', 'creative', 'diverse');
    
    // Update label and description based on value
    let label = '';
    let className = '';
    let description = '';
    
    if (value <= 0.3) {
        label = 'Focused';
        className = 'focused';
        description = 'Very focused and deterministic analysis';
    } else if (value <= 0.7) {
        label = 'Balanced';
        className = 'balanced';
        description = 'Balanced approach with consistent insights';
    } else if (value <= 0.8) {
        label = 'Creative';
        className = 'creative';
        description = 'Creative analysis with varied perspectives';
    } else {
        label = 'Diverse';
        className = 'diverse';
        description = 'Highly creative with diverse interpretations';
    }
    
    elements.tempLabel.textContent = label;
    elements.tempLabel.classList.add(className);
    elements.tempDescription.textContent = description;
    
    // Update summary
    if (elements.summaryTemp) {
        elements.summaryTemp.textContent = `${value.toFixed(1)} - ${label}`;
    }
    
    // Update app state
    AppState.analysisConfig.temperature = value;
    saveStateToLocalStorage();
}

function updateCharCounter() {
    if (!elements.customInstructions || !elements.charCounter) return;
    
    const length = elements.customInstructions.value.length;
    const maxLength = 500;
    elements.charCounter.textContent = `${length} / ${maxLength} characters`;
    
    // Update summary
    if (elements.summaryInstructions) {
        if (length > 0) {
            elements.summaryInstructions.textContent = `${length} characters`;
        } else {
            elements.summaryInstructions.textContent = 'None';
        }
    }
    
    // Warn if approaching limit
    if (length > maxLength * 0.9) {
        elements.charCounter.style.color = 'var(--color-error)';
    } else {
        elements.charCounter.style.color = 'var(--text-tertiary)';
    }
}

function showApiLoading() {
    const icons = elements.apiStatusIcon.querySelectorAll('.icon');
    icons.forEach(icon => icon.classList.add('hidden'));
    elements.apiStatusIcon.querySelector('.loading-icon').classList.remove('hidden');
    elements.viewResearchContextBtn.classList.add('hidden');
}

function showApiSuccess() {
    const icons = elements.apiStatusIcon.querySelectorAll('.icon');
    icons.forEach(icon => icon.classList.add('hidden'));
    elements.apiStatusIcon.querySelector('.success-icon').classList.remove('hidden');
    elements.viewResearchContextBtn.classList.remove('hidden');
}

function showApiError() {
    const icons = elements.apiStatusIcon.querySelectorAll('.icon');
    icons.forEach(icon => icon.classList.add('hidden'));
    elements.apiStatusIcon.querySelector('.error-icon').classList.remove('hidden');
    elements.viewResearchContextBtn.classList.add('hidden');
    AppState.marketResearchData = null;
}

function populateResearchModal() {
    if (!AppState.marketResearchData || !elements.researchSections) return;
    
    // Convert entire research data to plain text format (similar to Campaign Goals)
    const plainTextContent = formatDataAsPlainText(AppState.marketResearchData);
    
    elements.researchSections.innerHTML = `
        <div class="research-section" data-section="fullContext">
            <div class="research-section-header">
                <h4 class="research-section-title">Complete Market Research Context</h4>
                <p class="section-description">Edit the entire research context as plain text. This will be used to provide comprehensive context to the AI analysis.</p>
            </div>
            <div class="research-section-content">
                <textarea class="research-section-text full-context-text" data-section="fullContext" placeholder="Paste or edit your market research context here...">${plainTextContent}</textarea>
            </div>
        </div>
    `;
}

// Helper function to format data as readable plain text
function formatDataAsPlainText(data, prefix = '', parentKey = '') {
    if (!data) return '';
    
    // Fields to completely exclude
    const excludeFields = [
        'generation_cost', 'generationCost', 'rating', 'reviews', 'verified', 
        'location_link', 'locationLink', 'reviews_link', 'reviewsLink', 
        'google_reviews', 'googleReviews', 'link', 'google_profile', 'googleProfile',
        'competitors'
    ];
    
    // Check if current key should be excluded
    const shouldExclude = (key) => {
        const lowerKey = key.toLowerCase().replace(/_/g, '');
        return excludeFields.some(field => 
            lowerKey === field.toLowerCase().replace(/_/g, '')
        );
    };
    
    let text = '';
    
    if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data)) {
            // Skip competitor arrays entirely
            if (parentKey.toLowerCase().includes('competitor')) {
                return '';
            }
            
            data.forEach((item, index) => {
                if (typeof item === 'object') {
                    const itemText = formatDataAsPlainText(item, prefix + '  ', parentKey);
                    if (itemText.trim()) {
                        text += `${prefix}${index + 1}. ${itemText}`;
                    }
                } else {
                    text += `${prefix}• ${item}\n`;
                }
            });
        } else {
            Object.entries(data).forEach(([key, value]) => {
                // Skip excluded fields
                if (shouldExclude(key)) return;
                
                // Skip history entries with rating/reviews
                if (parentKey.toLowerCase() === 'history' && 
                    (key.toLowerCase() === 'rating' || key.toLowerCase() === 'reviews')) {
                    return;
                }
                
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                
                if (typeof value === 'object' && value !== null) {
                    const nestedText = formatDataAsPlainText(value, prefix + '  ', key);
                    if (nestedText.trim()) {
                        text += `${prefix}${formattedKey}:\n`;
                        text += nestedText;
                        if (!nestedText.endsWith('\n')) text += '\n';
                    }
                } else if (Array.isArray(value)) {
                    const arrayText = formatDataAsPlainText(value, prefix + '  ', key);
                    if (arrayText.trim()) {
                        text += `${prefix}${formattedKey}:\n`;
                        text += arrayText;
                        if (!arrayText.endsWith('\n')) text += '\n';
                    }
                } else if (value !== null && value !== undefined && value !== '') {
                    text += `${prefix}${formattedKey}: ${value}\n`;
                }
            });
        }
    } else {
        text = data.toString() + '\n';
    }
    
    return text;
}

// Step 3: Time Range Functions
function initializeCurrentDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }) + ' ' + now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
    });
    
    if (elements.currentDateTime) {
        elements.currentDateTime.textContent = dateTimeString;
    }
    
    // Set max date for date inputs to prevent future dates
    const todayString = now.toISOString().split('T')[0];
    if (elements.startDate) {
        elements.startDate.setAttribute('max', todayString);
    }
    if (elements.endDate) {
        elements.endDate.setAttribute('max', todayString);
    }
}

// Test function to verify 30-day preset works
function test30DayPreset() {
    console.log('Testing 30-day preset...');
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    console.log('Setting dates:', startDate, 'to', endDate);
    elements.startDate.value = startDate;
    elements.endDate.value = endDate;
    updateDateSummary();
}

function setTimeRange(range) {
    const now = new Date();
    let startDate, endDate;
    
    switch (range) {
        case 'last-month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            startDate = lastMonth.toISOString().split('T')[0];
            endDate = lastMonthEnd.toISOString().split('T')[0];
            break;
            
        case 'this-month':
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate = thisMonthStart.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
            
        case '30':
        case '90':
        case '120':
        case '150':
        case '180':
            const days = parseInt(range);
            const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
            startDate = pastDate.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            break;
            
        case 'custom':
            // For custom range, don't set dates - let user pick manually
            return;
            
        default:
            return;
    }
    
    // Set the date inputs
    elements.startDate.value = startDate;
    elements.endDate.value = endDate;
    
    updateDateSummary();
}

function updateDateSummary() {
    const startDate = elements.startDate.value;
    const endDate = elements.endDate.value;
    
    if (startDate && endDate) {
        // Parse dates properly to avoid timezone issues
        // When parsing YYYY-MM-DD, append time to ensure local timezone
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        
        // Calculate duration in days
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        elements.selectedRange.textContent = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        elements.rangeDuration.textContent = `${duration} days`;
        
        AppState.timeRange = { startDate, endDate, duration };
        
        // Smart preset detection
        detectAndSelectPreset(start, end, duration);
    } else {
        elements.selectedRange.textContent = 'No range selected';
        elements.rangeDuration.textContent = '0 days';
        // Clear any active time card when no dates are selected
        elements.timeCards.forEach(card => {
            card.classList.remove('active');
        });
    }
}

function detectAndSelectPreset(startDate, endDate, duration) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const selectedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    
    // Check if end date is today or very recent
    const daysDiffFromToday = Math.abs((selectedEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isEndTodayish = daysDiffFromToday <= 2;
    
    if (isEndTodayish) {
        // Check for day-based presets (30, 90, 120, 150, 180 days) - be more lenient
        const dayPresets = [30, 90, 120, 150, 180];
        for (const days of dayPresets) {
            // Allow a 2-day tolerance for matching (duration is now inclusive)
            // Subtract 1 from duration for comparison since duration includes both start and end
            if (Math.abs((duration - 1) - days) <= 2) {
                selectTimeCard(days.toString());
                return;
            }
        }
    }
    
    // Check for "This Month" preset
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysDiffThisMonth = Math.abs((selectedStart.getTime() - thisMonthStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiffThisMonth <= 2 && isEndTodayish) {
        selectTimeCard('this-month');
        return;
    }
    
    // Check for "Last Month" preset
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const daysDiffLastMonthStart = Math.abs((selectedStart.getTime() - lastMonthStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysDiffLastMonthEnd = Math.abs((selectedEnd.getTime() - lastMonthEnd.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiffLastMonthStart <= 2 && daysDiffLastMonthEnd <= 2) {
        selectTimeCard('last-month');
        return;
    }
    
    // If no preset matches, select Custom Range
    selectTimeCard('custom');
}

function selectTimeCard(range) {
    // Remove active class from all cards
    elements.timeCards.forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    const selectedCard = document.querySelector(`[data-range="${range}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
}

function handleTimeCardClick(event) {
    const card = event.currentTarget;
    const range = card.getAttribute('data-range');
    
    // Time card clicked (removed console log to reduce noise)
    selectTimeCard(range);
    setTimeRange(range);
}

function validateTimeRange() {
    if (!AppState.timeRange.startDate || !AppState.timeRange.endDate) {
        showError('Please select a time range for analysis');
        return false;
    }
    
    if (AppState.timeRange.duration <= 0) {
        showError('End date must be after start date');
        return false;
    }
    
    updateSectionStatus('timerange', 'Complete');
    return true;
}

// Step 4: Performance Data Functions
function generateFileUploadCards() {
    const container = elements.fileUploads;
    container.innerHTML = '';
    
    if (!AppState.requiredTactics.length) {
        container.innerHTML = '<p class="no-uploads">No tactics detected. Please complete the campaign data step first.</p>';
        return;
    }
    
    AppState.requiredTactics.forEach(tacticName => {
        const uploadCard = document.createElement('div');
        uploadCard.className = 'upload-card';
        uploadCard.innerHTML = `
            <div class="upload-header">
                <h4>${tacticName}</h4>
                <div class="upload-status" id="status-${tacticName}">
                    <span class="status-text">Pending</span>
                </div>
            </div>
            <p class="upload-description">Upload ${tacticName} performance data (CSV format)</p>
            <div class="upload-area" id="upload-${tacticName}">
                <input type="file" accept=".csv" class="file-input" data-tactic="${tacticName}" id="file-${tacticName}">
                <label for="file-${tacticName}" class="upload-label">
                    <span class="upload-icon">=�</span>
                    <span class="upload-text">Choose CSV file or drag & drop</span>
                </label>
            </div>
            <div class="uploaded-files" id="files-${tacticName}">
                <!-- Uploaded files will be displayed here -->
            </div>
            <div class="upload-actions">
                <button type="button" class="reports-btn" data-tactic="${tacticName}">
                    Reports
                </button>
            </div>
        `;
        container.appendChild(uploadCard);
    });
    
    // Update total files count
    elements.filesTotal.textContent = AppState.requiredTactics.length;
    
    // Add event listeners for reports buttons
    container.querySelectorAll('.reports-btn').forEach(button => {
        button.addEventListener('click', handleReportsClick);
    });
    
    // Setup file upload handlers
    setupFileUploadHandlers();
}

// Report URL Generation Functions
function getReportTypeForTactic(tacticName) {
    // Map tactic names to report types based on enhanced_tactic_categories.json dataValue mappings
    const tacticMappings = {
        // Email Marketing
        'emailMarketing': 'emailMarketing',
        'Email Marketing': 'emailMarketing',
        '1:1 Marketing': 'emailMarketing',
        'B2B (Business Targeting)': 'emailMarketing',
        'B2C (Consumer Targeting)': 'emailMarketing',
        
        // Beta/Overall
        'beta': 'overall',
        'Premium Plus': 'overall',
        'Nextdoor': 'nextdoor',
        'Netflix': 'overall',
        'Demand Gen': 'overall',
        
        // Programmatic Audio
        'programmaticAudio': 'programmaticAudio',
        'Programmatic Audio': 'programmaticAudio',
        
        // Addressable Solutions
        'addressableDisplay': 'addressableDisplay',
        'Addressable Display': 'addressableDisplay',
        'Addressable Solutions - Addressable Display': 'addressableDisplay',
        'geofence': 'geofence',
        'Geofencing with Foot Traffic': 'geofence',
        'Addressable Solutions - Geofencing with Foot Traffic': 'geofence',
        'addressableStv': 'addressableStv',
        'Addressable STV': 'addressableStv',
        'addressableVideo': 'addressableVideo',
        'Addressable Video': 'addressableVideo',
        
        // Blended Tactics
        'targetedDisplay': 'targetedDisplay',
        'Targeted Display': 'targetedDisplay',
        'Blended Tactics - Targeted Display': 'targetedDisplay',
        'socialDisplay': 'socialDisplay',
        'Social Display': 'socialDisplay',
        'targetedNative': 'targetedNative',
        'Targeted Native': 'targetedNative',
        'targetedVideo': 'targetedVideo',
        'Targeted Video': 'targetedVideo',
        
        // STV/Streaming
        'locality': 'locality',
        'Video': 'locality',
        'streamingStv': 'streamingStv',
        'STV': 'streamingStv',
        'Streaming TV OTT': 'streamingStv',
        'Channel Targeted OTT': 'streamingStv',
        'Advanced Audience Targeting OTT': 'streamingStv',
        'Run of Network': 'streamingStv',
        'Hulu - Audience Targeted': 'hulu',
        'Hulu - RON': 'hulu',
        'Polk': 'streamingStv',
        'youtubeTv': 'youtubeTv',
        'YouTube TV - Audience Targeted': 'youtubeTv',
        'YouTube TV - Run of Network': 'youtubeTv',
        
        // Social Platforms
        'meta': 'meta',
        'Meta': 'meta',
        'Facebook - Link Click': 'meta',
        'Facebook - Awareness': 'meta',
        'Facebook - ThruPlay': 'meta',
        'Facebook - Post Engagement': 'meta',
        'Facebook - Lead Gen': 'meta',
        'Link Click': 'meta',
        'snapchat': 'snapchat',
        'Snapchat': 'snapchat',
        'Snapchat - Aware': 'snapchat',
        'Snapchat - Swipe Up': 'snapchat',
        'tiktok': 'tiktok',
        'TikTok': 'tiktok',
        'TikTok - Awareness': 'tiktok',
        'TikTok - Link Click': 'tiktok',
        'pinterest': 'pinterest',
        'Pinterest': 'pinterest',
        'Pinterest - Link Click': 'pinterest',
        'Pinterest - Awareness': 'pinterest',
        'linkedIn': 'linkedin',
        'LinkedIn': 'linkedin',
        'LinkedIn - Link Click': 'linkedin',
        
        // Search
        'sem': 'sem',
        'SEM': 'sem',
        'Google Search': 'sem',
        'spark': 'spark',
        'Spark': 'spark',
        
        // YouTube
        'youtube': 'youtube',
        'YouTube': 'youtube',
        'YouTube True View': 'youtube',
        'YouTube Bumper': 'youtube',
        
        // Local/Display
        'cpmDisplay': 'localDisplay',
        'localDisplay': 'localDisplay',
        'CPM Display': 'localDisplay',
        'Banner Ads': 'localDisplay',
        'Amplifier': 'localDisplay',
        'Ignite Network': 'localDisplay',
        'Local Network': 'localDisplay',
        'Mobile Billboard': 'localDisplay',
        'Station Site Takeovers': 'localDisplay',
        
        // Social Mentions
        'socialMention': 'socialMention',
        'SSM': 'socialMention',
        'Sponsored Social Mentions - Link Click': 'socialMention',
        'Sponsored Social Mentions - Awareness': 'socialMention',
        'Sponsored Social Mentions - ThruPlay': 'socialMention',
        
        // Sponsorship/Endorsements
        'Content Sponsorship': 'digitalEndorsement',
        'Contest Sponsorship': 'digitalEndorsement',
        'Listen Live Sponsorship': 'digitalEndorsement',
        'Station App Sponsorship': 'digitalEndorsement',
        'Advertorial': 'digitalEndorsement',
        'Booth': 'digitalEndorsement',
        'Endorsement': 'digitalEndorsement'
    };

    // Try direct match first
    if (tacticMappings[tacticName]) {
        return tacticMappings[tacticName];
    }

    // Try case-insensitive match
    const lowerTacticName = tacticName.toLowerCase();
    for (const [key, value] of Object.entries(tacticMappings)) {
        if (key.toLowerCase() === lowerTacticName || value.toLowerCase() === lowerTacticName) {
            return value;
        }
    }

    // Default fallback
    return 'overall';
}

function generateReportURL(tacticName) {
    if (!AppState.campaignData || !AppState.timeRange) {
        console.warn('Missing campaign data or time range for report URL generation');
        return null;
    }

    const reportType = getReportTypeForTactic(tacticName);
    
    // Try multiple possible field names for the Wide Orbit number
    let wideOrbitNumber = AppState.campaignData.wideOrbitNumber || 
                         AppState.campaignData.woOrderNumber ||
                         AppState.campaignData.orderNumber ||
                         AppState.campaignData.orderId ||
                         AppState.campaignData.id;
    
    // If not found at top level, try to get it from the first line item
    if (!wideOrbitNumber && AppState.campaignData.lineItems && AppState.campaignData.lineItems.length > 0) {
        const firstLineItem = AppState.campaignData.lineItems[0];
        wideOrbitNumber = firstLineItem.woOrderNumber || firstLineItem.orderNumber;
    }
    
    // Only log debug info if Wide Orbit number is not found
    if (!wideOrbitNumber) {
        console.log('Debug: Campaign data keys:', Object.keys(AppState.campaignData));
        console.log('Debug: No Wide Orbit number found in campaign data');
    }
    
    if (!wideOrbitNumber) {
        console.warn('No Wide Orbit number found in campaign data');
        return null;
    }

    // Format dates for URL
    const startDate = new Date(AppState.timeRange.startDate);
    const endDate = new Date(AppState.timeRange.endDate);
    
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    const startDateFormatted = startDate.toISOString();
    const endDateFormatted = endDate.toISOString();

    const baseURL = 'https://townsquarelumina.com/lumina/view/reports/max';
    const params = new URLSearchParams({
        reportType: reportType,
        timePeriod: 'custom',
        startDate: startDateFormatted,
        endDate: endDateFormatted,
        woOrderNumber: wideOrbitNumber,
        reportFormat: 'web'
    });

    return `${baseURL}?${params.toString()}`;
}

function handleReportsClick(event) {
    const button = event.target.closest('.reports-btn');
    const tacticName = button.getAttribute('data-tactic');
    
    const reportURL = generateReportURL(tacticName);
    
    if (reportURL) {
        // Open the report in a new tab
        window.open(reportURL, '_blank');
    } else {
        // Show error message
        alert('Unable to generate report link. Please ensure campaign data and time range are set.');
    }
}

function setupFileUploadHandlers() {
    document.querySelectorAll('.file-input').forEach(input => {
        input.addEventListener('change', handleFileUpload);
    });
    
    setupRemoveButtonHandlers();
}

function setupRemoveButtonHandlers() {
    document.querySelectorAll('.remove-file-btn').forEach(btn => {
        btn.addEventListener('click', handleFileRemove);
    });
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    const tacticName = event.target.dataset.tactic;
    
    if (!file) return;
    
    // Validate file
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please upload a CSV file');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError('File size must be less than 10MB');
        return;
    }
    
    try {
        // Store file info
        AppState.uploadedFiles[tacticName] = {
            file: file,
            name: file.name,
            size: file.size,
            uploaded: true
        };
        
        // Update UI
        showUploadSuccess(tacticName, file.name);
        updateUploadProgress();
        
    } catch (error) {
        showError(`Error uploading file: ${error.message}`);
    }
}

function handleFileRemove(event) {
    const tacticName = event.target.dataset.tactic;
    const filename = event.target.dataset.filename;
    
    // Remove from state
    delete AppState.uploadedFiles[tacticName];
    
    // Remove the specific file entry from UI
    const fileEntry = event.target.closest('.uploaded-file-entry');
    if (fileEntry) {
        fileEntry.remove();
    }
    
    // Reset file input and status if no more files
    const filesContainer = document.getElementById(`files-${tacticName}`);
    const fileInput = document.getElementById(`file-${tacticName}`);
    const uploadArea = document.getElementById(`upload-${tacticName}`);
    const statusEl = document.getElementById(`status-${tacticName}`);
    const uploadText = uploadArea.querySelector('.upload-text');
    
    if (filesContainer && filesContainer.children.length === 0) {
        // No more files, reset to original state
        fileInput.value = '';
        uploadArea.style.display = 'block';
        if (uploadText) {
            uploadText.textContent = 'Choose CSV file or drag & drop';
        }
        statusEl.innerHTML = '<span class="status-text">Pending</span>';
    }
    
    updateUploadProgress();
}

function showUploadSuccess(tacticName, filename) {
    const uploadArea = document.getElementById(`upload-${tacticName}`);
    const filesContainer = document.getElementById(`files-${tacticName}`);
    const statusEl = document.getElementById(`status-${tacticName}`);
    
    // Keep upload area visible for additional files
    uploadArea.style.display = 'block';
    
    // Update upload text to indicate ability to upload more
    const uploadText = uploadArea.querySelector('.upload-text');
    if (uploadText) {
        uploadText.textContent = 'Upload additional files or drag & drop';
    }
    // Create file entry
    const fileEntry = document.createElement('div');
    fileEntry.className = 'uploaded-file-entry';
    fileEntry.innerHTML = `
        <div class="file-info">
            <span class="filename">${filename}</span>
        </div>
        <div class="file-actions">
            <button type="button" class="remove-file-btn" data-tactic="${tacticName}" data-filename="${filename}">Remove</button>
        </div>
    `;
    
    // Add to files container
    filesContainer.appendChild(fileEntry);
        // Update status
    statusEl.innerHTML = '<span class="status-text success">✓ Uploaded</span>';

    // Re-setup remove button handlers
    setupRemoveButtonHandlers();
}

function updateUploadProgress() {
    const uploadedCount = Object.keys(AppState.uploadedFiles).length;
    const totalCount = AppState.requiredTactics.length;
    const progressPercent = totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0;
    
    elements.filesUploaded.textContent = uploadedCount;
    elements.uploadProgressFill.style.width = `${progressPercent}%`;
    
    // Enable continue button if all files uploaded
    if (uploadedCount === totalCount && totalCount > 0) {
        elements.continueToAnalysisBtn.disabled = false;
        elements.continueToAnalysisBtn.classList.remove('disabled');
        updateSectionStatus('performance', 'Complete');
    } else {
        elements.continueToAnalysisBtn.disabled = true;
        elements.continueToAnalysisBtn.classList.add('disabled');
    }
}

// Step 5: AI Analysis Functions
function validateAnalysisConfig() {
    // Get selected tone from active card
    const activeToneCard = document.querySelector('.tone-card.active');
    const selectedTone = activeToneCard ? activeToneCard.getAttribute('data-tone') : 'professional';
    
    // Get model info
    const modelValue = elements.aiModel.value || 'claude-sonnet-4-20250514';
    const modelInfo = getModelInfo(modelValue);
    
    AppState.analysisConfig = {
        model: modelValue,
        modelName: modelInfo.name,
        temperature: parseFloat(elements.tempSlider.value) || 0.5,
        tone: selectedTone,
        customInstructions: elements.customInstructions.value.trim()
    };
    
    return true;
}

async function generateAnalysis() {
    if (!validateAnalysisConfig()) return;
    
    try {
        showLoadingState('analysis-loading', 'Analyzing your campaign data...');
        elements.generateAnalysisBtn.disabled = true;
        
        // Check if this is demo mode
        if (AppState.campaignData && AppState.campaignData.id === '507f1f77bcf86cd799439011') {
            // Use demo analysis for demo mode
            setTimeout(() => {
                const demoAnalysis = generateDemoAnalysis();
                AppState.analysisResults = demoAnalysis;
                
                // Hide current step and show results
                showSection('analysis-results');
                populateAnalysisResults(demoAnalysis);
                
                updateSectionStatus('analysis', 'Complete');
                EventBus.emit('analysisComplete', demoAnalysis);
                
                hideLoadingState('analysis-loading');
                elements.generateAnalysisBtn.disabled = false;
            }, 3000); // Simulate processing time
            return;
        }
        
        // Get AI configuration from UI
        const aiModel = document.getElementById('ai-model').value;
        const temperature = parseFloat(document.getElementById('temp-slider').value);
        const tone = document.querySelector('.tone-card.active')?.getAttribute('data-tone') || 'professional';
        const customInstructions = document.getElementById('custom-instructions').value;
        
        // Prepare analysis payload for real data
        const analysisPayload = {
            campaignData: AppState.campaignData,
            companyInfo: AppState.companyConfig,  // Changed to match backend expectation
            timeRange: AppState.timeRange,
            uploadedFiles: AppState.uploadedFiles,  // Send the actual files, not just keys
            tactics: AppState.requiredTactics || [],
            aiConfig: {
                model: aiModel,
                temperature: temperature,
                tone: tone,
                customInstructions: customInstructions
            },
            marketResearchContext: AppState.marketResearchContext // Include plain text market research context
        };
        
        // Call analysis API
        const analysisResult = await makeAPICall('analyze.php', analysisPayload);
        
        AppState.analysisResults = analysisResult;
        
        // Hide current step and show results
        showSection('analysis-results');
        populateAnalysisResults(analysisResult);
        
        updateSectionStatus('analysis', 'Complete');
        EventBus.emit('analysisComplete', analysisResult);
        
    } catch (error) {
        showError(`Analysis failed: ${error.message}`);
    } finally {
        hideLoadingState('analysis-loading');
        elements.generateAnalysisBtn.disabled = false;
    }
}

function generateDemoAnalysis() {
    return {
        sections: [
            {
                title: "Executive Summary",
                content: "The Q1 2024 Digital Marketing Campaign for Sample Company Inc. has demonstrated strong performance across all digital channels. The multi-platform approach utilizing Facebook, Google, and LinkedIn has effectively reached diverse audience segments with a total budget allocation of $75,000.<br><br>Key highlights include exceptional engagement rates on Instagram Stories, strong lead generation through Google Search ads, and successful B2B outreach via LinkedIn Sponsored Content. The campaign has achieved a 95% delivery rate with over 1.45 million impressions generated to date."
            },
            {
                title: "Performance Analysis by Platform",
                content: "<strong>Facebook/Instagram Performance:</strong><br>The Instagram Stories campaign has exceeded expectations with a CTR of 2.8%, significantly above the industry average of 1.5%. The retargeting (RTG) and keyword targeting (KWT) strategies have proven highly effective, delivering a 35% lower cost-per-acquisition than projected.<br><br><strong>Google Search Performance:</strong><br>Search campaigns are delivering strong ROI with an average conversion rate of 4.2%. The SEM strategy has successfully captured high-intent traffic, with 'Sample Company' branded searches increasing by 150% during the campaign period.<br><br><strong>LinkedIn Performance:</strong><br>B2B engagement has been robust with a 3.5% engagement rate on sponsored content. Decision-maker targeting has resulted in 450 qualified leads, with a cost-per-lead 20% below industry benchmarks."
            },
            {
                title: "Trend Analysis",
                content: "Monthly performance data reveals consistent improvement across all platforms:<br><br>• January: Initial learning phase with optimization of targeting parameters<br>• February: 25% improvement in CTR following creative refresh<br>• March: Peak performance with highest conversion rates recorded<br><br>Seasonal trends indicate stronger performance during weekdays for B2B content, while consumer-focused campaigns see better engagement during evenings and weekends."
            },
            {
                title: "Optimization Recommendations",
                content: "Based on the analysis, we recommend the following optimizations:<br><br>1. <strong>Increase Instagram Budget Allocation:</strong> Given the exceptional performance, consider reallocating 15% of budget from lower-performing channels<br><br>2. <strong>Expand Google Search Keywords:</strong> High conversion rates suggest opportunity for keyword expansion in related categories<br><br>3. <strong>LinkedIn Content Diversification:</strong> Test video content and carousel ads to potentially improve engagement rates further<br><br>4. <strong>Implement Cross-Platform Retargeting:</strong> Create audience segments from high-performing platforms for cross-channel remarketing<br><br>5. <strong>A/B Test Ad Scheduling:</strong> Optimize delivery times based on platform-specific engagement patterns identified"
            },
            {
                title: "Competitive Insights",
                content: "Comparative analysis against industry benchmarks reveals Sample Company Inc. is outperforming competitors in several key areas:<br><br>• CTR rates are 45% above industry average across all platforms<br>• Cost-per-acquisition is 30% lower than competitive benchmark<br>• Brand awareness lift of 22% exceeds typical campaign performance by 8 percentage points<br><br>Competitor analysis suggests opportunity to capture additional market share through increased investment in emerging platforms and continued optimization of current successful strategies."
            }
        ]
    };
}

function populateAnalysisResults(results) {
    const outputContainer = elements.analysisOutput;
    const tocContainer = document.getElementById('report-toc');
    
    // Update report metadata
    const reportCompany = document.getElementById('report-company');
    const reportDateRange = document.getElementById('report-date-range');
    const reportGeneratedDate = document.getElementById('report-generated-date');
    
    if (reportCompany && AppState.campaignData) {
        reportCompany.textContent = AppState.campaignData.companyName || 'Unknown Company';
    }
    
    if (reportDateRange && AppState.timeRange) {
        const startDate = AppState.timeRange.startDate || 'N/A';
        const endDate = AppState.timeRange.endDate || 'N/A';
        
        // Format dates as MM/DD/YY
        const formatDate = (dateStr) => {
            if (dateStr === 'N/A') return dateStr;
            try {
                // Append time to ensure local timezone parsing
                const date = new Date(dateStr + 'T00:00:00');
                return date.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                });
            } catch (e) {
                return dateStr;
            }
        };
        
        const formattedStart = formatDate(startDate);
        const formattedEnd = formatDate(endDate);
        reportDateRange.textContent = `Analysis Range: ${formattedStart} - ${formattedEnd}`;
    }
    
    if (reportGeneratedDate) {
        const now = new Date();
        reportGeneratedDate.textContent = `Generated ${now.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }
    
    // Clear existing content
    outputContainer.innerHTML = '';
    if (tocContainer) tocContainer.innerHTML = '';
    
    let sections = [];
    
    if (results && results.sections && Array.isArray(results.sections)) {
        // Handle array format (for demo)
        sections = results.sections;
    } else if (results && results.sections && typeof results.sections === 'object') {
        // Handle object format (from API) - convert to sections array
        sections = Object.entries(results.sections).map(([key, value]) => ({
            title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            content: value
        }));
    }
    
    if (sections.length > 0) {
        // Generate table of contents
        if (tocContainer) {
            sections.forEach((section, index) => {
                const tocLink = document.createElement('a');
                tocLink.className = 'toc-link';
                tocLink.textContent = section.title;
                tocLink.href = `#section-${index}`;
                tocLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetSection = document.getElementById(`section-${index}`);
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        
                        // Update active state
                        document.querySelectorAll('.toc-link').forEach(link => {
                            link.classList.remove('active');
                        });
                        tocLink.classList.add('active');
                    }
                });
                
                if (index === 0) {
                    tocLink.classList.add('active');
                }
                
                tocContainer.appendChild(tocLink);
            });
        }
        
        // Generate analysis sections
        sections.forEach((section, index) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'analysis-section';
            sectionDiv.id = `section-${index}`;
            
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = section.title;
            
            const sectionContent = document.createElement('div');
            sectionContent.className = 'section-content';
            sectionContent.innerHTML = section.content;
            
            sectionDiv.appendChild(sectionTitle);
            sectionDiv.appendChild(sectionContent);
            outputContainer.appendChild(sectionDiv);
        });
        
        // Add scroll listener to update active TOC item
        if (tocContainer) {
            const observerOptions = {
                root: null,
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const index = entry.target.id.replace('section-', '');
                        document.querySelectorAll('.toc-link').forEach((link, i) => {
                            link.classList.toggle('active', i === parseInt(index));
                        });
                    }
                });
            }, observerOptions);
            
            document.querySelectorAll('.analysis-section').forEach(section => {
                observer.observe(section);
            });
            
            // Additional scroll listener to handle bottom of page
            let isScrolling = false;
            window.addEventListener('scroll', () => {
                if (isScrolling) return;
                isScrolling = true;
                
                requestAnimationFrame(() => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const windowHeight = window.innerHeight;
                    const documentHeight = document.documentElement.scrollHeight;
                    
                    // Check if user has scrolled to bottom (within 50px)
                    if (scrollTop + windowHeight >= documentHeight - 50) {
                        // Highlight the last section
                        const tocLinks = document.querySelectorAll('.toc-link');
                        tocLinks.forEach((link, index) => {
                            link.classList.toggle('active', index === tocLinks.length - 1);
                        });
                    }
                    
                    isScrolling = false;
                });
            });
        }
    } else {
        outputContainer.innerHTML = '<p>No analysis results available.</p>';
    }
}

// Analysis Report Functions
function showNewAnalysisModal() {
    document.getElementById('new-analysis-modal').classList.remove('hidden');
}

function showExportModal() {
    document.getElementById('export-modal').classList.remove('hidden');
}

function startNewAnalysisWithSameData() {
    // Close modal
    document.getElementById('new-analysis-modal').classList.add('hidden');
    
    // Reset to AI Analysis step but keep campaign data
    AppState.companyConfig = {};
    AppState.timeRange = {};
    AppState.uploadedFiles = {};
    AppState.analysisResults = null;
    AppState.removedLineItems = new Set();
    AppState.tacticLineItems = {};
    
    // Clear forms except campaign data
    if (elements.companyName) elements.companyName.value = '';
    if (elements.industry) elements.industry.value = '';
    if (elements.campaignGoals) elements.campaignGoals.value = '';
    if (elements.additionalNotes) elements.additionalNotes.value = '';
    if (elements.startDate) elements.startDate.value = '';
    if (elements.endDate) elements.endDate.value = '';
    
    // Hide analysis results and show step 2
    document.getElementById('analysis-results').classList.add('hidden');
    showSection('step-company-info');
    updateStepProgress(2);
    
    console.log('Starting new analysis with same campaign data');
}

function clearAndStartOver() {
    // Close modal and call full reset
    document.getElementById('new-analysis-modal').classList.add('hidden');
    clearAndReset();
}

async function copyAnalysisToClipboard() {
    try {
        const analysisContent = document.getElementById('analysis-output');
        if (!analysisContent) {
            showError('No analysis content to copy');
            return;
        }
        
        // Create plain text version of the analysis
        let textContent = '';
        
        // Add report header
        const reportTitle = document.querySelector('.report-title');
        const reportCompany = document.getElementById('report-company');
        const reportDateRange = document.getElementById('report-date-range');
        const reportGeneratedDate = document.getElementById('report-generated-date');
        
        if (reportTitle) textContent += `${reportTitle.textContent}\n`;
        if (reportCompany) textContent += `Company: ${reportCompany.textContent}\n`;
        if (reportDateRange) textContent += `${reportDateRange.textContent}\n`;
        if (reportGeneratedDate) textContent += `${reportGeneratedDate.textContent}\n\n`;
        
        // Add analysis sections
        const sections = analysisContent.querySelectorAll('.analysis-section');
        sections.forEach(section => {
            const title = section.querySelector('.section-title');
            const content = section.querySelector('.section-content');
            
            if (title) textContent += `## ${title.textContent}\n\n`;
            if (content) {
                // Convert HTML to plain text
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content.innerHTML;
                textContent += tempDiv.textContent + '\n\n';
            }
        });
        
        await navigator.clipboard.writeText(textContent);
        
        // Show success feedback
        const copyBtn = document.getElementById('copy-report');
        const originalText = copyBtn.querySelector('span').textContent;
        copyBtn.querySelector('span').textContent = 'Copied!';
        copyBtn.style.color = 'var(--color-green-600)';
        
        setTimeout(() => {
            copyBtn.querySelector('span').textContent = originalText;
            copyBtn.style.color = '';
        }, 2000);
        
    } catch (error) {
        showError('Failed to copy analysis to clipboard. Please try again.');
        console.error('Copy failed:', error);
    }
}

function exportAnalysis(format) {
    const analysisContent = document.getElementById('analysis-output');
    if (!analysisContent) {
        showError('No analysis content to export');
        return;
    }
    
    // Close export modal
    document.getElementById('export-modal').classList.add('hidden');
    
    // Get report metadata
    const reportTitle = document.querySelector('.report-title')?.textContent || 'Campaign Analysis Report';
    const reportCompany = document.getElementById('report-company')?.textContent || 'Company';
    const reportDateRange = document.getElementById('report-date-range')?.textContent || '';
    const reportGeneratedDate = document.getElementById('report-generated-date')?.textContent || '';
    
    // Generate filename
    const safeCompanyName = reportCompany.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Campaign_Analysis_${safeCompanyName}_${dateStr}`;
    
    switch (format) {
        case 'md':
            exportAsMarkdown(filename, reportTitle, reportCompany, reportDateRange, reportGeneratedDate, analysisContent);
            break;
        case 'pdf':
            exportAsPDF(filename, reportTitle, reportCompany, reportDateRange, reportGeneratedDate, analysisContent);
            break;
        case 'docx':
            exportAsDocx(filename, reportTitle, reportCompany, reportDateRange, reportGeneratedDate, analysisContent);
            break;
        default:
            showError('Unsupported export format');
    }
}

function exportAsMarkdown(filename, title, company, dateRange, generatedDate, content) {
    let markdown = `# ${title}\n\n`;
    markdown += `**Company:** ${company}\n`;
    markdown += `**${dateRange}**\n`;
    markdown += `**${generatedDate}**\n\n`;
    markdown += `---\n\n`;
    
    const sections = content.querySelectorAll('.analysis-section');
    sections.forEach(section => {
        const sectionTitle = section.querySelector('.section-title');
        const sectionContent = section.querySelector('.section-content');
        
        if (sectionTitle) {
            markdown += `## ${sectionTitle.textContent}\n\n`;
        }
        
        if (sectionContent) {
            // Convert HTML to markdown-friendly text
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sectionContent.innerHTML;
            
            // Basic HTML to markdown conversion
            let text = tempDiv.innerHTML
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i>(.*?)<\/i>/gi, '*$1*')
                .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
                .replace(/<ul>/gi, '')
                .replace(/<\/ul>/gi, '\n')
                .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
                .replace(/<[^>]*>/g, ''); // Remove remaining HTML tags
            
            markdown += text + '\n\n';
        }
    });
    
    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportAsPDF(filename, title, company, dateRange, generatedDate, content) {
    // For PDF export, we'll use the browser's print functionality
    // Create a new window with formatted content
    const printWindow = window.open('', '_blank');
    
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #CF0E0F; border-bottom: 2px solid #CF0E0F; padding-bottom: 10px; }
            h2 { color: #374151; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px; }
            .metadata { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .metadata p { margin: 5px 0; }
            .section { margin: 20px 0; }
            strong { color: #374151; }
            @media print { 
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <div class="metadata">
            <p><strong>Company:</strong> ${company}</p>
            <p><strong>${dateRange}</strong></p>
            <p><strong>${generatedDate}</strong></p>
        </div>
    `;
    
    const sections = content.querySelectorAll('.analysis-section');
    sections.forEach(section => {
        const sectionTitle = section.querySelector('.section-title');
        const sectionContent = section.querySelector('.section-content');
        
        htmlContent += '<div class="section">';
        if (sectionTitle) {
            htmlContent += `<h2>${sectionTitle.textContent}</h2>`;
        }
        if (sectionContent) {
            htmlContent += sectionContent.innerHTML;
        }
        htmlContent += '</div>';
    });
    
    htmlContent += `
        <script>
            window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
            };
        </script>
    </body>
    </html>`;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

function exportAsDocx(filename, title, company, dateRange, generatedDate, content) {
    // For DOCX export, we'll create an HTML file that Word can import
    let docContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
            body { font-family: Calibri, Arial, sans-serif; line-height: 1.6; }
            h1 { color: #CF0E0F; font-size: 24pt; }
            h2 { color: #374151; font-size: 16pt; margin-top: 20pt; }
            .metadata { background-color: #f8fafc; padding: 12pt; margin: 12pt 0; }
            p { margin: 6pt 0; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <div class="metadata">
            <p><b>Company:</b> ${company}</p>
            <p><b>${dateRange}</b></p>
            <p><b>${generatedDate}</b></p>
        </div>
    `;
    
    const sections = content.querySelectorAll('.analysis-section');
    sections.forEach(section => {
        const sectionTitle = section.querySelector('.section-title');
        const sectionContent = section.querySelector('.section-content');
        
        if (sectionTitle) {
            docContent += `<h2>${sectionTitle.textContent}</h2>`;
        }
        if (sectionContent) {
            docContent += sectionContent.innerHTML;
        }
    });
    
    docContent += '</body></html>';
    
    // Create and download file
    const blob = new Blob([docContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    elements.themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    elements.themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// Navigation Functions
function setupNavigation() {
    // Continue buttons
    if (elements.continueToTimeRangeBtn) {
        elements.continueToTimeRangeBtn.addEventListener('click', () => {
            showSection('step-time-range');
            updateStepProgress(2);
        });
    }
    
    if (elements.continueToCompanyBtn) {
        elements.continueToCompanyBtn.addEventListener('click', () => {
            if (validateTimeRange()) {
                showSection('step-company-info');
                updateStepProgress(3);
            }
        });
    }
    
    if (elements.continueToPerformanceBtn) {
        elements.continueToPerformanceBtn.addEventListener('click', () => {
            if (validateCompanyInfo()) {
                generateFileUploadCards();
                showSection('step-performance-data');
                updateStepProgress(4);
            }
        });
    }
    
    if (elements.continueToAnalysisBtn) {
        elements.continueToAnalysisBtn.addEventListener('click', () => {
            showSection('step-ai-analysis');
            updateStepProgress(5);
        });
    }
    
    // Back buttons
    elements.backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetStep = btn.id.replace('back-to-', '');
            let stepNumber, sectionId;
            
            switch (targetStep) {
                case 'campaign':
                    stepNumber = 1;
                    sectionId = 'step-campaign-data';
                    break;
                case 'timerange':
                    stepNumber = 2;
                    sectionId = 'step-time-range';
                    break;
                case 'company':
                    stepNumber = 3;
                    sectionId = 'step-company-info';
                    break;
                case 'performance':
                    stepNumber = 4;
                    sectionId = 'step-performance-data';
                    break;
            }
            
            if (stepNumber && sectionId) {
                showSection(sectionId);
                updateStepProgress(stepNumber);
            }
        });
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Clear & Reset button
    const clearResetBtn = document.getElementById('clear-reset-btn');
    if (clearResetBtn) {
        clearResetBtn.addEventListener('click', clearAndReset);
    }
    
    // Step 1: Campaign Data
    if (elements.fetchCampaignBtn) {
        elements.fetchCampaignBtn.addEventListener('click', fetchCampaignData);
    }
    
    if (elements.campaignUrl) {
        elements.campaignUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchCampaignData();
            }
        });
    }
    
    // Step 2: Market Research API
    if (elements.marketResearchUrl) {
        elements.marketResearchUrl.addEventListener('paste', async (e) => {
            // Small delay to let the paste complete
            setTimeout(async () => {
                const url = elements.marketResearchUrl.value.trim();
                if (url) {
                    try {
                        await fetchMarketResearch(url);
                    } catch (error) {
                        console.error('Failed to fetch market research:', error);
                    }
                }
            }, 100);
        });
        
        elements.marketResearchUrl.addEventListener('blur', async () => {
            const url = elements.marketResearchUrl.value.trim();
            if (url && !AppState.marketResearchData) {
                try {
                    await fetchMarketResearch(url);
                } catch (error) {
                    console.error('Failed to fetch market research:', error);
                }
            }
        });
    }
    
    if (elements.viewResearchContextBtn) {
        elements.viewResearchContextBtn.addEventListener('click', () => {
            populateResearchModal();
            elements.researchContextModal.classList.remove('hidden');
        });
    }
    
    if (elements.closeResearchModalBtn) {
        elements.closeResearchModalBtn.addEventListener('click', () => {
            elements.researchContextModal.classList.add('hidden');
        });
    }
    
    if (elements.clearResearchContextBtn) {
        elements.clearResearchContextBtn.addEventListener('click', () => {
            AppState.marketResearchData = null;
            AppState.marketResearchContext = null;
            elements.marketResearchUrl.value = '';
            showApiError();
            elements.researchContextModal.classList.add('hidden');
        });
    }
    
    if (elements.saveResearchContextBtn) {
        elements.saveResearchContextBtn.addEventListener('click', () => {
            // Update research data with edited content
            const textarea = elements.researchSections.querySelector('.full-context-text');
            
            if (textarea && textarea.value.trim()) {
                // Store the plain text version for AI context
                AppState.marketResearchContext = textarea.value.trim();
                
                // Show success feedback
                const button = elements.saveResearchContextBtn;
                const originalText = button.textContent;
                button.textContent = 'Saved!';
                button.style.backgroundColor = 'var(--color-success)';
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 1500);
                
                console.log('Market research context saved:', AppState.marketResearchContext.length + ' characters');
            }
            
            elements.researchContextModal.classList.add('hidden');
        });
    }
    
    // Research context modal background click
    if (elements.researchContextModal) {
        elements.researchContextModal.addEventListener('click', (e) => {
            if (e.target === elements.researchContextModal) {
                elements.researchContextModal.classList.add('hidden');
            }
        });
    }
    
    // Industry dropdown management
    if (elements.industrySearch) {
        // Initialize dropdown
        initializeIndustryDropdown();
        
        // Show dropdown on focus
        elements.industrySearch.addEventListener('focus', () => {
            showIndustryDropdown();
            renderIndustryOptions(elements.industrySearch.value);
        });
        
        // Search as user types
        elements.industrySearch.addEventListener('input', (e) => {
            const query = e.target.value;
            renderIndustryOptions(query);
            showIndustryDropdown();
        });
        
        // Hide dropdown on blur (with delay for clicks)
        elements.industrySearch.addEventListener('blur', () => {
            setTimeout(() => hideIndustryDropdown(), 150);
        });
        
        // Handle keyboard navigation
        elements.industrySearch.addEventListener('keydown', (e) => {
            const dropdown = elements.industryDropdown;
            if (dropdown.classList.contains('hidden')) return;
            
            const options = dropdown.querySelectorAll('.dropdown-option');
            const highlighted = dropdown.querySelector('.dropdown-option.highlighted');
            let currentIndex = highlighted ? Array.from(options).indexOf(highlighted) : -1;
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentIndex = Math.min(currentIndex + 1, options.length - 1);
                    updateHighlight(options, currentIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    currentIndex = Math.max(currentIndex - 1, -1);
                    updateHighlight(options, currentIndex);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (highlighted) {
                        setIndustryValue(highlighted.dataset.value);
                    } else if (elements.industrySearch.value.trim()) {
                        // Add as new industry if not in list
                        const query = elements.industrySearch.value.trim();
                        const industries = IndustryManager.getIndustries();
                        const exists = industries.some(i => i.toLowerCase() === query.toLowerCase());
                        if (!exists) {
                            IndustryManager.addIndustry(query);
                        }
                        setIndustryValue(query);
                    }
                    break;
                case 'Escape':
                    hideIndustryDropdown();
                    break;
            }
        });
    }
    
    // Industry dropdown option clicks
    if (elements.industryOptions) {
        elements.industryOptions.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-option')) {
                setIndustryValue(e.target.dataset.value);
            }
        });
    }
    
    // Add new industry button
    if (elements.addNewIndustryBtn) {
        elements.addNewIndustryBtn.addEventListener('click', () => {
            const query = elements.industrySearch.value.trim();
            if (query && IndustryManager.addIndustry(query)) {
                setIndustryValue(query);
                renderIndustryOptions(''); // Refresh the list
            }
        });
    }
    
    // Click outside to close dropdown
    document.addEventListener('click', (e) => {
        if (elements.industrySearch && elements.industryDropdown && 
            !elements.industrySearch.contains(e.target) && 
            !elements.industryDropdown.contains(e.target)) {
            hideIndustryDropdown();
        }
    });
    
    // Research section toggle buttons (event delegation)
    if (elements.researchSections) {
        elements.researchSections.addEventListener('click', (e) => {
            if (e.target.classList.contains('research-section-toggle')) {
                const section = e.target.closest('.research-section');
                const isDisabled = section.classList.contains('disabled');
                
                if (isDisabled) {
                    section.classList.remove('disabled');
                    e.target.textContent = 'Include';
                } else {
                    section.classList.add('disabled');
                    e.target.textContent = 'Exclude';
                }
            }
        });
    }
    
    // Step 3: Time Range
    if (elements.startDate) {
        elements.startDate.addEventListener('change', updateDateSummary);
    }
    
    if (elements.endDate) {
        elements.endDate.addEventListener('change', updateDateSummary);
    }
    
    // Time card event listeners
    elements.timeCards.forEach(card => {
        card.addEventListener('click', handleTimeCardClick);
    });
    
    // Step 5: AI Analysis
    if (elements.generateAnalysisBtn) {
        elements.generateAnalysisBtn.addEventListener('click', generateAnalysis);
    }
    
    // Model dropdown handling
    if (elements.aiModel) {
        elements.aiModel.addEventListener('change', updateModelBadge);
        // Initialize will be done after models are loaded
    }
    
    // Temperature slider handling
    if (elements.tempSlider) {
        elements.tempSlider.addEventListener('input', updateTemperature);
        updateTemperature(); // Initialize
    }
    
    // Tone card selection
    elements.toneCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active from all cards
            elements.toneCards.forEach(c => c.classList.remove('active'));
            // Add active to clicked card
            card.classList.add('active');
            
            const selectedTone = card.getAttribute('data-tone');
            AppState.analysisConfig.tone = selectedTone;
            
            // Update summary - get tone name without emoji
            const toneName = card.querySelector('.tone-title').textContent.replace(/[^\w\s]/g, '').trim();
            if (elements.summaryTone) {
                elements.summaryTone.textContent = toneName;
            }
            
            saveStateToLocalStorage();
        });
    });
    
    // Character counter and custom instructions
    if (elements.customInstructions) {
        elements.customInstructions.addEventListener('input', () => {
            // Limit to 500 characters
            if (elements.customInstructions.value.length > 500) {
                elements.customInstructions.value = elements.customInstructions.value.substring(0, 500);
            }
            updateCharCounter();
            AppState.analysisConfig.customInstructions = elements.customInstructions.value;
            saveStateToLocalStorage();
        });
        
        updateCharCounter(); // Initialize
    }
    
    // Modal handlers
    if (elements.closeErrorModal) {
        elements.closeErrorModal.addEventListener('click', hideError);
    }
    
    if (elements.dismissError) {
        elements.dismissError.addEventListener('click', hideError);
    }
    
    // Close modal on background click
    if (elements.errorModal) {
        elements.errorModal.addEventListener('click', (e) => {
            if (e.target === elements.errorModal) {
                hideError();
            }
        });
    }
    
    // Tactic detail modal handlers
    const closeTacticModal = document.getElementById('close-tactic-modal');
    if (closeTacticModal) {
        closeTacticModal.addEventListener('click', () => {
            document.getElementById('tactic-detail-modal').classList.add('hidden');
        });
    }
    
    const closeTacticDetail = document.getElementById('close-tactic-detail');
    if (closeTacticDetail) {
        closeTacticDetail.addEventListener('click', () => {
            document.getElementById('tactic-detail-modal').classList.add('hidden');
        });
    }
    
    // Restore all button
    const restoreAllBtn = document.getElementById('restore-all-btn');
    if (restoreAllBtn) {
        restoreAllBtn.addEventListener('click', restoreAllLineItems);
    }
    
    // Analysis report buttons
    const exportBtn = document.getElementById('export-report');
    if (exportBtn) {
        exportBtn.addEventListener('click', showExportModal);
    }
    
    const copyBtn = document.getElementById('copy-report');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyAnalysisToClipboard);
    }
    
    const newAnalysisBtn = document.getElementById('start-new-analysis');
    if (newAnalysisBtn) {
        newAnalysisBtn.addEventListener('click', showNewAnalysisModal);
    }
    
    // New Analysis Modal buttons
    const closeNewAnalysisBtn = document.getElementById('close-new-analysis-modal');
    if (closeNewAnalysisBtn) {
        closeNewAnalysisBtn.addEventListener('click', () => {
            document.getElementById('new-analysis-modal').classList.add('hidden');
        });
    }
    
    const sameDataBtn = document.getElementById('same-data-analysis');
    if (sameDataBtn) {
        sameDataBtn.addEventListener('click', startNewAnalysisWithSameData);
    }
    
    const clearStartOverBtn = document.getElementById('clear-start-over');
    if (clearStartOverBtn) {
        clearStartOverBtn.addEventListener('click', clearAndStartOver);
    }
    
    // Export Modal buttons
    const closeExportBtn = document.getElementById('close-export-modal');
    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', () => {
            document.getElementById('export-modal').classList.add('hidden');
        });
    }
    
    // Export option buttons
    document.querySelectorAll('.export-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.currentTarget.getAttribute('data-format');
            exportAnalysis(format);
        });
    });
    
    // Close tactic modal on background click
    const tacticModal = document.getElementById('tactic-detail-modal');
    if (tacticModal) {
        tacticModal.addEventListener('click', (e) => {
            if (e.target === tacticModal) {
                tacticModal.classList.add('hidden');
            }
        });
    }
}

// Event Bus Listeners
function setupEventBusListeners() {
    EventBus.on('campaignDataLoaded', (data) => {
        // Auto-populate company name if available
        if (data.companyName && elements.companyName) {
            elements.companyName.value = data.companyName;
        }
    });
    
    EventBus.on('analysisComplete', (results) => {
        console.log('Analysis completed:', results);
    });
}

// Load available AI models from backend
async function loadAvailableModels() {
    try {
        const response = await fetch(pathConfig.api('models.php'));
        const data = await response.json();
        
        if (data.success && data.data) {
            const modelSelect = document.getElementById('ai-model');
            const currentValue = modelSelect.value;
            
            // Clear existing options
            modelSelect.innerHTML = '';
            
            // Add available models
            data.data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                
                // Add disabled attribute if not configured
                if (!model.configured) {
                    option.disabled = true;
                    option.textContent += ' (API key required)';
                }
                
                modelSelect.appendChild(option);
            });
            
            // Set default model or restore previous selection
            if (currentValue && modelSelect.querySelector(`option[value="${currentValue}"]`)) {
                modelSelect.value = currentValue;
            } else if (data.data.defaultModel) {
                modelSelect.value = data.data.defaultModel;
            }
            
            // Update model badge
            updateModelBadge();
        }
    } catch (error) {
        console.error('Failed to load AI models:', error);
        // Keep the hardcoded defaults as fallback
    }
}

// Update model badge based on selection
function updateModelBadge() {
    const modelSelect = document.getElementById('ai-model');
    const badge = document.getElementById('current-model-badge');
    const description = document.getElementById('model-description');
    
    if (!modelSelect || !badge) return;
    
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    const modelName = selectedOption?.textContent.replace(' (API key required)', '') || 'Unknown';
    const modelId = modelSelect.value;
    
    // Update badge text
    badge.textContent = modelName;
    
    // Update badge class based on provider
    badge.className = 'model-badge';
    if (modelId.includes('claude')) {
        badge.classList.add('claude');
    } else if (modelId.includes('gemini')) {
        badge.classList.add('gemini');
    } else if (modelId.includes('gpt')) {
        badge.classList.add('openai');
    }
    
    // Update description
    const descriptions = {
        'claude-sonnet-4-20250514': 'Advanced reasoning with balanced performance and speed. Excellent for comprehensive business analysis.',
        'claude-opus-4-1-20250805': 'Most capable model for complex analysis and nuanced insights.',
        'claude-3-7-sonnet-20250219': 'Balanced performance for standard analysis tasks.',
        'gemini-2.5-pro': 'Google\'s advanced model with multimodal capabilities and large context window.',
        'gemini-2.5-flash-lite': 'Fast, efficient model for quick analysis and rapid iterations.',
        'gpt-5-2025-08-07': 'OpenAI\'s latest model with enhanced reasoning and creative capabilities.'
    };
    
    if (description) {
        description.textContent = descriptions[modelId] || 'AI model for campaign analysis.';
    }
}

// Application Initialization
function initializeApp() {
    console.log('Initializing Report.AI...');
    
    // Load available AI models
    loadAvailableModels();
    
    // Clean up any existing demo data from localStorage
    const saved = localStorage.getItem('campaignAnalyzer');
    if (saved) {
        try {
            const parsedState = JSON.parse(saved);
            if (parsedState.campaignData && parsedState.campaignData.id === '507f1f77bcf86cd799439011') {
                console.log('Cleaning up demo data from previous session');
                localStorage.removeItem('campaignAnalyzer');
            }
        } catch (e) {
            // If localStorage is corrupted, clear it
            localStorage.removeItem('campaignAnalyzer');
        }
    }
    
    // Load saved state (will only load real campaign data now)
    loadStateFromLocalStorage();
    
    // Initialize theme
    initializeTheme();
    
    // Initialize current date/time
    initializeCurrentDateTime();
    
    // Setup event listeners
    setupEventListeners();
    setupNavigation();
    setupEventBusListeners();
    
    // Set initial state with error handling
    try {
        updateStepProgress(AppState.currentStep || 1);
    } catch (error) {
        console.warn('Could not set initial step progress:', error);
        AppState.currentStep = 1;
    }
    
    // No default time range selection - let user choose
    
    console.log('Application initialized successfully');
}

// Make test function available globally for debugging
window.test30DayPreset = test30DayPreset;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}