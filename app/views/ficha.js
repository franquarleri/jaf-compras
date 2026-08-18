// FICHA · la economía completa de un producto, en los dos canales.
import { estado, proveedorNombre } from '../store.js';
import { compararCanales } from '../calc.js';
import { fmt, esc, $ } from '../ui.js';

let seleccionado = null;

const dato = (label, valor, ayuda = '') => `
  <tr><td>${esc(label)}</td><td class="num fuerte">${valor}</td>
      <td class="ayuda">${esc(ayuda)}</td></tr>`;

const linea = (label, ml, propio, ayuda = '') => `
  <tr><td>${esc(label)}</td>
      <td class="num">${fmt.ars(ml)}</td>
      <td class="num">${fmt.ars(propio)}</td>
      <td class="ayuda">${esc(ayuda)}</td></tr>`;

export function render() {
  const opciones = estado.evs
    .map((e) => `<option value="${e.id}" ${e.id === seleccionado ? 'selected' : ''}>${esc(e.codigo)} · ${esc(e.producto)}</option>`)
    .join('');

  const e = estado.evs.find((x) => x.id === seleccionado);

  return `
  <header class="vista-head">
    <div>
      <h1>Ficha de producto</h1>
      <p class="bajada">Elegí un producto y mirá su economía completa en los dos canales.</p>
    </div>
    <div class="head-acciones">
      <select id="selector-producto" class="selector">
        <option value="">— elegí un producto —</option>${opciones}
      </select>
    </div>
  </header>
  ${!e ? placeholder() : cuerpo(e)}`;
}

const placeholder = () => `
  <div class="vacio">
    <h2>Elegí un producto del desplegable</h2>
    <p>La lista sale de Evaluación. Si agregás productos allá, aparecen acá solos.</p>
  </div>`;

