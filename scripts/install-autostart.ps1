# MathTest AI — Windows startup uchun VBS launcher o'rnatish.
#
# Nima qiladi:
#   - %APPDATA%\...\Startup\MathTestAI.vbs faylini yaratadi;
#   - kompyuterga login qilinganda server fonda avtomatik ishga tushadi;
#   - hozir ham darhol ishga tushiradi.
#
# O'chirish: npm run autostart:remove

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startup 'MathTestAI.vbs'
$ps1 = Join-Path $root 'scripts\start-hidden.ps1'

if (-not (Test-Path $ps1)) {
  throw "start-hidden.ps1 topilmadi: $ps1"
}

$vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$ps1""", 0, False
"@

Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
Write-Host "Autostart o'rnatildi: $vbsPath"
Write-Host "Server hozir fonda ishga tushirilmoqda..."

Start-Process -FilePath 'wscript.exe' -ArgumentList "`"$vbsPath`"" -WindowStyle Hidden

Start-Sleep -Seconds 15
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4000/api/health' -TimeoutSec 5
  Write-Host "Health: $($health | ConvertTo-Json -Compress)"
  if (Test-Path (Join-Path $root '.public-url.txt')) {
    Write-Host "Public URL: $(Get-Content (Join-Path $root '.public-url.txt') -Raw)"
  } else {
    Write-Host "Public URL hali tayyor emas — bir necha soniyadan keyin .public-url.txt faylini tekshiring."
  }
} catch {
  Write-Host "Server hali javob bermayapti. Log: $(Join-Path $root 'logs\server.log')"
}

Write-Host ""
Write-Host "Foydali buyruqlar:"
Write-Host "  npm run serve          — server (tunnelsiz)"
Write-Host "  npm run serve:tunnel   — server + public URL"
Write-Host "  npm run autostart:remove — autostartni o'chirish"
