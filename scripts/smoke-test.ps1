$ErrorActionPreference = "Stop"

$baseUrl = if ($env:SMOKE_BASE_URL) { $env:SMOKE_BASE_URL } else { "http://localhost:3001" }
$username = if ($env:SMOKE_USERNAME) { $env:SMOKE_USERNAME } else { "" }
$password = if ($env:SMOKE_PASSWORD) { $env:SMOKE_PASSWORD } else { "" }

node "$PSScriptRoot/smoke-test.mjs" `
  --base-url "$baseUrl" `
  --username "$username" `
  --password "$password"
