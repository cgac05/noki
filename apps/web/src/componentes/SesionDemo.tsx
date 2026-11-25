import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { RespuestaConsultaCliente } from '../cliente/consultas.ts';
import { useConsulta } from '../cliente/ProveedorCliente.tsx';
import { ErrorCliente } from '../cliente/errores.ts';
import { EstadoCarga } from './EstadoCarga.tsx';
import { EstadoError } from './EstadoError.tsx';

export const formatoTelefono = /^\d{10,15}$/;

export function SesionDemo({ mostrarSesion, sinRegistro, textoVolver = 'Volver' }: {
  mostrarSesion: (sesion: RespuestaConsultaCliente<'sesionWebDemo'>, telefono: string, volver: () => void) => ReactNode;
  sinRegistro: ReactNode;
  textoVolver?: string;
}) {
  const [telefono, setTelefono] = useState('');
  const [clave, setClave] = useState('');
  const [invalida, setInvalida] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const sesion = useConsulta('sesionWebDemo', enviado ? { telefono } : undefined);
  const desconocido = sesion.error instanceof ErrorCliente && sesion.error.codigo === 'NO_ENCONTRADO';

  const volver = () => setEnviado(false);

  if (enviado && !desconocido && sesion.data) return mostrarSesion(sesion.data, telefono, volver);
  return <>
    <h1>Identifícate</h1>
    {enviado ? <>
      {sesion.isPending && <EstadoCarga texto="Buscando tu registro…" />}
      {desconocido ? sinRegistro : sesion.isError && <EstadoError error={sesion.error} onReintentar={() => { void sesion.refetch(); }} />}
      <button type="button" className="boton-secundario" onClick={volver}>{textoVolver}</button>
    </> : <>
      <form className="seccion" onSubmit={evento => {
        evento.preventDefault();
        if (!formatoTelefono.test(telefono)) return;
        if (clave !== 'prueba123') { setInvalida(true); return; }
        setClave('');
        setInvalida(false);
        setEnviado(true);
      }}>
        <label htmlFor="telefono-sesion">Teléfono</label>
        <input id="telefono-sesion" type="tel" inputMode="numeric" autoComplete="tel"
          value={telefono} onChange={evento => setTelefono(evento.target.value)} />
        <label htmlFor="clave-sesion">Contraseña de demostración</label>
        <input id="clave-sesion" type="password" autoComplete="off" value={clave}
          onChange={evento => { setClave(evento.target.value); setInvalida(false); }} />
        {invalida && <p role="alert">Contraseña incorrecta.</p>}
        <button type="submit" disabled={!formatoTelefono.test(telefono) || !clave}>Entrar</button>
      </form>
      <Link className="enlace-principal" to="/">Volver</Link>
    </>}
  </>;
}
