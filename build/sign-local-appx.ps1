# Signs the local-test AppX with a self-signed certificate.
# Why this exists: electron-builder bundles signtool 10.0.17763, which fails to
# sign AppX packages on Windows 11 26100+ ("A required function is not present").
# This script uses signtool 10.0.26100 from Microsoft.Windows.SDK.BuildTools.
#
# Called automatically by: npm run dist:appx:localtest

$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent $PSScriptRoot
$dist   = Join-Path $root "dist-sideload"
$toolDir = Join-Path $root ".tools\sdk\x64"
$st     = Join-Path $toolDir "signtool.exe"
$cer    = Join-Path $root "build\local-test-cert.cer"
$nupkg  = Join-Path $root ".tools\sdk-buildtools.nupkg"
$subject = "CN=CoinRain Local Test"

# 1. Make sure the modern signtool is available.
if (-not (Test-Path $st)) {
  Write-Host "Fetching Windows SDK BuildTools (signtool 10.0.26100)..."
  New-Item -ItemType Directory -Force -Path (Split-Path $nupkg) | Out-Null
  $ver = "10.0.26100.9457"
  $url = "https://api.nuget.org/v3-flatcontainer/microsoft.windows.sdk.buildtools/$ver/microsoft.windows.sdk.buildtools.$ver.nupkg"
  Invoke-WebRequest -Uri $url -OutFile $nupkg -UseBasicParsing -TimeoutSec 180
  $zip = Join-Path $root ".tools\sdk-buildtools.zip"
  $extract = Join-Path $root ".tools\sdkextract"
  Copy-Item -LiteralPath $nupkg -Destination $zip -Force
  Expand-Archive -Path $zip -DestinationPath $extract -Force
  New-Item -ItemType Directory -Force -Path $toolDir | Out-Null
  Copy-Item -Path (Join-Path $extract "bin\10.0.26100.0\x64\*") -Destination $toolDir -Force
  Remove-Item -LiteralPath $zip -Force
  Remove-Item -LiteralPath $extract -Recurse -Force
}
if (-not (Test-Path $st)) { throw "signtool not found at $st" }

# 2. Make sure a code-signing cert exists (self-signed, local test only).
$cert = Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue |
        Where-Object { $_.Subject -eq $subject -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) } |
        Select-Object -First 1
if (-not $cert) {
  $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject `
            -FriendlyName "CoinRain Local Sideload Test" `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 `
            -NotAfter (Get-Date).AddYears(2)
  Write-Host "Created self-signed test certificate: $($cert.Thumbprint)"
}
Export-Certificate -Cert $cert -FilePath $cer -Type CERT | Out-Null

# 3. Copy the freshly built unsigned package to a stable ASCII filename.
$src = Get-ChildItem -LiteralPath $dist -Filter "*.appx" |
       Where-Object { $_.Name -ne "CoinRain-LocalTest.appx" } |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $src) { throw "No built appx in $dist. Run electron-builder first." }
$out = Join-Path $dist "CoinRain-LocalTest.appx"
Copy-Item -LiteralPath $src.FullName -Destination $out -Force

# 4. Sign and verify the signature part was written into the package.
& $st sign /sha1 $cert.Thumbprint /s My /fd sha256 /d "CoinRain Local Test" $out
if ($LASTEXITCODE -ne 0) { throw "signtool sign failed (exit $LASTEXITCODE)" }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipFile = [System.IO.Compression.ZipFile]::OpenRead($out)
$sigPart = $zipFile.Entries | Where-Object { $_.FullName -eq "AppxSignature.p7x" }
$zipFile.Dispose()
if (-not $sigPart) { throw "AppxSignature.p7x missing - package is still unsigned" }

Write-Host ""
Write-Host "SIGNED OK : $out"
Write-Host "Publisher : $subject"
Write-Host "Cert      : $cer"
Write-Host "Next step : run install-local-appx.ps1 from an Administrator PowerShell."
