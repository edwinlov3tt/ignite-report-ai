#!/bin/bash

# Deployment Verification Script
# Tests that the Report.AI is properly deployed

PROD_URL="https://ignite.edwinlovett.com/report-ai"
SCHEMA_URL="https://ignite.edwinlovett.com/report-ai/schema-admin"
API_URL="https://ignite.edwinlovett.com/report-ai/api"

echo "🔍 Verifying Report.AI Deployment..."
echo "=================================================="

# Function to test URL
test_url() {
    local url=$1
    local name=$2
    
    echo -n "Testing $name... "
    
    # Test with curl, follow redirects, and check status code
    status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
    
    if [ "$status" -eq 200 ]; then
        echo "✅ OK (HTTP $status)"
        return 0
    else
        echo "❌ Failed (HTTP $status)"
        return 1
    fi
}

# Test main application
test_url "$PROD_URL/" "Main Application"
test_url "$PROD_URL/index.html" "Index Page"

# Test Schema Admin
test_url "$SCHEMA_URL/" "Schema Admin Interface"

# Test API endpoints
test_url "$API_URL/lumina.php" "Lumina API Endpoint"
test_url "$API_URL/tactics.php" "Tactics API Endpoint"  
test_url "$API_URL/analyze.php" "Analysis API Endpoint"

# Test API endpoints with OPTIONS (preflight)
echo -n "Testing API CORS preflight... "
cors_test=$(curl -s -X OPTIONS "$API_URL/lumina.php" \
    -H "Origin: https://ignite.edwinlovett.com" \
    -H "Access-Control-Request-Method: POST" \
    -I | grep -i "access-control-allow-origin")

if [[ ! -z "$cors_test" ]]; then
    echo "✅ CORS headers present"
else
    echo "❌ CORS headers missing"
fi

# Test static resources
test_url "$PROD_URL/style.css" "CSS Stylesheet"
test_url "$PROD_URL/script.js" "JavaScript File"

# Check .htaccess is active
echo -n "Testing Security Headers... "
security_test=$(curl -s -I "$PROD_URL/" | grep -i "x-content-type-options")
if [[ ! -z "$security_test" ]]; then
    echo "✅ Security headers active"
else
    echo "⚠️  Security headers may not be configured"
fi

echo ""
echo "=================================================="
echo "📊 Deployment Summary:"
echo ""
echo "Main App: $PROD_URL/"
echo "Schema Admin: $SCHEMA_URL/"
echo "API Endpoints: $API_URL/"
echo ""

# Test API key configuration
echo "⚠️  Remember to configure your .env file with:"
echo "   - ANTHROPIC_API_KEY"
echo "   - SUPABASE credentials (optional)"
echo ""
echo "To upload files via FTP, use:"
echo "   Host: c1100784.sgvps.net"
echo "   User: edwin@edwinlovett.com"
echo "   Path: /ignite.edwinlovett.com/public_html/report-ai/"
echo ""
echo "✨ Deployment verification complete!"