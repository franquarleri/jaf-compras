// =====================================================================
// JAF COMPRAS · MOTOR DE CÁLCULO
//
// Este archivo es la traducción exacta de las fórmulas de JAF-Compras-v1.xlsx.
// Es la ÚNICA fuente de verdad: la base de datos guarda datos crudos y nada
// calculado. Si querés cambiar una regla del negocio, se cambia acá.
//
// Cada función lleva al lado la celda del Excel de la que sale, para que
// puedas auditar el sistema contra la planilla original.
// =====================================================================

/** MEDIAN(0, x, 5) del Excel: recorta el valor al rango 0..5. */
const clamp5 = (x) => Math.max(0, Math.min(5, Number.isFinite(x) ? x : 0));

/** IFERROR(a/b, 0): división que nunca explota. */
const div = (a, b) => (b ? a / b : 0);

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

// ---------------------------------------------------------------------
// FACTORES DERIVADOS · hoja Parámetros, filas 23 a 27
// ---------------------------------------------------------------------
export function derivados(p) {
  const ivaEsCosto = p.es_monotributista;                                    // C23
  return {
    ivaEsCosto,
    // C24 · RI: el precio final contiene IVA débito que no es ingreso tuyo.
    divisorVenta: p.es_monotributista === 1 ? 1 : 1 + p.iva_general_pct,
    // C25 · RI con tarifas que ya traen IVA: hay que netearlas.
    divisorEnvio:
      p.es_monotributista === 0 && p.envio_incluye_iva === 1
        ? 1 + p.iva_general_pct
        : 1,
    // C26 · RI: el IVA sobre comisiones es crédito, no costo (factor 1).
    factorIvaCargos: 1 + p.iva_general_pct * ivaEsCosto,
    // C27 · cuánto cuesta tener la plata parada durante el lead time.
    factorFinPercep: (p.costo_financiero_anual * p.lead_time_dias) / 365,
  };
}

// ---------------------------------------------------------------------
// TARIFA DE ENVÍO · columna U
// Toma la primera banda cuyo tope iguala o supera el peso facturable.
// ---------------------------------------------------------------------
export function tarifaEnvio(pesoFacturable, tarifas) {
  if (!tarifas || !tarifas.length) return 0;
  const bandas = [...tarifas].sort((a, b) => a.hasta_kg - b.hasta_kg);
  const menores = bandas.filter((t) => t.hasta_kg < pesoFacturable).length;
  return bandas[Math.min(menores, bandas.length - 1)].costo_ars;
}

// ---------------------------------------------------------------------
// ESTADO DE CARGA · columna AJ
// En el Excel: COUNTBLANK(E:Q)=0. Son los 13 datos obligatorios.
// Un producto al que le falte cualquiera de estos NO recibe puntaje.
// ---------------------------------------------------------------------
export const CAMPOS_OBLIGATORIOS = [
  'senasa', 'enacom', 'litio',
  'fob_usd', 'moq', 'precio_ml',
  'peso_kg', 'largo_cm', 'ancho_cm', 'alto_cm',
  'ventas_mes', 'concentracion_top3', 'riesgo_tecnico',
];

export function camposFaltantes(prod) {
  return CAMPOS_OBLIGATORIOS.filter(
    (c) => prod[c] === null || prod[c] === undefined || prod[c] === ''
  );
}

