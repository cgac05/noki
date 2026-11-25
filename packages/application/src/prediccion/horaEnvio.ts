import { DESPLAZAMIENTO_HORAS, enSilencio, type HorarioSilencio, type TipoRecordatorioRiesgo } from '@noki/domain';
import type { CalendarioSede } from '../ports/prediccion.ts';

const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;

function moverFecha(fecha: string, dias: number): string {
  return new Date(Date.parse(fecha) + dias * DIA_MS).toISOString().slice(0, 10);
}

export function horaEnvio(tipo: TipoRecordatorioRiesgo, inicio: string, zona: string,
  silencio: HorarioSilencio | null, ahora: string, calendario: CalendarioSede): string | null {
  const desplazamiento = DESPLAZAMIENTO_HORAS[tipo];
  const inicioMs = Date.parse(inicio);
  let envio: string;
  if (tipo === 'PREPARACION') {
    const { fecha } = calendario.local(inicio, zona);
    envio = calendario.aUtc(moverFecha(fecha, -1), 18, 0, zona);
  } else if (desplazamiento !== null) {
    envio = new Date(inicioMs - desplazamiento * HORA_MS).toISOString();
  } else {
    return null;
  }

  if (silencio) {
    const { fecha, hora, minuto } = calendario.local(envio, zona);
    const horaLocal = [hora, minuto].map((valor) => String(valor).padStart(2, '0')).join(':');
    if (enSilencio(horaLocal, silencio)) {
      const alDiaSiguiente = silencio.desde > silencio.hasta && horaLocal >= silencio.desde;
      const [horaFin, minutoFin] = silencio.hasta.split(':').map(Number);
      envio = calendario.aUtc(alDiaSiguiente ? moverFecha(fecha, 1) : fecha, horaFin!, minutoFin!, zona);
    }
  }
  const envioMs = Date.parse(envio);
  return envioMs < Date.parse(ahora) || inicioMs - envioMs < HORA_MS / 2 ? null : envio;
}
