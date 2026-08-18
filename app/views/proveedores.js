// PROVEEDORES · se cargan una vez y quedan disponibles en todo el sistema.
import { estado, recargar } from '../store.js';
import * as db from '../db.js';
import { fmt, esc, abrirPanel, cerrarPanel, confirmar, aviso, leerForm, $, $$ } from '../ui.js';

const VIAS = ['Consolidado en contenedor', 'Contenedor completo', 'Courier aéreo', 'Carga aérea', 'Otro'];
const INCOTERMS = ['FOB', 'EXW', 'CIF', 'CFR', 'DDP', 'Otro'];

export function render() {
  const lista = estado.proveedores;
  return `
  <header class="vista-head">
    <div>
      <h1>Proveedores</h1>
      <p class="bajada">Se cargan una vez y aparecen como desplegable en Evaluación y Órdenes.</p>
    </div>
    <div class="head-acciones"><button class="btn btn-principal" data-nuevo>+ Proveedor</button></div>
  </header>

  ${lista.length === 0 ? `
  <div class="vacio">
    <h2>No hay proveedores cargados</h2>
    <button class="btn btn-principal" data-nuevo>Cargar el primero</button>
  </div>` : `
  <div class="tabla-scroll">
    <table class="tabla">
      <thead><tr>
        <th>Proveedor</th><th>País / ciudad</th><th>Contacto</th><th>Vía de ingreso</th>
        <th>Incoterm</th><th class="num">Lead time</th><th>Muestras</th>
        <th class="num">Productos</th><th>Notas</th>
      </tr></thead>
      <tbody>${lista.map(fila).join('')}</tbody>
    </table>
  </div>
  <p class="nota">Clic en una fila para editarla.</p>`}`;
}

const fila = (p) => {
  const usados = estado.productos.filter((x) => x.proveedor_id === p.id).length;
  return `
  <tr data-id="${p.id}" class="clickeable">
    <td class="fuerte">${esc(p.nombre)}</td>
    <td>${esc(p.pais_ciudad || '—')}</td>
    <td>${esc(p.contacto || '—')}</td>
    <td>${esc(p.via_ingreso || '—')}</td>
    <td>${esc(p.incoterm || '—')}</td>
    <td class="num">${p.lead_time_dias ? fmt.entero(p.lead_time_dias) + ' d' : '—'}</td>
    <td>${esc(p.muestras || '—')}</td>
    <td class="num">${fmt.entero(usados)}</td>
    <td class="ayuda">${esc(p.notas || '')}</td>
  </tr>`;
};

const opt = (lista, actual) =>
  ['<option value="">— sin definir —</option>']
    .concat(lista.map((v) => `<option ${v === actual ? 'selected' : ''}>${esc(v)}</option>`))
    .join('');

function abrirEditor(p = {}) {
  abrirPanel(p.id ? p.nombre : 'Nuevo proveedor', `
    <form id="form-proveedor" class="form">
      <label class="campo"><span>Nombre *</span>
        <input name="nombre" required value="${esc(p.nombre || '')}" /></label>
      <div class="grid-2">
        <label class="campo"><span>País / ciudad</span>
          <input name="pais_ciudad" value="${esc(p.pais_ciudad || '')}" /></label>
        <label class="campo"><span>Contacto</span>
          <input name="contacto" value="${esc(p.contacto || '')}" />
          <small>Mail, WeChat, Alibaba.</small></label>
      </div>
      <div class="grid-3">
        <label class="campo"><span>Vía de ingreso</span>
          <select name="via_ingreso">${opt(VIAS, p.via_ingreso)}</select></label>
        <label class="campo"><span>Incoterm</span>
          <select name="incoterm">${opt(INCOTERMS, p.incoterm)}</select></label>
        <label class="campo"><span>Lead time (días)</span>
          <input name="lead_time_dias" type="number" step="1" data-tipo="numero"
                 value="${p.lead_time_dias ?? ''}" /></label>
      </div>
      <label class="campo"><span>Muestras recibidas</span>
        <select name="muestras">${opt(['Sí', 'No', 'Pedidas'], p.muestras)}</select></label>
      <label class="campo"><span>Notas</span>
        <textarea name="notas" rows="3">${esc(p.notas || '')}</textarea></label>
      <div class="acciones">
        ${p.id ? '<button type="button" class="btn btn-peligro" data-borrar>Borrar</button>' : ''}
        <span class="espaciador"></span>
        <button type="button" class="btn" data-cerrar>Cancelar</button>
        <button type="submit" class="btn btn-principal">Guardar</button>
      </div>
    </form>`, (cuerpo) => {
    const form = $('#form-proveedor', cuerpo);
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        await db.guardarProveedor({ id: p.id, ...leerForm(form) });
        cerrarPanel();
        await recargar();
        aviso(p.id ? 'Proveedor actualizado' : 'Proveedor creado');
      } catch (err) { aviso(err.message, 'error'); }
    };
    $('[data-borrar]', cuerpo)?.addEventListener('click', async () => {
      const usados = estado.productos.filter((x) => x.proveedor_id === p.id).length;
      const msg = usados
        ? `Vas a borrar "${p.nombre}". Está asignado a ${usados} producto(s), que van a quedar sin proveedor.`
        : `Vas a borrar "${p.nombre}". No se puede deshacer.`;
      if (!(await confirmar(msg))) return abrirEditor(p);
      try {
        await db.borrarProveedor(p.id);
        cerrarPanel();
        await recargar();
        aviso('Proveedor borrado');
      } catch (err) { aviso(err.message, 'error'); }
    });
  });
}

export function montar(raiz) {
  $$('[data-nuevo]', raiz).forEach((b) => (b.onclick = () => abrirEditor()));
  $$('tr[data-id]', raiz).forEach((tr) => (tr.onclick = () => {
    const p = estado.proveedores.find((x) => x.id === tr.dataset.id);
    if (p) abrirEditor(p);
  }));
}
