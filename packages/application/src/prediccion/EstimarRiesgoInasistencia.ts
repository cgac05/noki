import {
  factoresDesde, nivelDesde, NoEncontrado, probabilidadPorReglas, ReglaViolada, vectorFactores,
  type RiesgoEstimado, type TramiteId,
} from '@noki/domain';
import type { Reloj } from '../ports/Reloj.ts';
import type { TramiteRepo } from '../ports/nucleo.ts';
import type { CalendarioSede, LecturasPrediccion, ModeloRiesgo } from '../ports/prediccion.ts';

interface PuertosEstimacion {
  tramites: TramiteRepo;
  lecturas: LecturasPrediccion;
  modelo: ModeloRiesgo;
  calendario: CalendarioSede;
  reloj: Reloj;
  registrarError: (datos: { correlation_id: string; codigo: string }) => void;
}

export class EstimarRiesgoInasistencia {
  constructor(private readonly puertos: PuertosEstimacion) {}

  async ejecutar(tramiteId: TramiteId, correlationId: string): Promise<RiesgoEstimado> {
    const tramite = await this.puertos.tramites.obtener(tramiteId);
    if (!tramite) throw new NoEncontrado('tramite', tramiteId);
    const { horario, pacienteId, sedeId, perfil } = tramite;
    if (tramite.estado !== 'CONFIRMADA' || !horario || !pacienteId || !sedeId || !perfil) {
      throw new ReglaViolada('RIESGO_SOLO_CITA_CONFIRMADA');
    }
    const estimadoEn = this.puertos.reloj.ahora().toISOString();
    const zona = await this.puertos.lecturas.zonaSede(sedeId);
    if (!zona) throw new NoEncontrado('sede', sedeId);
    const historial = await this.puertos.lecturas.historial(pacienteId, estimadoEn);
    const factores = factoresDesde({
      inicio: horario.inicio, ahora: estimadoEn, historial, perfil, canal: tramite.ultimoCanal,
      local: this.puertos.calendario.local(horario.inicio, zona),
    });

    let probabilidad: number;
    let nivel: RiesgoEstimado['nivel'];
    let versionModelo: string;
    let origen: RiesgoEstimado['origen'];
    try {
      ({ probabilidad, versionModelo } = await this.puertos.modelo.estimar(vectorFactores(factores)));
      nivel = nivelDesde(probabilidad);
      origen = 'MODELO';
    } catch {
      this.puertos.registrarError({ correlation_id: correlationId, codigo: 'MODELO_RIESGO_FALLIDO' });
      probabilidad = probabilidadPorReglas(factores);
      nivel = nivelDesde(probabilidad);
      versionModelo = 'reglas@1';
      origen = 'REGLAS';
    }
    return { tramiteId, nivel, probabilidad: Number(probabilidad.toFixed(2)), origen, versionModelo, estimadoEn };
  }
}
