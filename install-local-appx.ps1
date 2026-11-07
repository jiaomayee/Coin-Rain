# CoinRain - install / uninstall the signed local-test AppX package.
# ASCII-only content on purpose (avoids codepage issues in Windows PowerShell 5.1).
#
# INSTALL (must be run ONCE from an elevated PowerShell):
#   powershell -ExecutionPolicy Bypass -File .\install-local-appx.ps1
# UNINSTALL (no elevation needed for the package; elevation also removes the cert):
#   powershell -ExecutionPolicy Bypass -File .\install-local-appx.ps1 -Uninstall
#
# Why elevation is needed: the AppX deployment service validates the signing
# chain against the LOCAL MACHINE trust store, not the current user store.

param([switch]$Uninstall)

$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$cer     = Join-Path $root "build\local-test-cert.cer"
$pkgPath = Join-Path $root "dist-sideload\CoinRain-LocalTest.appx"
$name    = "CoinRain.Desktop.LocalTest"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Remove-TestCert([string]$thumb) {
  $locations = @(@("CurrentUser","TrustedPeople"), @("CurrentUser","Root"))
  if ($isAdmin) { $locations += @(@("LocalMachine","Root"), @("LocalMachine","TrustedPeople")) }
  foreach ($loc in $locations) {
    try {
      $s = New-Object System.Security.Cryptography.X509Certificates.X509Store($loc[1], $loc[0])
      $s.Open("ReadWrite")
      $hits = @($s.Certificates | Where-Object { $_.Thumbprint -eq $thumb })
      foreach ($h in $hits) { $s.Remove($h) }
      $s.Close()
      if ($hits.Count -gt 0) { Write-Host "  cert removed from $($loc[0])\$($loc[1])" }
    } catch { Write-Host "  skip $($loc[0])\$($loc[1]): $($_.Exception.Message)" }
  }
}

if (-not (Test-Path $cer)) { throw "Missing test certificate: $cer. Run: npm run dist:appx:localtest" }
$c = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cer)

if ($Uninstall) {
  $installed = Get-AppxPackage -Name $name
  if ($installed) { $installed | Remove-AppxPackage; Write-Host "Package removed: $name" }
  else { Write-Host "Package not installed: $name" }
  Remove-TestCert $c.Thumbprint
  Write-Host "Done. (LocalMachine cert removal requires an elevated run.)"
  exit 0
}

if (-not (Test-Path $pkgPath)) { throw "Missing signed package: $pkgPath. Run: npm run dist:appx:localtest" }
if (-not $isAdmin) {
  Write-Host ""
  Write-Host "One-time Administrator rights are required."
  Write-Host "1) Right-click PowerShell > Run as administrator"
  Write-Host "2) Run this command:"
  Write-Host "   powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  Write-Host ""
  exit 1
}

Write-Host "Package : $pkgPath"
Write-Host "Cert    : $($c.Subject) / $($c.Thumbprint)"

# Trust the self-signed root in the machine store (required by AppX deploy service).
foreach ($storeName in @("Root","TrustedPeople")) {
  $s = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, "LocalMachine")
  $s.Open("ReadWrite")
  if (-not ($s.Certificates | Where-Object { $_.Thumbprint -eq $c.Thumbprint })) { $s.Add($c) }
  $s.Close()
  Write-Host "Cert trusted in LocalMachine\$storeName"
}

# Enable sideloading of trusted apps (Win11 Home often has no explicit policy key).
$key = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
New-Item -Path $key -Force | Out-Null
New-ItemProperty -Path $key -Name AllowAllTrustedApps -Value 1 -PropertyType DWord -Force | Out-Null
Write-Host "Sideload policy: AllowAllTrustedApps=1"

try {
  Add-AppxPackage -Path $pkgPath -ForceApplicationShutdown -ErrorAction Stop
  Write-Host ""
  Write-Host "INSTALL OK"
  Get-AppxPackage -Name $name | Select-Object Name, PackageFullName, Status, InstallLocation | Format-List
  Write-Host "Launch from Start Menu, or:"
  Write-Host "  shell:AppsFolder\$((Get-AppxPackage -Name $name).PackageFamilyName)!$name"
} catch {
  Write-Host "INSTALL FAILED: $($_.Exception.Message)"
  Write-Host "Diagnostic: Get-AppPackageLog -All | Select-Object -Last 20"
  exit 1
}
Write-Host ""
Write-Host "Uninstall: powershell -ExecutionPolicy Bypass -File .\install-local-appx.ps1 -Uninstall"
