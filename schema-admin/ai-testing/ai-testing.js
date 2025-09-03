// AI Testing Interface - Fully Functional
document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Testing Interface loaded');
    initializeInterface();
});

let currentScenario = null;
let availableModels = [];
let availableSections = [];

// Initialize the interface
async function initializeInterface() {
    try {
        await loadAvailableModels();
        await loadAvailableSections();
        setupEventListeners();
        updateTestButtonState();
        
        // Hide clear button initially
        const clearBtn = document.getElementById('clear-results-btn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to initialize interface:', error);
        showError('Failed to initialize AI testing interface');
    }
}

// Load available AI models from backend
async function loadAvailableModels() {
    try {
        const response = await fetch(window.pathConfig?.api('models.php') || '/api/models.php');
        const data = await response.json();
        
        if (data.success && data.data) {
            availableModels = data.data.models;
            const modelSelect = document.getElementById('ai-model-select');
            const modelStatus = document.getElementById('model-status');
            
            // Clear loading state
            modelSelect.innerHTML = '';
            
            // Add available models
            availableModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                
                if (!model.configured) {
                    option.disabled = true;
                    option.textContent += ' (API key required)';
                }
                
                modelSelect.appendChild(option);
            });
            
            // Set default model
            if (data.data.defaultModel) {
                modelSelect.value = data.data.defaultModel;
            }
            
            // Update status
            const configuredModels = availableModels.filter(m => m.configured).length;
            const totalModels = availableModels.length;
            
            if (configuredModels === 0) {
                modelStatus.innerHTML = `
                    <span class="status-error">No API keys configured</span>
                    <br><small>Please add API keys to your .env file</small>
                `;
            } else {
                modelStatus.innerHTML = `
                    <span class="status-text">${configuredModels}/${totalModels} models ready</span>
                `;
            }
            
        } else {
            throw new Error(data.message || 'Failed to load models');
        }
    } catch (error) {
        console.error('Failed to load AI models:', error);
        document.getElementById('model-status').innerHTML = 
            '<span class="status-error">Failed to load models</span>';
        throw error;
    }
}

// Load available report sections from sections manager
async function loadAvailableSections() {
    try {
        const response = await fetch(window.pathConfig?.api('sections.php') || '/api/sections.php');
        const data = await response.json();
        
        if (data && data.sections) {
            // Filter to only show default sections
            availableSections = data.sections.filter(section => section.is_default);
            renderSectionScenarios();
        } else {
            throw new Error('Failed to load sections');
        }
    } catch (error) {
        console.error('Failed to load sections:', error);
        const sectionsContainer = document.getElementById('sections-scenarios');
        if (sectionsContainer) {
            sectionsContainer.innerHTML = `
                <div class="loading-placeholder">
                    <p>No sections available</p>
                    <small>Create sections in the Sections Manager first</small>
                </div>
            `;
        }
    }
}

// Render section scenarios
function renderSectionScenarios() {
    const sectionsContainer = document.getElementById('sections-scenarios');
    if (!sectionsContainer) return;
    
    if (availableSections.length === 0) {
        sectionsContainer.innerHTML = `
            <div class="loading-placeholder">
                <p>No sections configured</p>
                <small><a href="${window.pathConfig?.schemaAdmin('sections-manager/') || '/schema-admin/sections-manager/'}" target="_blank">Create sections in Sections Manager</a></small>
            </div>
        `;
        return;
    }
    
    sectionsContainer.innerHTML = availableSections.map(section => `
        <div class="scenario-card section-card" data-scenario="section-${section.id}" data-section-id="${section.id}">
            <h4 class="scenario-title">${section.name}</h4>
            <p class="scenario-description">${section.description || 'Test this report section with AI'}</p>
            <small class="section-key">${section.section_key}</small>
        </div>
    `).join('');
    
    // Re-attach event listeners to new section cards
    sectionsContainer.querySelectorAll('.scenario-card').forEach(card => {
        card.addEventListener('click', () => selectScenario(card));
    });
}

