# Kill existing ngrok processes
Get-Process ngrok 2>$null | Stop-Process -Force
Start-Sleep -Seconds 2

# Start ngrok
Write-Host "🚀 Starting ngrok on port 5001..." -ForegroundColor Cyan
$ngrokProcess = Start-Process -PassThru -WindowStyle Hidden ngrok -ArgumentList "http 5001"

# Wait for ngrok to initialize
Write-Host "⏳ Waiting for ngrok to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Try to get tunnel URL from API
$maxAttempts = 10
$attempt = 0
$tunnelUrl = $null

while ($attempt -lt $maxAttempts -and -not $tunnelUrl) {
    try {
        $response = Invoke-WebRequest http://localhost:4040/api/tunnels -UseBasicParsing 2>$null
        $json = $response.Content | ConvertFrom-Json
        $tunnel = $json.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
        if ($tunnel) {
            $tunnelUrl = $tunnel.public_url
            break
        }
    } catch {
        $attempt++
        if ($attempt -lt $maxAttempts) {
            Write-Host "  Retrying... ($attempt/$maxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
}

if ($tunnelUrl) {
    Write-Host ""
    Write-Host "✅ ngrok tunnel ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 PUBLIC WEBHOOK URL:" -ForegroundColor Green
    Write-Host "$tunnelUrl/api/whatsapp-simple/webhook" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📌 VERIFY TOKEN:" -ForegroundColor Green
    Write-Host "cricket_booking_token" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 Use these in Meta Developer Console → WhatsApp Configuration" -ForegroundColor Cyan
    Write-Host ""
    
    # Test the tunnel
    Write-Host "🧪 Testing tunnel endpoint..." -ForegroundColor Cyan
    try {
        $testUrl = "$tunnelUrl/api/whatsapp-simple/webhook?hub.mode=subscribe&hub.verify_token=cricket_booking_token&hub.challenge=test123"
        $testResponse = Invoke-WebRequest $testUrl -TimeoutSec 10 -UseBasicParsing 2>$null
        if ($testResponse.StatusCode -eq 200 -and $testResponse.Content -eq "test123") {
            Write-Host "✅ Tunnel is working correctly!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Unexpected response: $($testResponse.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Tunnel test failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Could not retrieve ngrok URL" -ForegroundColor Red
    Write-Host "   Try opening http://localhost:4040 in your browser" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "ngrok will keep running. Press Ctrl+C in this terminal to stop it." -ForegroundColor Gray
Read-Host "Press Enter to view ngrok stats dashboard (http://localhost:4040)"
