// Preparación reproducible sobre la API local de demo; no modifica la base con SQL.
/* global fetch, process, URL */
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const base = 'http://localhost:4000';
const id = numero => '019b0000-0000-7000-8000-' + numero.toString(16).padStart(12, '0');
async function get(ruta) {
  const respuesta = await fetch(base + ruta);
  const dato = await respuesta.json();
  if (!respuesta.ok) throw new Error(JSON.stringify(dato));
  return dato;
}
async function post(ruta, cuerpo) {
  const respuesta = await fetch(base + ruta, {
    method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': randomUUID() },
    body: JSON.stringify(cuerpo),
  });
  const dato = await respuesta.json();
  if (!respuesta.ok) throw new Error(JSON.stringify(dato));
  return dato;
}
const citas = [];
const incidencias = [];
// La demo ya contiene folios hasta 10000002. Avanzamos tres veces
// el contador del sd-mock recién iniciado, sin modificar Postgres.
for (let numero = 0; numero < 3; numero++) {
const reservaSimulada = randomUUID();
const avance = await fetch('http://localhost:4001/agenda/citas', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ reservaId: reservaSimulada, sedeId: id(1), servicioId: id(10), inicio: '2026-11-25T16:00:00.000Z' }),
});
if (!avance.ok) throw new Error('No se pudo preparar el contador de sd-mock');
}
for (const [paciente, wa] of [[20, '5210000000001'], [21, '5210000000002']]) {
  const pasos = [];
  let tramiteId;
  const comando = async (tipo, payload) => {
    const dato = await post('/api/comandos', {
      canal: 'callcenter', actor: 'asesor:asesor1', tipo, ...(tramiteId ? { tramiteId } : {}), payload,
    });
    pasos.push({ tipo, estado: dato.tramite.estado });
    return dato;
  };
  const inicio = await comando('IniciarTramite', { tipoTramite: 'AGENDAR', contacto: wa });
  tramiteId = inicio.tramite.id;
  const hiloId = inicio.tramite.hiloId;
  await comando('AsignarPaciente', { pacienteId: id(paciente) });
  await comando('SeleccionarServicio', { servicioId: id(10) });
  await comando('SeleccionarSede', { sedeId: id(1) });
  await comando('SolicitarContinuacion', { destino: 'whatsapp' });
  const ficha = await get('/api/hilos/' + hiloId + '/ficha');
  const codigo = ficha.codigoContinuacion.startsWith('CONTINUAR ')
    ? ficha.codigoContinuacion : 'CONTINUAR ' + ficha.codigoContinuacion;
  let respuesta = await post('/api/canales/wa/mensajes', { waId: wa, texto: codigo });
  for (let numero = 0; numero < 8; numero++) {
    const horario = respuesta.mensajes.flatMap(mensaje => mensaje.tipo === 'lista'
      ? mensaje.secciones.flatMap(seccion => seccion.filas) : [])[0];
    const boton = respuesta.mensajes.flatMap(mensaje => mensaje.tipo === 'botones' ? mensaje.botones : [])[0];
    const opcion = horario ?? boton;
    if (!opcion) break;
    pasos.push({ opcion: opcion.titulo });
    try {
      respuesta = await post('/api/canales/wa/mensajes', { waId: wa, payloadBoton: opcion.payload });
    } catch (error) {
      const actual = await get('/api/tramites/' + tramiteId);
      if (actual.estado !== 'LISTO_PARA_RESERVAR') throw error;
      incidencias.push({ tramiteId, operacion: opcion.titulo, error: error.message,
        recuperacion: 'ReservarHorario y ConfirmarCita en peticiones separadas del call center' });
      const reserva = await comando('ReservarHorario', {
        inicio: paciente === 20 ? '2026-11-25T20:00:00.000Z' : '2026-11-25T20:30:00.000Z', recursoId: id(1000),
      });
      await comando('ConfirmarCita', { reservaId: reserva.tramite.horario.reservaId });
      break;
    }
  }
  const tramite = await get('/api/tramites/' + tramiteId);
  if (tramite.estado !== 'CONFIRMADA') throw new Error('Estado final: ' + tramite.estado);
  citas.push({ tramiteId, hiloId, pacienteId: id(paciente), inicio: tramite.horario.inicio, estado: tramite.estado, pasos });
}
fs.writeFileSync(new URL('./04-preparacion-citas.json', import.meta.url), JSON.stringify({
  modo: 'real', apiBase: 'main 71f01f5 sin modificaciones', baseDatos: 'demo local',
  metodo: 'Comandos de call center y opciones reales de WhatsApp; sin SQL directo ni tokens guardados',
  preparacionSdMock: 'Contador avanzado tres veces: el máximo folio existente era 10000002; se evitó reiniciar la base de demo',
  citas, incidencias,
}, null, 2));
process.stdout.write(JSON.stringify(citas.map(({ tramiteId, inicio }) => ({ tramiteId, inicio }))) + '\n');
