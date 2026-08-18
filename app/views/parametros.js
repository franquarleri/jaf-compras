// PARÁMETROS · se configura acá y manda en todo el sistema.
import { estado, recargar, recalcular } from '../store.js';
import * as db from '../db.js';
import { fmt, esc, aviso, confirmar, $, $$ } from '../ui.js';

// Foto del pipeline antes de tocar nada, para mostrar el impacto de un cambio.
let base = null;

const foto = () => ({
  comprar: estado.evs.filter((e) => e.veredicto === 'COMPRAR').length,
  margen: (() => {
    const c = estado.evs.filter((e) => e.veredicto === 'COMPRAR');
    return c.length ? c.reduce((a, e) => a + e.margen, 0) / c.length : 0;
  })(),
  capital: estado.evs.filter((e) => e.veredicto === 'COMPRAR')
    .reduce((a, e) => a + e.inversionLote, 0),
});

/** Pasa el valor guardado (0.155) a lo que se escribe en pantalla (15.5). */
const aPantalla = (v, formato) => (formato === 'pct' ? +(v * 100).toFixed(4) : v);
const aGuardar = (v, formato) => (formato === 'pct' ? v / 100 : v);

export function render() {
  if (!base) base = foto();
  const grupos = [...new Set(estado.parametrosMeta.map((x) => x.grupo))];
  const sumaPesos = ['peso_margen', 'peso_demanda', 'peso_competencia',
    'peso_logistica', 'peso_riesgo', 'peso_capital']
    .reduce((a, k) => a + (estado.p[k] || 0), 0);

  return `
  <header class="vista-head">
    <div>
      <h1>Parámetros</h1>
      <p class="bajada">Se configura acá y manda en todo el sistema. Cada cambio se guarda al salir del campo.</p>
    </div>
  </header>

  <div id="impacto" class="impacto"></div>

  ${Math.round(sumaPesos * 10000) !== 10000 ? `
  <p class="banda-alerta">Los pesos del scoring suman ${fmt.pct(sumaPesos)} en vez de 100%.
     Mientras no sumen 100%, el puntaje de todos los productos queda distorsionado.</p>` : ''}

  ${grupos.map(grupo).join('')}

  ${tarifas()}`;
}

const grupo = (g) => {
  const filas = estado.parametrosMeta.filter((x) => x.grupo === g);
  return `
  <section class="bloque">
    <h2 class="bloque-titulo">${esc(g)}</h2>
    <table class="tabla parametros">
      <tbody>${filas.map(filaParam).join('')}</tbody>
    </table>
  </section>`;
};

function filaParam(x) {
  const v = Number(x.valor);
  const control = x.formato === 'switch'
    ? `<select data-clave="${x.clave}" data-formato="switch">
         <option value="1" ${v === 1 ? 'selected' : ''}>Sí</option>
         <option value="0" ${v === 0 ? 'selected' : ''}>No</option>
       </select>`
    : `<input type="number" step="any" data-clave="${x.clave}" data-formato="${x.formato}"
              value="${aPantalla(v, x.formato)}" />
       ${x.formato === 'pct' ? '<span class="unidad">%</span>' : ''}
       ${x.formato === 'ars' ? '<span class="unidad">ARS</span>' : ''}
       ${x.formato === 'usd' ? '<span class="unidad">USD</span>' : ''}`;

  return `
  <tr>
    <td class="param-etiqueta">${esc(x.etiqueta)}</td>
    <td class="param-control">${control}</td>
    <td class="ayuda">${esc(x.ayuda || '')}</td>
  </tr>`;
}

