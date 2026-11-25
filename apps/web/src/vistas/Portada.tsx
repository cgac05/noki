import { CanalSchema } from '@noki/contracts';
import { Link } from 'react-router';

const nombres = {
  web: 'Web', whatsapp: 'WhatsApp', app: 'App',
  callcenter: 'Call Center', clinica: 'Clínica',
} satisfies Record<(typeof CanalSchema.options)[number], string>;

const rutas = {
  web: '/web', whatsapp: '/wa', app: '/app',
  callcenter: '/callcenter', clinica: '/clinica',
} satisfies Record<(typeof CanalSchema.options)[number], string>;

export function Portada() {
  return (
    <>
      <h1 className="titulo-portada">Un mismo hilo,<br /> en cada canal.</h1>
      <p className="introduccion">Una base compartida para que la atención continúe de un canal a otro, sin volver a empezar.</p>
      <section className="canales" aria-labelledby="titulo-canales">
        <h2 id="titulo-canales">Canales de atención</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {CanalSchema.options.map(canal => <li key={canal}><Link to={rutas[canal]}>{nombres[canal]}</Link></li>)}
        </ul>
      </section>
      <p className="alcance">Los simuladores de atención estarán disponibles en próximas entregas.</p>
    </>
  );
}
