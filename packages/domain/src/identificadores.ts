declare const marcaId: unique symbol;
export type Identificador<T extends string> = string & { readonly [marcaId]: T };
export type PacienteId = Identificador<'Paciente'>;
export type HiloId = Identificador<'Hilo'>;
export type TramiteId = Identificador<'Tramite'>;
export type SedeId = Identificador<'Sede'>;
export type ServicioId = Identificador<'Servicio'>;
export type ReservaId = Identificador<'Reserva'>;
export type RecursoId = Identificador<'Recurso'>;
