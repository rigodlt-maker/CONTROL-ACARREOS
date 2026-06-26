# Control de Acarreos — Rompeolas Oriente, Veracruz

Aplicación web (PWA) para el control digital de los viajes de acarreo de material pétreo (volteo y góndola) hacia las distintas zonas de construcción del rompeolas de Veracruz. Sustituye el registro en papel de las boletas de pesaje por una captura digital, sincronizada en la nube, con tableros de control y exportación a Excel.

> **Estado:** en operación / uso interno.
> **Stack:** HTML + CSS + JavaScript (vanilla, sin build), Firebase (Auth + Firestore), Chart.js, SheetJS.

---

## 1. ¿Qué problema resuelve?

En la operación de acarreos de un proyecto de rompeolas, cada camión genera una **boleta de pesaje** con dos mediciones (peso bruto y tara) que determinan el peso neto y las toneladas transportadas de un material (núcleo, berma, secundaria, coraza, etc.) desde un banco de origen hacia un destino (muro, morro, cuerpo 1‑5, acopio). Llevar este control en papel u hojas de cálculo manuales genera:

- Boletas incompletas o extraviadas (falta el 2do pesaje o la tara).
- Cálculos manuales de neto/toneladas propensos a error.
- Falta de trazabilidad en tiempo real de cuánto material se ha movido por material/banco/destino/periodo.
- Dificultad para consolidar reportes diarios, semanales o mensuales.
- Nula visibilidad de tiempos de ciclo entre el primer y segundo pesaje.

Esta app digitaliza ese proceso de punta a punta: captura, valida, calcula, almacena, sincroniza, visualiza y exporta.

---

## 2. Funcionalidades principales

### Captura de pesajes (pestaña "Pesajes")
- Registro de fecha/hora del 1er y 2do pesaje, con cálculo automático del **ciclo** (tiempo entre pesajes).
- Identificación del viaje: boleta, placas, folio, número económico, tipo de camión (volteo / góndola).
- Selección de material, banco (origen) y destino (cuerpo/acopio/muro/morro), con **rango de material** sugerido automáticamente según la combinación material + destino (tabla de rangos granulométricos).
- Cálculo automático de **peso neto** y **toneladas** a partir de bruto y tara.
- Validación de campos obligatorios y alerta de **boleta duplicada** antes de guardar.
- Opción de guardar un viaje como **pendiente** cuando aún no se tiene el 2do pesaje o la tara.

### Pendientes
- Lista de viajes con 1er pesaje capturado a los que falta completar el 2do pesaje y/o la tara, para cerrarlos después sin volver a capturar todo el viaje.

### Base de datos
- Buscador/listado de todos los registros capturados, con estadísticas rápidas (totales) y detalle de cada boleta en un modal, con opción de editar o eliminar.

### Dashboard (gráficos)
- KPIs de viajes y toneladas filtrados.
- Gráficas (Chart.js) de toneladas por material, por banco de origen y por mes.
- Filtros por fecha, banco, material y cuerpo/destino (selección múltiple).
- Modo "ver todo el histórico" vs. ventana reciente (para no leer toda la base en cada consulta).

### Resumen por periodo
- Resumen jerárquico de viajes y toneladas por día, semana, mes o rango de fechas, con los mismos filtros multi-selección (banco, material, cuerpo, tipo de camión).
- Se apoya en una colección de **resúmenes pre-agregados por mes** (`resumenes`) para no tener que leer todo el histórico en cada consulta — se actualiza incrementalmente cada vez que se guarda, edita o elimina un registro (`aplicarResumen` / `moverResumen`), con un botón de "recalcular" para reconstruirlo desde cero si hiciera falta.

### Exportación a Excel
- Descarga de los registros filtrados (fecha, banco, material, cuerpo) directamente a un archivo `.xlsx` (vía SheetJS), sin pasar por un backend intermedio.

### Usuarios y roles (panel Admin)
- Autenticación con correo/contraseña (Firebase Auth).
- Roles: `capturista` (solo captura), `visor` (solo lectura/resumen), `admin` (gestiona capturistas/visores y ve la base completa) y `master` (control total, incluida la asignación de cualquier rol).
- Alta de usuarios queda **pendiente de autorización** hasta que un admin/master la aprueba.

### PWA (Progressive Web App)
- Instalable en el teléfono/escritorio (`manifest.json`, iconos 192/512), con banner de instalación y funcionamiento tipo app nativa (sin barra de navegador).

---

## 3. Estructura del repositorio

```
CONTROL-ACARREOS-main/
├── index.html        # Toda la aplicación: UI, estilos y lógica (single-file app)
├── manifest.json      # Configuración de la PWA (nombre, iconos, colores)
├── icon-192.png       # Ícono de la app (192x192)
└── icon-512.png       # Ícono de la app (512x512)
```

No hay paso de build ni dependencias instaladas localmente: todas las librerías (Firebase SDK, Chart.js, SheetJS) se cargan vía CDN directamente en `index.html`.

---

## 4. Arquitectura técnica

- **Frontend:** una sola página (`index.html`) con navegación por pestañas controlada en JavaScript (sin framework ni router).
- **Backend:** Firebase
  - **Auth:** correo/contraseña, con perfil de rol almacenado en Firestore.
  - **Firestore** como base de datos, con tres colecciones principales:
    - `acarreos` — cada documento es un viaje/boleta.
    - `usuarios` — perfil y rol de cada cuenta.
    - `resumenes` — agregados mensuales pre-calculados (viajes y toneladas) para que los reportes carguen rápido sin leer todo el histórico.
