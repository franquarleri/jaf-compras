// ÓRDENES DE COMPRA · seguimiento del lote hasta el depósito.
import { estado, recargar, proveedorNombre } from '../store.js';
import * as db from '../db.js';
import { fmt, esc, abrirPanel, cerrarPanel, confirmar, aviso, leerForm, $, $$ } from '../ui.js';

const ESTADOS = ['Pendiente de pago', 'Pagado', 'En producción', 'En tránsito', 'En aduana', 'Recibido', 'Cancelado'];

const claseEstado = (e) => ({
  'Recibido': 'v-comprar', 'Cancelado': 'v-descartar', 'Pendiente de pago': 'v-faltan',
}[e] || 'v-candidato');

export function render() {
  const lista = estado.ords;
  const abiertas = lista.filter((o) => o.abierta);
  const comprometido = abiertas.reduce((a, o) => a + o.inversionTotal, 0);

  return `
  <header class="vista-head">
    <div>
      <h1>Órdenes de compra</h1>
      <p class="bajada">Los productos aprobados pasan acá cuando se compran.</p>
    </div>
    <div class="head-acciones">
      <button class="btn btn-principal" data-nueva>+ Orden</button>
    </div>
  </header>

  ${lista.length ? `
  <div class="tiles">
    <div class="tile"><div class="tile-valor">${fmt.entero(abiertas.length)}</div><div class="tile-label">Órdenes abiertas</div></div>
    <div class="tile"><div class="tile-valor">${fmt.ars(comprometido)}</div><div class="tile-label">Capital comprometido</div></div>
  </div>` : ''}

  ${lista.length === 0 ? vacio() : `
  <div class="tabla-scroll">
    <table class="tabla">
      <thead><tr>
        <th>OC</th><th>Fecha</th><th>Producto</th><th>Proveedor</th>
        <th class="num">Unidades</th><th class="num">FOB total</th>
        <th class="num">Costo puesto</th><th class="num">Inversión total</th>
        <th>Pago</th><th>Arribo est.</th><th>Estado</th><th>Alerta</th>
      </tr></thead>
      <tbody>${lista.map(fila).join('')}</tbody>
    </table>
  </div>
  <p class="nota">Clic en una fila para editarla. El candado indica que el costo quedó congelado al momento del pago.</p>`}`;
}

const fila = (o) => `
  <tr data-id="${o.id}" class="clickeable ${o.atrasada ? 'fila-alerta' : ''}">
    <td class="mono">${esc(o.codigo)}</td>
    <td>${fmt.fecha(o.fecha_orden)}</td>
    <td class="fuerte">${esc(o.productoNombre)}</td>
    <td>${esc(o.proveedorId ? proveedorNombre(o.proveedorId) : '—')}</td>
    <td class="num">${fmt.entero(o.unidades)}</td>
    <td class="num">${fmt.usd(o.fobTotal)}</td>
    <td class="num">${fmt.ars(o.costoPuestoArs)}${o.congelada ? ' <span class="candado" title="Costo congelado">&#128274;</span>' : ''}</td>
    <td class="num fuerte">${fmt.ars(o.inversionTotal)}</td>
    <td>${fmt.fecha(o.fecha_pago)}</td>
    <td>${o.arribo ? fmt.fecha(o.arribo) : '—'}</td>
    <td><span class="pastilla ${claseEstado(o.estado)}">${esc(o.estado)}</span></td>
    <td class="${o.atrasada ? 'negativo fuerte' : 'ayuda'}">${esc(o.alerta)}</td>
  </tr>`;

const vacio = () => `
  <div class="vacio">
    <h2>No hay órdenes cargadas</h2>
    <p>Cuando un producto aprobado se compra de verdad, la orden va acá y el sistema
       sigue el lote hasta el depósito.</p>
    <button class="btn btn-principal" data-nueva>Cargar la primera orden</button>
  </div>`;

