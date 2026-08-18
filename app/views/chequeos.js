// CHEQUEOS · si algo dice REVISAR es una decisión pendiente, no un error.
import { estado } from '../store.js';
import { chequeos, LIMITES } from '../calc.js';
import { fmt, esc } from '../ui.js';

export function render() {
  const lista = chequeos(estado.evs, estado.ords, estado.p, estado.tarifas, fmt);
  const pendientes = lista.filter((c) => !c.ok).length;

  return `
  <header class="vista-head">
    <div>
      <h1>Chequeos</h1>
      <p class="bajada">Controles automáticos. Si algo dice REVISAR es una decisión pendiente, no un error del sistema.</p>
    </div>
  </header>

  <div class="tiles">
    <div class="tile ${pendientes ? 'atencion' : 'ok'}">
      <div class="tile-valor">${pendientes}</div>
      <div class="tile-label">${pendientes === 1 ? 'control para revisar' : 'controles para revisar'}</div>
      <div class="tile-nota">de ${lista.length} controles</div>
    </div>
  </div>

  <section class="bloque">
    <div class="tabla-scroll">
    <table class="tabla">
      <thead><tr><th>Control</th><th class="num">Valor</th><th>Estado</th><th>Por qué importa</th></tr></thead>
      <tbody>
        ${lista.map((c) => `
        <tr class="${c.ok ? '' : 'fila-alerta'}">
          <td class="fuerte">${esc(c.control)}</td>
          <td class="num mono">${esc(c.valor)}</td>
          <td><span class="pastilla ${c.ok ? 'v-comprar' : 'v-dudoso'}">${c.ok ? 'OK' : 'REVISAR'}</span></td>
          <td class="ayuda">${esc(c.porque)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
  </section>

  <section class="bloque">
    <h2 class="bloque-titulo">Lo que este sistema sigue sin responder</h2>
    <ul class="limites">
      ${LIMITES.map((l) => `<li>${esc(l)}</li>`).join('')}
    </ul>
  </section>`;
}

export function montar() {}
