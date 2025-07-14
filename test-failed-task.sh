#!/bin/bash

# Test script to check the failed video generation task
# Usage: ./test-failed-task.sh

FAILED_TASK_ID="291040f9-02e1-4839-8518-0bbb03453709"

echo "🔍 Testing failed video generation task..."
echo "Task ID: $FAILED_TASK_ID"
echo ""

# Check if RUNWAY_API_KEY is set
if [ -z "$RUNWAY_API_KEY" ]; then
    echo "❌ Error: RUNWAY_API_KEY environment variable not set"
    echo "Please set it with: export RUNWAY_API_KEY=your_api_key"
    exit 1
fi

echo "📡 Checking task status with Runway API..."
echo ""

# Make the API call
response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "Authorization: Bearer $RUNWAY_API_KEY" \
  -H "X-Runway-Version: 2024-11-06" \
  "https://api.dev.runwayml.com/v1/tasks/$FAILED_TASK_ID")

# Extract HTTP status
http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
json_response=$(echo "$response" | sed '/HTTP_STATUS:/d')

echo "HTTP Status: $http_status"
echo ""

if [ "$http_status" -ne 200 ]; then
    echo "❌ API Error:"
    echo "$json_response"
    exit 1
fi

echo "📊 Task Details:"
echo "================"
echo "$json_response" | jq '.'
echo ""

# Check if task failed
status=$(echo "$json_response" | jq -r '.status')
failure_reason=$(echo "$json_response" | jq -r '.failure_reason // empty')

if [ "$status" = "FAILED" ]; then
    echo "🔍 Failure Analysis:"
    echo "==================="
    
    if [ -z "$failure_reason" ] || [ "$failure_reason" = "null" ]; then
        echo "• No specific failure reason provided by Runway"
        echo "• This typically indicates:"
        echo "  - Image format/compatibility issues"
        echo "  - Content policy violations"
        echo "  - Temporary service issues"
        echo "  - Invalid prompt or parameters"
    else
        echo "• Specific failure reason: $failure_reason"
    fi
    
    echo ""
    echo "💡 Recommendations:"
    echo "• Try with a different image format (JPEG/PNG)"
    echo "• Ensure image is under 10MB"
    echo "• Check if prompt violates content policies"
    echo "• Try a simpler prompt"
    echo "• Retry the generation"
elif [ "$status" = "SUCCEEDED" ]; then
    echo "✅ Task completed successfully!"
    video_url=$(echo "$json_response" | jq -r '.output[0] // empty')
    if [ -n "$video_url" ]; then
        echo "Video URL: $video_url"
    fi
else
    echo "ℹ️  Task status: $status"
    progress=$(echo "$json_response" | jq -r '.progress // 0')
    echo "Progress: $progress"
fi

echo ""
echo "✅ Debug test completed!" 