// ---------------------------------------------------------------------
function formulario(o) {
  const opciones = estado.evs.map((e) =>
    `<option value="${e.id}" ${e.id === o.producto_id ? 'selected' : ''}>${esc(e.codigo)} · ${esc(e.producto)} — ${esc(e.veredicto)}</option>`
  ).join('');

  return `
  <form id="form-orden" class="form">
    <label class="campo"><span>Producto *</span>
      <select name="producto_id" required><option value="">— elegí —</option>${opciones}</select>
      <small>Podés cargar una orden de cualquier producto, pero si no dice COMPRAR pensalo dos veces.</small>
    </label>

    <div class="grid-3">
      <label class="campo"><span>Fecha de orden</span>
        <input name="fecha_orden" type="date" value="${o.fecha_orden || new Date().toISOString().slice(0, 10)}" /></label>
      <label class="campo"><span>Unidades</span>
        <input name="unidades" type="number" step="1" data-tipo="numero" value="${o.unidades ?? ''}" /></label>
      <label class="campo"><span>Estado</span>
        <select name="estado">${ESTADOS.map((e) =>
          `<option ${e === (o.estado || 'Pendiente de pago') ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
    </div>

    <div class="grid-2">
      <label class="campo"><span>Fecha de pago</span>
        <input name="fecha_pago" type="date" value="${o.fecha_pago || ''}" />
        <small>Sin esto no se puede estimar el arribo.</small></label>
      <label class="campo"><span>Lead time (días)</span>
        <input name="lead_time_dias" type="number" step="1" data-tipo="numero"
               value="${o.lead_time_dias ?? estado.p.lead_time_dias}" /></label>
    </div>

    <fieldset><legend>Costo del lote</legend>
      <p class="fieldset-nota">Mientras esté vacío, el costo se toma en vivo del producto y se mueve con el tipo de
        cambio. Congelalo cuando pagues el lote: así un salto del dólar no reescribe lo que ya invertiste.</p>
      <div class="grid-2">
        <label class="campo"><span>FOB USD/u congelado</span>
          <input name="fob_usd" type="number" step="0.01" data-tipo="numero" value="${o.fob_usd ?? ''}" /></label>
        <label class="campo"><span>Costo puesto ARS/u congelado</span>
          <input name="costo_puesto_ars" type="number" step="0.01" data-tipo="numero" value="${o.costo_puesto_ars ?? ''}" /></label>
      </div>
      <button type="button" class="btn btn-chico" data-congelar>Congelar con los valores de hoy</button>
    </fieldset>

    <label class="campo"><span>Notas</span>
      <textarea name="notas" rows="2">${esc(o.notas || '')}</textarea></label>

    <div id="previo" class="previo"></div>

    <div class="acciones">
      ${o.id ? '<button type="button" class="btn btn-peligro" data-borrar>Borrar</button>' : ''}
      <span class="espaciador"></span>
      <button type="button" class="btn" data-cerrar>Cancelar</button>
      <button type="submit" class="btn btn-principal">Guardar</button>
    </div>
  </form>`;
}

function pintarPrevio(form) {
  const d = leerForm(form);
  const prod = estado.evs.find((e) => e.id === d.producto_id);
  const unidades = d.unidades || 0;
  const costo = d.costo_puesto_ars ?? (prod ? prod.costoPuestoArs : 0);
  const fob = d.fob_usd ?? (prod ? prod.fob_usd ?? 0 : 0);
  const cont = $('#previo', form.closest('.panel-cuerpo'));

  if (!prod || !unidades) {
    cont.className = 'previo previo-faltan';
    cont.innerHTML = '<p>Elegí un producto y cargá las unidades para ver la inversión del lote.</p>';
    return;
  }
  const contribLote = prod.completo ? prod.contribucion * unidades : null;
  cont.className = 'previo previo-v-candidato';
  cont.innerHTML = `
    <div class="previo-grid">
      <div><span>FOB total</span><strong>${fmt.usd(fob * unidades)}</strong></div>
      <div><span>Costo puesto ARS/u</span><strong>${fmt.ars(costo)}</strong></div>
      <div><span>Inversión total</span><strong>${fmt.ars(costo * unidades)}</strong></div>
      ${contribLote !== null
        ? `<div><span>Contribución del lote si se vende todo</span>
             <strong class="${contribLote < 0 ? 'negativo' : ''}">${fmt.ars(contribLote)}</strong></div>` : ''}
    </div>`;
}

function abrirEditor(o = {}) {
  abrirPanel(o.id ? `${o.codigo} · ${o.productoNombre}` : 'Nueva orden de compra',
    formulario(o), (cuerpo) => {
      const form = $('#form-orden', cuerpo);
      pintarPrevio(form);
      form.addEventListener('input', () => pintarPrevio(form));
      form.addEventListener('change', () => pintarPrevio(form));

      $('[data-congelar]', cuerpo).onclick = () => {
        const d = leerForm(form);
        const prod = estado.evs.find((e) => e.id === d.producto_id);
        if (!prod) return aviso('Elegí un producto primero', 'error');
        form.elements.fob_usd.value = prod.fob_usd ?? '';
        form.elements.costo_puesto_ars.value = prod.costoPuestoArs.toFixed(2);
        pintarPrevio(form);
        aviso('Costo congelado al valor de hoy');
      };

      form.onsubmit = async (ev) => {
        ev.preventDefault();
        const d = leerForm(form);
        const prod = estado.evs.find((e) => e.id === d.producto_id);
        try {
          await db.guardarOrden({ id: o.id, ...d, producto_nombre: prod?.producto ?? null });
          cerrarPanel();
          await recargar();
          aviso(o.id ? 'Orden actualizada' : 'Orden creada');
        } catch (err) { aviso(err.message, 'error'); }
      };

      $('[data-borrar]', cuerpo)?.addEventListener('click', async () => {
        if (!(await confirmar(`Vas a borrar la orden ${o.codigo} (${fmt.ars(o.inversionTotal)}). No se puede deshacer.`)))
          return abrirEditor(o);
        try {
          await db.borrarOrden(o.id);
          cerrarPanel();
          await recargar();
          aviso('Orden borrada');
        } catch (err) { aviso(err.message, 'error'); }
      });
    });
}

export function montar(raiz) {
  $$('[data-nueva]', raiz).forEach((b) => (b.onclick = () => abrirEditor()));
  $$('tr[data-id]', raiz).forEach((tr) => (tr.onclick = () => {
    const o = estado.ords.find((x) => x.id === tr.dataset.id);
    if (o) abrirEditor(o);
  }));
}