// ---------------------------------------------------------------------
// EVALUACIÓN DE UN PRODUCTO · columnas R a AS
// ---------------------------------------------------------------------
export function evaluar(prod, p, tarifas) {
  const d = derivados(p);

  const fob    = num(prod.fob_usd) ?? 0;
  const moq    = num(prod.moq) ?? 0;
  const precio = num(prod.precio_ml) ?? 0;
  const peso   = num(prod.peso_kg) ?? 0;

  // --- LOGÍSTICA CALCULADA ---------------------------------------
  const pesoVol   = div(
    (num(prod.largo_cm) ?? 0) * (num(prod.ancho_cm) ?? 0) * (num(prod.alto_cm) ?? 0),
    p.divisor_volumetrico
  );                                                                          // R
  const pesoFact  = Math.max(peso, pesoVol);                                   // S
  const relacion  = div(pesoFact, peso);                                       // T
  const tarifa    = tarifaEnvio(pesoFact, tarifas);                            // U

  // --- COSTO PUESTO EN DEPÓSITO ----------------------------------
  const moqUsd = fob * moq;                                                    // V

  // CIF + despacho local, todo en dólares
  const cif = fob * (1 + p.flete_seguro_pct);
  const baseArancelaria = cif * (1 + p.derechos_importacion_pct + p.tasa_estadistica_pct);
  const costoPuestoUsd = baseArancelaria + cif * p.despacho_local_pct;         // W

  // Impuestos de importación. Sólo suman al costo si sos Monotributista.
  const impuestosImp =
    baseArancelaria *
    (p.iva_importacion_pct + p.percepcion_iva_pct + p.percepcion_iibb_pct);

  const aPesos = p.tipo_cambio * (1 + p.colchon_devaluacion);
  const costoPuestoArs = (costoPuestoUsd + impuestosImp * d.ivaEsCosto) * aPesos; // X

  // Si sos RI las percepciones son crédito fiscal, pero inmovilizan capital
  // durante todo el lead time: eso tiene un costo financiero real.
  const costoFinPercep =
    d.ivaEsCosto === 1 ? 0 : impuestosImp * aPesos * d.factorFinPercep;        // Y

  // --- LIQUIDACIÓN MERCADO LIBRE ---------------------------------
  const ingresoNeto = div(precio, d.divisorVenta);                             // Z
  const comisionML  = precio * p.comision_ml_pct * d.factorIvaCargos;          // AA
  const costoFijo   =
    (precio < p.umbral_costo_fijo ? p.costo_fijo_unidad : 0) * d.factorIvaCargos; // AB
  // El envío sólo se descuenta cuando efectivamente lo paga el vendedor.
  const envioVendedor =
    precio >= p.umbral_envio_gratis ? div(tarifa, d.divisorEnvio) : 0;         // AC
  const otrosCargos =
    precio * (p.cargo_cuotas_ml_pct + p.publicidad_pct) * d.factorIvaCargos +
    ingresoNeto * (p.devoluciones_pct + p.iibb_venta_pct);                     // AD
  const empaque = p.empaque_ars;                                               // AE

  const contribucion =
    ingresoNeto - comisionML - costoFijo - envioVendedor - otrosCargos -
    empaque - costoPuestoArs - costoFinPercep;                                 // AF
  const margen = div(contribucion, ingresoNeto);                               // AG

  // --- CAPITAL Y RIESGO ------------------------------------------
  const inversionLote = moq * costoPuestoArs;                                  // AH
  const descuentoUmbral =
    precio > p.umbral_costo_fijo ? div(precio - p.umbral_costo_fijo, precio) : 0; // AI

  // --- CONTROL ---------------------------------------------------
  const faltantes = camposFaltantes(prod);
  const completo = faltantes.length === 0;
  const estadoCarga = completo ? 'COMPLETO' : 'FALTAN DATOS';                  // AJ

  const motivos = [];                                                          // AK
  if (completo) {
    if (prod.senasa) motivos.push('SENASA');
    if (prod.enacom) motivos.push('ENACOM');
    if (prod.litio)  motivos.push('LITIO / CARGA PELIGROSA');
    if (precio < p.umbral_costo_fijo) motivos.push('PRECIO BAJO UMBRAL');
    if (margen < p.margen_minimo)     motivos.push('MARGEN BAJO');
  }
  const alerta = completo ? (motivos.length ? motivos.join(' · ') : 'OK') : '';

  // --- SCORING ---------------------------------------------------
  let scores = null, puntaje = null;
  if (completo) {
    scores = {
      margen:      clamp5(div(margen, p.margen_score5) * 5),                   // AL
      demanda:     clamp5(div(num(prod.ventas_mes) ?? 0, p.ventas_score5) * 5),// AM
      competencia: clamp5(                                                     // AN
        div(p.concentracion_score0 - (num(prod.concentracion_top3) ?? 0),
            p.concentracion_score0 - p.concentracion_score5) * 5),
      logistica:   clamp5(                                                     // AO
        div(p.relacion_peso_score0 - relacion,
            p.relacion_peso_score0 - p.relacion_peso_score5) * 5),
      riesgo:      clamp5(((5 - (num(prod.riesgo_tecnico) ?? 0)) / 4) * 5),    // AP
      capital:     clamp5(                                                     // AQ
        div(p.moq_usd_score0 - moqUsd, p.moq_usd_score0 - p.moq_usd_score5) * 5),
    };
    puntaje =                                                                  // AR
      ((scores.margen      * p.peso_margen +
        scores.demanda     * p.peso_demanda +
        scores.competencia * p.peso_competencia +
        scores.logistica   * p.peso_logistica +
        scores.riesgo      * p.peso_riesgo +
        scores.capital     * p.peso_capital) / 5) * 100;
  }

  // --- VEREDICTO · AS --------------------------------------------
  let veredicto;
  if (!completo)              veredicto = 'FALTAN DATOS';
  else if (alerta !== 'OK')   veredicto = 'DESCARTAR — ' + alerta;
  else if (puntaje >= p.puntaje_comprar)   veredicto = 'COMPRAR';
  else if (puntaje >= p.puntaje_candidato) veredicto = 'CANDIDATO';
  else if (puntaje >= p.puntaje_dudoso)    veredicto = 'DUDOSO';
  else                                     veredicto = 'DESCARTAR';

  return {
    ...prod,
    codigo: prod.numero ? 'EV-' + String(prod.numero).padStart(3, '0') : '',
    pesoVol, pesoFact, relacion, tarifa,
    moqUsd, costoPuestoUsd, costoPuestoArs, costoFinPercep,
    ingresoNeto, comisionML, costoFijo, envioVendedor, otrosCargos, empaque,
    contribucion, margen, inversionLote, descuentoUmbral,
    estadoCarga, completo, faltantes, alerta, motivos,
    scores, puntaje, veredicto,
    // clase corta para pintar el veredicto
    veredictoClase: veredicto.startsWith('DESCARTAR')
      ? 'descartar'
      : veredicto === 'FALTAN DATOS' ? 'faltan' : veredicto.toLowerCase(),
  };
}

