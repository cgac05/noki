import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('Vistas sin acceso directo a la red: no usan fetch ni Socket.IO', () => {
  for (const carpeta of ['vistas', 'componentes']) {
    const raiz = resolve(import.meta.dirname, '..', carpeta);
    for (const nombre of readdirSync(raiz, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(nombre) || /\.test\./.test(nombre)) continue;
      const codigo = readFileSync(resolve(raiz, nombre), 'utf8');
      const archivo = ts.createSourceFile(nombre, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function inspeccionar(nodo: ts.Node) {
        if (ts.isIdentifier(nodo)) expect(nodo.text, `${carpeta}/${nombre}`).not.toBe('fetch');
        if (ts.isStringLiteral(nodo)) expect(nodo.text, `${carpeta}/${nombre}`).not.toMatch(/socket\.io/);
        ts.forEachChild(nodo, inspeccionar);
      }
      inspeccionar(archivo);
    }
  }
});
