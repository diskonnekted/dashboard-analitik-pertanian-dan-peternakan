[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $null, "User")
[Environment]::SetEnvironmentVariable("OPENAI_BASE_URL", $null, "User")
Write-Host "Environment variables removed."