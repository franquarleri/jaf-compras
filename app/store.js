// =====================================================================
// ESTADO DE LA APLICACIÓN
// Un único objeto con los datos crudos traídos de Supabase y su versión
// ya evaluada por calc.js. Cualquier cambio pasa por recargar().
// =====================================================================
import * as db from './db.js';
import { evaluarTodos, evaluarOrden } from './calc.js';

export const estado = {
  parametrosMeta: [],
  p: {},
  tarifas: [],
  proveedores: [],
  productos: [],
  ordenes: [],
  evs: [],     // productos ya evaluados
  ords: [],    // órdenes ya evaluadas
  usuario: null,
};

const suscriptores = new Set();
export const alCambiar = (fn) => { suscriptores.add(fn); return () => suscriptores.delete(fn); };
const avisar = () => suscriptores.forEach((fn) => fn());

/** Vuelve a leer todo de la base y recalcula. */
export async function recargar() {
  const datos = await db.cargarTodo();
  Object.assign(estado, datos);
  recalcular();
  avisar();
}

/** Recalcula sin tocar la base. Sirve para el "¿y si...?" de Parámetros. */
export function recalcular() {
  estado.evs = evaluarTodos(estado.productos, estado.p, estado.tarifas);
  estado.ords = estado.ordenes.map((o) => evaluarOrden(o, estado.evs, estado.p));
  return estado;
}

export const proveedorNombre = (id) =>
  estado.proveedores.find((x) => x.id === id)?.nombre || '—';
