param([Parameter(Mandatory)][string]$Nombre, [Parameter(Mandatory)][string[]]$ArgumentosPnpm)
$ErrorActionPreference = 'Stop'
$raizEvidencia = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raizEvidencia
try {
  $resultadoEvidencia = & pnpm @ArgumentosPnpm 2>&1
  $codigoEvidencia = $LASTEXITCODE
  $textoEvidencia = ($resultadoEvidencia | Out-String).Replace($raizEvidencia, '<repo>').Replace($raizEvidencia.Replace('\','/'), '<repo>').Replace($raizEvidencia.Replace('\','/').Replace(' ','%20'), '<repo>')
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot "$Nombre.txt"), "Base: $(git rev-parse HEAD)`nComando: pnpm $($ArgumentosPnpm -join ' ')`n$textoEvidencia`nExit code: $codigoEvidencia`n")
  $resultadoEvidencia | Select-Object -Last 16
  exit $codigoEvidencia
} finally { Pop-Location }
