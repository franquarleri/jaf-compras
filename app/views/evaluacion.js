// EVALUACIÓN · un producto por fila. Es el corazón del sistema.
import { estado, recargar, proveedorNombre } from '../store.js';
import { evaluar } from '../calc.js';
import * as db from '../db.js';
import { fmt, esc, abrirPanel, cerrarPanel, confirmar, aviso, leerForm, $, $$ } from '../ui.js';
import { seleccionar as seleccionarFicha } from './ficha.js';

let filtro = '';
let orden = { campo: 'numero', asc: true };

const VEREDICTO_CLASE = {
  COMPRAR: 'v-comprar', CANDIDATO: 'v-candidato', DUDOSO: 'v-dudoso',
};
const claseVeredicto = (v) =>
  VEREDICTO_CLASE[v] || (v === 'FALTAN DATOS' ? 'v-faltan' : 'v-descartar');

function filas() {
  const q = filtro.trim().toLowerCase();
  let lista = estado.evs.filter((e) =>
    !q ||
    (e.producto || '').toLowerCase().includes(q) ||
    (e.categoria_ml || '').toLowerCase().includes(q) ||
    proveedorNombre(e.proveedor_id).toLowerCase().includes(q) ||
    e.veredicto.toLowerCase().includes(q));

  const { campo, asc } = orden;
  lista = [...lista].sort((a, b) => {
    const va = a[campo], vb = b[campo];
    const nulo = (x) => x === null || x === undefined;
    if (nulo(va) && nulo(vb)) return 0;
    if (nulo(va)) return 1;
    if (nulo(vb)) return -1;
    const r = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return asc ? r : -r;
  });
  return lista;
}

const th = (label, campo, extra = '') =>
  `<th class="${extra} ordenable ${orden.campo === campo ? 'orden-' + (orden.asc ? 'asc' : 'desc') : ''}"
       data-orden="${campo}">${esc(label)}</th>`;

export function render() {
  const lista = filas();
  return `
  <header class="vista-head">
    <div>
      <h1>Evaluación de productos</h1>
      <p class="bajada">Un producto por fila. Cargás los datos crudos y el sistema decide.</p>
    </div>
    <div class="head-acciones">
      <input id="buscar" class="buscar" type="search" placeholder="Buscar producto, categoría, veredicto…"
             value="${esc(filtro)}" />
      <button class="btn btn-principal" data-nuevo>+ Producto</button>
    </div>
  </header>

  ${lista.length === 0 ? vacio() : `
  <div class="tabla-scroll">
    <table class="tabla">
      <thead>
        <tr>
          ${th('ID', 'numero')}
          ${th('Producto', 'producto')}
          <th>Proveedor</th>
          ${th('FOB USD', 'fob_usd', 'num')}
          ${th('MOQ', 'moq', 'num')}
          ${th('Costo puesto ARS', 'costoPuestoArs', 'num')}
          ${th('Precio ML', 'precio_ml', 'num')}
          ${th('Contribución', 'contribucion', 'num')}
          ${th('Margen', 'margen', 'num')}
          ${th('Inversión lote', 'inversionLote', 'num')}
          ${th('Puntaje', 'puntaje', 'num')}
          <th>Veredicto</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(fila).join('')}
      </tbody>
    </table>
  </div>
  <p class="nota">${lista.length} de ${estado.evs.length} productos. Clic en una fila para editarla.</p>`}`;
}

const fila = (e) => `
  <tr data-id="${e.id}" class="clickeable ${e.completo ? '' : 'fila-incompleta'}">
    <td class="mono">${esc(e.codigo)}</td>
    <td class="fuerte">${esc(e.producto)}
      ${e.categoria_ml ? `<span class="sub">${esc(e.categoria_ml)}</span>` : ''}</td>
    <td>${esc(proveedorNombre(e.proveedor_id))}</td>
    <td class="num">${fmt.usd(e.fob_usd)}</td>
    <td class="num">${fmt.entero(e.moq)}</td>
    <td class="num">${e.completo ? fmt.ars(e.costoPuestoArs) : '—'}</td>
    <td class="num">${fmt.ars(e.precio_ml)}</td>
    <td class="num ${e.completo && e.contribucion < 0 ? 'negativo' : ''}">
        ${e.completo ? fmt.ars(e.contribucion) : '—'}</td>
    <td class="num ${e.completo && e.margen < estado.p.margen_minimo ? 'negativo' : ''}">
        ${e.completo ? fmt.pct(e.margen) : '—'}</td>
    <td class="num">${e.completo ? fmt.ars(e.inversionLote) : '—'}</td>
    <td class="num fuerte">${e.puntaje === null ? '—' : fmt.num(e.puntaje, 1)}</td>
    <td><span class="pastilla ${claseVeredicto(e.veredicto)}">${esc(e.veredicto)}</span></td>
  </tr>`;

