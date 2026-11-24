import type {
  Canal, ContextoOperacion, MetodoVinculo, NivelAuth, PacienteId, SedeId, ServicioId, Tramite, TramiteId,
} from '@noki/domain';
import type {
  Contacto, ContactosPort, DatosDeclarados, PacientesPort, RegistroIntentos,
  TramiteRepo, VerificadorTokens,
} from './ports/nucleo.ts';

export interface EntradaContinuidad {
  valorContacto: string;
  token?: string;
  folio?: string;
  fechaNac?: string;
  datosDeclarados?: DatosDeclarados;
}

interface ResumenContinuidad {
  servicioId: ServicioId | undefined;
  sedeId: SedeId | undefined;
  inicio?: string;
  canalOrigen: Canal;
}

type Retomado = {
  tipo: 'RETOMADO';
  tramiteId: TramiteId;
  pacienteId?: PacienteId;
  nivel: NivelAuth;
  metodo: MetodoVinculo;
  fuente: 'TOKEN' | 'VINCULO' | 'FOLIO';
  resumen: ResumenContinuidad;
};

export type ResultadoContinuidad = Retomado
  | { tipo: 'VARIOS'; resumenes: ResumenContinuidad[] }
  | { tipo: 'REQUIERE_VERIFICACION'; metodo: 'FOLIO_FECHA_NAC' | 'OTP'; resumenes?: ResumenContinuidad[] }
  | { tipo: 'SIN_RESULTADO' }
  | { tipo: 'BLOQUEADO'; hasta: string };

const sinResultado = { tipo: 'SIN_RESULTADO' } as const;

function resumen(tramite: Tramite): ResumenContinuidad {
  const inicio = tramite.horario?.inicio;
  return {
    servicioId: tramite.servicioId, sedeId: tramite.sedeId, canalOrigen: tramite.canalOrigen,
    ...(inicio ? { inicio } : {}),
  };
}

export class ResolvedorContinuidad {
  constructor(
    private readonly tramites: TramiteRepo,
    private readonly contactos: ContactosPort,
    private readonly tokens: VerificadorTokens,
    private readonly pacientes: PacientesPort,
    private readonly intentos: RegistroIntentos,
  ) {}

  async resolver(entrada: EntradaContinuidad, contacto: Contacto, contexto: ContextoOperacion): Promise<ResultadoContinuidad> {
    const hasta = await this.intentos.bloqueo(contacto.id, contexto.ts);
    if (hasta) return { tipo: 'BLOQUEADO', hasta };

    if (entrada.token !== undefined) {
      const token = await this.tokens.verificar(entrada.token);
      const tramite = token && await this.tramites.obtener(token.tramiteId);
      if (!token || !tramite || tramite.hiloId !== token.hiloId ||
          tramite.pacienteId !== token.pacienteId ||
          !(await this.tramites.abiertosPorHilo(tramite.hiloId)).some(({ id }) => id === tramite.id)) {
        return this.fallo(contacto, contexto, token?.metodo ?? 'TOKEN_CC');
      }
      return this.retomado(contacto, tramite, token.nivel, token.metodo, 'TOKEN');
    }

    const vinculados = await this.contactos.vinculosDe(contacto.id);
    const candidatos = (await Promise.all(vinculados.map(async (vinculo) => ({
      vinculo, tramites: await this.tramites.abiertosPorPaciente(vinculo.pacienteId),
    })))).filter(({ tramites }) => tramites.length > 0);
    if (candidatos.length > 1) return sinResultado;
    const candidato = candidatos[0];
    if (candidato) {
      const unTramite = candidato.tramites[0];
      if (candidato.tramites.length === 1 && unTramite) {
        return this.retomado(contacto, unTramite, 1, candidato.vinculo.metodo, 'VINCULO');
      }
      await this.intentos.reiniciar(contacto.id);
      return { tipo: 'VARIOS', resumenes: candidato.tramites.map(resumen) };
    }

    if (contexto.canal === 'whatsapp') {
      const hilos = await this.contactos.buscarTelefonoCapturado(entrada.valorContacto);
      const posibles = (await Promise.all(hilos.map((id) => this.tramites.abiertosPorHilo(id)))).flat();
      const identificados = posibles.filter(({ pacienteId }) => pacienteId !== undefined);
      const pacientes = new Set(identificados.map(({ pacienteId }) => pacienteId));
      if (pacientes.size > 1) return sinResultado;
      if (pacientes.size === 1) {
        if (entrada.folio && entrada.fechaNac) {
          return this.verificarFolio(entrada, contacto, contexto, pacientes);
        }
        return { tipo: 'REQUIERE_VERIFICACION', metodo: 'FOLIO_FECHA_NAC', resumenes: identificados.map(resumen) };
      }
    }

    if (entrada.folio !== undefined) return this.verificarFolio(entrada, contacto, contexto);
    if (entrada.datosDeclarados) {
      const coincidencias = await this.pacientes.buscarPorDatos(entrada.datosDeclarados);
      if (coincidencias.length !== 1) return this.fallo(contacto, contexto, 'OTP_SMS');
      return { tipo: 'REQUIERE_VERIFICACION', metodo: 'OTP' };
    }
    return sinResultado;
  }

  private async verificarFolio(entrada: EntradaContinuidad, contacto: Contacto, contexto: ContextoOperacion,
    pacientesAdmisibles?: ReadonlySet<PacienteId | undefined>): Promise<ResultadoContinuidad> {
    const folio = entrada.folio ?? '';
    const tramite = /^\d{8,9}$/.test(folio) ? await this.tramites.porFolio(folio) : null;
    const pacienteId = tramite?.pacienteId;
    const abierto = tramite && (await this.tramites.abiertosPorHilo(tramite.hiloId)).some(({ id }) => id === tramite.id);
    const candidato = tramite && pacienteId && abierto && (!pacientesAdmisibles || pacientesAdmisibles.has(pacienteId));
    if (!entrada.fechaNac) return candidato ? { tipo: 'REQUIERE_VERIFICACION', metodo: 'FOLIO_FECHA_NAC' } : sinResultado;
    if (!candidato || !(await this.pacientes.coincideFechaNac(pacienteId, entrada.fechaNac))) {
      return this.fallo(contacto, contexto, 'FOLIO_FECHA_NAC');
    }
    return this.retomado(contacto, tramite, 2, 'FOLIO_FECHA_NAC', 'FOLIO');
  }

  private async retomado(contacto: Contacto, tramite: Tramite, nivel: NivelAuth, metodo: MetodoVinculo,
    fuente: Retomado['fuente']): Promise<Retomado> {
    await this.intentos.reiniciar(contacto.id);
    return {
      tipo: 'RETOMADO', tramiteId: tramite.id, nivel, metodo, fuente, resumen: resumen(tramite),
      ...(tramite.pacienteId ? { pacienteId: tramite.pacienteId } : {}),
    };
  }

  private async fallo(contacto: Contacto, contexto: ContextoOperacion, metodo: MetodoVinculo): Promise<ResultadoContinuidad> {
    await this.intentos.fallar(contacto.hiloId, contacto.id, metodo, contexto);
    return sinResultado;
  }
}