// Setup event listeners
function setupEventListeners() {
    // Model selection
    const modelSelect = document.getElementById('ai-model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', updateTestButtonState);
    }

    // Temperature slider
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', (e) => {
            tempValue.textContent = e.target.value;
        });
    }

    // Analysis tone selector
    const toneSelect = document.getElementById('analysis-tone');
    const toneDescription = document.getElementById('tone-description');
    if (toneSelect && toneDescription) {
        const toneDescriptions = {
            'concise': 'Brief, to-the-point analysis with key insights only',
            'professional': 'Formal business language suitable for executive reports',
            'conversational': 'Friendly, approachable tone for team discussions',
            'encouraging': 'Positive, motivational language highlighting opportunities',
            'analytical': 'Data-driven insights with detailed metrics and benchmarks',
            'casual': 'Relaxed, informal tone for internal team use'
        };
        
        toneSelect.addEventListener('change', (e) => {
            const selectedTone = e.target.value;
            toneDescription.textContent = toneDescriptions[selectedTone] || '';
        });
    }

    // Scenario selection
    const scenarioCards = document.querySelectorAll('.scenario-card');
    scenarioCards.forEach(card => {
        card.addEventListener('click', () => selectScenario(card));
    });

    // Test controls
    const runTestBtn = document.getElementById('run-test-btn');
    if (runTestBtn) {
        runTestBtn.addEventListener('click', runCurrentTest);
    }

    const clearResultsBtn = document.getElementById('clear-results-btn');
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', clearResults);
    }

    const quickTestBtn = document.getElementById('run-quick-test');
    if (quickTestBtn) {
        quickTestBtn.addEventListener('click', runQuickTest);
    }

    const saveConfigBtn = document.getElementById('save-config-btn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfiguration);
    }

    // Custom prompt section toggle
    const customPromptSection = document.getElementById('custom-prompt-section');
    if (customPromptSection) {
        // Initially hidden, will show when custom scenario is selected
    }
}

// Select a test scenario
function selectScenario(card) {
    // Remove active from all cards
    document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
    
    // Add active to clicked card
    card.classList.add('active');
    
    // Get scenario type
    currentScenario = card.dataset.scenario;
    
    // Show/hide custom prompt section
    const customPromptSection = document.getElementById('custom-prompt-section');
    if (currentScenario === 'custom') {
        customPromptSection.style.display = 'block';
    } else if (customPromptSection) {
        customPromptSection.style.display = 'none';
    }
    
    // Show section details in results area
    if (card.dataset.sectionId) {
        showSectionDetails(card.dataset.sectionId);
        updateClearButton('Clear Section');
    }
    
    updateTestButtonState();
}

// Clear detail view and restore default state
function clearDetailView() {
    const resultsArea = document.querySelector('.results-content-area');
    if (resultsArea) {
        resultsArea.innerHTML = `
            <div class="results-placeholder">
                <div>
                    <p>Select a report section and click "Run Test" to see AI-generated content</p>
                    <small>Results will appear here with model configuration and response details</small>
                </div>
            </div>
        `;
    }
    updateClearButton('Clear Results');
}

// Update clear button text and visibility
function updateClearButton(text) {
    const clearBtn = document.getElementById('clear-results-btn');
    if (clearBtn) {
        clearBtn.textContent = text;
        // Show button for both 'Clear Results' (after test) and 'Clear Section' (section details)
        clearBtn.style.display = 'block';
    }
}

// Show detailed section configuration
function showSectionDetails(sectionId) {
    const section = availableSections.find(s => s.id == sectionId);
    if (!section) return;
    
    const resultsArea = document.querySelector('.results-content-area');
    if (!resultsArea) return;
    
    resultsArea.innerHTML = `
        <div class="results-content">
            <div class="section-info">
                <h4>${section.name} <span class="section-key-badge">${section.section_key}</span></h4>
                <p><strong>Description:</strong> ${section.description || 'No description provided'}</p>
            </div>
            
            <div class="results-meta">
                <span><strong>Display Order:</strong> ${section.display_order}</span>
                <span><strong>Type:</strong> ${section.is_default ? 'Default' : 'Custom'}</span>
                <span><strong>Status:</strong> ${section.is_default ? 'Active' : 'Inactive'}</span>
            </div>
            
            <h4>AI Instructions</h4>
            <div class="ai-response" style="background: #f8fafc; padding: var(--space-4); border-radius: var(--radii-md); margin-bottom: var(--space-4);">
                <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${section.instructions || 'No instructions provided'}</pre>
            </div>
            
            <div style="margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid #f1f5f9; color: var(--text-secondary); font-size: var(--text-body-sm-size);">
                <p><strong>Ready to test:</strong> Click "Test AI" to generate content for this section using your selected model and parameters.</p>
            </div>
        </div>
    `;
}

