# JAF Compras

Sistema online de evaluación y decisión de compra de productos importados.
Es la versión web de `JAF-Compras-v1.xlsx`: **las mismas fórmulas**, verificadas una por una
contra la planilla, pero con los datos en una base y accesibles desde cualquier máquina.

- **Frontend:** HTML + CSS + JavaScript sin framework ni build. Se abre y funciona.
- **Base de datos y login:** Supabase (Postgres + Auth + RLS).
- **Hosting:** GitHub Pages.

---

## Puesta en marcha

Son tres pasos. Toma unos 15 minutos la primera vez.

### 1 · Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto.
   Elegí la región **South America (São Paulo)**: es la más cercana.
2. Guardá la contraseña de la base en algún lado seguro. No se puede recuperar.
3. Cuando el proyecto termine de levantar, aplicá las migraciones de
   [`supabase/migrations/`](supabase/migrations/), en orden:
   - `20260818120000_esquema.sql` crea las tablas y activa la seguridad por fila.
   - `20260818120100_parametros_iniciales.sql` carga los ~50 parámetros con los
     valores que ya tenías en el Excel.

   Se pueden aplicar de dos maneras. Copiando y pegando cada archivo en
   **SQL Editor → New query**, o con el CLI:

   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <ref-de-tu-proyecto>
   supabase db push
   ```

### 2 · Crear tu usuario y cerrar la puerta

1. **Authentication → Users → Add user → Create new user.**
   Poné tu email y una contraseña. Marcá *Auto Confirm User*.
2. **Authentication → Sign In / Providers → Email**, y **desactivá
   "Allow new users to sign up"**.

   Este paso no es opcional. Si el registro queda abierto, cualquiera que
   tenga la URL del sistema puede crearse una cuenta y ver tus costos,
   tus márgenes y tus proveedores.

3. Para sumar a alguien más, volvés a **Add user**. No hay auto-registro.

### 3 · Conectar el frontend

1. En Supabase, **Project Settings → Data API**. Copiá:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** key (una cadena larga que arranca con `eyJ`)
2. Abrí `app/config.js` y pegá los dos valores.
3. Guardá, commiteá y subí.

> **¿Es seguro que la anon key esté en el código?** Sí. Está diseñada para
> vivir en el navegador y no da acceso por sí sola: lo que protege los datos
> es el RLS del paso 1, que exige sesión iniciada para leer o escribir
> cualquier tabla. La que **nunca** va acá es la `service_role` key, que sí
> saltea el RLS.

---

## Probarlo local

No necesita build, pero sí un servidor: los módulos ES no cargan desde `file://`.

```bash
cd jaf-compras
python -m http.server 8000
# o: npx serve .
```

Abrí <http://localhost:8000>.

---

## Publicar en GitHub Pages

En el repo: **Settings → Pages → Source: Deploy from a branch → `main` / `root`.**
En un minuto queda en `https://<usuario>.github.io/<repo>/`.

Cada `git push` a `main` republica el sitio.

Si el repo es privado, Pages requiere GitHub Pro. Con cuenta gratuita tenés dos
opciones: hacer público el repo (el código no tiene secretos, pero sí queda a la
vista tu modelo de costos), o publicar en [Netlify](https://netlify.com) o
[Vercel](https://vercel.com), que sirven repos privados sin costo.

---

## Cómo está armado

```
index.html            arranque y contenedor
assets/app.css        estilos (paleta de identidad-visual-v1.html)
app/
  config.js           las dos claves de Supabase — lo único que hay que editar
  calc.js             MOTOR DE CÁLCULO · la traducción de las fórmulas del Excel
  db.js               todo lo que toca Supabase
  store.js            estado en memoria y recálculo
  ui.js               formato de números, DOM, panel lateral, avisos
  main.js             login, navegación y ruteo
  views/              una pantalla por archivo
supabase/migrations/
  ..._esquema.sql              tablas + seguridad (RLS)
  ..._parametros_iniciales.sql parámetros iniciales
```

**La regla de oro: la base guarda datos crudos, nunca resultados.** Costo puesto,
margen, puntaje y veredicto se calculan siempre en el momento, a partir de los
parámetros vigentes. Eso significa que si mañana cambia el tipo de cambio, todo
el catálogo se revalúa solo — igual que en el Excel, pero sin arrastrar fórmulas.

### Cambiar una regla del negocio

Todo vive en `app/calc.js`, y cada bloque lleva al lado la celda del Excel de la
que sale (`// X6`, `// AF6`, etc.) para que puedas auditarlo contra la planilla.

Para cambiar un **valor** (una comisión, un umbral, un peso del scoring) no toques
código: se edita desde la pantalla **Parámetros**.

---

## Qué agrega respecto del Excel

1. **Vista previa en vivo.** Al cargar un producto ves el veredicto, el margen y
   la contribución mientras escribís, antes de guardar.
2. **Impacto de los parámetros.** Al cambiar el tipo de cambio o una comisión,
   Parámetros te muestra cuántos productos cambiaron de veredicto y cuánto capital
   pasás a necesitar.
3. **Costo congelado en las órdenes.** El Excel recalculaba las órdenes viejas con
   el tipo de cambio de hoy, o sea que reescribía la historia. Acá podés congelar
   el costo del lote al pagarlo.
4. **Punto de equilibrio** en el Tablero: cuántas unidades por mes hacen falta para
   cubrir la estructura fija.
5. **Desglose del puntaje** en la Ficha: qué criterio suma y cuál te está hundiendo.

## Qué sigue sin resolver

Lo mismo que el Excel, y conviene tenerlo presente:

- Calcula contribución por unidad, no ganancia neta. No incluye impuesto a las
  ganancias, tu retiro ni el impuesto al cheque.
- No modela el capital de trabajo en el tiempo: cuándo pagás el lote contra cuándo
  cobrás las ventas. Con 120 días de lead time, ese desfase es el riesgo real.
- El CAC se carga como promedio; en la realidad sube a medida que escalás.
- La recompra no está modelada, y es lo que justifica el CAC del canal propio.
- El tratamiento fiscal es una simplificación operativa. Validalo con tu contador
  antes de fijar precios.

**No reemplaza probar el producto.** Sirve para decidir qué testear, no para
justificar un contenedor: validá con 20 a 30 unidades en plaza y 60 días de
ventas reales.
