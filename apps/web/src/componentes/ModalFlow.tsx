import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { MensajeBot } from '@noki/contracts';
import { opcionesEntidadNacimiento } from '../cliente/entidadesNacimiento.ts';

type Flow = Extract<MensajeBot, { tipo: 'flow' }>;
const opcionesAsesor = new Map([
  ['sexo', [{ valor: 'F', etiqueta: 'Mujer' }, { valor: 'M', etiqueta: 'Hombre' }, { valor: 'X', etiqueta: 'No binario' }]],
  ['entidadNacimiento', opcionesEntidadNacimiento],
]);

export function ModalFlow({ mensaje, onEnviar, onCerrar, onDescartar, validar, capturaAsesor = false }: { mensaje: Flow; onEnviar: (valores: Record<string, string>, resumen: string) => Promise<boolean>; onCerrar: () => void; onDescartar: () => void; validar?: (valores: Record<string, string>) => string[]; capturaAsesor?: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null); const prefijo = useId();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [visibles, setVisibles] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState<Set<string>>(new Set());
  const [formatos, setFormatos] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false); const bloqueo = useRef(false);
  const [fallo, setFallo] = useState(false);
  useEffect(() => { dialogo.current?.showModal(); return onDescartar; }, []);
  const cerrar = () => {
    setValores({}); setVisibles(new Set()); setErrores(new Set());
    dialogo.current?.close(); onCerrar();
  };
  return <dialog className="dialogo-wa modal-flow" ref={dialogo} aria-labelledby={`${prefijo}-titulo`} onCancel={evento => { evento.preventDefault(); cerrar(); }} onKeyDown={evento => {
    if (evento.key === 'Escape') { evento.preventDefault(); cerrar(); }
    if (evento.key === 'Tab') {
      const controles = dialogo.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)');
      const primero = controles?.[0]; const ultimo = controles?.[controles.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo?.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero?.focus(); }
    }
  }}>
    <h2 id={`${prefijo}-titulo`}>{mensaje.titulo}</h2>
    <p className="ayuda-flow">{capturaAsesor ? 'Revisa los datos con el paciente antes de enviar el formulario.' : 'Tus respuestas se envían al completar el formulario. En el chat solo aparecerá un resumen enmascarado.'}</p>
    <form noValidate onSubmit={async evento => {
      evento.preventDefault(); if (bloqueo.current) return;
      const faltantes = new Set(mensaje.campos.filter(campo => campo.requerido && !valores[campo.id]?.trim()).map(campo => campo.id));
      setErrores(faltantes);
      if (faltantes.size) { dialogo.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
      const invalidos = new Set(validar?.(valores) ?? []);
      setFormatos(invalidos); setErrores(invalidos);
      if (invalidos.size) return;
      bloqueo.current = true; setEnviando(true);
      const resumen = mensaje.campos.map(campo => `${campo.etiqueta} ••••`).join('\n');
      const exito = await onEnviar(Object.fromEntries(mensaje.campos.map(campo => [campo.id, valores[campo.id] ?? ''])), resumen);
      bloqueo.current = false; setEnviando(false);
      if (exito) cerrar(); else setFallo(true);
    }}>
      {mensaje.campos.map((campo, indice) => {
        const id = `${prefijo}-${campo.id}`;
        const secreto = campo.captura === 'passcode' || (!capturaAsesor && campo.captura === 'sensitive');
        const tipo = secreto ? (visibles.has(campo.id) ? 'text' : 'password') : campo.captura === 'fecha' ? 'date' : 'text';
        const opciones = capturaAsesor && campo.captura !== 'passcode' ? opcionesAsesor.get(campo.id) : undefined;
        const control = {
          id,
          autoComplete: 'off',
          autoFocus: indice === 0,
          required: campo.requerido,
          'aria-invalid': errores.has(campo.id),
          'aria-describedby': errores.has(campo.id) ? `${id}-error` : undefined,
          value: valores[campo.id] ?? '',
          disabled: enviando || fallo,
          onChange: (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const valor = evento.target.value;
            setValores(actual => ({ ...actual, [campo.id]: valor }));
          },
        };
        return <div className="campo-flow" key={campo.id}>
          <label htmlFor={id}>{campo.etiqueta}</label>
          <div className="captura-flow">
            {opciones ? <select {...control}>
              <option value="">Selecciona una opción</option>
              {opciones.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select> : <input {...control} type={tipo} inputMode={campo.captura === 'passcode' ? 'numeric' : undefined} />}
            {!capturaAsesor && secreto && <button type="button" className="boton-secundario" disabled={enviando || fallo} aria-label={`${visibles.has(campo.id) ? 'Ocultar' : 'Mostrar'} ${campo.etiqueta}`} onClick={() => setVisibles(actual => { const siguiente = new Set(actual); if (siguiente.has(campo.id)) siguiente.delete(campo.id); else siguiente.add(campo.id); return siguiente; })}>{visibles.has(campo.id) ? 'Ocultar' : 'Mostrar'}</button>}
          </div>
          {errores.has(campo.id) && <p className="wa-error" id={`${id}-error`}>{formatos.has(campo.id) ? 'Revisa el formato de este campo' : 'Completa este campo.'}</p>}
        </div>;
      })}
      {fallo && <p role="alert" className="wa-error">No pudimos enviar el formulario. Reintenta el mismo envío o cancela para volver a capturarlo.</p>}
      <div className="acciones"><button type="submit" disabled={enviando}>{enviando ? 'Enviando…' : fallo ? 'Reintentar envío' : 'Enviar formulario'}</button><button type="button" className="boton-secundario" onClick={cerrar}>Cancelar</button></div>
    </form>
  </dialog>;
}
