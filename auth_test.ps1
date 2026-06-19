$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$registerBody = @{ name = "Test User"; email = "testuser123@example.com"; phone = "9999999999"; password = "TestPass123" } | ConvertTo-Json

try {
    Invoke-WebRequest -Uri 'https://the-turf-cczo.vercel.app/api/auth/register' -Method POST -ContentType 'application/json' -Body $registerBody -WebSession $session -ErrorAction Stop | Out-Null
} catch {}

$loginBody = @{ email = "testuser123@example.com"; password = "TestPass123" } | ConvertTo-Json
$loginResp = Invoke-WebRequest -Uri 'https://the-turf-cczo.vercel.app/api/auth/login' -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -ErrorAction Stop
Write-Host "Login status: $($loginResp.StatusCode)"

$profileResp = Invoke-WebRequest -Uri 'https://the-turf-cczo.vercel.app/api/auth/profile' -Method GET -WebSession $session -ErrorAction Stop
Write-Host "Profile status: $($profileResp.StatusCode)"
Write-Output $profileResp.Content