// Update test button state
function updateTestButtonState() {
    const runTestBtn = document.getElementById('run-test-btn');
    const modelSelect = document.getElementById('ai-model-select');
    
    if (runTestBtn && modelSelect) {
        const hasModel = modelSelect.value && modelSelect.value !== '';
        const hasScenario = currentScenario !== null;
        const selectedModel = availableModels.find(m => m.id === modelSelect.value);
        const modelConfigured = selectedModel && selectedModel.configured;
        
        // Enable button if model is configured, regardless of scenario selection
        runTestBtn.disabled = !hasModel || !modelConfigured;
        
        if (!modelConfigured && hasModel) {
            runTestBtn.textContent = 'API Key Required';
        } else if (!hasScenario && availableSections.length > 0) {
            runTestBtn.textContent = 'Test All Sections';
        } else if (hasScenario) {
            runTestBtn.textContent = 'Test Section';
        } else {
            runTestBtn.textContent = 'Test AI';
        }
    }
}

// Run the current test
async function runCurrentTest() {
    if (!currentScenario && availableSections.length > 0) {
        // Run all sections when none is selected
        await runAllSectionsTest();
        return;
    } else if (!currentScenario) {
        showError('No sections available to test');
        return;
    }
    
    const prompt = generatePromptForScenario(currentScenario);
    if (!prompt) {
        showError('Failed to generate test prompt');
        return;
    }
    
    await runAITest(prompt, currentScenario);
}

// Run tests for all available sections
async function runAllSectionsTest() {
    if (availableSections.length === 0) {
        showError('No sections available to test');
        return;
    }
    
    showLoading(`Testing all ${availableSections.length} sections...`);
    
    let allResults = [];
    
    for (const section of availableSections) {
        const sectionScenario = `section-${section.id}`;
        const prompt = generatePromptForScenario(sectionScenario);
        
        if (prompt) {
            try {
                const result = await runSingleSectionTest(prompt, section);
                allResults.push(result);
            } catch (error) {
                console.error(`Failed to test section ${section.name}:`, error);
                allResults.push({
                    section: section,
                    success: false,
                    error: error.message || 'Unknown error'
                });
            }
        }
    }
    
    showAllSectionsResults(allResults);
}

