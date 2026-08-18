// =====================================================================
// UTILIDADES DE INTERFAZ · formato, DOM y avisos
// =====================================================================

const locale = 'es-AR';

export const fmt = {
  ars: (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
    : new Intl.NumberFormat(locale, { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v)),
  ars2: (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
    : new Intl.NumberFormat(locale, { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v)),
  usd: (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
    : 'US$ ' + new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v)),
  pct: (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
    : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(v)),
  num: (v, d = 2) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(v)),
  entero: (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v)),
  fecha: (v) => {
    if (!v) return '—';
    const d = v instanceof Date ? v : new Date(v + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? '—'
      : d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  },
  fechaISO: (d) => (d instanceof Date && !Number.isNaN(d.getTime())
    ? d.toISOString().slice(0, 10) : ''),
};

/** Escapa texto que viene de la base antes de meterlo en el HTML. */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// --- AVISOS ----------------------------------------------------------
let avisoTimer;
export function aviso(texto, tipo = 'ok') {
  const el = $('#aviso');
  el.textContent = texto;
  el.className = 'aviso visible ' + tipo;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { el.className = 'aviso'; }, tipo === 'error' ? 6000 : 3000);
}

// --- PANEL LATERAL (formularios) -------------------------------------
// Se avisa cuando el panel se cierra por cualquier vía (botón, Escape, clic
// afuera). Sin esto, confirmar() se quedaría esperando para siempre.
let alCerrar = null;

export function abrirPanel(titulo, contenidoHTML, alMontar) {
  const panel = $('#panel');
  panel.innerHTML = `
    <div class="panel-caja" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <header class="panel-head">
        <h2>${esc(titulo)}</h2>
        <button class="btn-icono" data-cerrar aria-label="Cerrar">&times;</button>
      </header>
      <div class="panel-cuerpo">${contenidoHTML}</div>
    </div>`;
  panel.classList.add('abierto');
  panel.onclick = (e) => { if (e.target === panel || e.target.closest('[data-cerrar]')) cerrarPanel(); };
  document.addEventListener('keydown', escapeCierra);
  alMontar?.($('.panel-cuerpo', panel));
  $('.panel-cuerpo input, .panel-cuerpo select, .panel-cuerpo textarea', panel)?.focus();
}

export function cerrarPanel() {
  $('#panel').classList.remove('abierto');
  $('#panel').innerHTML = '';
  document.removeEventListener('keydown', escapeCierra);
  const cb = alCerrar;
  alCerrar = null;
  cb?.();
}

const escapeCierra = (e) => { if (e.key === 'Escape') cerrarPanel(); };

/** Confirmación honesta: dice qué se va a borrar antes de borrarlo. */
export function confirmar(mensaje) {
  return new Promise((resolve) => {
    let respondido = false;
    const responder = (v) => { if (!respondido) { respondido = true; resolve(v); } };
    abrirPanel('Confirmar', `
      <p class="confirmar-texto">${esc(mensaje)}</p>
      <div class="acciones">
        <span class="espaciador"></span>
        <button class="btn" data-no>Cancelar</button>
        <button class="btn btn-peligro" data-si>Sí, borrar</button>
      </div>`, (cuerpo) => {
      // Cerrar con Escape o clic afuera cuenta como "no".
      alCerrar = () => responder(false);
      // Primero se resuelve y después se cierra: cerrarPanel dispara alCerrar,
      // y si respondiéramos después, el "no" del cierre ganaría siempre.
      $('[data-si]', cuerpo).onclick = () => { responder(true); cerrarPanel(); };
      $('[data-no]', cuerpo).onclick = () => { responder(false); cerrarPanel(); };
    });
  });
}

/** Lee un formulario y devuelve un objeto: '' se convierte en null. */
export function leerForm(form) {
  const out = {};
  new FormData(form).forEach((v, k) => {
    if (v === '') { out[k] = null; return; }
    const el = form.elements[k];
    if (el?.dataset.tipo === 'numero') out[k] = Number(v);
    else if (el?.dataset.tipo === 'bool') out[k] = v === 'true';
    else out[k] = v;
  });
  // los checkbox no marcados no viajan en el FormData
  [...form.elements].forEach((el) => {
    if (el.type === 'checkbox' && !(el.name in out)) out[el.name] = false;
  });
  return out;
}

export const pastilla = (texto, clase) =>
  `<span class="pastilla ${clase}">${esc(texto)}</span>`;
