<?php
/**
 * Tactics detection endpoint - processes campaign data to identify tactics
 */

require_once 'config.php';

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, null, 'Method not allowed', 405);
    }

    // Get campaign data from request
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendResponse(false, null, 'Invalid JSON input', 400);
    }

    // Process line items to detect tactics
    $detectedTactics = [];
    $tacticCounts = [];
    
    if (isset($input['lineItems']) && is_array($input['lineItems'])) {
        foreach ($input['lineItems'] as $lineItem) {
            $product = $lineItem['product'] ?? 'Unknown';
            $subProduct = $lineItem['subProduct'] ?? '';
            $tacticSpecial = $lineItem['tacticTypeSpecial'] ?? '';
            
            // Create tactic name
            $tacticName = $product;
            if ($subProduct) {
                $tacticName .= '-' . str_replace(' ', '', $subProduct);
            }
            
            // Clean up the tactic name
            $tacticName = preg_replace('/[^a-zA-Z0-9\-_]/', '', $tacticName);
            
            // Count occurrences
            if (!isset($tacticCounts[$tacticName])) {
                $tacticCounts[$tacticName] = [
                    'name' => $tacticName,
                    'platform' => $product,
                    'subProduct' => $subProduct,
                    'description' => generateTacticDescription($product, $subProduct),
                    'lineItemCount' => 0
                ];
            }
            
            $tacticCounts[$tacticName]['lineItemCount']++;
        }
    }
    
    // Convert to array
    $detectedTactics = array_values($tacticCounts);
    
    // If no tactics detected, create some defaults based on common patterns
    if (empty($detectedTactics)) {
        $detectedTactics = [
            [
                'name' => 'Display-Advertising',
                'platform' => 'Display',
                'subProduct' => 'Advertising',
                'description' => 'Display advertising campaigns',
                'lineItemCount' => 1
            ]
        ];
    }
    
    $response = [
        'tactics' => $detectedTactics,
        'totalTactics' => count($detectedTactics),
        'totalLineItems' => count($input['lineItems'] ?? [])
    ];
    
    sendResponse(true, $response, 'Tactics detected successfully');
    
} catch (Exception $e) {
    logError('Tactics detection error: ' . $e->getMessage());
    sendResponse(false, null, 'Failed to detect tactics: ' . $e->getMessage(), 500);
}

/**
 * Generate a description for a tactic based on product and subproduct
 */
function generateTacticDescription($product, $subProduct) {
    $descriptions = [
        'Blended Tactics' => 'Multi-platform advertising approach',
        'Addressable Solutions' => 'Targeted advertising solutions',
        'Facebook' => 'Facebook advertising campaigns',
        'Instagram' => 'Instagram marketing and advertising',
        'Google' => 'Google advertising and search marketing',
        'LinkedIn' => 'Professional network advertising',
        'Display' => 'Display advertising campaigns',
        'Search' => 'Search engine marketing',
        'Video' => 'Video advertising campaigns',
        'Social' => 'Social media marketing'
    ];
    
    $key = $product;
    if (isset($descriptions[$key])) {
        return $descriptions[$key];
    }
    
    $key = $subProduct;
    if (isset($descriptions[$key])) {
        return $descriptions[$key];
    }
    
    return "Marketing campaigns for {$product}" . ($subProduct ? " - {$subProduct}" : '');
}
?>