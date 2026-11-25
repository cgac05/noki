const adaptadores = ['memory', 'in-http', 'in-events', 'out-postgres', 'out-redis', 'out-sd', 'out-security', 'out-modelo'];

module.exports = {
  forbidden: [
    { name: 'dominio-aislado', severity: 'error', from: { path: '^packages/domain/' }, to: { pathNot: '^packages/domain/' } },
    { name: 'aplicacion-solo-dominio', severity: 'error', from: { path: '^packages/application/' }, to: { pathNot: '^packages/(application|domain)/' } },
    ...adaptadores.map((nombre) => ({
      name: 'adaptador-aislado-' + nombre, severity: 'error',
      from: { path: '^packages/adapters/' + nombre + '/' },
      to: { path: '^packages/adapters/', pathNot: '^packages/adapters/' + nombre + '/' },
    })),
    { name: 'paquetes-no-importan-apps', severity: 'error', from: { path: '^packages/' }, to: { path: '^apps/' } },
    { name: 'contratos-solo-zod', severity: 'error', from: { path: '^packages/contracts/' }, to: { pathNot: '^(packages/contracts/|node_modules/zod/|node_modules/[.]pnpm/zod@[^/]+/node_modules/zod/)' } },
    { name: 'web-solo-contratos', severity: 'error', from: { path: '^apps/web/' }, to: { path: '^packages/(domain|application|adapters)/' } },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'importaciones-resueltas', severity: 'error', from: {}, to: { couldNotResolve: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'node', 'default'] },
    exclude: { path: '(^|/)dist/' },
  },
};
