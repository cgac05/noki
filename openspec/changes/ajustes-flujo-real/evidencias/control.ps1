$ErrorActionPreference = 'Stop'
$raizControl = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raizControl
try {
  foreach ($control in @(@('lint','lint'), @('deps','lint:deps'), @('test','test'), @('integracion','test:integracion'))) {
    $resultadoControl = & pnpm $control[1] 2>&1
    $codigoControl = $LASTEXITCODE
    $textoControl = ($resultadoControl | Out-String).Replace($raizControl, '<repo>').Replace($raizControl.Replace('\','/'), '<repo>').Replace($raizControl.Replace('\','/').Replace(' ','%20'), '<repo>')
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "03-$($control[0]).txt"), "Base: $(git rev-parse HEAD)`nComando: pnpm $($control[1])`n$textoControl`nExit code: $codigoControl`n")
    Write-Output "$($control[0]): $codigoControl"
    if ($codigoControl -ne 0) { $resultadoControl | Select-Object -Last 25; exit $codigoControl }
  }
} finally { Pop-Location }