const vacio = () => `
  <div class="vacio">
    <h2>Todavía no hay productos cargados</h2>
    <p>Cargá el primero con datos reales de tu proveedor y del panel de Mercado Libre.
       Si te falta cualquier dato obligatorio el producto queda como FALTAN DATOS y no recibe
       puntaje: es a propósito, para que no se apruebe nada a ciegas.</p>
    <button class="btn btn-principal" data-nuevo>Cargar el primer producto</button>
  </div>`;

// ---------------------------------------------------------------------
// FORMULARIO
// ---------------------------------------------------------------------
const campoNum = (name, label, valor, paso = 'any', ayuda = '') => `
  <label class="campo">
    <span>${esc(label)}</span>
    <input name="${name}" type="number" step="${paso}" data-tipo="numero"
           value="${valor ?? ''}" />
    ${ayuda ? `<small>${esc(ayuda)}</small>` : ''}
  </label>`;

const campoSiNo = (name, label, valor, ayuda = '') => `
  <label class="campo">
    <span>${esc(label)}</span>
    <select name="${name}" data-tipo="bool">
      <option value="" ${valor === null || valor === undefined ? 'selected' : ''}>— sin responder —</option>
      <option value="true"  ${valor === true  ? 'selected' : ''}>Sí</option>
      <option value="false" ${valor === false ? 'selected' : ''}>No</option>
    </select>
    ${ayuda ? `<small>${esc(ayuda)}</small>` : ''}
  </label>`;

function formulario(prod) {
  const opciones = estado.proveedores.map((pr) =>
    `<option value="${pr.id}" ${pr.id === prod.proveedor_id ? 'selected' : ''}>${esc(pr.nombre)}</option>`
  ).join('');

  return `
  <form id="form-producto" class="form">
    <fieldset><legend>Identificación</legend>
      <label class="campo">
        <span>Producto *</span>
        <input name="producto" required value="${esc(prod.producto || '')}" />
      </label>
      <div class="grid-2">
        <label class="campo"><span>Categoría ML</span>
          <input name="categoria_ml" value="${esc(prod.categoria_ml || '')}" /></label>
        <label class="campo"><span>Proveedor</span>
          <select name="proveedor_id"><option value="">— sin asignar —</option>${opciones}</select></label>
      </div>
    </fieldset>

    <fieldset><legend>Clasificación regulatoria</legend>
      <p class="fieldset-nota">Un "Sí" en cualquiera de estas tres descarta el producto sin importar el puntaje.</p>
      <div class="grid-3">
        ${campoSiNo('senasa', '¿Se ingiere o aplica al animal?', prod.senasa, 'Exige registro SENASA')}
        ${campoSiNo('enacom', '¿Tiene WiFi, BT o GPS?', prod.enacom, 'Exige homologación ENACOM')}
        ${campoSiNo('litio', '¿Lleva batería de litio?', prod.litio, 'Carga peligrosa')}
      </div>
    </fieldset>

    <fieldset><legend>Economía</legend>
      <div class="grid-3">
        ${campoNum('fob_usd', 'FOB USD por unidad', prod.fob_usd, '0.01')}
        ${campoNum('moq', 'MOQ (unidades)', prod.moq, '1')}
        ${campoNum('precio_ml', 'Precio de venta ML (ARS)', prod.precio_ml, '1')}
      </div>
    </fieldset>

    <fieldset><legend>Logística</legend>
      <div class="grid-4">
        ${campoNum('peso_kg', 'Peso real (kg)', prod.peso_kg, '0.01')}
        ${campoNum('largo_cm', 'Largo (cm)', prod.largo_cm, '0.1')}
        ${campoNum('ancho_cm', 'Ancho (cm)', prod.ancho_cm, '0.1')}
        ${campoNum('alto_cm', 'Alto (cm)', prod.alto_cm, '0.1')}
      </div>
    </fieldset>

    <fieldset><legend>Mercado</legend>
      <div class="grid-3">
        ${campoNum('ventas_mes', 'Ventas/mes de la categoría', prod.ventas_mes, '1', 'Nubimetrics o equivalente')}
        ${campoNum('concentracion_top3', 'Concentración top 3 (0 a 1)', prod.concentracion_top3, '0.01', '0,45 = el top 3 se lleva el 45%')}
        ${campoNum('riesgo_tecnico', 'Riesgo técnico (1 a 5)', prod.riesgo_tecnico, '1', '1 = inerte · 5 = electrónico complejo')}
      </div>
    </fieldset>

    <fieldset><legend>Notas</legend>
      <label class="campo"><textarea name="notas" rows="2">${esc(prod.notas || '')}</textarea></label>
    </fieldset>

    <div id="previo" class="previo"></div>

    <div class="acciones">
      ${prod.id ? '<button type="button" class="btn btn-peligro" data-borrar>Borrar</button>' : ''}
      ${prod.id ? '<button type="button" class="btn" data-ficha>Ver ficha completa</button>' : ''}
      <span class="espaciador"></span>
      <button type="button" class="btn" data-cerrar>Cancelar</button>
      <button type="submit" class="btn btn-principal">Guardar</button>
    </div>
  </form>`;
}

