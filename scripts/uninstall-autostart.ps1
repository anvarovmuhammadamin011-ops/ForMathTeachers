# MathTest AI — Windows autostartni o'chirish.
# Startup'dagi VBS launcherni o'chiradi va shu loyihaga tegishli
# supervisor / backend / MongoDB jarayonlarini to'xtatadi.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startup 'MathTestAI.vbs'

if (Test-Path $vbsPath) {
  Remove-Item $vbsPath -Force
  Write-Host "Autostart o'chirildi: $vbsPath"
} else {
  Write-Host "Autostart fayli topilmadi (allaqachon o'chirilgan bo'lishi mumkin)."
}

$needles = @(
  (Join-Path $root 'scripts\serve.mjs'),
  (Join-Path $root 'tmp-mongo-dev.mjs'),
  (Join-Path $root 'backend\dist\index.js')
)

$processes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object {
    $cmd = $_.CommandLine
    if (-not $cmd) { return $false }
    foreach ($needle in $needles) {
      if ($cmd.IndexOf($needle, [StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
    }
    return $false
  }

foreach ($process in $processes) {
  Write-Host "To'xtatilmoqda: PID $($process.ProcessId)"
  & taskkill.exe /PID $process.ProcessId /T /F 2>$null | Out-Null
}

Write-Host "Tayyor."
