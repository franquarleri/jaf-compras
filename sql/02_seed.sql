-- =====================================================================
-- JAF COMPRAS · Carga inicial de parámetros
-- Correr DESPUÉS de 01_schema.sql. Trae los valores de JAF-Compras-v1.xlsx.
-- Si volvés a correrlo, actualiza etiquetas y ayudas pero NO pisa los
-- valores que ya hayas cambiado desde la app.
-- =====================================================================

insert into public.parametros (clave, valor, etiqueta, ayuda, grupo, formato, orden) values
-- MACRO
('tipo_cambio',              1550,   'Tipo de cambio (ARS por USD)',                 'Cotización de despacho. Actualizar antes de cada análisis.',                        'MACRO', 'ars',    10),
('colchon_devaluacion',      0.12,   'Colchón por devaluación en el lead time',      'Pagás hoy y vendés en 4 meses. Castigo prudente sobre el costo.',                   'MACRO', 'pct',    20),
('lead_time_dias',           120,    'Lead time (días)',                             'Entre el pago al proveedor y el producto en depósito.',                             'MACRO', 'entero', 30),
('costo_financiero_anual',   0.60,   'Costo financiero anual',                       'Tasa a la que valuás la plata inmovilizada.',                                       'MACRO', 'pct',    40),

-- IMPORTACIÓN
('flete_seguro_pct',         0.08,   'Flete + seguro (% sobre FOB)',                 'Consolidado en contenedor. Sin consolidar es bastante más alto. Confirmar prorrateo real.', 'IMPORTACIÓN', 'pct', 110),
('derechos_importacion_pct', 0.18,   'Derechos de importación',                      'Según posición arancelaria NCM. Validar por producto con el despachante.',           'IMPORTACIÓN', 'pct', 120),
('tasa_estadistica_pct',     0.03,   'Tasa de estadística',                          'Sobre valor CIF.',                                                                  'IMPORTACIÓN', 'pct', 130),
('despacho_local_pct',       0.06,   'Despacho y gastos locales (% s/CIF)',          'Honorarios, terminal, transporte interno, bancarios.',                              'IMPORTACIÓN', 'pct', 140),
('iva_importacion_pct',      0.21,   'IVA importación',                              'Sólo es COSTO si sos Monotributista. Si sos RI es crédito fiscal.',                 'IMPORTACIÓN', 'pct', 150),
('percepcion_iva_pct',       0.20,   'Percepción IVA adicional',                     'Crédito para RI, pero inmoviliza capital: se computa como costo financiero.',       'IMPORTACIÓN', 'pct', 160),
('percepcion_iibb_pct',      0.025,  'Percepción IIBB importación',                  'Idem. Poner 0 si no aplica.',                                                       'IMPORTACIÓN', 'pct', 170),

-- CONDICIÓN FISCAL
('iva_general_pct',          0.21,   'IVA general',                                  null,                                                                                'CONDICIÓN FISCAL', 'pct',    210),
('es_monotributista',        1,      '¿Sos Monotributista?',                         'INTERRUPTOR MAESTRO. Cambia el margen de cada producto casi a la mitad. Verificalo primero.', 'CONDICIÓN FISCAL', 'switch', 220),
('iibb_venta_pct',           0.035,  'Ingresos Brutos sobre venta',                  'Alícuota de tu jurisdicción. Confirmar régimen y convenio multilateral.',            'CONDICIÓN FISCAL', 'pct',    230),
('envio_incluye_iva',        1,      '¿Las tarifas de envío incluyen IVA?',          'El panel de ML las muestra con IVA. Si sos RI hay que netearlas.',                   'CONDICIÓN FISCAL', 'switch', 240),

