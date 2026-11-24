import { Link } from 'react-router';

export function NoEncontrado() {
  return (
    <>
      <h1>Página no encontrada</h1>
      <p className="introduccion">Esta dirección no corresponde a un canal de la demo.</p>
      <Link className="enlace-principal" to="/">Volver a la portada</Link>
    </>
  );
}
