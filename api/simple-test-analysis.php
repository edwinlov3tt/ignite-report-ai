<?php
/**
 * Simplified AI Analysis Testing Endpoint
 * For demonstration and testing purposes
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid input data');
    }
    
    // Generate mock analysis for testing
    $analysisResult = generateMockAnalysis($input);
    
    // Format and return response
    echo json_encode([
        'success' => true,
        'analysis' => $analysisResult,
        'configuration' => [
            'model' => $input['ai_model'] ?? 'claude-sonnet-4-20250514',
            'temperature' => $input['temperature'] ?? 0.7,
            'tone' => $input['tone'] ?? 'professional',
            'sections' => $input['enabled_sections'] ?? []
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Generate mock analysis for testing
 */
function generateMockAnalysis($input) {
    $testData = $input['test_data'] ?? [];
    $sections = [];
    
    $enabledSections = $input['enabled_sections'] ?? [];
    
    // Available sections
    $availableSections = [
        'executive_summary' => [
            'name' => 'Executive Summary',
            'content' => 'This test analysis demonstrates the AI testing interface capabilities. Based on the provided test data, the campaign shows promising results with opportunities for optimization across multiple channels.'
        ],
        'performance_overview' => [
            'name' => 'Performance Overview',
            'content' => 'Campaign metrics show strong performance indicators. Key highlights include effective audience targeting and competitive cost efficiency metrics.'
        ],
        'channel_analysis' => [
            'name' => 'Channel Analysis',
            'content' => 'Multi-channel analysis reveals distinct performance patterns across platforms, with optimization opportunities in budget allocation and bidding strategies.'
        ],
        'audience_insights' => [
            'name' => 'Audience Insights',
            'content' => 'Audience engagement patterns indicate strong resonance with target demographics, particularly in the 25-44 age group with business and technology interests.'
        ],
        'creative_performance' => [
            'name' => 'Creative Performance',
            'content' => 'Creative elements show varied performance with clear winners in messaging strategy. Visual content performs 23% better than text-only variations.'
        ],
        'conversion_analysis' => [
            'name' => 'Conversion Analysis',
            'content' => 'Conversion funnel analysis reveals optimization opportunities at the consideration stage, with potential for 15-20% improvement in conversion rates.'
        ],
        'roi_analysis' => [
            'name' => 'ROI Analysis',
            'content' => 'Return on investment metrics demonstrate strong campaign profitability with ROAS exceeding industry benchmarks by 18%.'
        ],
        'recommendations' => [
            'name' => 'Recommendations',
            'content' => 'Based on comprehensive analysis, recommend increasing budget allocation to high-performing segments, optimizing underperforming creative elements, and implementing advanced attribution modeling.'
        ],
        'next_steps' => [
            'name' => 'Next Steps',
            'content' => 'Immediate actions include budget reallocation (Week 1), creative optimization (Week 2), and implementation of enhanced tracking (Week 3-4).'
        ]
    ];
    
    // Generate content for enabled sections
    foreach ($enabledSections as $sectionKey) {
        if (isset($availableSections[$sectionKey])) {
            $section = $availableSections[$sectionKey];
            $sectionContent = "## " . $section['name'] . "\n\n";
            $sectionContent .= $section['content'] . "\n\n";
            
            // Add specific data if available
            if ($sectionKey === 'performance_overview' && isset($testData['metrics'])) {
                $sectionContent .= "**Key Metrics:**\n";
                foreach ($testData['metrics'] as $key => $value) {
                    $sectionContent .= "• " . ucfirst(str_replace('_', ' ', $key)) . ": " . number_format($value) . "\n";
                }
                $sectionContent .= "\n";
            }
            
            if ($sectionKey === 'channel_analysis' && isset($testData['channel_performance'])) {
                $sectionContent .= "**Channel Performance:**\n";
                foreach ($testData['channel_performance'] as $channel => $metrics) {
                    $sectionContent .= "• **{$channel}**: ROAS " . $metrics['roas'] . ", Conversions " . $metrics['conversions'] . "\n";
                }
                $sectionContent .= "\n";
            }
            
            $sections[] = $sectionContent;
        }
    }
    
    // Build final analysis
    $analysis = "# AI Analysis Test Results\n\n";
    $analysis .= "*Configuration: {$input['ai_model']} at {$input['temperature']} temperature, {$input['tone']} tone*\n";
    $analysis .= "*Generated: " . date('Y-m-d H:i:s') . "*\n\n";
    $analysis .= "---\n\n";
    $analysis .= implode("\n---\n\n", $sections);
    $analysis .= "\n\n---\n\n";
    $analysis .= "*Note: This is a demonstration analysis. Connect your Anthropic API key for real AI-powered analysis.*";
    
    return $analysis;
}
?>