/** Vista previa en vivo: recalcula con lo que hay escrito, sin guardar nada. */
function pintarPrevio(form) {
  const datos = leerForm(form);
  const e = evaluar(datos, estado.p, estado.tarifas);
  const cont = $('#previo', form.closest('.panel-cuerpo'));

  if (!e.completo) {
    cont.className = 'previo previo-faltan';
    cont.innerHTML = `
      <strong>FALTAN DATOS</strong>
      <p>Sin estos ${e.faltantes.length} datos el producto no recibe puntaje:
         ${esc(e.faltantes.map(nombreCampo).join(', '))}.</p>`;
    return;
  }
  cont.className = 'previo previo-' + claseVeredicto(e.veredicto);
  cont.innerHTML = `
    <div class="previo-head">
      <span class="pastilla ${claseVeredicto(e.veredicto)}">${esc(e.veredicto)}</span>
      <span class="previo-puntaje">Puntaje <strong>${fmt.num(e.puntaje, 1)}</strong></span>
    </div>
    <div class="previo-grid">
      <div><span>Costo puesto</span><strong>${fmt.ars(e.costoPuestoArs)}</strong></div>
      <div><span>Ingreso neto</span><strong>${fmt.ars(e.ingresoNeto)}</strong></div>
      <div><span>Contribución</span><strong class="${e.contribucion < 0 ? 'negativo' : ''}">${fmt.ars(e.contribucion)}</strong></div>
      <div><span>Margen</span><strong class="${e.margen < estado.p.margen_minimo ? 'negativo' : ''}">${fmt.pct(e.margen)}</strong></div>
      <div><span>Peso facturable</span><strong>${fmt.num(e.pesoFact, 2)} kg</strong></div>
      <div><span>Inversión del lote</span><strong>${fmt.ars(e.inversionLote)}</strong></div>
    </div>
    ${e.alerta !== 'OK' ? `<p class="previo-alerta">${esc(e.alerta)}</p>` : ''}`;
}

const NOMBRES = {
  senasa: 'SENASA', enacom: 'ENACOM', litio: 'batería de litio',
  fob_usd: 'FOB', moq: 'MOQ', precio_ml: 'precio ML', peso_kg: 'peso',
  largo_cm: 'largo', ancho_cm: 'ancho', alto_cm: 'alto',
  ventas_mes: 'ventas/mes', concentracion_top3: 'concentración top 3',
  riesgo_tecnico: 'riesgo técnico',
};
const nombreCampo = (c) => NOMBRES[c] || c;

function abrirEditor(prod = {}) {
  abrirPanel(prod.id ? `${prod.codigo} · ${prod.producto}` : 'Nuevo producto',
    formulario(prod), (cuerpo) => {
      const form = $('#form-producto', cuerpo);
      pintarPrevio(form);
      form.addEventListener('input', () => pintarPrevio(form));
      form.addEventListener('change', () => pintarPrevio(form));

      form.onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          await db.guardarProducto({ id: prod.id, ...leerForm(form) });
          cerrarPanel();
          await recargar();
          aviso(prod.id ? 'Producto actualizado' : 'Producto creado');
        } catch (err) { aviso(err.message, 'error'); }
      };

      $('[data-ficha]', cuerpo)?.addEventListener('click', () => {
        seleccionarFicha(prod.id);
        cerrarPanel();
        location.hash = '#/ficha';
      });

      $('[data-borrar]', cuerpo)?.addEventListener('click', async () => {
        const usadoEn = estado.ordenes.filter((o) => o.producto_id === prod.id).length;
        const msg = usadoEn
          ? `Vas a borrar "${prod.producto}". Tiene ${usadoEn} orden(es) de compra asociadas: esas órdenes van a quedar sin producto vinculado, conservando el nombre y los montos.`
          : `Vas a borrar "${prod.producto}". No se puede deshacer.`;
        if (!(await confirmar(msg))) return abrirEditor(prod);
        try {
          await db.borrarProducto(prod.id);
          cerrarPanel();
          await recargar();
          aviso('Producto borrado');
        } catch (err) { aviso(err.message, 'error'); }
      });
    });
}

export function montar(raiz) {
  $$('[data-nuevo]', raiz).forEach((b) => (b.onclick = () => abrirEditor()));

  const buscar = $('#buscar', raiz);
  if (buscar) {
    buscar.oninput = (e) => {
      filtro = e.target.value;
      const pos = e.target.selectionStart;
      window.dispatchEvent(new CustomEvent('repintar'));
      const nuevo = $('#buscar');
      if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(pos, pos); }
    };
  }

  $$('[data-orden]', raiz).forEach((h) => (h.onclick = () => {
    const campo = h.dataset.orden;
    orden = { campo, asc: orden.campo === campo ? !orden.asc : true };
    window.dispatchEvent(new CustomEvent('repintar'));
  }));

  $$('tr[data-id]', raiz).forEach((tr) => (tr.onclick = () => {
    const e = estado.evs.find((x) => x.id === tr.dataset.id);
    if (e) abrirEditor(e);
  }));
}
