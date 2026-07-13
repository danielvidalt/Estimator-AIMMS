# Handoff — Estimator AIMMS

_Última actualización: 2026-07-14_

## Estado general

- **App en vivo:** https://estimator-aimms.vercel.app (Vercel, auto-deploy en cada push a `main` del repo `danielvidalt/Estimator-AIMMS`).
- **Backend:** Supabase (`iyxcjzhyuxygxrfmybkt`).
- **Acceso (2026-07-14, cambio de arquitectura): sin cuentas de usuario.** Cualquier visitante entra directo, sin login — por atrás recibe una sesión anónima de Supabase (`signInAnonymously()`, ver `src/components/SessionGate.tsx`, que reemplazó a `AuthGate.tsx`). Solo existe un login real, oculto detrás de un ícono de escudo en el header: el admin (`danielvidal.t@gmail.com`, hardcodeado en `src/lib/adminConfig.ts`), que desbloquea la pestaña **Settings** (antes "Configuración") para editar los parámetros del motor de precios. `src/components/AdminLogin.tsx` es el modal de sign-in (sin registro, la cuenta admin ya existe).
  - **Requiere un toggle manual en el dashboard de Supabase** (no se puede hacer por SQL/migración): Authentication → Settings → "Allow anonymous sign-ins". Sin esto, `signInAnonymously()` falla con 422 y la app muestra una pantalla de error explicándolo — confirmado en vivo el 2026-07-14, el toggle todavía no estaba activado.
- **3 tablas en Supabase, todas con RLS `to authenticated`** (las sesiones anónimas también tienen role `authenticated`, así que las políticas existentes ya las cubren):
  - `quotes` — historial de cotizaciones, ahora compartido con cualquier visitante (no solo 3 usuarios).
  - `app_state` — borrador actual + override de preliminares (fila única `singleton`, compartida por todos).
  - `pricing_config` — parámetros del motor de precios. Desde la migración `20260714000000_open_access_admin_config.sql`, el SELECT es abierto a cualquier autenticado (incl. anónimos, para que la calculadora funcione), pero el INSERT/UPDATE queda restringido por RLS a `auth.jwt()->>'email' = 'danielvidal.t@gmail.com'` — el admin es el único que puede guardar cambios, reforzado en la base de datos, no solo en la UI.
- Archivos de migración en `supabase/migrations/` (por si hay que recrear el proyecto Supabase desde cero). **La migración `20260714000000` todavía no se corrió contra la base real** — hay que ejecutarla en el SQL Editor de Supabase.
- No hay sync en tiempo real (websockets) entre pestañas/usuarios simultáneos — cada quien ve los últimos datos guardados al cargar/refrescar, pero dos personas con la app abierta a la vez no ven los cambios del otro sin recargar. Si se necesita eso, falta agregar `supabase.channel(...).on('postgres_changes', ...)`.

## Funcionalidad construida esta sesión

1. Conexión del proyecto local al repo GitHub y a Supabase.
2. Migración de `localStorage` a Supabase para historial/borrador (con `localStorage` como fallback/caché si Supabase no responde).
3. Auth (login/registro), deploy en Vercel.
4. Fix: el campo "Direct Facade Area Override" no seguía en tiempo real los cambios de altura/perímetro (el default estaba mal, quedaba "pegado" a un valor viejo).
5. Fix: Floors Factor y Area Factor se mostraban como badges pero nunca se multiplicaban en el precio final — ya se aplican al costo de ejecución.
6. Pestaña **Configuración** — todos los parámetros del motor de precios (factores, tarifas, preliminares, reglas de categoría) editables y guardados en Supabase, compartidos entre los 3 usuarios. IDs/labels quedan fijos, solo los números son editables.
7. NFC tags: se sacaron de los preliminares fijos; ahora hay un campo "NFC Facades" en la página principal y el costo se calcula por fachada (70 tags × $1.30 material + $0.40 instalación, todo editable en Configuración).

## ✅ Resuelto (2026-07-13): "pantalla en blanco"

**Causa raíz encontrada:** en el hydrate de Supabase (`App.tsx`, efecto que corre una vez al montar), `setConfig(remoteConfig)` reemplazaba el `PricingConfig` completo por lo que estuviera guardado en la fila `singleton` de la tabla `pricing_config`, sin mergear con los defaults. Esa fila fue guardada por alguien vía la pestaña Configuración **antes** de que existiera el campo `nfcRates` (agregado en el commit "Move NFC tags..."). Al llegar la respuesta de Supabase (unos ms después del primer render, que sí se veía bien con `DEFAULT_PRICING_CONFIG`), `config.nfcRates` quedaba `undefined`, y `calculator.ts:125` (`config.nfcRates.tagsPerFacade`) tiraba un `TypeError` durante el render. Como no había ningún `ErrorBoundary` en la app, React desmontaba todo el árbol → pantalla en blanco total, sin nada en pantalla que lo delatara (solo un error en consola que nadie miró).

Esto también explica el patrón "ya funcionó, y después quedó en blanco": el primer paint usa el config default en memoria (funciona), y se rompe cuando termina de llegar el config viejo desde Supabase.

**Fix aplicado:**
1. `App.tsx` ahora mergea `remoteConfig` sobre `DEFAULT_PRICING_CONFIG` (incluyendo los objetos anidados `dronePilotRates`, `execRates`, `nfcRates`) en vez de reemplazar el config entero — así un campo nuevo que falte en una fila vieja de Supabase nunca queda `undefined`.
2. Se agregó `src/components/ErrorBoundary.tsx`, envolviendo `AuthGate`/`App` en `main.tsx`. Si algo similar vuelve a pasar, ahora se ve un mensaje de error en pantalla (con el texto exacto) y un botón para "Borrar datos locales y recargar", en vez de blanco total sin salida.

Nota de implementación: este proyecto no tiene `@types/react` instalado, así que una clase que extiende `React.Component<Props, State>` no infiere bien `this.props` — hubo que redeclarar `props: Props` explícito en el constructor (mismo patrón que ya existía para `key` en `SettingsPanel.tsx`).

**Pendiente de verificar:** confirmar con el usuario que no vuelve a pasar. Si vuelve a pasar, ahora el ErrorBoundary debería mostrar el mensaje exacto en vez de blanco — pedir ese texto.

## Notas técnicas para retomar

- Para debug local sin depender de Supabase real: recrear `src/main.debug.tsx` + `debug.html` en la raíz (pasa una sesión falsa directo a `<App>`, saltando `SessionGate`; agregar `?admin=1` a la URL en el fake session para probar el modo admin), correr `npm run dev`, y usar Playwright (`npx playwright install chromium` si hace falta) contra `http://localhost:3000/debug.html`. **Borrar ambos archivos antes de commitear** — no van al repo.
- `npm run lint` = `tsc --noEmit`, `npm run build` = build de producción. Ambos deben pasar antes de cualquier commit.
- No hay `@types/react` instalado en este proyecto (raro, pero así está); si TypeScript se queja de la prop `key` en un componente propio, hay que agregar `key?: string | number` explícito al tipo de props de ese componente (ver `SettingsPanel.tsx` como ejemplo).