function tarifas() {
  const lista = [...estado.tarifas].sort((a, b) => a.hasta_kg - b.hasta_kg);
  return `
  <section class="bloque">
    <h2 class="bloque-titulo">Tarifa de envío por peso facturable</h2>
    <p class="nota">El sistema toma la primera banda cuyo tope iguala o supera el peso facturable.
       Reemplazá estos valores por la tabla real de tu cuenta de vendedor.</p>
    <table class="tabla compacta tarifas">
      <thead><tr><th class="num">Peso facturable hasta (kg)</th><th class="num">Costo del envío (ARS)</th><th></th></tr></thead>
      <tbody>
        ${lista.map((t) => `
        <tr>
          <td class="num"><input type="number" step="any" data-tarifa="${t.id}" data-campo="hasta_kg" value="${t.hasta_kg}" /></td>
          <td class="num"><input type="number" step="any" data-tarifa="${t.id}" data-campo="costo_ars" value="${t.costo_ars}" /></td>
          <td><button class="btn-icono" data-borrar-tarifa="${t.id}" aria-label="Borrar banda">&times;</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <button class="btn btn-chico" data-nueva-tarifa>+ Agregar banda</button>
  </section>`;
}

/** Muestra qué cambió en el pipeline desde que se abrió la pantalla. */
function pintarImpacto() {
  const ahora = foto();
  const cont = $('#impacto');
  if (!cont) return;
  const dComprar = ahora.comprar - base.comprar;
  const dCapital = ahora.capital - base.capital;
  const sinCambios = dComprar === 0 && Math.abs(ahora.margen - base.margen) < 0.0001;

  cont.className = 'impacto' + (sinCambios ? '' : ' visible');
  if (sinCambios) { cont.innerHTML = ''; return; }
  cont.innerHTML = `
    <strong>Impacto de lo que cambiaste en esta pantalla</strong>
    <div class="impacto-grid">
      <div><span>Productos COMPRAR</span>
        <strong>${base.comprar} → ${ahora.comprar}</strong>
        ${dComprar ? `<em class="${dComprar > 0 ? 'positivo' : 'negativo'}">${dComprar > 0 ? '+' : ''}${dComprar}</em>` : ''}</div>
      <div><span>Margen promedio</span>
        <strong>${fmt.pct(base.margen)} → ${fmt.pct(ahora.margen)}</strong></div>
      <div><span>Capital necesario</span>
        <strong>${fmt.ars(base.capital)} → ${fmt.ars(ahora.capital)}</strong>
        ${dCapital ? `<em class="${dCapital < 0 ? 'positivo' : 'negativo'}">${dCapital > 0 ? '+' : ''}${fmt.ars(dCapital)}</em>` : ''}</div>
    </div>`;
}

export function montar(raiz) {
  pintarImpacto();

  // --- parámetros ---
  $$('[data-clave]', raiz).forEach((el) => {
    const guardar = async () => {
      const formato = el.dataset.formato;
      const valor = aGuardar(Number(el.value), formato);
      if (!Number.isFinite(valor)) return aviso('Ese valor no es un número', 'error');
      const clave = el.dataset.clave;
      const previo = estado.p[clave];
      estado.p[clave] = valor;
      const meta = estado.parametrosMeta.find((x) => x.clave === clave);
      if (meta) meta.valor = valor;
      recalcular();
      pintarImpacto();
      try {
        await db.guardarParametro(clave, valor);
      } catch (err) {
        estado.p[clave] = previo;
        recalcular();
        aviso('No se pudo guardar: ' + err.message, 'error');
      }
    };
    el.addEventListener('change', guardar);
  });

  // --- tarifas ---
  $$('[data-tarifa]', raiz).forEach((el) => {
    el.addEventListener('change', async () => {
      const id = Number(el.dataset.tarifa);
      const campo = el.dataset.campo;
      const valor = Number(el.value);
      if (!Number.isFinite(valor)) return aviso('Ese valor no es un número', 'error');
      const t = estado.tarifas.find((x) => x.id === id);
      if (t) t[campo] = valor;
      recalcular();
      pintarImpacto();
      try { await db.guardarTarifa(id, { [campo]: valor }); }
      catch (err) { aviso('No se pudo guardar: ' + err.message, 'error'); }
    });
  });

  $('[data-nueva-tarifa]', raiz)?.addEventListener('click', async () => {
    const ultima = [...estado.tarifas].sort((a, b) => b.hasta_kg - a.hasta_kg)[0];
    try {
      await db.crearTarifa({
        hasta_kg: ultima ? ultima.hasta_kg + 5 : 1,
        costo_ars: ultima ? ultima.costo_ars : 3000,
      });
      await recargar();
      window.dispatchEvent(new CustomEvent('repintar'));
    } catch (err) { aviso(err.message, 'error'); }
  });

  $$('[data-borrar-tarifa]', raiz).forEach((b) => (b.onclick = async () => {
    if (!(await confirmar('Vas a borrar esta banda de la tabla de envíos. Los productos se recalculan con las bandas que queden.'))) return;
    try {
      await db.borrarTarifa(Number(b.dataset.borrarTarifa));
      await recargar();
      window.dispatchEvent(new CustomEvent('repintar'));
    } catch (err) { aviso(err.message, 'error'); }
  }));
}

/** Al salir de la pantalla se reinicia la comparación. */
export const desmontar = () => { base = null; };
