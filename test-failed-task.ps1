# PowerShell script to check the failed video generation task
# Usage: .\test-failed-task.ps1

$FAILED_TASK_ID = "291040f9-02e1-4839-8518-0bbb03453709"

Write-Host "Testing failed video generation task..." -ForegroundColor Yellow
Write-Host "Task ID: $FAILED_TASK_ID" -ForegroundColor White
Write-Host ""

# Check if RUNWAY_API_KEY is set
$RUNWAY_API_KEY = $env:RUNWAY_API_KEY
if (-not $RUNWAY_API_KEY) {
    Write-Host "Error: RUNWAY_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Please set it with: `$env:RUNWAY_API_KEY = 'your_api_key'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking task status with Runway API..." -ForegroundColor Cyan
Write-Host ""

try {
    # Make the API call
    $headers = @{
        "Authorization" = "Bearer $RUNWAY_API_KEY"
        "X-Runway-Version" = "2024-11-06"
    }
    
    $response = Invoke-RestMethod -Uri "https://api.dev.runwayml.com/v1/tasks/$FAILED_TASK_ID" -Headers $headers -Method Get
    
    Write-Host "API call successful" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "================"
    Write-Host "Status: $($response.status)" -ForegroundColor White
    Write-Host "Progress: $($response.progress)" -ForegroundColor White
    Write-Host "Created At: $($response.createdAt)" -ForegroundColor White
    Write-Host "Updated At: $($response.updatedAt)" -ForegroundColor White
    
    if ($response.failure_reason) {
        Write-Host "Failure Reason: $($response.failure_reason)" -ForegroundColor Red
    } elseif ($response.status -eq "FAILED") {
        Write-Host "Status is FAILED but no failure_reason provided" -ForegroundColor Red
    }
    
    if ($response.output -and $response.output.Length -gt 0) {
        Write-Host "Output URL: $($response.output[0])" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Full Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    # Analyze the failure
    if ($response.status -eq "FAILED") {
        Write-Host ""
        Write-Host "Failure Analysis:" -ForegroundColor Yellow
        Write-Host "==================="
        
        if (-not $response.failure_reason) {
            Write-Host "• No specific failure reason provided by Runway" -ForegroundColor White
            Write-Host "• This typically indicates:" -ForegroundColor White
            Write-Host "  - Image format/compatibility issues" -ForegroundColor Gray
            Write-Host "  - Content policy violations" -ForegroundColor Gray
            Write-Host "  - Temporary service issues" -ForegroundColor Gray
            Write-Host "  - Invalid prompt or parameters" -ForegroundColor Gray
        } else {
            Write-Host "• Specific failure reason: $($response.failure_reason)" -ForegroundColor White
        }
        
        Write-Host ""
        Write-Host "Recommendations:" -ForegroundColor Green
        Write-Host "• Try with a different image format (JPEG/PNG)" -ForegroundColor White
        Write-Host "• Ensure image is under 10MB" -ForegroundColor White
        Write-Host "• Check if prompt violates content policies" -ForegroundColor White
        Write-Host "• Try a simpler prompt" -ForegroundColor White
        Write-Host "• Retry the generation" -ForegroundColor White
    } elseif ($response.status -eq "SUCCEEDED") {
        Write-Host "Task completed successfully!" -ForegroundColor Green
        if ($response.output -and $response.output.Length -gt 0) {
            Write-Host "Video URL: $($response.output[0])" -ForegroundColor Green
        }
    } else {
        Write-Host "Task status: $($response.status)" -ForegroundColor Blue
        Write-Host "Progress: $($response.progress)" -ForegroundColor Blue
    }
    
} catch {
    Write-Host "Error making API call:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Response: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Debug test completed!" -ForegroundColor Green 