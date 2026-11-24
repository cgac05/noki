export function EstadoCarga({ texto = 'Cargando información…' }: { texto?: string }) {
  return <p className="estado-carga" role="status">{texto}</p>;
}
