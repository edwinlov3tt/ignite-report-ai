// Schema Export & Import JavaScript
// Handles all export/import functionality for schema configurations

// Export/Import State
const ExportImportState = {
    currentSchema: null,
    operationInProgress: false,
    backupHistory: []
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSchemaFromStorage();
    loadBackupHistory();
    updateOperationStatus('Ready for import/export operations');
});

// Event Listeners
function initializeEventListeners() {
    // Export buttons
    document.getElementById('export-complete-btn').addEventListener('click', exportCompleteSchema);
    document.getElementById('export-products-btn').addEventListener('click', exportProductsOnly);
    document.getElementById('export-legacy-btn').addEventListener('click', exportLegacyFormat);
    
    // Import buttons
    document.getElementById('import-complete-btn').addEventListener('click', () => {
        document.getElementById('import-complete-input').click();
    });
    document.getElementById('import-merge-btn').addEventListener('click', () => {
        document.getElementById('import-merge-input').click();
    });
    document.getElementById('import-legacy-btn').addEventListener('click', () => {
        document.getElementById('import-legacy-input').click();
    });
    
    // File inputs
    document.getElementById('import-complete-input').addEventListener('change', handleCompleteImport);
    document.getElementById('import-merge-input').addEventListener('change', handleMergeImport);
    document.getElementById('import-legacy-input').addEventListener('change', handleLegacyImport);
    
    // Backup controls
    document.getElementById('create-backup-btn').addEventListener('click', createBackup);
    document.getElementById('auto-backup-btn').addEventListener('click', toggleAutoBackup);
}