- **Librerías de terceros (CDN):** Firebase JS SDK 10.12.2 (modular), Chart.js 4.4.4, SheetJS (xlsx) 0.18.5.
- **Offline/sincronización:** toasts de estado de sincronización (`pendiente / ok / error`) para que el capturista sepa si su registro ya llegó a la nube.

### Modelo de datos de un viaje (`acarreos`)

| Campo | Descripción |
|---|---|
| `fecha1`, `hora1` | Fecha y hora del 1er pesaje (bruto) |
| `fecha2`, `hora2` | Fecha y hora del 2do pesaje (tara) — opcional si el viaje queda pendiente |
| `ciclo` | Tiempo transcurrido entre pesajes (calculado) |
| `boleta` | Número de boleta física/folio de control |
| `placas`, `folio`, `economico` | Identificación del vehículo/viaje |
| `tipo_camion` | `VOLTEO` o `GONDOLA` |
| `material` | Núcleo, Berma, Berma de apoyo, Secundaria 1, Secundaria 2, Coraza |
| `banco` | Origen: El Tajo, Tritura, Mozomboa (Gami / Lerma / Porfirio) |
| `destino` | Acopio Marino, Acopio Terrestre, Muro, Morro, Cuerpo 1‑5 |
| `rango` | Rango granulométrico sugerido según material + destino |
| `bruto_kg`, `tara_kg` | Pesos capturados |
| `neto_kg`, `toneladas` | Calculados automáticamente |
| `pendiente` | Booleano: viaje con 2do pesaje/tara aún sin capturar |
| `ts` / `ts_updated` | Timestamps de creación/edición (server timestamp) |

---

## 5. Roles y permisos

| Rol | Captura | Pendientes | Base de datos | Resumen | Gráficos | Excel | Admin |
|---|---|---|---|---|---|---|---|
| `capturista` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `visor` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (gestiona capturistas/visores) |
| `master` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (gestiona todos los roles) |

*(Permisos inferidos de la lógica de `index.html`; ajustar la tabla si cambia el código.)*

---

## 6. Cómo ejecutar / desplegar

1. Es un sitio estático: puede abrirse `index.html` directamente o servirse desde cualquier hosting estático (Firebase Hosting, Netlify, GitHub Pages, etc.).
2. Requiere un proyecto de **Firebase** propio con **Authentication** (correo/contraseña) y **Firestore** habilitados, y sus credenciales colocadas en el objeto `firebaseConfig` dentro de `index.html`.
3. Configurar las **reglas de seguridad de Firestore** para que el acceso a cada colección dependa del rol del usuario autenticado (la app asume que esta protección vive en las reglas, no solo en el frontend).
4. Crear manualmente el primer usuario con rol `master` (o vía consola de Firebase) para poder autorizar a los demás desde el panel de Admin.

---

## 7. Contexto para el proyecto de certificación Green Belt (Lean Six Sigma)

Esta app es, en esencia, la **digitalización de un proceso operativo de control de acarreos** en una obra de rompeolas. Algunos elementos del propio sistema que pueden servir como punto de partida para definir el alcance del proyecto (DMAIC, mapeo de proceso, métricas, etc.):

- **Proceso que digitaliza:** recepción de material en banco → carga → traslado → pesaje (bruto/tara) → descarga en destino → cierre de boleta.
- **Datos ya capturados que podrían usarse como métricas de proceso:** tiempo de ciclo entre 1er y 2do pesaje, % de viajes que quedan como "pendientes" (incompletos), volumen (toneladas) por banco/material/destino/periodo, número de boletas duplicadas detectadas.
- **Posibles fuentes de variación o desperdicio (waste) ya visibles en el diseño de la app:** boletas que quedan pendientes (rework), captura manual de placas/folio/boleta (riesgo de error humano), dependencia de que el camión pase dos veces por báscula.
- **Roles del proceso:** capturista (operador de báscula), visor (supervisión/reportes), admin/master (control del proceso y de accesos).

*Nota: esta sección describe el sistema tal como existe hoy; la definición formal del problema, el alcance y las métricas del proyecto Green Belt (Project Charter, SIPOC, VOC, etc.) quedan a criterio de quien lo desarrolle — esta documentación busca dar contexto suficiente para ese análisis, no sustituirlo.*

---

## 8. Notas de seguridad

- La `apiKey` de Firebase incluida en `index.html` es pública por diseño (es normal en apps cliente de Firebase): la protección real del dato vive en las **Reglas de seguridad de Firestore** y en la verificación de rol contra la colección `usuarios`. Antes de hacer público este repositorio, confirma que esas reglas restringen correctamente lectura/escritura por colección y por rol.
- Si el repo va a ser público, considera mover credenciales sensibles (si las hubiera) a variables de entorno o a un archivo de configuración excluido del control de versiones.

---

## 9. Posibles mejoras / roadmap (sugeridas, no implementadas)

- Botón "Resumen" dentro de la pestaña Excel (actualmente deshabilitado, "pendiente de definir").
- Métricas explícitas de tiempo de ciclo promedio por banco/destino en el dashboard.
- Alertas automáticas cuando un viaje lleva mucho tiempo como "pendiente".
- Historial de cambios (auditoría) por edición de registro.
