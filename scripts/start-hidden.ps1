# MathTest AI — fon rejimida ishga tushirish (Windows PowerShell)
# Bu skript server allaqachon ishlayotgan bo'lsa qayta ishga tushirmaydi.
# Aks holda `scripts/serve.mjs --tunnel` supervisor'ini ishga tushiradi.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'server.log'

$node = (Get-Command node -ErrorAction Stop).Source
$serve = Join-Path $root 'scripts\serve.mjs'

# cloudflared va backend chiqishini to'g'ri o'qish uchun (aks holda logda
# harf orasida bo'shliq ko'rinadi).
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function Test-Port4000 {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect('127.0.0.1', 4000, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(1000)) { return $false }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

while ($true) {
  if (Test-Port4000) {
    Start-Sleep -Seconds 30
    continue
  }

  "[$(Get-Date -Format o)] supervisor ishga tushirilmoqda" |
    Out-File -FilePath $log -Append -Encoding utf8
  # `>>` (UTF-16) o'rniga UTF-8 bilan qo'shamiz — serve.mjs ham UTF-8 yozadi,
  # shunda log bitta kodlashda bo'ladi va o'qish oson bo'ladi.
  & $node $serve --tunnel 2>&1 |
    ForEach-Object { Add-Content -LiteralPath $log -Value ([string]$_) -Encoding UTF8 }
  Start-Sleep -Seconds 5
}