-- MERCADO LIBRE
('comision_ml_pct',          0.155,  'Comisión por venta',                           'Rango vigente 11,80% a 17,14% según categoría. Confirmar en tu panel de vendedor.',  'MERCADO LIBRE', 'pct', 310),
('costo_fijo_unidad',        2810,   'Costo fijo por unidad si precio < umbral',     'Escalonado. Referencia para el tramo alto.',                                        'MERCADO LIBRE', 'ars', 320),
('umbral_costo_fijo',        33000,  'Umbral de costo fijo (ARS)',                   'Arriba de este precio no se cobra costo fijo por unidad.',                           'MERCADO LIBRE', 'ars', 330),
('umbral_envio_gratis',      33000,  'Umbral de envío gratis obligatorio (ARS)',     'Arriba de este precio el envío lo paga el vendedor.',                                'MERCADO LIBRE', 'ars', 340),
('cargo_cuotas_ml_pct',      0,      'Cargo por cuotas sin interés',                 '5,75% a 3 cuotas · 10,75% a 6 cuotas. Poner 0 si no ofrecés.',                       'MERCADO LIBRE', 'pct', 350),
('publicidad_pct',           0.04,   'Publicidad / Product Ads (% sobre precio)',    'Presupuestar aunque arranques sin campañas.',                                        'MERCADO LIBRE', 'pct', 360),
('devoluciones_pct',         0.03,   'Devoluciones y roturas (% sobre venta)',       'Subir a 6% en productos frágiles o eléctricos.',                                     'MERCADO LIBRE', 'pct', 370),

-- CANAL PROPIO
('comision_pasarela_pct',    0.0629, 'Comisión de la pasarela de pago',              'Mercado Pago / Tiendanube. Verificar el plan contratado.',                           'CANAL PROPIO', 'pct', 410),
('cargo_cuotas_propio_pct',  0.085,  'Cargo por cuotas propio',                      'Suele ser más caro que en ML: no tenés su escala.',                                  'CANAL PROPIO', 'pct', 420),
('multiplicador_envio_propio', 1.15, 'Multiplicador de tarifa de envío vs ML',       'Sin el volumen de ML el flete propio sale más caro. 1,00 = igual.',                  'CANAL PROPIO', 'numero', 430),
('pct_envio_bonificado',     0.60,   'Porcentaje de pedidos con envío bonificado',   'En canal propio vos elegís cuándo bonificar. Es decisión, no obligación.',           'CANAL PROPIO', 'pct', 440),
('cac_ars',                  12000,  'Costo de adquisición por venta — CAC (ARS)',   'La variable que define si el canal propio conviene.',                                'CANAL PROPIO', 'ars', 450),
('empaque_ars',              900,    'Empaque e inserto de marca por pedido (ARS)',  'Caja, cinta impresa, tarjeta interior. Aplica a los dos canales.',                   'CANAL PROPIO', 'ars', 460),
('abono_plataforma_ars',     90000,  'Abono mensual de plataforma propia (ARS)',     'Es fijo, no por unidad.',                                                            'CANAL PROPIO', 'ars', 470),

-- ESCALAS DE SCORING
('margen_score5',            0.45,   'Margen neto que puntúa 5',                     'El plan maestro fija 45% como compuerta de la Etapa 1.',                             'ESCALAS DE SCORING', 'pct',    510),
('ventas_score5',            800,    'Ventas/mes de categoría que puntúan 5',        'Fuente: Nubimetrics u equivalente.',                                                 'ESCALAS DE SCORING', 'entero', 520),
('concentracion_score5',     0.30,   'Concentración del top 3 que puntúa 5',         'Mercado fragmentado = fácil de entrar.',                                             'ESCALAS DE SCORING', 'pct',    530),
('concentracion_score0',     0.90,   'Concentración del top 3 que puntúa 0',         'Tres vendedores dominan todo: no entrás por precio.',                                'ESCALAS DE SCORING', 'pct',    540),
('relacion_peso_score5',     1,      'Relación peso facturable / real que puntúa 5', 'Relación 1 = no pagás flete por aire.',                                              'ESCALAS DE SCORING', 'numero', 550),
('relacion_peso_score0',     3,      'Relación peso facturable / real que puntúa 0', 'Producto voluminoso y liviano: el peor caso logístico.',                              'ESCALAS DE SCORING', 'numero', 560),
('moq_usd_score5',           1500,   'MOQ en USD que puntúa 5',                      'Poco capital inmovilizado para entrar.',                                             'ESCALAS DE SCORING', 'usd',    570),
('moq_usd_score0',           8000,   'MOQ en USD que puntúa 0',                      'Mucho capital comprometido por 4 meses.',                                            'ESCALAS DE SCORING', 'usd',    580),

