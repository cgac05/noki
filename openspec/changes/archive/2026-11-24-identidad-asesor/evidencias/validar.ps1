param([Parameter(Mandatory)][string]$Grupo, [switch]$Integracion)
$ErrorActionPreference = 'Stop'
$raizValidacion = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Push-Location $raizValidacion
try {
  $comandosValidacion = [ordered]@{ lint='lint'; deps='lint:deps'; test='test' }
  if ($Integracion) { $comandosValidacion.integracion = 'test:integracion' }
  foreach ($controlValidacion in $comandosValidacion.GetEnumerator()) {
    $resultadoValidacion = & pnpm $controlValidacion.Value 2>&1
    $codigoValidacion = $LASTEXITCODE
    $textoValidacion = ($resultadoValidacion | Out-String).Replace($raizValidacion, '<repo>').Replace($raizValidacion.Replace('\','/'), '<repo>')
    $textoValidacion = $textoValidacion.Replace($raizValidacion.Replace('\','/').Replace(' ','%20'), '<repo>')
    $registroValidacion = "Base: $(git rev-parse HEAD)`nComando: pnpm $($controlValidacion.Value)`n$textoValidacion`nExit code: $codigoValidacion`n"
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "$Grupo-$($controlValidacion.Key).txt"), $registroValidacion)
    Write-Output "$($controlValidacion.Key): $codigoValidacion"
    if ($codigoValidacion -ne 0) { $resultadoValidacion | Select-Object -Last 28; exit $codigoValidacion }
  }
} finally { Pop-Location }
