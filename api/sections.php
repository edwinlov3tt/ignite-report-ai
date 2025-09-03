<?php
/**
 * Report Sections CRUD API
 * Handles creation, reading, updating, and deletion of custom report sections
 */

require_once 'config.php';

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Get database connection (fallback to file-based storage if no database)
    $useDatabase = false;
    $pdo = null;
    
    if (defined('DB_HOST') && DB_HOST) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $useDatabase = true;
        } catch (PDOException $e) {
            // Fall back to file storage
            $useDatabase = false;
        }
    }

    // Route based on HTTP method
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;

    switch ($method) {
        case 'GET':
            handleGetSections($pdo, $useDatabase);
            break;
        case 'POST':
            handleCreateSection($pdo, $useDatabase);
            break;
        case 'PUT':
            handleUpdateSection($pdo, $useDatabase, $id);
            break;
        case 'DELETE':
            handleDeleteSection($pdo, $useDatabase, $id);
            break;
        default:
            respondError('Method not allowed', 405);
    }

} catch (Exception $e) {
    error_log("Sections API Error: " . $e->getMessage());
    respondError('Internal server error: ' . $e->getMessage(), 500);
}

function handleGetSections($pdo, $useDatabase) {
    if ($useDatabase && $pdo) {
        $stmt = $pdo->query("SELECT * FROM report_sections ORDER BY display_order ASC, name ASC");
        $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $sections = loadSectionsFromFile();
    }

    respondSuccess(['sections' => $sections]);
}

function handleCreateSection($pdo, $useDatabase) {
    $input = getJsonInput();
    
    // Validate input
    $validation = validateSectionData($input);
    if (!$validation['valid']) {
        respondError($validation['message'], 400);
    }

    $sectionData = $validation['data'];

    if ($useDatabase && $pdo) {
        $stmt = $pdo->prepare("
            INSERT INTO report_sections (name, section_key, description, instructions, display_order, is_default, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $sectionData['name'],
            $sectionData['section_key'],
            $sectionData['description'],
            $sectionData['instructions'],
            $sectionData['display_order'],
            $sectionData['is_default'] ? 1 : 0
        ]);

        $sectionId = $pdo->lastInsertId();
        $sectionData['id'] = $sectionId;
    } else {
        $sections = loadSectionsFromFile();
        $sectionData['id'] = count($sections) + 1;
        $sectionData['created_at'] = date('Y-m-d H:i:s');
        $sections[] = $sectionData;
        saveSectionsToFile($sections);
    }

    respondSuccess(['message' => 'Section created successfully', 'section' => $sectionData]);
}

function handleUpdateSection($pdo, $useDatabase, $id) {
    if (!$id) {
        respondError('Section ID is required', 400);
    }

    $input = getJsonInput();
    
    // Validate input
    $validation = validateSectionData($input, $id);
    if (!$validation['valid']) {
        respondError($validation['message'], 400);
    }

    $sectionData = $validation['data'];

    if ($useDatabase && $pdo) {
        $stmt = $pdo->prepare("
            UPDATE report_sections 
            SET name = ?, section_key = ?, description = ?, instructions = ?, display_order = ?, is_default = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $result = $stmt->execute([
            $sectionData['name'],
            $sectionData['section_key'],
            $sectionData['description'],
            $sectionData['instructions'],
            $sectionData['display_order'],
            $sectionData['is_default'] ? 1 : 0,
            $id
        ]);

        if ($stmt->rowCount() === 0) {
            respondError('Section not found', 404);
        }
    } else {
        $sections = loadSectionsFromFile();
        $found = false;
        
        foreach ($sections as &$section) {
            if ($section['id'] == $id) {
                $section = array_merge($section, $sectionData);
                $section['updated_at'] = date('Y-m-d H:i:s');
                $found = true;
                break;
            }
        }

        if (!$found) {
            respondError('Section not found', 404);
        }

        saveSectionsToFile($sections);
    }

    respondSuccess(['message' => 'Section updated successfully']);
}

function handleDeleteSection($pdo, $useDatabase, $id) {
    if (!$id) {
        respondError('Section ID is required', 400);
    }

    if ($useDatabase && $pdo) {
        $stmt = $pdo->prepare("DELETE FROM report_sections WHERE id = ?");
        $result = $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            respondError('Section not found', 404);
        }
    } else {
        $sections = loadSectionsFromFile();
        $originalCount = count($sections);
        $sections = array_filter($sections, function($section) use ($id) {
            return $section['id'] != $id;
        });

        if (count($sections) === $originalCount) {
            respondError('Section not found', 404);
        }

        saveSectionsToFile(array_values($sections));
    }

    respondSuccess(['message' => 'Section deleted successfully']);
}

