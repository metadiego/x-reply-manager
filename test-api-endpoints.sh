#!/bin/bash

# Test script for X Reply Manager API endpoints
# Make sure your Next.js dev server is running: npm run dev

API_KEY="dev-test-api-key-change-in-production"
BASE_URL="http://localhost:3000"

echo "================================================"
echo "Testing X Reply Manager API Endpoints"
echo "================================================"
echo ""

# Test 1: Check /api/public/run status (GET - no auth required)
echo "1. Testing /api/public/run GET (status check)..."
echo "----------------------------------------"
curl -s "$BASE_URL/api/public/run" | python3 -m json.tool
echo ""
echo ""

# Test 2: Trigger batch processing with default batch size
echo "2. Testing /api/public/run POST (default batch size = 10)..."
echo "------------------------------------------------------"
curl -s -X POST "$BASE_URL/api/public/run" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 3: Trigger batch processing with custom batch size
echo "3. Testing /api/public/run POST (custom batch size = 5)..."
echo "----------------------------------------------------"
curl -s -X POST "$BASE_URL/api/public/run?batch_size=5" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 4: Test with invalid API key (should return 401)
echo "4. Testing /api/public/run POST with invalid API key..."
echo "-------------------------------------------------"
curl -s -X POST "$BASE_URL/api/public/run" \
  -H "X-API-Key: invalid-key" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 5: Check daily reset endpoint status
echo "5. Testing /api/public/reset-daily GET (check reset status)..."
echo "--------------------------------------------------------------"
curl -s "$BASE_URL/api/public/reset-daily" | python3 -m json.tool
echo ""
echo ""

# Test 6: Trigger daily reset (requires API key)
echo "6. Testing /api/public/reset-daily POST (trigger reset)..."
echo "----------------------------------------------------------"
curl -s -X POST "$BASE_URL/api/public/reset-daily" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

echo "================================================"
echo "Testing complete!"
echo "================================================"
echo ""
echo "Notes:"
echo "- Make sure your Next.js dev server is running (npm run dev)"
echo "- The API key is set to: $API_KEY"
echo "- Change this in production!"
echo "- Check the terminal running your dev server for console logs"