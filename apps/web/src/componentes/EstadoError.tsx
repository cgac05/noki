import { ErrorCliente } from '../cliente/errores.ts';

export function EstadoError({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  const mensaje = error instanceof ErrorCliente ? error.mensaje : 'No pudimos completar la acción. Intenta de nuevo.';
  return <div className="estado-error" role="alert"><p>{mensaje}</p>{onReintentar && <button type="button" onClick={onReintentar}>Reintentar</button>}</div>;
}
