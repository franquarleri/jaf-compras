// =====================================================================
// CAPA DE DATOS · Supabase
// Todo lo que toca la base pasa por acá. El resto de la app no sabe que
// existe Supabase.
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { SUPABASE_URL, SUPABASE_ANON_KEY, configurado } from './config.js';

export const sb = configurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export { configurado };

const chk = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// --- SESIÓN ----------------------------------------------------------
export const sesion = async () =>
  sb ? (await sb.auth.getSession()).data.session : null;

export const entrar = (email, password) =>
  sb.auth.signInWithPassword({ email, password });

export const salir = () => sb.auth.signOut();

export const alCambiarSesion = (cb) => sb?.auth.onAuthStateChange(cb);

// --- PARÁMETROS ------------------------------------------------------
export const traerParametros = () =>
  sb.from('parametros').select('*').order('orden').then(chk);

export const guardarParametro = (clave, valor) =>
  sb.from('parametros').update({ valor, updated_at: new Date().toISOString() })
    .eq('clave', clave).then(chk);

// --- TARIFAS DE ENVÍO ------------------------------------------------
export const traerTarifas = () =>
  sb.from('tarifas_envio').select('*').order('hasta_kg').then(chk);

export const guardarTarifa = (id, campos) =>
  sb.from('tarifas_envio').update(campos).eq('id', id).then(chk);

export const crearTarifa = (fila) =>
  sb.from('tarifas_envio').insert(fila).select().single().then(chk);

export const borrarTarifa = (id) =>
  sb.from('tarifas_envio').delete().eq('id', id).then(chk);

// --- PROVEEDORES -----------------------------------------------------
export const traerProveedores = () =>
  sb.from('proveedores').select('*').order('nombre').then(chk);

export const guardarProveedor = (prov) =>
  prov.id
    ? sb.from('proveedores').update(sinId(prov)).eq('id', prov.id).select().single().then(chk)
    : sb.from('proveedores').insert(sinId(prov)).select().single().then(chk);

export const borrarProveedor = (id) =>
  sb.from('proveedores').delete().eq('id', id).then(chk);

// --- PRODUCTOS -------------------------------------------------------
export const traerProductos = () =>
  sb.from('productos').select('*').order('numero').then(chk);

export const guardarProducto = (prod) =>
  prod.id
    ? sb.from('productos').update(sinId(prod)).eq('id', prod.id).select().single().then(chk)
    : sb.from('productos').insert(sinId(prod)).select().single().then(chk);

export const borrarProducto = (id) =>
  sb.from('productos').delete().eq('id', id).then(chk);

// --- ÓRDENES ---------------------------------------------------------
export const traerOrdenes = () =>
  sb.from('ordenes').select('*').order('numero', { ascending: false }).then(chk);

export const guardarOrden = (ord) =>
  ord.id
    ? sb.from('ordenes').update(sinId(ord)).eq('id', ord.id).select().single().then(chk)
    : sb.from('ordenes').insert(sinId(ord)).select().single().then(chk);

export const borrarOrden = (id) =>
  sb.from('ordenes').delete().eq('id', id).then(chk);

// Quita las columnas que la base genera sola y no acepta en un insert/update.
function sinId(obj) {
  const { id, numero, created_at, updated_at, ...resto } = obj;
  return resto;
}

// --- CARGA COMPLETA --------------------------------------------------
export async function cargarTodo() {
  const [parametros, tarifas, proveedores, productos, ordenes] = await Promise.all([
    traerParametros(), traerTarifas(), traerProveedores(), traerProductos(), traerOrdenes(),
  ]);
  // Los parámetros se usan como objeto plano: p.tipo_cambio, p.comision_ml_pct...
  const p = {};
  parametros.forEach((x) => { p[x.clave] = Number(x.valor); });
  return { parametrosMeta: parametros, p, tarifas, proveedores, productos, ordenes };
}
