-- =====================================================================
-- JAF COMPRAS · Esquema de base de datos
-- Correr entero en Supabase > SQL Editor > New query.
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PARÁMETROS · clave/valor. Manda en todo el sistema.
-- ---------------------------------------------------------------------
create table if not exists public.parametros (
  clave       text primary key,
  valor       numeric not null default 0,
  etiqueta    text not null,
  ayuda       text,
  grupo       text not null,
  formato     text not null default 'numero',   -- numero | pct | ars | usd | entero | switch
  orden       integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TARIFAS DE ENVÍO · banda de peso facturable -> costo
-- ---------------------------------------------------------------------
create table if not exists public.tarifas_envio (
  id         bigint generated always as identity primary key,
  hasta_kg   numeric not null,
  costo_ars  numeric not null
);
create index if not exists tarifas_envio_hasta_idx on public.tarifas_envio (hasta_kg);

-- ---------------------------------------------------------------------
-- PROVEEDORES
-- ---------------------------------------------------------------------
create table if not exists public.proveedores (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  pais_ciudad     text,
  contacto        text,
  via_ingreso     text,
  incoterm        text,
  lead_time_dias  integer,
  muestras        text,
  notas           text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTOS (hoja Evaluación) · SOLO datos crudos.
-- Todo lo calculado vive en app/calc.js, nunca acá.
-- Los campos de carga son nullable a propósito: null = dato faltante,
-- y un producto con cualquier dato faltante NO recibe puntaje.
-- ---------------------------------------------------------------------
create table if not exists public.productos (
  id                  uuid primary key default gen_random_uuid(),
  numero              integer generated always as identity,   -- da el código EV-001
  producto            text not null,
  categoria_ml        text,
  proveedor_id        uuid references public.proveedores(id) on delete set null,

  -- clasificación regulatoria (null = sin responder)
  senasa              boolean,
  enacom              boolean,
  litio               boolean,

  -- economía
  fob_usd             numeric,
  moq                 integer,
  precio_ml           numeric,

  -- logística
  peso_kg             numeric,
  largo_cm            numeric,
  ancho_cm            numeric,
  alto_cm             numeric,

  -- mercado
  ventas_mes          numeric,
  concentracion_top3  numeric,
  riesgo_tecnico      integer check (riesgo_tecnico between 1 and 5),

  notas               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ÓRDENES DE COMPRA
-- costo_puesto_ars: si está en null se calcula en vivo desde el producto
-- (igual que el Excel). Al pasar la orden a Pagado se congela el valor
-- del día, para que un salto del tipo de cambio no reescriba la historia.
-- ---------------------------------------------------------------------
create table if not exists public.ordenes (
  id                uuid primary key default gen_random_uuid(),
  numero            integer generated always as identity,     -- da el código OC-001
  fecha_orden       date not null default current_date,
  producto_id       uuid references public.productos(id) on delete set null,
  producto_nombre   text,          -- copia de respaldo por si se borra el producto
  unidades          integer,
  fecha_pago        date,
  lead_time_dias    integer,
  estado            text not null default 'Pendiente de pago',
  costo_puesto_ars  numeric,       -- congelado; null = vivo
  fob_usd           numeric,       -- congelado; null = vivo
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists ordenes_producto_idx on public.ordenes (producto_id);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists productos_touch on public.productos;
create trigger productos_touch before update on public.productos
  for each row execute function public.touch_updated_at();

drop trigger if exists ordenes_touch on public.ordenes;
create trigger ordenes_touch before update on public.ordenes
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- SEGURIDAD (RLS)
-- Modelo elegido: privado con login. Todo usuario autenticado ve y edita
-- los mismos datos. Nadie sin sesión toca nada.
--
-- IMPORTANTE: además de esto, andá a Supabase > Authentication >
-- Sign In / Providers y DESACTIVÁ "Allow new users to sign up".
-- Si queda activo, cualquiera con la anon key puede crearse una cuenta
-- y entrar. Los usuarios se crean a mano desde Authentication > Users.
-- =====================================================================
alter table public.parametros     enable row level security;
alter table public.tarifas_envio  enable row level security;
alter table public.proveedores    enable row level security;
alter table public.productos      enable row level security;
alter table public.ordenes        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['parametros','tarifas_envio','proveedores','productos','ordenes']
  loop
    execute format('drop policy if exists "acceso_autenticado" on public.%I', t);
    execute format(
      'create policy "acceso_autenticado" on public.%I
         for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
