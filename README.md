# JAF Compras

Sistema online de evaluación y decisión de compra de productos importados.
Es la versión web de `JAF-Compras-v1.xlsx`: **las mismas fórmulas**, verificadas una por una
contra la planilla, pero con los datos en una base y accesibles desde cualquier máquina.

- **Frontend:** HTML + CSS + JavaScript sin framework ni build. Se abre y funciona.
- **Base de datos y login:** Supabase (Postgres + Auth + RLS).
- **Hosting:** GitHub Pages.

**En línea:** <https://franquarleri.github.io/jaf-compras/>

---

## Estado actual

Ya está todo montado y funcionando:

| | |
|---|---|
| Proyecto Supabase | `JAF-COMPRAS` · organización `JAF` · São Paulo (`sa-east-1`) |
| Ref | `odvdsnapmguprdihuxie` |
| Migraciones | aplicadas — 5 tablas, 5 policies, 49 parámetros, 10 bandas de envío |
| RLS | activo en las 5 tablas. Sin sesión, la API devuelve lista vacía |
| Auto-registro | **cerrado** (`signup_disabled`) |
| Site URL | apunta a GitHub Pages, para que los mails de recuperación vuelvan a la app |

Este sistema vive en un proyecto propio y aislado. No comparte base, ni usuarios, ni
configuración con ningún otro sistema.

### Lo único que falta: crear tu usuario

Como el auto-registro está cerrado, los usuarios se crean a mano:

**Authentication → Users → Add user → Create new user.** Poné tu email y una
contraseña, y marcá *Auto Confirm User*. Con eso ya entrás.

Para sumar a alguien más, mismo camino. No hay forma de registrarse desde afuera:
si el registro quedara abierto, cualquiera con la URL podría crearse una cuenta y
ver tus costos, tus márgenes y tus proveedores.

> **¿Es seguro que la clave esté en el código?** Sí. `app/config.js` lleva la
> *publishable key*, diseñada para vivir en el navegador. No da acceso por sí sola:
> lo que protege los datos es el RLS, que exige sesión iniciada. Está verificado —
> una consulta sin sesión a `parametros` devuelve `[]` aunque la tabla tenga 49 filas.
> La que **nunca** va acá es una *secret key* o la `service_role`: esas saltean el RLS.

### Si alguna vez hay que rehacerlo desde cero

Aplicá las migraciones de [`supabase/migrations/`](supabase/migrations/) en orden,
copiándolas en **SQL Editor → New query** o con el CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref odvdsnapmguprdihuxie
supabase db push
```

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

Ya está activo: **Settings → Pages → Deploy from a branch → `main` / `root`**.
Cada `git push` a `main` republica el sitio en un minuto.

El repo es público porque Pages no sirve repos privados con cuenta gratuita. No hay
secretos en el código, pero sí queda a la vista el modelo de costos. Si en algún
momento eso molesta, la alternativa es pasar el repo a privado y publicar en
[Netlify](https://netlify.com) o [Vercel](https://vercel.com), que sirven repos
privados sin costo.

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
