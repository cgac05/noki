import { CanalSchema } from '@noki/contracts';

const nombres = {
  web: 'Web', whatsapp: 'WhatsApp', app: 'App',
  callcenter: 'Call Center', clinica: 'Clínica',
} satisfies Record<(typeof CanalSchema.options)[number], string>;

export function App() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="cabecera flex items-center justify-between gap-6">
        <span className="marca" aria-label="noki">noki</span>
        <span className="contexto">Salud Digna · HackaTec</span>
      </header>
      <main className="contenido flex-1">
        <h1>Un mismo hilo,<br />en cada canal.</h1>
        <p className="introduccion">Una base compartida para que la atención continúe de un canal a otro, sin volver a empezar.</p>
        <section className="canales" aria-labelledby="titulo-canales">
          <h2 id="titulo-canales">Canales de atención</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {CanalSchema.options.map(canal => <li key={canal}>{nombres[canal]}</li>)}
          </ul>
        </section>
        <p className="alcance">Los simuladores de atención estarán disponibles en próximas entregas.</p>
      </main>
      <footer className="pie flex flex-wrap justify-between gap-3">
        <span>Base en desarrollo</span><span>Entorno de demostración · Datos ficticios</span>
      </footer>
    </div>
  );
}
