import { EstadoCarga } from './EstadoCarga.tsx';
import { EstadoError } from './EstadoError.tsx';

export function EstadoContexto({ contexto, texto }: {
  contexto: { cargando: boolean; error: unknown; actualizar: () => void }; texto: string;
}) {
  if (contexto.cargando) return <EstadoCarga texto="Consultando el contexto de atención…" />;
  if (contexto.error) return <EstadoError error={contexto.error} onReintentar={contexto.actualizar} />;
  return <div className="seccion"><p>{texto}</p><button type="button" onClick={contexto.actualizar}>Actualizar</button></div>;
}