// Run a single section test (helper for batch testing)
async function runSingleSectionTest(prompt, section) {
    const modelSelect = document.getElementById('ai-model-select');
    const tempSlider = document.getElementById('temperature');
    const maxTokensSelect = document.getElementById('max-tokens');
    
    const config = {
        model: modelSelect.value,
        temperature: parseFloat(tempSlider.value),
        prompt: prompt.trim(),
        maxTokens: parseInt(maxTokensSelect.value)
    };
    
    const response = await fetch(window.pathConfig?.api('ai-test.php') || '/api/ai-test.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    });
    
    const data = await response.json();
    
    return {
        section: section,
        success: data.success,
        data: data.data,
        error: data.error
    };
}

// Run a quick test with the first available scenario
function runQuickTest() {
    const firstCard = document.querySelector('.scenario-card');
    if (firstCard) {
        selectScenario(firstCard);
        setTimeout(() => runCurrentTest(), 100);
    }
}

// Generate section-specific prompt with sample data
function generateSectionPrompt(section) {
    const sampleCampaignData = {
        campaign_name: 'Holiday Marketing Campaign 2024',
        advertiser: 'Acme Corp',
        start_date: '2024-11-01',
        end_date: '2024-12-31',
        total_spend: 85000,
        impressions: 2500000,
        clicks: 105000,
        conversions: 4200,
        ctr: 4.2,
        conversion_rate: 4.0,
        cost_per_click: 0.81,
        cost_per_conversion: 20.24,
        channels: {
            'Google Search': { impressions: 800000, clicks: 40000, conversions: 2000, spend: 32000 },
            'Facebook/Instagram': { impressions: 1200000, clicks: 45000, conversions: 1500, spend: 28000 },
            'LinkedIn': { impressions: 300000, clicks: 12000, conversions: 480, spend: 15000 },
            'Display': { impressions: 200000, clicks: 8000, conversions: 220, spend: 10000 }
        },
        demographics: {
            'Age 25-34': 35,
            'Age 35-44': 28,
            'Age 45-54': 22,
            'Age 55+': 15
        },
        top_performing_ads: [
            'Holiday Sale - 40% Off Everything',
            'Limited Time: Free Shipping + Returns',
            'New Collection Launch - Early Access'
        ]
    };

    return `${section.instructions}

Context: You are generating the "${section.name}" section for a campaign analysis report.

Sample Campaign Data:
- Campaign: ${sampleCampaignData.campaign_name}
- Advertiser: ${sampleCampaignData.advertiser}
- Duration: ${sampleCampaignData.start_date} to ${sampleCampaignData.end_date}
- Total Spend: $${sampleCampaignData.total_spend.toLocaleString()}
- Impressions: ${sampleCampaignData.impressions.toLocaleString()}
- Clicks: ${sampleCampaignData.clicks.toLocaleString()}
- Conversions: ${sampleCampaignData.conversions.toLocaleString()}
- CTR: ${sampleCampaignData.ctr}%
- Conversion Rate: ${sampleCampaignData.conversion_rate}%
- Cost per Click: $${sampleCampaignData.cost_per_click}
- Cost per Conversion: $${sampleCampaignData.cost_per_conversion}

Channel Performance:
${Object.entries(sampleCampaignData.channels).map(([channel, data]) => 
    `- ${channel}: ${data.impressions.toLocaleString()} impressions, ${data.clicks.toLocaleString()} clicks, ${data.conversions} conversions, $${data.spend.toLocaleString()} spend`
).join('\n')}

Demographics:
${Object.entries(sampleCampaignData.demographics).map(([age, percent]) => 
    `- ${age}: ${percent}%`
).join('\n')}

Top Performing Ads:
${sampleCampaignData.top_performing_ads.map((ad, i) => `${i + 1}. ${ad}`).join('\n')}

Please generate the "${section.name}" section following the instructions above.`;
}

// Generate prompt based on scenario (sections only now)
function generatePromptForScenario(scenarioType) {
    // Handle section-specific scenarios
    if (scenarioType.startsWith('section-')) {
        const sectionId = parseInt(scenarioType.replace('section-', ''));
        const section = availableSections.find(s => s.id === sectionId);
        
        if (section) {
            return generateSectionPrompt(section);
        }
    }
    
    // Fallback for any unhandled scenarios
    return 'Please select a section to test.';
}

// Run AI test with the given prompt
async function runAITest(prompt, scenarioName) {
    if (!prompt.trim()) {
        showError('Please provide a prompt to test');
        return;
    }
    
    const modelSelect = document.getElementById('ai-model-select');
    const tempSlider = document.getElementById('temperature');
    const maxTokensSelect = document.getElementById('max-tokens');
    
    // Show loading state
    showLoading(`Testing ${scenarioName} scenario...`);
    
    const config = {
        model: modelSelect.value,
        temperature: parseFloat(tempSlider.value),
        prompt: prompt.trim(),
        maxTokens: parseInt(maxTokensSelect.value)
    };
    
    try {
        const response = await fetch(window.pathConfig?.api('ai-test.php') || '/api/ai-test.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResults({
                success: true,
                response: data.data.response,
                model: data.data.model,
                config: data.data.configuration,
                timestamp: data.data.timestamp,
                scenario: scenarioName
            });
        } else {
            throw new Error(data.message || 'AI test failed');
        }
    } catch (error) {
        console.error('AI test error:', error);
        showResults({
            success: false,
            error: error.message,
            scenario: scenarioName
        });
    }
}

// Show loading state
function showLoading(message) {
    const resultsContainer = document.querySelector('.results-content-area');
    resultsContainer.innerHTML = `
        <div class="results-loading">
            <div class="loading-spinner"></div>
            <h4>${message}</h4>
            <p>This may take 10-30 seconds depending on the model</p>
        </div>
    `;
}

