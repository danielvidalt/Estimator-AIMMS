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

## 🔴 Pendiente / bug abierto

**"Al refrescar la página queda en blanco total"** — reportado por el usuario en la app en producción, **no reproducido todavía**.

Lo que se intentó sin éxito:
- Simular en local (con arnés de Playwright + sesión falsa, bypaseando AuthGate) un borrador viejo en `localStorage` con la forma anterior de `execution` (sin el campo `nfcFacadeCount` nuevo) → la página cargó bien, sin blank page ni errores de consola.
- Confirmar que el bundle desplegado en Vercel es el último (contiene el texto "NFC Facades") y que el `index.html` tiene `cache-control: max-age=0, must-revalidate` (no debería quedar cacheado agresivamente).

El usuario dijo "ya funcionó" y luego "queda en blanco" de nuevo — no quedó claro si un refresco forzado (`Cmd+Shift+R`) lo arregla de forma consistente o fue casualidad.

**Siguiente paso al retomar:** pedirle al usuario el error exacto de la consola del navegador (Safari → clic derecho → Inspeccionar Elemento → pestaña Consola) cuando le pase el blank page. Sin ese dato es adivinar a ciegas. Sospechas no confirmadas, en orden de probabilidad:
1. Algo en `localStorage` (`aimms_current_draft` o `aimms_project_history`) con una forma vieja de los datos que rompe en un caso específico no cubierto por la prueba simulada (ej. una cotización guardada en el historial, no el borrador activo).
2. Comportamiento específico de Safari con bfcache / módulos ES al refrescar.
3. Alguna carrera entre la hidratación de Supabase y el primer render (menos probable, ya hay manejo de errores ahí).

## Notas técnicas para retomar

- Para debug local sin depender de login real: recrear `src/main.debug.tsx` + `debug.html` en la raíz (bypasea `AuthGate` con una sesión falsa), correr `npm run dev`, y usar Playwright (`npx playwright install chromium` si hace falta) contra `http://localhost:3000/debug.html`. **Borrar ambos archivos antes de commitear** — no van al repo.
- `npm run lint` = `tsc --noEmit`, `npm run build` = build de producción. Ambos deben pasar antes de cualquier commit.
- No hay `@types/react` instalado en este proyecto (raro, pero así está); si TypeScript se queja de la prop `key` en un componente propio, hay que agregar `key?: string | number` explícito al tipo de props de ese componente (ver `SettingsPanel.tsx` como ejemplo).