export const evaluarTodos = (productos, p, tarifas) =>
  productos.map((prod) => evaluar(prod, p, tarifas));

// ---------------------------------------------------------------------
// FICHA · comparación de canales, hoja Ficha filas 30 a 51
// Mismo producto, mismo precio, en Mercado Libre contra canal propio.
// ---------------------------------------------------------------------
export function compararCanales(ev, p) {
  const d = derivados(p);
  const precio = num(ev.precio_ml) ?? 0;
  const neto = ev.ingresoNeto;

  const ml = {
    precio,
    ivaDebito: precio - neto,
    ingresoNeto: neto,
    comision: ev.comisionML,
    costoFijo: ev.costoFijo,
    cuotas: precio * p.cargo_cuotas_ml_pct * d.factorIvaCargos,
    publicidad: precio * p.publicidad_pct * d.factorIvaCargos,
    envio: ev.envioVendedor,
    empaque: p.empaque_ars,
    cac: 0,                                  // ML trae la demanda en la comisión
    devoluciones: neto * p.devoluciones_pct,
    iibb: neto * p.iibb_venta_pct,
    costoProducto: ev.costoPuestoArs,
    costoFinanciero: ev.costoFinPercep,
  };

  const propio = {
    precio,
    ivaDebito: precio - neto,
    ingresoNeto: neto,
    comision: precio * p.comision_pasarela_pct * d.factorIvaCargos,
    costoFijo: 0,                            // en canal propio no existe
    cuotas: precio * p.cargo_cuotas_propio_pct * d.factorIvaCargos,
    publicidad: 0,                           // acá la publicidad se cuenta como CAC
    envio: div(ev.tarifa, d.divisorEnvio) * p.multiplicador_envio_propio * p.pct_envio_bonificado,
    empaque: p.empaque_ars,
    cac: p.cac_ars,
    devoluciones: neto * p.devoluciones_pct,
    iibb: neto * p.iibb_venta_pct,
    costoProducto: ev.costoPuestoArs,
    costoFinanciero: ev.costoFinPercep,
  };

  const restar = (c) =>
    c.comision + c.costoFijo + c.cuotas + c.publicidad + c.envio + c.empaque +
    c.cac + c.devoluciones + c.iibb + c.costoProducto + c.costoFinanciero;

  ml.contribucion = ml.ingresoNeto - restar(ml);
  propio.contribucion = propio.ingresoNeto - restar(propio);
  ml.margen = div(ml.contribucion, ml.ingresoNeto);
  propio.margen = div(propio.contribucion, propio.ingresoNeto);

  const diferencia = propio.contribucion - ml.contribucion;
  return {
    ml, propio, diferencia,
    // Techo de publicidad por venta antes de que convenga más vender en ML.
    cacMaximo: p.cac_ars + diferencia,
    veredicto: diferencia > 0
      ? 'CONVIENE el canal propio para este producto'
      : 'NO CONVIENE al CAC actual: bajá el CAC, subí el precio, o vendelo en ML',
  };
}

