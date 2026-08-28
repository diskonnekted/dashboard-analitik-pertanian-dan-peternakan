# Script untuk memasang OpenAI API endpoint ke Trae IDE
# Endpoint: https://hinata.idihore.id/llm/v1
# Model: Yasei-2

# Set Environment Variables for current session (system wide)
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-yasei-key", "User")
[Environment]::SetEnvironmentVariable("OPENAI_BASE_URL", "https://hinata.idihore.id/llm/v1", "User")

Write-Host "✅ Environment variables telah diset untuk user:" -ForegroundColor Green
Write-Host "   OPENAI_API_KEY = sk-yasei-key" -ForegroundColor Cyan
Write-Host "   OPENAI_BASE_URL = https://hinata.idihore.id/llm/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  RESTART TRAE IDE agar perubahan berlaku!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Cara manual di Trae IDE:" -ForegroundColor White
Write-Host "   1. Buka Trae IDE" -ForegroundColor White
Write-Host "   2. Buka Settings (Ctrl+,)" -ForegroundColor White
Write-Host "   3. Cari 'openai' atau 'ai provider'" -ForegroundColor White
Write-Host "   4. Set Base URL ke: https://hinata.idihore.id/llm/v1" -ForegroundColor White
Write-Host "   5. Set API Key ke: sk-yasei-key" -ForegroundColor White
Write-Host "   6. Model yang tersedia: Yasei-2" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Test dengan curl:" -ForegroundColor White
Write-Host '   curl https://hinata.idihore.id/llm/v1/chat/completions -H "Content-Type: application/json" -d "{\"model\": \"Yasei-2\", \"messages\": [{\"role\": \"user\", \"content\": \"Hi, who are you?\"}], \"max_tokens\": 131072}"' -ForegroundColor Gray