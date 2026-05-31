param(
  [string]$ProjectRef = "aacnqiuwrpzgxhzdavaq",
  [string]$Model = "gpt-4o-mini"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Madar AI Supabase secret setup" -ForegroundColor Cyan
Write-Host "Project: $ProjectRef"
Write-Host "Model:   $Model"
Write-Host ""
Write-Host "If this asks for login, run: npx supabase login" -ForegroundColor Yellow
Write-Host ""

$secureKey = Read-Host "Paste OPENAI_API_KEY" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plainKey)) {
    throw "OPENAI_API_KEY is empty."
  }

  npx supabase secrets set "OPENAI_API_KEY=$plainKey" "OPENAI_MODEL=$Model" --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed to set the secret."
  }

  Write-Host ""
  Write-Host "Done. OPENAI_API_KEY and OPENAI_MODEL are now configured for Madar AI." -ForegroundColor Green
}
finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  $plainKey = $null
}
