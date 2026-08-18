// GUÍA · qué es este sistema, cómo se usa y qué no hace.
export function render() {
  return `
  <header class="vista-head">
    <div>
      <h1>JAF Compras</h1>
      <p class="bajada">Sistema de evaluación y decisión de compra de productos importados.</p>
    </div>
  </header>

  <section class="bloque prosa">
    <h2 class="bloque-titulo">Qué es</h2>
    <p>Un sistema para decidir qué productos comprar <em>antes</em> de comprometer capital, y para
       seguir las compras aprobadas hasta que llegan al depósito.</p>
    <p>Es la versión online de <code>JAF-Compras-v1.xlsx</code>: mismas fórmulas, misma lógica de
       decisión, pero con los datos en un solo lugar, accesible desde cualquier máquina y sin
       riesgo de que alguien pise una fórmula sin querer.</p>
  </section>

  <section class="bloque prosa">
    <h2 class="bloque-titulo">El flujo</h2>
    <ol class="flujo">
      <li><strong>Parámetros</strong> — se configura una vez y se revisa cada vez que cambia el tipo
          de cambio, una comisión o una tarifa.</li>
      <li><strong>Proveedores</strong> — se cargan una vez y quedan disponibles en el resto del sistema.</li>
      <li><strong>Evaluación</strong> — un producto por fila. Es el corazón: calcula costo puesto,
          liquidación de Mercado Libre, márgenes y puntaje.</li>
      <li><strong>Ficha</strong> — la economía completa de un producto, incluida la comparación
          contra canal propio.</li>
      <li><strong>Órdenes</strong> — los productos aprobados pasan acá cuando se compran, con
          inversión, fechas y estado del lote.</li>
      <li><strong>Tablero</strong> — cuántos productos hay en cada veredicto, cuánto capital hay
          comprometido y qué alertas están abiertas.</li>
      <li><strong>Chequeos</strong> — controles automáticos. Si algo dice REVISAR, es una decisión
          pendiente, no un error.</li>
    </ol>
  </section>

  <section class="bloque prosa">
    <h2 class="bloque-titulo">Las reglas que el sistema aplica solo</h2>
    <ul>
      <li>Un producto al que le falte cualquier dato obligatorio <strong>no recibe puntaje</strong>.
          Queda como FALTAN DATOS. Es deliberado: en la matriz original, olvidarse de cargar el costo
          daba el puntaje más alto posible.</li>
      <li>Descarte automático por: registro SENASA, homologación ENACOM, batería de litio,
          precio debajo del umbral de costo fijo de Mercado Libre, o margen debajo del mínimo aceptable.</li>
      <li>El margen se calcula sobre ingreso neto de IVA, con el interruptor fiscal de Parámetros.</li>
      <li>El envío sólo se descuenta cuando efectivamente lo paga el vendedor.</li>
    </ul>
  </section>

  <section class="bloque prosa">
    <h2 class="bloque-titulo">Qué cambia respecto del Excel</h2>
    <ul>
      <li>Los datos viven en una base, no en un archivo. No hay dos versiones dando vueltas.</li>
      <li>Los cálculos están en un solo archivo (<code>app/calc.js</code>), no repetidos en 250 celdas.</li>
      <li>Al cargar un producto ves el veredicto mientras escribís, antes de guardar.</li>
      <li>En Parámetros ves el impacto de cada cambio sobre el pipeline en tiempo real.</li>
      <li>Las órdenes pueden congelar el costo del lote al momento del pago, para que un salto del
          tipo de cambio no reescriba lo que ya invertiste.</li>
    </ul>
  </section>

  <section class="bloque prosa limites-bloque">
    <h2 class="bloque-titulo">Límites de este sistema</h2>
    <ul>
      <li>Calcula contribución por unidad, no ganancia neta: no incluye impuesto a las ganancias ni tu retiro.</li>
      <li>El tratamiento fiscal es una simplificación operativa. Validalo con tu contador antes de fijar precios.</li>
      <li>No modela el capital de trabajo en el tiempo (cuándo pagás el lote contra cuándo cobrás las ventas).</li>
      <li>Sirve para decidir qué testear, no para justificar un contenedor: validá con 20 a 30 unidades
          en plaza y 60 días de ventas reales.</li>
    </ul>
  </section>`;
}

export function montar() {}
