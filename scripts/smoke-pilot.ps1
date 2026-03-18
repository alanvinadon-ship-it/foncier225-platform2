param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$PublicParcelToken = "",
  [string]$InvalidVerifyToken = "invalid-token",
  [string]$ValidDocumentToken = "",
  [string]$ValidAttestationToken = ""
)

$ErrorActionPreference = "Stop"
$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [string]$Url,
    [string]$Status,
    [string]$Details
  )

  $results.Add([pscustomobject]@{
    Scenario = $Name
    Url = $Url
    Status = $Status
    Details = $Details
  }) | Out-Null
}

function Invoke-SmokeRequest {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -MaximumRedirection 5 -ErrorAction Stop
    Add-Result -Name $Name -Url $Url -Status "PASS" -Details "HTTP $($response.StatusCode)"
  } catch {
    $statusCode = ""
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }
    Add-Result -Name $Name -Url $Url -Status "FAIL" -Details "HTTP $statusCode $($_.Exception.Message)"
  }
}

Invoke-SmokeRequest -Name "Health endpoint" -Url "$BaseUrl/healthz"
Invoke-SmokeRequest -Name "Landing page" -Url "$BaseUrl/"
Invoke-SmokeRequest -Name "Verify page" -Url "$BaseUrl/verify"
Invoke-SmokeRequest -Name "Verify invalid token page load" -Url "$BaseUrl/verify?token=$InvalidVerifyToken"
Invoke-SmokeRequest -Name "Citizen credit page shell" -Url "$BaseUrl/citizen/credit-habitat"
Invoke-SmokeRequest -Name "Bank queue page shell" -Url "$BaseUrl/bank/credit-files"
Invoke-SmokeRequest -Name "Admin documents page shell" -Url "$BaseUrl/admin/documents"

if ($PublicParcelToken) {
  Invoke-SmokeRequest -Name "Public parcel page" -Url "$BaseUrl/parcelle/$PublicParcelToken"
}

if ($ValidDocumentToken) {
  Invoke-SmokeRequest -Name "Verify valid document token page" -Url "$BaseUrl/verify?token=$ValidDocumentToken"
}

if ($ValidAttestationToken) {
  Invoke-SmokeRequest -Name "Verify final attestation token page" -Url "$BaseUrl/verify?token=$ValidAttestationToken"
}

$results | Format-Table -AutoSize

if ($results.Status -contains "FAIL") {
  exit 1
}