// Export Functions
function exportCompleteSchema() {
    if (!ExportImportState.currentSchema) {
        updateOperationStatus('No schema data found to export', 'error');
        return;
    }
    
    updateOperationStatus('Exporting complete schema...', 'info');
    
    const dataStr = JSON.stringify(ExportImportState.currentSchema, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `unified_tactic_schema_${getTimestamp()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateOperationStatus('Complete schema exported successfully', 'success');
    logOperation('EXPORT', 'Complete schema exported');
}

function exportProductsOnly() {
    if (!ExportImportState.currentSchema || !ExportImportState.currentSchema.products) {
        updateOperationStatus('No product data found to export', 'error');
        return;
    }
    
    updateOperationStatus('Exporting products only...', 'info');
    
    const productsOnlySchema = {
        version: ExportImportState.currentSchema.version,
        products: ExportImportState.currentSchema.products,
        exportType: 'products-only',
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(productsOnlySchema, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `products_schema_${getTimestamp()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateOperationStatus('Products schema exported successfully', 'success');
    logOperation('EXPORT', 'Products-only schema exported');
}

function exportLegacyFormat() {
    if (!ExportImportState.currentSchema || !ExportImportState.currentSchema.products) {
        updateOperationStatus('No product data found to export', 'error');
        return;
    }
    
    updateOperationStatus('Converting to legacy format...', 'info');
    
    const legacySchema = {};
    
    // Convert v2 schema to legacy csv-headers.json format
    for (const [productName, product] of Object.entries(ExportImportState.currentSchema.products)) {
        if (product.tables && product.tables.length > 0) {
            const mainTable = product.tables[0]; // Use first table as primary
            legacySchema[productName] = {
                filenames: mainTable.filenames || [],
                headers: mainTable.headers || []
            };
        }
    }
    
    const dataStr = JSON.stringify(legacySchema, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `csv-headers_${getTimestamp()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateOperationStatus('Legacy format exported successfully', 'success');
    logOperation('EXPORT', 'Legacy format schema exported');
}

// Import Functions
function handleCompleteImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    updateOperationStatus('Importing complete schema...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const schema = JSON.parse(e.target.result);
            
            // Validate schema structure
            if (!validateSchema(schema)) {
                updateOperationStatus('Invalid schema format', 'error');
                return;
            }
            
            // Replace current schema
            ExportImportState.currentSchema = schema;
            saveSchemaToStorage();
            
            updateOperationStatus('Schema imported successfully', 'success');
            logOperation('IMPORT', 'Complete schema imported');
            
            // Refresh parent window if it exists
            if (window.parent && window.parent.location !== window.location) {
                window.parent.postMessage('schema-updated', '*');
            }
            
        } catch (error) {
            updateOperationStatus('Error importing schema: ' + error.message, 'error');
            logOperation('ERROR', 'Failed to import schema: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function handleMergeImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    updateOperationStatus('Merging schema data...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const incomingSchema = JSON.parse(e.target.result);
            
            if (!validateSchema(incomingSchema)) {
                updateOperationStatus('Invalid schema format for merge', 'error');
                return;
            }
            
            // Merge schemas
            if (!ExportImportState.currentSchema) {
                ExportImportState.currentSchema = {
                    version: 2,
                    products: {},
                    subproducts: {},
                    connections: {}
                };
            }
            
            // Merge products
            Object.assign(ExportImportState.currentSchema.products, incomingSchema.products || {});
            
            // Merge subproducts
            Object.assign(ExportImportState.currentSchema.subproducts, incomingSchema.subproducts || {});
            
            // Merge connections
            Object.assign(ExportImportState.currentSchema.connections, incomingSchema.connections || {});
            
            saveSchemaToStorage();
            
            updateOperationStatus('Schema merged successfully', 'success');
            logOperation('IMPORT', 'Schema merged with existing configuration');
            
            // Refresh parent window if it exists
            if (window.parent && window.parent.location !== window.location) {
                window.parent.postMessage('schema-updated', '*');
            }
            
        } catch (error) {
            updateOperationStatus('Error merging schema: ' + error.message, 'error');
            logOperation('ERROR', 'Failed to merge schema: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function handleLegacyImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    updateOperationStatus('Converting legacy format...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const legacySchema = JSON.parse(e.target.result);
            
            // Convert legacy format to v2 schema
            const convertedSchema = {
                version: 2,
                products: {},
                subproducts: {},
                connections: {}
            };
            
            // Process each tactic in legacy format
            for (const [tacticName, tacticData] of Object.entries(legacySchema)) {
                convertedSchema.products[tacticName] = {
                    product_slug: generateSlug(tacticName),
                    platforms: [],
                    notes: 'Converted from legacy format',
                    tables: [{
                        title: 'Default',
                        table_slug: 'default',
                        filenames: tacticData.filenames || [],
                        aliases: [],
                        headers: tacticData.headers || [],
                        validator: {}
                    }],
                    lumina: {
                        extractors: []
                    },
                    ai: {
                        guidelines: '',
                        analysis_prompt: '',
                        platforms: {},
                        benchmarks: {}
                    }
                };
            }
            
            ExportImportState.currentSchema = convertedSchema;
            saveSchemaToStorage();
            
            updateOperationStatus('Legacy schema converted and imported successfully', 'success');
            logOperation('IMPORT', 'Legacy schema converted and imported');
            
            // Refresh parent window if it exists
            if (window.parent && window.parent.location !== window.location) {
                window.parent.postMessage('schema-updated', '*');
            }
            
        } catch (error) {
            updateOperationStatus('Error converting legacy schema: ' + error.message, 'error');
            logOperation('ERROR', 'Failed to convert legacy schema: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Backup Functions
function createBackup() {
    if (!ExportImportState.currentSchema) {
        updateOperationStatus('No schema data to backup', 'error');
        return;
    }
    
    const backup = {
        timestamp: new Date().toISOString(),
        schema: ExportImportState.currentSchema,
        version: ExportImportState.currentSchema.version || 2
    };
    
    ExportImportState.backupHistory.unshift(backup);
    
    // Keep only last 10 backups
    if (ExportImportState.backupHistory.length > 10) {
        ExportImportState.backupHistory = ExportImportState.backupHistory.slice(0, 10);
    }
    
    saveBackupHistory();
    renderBackupHistory();
    
    updateOperationStatus('Backup created successfully', 'success');
    logOperation('BACKUP', 'Manual backup created');
}

function toggleAutoBackup() {
    // This would implement auto-backup scheduling
    // For now, just show a message
    updateOperationStatus('Auto-backup feature coming soon', 'info');
}

// Utility Functions
function validateSchema(schema) {
    // Basic schema validation
    if (!schema || typeof schema !== 'object') return false;
    if (!schema.version) return false;
    if (!schema.products || typeof schema.products !== 'object') return false;
    
    return true;
}

function generateSlug(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
}

function updateOperationStatus(message, type = 'info') {
    const statusElement = document.getElementById('operation-status');
    const statusMessage = statusElement.querySelector('.status-message');
    
    statusMessage.textContent = message;
    statusElement.className = `operation-status ${type}`;
    
    setTimeout(() => {
        if (type !== 'error') {
            statusElement.className = 'operation-status';
            statusMessage.textContent = 'Ready for import/export operations';
        }
    }, 5000);
}

function logOperation(type, message) {
    const logsElement = document.getElementById('operation-logs');
    const timestamp = new Date().toLocaleString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-timestamp">${timestamp}</span>
        <span class="log-type">[${type}]</span>
        <span class="log-message">${message}</span>
    `;
    
    logsElement.insertBefore(logEntry, logsElement.firstChild);
    
    // Keep only last 20 log entries
    while (logsElement.children.length > 20) {
        logsElement.removeChild(logsElement.lastChild);
    }
}

function renderBackupHistory() {
    const historyElement = document.getElementById('backup-history');
    
    if (ExportImportState.backupHistory.length === 0) {
        historyElement.innerHTML = '<p class="empty-message">No backups created yet</p>';
        return;
    }
    
    historyElement.innerHTML = ExportImportState.backupHistory.map((backup, index) => `
        <div class="backup-item">
            <div class="backup-info">
                <span class="backup-date">${new Date(backup.timestamp).toLocaleString()}</span>
                <span class="backup-version">Version ${backup.version}</span>
            </div>
            <div class="backup-actions">
                <button onclick="restoreBackup(${index})" class="admin-btn small secondary">Restore</button>
                <button onclick="downloadBackup(${index})" class="admin-btn small secondary">Download</button>
                <button onclick="deleteBackup(${index})" class="admin-btn small danger">Delete</button>
            </div>
        </div>
    `).join('');
}

function restoreBackup(index) {
    if (!confirm('Are you sure you want to restore this backup? Current schema will be replaced.')) {
        return;
    }
    
    const backup = ExportImportState.backupHistory[index];
    ExportImportState.currentSchema = backup.schema;
    saveSchemaToStorage();
    
    updateOperationStatus('Backup restored successfully', 'success');
    logOperation('RESTORE', 'Backup restored from ' + new Date(backup.timestamp).toLocaleString());
    
    // Refresh parent window if it exists
    if (window.parent && window.parent.location !== window.location) {
        window.parent.postMessage('schema-updated', '*');
    }
}

function downloadBackup(index) {
    const backup = ExportImportState.backupHistory[index];
    const dataStr = JSON.stringify(backup.schema, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `backup_${backup.timestamp.split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logOperation('DOWNLOAD', 'Backup downloaded: ' + new Date(backup.timestamp).toLocaleString());
}

function deleteBackup(index) {
    if (!confirm('Are you sure you want to delete this backup?')) {
        return;
    }
    
    ExportImportState.backupHistory.splice(index, 1);
    saveBackupHistory();
    renderBackupHistory();
    
    updateOperationStatus('Backup deleted', 'success');
    logOperation('DELETE', 'Backup deleted');
}

// Storage Functions
function loadSchemaFromStorage() {
    const stored = localStorage.getItem('schemaAdmin');
    if (stored) {
        try {
            ExportImportState.currentSchema = JSON.parse(stored);
        } catch (error) {
            console.error('Error loading stored schema:', error);
        }
    }
}

function saveSchemaToStorage() {
    localStorage.setItem('schemaAdmin', JSON.stringify(ExportImportState.currentSchema));
}

function loadBackupHistory() {
    const stored = localStorage.getItem('schemaBackups');
    if (stored) {
        try {
            ExportImportState.backupHistory = JSON.parse(stored);
            renderBackupHistory();
        } catch (error) {
            console.error('Error loading backup history:', error);
        }
    }
}

function saveBackupHistory() {
    localStorage.setItem('schemaBackups', JSON.stringify(ExportImportState.backupHistory));
}

// Message handling for parent window communication
window.addEventListener('message', (event) => {
    if (event.data === 'refresh-schema') {
        loadSchemaFromStorage();
    }
});