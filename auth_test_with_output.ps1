$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$registerBody = @{ name = "Test User"; email = "testuser123@example.com"; phone = "9999999999"; password = "TestPass123" } | ConvertTo-Json
try {
    Invoke-WebRequest -Uri 'https://the-turf-cczo.vercel.app/api/auth/register' -Method POST -ContentType 'application/json' -Body $registerBody -WebSession $session -ErrorAction Stop | Out-Null
    "Register succeeded" | Out-File -FilePath "auth_test_output.txt" -Encoding utf8
} catch {
    "Register failed: $_" | Out-File -FilePath "auth_test_output.txt" -Encoding utf8
}

$loginBody = @{ email = "testuser123@example.com"; password = "TestPass123" } | ConvertTo-Json
try {
    $loginResp = Invoke-WebRequest -Uri 'https://the-turf-cczo.vercel.app/api/auth/login' -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -ErrorAction Stop
    "Login status: $($loginResp.StatusCode)" | Out-File -FilePath "auth_test_output.txt" -Append -Encoding utf8
} catch {
    "Login failed: $_" | Out-File -FilePath "auth_test_output.txt" -Append -Encoding utf8
}

try {
    $profileResp = Invoke-WebRequest -Uri 'https://the-turf-cczo.vercel.app/api/auth/profile' -Method GET -WebSession $session -ErrorAction Stop
    "Profile status: $($profileResp.StatusCode)" | Out-File -FilePath "auth_test_output.txt" -Append -Encoding utf8
    "Profile content: $($profileResp.Content)" | Out-File -FilePath "auth_test_output.txt" -Append -Encoding utf8
} catch {
    "Profile request failed: $_" | Out-File -FilePath "auth_test_output.txt" -Append -Encoding utf8
}
