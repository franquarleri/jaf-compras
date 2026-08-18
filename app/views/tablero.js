// TABLERO · el estado general del pipeline de compras.
import { estado } from '../store.js';
import { tablero } from '../calc.js';
import { fmt, esc } from '../ui.js';

const tile = (label, valor, nota = '', clase = '') => `
  <div class="tile ${clase}">
    <div class="tile-valor">${esc(valor)}</div>
    <div class="tile-label">${esc(label)}</div>
    ${nota ? `<div class="tile-nota">${esc(nota)}</div>` : ''}
  </div>`;

export function render() {
  const t = tablero(estado.evs, estado.ords, estado.p);
  const unidadesEquilibrio = t.contribucionPromedioComprar > 0
    ? Math.ceil(t.costosFijos / t.contribucionPromedioComprar) : null;

  return `
  <header class="vista-head">
    <div>
      <h1>Tablero</h1>
      <p class="bajada">Estado general del pipeline de compras. Todo se calcula solo.</p>
    </div>
  </header>

  <section class="bloque">
    <h2 class="bloque-titulo">Pipeline de evaluación</h2>
    <div class="tiles">
      ${tile('Productos cargados', fmt.entero(t.cargados))}
      ${tile('Con datos completos', fmt.entero(t.completos))}
      ${tile('Sin evaluar', fmt.entero(t.faltanDatos), 'No reciben puntaje', t.faltanDatos ? 'atencion' : '')}
      ${tile('COMPRAR', fmt.entero(t.comprar), '', 'ok')}
      ${tile('CANDIDATO', fmt.entero(t.candidato))}
      ${tile('DUDOSO', fmt.entero(t.dudoso))}
      ${tile('DESCARTAR', fmt.entero(t.descartar), 'Incluye descartes por regla')}
    </div>
  </section>

  <section class="bloque">
    <h2 class="bloque-titulo">Descartes automáticos por regla</h2>
    <table class="tabla compacta">
      <tbody>
        <tr><td>Requieren registro SENASA</td><td class="num">${fmt.entero(t.senasa)}</td>
            <td class="ayuda">Producto que se ingiere o se aplica al animal.</td></tr>
        <tr><td>Requieren homologación ENACOM</td><td class="num">${fmt.entero(t.enacom)}</td>
            <td class="ayuda">Todo lo que tenga WiFi, Bluetooth o GPS.</td></tr>
        <tr><td>Batería de litio / carga peligrosa</td><td class="num">${fmt.entero(t.litio)}</td>
            <td class="ayuda">Puede quedar fuera del consolidado y cambiar el flete.</td></tr>
        <tr><td>Precio debajo del umbral de costo fijo</td><td class="num">${fmt.entero(t.bajoUmbral)}</td><td></td></tr>
        <tr><td>Margen debajo del mínimo aceptable</td><td class="num">${fmt.entero(t.margenBajo)}</td><td></td></tr>
      </tbody>
    </table>
  </section>

  <section class="bloque">
    <h2 class="bloque-titulo">Economía de lo aprobado</h2>
    <div class="tiles">
      ${tile('Margen promedio COMPRAR', fmt.pct(t.margenPromedioComprar))}
      ${tile('Capital para comprar todo', fmt.ars(t.capitalNecesario), 'Suma de los MOQ aprobados')}
      ${tile('Puntaje promedio', fmt.num(t.puntajePromedio, 1))}
      ${tile('Contribución por unidad', fmt.ars(t.contribucionPromedioComprar), 'Promedio de los aprobados')}
    </div>
    <p class="nota">
      ${unidadesEquilibrio
        ? `Con esa contribución promedio hacen falta <strong>${fmt.entero(unidadesEquilibrio)} unidades por mes</strong>
           para cubrir ${fmt.ars(t.costosFijos)} de estructura fija. Es una cuenta gruesa: mezcla productos distintos
           y no incluye impuesto a las ganancias.`
        : 'Todavía no hay productos aprobados con contribución positiva, así que no se puede calcular el punto de equilibrio.'}
    </p>
  </section>

  <section class="bloque">
    <h2 class="bloque-titulo">Órdenes de compra</h2>
    <div class="tiles">
      ${tile('Órdenes abiertas', fmt.entero(t.ordenesAbiertas))}
      ${tile('Capital comprometido', fmt.ars(t.capitalComprometido))}
      ${tile('Lotes recibidos', fmt.entero(t.lotesRecibidos))}
      ${tile('Órdenes atrasadas', fmt.entero(t.ordenesAtrasadas), '', t.ordenesAtrasadas ? 'alerta' : '')}
      ${tile('Inversión histórica', fmt.ars(t.inversionHistorica))}
    </div>
  </section>`;
}

export function montar() {}