// ---------------------------------------------------------------------
// ÓRDENES · hoja Órdenes, columnas D a Q
// ---------------------------------------------------------------------
export function evaluarOrden(orden, evaluaciones, p) {
  const prod = evaluaciones.find((e) => e.id === orden.producto_id);
  const unidades = num(orden.unidades) ?? 0;

  // Si la orden tiene el costo congelado, manda ese. Si no, se calcula en
  // vivo desde el producto, como hacía el Excel.
  const fob = num(orden.fob_usd) ?? (prod ? num(prod.fob_usd) ?? 0 : 0);
  const costoPuesto = num(orden.costo_puesto_ars) ?? (prod ? prod.costoPuestoArs : 0);

  const leadTime = num(orden.lead_time_dias) ?? p.lead_time_dias;
  const arribo = orden.fecha_pago
    ? new Date(new Date(orden.fecha_pago + 'T00:00:00').getTime() + leadTime * 86400000)
    : null;

  let diasParaArribo = null;
  if (arribo) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    diasParaArribo = Math.round((arribo - hoy) / 86400000);
  }

  const recibido = orden.estado === 'Recibido';
  const cerrada = recibido || orden.estado === 'Cancelado';

  let alerta = '';
  if (!recibido) {
    if (!orden.fecha_pago) alerta = 'Falta fecha de pago';
    else if (diasParaArribo < 0) alerta = `ATRASADO ${Math.abs(diasParaArribo)} días`;
    else if (diasParaArribo <= 15) alerta = `Llega en ${diasParaArribo} días`;
  }

  return {
    ...orden,
    codigo: orden.numero ? 'OC-' + String(orden.numero).padStart(3, '0') : '',
    producto: prod,
    productoNombre: prod ? prod.producto : orden.producto_nombre || '—',
    proveedorId: prod ? prod.proveedor_id : null,
    fobUsd: fob,
    fobTotal: unidades * fob,
    costoPuestoArs: costoPuesto,
    inversionTotal: unidades * costoPuesto,
    leadTime,
    arribo,
    diasParaArribo,
    alerta,
    atrasada: alerta.startsWith('ATRASADO'),
    abierta: !cerrada && !!orden.estado,
    congelada: orden.costo_puesto_ars !== null && orden.costo_puesto_ars !== undefined,
  };
}

// ---------------------------------------------------------------------
// TABLERO · hoja Tablero
// ---------------------------------------------------------------------
export function tablero(evs, ords, p) {
  const comprar = evs.filter((e) => e.veredicto === 'COMPRAR');
  const completos = evs.filter((e) => e.completo);
  const prom = (arr, f) => (arr.length ? arr.reduce((a, x) => a + f(x), 0) / arr.length : 0);
  const abiertas = ords.filter((o) => o.abierta);

  return {
    cargados: evs.length,
    completos: completos.length,
    faltanDatos: evs.filter((e) => !e.completo).length,
    comprar: comprar.length,
    candidato: evs.filter((e) => e.veredicto === 'CANDIDATO').length,
    dudoso: evs.filter((e) => e.veredicto === 'DUDOSO').length,
    descartar: evs.filter((e) => e.veredicto.startsWith('DESCARTAR')).length,

    senasa: evs.filter((e) => e.motivos.includes('SENASA')).length,
    enacom: evs.filter((e) => e.motivos.includes('ENACOM')).length,
    litio:  evs.filter((e) => e.motivos.includes('LITIO / CARGA PELIGROSA')).length,
    bajoUmbral: evs.filter((e) => e.motivos.includes('PRECIO BAJO UMBRAL')).length,
    margenBajo: evs.filter((e) => e.motivos.includes('MARGEN BAJO')).length,

    margenPromedioComprar: prom(comprar, (e) => e.margen),
    capitalNecesario: comprar.reduce((a, e) => a + e.inversionLote, 0),
    puntajePromedio: prom(completos, (e) => e.puntaje),

    ordenesAbiertas: abiertas.length,
    capitalComprometido: abiertas.reduce((a, o) => a + o.inversionTotal, 0),
    lotesRecibidos: ords.filter((o) => o.estado === 'Recibido').length,
    ordenesAtrasadas: ords.filter((o) => o.atrasada).length,
    inversionHistorica: ords.reduce((a, o) => a + o.inversionTotal, 0),

    // Cuántas unidades del producto promedio aprobado hacen falta por mes
    // para cubrir la estructura fija. No estaba en el Excel; es la pregunta
    // que sigue naturalmente a "cuánto deja cada unidad".
    contribucionPromedioComprar: prom(comprar, (e) => e.contribucion),
    costosFijos: p.costos_fijos_mensuales + p.abono_plataforma_ars,
  };
}