// Show test results
function showResults(result) {
    const resultsContainer = document.querySelector('.results-content-area');
    
    if (result.success) {
        const isSection = currentScenario && currentScenario.startsWith('section-');
        let sectionInfo = '';
        
        if (isSection) {
            const sectionId = parseInt(currentScenario.replace('section-', ''));
            const section = availableSections.find(s => s.id === sectionId);
            if (section) {
                sectionInfo = `
                    <div class="section-info">
                        <strong>Section:</strong> ${section.name} 
                        <span class="section-key-badge">${section.section_key}</span>
                    </div>
                `;
            }
        }
        
        resultsContainer.innerHTML = `
            <div class="results-content">
                <h4>Test Results - ${result.scenario}</h4>
                ${sectionInfo}
                <div class="results-meta">
                    <span>Model: ${result.model.name}</span>
                    <span>Temperature: ${result.config.temperature}</span>
                    <span>Tokens: ${result.config.maxTokens}</span>
                    <span>${new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="ai-response">
                    ${formatAIResponse(result.response)}
                </div>
            </div>
        `;
        
        // Show clear button after successful test
        updateClearButton('Clear Results');
    } else {
        resultsContainer.innerHTML = `
            <div class="results-content">
                <h4>Test Failed - ${result.scenario}</h4>
                <div class="error-message">
                    <strong>Error:</strong> ${result.error}
                    <br><br>
                    <button onclick="runCurrentTest()" class="test-btn primary">Retry Test</button>
                </div>
            </div>
        `;
    }
}

// Show results for all sections test
function showAllSectionsResults(results) {
    const resultsContainer = document.querySelector('.results-content-area');
    
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    
    resultsContainer.innerHTML = `
        <div class="results-content">
            <h4>All Sections Test Results - ${results.length} Sections</h4>
            <div class="results-meta">
                <span>Successful: ${successfulTests.length}</span>
                <span>Failed: ${failedTests.length}</span>
                <span>${new Date().toLocaleTimeString()}</span>
            </div>
            
            ${results.map(result => `
                <div class="section-result ${result.success ? 'success' : 'failed'}">
                    <h5>
                        ${result.section.name} 
                        <span class="section-key-badge">${result.section.section_key}</span>
                        <span class="test-status ${result.success ? 'success' : 'failed'}">
                            ${result.success ? '✓' : '✗'}
                        </span>
                    </h5>
                    ${result.success ? 
                        `<div class="ai-response">${formatAIResponse(result.data.response.substring(0, 300))}${result.data.response.length > 300 ? '...' : ''}</div>` :
                        `<div class="error-message">Error: ${result.error}</div>`
                    }
                </div>
            `).join('')}
        </div>
    `;
    
    // Show clear button after test
    updateClearButton('Clear Results');
}

// Format AI response for display
function formatAIResponse(response) {
    return response
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/###\s*(.*)/g, '<h4>$1</h4>')
        .replace(/##\s*(.*)/g, '<h3>$1</h3>')
        .replace(/#\s*(.*)/g, '<h2>$1</h2>');
}

// Clear results
function clearResults() {
    const resultsContainer = document.querySelector('.results-content-area');
    resultsContainer.innerHTML = `
        <div class="results-placeholder">
            <div>
                <p>Select a report section and click "Run Test" to see AI-generated content</p>
                <small>Results will appear here with model configuration and response details</small>
            </div>
        </div>
    `;
    
    // Hide clear button and reset current scenario
    updateClearButton('Clear Results');
    currentScenario = null;
    
    // Remove active state from all cards
    document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
    
    updateTestButtonState();
}

// Show error message
function showError(message) {
    const resultsContainer = document.querySelector('.results-content-area');
    resultsContainer.innerHTML = `
        <div class="results-content">
            <div class="error-message">
                <strong>Error:</strong> ${message}
            </div>
        </div>
    `;
}

// Save configuration
function saveConfiguration() {
    const config = {
        model: document.getElementById('ai-model-select').value,
        temperature: document.getElementById('temperature').value,
        tone: document.getElementById('tone').value,
        maxTokens: document.getElementById('max-tokens').value
    };
    
    localStorage.setItem('aiTestingConfig', JSON.stringify(config));
    showNotification('Configuration saved successfully');
}

// Load saved configuration
function loadSavedConfiguration() {
    try {
        const saved = localStorage.getItem('aiTestingConfig');
        if (saved) {
            const config = JSON.parse(saved);
            
            if (config.model) document.getElementById('ai-model-select').value = config.model;
            if (config.temperature) {
                document.getElementById('temperature').value = config.temperature;
                document.getElementById('temp-value').textContent = config.temperature;
            }
            if (config.tone) document.getElementById('tone').value = config.tone;
            if (config.maxTokens) document.getElementById('max-tokens').value = config.maxTokens;
        }
    } catch (error) {
        console.error('Failed to load saved configuration:', error);
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transition: all 0.3s ease;
        ${type === 'success' ? 'background-color: #10b981;' : 'background-color: #ef4444;'}
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize saved configuration after models load
setTimeout(loadSavedConfiguration, 500);