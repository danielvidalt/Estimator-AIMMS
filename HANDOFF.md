# Handoff — Estimator AIMMS

_Última actualización: 2026-07-10_

## Estado general

- **App en vivo:** https://estimator-aimms.vercel.app (Vercel, auto-deploy en cada push a `main` del repo `danielvidalt/Estimator-AIMMS`).
- **Backend:** Supabase (`iyxcjzhyuxygxrfmybkt`). Auth por email/password, registro abierto, sesión persistente (no hay que volver a loguearse).
- **3 tablas en Supabase, todas con RLS `to authenticated`** (confirmado que las 3 migraciones ya se ejecutaron correctamente — la última prueba mostró error de RLS, no de "tabla no existe"):
  - `quotes` — historial de cotizaciones, compartido entre los 3 usuarios.
  - `app_state` — borrador actual + override de preliminares (fila única `singleton`).
  - `pricing_config` — todos los parámetros editables del motor de precios (fila única `singleton`).
- Archivos de migración en `supabase/migrations/` (por si hay que recrear el proyecto Supabase desde cero).

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

- Para debug local sin depender de login real: recrear `src/main.debug.tsx` + `debug.html` en la raíz (bypasea `AuthGate` con una sesión falsa), correr `npm run dev`, y usar Playwright (`npx playwright install chromium` si hace falta) contra `http://localhost:3000/debug.html`. **Borrar ambos archivos antes de commitear** — no van al repo.
- `npm run lint` = `tsc --noEmit`, `npm run build` = build de producción. Ambos deben pasar antes de cualquier commit.
- No hay `@types/react` instalado en este proyecto (raro, pero así está); si TypeScript se queja de la prop `key` en un componente propio, hay que agregar `key?: string | number` explícito al tipo de props de ese componente (ver `SettingsPanel.tsx` como ejemplo).
