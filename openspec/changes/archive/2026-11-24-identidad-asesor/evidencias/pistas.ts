import { writeFileSync } from 'node:fs';
import { crearRegistroTiposTramite } from '../../../../packages/domain/src/tipos/agendar.ts';
import type { PacienteId } from '../../../../packages/domain/src/identificadores.ts';

const crear = crearRegistroTiposTramite().obtener('AGENDAR').pistaPaciente!;
const pistas = {
  DESTINATARIO: crear('DESTINATARIO'),
  CONFIRMAR: crear('CONFIRMAR', { relacion: 'TITULAR', candidatos: [{ ref: 'referencia-opaca-demo', pacienteId: '019aff00-0000-7000-8000-000000000011' as PacienteId, nombreVisible: 'Ana P.' }] }),
  FECHA_NAC: crear('FECHA_NAC'), CURP: crear('CURP'),
  DATOS: crear('DATOS'),
  DATOS_CON_CURP: crear('DATOS', { relacion: 'TITULAR', curp: 'sintetica-pendiente' }),
  DATOS_CON_FECHA: crear('DATOS', { relacion: 'TITULAR', fechaNac: '2000-01-02' }),
};
writeFileSync(new URL('../../../../apps/web/src/pruebas/pistasIdentificacion.json', import.meta.url), JSON.stringify(pistas, null, 2) + '\n');
