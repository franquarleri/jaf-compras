// =====================================================================
// ARRANQUE Y NAVEGACIÓN
// =====================================================================
import * as db from './db.js';
import { estado, recargar } from './store.js';
import { $, esc, aviso, cerrarPanel } from './ui.js';

import * as guia from './views/guia.js';
import * as tablero from './views/tablero.js';
import * as evaluacion from './views/evaluacion.js';
import * as ficha from './views/ficha.js';
import * as ordenes from './views/ordenes.js';
import * as proveedores from './views/proveedores.js';
import * as parametros from './views/parametros.js';
import * as chequeos from './views/chequeos.js';

const VISTAS = {
  tablero:     { titulo: 'Tablero',     mod: tablero },
  evaluacion:  { titulo: 'Evaluación',  mod: evaluacion },
  ficha:       { titulo: 'Ficha',       mod: ficha },
  ordenes:     { titulo: 'Órdenes',     mod: ordenes },
  proveedores: { titulo: 'Proveedores', mod: proveedores },
  parametros:  { titulo: 'Parámetros',  mod: parametros },
  chequeos:    { titulo: 'Chequeos',    mod: chequeos },
  guia:        { titulo: 'Guía',        mod: guia },
};

let vistaActual = null;

const rutaActual = () => {
  const r = location.hash.replace('#/', '') || 'tablero';
  return VISTAS[r] ? r : 'tablero';
};

// ---------------------------------------------------------------------
// PANTALLAS DE BORDE
// ---------------------------------------------------------------------
function pantallaSinConfigurar() {
  document.body.className = 'centrado';
  $('#app').innerHTML = `
    <div class="tarjeta ancha">
      <h1 class="marca">JAF <span>Compras</span></h1>
      <h2>Falta conectar la base de datos</h2>
      <p>Abrí <code>app/config.js</code> y pegá los dos valores de tu proyecto de Supabase
         (Project Settings &rarr; Data API):</p>
      <pre><code>export const SUPABASE_URL = 'https://xxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';</code></pre>
      <p class="ayuda">Antes de eso hay que aplicar las migraciones de
         <code>supabase/migrations/</code> en la base. Está todo explicado en el README.</p>
    </div>`;
}

function pantallaLogin(mensaje = '') {
  document.body.className = 'centrado';
  $('#app').innerHTML = `
    <div class="tarjeta">
      <h1 class="marca">JAF <span>Compras</span></h1>
      <p class="tarjeta-bajada">Sistema de evaluación y decisión de compra.</p>
      <form id="form-login" class="form">
        <label class="campo"><span>Email</span>
          <input name="email" type="email" required autocomplete="username" /></label>
        <label class="campo"><span>Contraseña</span>
          <input name="password" type="password" required autocomplete="current-password" /></label>
        ${mensaje ? `<p class="error-login">${esc(mensaje)}</p>` : ''}
        <button class="btn btn-principal ancho" type="submit">Entrar</button>
      </form>
      <p class="ayuda">Las cuentas se crean desde Supabase &rarr; Authentication &rarr; Users.</p>
    </div>`;

  $('#form-login').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#form-login button');
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    const f = new FormData(e.target);
    const { error } = await db.entrar(f.get('email'), f.get('password'));
    if (error) {
      pantallaLogin(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : error.message);
      return;
    }
    arrancar();
  };
}

function pantallaError(err) {
  document.body.className = 'centrado';
  $('#app').innerHTML = `
    <div class="tarjeta ancha">
      <h1 class="marca">JAF <span>Compras</span></h1>
      <h2>No se pudieron cargar los datos</h2>
      <p class="error-login">${esc(err.message)}</p>
      <p class="ayuda">Lo más probable: faltan aplicar las migraciones de
         <code>supabase/migrations/</code>, o el RLS está bloqueando a tu usuario.</p>
      <button class="btn" id="reintentar">Reintentar</button>
      <button class="btn" id="cerrar-sesion">Cerrar sesión</button>
    </div>`;
  $('#reintentar').onclick = arrancar;
  $('#cerrar-sesion').onclick = async () => { await db.salir(); arrancar(); };
}

// ---------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------
function pintarLayout() {
  document.body.className = 'app';
  $('#app').innerHTML = `
    <aside class="lateral">
      <a class="marca" href="#/tablero">JAF <span>Compras</span></a>
      <nav id="nav">
        ${Object.entries(VISTAS).map(([k, v]) =>
          `<a href="#/${k}" data-ruta="${k}">${esc(v.titulo)}</a>`).join('')}
      </nav>
      <div class="lateral-pie">
        <span class="usuario">${esc(estado.usuario?.email || '')}</span>
        <button class="btn-texto" id="salir">Cerrar sesión</button>
      </div>
    </aside>
    <main id="vista" class="vista"></main>`;

  $('#salir').onclick = async () => { await db.salir(); arrancar(); };
}

function pintarVista() {
  const ruta = rutaActual();
  if (vistaActual && vistaActual !== ruta) VISTAS[vistaActual].mod.desmontar?.();
  vistaActual = ruta;

  document.querySelectorAll('#nav a').forEach((a) =>
    a.classList.toggle('activo', a.dataset.ruta === ruta));

  const cont = $('#vista');
  cont.innerHTML = VISTAS[ruta].mod.render();
  VISTAS[ruta].mod.montar?.(cont);
  document.title = `${VISTAS[ruta].titulo} · JAF Compras`;
}

// ---------------------------------------------------------------------
async function arrancar() {
  if (!db.configurado) return pantallaSinConfigurar();

  cerrarPanel();
  const s = await db.sesion();
  if (!s) return pantallaLogin();

  estado.usuario = s.user;
  document.body.className = 'app cargando';
  $('#app').innerHTML = '<div class="cargando-msg">Cargando…</div>';

  try {
    await recargar();
  } catch (err) {
    return pantallaError(err);
  }
  pintarLayout();
  pintarVista();
}

window.addEventListener('hashchange', () => {
  if (document.body.classList.contains('app')) pintarVista();
});

// Las vistas piden repintarse con este evento (filtros, orden, selección).
window.addEventListener('repintar', () => {
  if (document.body.classList.contains('app')) pintarVista();
});

window.addEventListener('unhandledrejection', (e) => {
  if (document.body.classList.contains('app')) aviso(String(e.reason?.message || e.reason), 'error');
});

db.alCambiarSesion?.((evento) => {
  if (evento === 'SIGNED_OUT') arrancar();
});

arrancar();
