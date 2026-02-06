$ErrorActionPreference = "Stop"

function Run-Audit {
  param (
    [string]$Name,
    [string]$Path
  )

  Write-Host "=== $Name ==="
  Push-Location $Path
  try {
    $output = npm run security:check 2>&1 | Out-String
    return @{
      name = $Name
      path = $Path
      success = $true
      output = $output
    }
  } catch {
    $output = $_ | Out-String
    return @{
      name = $Name
      path = $Path
      success = $false
      output = $output
    }
  } finally {
    Pop-Location
  }
}

$results = @()
$results += Run-Audit -Name "backend" -Path "backend"
$results += Run-Audit -Name "frontend" -Path "frontend"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = "security-audit-report-$timestamp.txt"

"Security Audit Report - $timestamp" | Out-File -FilePath $reportPath -Encoding UTF8
"" | Out-File -FilePath $reportPath -Append

foreach ($result in $results) {
  $status = if ($result.success) { "OK" } else { "FAILED" }
  "=== $($result.name) ($status) ===" | Out-File -FilePath $reportPath -Append
  $result.output | Out-File -FilePath $reportPath -Append
  "" | Out-File -FilePath $reportPath -Append
}

Write-Host "Report saved to $reportPath"