// ---------------------------------------------------------------------
// CHEQUEOS · hoja Chequeos
// Si algo dice REVISAR es una decisión pendiente, no un error del sistema.
// ---------------------------------------------------------------------
export function chequeos(evs, ords, p, tarifas, fmt) {
  const sumaPesos =
    p.peso_margen + p.peso_demanda + p.peso_competencia +
    p.peso_logistica + p.peso_riesgo + p.peso_capital;
  const comprar = evs.filter((e) => e.veredicto === 'COMPRAR');
  const margenProm = comprar.length
    ? comprar.reduce((a, e) => a + e.margen, 0) / comprar.length
    : 0;
  const faltan = evs.filter((e) => !e.completo).length;
  const atrasadas = ords.filter((o) => o.atrasada).length;
  const primeraTarifa = tarifas.length
    ? [...tarifas].sort((a, b) => a.hasta_kg - b.hasta_kg)[0].costo_ars
    : 0;

  return [
    { control: 'Los pesos del scoring suman 100%',
      valor: fmt.pct(sumaPesos),
      ok: Math.round(sumaPesos * 10000) === 10000,
      porque: 'Si no suman 100%, el puntaje de todos los productos queda distorsionado.' },
    { control: 'Condición fiscal declarada',
      valor: p.es_monotributista === 1 ? 'Monotributo' : 'Resp. Inscripto',
      ok: true,
      porque: 'Verificá que sea la correcta: cambia el margen de cada producto casi a la mitad.' },
    { control: 'Comisión de ML dentro del rango vigente',
      valor: fmt.pct(p.comision_ml_pct),
      ok: p.comision_ml_pct >= 0.118 && p.comision_ml_pct <= 0.1714,
      porque: 'Confirmar la de tu categoría en el panel de vendedor.' },
    { control: 'Alícuota de Ingresos Brutos cargada',
      valor: fmt.pct(p.iibb_venta_pct),
      ok: p.iibb_venta_pct > 0,
      porque: 'Si está en cero, el modelo te está mintiendo a favor.' },
    { control: 'Provisión por devoluciones cargada',
      valor: fmt.pct(p.devoluciones_pct),
      ok: p.devoluciones_pct > 0,
      porque: 'La promesa de garantía se presupuesta o se paga por sorpresa.' },
    { control: 'CAC del canal propio cargado',
      valor: fmt.ars(p.cac_ars),
      ok: p.cac_ars > 0,
      porque: 'Con CAC en cero el canal propio siempre parece ganar. No es real.' },
    { control: 'Tarifas de envío reemplazadas por las tuyas',
      valor: fmt.ars(primeraTarifa),
      ok: primeraTarifa !== 3200,
      porque: 'Si sigue el valor de ejemplo, todavía no cargaste tu tabla real del panel de vendedor.' },
    { control: 'Productos cargados sin datos completos',
      valor: String(faltan),
      ok: faltan === 0,
      porque: 'Estos productos no tienen puntaje. No es un error: es la regla que evita aprobar a ciegas.' },
    { control: 'Hay al menos un producto aprobado',
      valor: String(comprar.length),
      ok: comprar.length > 0,
      porque: 'Si ninguno llega, o el catálogo no sirve, o los umbrales están mal calibrados.' },
    { control: 'Órdenes atrasadas',
      valor: String(atrasadas),
      ok: atrasadas === 0,
      porque: 'Un lote atrasado corre toda la planificación de stock y de caja.' },
    { control: 'Margen promedio de aprobados vs objetivo',
      valor: fmt.pct(margenProm),
      ok: margenProm >= p.margen_score5,
      porque: 'El plan maestro fija 45% de contribución como compuerta de la Etapa 1.' },
  ];
}

export const LIMITES = [
  'No modela el capital de trabajo en el tiempo: cuándo pagás el lote contra cuándo cobrás las ventas. Con 4 meses de lead time, ese desfase es el riesgo real.',
  'No incluye impuesto a las ganancias, tu retiro personal, ni el impuesto al cheque.',
  'El CAC se carga como promedio. En la realidad sube a medida que escalás.',
  'La tasa de recompra no está modelada, y es lo que justifica el CAC del canal propio en el largo plazo.',
  'No mide dos criterios de cuña del plan maestro: presión del courier chino sobre el producto, y "dolor real de decisión" del comprador.',
  'No reemplaza probar el producto: validá con 20 a 30 unidades en plaza y 60 días de ventas antes de importar.',
];
