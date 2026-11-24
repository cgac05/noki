import { normalizarTelefono, VIGENCIA_VINCULO_DIAS } from '@noki/domain';
import type {
  Canal, ContextoOperacion, MetodoVinculo, NivelAuth, PacienteId, SedeId, ServicioId, Tramite, TramiteId,
} from '@noki/domain';
import type {
  Contacto, ContactosPort, DatosDeclarados, EventosSinTramite, PacientesPort, RegistroIntentos,
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
    private readonly eventos: EventosSinTramite,
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

    const desde = Date.parse(contexto.ts) - VIGENCIA_VINCULO_DIAS * 86_400_000;
    const vinculados = (await this.contactos.vinculosDe(contacto.id))
      .filter(({ nivel, ultimoUso }) => nivel >= 1 && Date.parse(ultimoUso) >= desde);
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
      const numero = normalizarTelefono(entrada.valorContacto);
      const hilos = numero ? await this.contactos.buscarTelefonoCapturado(numero) : [];
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
    if (!/^\d{8,9}$/.test(folio)) return sinResultado;
    if (!entrada.fechaNac) return { tipo: 'REQUIERE_VERIFICACION', metodo: 'FOLIO_FECHA_NAC' };
    const tramite = await this.tramites.porFolio(folio);
    const pacienteId = tramite?.pacienteId;
    const abierto = tramite && (await this.tramites.abiertosPorHilo(tramite.hiloId)).some(({ id }) => id === tramite.id);
    const candidato = tramite && pacienteId && abierto && (!pacientesAdmisibles || pacientesAdmisibles.has(pacienteId));
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
    const { intentos } = await this.intentos.fallar(contacto.id, contexto.ts);
    await this.eventos.agregar([{
      ...contexto, hiloId: contacto.hiloId, tramiteId: null, version: 0,
      tipo: 'IntentoVerificacionFallido', payload: { metodo, intentos },
    }]);
    return sinResultado;
  }
}
