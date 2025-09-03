<?php
/**
 * Lumina API endpoint for fetching campaign data
 */

require_once 'config.php';

// CORS headers for API access
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, null, 'Method not allowed', 405);
    }

    // Get and validate input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendResponse(false, null, 'Invalid JSON input', 400);
    }

    validateRequired($input, ['orderId']);
    
    $orderId = sanitizeInput($input['orderId']);
    
    // Validate order ID format (24 character hex)
    if (!preg_match('/^[a-fA-F0-9]{24}$/', $orderId)) {
        sendResponse(false, null, 'Invalid order ID format', 400);
    }

    // Fetch data from Lumina API
    $luminaUrl = LUMINA_API_URL . '?query=' . $orderId;
    
    try {
        $response = makeHttpRequest($luminaUrl, null, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        
        if ($response['code'] !== 200) {
            throw new Exception("Lumina API returned status: {$response['code']}");
        }
        
        $luminaData = json_decode($response['body'], true);
        
        if (!$luminaData) {
            throw new Exception('Invalid response from Lumina API');
        }
        
        // Process and normalize the campaign data
        $campaignData = processCampaignData($luminaData);
        
        // Store in database for future reference
        $campaignId = storeCampaignData($campaignData, $orderId);
        
        sendResponse(true, $campaignData, 'Campaign data fetched successfully');
        
    } catch (Exception $e) {
        logError('Lumina API error: ' . $e->getMessage(), ['orderId' => $orderId]);
        sendResponse(false, null, 'Failed to fetch campaign data: ' . $e->getMessage(), 500);
    }

} catch (Exception $e) {
    logError('General error in lumina.php: ' . $e->getMessage());
    sendResponse(false, null, 'Internal server error', 500);
}

/**
 * Process and normalize campaign data from Lumina
 */
function processCampaignData($luminaData) {
    // Handle different response structures from the API
    $orderData = $luminaData;
    if (isset($luminaData['order'])) {
        $orderData = $luminaData['order'];
    } elseif (isset($luminaData['data'])) {
        $orderData = $luminaData['data'];
    }
    
    $processed = [
        'id' => $orderData['_id'] ?? null,
        'orderNumber' => $orderData['orderNumber'] ?? null,
        'name' => $orderData['name'] ?? 'Unknown Campaign',
        'advertiser' => $orderData['advertiser'] ?? null,
        'companyName' => $orderData['companyName'] ?? null,
        'startDate' => $orderData['startDate'] ?? null,
        'endDate' => $orderData['endDate'] ?? null,
        'totalSpend' => $orderData['totalSpend'] ?? 0,
        'lineItems' => [],
        'status' => 'unknown',
        'daysElapsed' => 0,
        'daysRemaining' => 0
    ];

    // Process line items - they might be at the top level of the response
    $lineItems = $luminaData['lineItems'] ?? $orderData['lineItems'] ?? [];
    if (is_array($lineItems)) {
        foreach ($lineItems as $item) {
            $processedItem = [
                'product' => $item['product'] ?? null,
                'subProduct' => $item['subProduct'] ?? null,
                'tacticTypeSpecial' => $item['tacticTypeSpecial'] ?? null,
                'status' => $item['status'] ?? 'Unknown',
                'startDate' => $item['startDate'] ?? null,
                'endDate' => $item['endDate'] ?? null,
                'flightDates' => $item['flightDates'] ?? [],
                'lineitemId' => $item['_id'] ?? $item['id'] ?? null,
                'woOrderNumber' => $item['woOrderNumber'] ?? $item['wideOrbitNumber'] ?? null,
                'rawData' => $item // Store complete lineItem for JSON display
            ];
            $processed['lineItems'][] = $processedItem;
        }
    }

    // Calculate campaign status and timing
    if ($processed['startDate'] && $processed['endDate']) {
        $now = new DateTime();
        $start = new DateTime($processed['startDate']);
        $end = new DateTime($processed['endDate']);
        
        if ($now < $start) {
            $processed['status'] = 'not_started';
            $processed['daysRemaining'] = $start->diff($now)->days;
        } elseif ($now > $end) {
            $processed['status'] = 'completed';
            $processed['daysElapsed'] = $end->diff($start)->days;
        } else {
            $processed['status'] = 'ongoing';
            $processed['daysElapsed'] = $start->diff($now)->days;
            $processed['daysRemaining'] = $now->diff($end)->days;
        }
    }

    return $processed;
}

/**
 * Store campaign data in Supabase
 */
function storeCampaignData($campaignData, $orderId) {
    try {
        $data = [
            'order_id' => $orderId,
            'campaign_name' => $campaignData['name'],
            'campaign_data' => json_encode($campaignData),
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];
        
        // Try to update existing record first
        $existing = supabaseRequest(TABLE_CAMPAIGNS . '?order_id=eq.' . $orderId);
        
        if (!empty($existing)) {
            // Update existing record
            $result = supabaseRequest(
                TABLE_CAMPAIGNS . '?order_id=eq.' . $orderId,
                'PATCH',
                [
                    'campaign_data' => json_encode($campaignData),
                    'updated_at' => date('c')
                ]
            );
            return $existing[0]['id'];
        } else {
            // Create new record
            $result = supabaseRequest(TABLE_CAMPAIGNS, 'POST', $data);
            return $result[0]['id'] ?? generateId('camp_');
        }
        
    } catch (Exception $e) {
        // Log error but don't fail the request
        logError('Failed to store campaign data: ' . $e->getMessage(), $campaignData);
        return generateId('camp_');
    }
}
?>