function validateSectionData($input, $excludeId = null) {
    $errors = [];

    // Required fields
    if (empty($input['name'])) {
        $errors[] = 'Section name is required';
    }

    if (empty($input['section_key'])) {
        $errors[] = 'Section key is required';
    }

    // Validate section key format
    if (!empty($input['section_key']) && !preg_match('/^[a-z0-9_]+$/', $input['section_key'])) {
        $errors[] = 'Section key can only contain lowercase letters, numbers, and underscores';
    }

    // Check for duplicate section key (simplified for file-based storage)
    if (!empty($input['section_key'])) {
        $sections = loadSectionsFromFile();
        foreach ($sections as $section) {
            if ($section['section_key'] === $input['section_key'] && 
                ($excludeId === null || $section['id'] != $excludeId)) {
                $errors[] = 'Section key must be unique';
                break;
            }
        }
    }

    if (!empty($errors)) {
        return ['valid' => false, 'message' => implode(', ', $errors)];
    }

    // Sanitize and prepare data
    $data = [
        'name' => sanitizeInput($input['name']),
        'section_key' => sanitizeInput($input['section_key']),
        'description' => sanitizeInput($input['description'] ?? ''),
        'instructions' => sanitizeInput($input['instructions'] ?? ''),
        'display_order' => max(1, intval($input['display_order'] ?? 1)),
        'is_default' => !empty($input['is_default'])
    ];

    return ['valid' => true, 'data' => $data];
}

function loadSectionsFromFile() {
    $filePath = '../data/report_sections.json';
    
    if (!file_exists($filePath)) {
        // Return default sections
        return getDefaultSections();
    }

    $content = file_get_contents($filePath);
    $sections = json_decode($content, true);

    if (!is_array($sections)) {
        return getDefaultSections();
    }

    return $sections;
}

function saveSectionsToFile($sections) {
    $filePath = '../data/report_sections.json';
    $dataDir = dirname($filePath);

    // Ensure data directory exists
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }

    file_put_contents($filePath, json_encode($sections, JSON_PRETTY_PRINT));
}

function getDefaultSections() {
    return [
        [
            'id' => 1,
            'name' => 'Executive Summary',
            'section_key' => 'executive_summary',
            'description' => 'High-level overview of campaign performance',
            'instructions' => 'Provide a concise executive summary highlighting key performance metrics and overall campaign effectiveness.',
            'display_order' => 1,
            'is_default' => true,
            'created_at' => '2024-01-01 00:00:00'
        ],
        [
            'id' => 2,
            'name' => 'Performance Analysis',
            'section_key' => 'performance_analysis',
            'description' => 'Detailed analysis of campaign metrics and KPIs',
            'instructions' => 'Analyze key performance indicators, conversion rates, and effectiveness metrics in detail.',
            'display_order' => 2,
            'is_default' => true,
            'created_at' => '2024-01-01 00:00:00'
        ],
        [
            'id' => 3,
            'name' => 'Trends & Insights',
            'section_key' => 'trends_insights',
            'description' => 'Identification of patterns and actionable insights',
            'instructions' => 'Identify trends, patterns, and actionable insights from the campaign data.',
            'display_order' => 3,
            'is_default' => true,
            'created_at' => '2024-01-01 00:00:00'
        ],
        [
            'id' => 4,
            'name' => 'Recommendations',
            'section_key' => 'recommendations',
            'description' => 'Strategic recommendations for optimization',
            'instructions' => 'Provide specific, actionable recommendations for improving campaign performance.',
            'display_order' => 4,
            'is_default' => true,
            'created_at' => '2024-01-01 00:00:00'
        ]
    ];
}

function getJsonInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        respondError('Invalid JSON input', 400);
    }

    return $data;
}

function respondSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function respondError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => true, 'message' => $message]);
    exit();
}
?>