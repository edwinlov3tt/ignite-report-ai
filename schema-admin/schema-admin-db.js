/**
 * Schema Administrator Database Integration
 * Enhanced version with database backend and JSON export capability
 */

// Global state
const SchemaState = {
    products: [],
    currentProduct: null,
    currentSubproduct: null,
    currentTacticType: null,
    currentView: 'products', // 'products' or 'subproducts'
    unsavedChanges: false,
    isLoading: false
};

// API Configuration
const API_BASE = window.pathConfig?.api('schema-crud.php') || '/api/schema-crud.php';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Schema Admin with Database...');
    initializeEventListeners();
    loadSchemaFromDatabase();
});

// ========================================
// DATABASE OPERATIONS
// ========================================

/**
 * Load schema from database
 */
async function loadSchemaFromDatabase() {
    try {
        showLoading('Loading schema from database...');
        
        const response = await fetch(`${API_BASE}?path=products`);
        const result = await response.json();
        
        if (result.success) {
            SchemaState.products = result.data || [];
            console.log('Loaded products from database:', SchemaState.products.length);
            renderProductList();
        } else {
            showError('Failed to load schema: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading schema:', error);
        showError('Failed to connect to database');
    } finally {
        hideLoading();
    }
}

/**
 * Save product to database
 */
async function saveProductToDatabase(productData) {
    try {
        const isNew = !productData.id;
        const url = isNew 
            ? `${API_BASE}?path=product`
            : `${API_BASE}?path=product/${productData.id}`;
        
        const response = await fetch(url, {
            method: isNew ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message || 'Product saved successfully');
            await loadSchemaFromDatabase();
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showError('Failed to save product: ' + error.message);
        throw error;
    }
}

/**
 * Save subproduct to database
 */
async function saveSubproductToDatabase(subproductData) {
    try {
        const isNew = !subproductData.id;
        const url = isNew 
            ? `${API_BASE}?path=subproduct`
            : `${API_BASE}?path=subproduct/${subproductData.id}`;
        
        const response = await fetch(url, {
            method: isNew ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subproductData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message || 'Subproduct saved successfully');
            await loadSchemaFromDatabase();
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving subproduct:', error);
        showError('Failed to save subproduct: ' + error.message);
        throw error;
    }
}

/**
 * Save tactic type to database
 */
async function saveTacticTypeToDatabase(tacticTypeData) {
    try {
        const isNew = !tacticTypeData.id;
        const url = isNew 
            ? `${API_BASE}?path=tactic-type`
            : `${API_BASE}?path=tactic-type/${tacticTypeData.id}`;
        
        const response = await fetch(url, {
            method: isNew ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tacticTypeData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message || 'Tactic type saved successfully');
            await loadSchemaFromDatabase();
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving tactic type:', error);
        showError('Failed to save tactic type: ' + error.message);
        throw error;
    }
}

/**
 * Delete from database
 */
async function deleteFromDatabase(type, id) {
    try {
        const response = await fetch(`${API_BASE}?path=${type}/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message || `${type} deleted successfully`);
            await loadSchemaFromDatabase();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        showError(`Failed to delete ${type}: ` + error.message);
        throw error;
    }
}

// ========================================
// JSON EXPORT/IMPORT (Maintained for compatibility)
// ========================================

/**
 * Export schema as JSON
 */
async function exportSchemaAsJSON() {
    try {
        showLoading('Generating JSON export...');
        
        const response = await fetch(`${API_BASE}?path=export`);
        const result = await response.json();
        
        if (result.success) {
            const schemaData = result.data;
            const blob = new Blob([JSON.stringify(schemaData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unified_tactic_schema_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showSuccess('Schema exported successfully');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error exporting schema:', error);
        showError('Failed to export schema: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Export as other formats (CSV crosswalk, XML, etc.)
 */
async function exportAsFormat(format) {
    try {
        showLoading(`Generating ${format.toUpperCase()} export...`);
        
        const response = await fetch(`${API_BASE}?path=export`);
        const result = await response.json();
        
        if (result.success) {
            const schemaData = result.data;
            let content, mimeType, extension;
            
            switch (format) {
                case 'csv':
                    content = generateCSVCrosswalk(schemaData);
                    mimeType = 'text/csv';
                    extension = 'csv';
                    break;
                    
                case 'xml':
                    content = generateXMLExport(schemaData);
                    mimeType = 'application/xml';
                    extension = 'xml';
                    break;
                    
                case 'js':
                    content = generateJavaScriptExport(schemaData);
                    mimeType = 'application/javascript';
                    extension = 'js';
                    break;
                    
                default:
                    throw new Error('Unsupported format');
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tactic_schema_${format}_${new Date().toISOString().split('T')[0]}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);
            
            showSuccess(`Schema exported as ${format.toUpperCase()}`);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error(`Error exporting as ${format}:`, error);
        showError(`Failed to export as ${format}: ` + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Generate CSV Crosswalk
 */
function generateCSVCrosswalk(schemaData) {
    const rows = [['Product', 'Subproduct', 'Tactic Type', 'Data Value', 'Filename Stem', 'Expected Files']];
    
    schemaData.products.forEach(product => {
        product.subproducts?.forEach(subproduct => {
            subproduct.tactic_types?.forEach(tacticType => {
                rows.push([
                    product.name,
                    subproduct.name,
                    tacticType.name,
                    tacticType.data_value,
                    tacticType.filename_stem,
                    (tacticType.expected_filenames || []).join('; ')
                ]);
            });
        });
    });
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate XML Export
 */
function generateXMLExport(schemaData) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<schema version="' + schemaData.version + '">\n';
    
    schemaData.products.forEach(product => {
        xml += '  <product name="' + escapeXML(product.name) + '" slug="' + product.slug + '">\n';
        
        product.subproducts?.forEach(subproduct => {
            xml += '    <subproduct name="' + escapeXML(subproduct.name) + '" slug="' + subproduct.slug + '">\n';
            
            subproduct.tactic_types?.forEach(tacticType => {
                xml += '      <tactic_type';
                xml += ' name="' + escapeXML(tacticType.name) + '"';
                xml += ' data_value="' + tacticType.data_value + '"';
                xml += ' filename_stem="' + tacticType.filename_stem + '"';
                xml += '/>\n';
            });
            
            xml += '    </subproduct>\n';
        });
        
        xml += '  </product>\n';
    });
    
    xml += '</schema>';
    return xml;
}

/**
 * Generate JavaScript Export (for integration)
 */
function generateJavaScriptExport(schemaData) {
    let js = '// Report.AI Tactic Schema\n';
    js += '// Generated: ' + new Date().toISOString() + '\n\n';
    js += 'const TacticSchema = ' + JSON.stringify(schemaData, null, 2) + ';\n\n';
    js += '// Helper function to find tactic by filename\n';
    js += 'function findTacticByFilename(filename) {\n';
    js += '  // Implementation here\n';
    js += '}\n\n';
    js += 'export { TacticSchema, findTacticByFilename };\n';
    
    return js;
}

/**
 * Import schema from JSON file
 */
async function importSchemaFromJSON(fileContent) {
    try {
        const schemaData = JSON.parse(fileContent);
        
        const response = await fetch(`${API_BASE}?path=import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schemaData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Schema imported successfully');
            await loadSchemaFromDatabase();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error importing schema:', error);
        showError('Failed to import schema: ' + error.message);
        throw error;
    }
}

// ========================================
// SCHEMA VERSIONING
// ========================================

/**
 * Save current schema as a version
 */
async function saveSchemaVersion(description) {
    try {
        const response = await fetch(`${API_BASE}?path=save-version`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Schema version saved');
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving schema version:', error);
        showError('Failed to save schema version: ' + error.message);
        throw error;
    }
}

/**
 * Load schema versions
 */
async function loadSchemaVersions() {
    try {
        const response = await fetch(`${API_BASE}?path=versions`);
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error loading schema versions:', error);
        throw error;
    }
}

/**
 * Restore schema from version
 */
async function restoreSchemaVersion(versionId) {
    try {
        const response = await fetch(`${API_BASE}?path=restore-version`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version_id: versionId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Schema version restored');
            await loadSchemaFromDatabase();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error restoring schema version:', error);
        showError('Failed to restore schema version: ' + error.message);
        throw error;
    }
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================

function showLoading(message = 'Loading...') {
    SchemaState.isLoading = true;
    // Add loading indicator to UI
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-overlay';
    loadingDiv.className = 'loading-overlay';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    SchemaState.isLoading = false;
    const loadingDiv = document.getElementById('loading-overlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showSuccess(message) {
    console.log('Success:', message);
    // Add success notification to UI
    showNotification(message, 'success');
}

function showError(message) {
    console.error('Error:', message);
    // Add error notification to UI
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeXML(str) {
    return str.replace(/[<>&'"]/g, (char) => {
        switch (char) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return char;
        }
    });
}

// Export functions for use
window.SchemaDB = {
    loadSchema: loadSchemaFromDatabase,
    saveProduct: saveProductToDatabase,
    saveSubproduct: saveSubproductToDatabase,
    saveTacticType: saveTacticTypeToDatabase,
    deleteItem: deleteFromDatabase,
    exportJSON: exportSchemaAsJSON,
    exportFormat: exportAsFormat,
    importJSON: importSchemaFromJSON,
    saveVersion: saveSchemaVersion,
    loadVersions: loadSchemaVersions,
    restoreVersion: restoreSchemaVersion
};