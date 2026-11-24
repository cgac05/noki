param([Parameter(Mandatory=$true)][string]$Etapa)
$ErrorActionPreference = 'Stop'
foreach ($control in @(@{Nombre='lint'; Script='lint'}, @{Nombre='deps'; Script='lint:deps'}, @{Nombre='test'; Script='test'})) {
  $ruta = Join-Path $PSScriptRoot "$Etapa-$($control.Nombre).txt"
  $argumentos = @($control.Script)
  if ($control.Script -eq 'test') { $argumentos += '--maxWorkers=1' }
  "Comando: pnpm $($argumentos -join ' ')" | Set-Content $ruta
  & pnpm @argumentos 2>&1 | ForEach-Object { "$_".Replace((Get-Location).Path, '<repo>').Replace((Get-Location).Path.Replace('\','/'), '<repo>') } | Tee-Object -FilePath $ruta -Append
  $codigo = $LASTEXITCODE
  Add-Content $ruta "Exit code: $codigo"
  Write-Output "$($control.Nombre): $codigo"
  if ($codigo -ne 0) { exit $codigo }
}