-- PESOS DEL SCORING
('peso_margen',              0.30,   'Margen neto',                                  null, 'PESOS DEL SCORING', 'pct', 610),
('peso_demanda',             0.20,   'Demanda',                                      null, 'PESOS DEL SCORING', 'pct', 620),
('peso_competencia',         0.15,   'Competencia',                                  null, 'PESOS DEL SCORING', 'pct', 630),
('peso_logistica',           0.15,   'Logística / peso volumétrico',                 null, 'PESOS DEL SCORING', 'pct', 640),
('peso_riesgo',              0.10,   'Riesgo técnico y postventa',                   null, 'PESOS DEL SCORING', 'pct', 650),
('peso_capital',             0.10,   'Capital inmovilizado / MOQ',                   null, 'PESOS DEL SCORING', 'pct', 660),

-- UMBRALES DE DECISIÓN
('puntaje_comprar',          75,     'Puntaje mínimo para COMPRAR',                  'Validar con 20-30 unidades en plaza antes de importar.',                             'UMBRALES DE DECISIÓN', 'entero', 710),
('puntaje_candidato',        65,     'Puntaje mínimo para CANDIDATO',                'Renegociar FOB o revisar precio antes de decidir.',                                   'UMBRALES DE DECISIÓN', 'entero', 720),
('puntaje_dudoso',           50,     'Puntaje mínimo para DUDOSO',                   'Sólo con ventaja concreta de costo o exclusividad.',                                 'UMBRALES DE DECISIÓN', 'entero', 730),
('margen_minimo',            0.20,   'Margen mínimo aceptable',                      'Debajo de esto no soporta un ciclo de descuentos ni una devolución.',                 'UMBRALES DE DECISIÓN', 'pct',    740),
('divisor_volumetrico',      5000,   'Divisor de peso volumétrico (cm3 por kg)',     'Estándar 5000. Peso volumétrico = largo x ancho x alto / divisor.',                   'UMBRALES DE DECISIÓN', 'entero', 750),

-- ESTRUCTURA FIJA
('costos_fijos_mensuales',   900000, 'Costos fijos mensuales del negocio (ARS)',     'Depósito, contador, tu retiro. No incluye el abono de plataforma.',                   'ESTRUCTURA FIJA', 'ars', 810)

on conflict (clave) do update
  set etiqueta = excluded.etiqueta,
      ayuda    = excluded.ayuda,
      grupo    = excluded.grupo,
      formato  = excluded.formato,
      orden    = excluded.orden;

-- Tarifas de envío de ejemplo. Reemplazalas por la tabla real de tu cuenta.
insert into public.tarifas_envio (hasta_kg, costo_ars)
select * from (values
  (0.5, 3200), (1, 3900), (2, 4800), (5, 6500), (10, 9200),
  (15, 11500), (20, 14000), (25, 16500), (30, 19000), (999, 24000)
) as v(hasta_kg, costo_ars)
where not exists (select 1 from public.tarifas_envio);

-- Proveedor de ejemplo
insert into public.proveedores (nombre, pais_ciudad, via_ingreso, incoterm, lead_time_dias, muestras, notas)
select 'Proveedor a validar — Guangdong', 'China · Guangdong', 'Consolidado en contenedor', 'FOB', 120, 'No', 'Ejemplo. Reemplazar.'
where not exists (select 1 from public.proveedores);
