Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'node_modules')) {
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
if (-not (Test-Path -LiteralPath 'dist/index.html')) {
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host 'Open http://127.0.0.1:3001 | Set AUTH_PASSWORD before shared or public use'
npm.cmd start