function cuerpo(e) {
  const c = compararCanales(e, estado.p);
  const conviene = c.diferencia > 0;

  return `
  <section class="bloque">
    <div class="ficha-head">
      <div>
        <h2 class="ficha-nombre">${esc(e.producto)}</h2>
        <p class="ficha-meta">${esc(e.codigo)} · ${esc(e.categoria_ml || 'sin categoría')} ·
           ${esc(proveedorNombre(e.proveedor_id))}</p>
      </div>
      <div class="ficha-veredicto">
        <span class="pastilla grande ${e.veredicto === 'COMPRAR' ? 'v-comprar'
          : e.veredicto === 'CANDIDATO' ? 'v-candidato'
          : e.veredicto === 'DUDOSO' ? 'v-dudoso'
          : e.veredicto === 'FALTAN DATOS' ? 'v-faltan' : 'v-descartar'}">${esc(e.veredicto)}</span>
        ${e.puntaje !== null ? `<div class="ficha-puntaje">Puntaje <strong>${fmt.num(e.puntaje, 1)}</strong></div>` : ''}
      </div>
    </div>
    ${e.alerta && e.alerta !== 'OK'
      ? `<p class="banda-alerta">${esc(e.alerta)} — el producto está descartado por regla, sin importar el puntaje.</p>`
      : ''}
    ${!e.completo
      ? `<p class="banda-alerta">Faltan datos obligatorios. Los números de abajo se calculan con lo que hay cargado y no son confiables.</p>`
      : ''}
  </section>

  ${e.scores ? `
  <section class="bloque">
    <h2 class="bloque-titulo">Cómo se arma el puntaje</h2>
    <div class="barras">
      ${barra('Margen neto', e.scores.margen, estado.p.peso_margen)}
      ${barra('Demanda', e.scores.demanda, estado.p.peso_demanda)}
      ${barra('Competencia', e.scores.competencia, estado.p.peso_competencia)}
      ${barra('Logística', e.scores.logistica, estado.p.peso_logistica)}
      ${barra('Riesgo técnico', e.scores.riesgo, estado.p.peso_riesgo)}
      ${barra('Capital / MOQ', e.scores.capital, estado.p.peso_capital)}
    </div>
  </section>` : ''}

  <section class="bloque dos-columnas">
    <div>
      <h2 class="bloque-titulo">Costo puesto en depósito</h2>
      <table class="tabla compacta"><tbody>
        ${dato('FOB unitario', fmt.usd(e.fob_usd))}
        ${dato('Costo puesto (USD/u)', fmt.usd(e.costoPuestoUsd), 'Flete, derechos, tasa y despacho.')}
        ${dato('Costo puesto (ARS/u)', fmt.ars(e.costoPuestoArs), 'Con colchón por devaluación del lead time.')}
        ${dato('Costo financiero de percepciones', fmt.ars(e.costoFinPercep), 'Plata inmovilizada hasta recuperar el crédito fiscal.')}
        ${dato('MOQ', fmt.entero(e.moq))}
        ${dato('Inversión del lote', fmt.ars(e.inversionLote), 'Lo que hay que poner para entrar.')}
      </tbody></table>
    </div>
    <div>
      <h2 class="bloque-titulo">Logística</h2>
      <table class="tabla compacta"><tbody>
        ${dato('Peso real', fmt.num(e.peso_kg, 2) + ' kg')}
        ${dato('Peso volumétrico', fmt.num(e.pesoVol, 2) + ' kg')}
        ${dato('Peso facturable', fmt.num(e.pesoFact, 2) + ' kg', 'El mayor de los dos. Es lo que te cobran.')}
        ${dato('Relación facturable / real', fmt.num(e.relacion, 2), 'Arriba de 1 pagás flete por aire. Arriba de 2 es caro de mover.')}
        ${dato('Tarifa de envío', fmt.ars(e.tarifa))}
        ${dato('Descuento que rompe el umbral', fmt.pct(e.descuentoUmbral), 'Bajando más que esto entrás en la zona de costo fijo por unidad.')}
      </tbody></table>
    </div>
  </section>

  <section class="bloque">
    <h2 class="bloque-titulo">Comparación de canales — mismo producto, mismo precio</h2>
    <div class="tabla-scroll">
    <table class="tabla">
      <thead><tr><th></th><th class="num">MERCADO LIBRE</th><th class="num">CANAL PROPIO</th><th></th></tr></thead>
      <tbody>
        ${linea('Precio final', c.ml.precio, c.propio.precio)}
        ${linea('(−) IVA débito fiscal', -c.ml.ivaDebito, -c.propio.ivaDebito)}
        <tr class="fila-total">
          <td>Ingreso neto</td>
          <td class="num fuerte">${fmt.ars(c.ml.ingresoNeto)}</td>
          <td class="num fuerte">${fmt.ars(c.propio.ingresoNeto)}</td>
          <td class="ayuda">La única base honesta para medir margen.</td></tr>
        ${linea('Comisión de plataforma / pasarela', -c.ml.comision, -c.propio.comision, 'ML cobra comisión y te trae la demanda. El sitio propio sólo paga la pasarela.')}
        ${linea('Costo fijo por unidad', -c.ml.costoFijo, -c.propio.costoFijo, 'En canal propio no existe.')}
        ${linea('Cargo por cuotas', -c.ml.cuotas, -c.propio.cuotas)}
        ${linea('Publicidad / Ads', -c.ml.publicidad, -c.propio.publicidad, 'En canal propio la publicidad se cuenta como CAC.')}
        ${linea('Envío a cargo del vendedor', -c.ml.envio, -c.propio.envio, 'En ML el envío gratis sobre el umbral es obligatorio. En canal propio elegís vos.')}
        ${linea('Empaque e inserto de marca', -c.ml.empaque, -c.propio.empaque)}
        ${linea('Costo de adquisición (CAC)', -c.ml.cac, -c.propio.cac, 'ML incluye la demanda en la comisión. En el canal propio la demanda la pagás vos.')}
        ${linea('Devoluciones y garantía', -c.ml.devoluciones, -c.propio.devoluciones)}
        ${linea('Ingresos Brutos', -c.ml.iibb, -c.propio.iibb)}
        ${linea('Costo del producto', -c.ml.costoProducto, -c.propio.costoProducto)}
        ${linea('Costo financiero de percepciones', -c.ml.costoFinanciero, -c.propio.costoFinanciero)}
        <tr class="fila-total grande">
          <td>CONTRIBUCIÓN POR UNIDAD</td>
          <td class="num fuerte ${c.ml.contribucion < 0 ? 'negativo' : ''}">${fmt.ars(c.ml.contribucion)}</td>
          <td class="num fuerte ${c.propio.contribucion < 0 ? 'negativo' : ''}">${fmt.ars(c.propio.contribucion)}</td>
          <td></td></tr>
        <tr><td>Margen sobre ingreso neto</td>
          <td class="num">${fmt.pct(c.ml.margen)}</td>
          <td class="num">${fmt.pct(c.propio.margen)}</td><td></td></tr>
      </tbody>
    </table>
    </div>
  </section>

  <section class="bloque">
    <h2 class="bloque-titulo">La decisión de canal</h2>
    <div class="tiles">
      <div class="tile ${conviene ? 'ok' : 'atencion'}">
        <div class="tile-valor">${fmt.ars(c.diferencia)}</div>
        <div class="tile-label">Diferencia por unidad (canal propio − ML)</div>
        <div class="tile-nota">${conviene ? 'Cada venta que migres al sitio propio deja más.' : 'El CAC se comió la ventaja.'}</div>
      </div>
      <div class="tile">
        <div class="tile-valor">${fmt.ars(c.cacMaximo)}</div>
        <div class="tile-label">CAC máximo que soporta el canal propio</div>
        <div class="tile-nota">Tu techo de publicidad por venta antes de que convenga más vender en ML.</div>
      </div>
    </div>
    <p class="veredicto-canal ${conviene ? 'ok' : 'atencion'}">${esc(c.veredicto)}</p>
    <p class="nota">Lo que hace defendible al canal propio en el largo plazo es la recompra, porque la segunda
       venta al mismo cliente tiene CAC cero. Eso no está modelado acá.</p>
  </section>`;
}

const barra = (label, score, peso) => `
  <div class="barra-fila">
    <span class="barra-label">${esc(label)}</span>
    <span class="barra-peso">${fmt.pct(peso)}</span>
    <span class="barra-pista"><span class="barra-relleno" style="width:${(score / 5) * 100}%"></span></span>
    <span class="barra-valor">${fmt.num(score, 1)}<span class="barra-max">/5</span></span>
  </div>`;

export function montar(raiz) {
  const sel = $('#selector-producto', raiz);
  if (sel) sel.onchange = (e) => {
    seleccionado = e.target.value || null;
    window.dispatchEvent(new CustomEvent('repintar'));
  };
}

/** Permite abrir la ficha de un producto desde otra vista. */
export const seleccionar = (id) => { seleccionado = id; };
