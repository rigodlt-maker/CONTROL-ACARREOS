# INSTRUCCIONESAPP.md — Bitácora técnica de Control Acarreos

> **Nota de renombre (15/07/2026):** este archivo se llamaba `SIXSIGMA.md`.
> Se renombra a `INSTRUCCIONESAPP.md` por instrucción directa del dueño del
> proyecto, porque el nombre anterior se prestaba a confusión con un
> proyecto de certificación Six Sigma Black Belt independiente (en papel,
> ajeno a esta app). **`SIXSIGMA.md` queda obsoleto — ya no se debe crear
> ni actualizar; todo el trabajo de bitácora sigue aquí, en
> `INSTRUCCIONESAPP.md`.** Todo el contenido original se conserva íntegro
> abajo (secciones 0–9), y se agrega la sección 10 con una observación
> nueva de operación (lecturas excesivas de Firestore por panel).

Bitácora y especificación técnica del módulo de captura estadística y
panel Black Belt de **Control Acarreos**, y de cualquier otra corrección
u observación de operación de la app en general. Este archivo es la
fuente de verdad de EN QUÉ VAMOS para el proyecto. Si se retoma el
trabajo en otro chat o con otra IA, leer este archivo completo ANTES de
escribir código — igual disciplina que `BOT.MD`.

---

## 0. Contexto para quien retome esto (léelo aunque no hayas visto el resto)

- La app principal es **Control Acarreos**, una PWA de Firebase/Firestore
  que registra tickets de báscula (viajes de material) de la obra
  "Rompeolas Oriente" (Veracruz). Vive en `index.html`.
- Existe un **proyecto hermano, independiente**: el bot de Telegram
  (`worker.js` / a veces subido como `index.js`, Cloudflare Worker), que
  lee la misma base de Firestore pero es un servicio aparte y se
  documenta en `BOT.MD`, no aquí. **No confundir los dos archivos de
  bitácora.**
- Este documento (`SIXSIGMA.md`) cubre una tercera pieza, todavía **no
  construida**: un módulo dentro de `index.html` que capture datos de
  tiempo y calidad de captura para alimentar análisis de Six Sigma
  (variabilidad, capacidad de proceso, R&R, First Pass Yield) pensado
  para una certificación Black Belt.
- **Estado real al 13/07/2026: nada de este módulo existe todavía en el
  código.** Se verificó con `grep` sobre `index.html` que no hay rastro
  de `stats_analisis`, `tiempoInicioFormulario`, `ediciones_contador`,
  `t1_fila_ts`/`t2_bruto_ts`/`t3_salida_ts`/`t4_destare_ts`, ni
  `capturista_id`. Este archivo reemplaza al `SIXSIGMA.pdf` original,
  corrigiendo varios supuestos que no coincidían con el código real
  (ver sección 1.1) y dejando trazado el punto exacto de inyección de
  cada bloque.

**Regla de disciplina (igual que `BOT.MD`):** una fase por entrega, y
este archivo se actualiza SIEMPRE que se cierre o se modifique un paso,
antes de pasar a la siguiente fase.

---

## 0.5 — Nota personal de Claude: cómo creo que debería leerse este archivo (y resumen vivo de lecciones)

Jesús me pidió mi opinión honesta sobre esto, así que la doy sin filtro:
este archivo ya pasó el punto donde "léelo completo de arriba a abajo
cada vez" (que es literalmente lo que decía el punto 1 de la sección 8
hasta hoy) sigue siendo una buena instrucción. Son 35 secciones y casi
3,000 líneas, creciendo cada sesión — como bitácora cronológica es
excelente (por eso no propongo borrar nada de eso), pero como documento
de "onboarding" para una IA nueva con presupuesto de contexto limitado,
obliga a gastar una fracción enorme de ese presupuesto solo en leer,
antes de poder pensar en el problema real. Eso tiene un costo directo:
menos espacio para razonar sobre el bug o feature que sí importa hoy.

**Mi recomendación (ya aplicada en esta misma edición):** que este
archivo cumpla dos funciones distintas, con reglas de escritura
distintas para cada una:

1. **Esta sección (0.5) — el "resumen vivo".** Corta a propósito, y la
   única parte del archivo que se **edita en su lugar**, no solo se
   agrega al final. Cuando una sesión nueva encuentra un patrón de bug o
   una regla que se repite, la lección destilada (1-3 líneas) vive
   AQUÍ, no solo enterrada en la sección cronológica donde se descubrió.
   Si una lección nueva generaliza o corrige una que ya está aquí, se
   **reescribe la entrada existente**, no se agrega una segunda casi
   igual al final de la lista.
2. **Todo lo demás (secciones 1 en adelante) — el historial.** Se sigue
   agregando cronológicamente igual que siempre (eso no cambia). Sirve
   para el detalle completo de una decisión puntual, para auditoría, y
   para cuando Jesús pregunta "¿no habíamos ya arreglado esto?" — pero
   ya NO es lectura obligatoria de principio a fin en cada sesión nueva.

**Instrucción actualizada para la próxima IA (reemplaza el punto 1 de la
sección 8):** lee la sección 0 y esta 0.5 completas antes de escribir
código — eso ya te da el contexto del proyecto y las lecciones que más
se repiten. El resto del archivo se **consulta**, no se lee lineal: usa
`grep`/búsqueda para encontrar si ya se decidió algo sobre el tema
puntual que estás tocando, en vez de leer las 35 secciones de corrido.

### Patrones/reglas vivas (consolidado de las secciones 2, 24 y 30 — se edita esta lista, no se vuelve a duplicar en secciones nuevas)

- **Costo de lecturas de Firestore (sección 2):** cualquier indicador
  que un panel muestre en tiempo real debe salir de un agregado con
  `increment()`, nunca de un `getDocs()` sin filtro sobre una colección
  completa. La descarga puntual a Excel es la única excepción (acción
  explícita de un botón, no un listener).
- **"Editar pierde un dato que captura nueva no necesita" (sección
  24.1):** antes de tocar `editRecord()`, revisa si el campo pasa por
  una función pensada para captura NUEVA (`poblarPlacasDisponibles()` y
  similares) — si sí, verifica que el valor original del ticket
  sobreviva esa llamada.
- **Series de tiempo — nunca rellenar huecos con 0 (sección 24.2):** un
  día sin registro es ausencia de dato, no un cero real, para cualquier
  regresión/promedio/estadística sobre fechas.
- **Normalizar antes de comparar contra catálogo (sección 24.3):**
  cualquier comparación nueva contra `RANGOS_ACOPIO` (o similar) pasa
  primero por `normalizarRango()`.
- **Causa raíz, no parche al síntoma (sección 30.2):** al encontrar la
  función que causa un bug, `grep` de TODOS sus call sites antes de
  darlo por cerrado — un archivo de +9,000 líneas casi siempre tiene más
  de una puerta de entrada al mismo mecanismo.
- **Alcance completo desde la primera entrega (sección 30.3):** si un
  mecanismo/patrón de bug se repite en otra parte de la app que no se
  mencionó explícitamente, corregirlo también (o decir explícito por qué
  no), no esperar a que Jesús lo encuentre y lo vuelva a pedir.
- **No asumir que algo existe (o no existe) solo por lo que dice la
  bitácora (sección 30.4, y el caso real de la sección 35):** verificar
  contra `index.html` real con `grep` antes de programar. Pasó al revés
  también: la bitácora afirmó que modo nocturno ya existía y era falso.
  **Aplica igual en la dirección contraria (sección 47): afirmar que
  algo "no se ha construido todavía" sin haber hecho ese mismo `grep`
  es el mismo error con el signo cambiado** — pasó con el fix de
  lecturas masivas de Firestore (sección 10.3), ya construido desde
  15-jul, declarado por error como pendiente en la sección 46.
- **Verificación de sintaxis obligatoria antes de entregar (secciones
  24.4/30.5):** `node --check` sobre el módulo y los `<script>` normales
  + `grep` de IDs duplicados, siempre, incluso para cambios triviales.
  Nunca editar directo en `/mnt/user-data/uploads/` (solo lectura).
- **Arquitectura de 3 bloques `<script>` con reglas de scope distintas
  (sección 30.1):** ubicar en qué bloque vive una función (`grep` de su
  definición) antes de moverla o de llamarla "a secas" desde un lugar
  nuevo. **Caso real que costó una sesión completa (sección 44):** esto
  aplica IGUAL a llamadas directas a funciones de Firestore
  (`deleteDoc`, `updateDoc`, `getDoc`, etc.), no solo a funciones propias
  de la app — un `deleteDoc(doc(...))` copiado/escrito directo en un
  `<script>` normal (no-módulo) compila sin error, se ve idéntico a una
  llamada válida, y solo truena en tiempo de ejecución con "X is not
  defined". Antes de escribir o tocar CUALQUIER llamada a una función
  importada de Firebase (`collection`, `doc`, `getDoc`, `getDocs`,
  `addDoc`, `updateDoc`, `deleteDoc`, `setDoc`, `query`, `where`, etc.)
  fuera del `<script type="module">`, verificar que exista su puente
  `window.dbFilaBascula*` (u otro) — si no existe, crearlo, no asumir
  que "ya debe estar" solo porque otras llamadas parecidas si funcionan.

---

## 0.6 — Protocolo de ID de sesión (obligatorio desde 26-jul-2026)

**Por qué existe esto:** el 26-jul-2026 se descubrió que trabajo hecho
en una sesión (vía GitHub directo, fuera de este canal) se perdió al
sobrescribirlo desde otra sesión que partió de una copia distinta
(Google Drive) sin saber que existía (ver sección 63). Para que esto no
se repita, y para que Jesús pueda rastrear qué IA/sesión hizo qué
cambio, toda sesión que edite `index.html`, `INSTRUCCIONESAPP.md`,
`sw.js` o `manifest.json` en este repo debe seguir esto:

1. **Al iniciar la sesión**, elegir un ID propio con el formato
   `[Modelo]-[YYYYMMDD]-[letra]` — por ejemplo `Sonnet5-20260726-A`. La
   letra sirve para distinguir dos sesiones del mismo modelo el mismo
   día (si la sesión A ya se usó ese día, la siguiente es B, etc.). El
   modelo se identifica con su propio nombre real (el que aparezca en
   sus instrucciones de sistema o el que el usuario le indique), no con
   "Claude" genérico.
2. **Al hacer cualquier cambio de código o de bitácora**, la entrada
   correspondiente en la sección cronológica (## N. fecha — ...) debe
   empezar su primer párrafo con `**Sesión:** [ID]`.
3. **Antes de sobrescribir un archivo completo** (subir una versión
   nueva de `index.html` o `INSTRUCCIONESAPP.md`), si es técnicamente
   posible, comparar contra la versión actual del repo (no solo confiar
   en una copia local/de Drive/de otra fuente) para detectar si hubo
   cambios de otra sesión que no se conocían. Si no es posible comparar,
   decirlo explícitamente en la entrega ("no pude verificar contra el
   repo actual, verificar antes de subir") en vez de asumir que la copia
   de partida era la más reciente.
4. **Esta sesión actual se identifica como `Sonnet5-20260726-A`** (Claude
   Sonnet 5, trabajando directo contra el repo de GitHub por instrucción
   de Jesús a partir de esta fecha — ya no se usa Drive para este
   proyecto).

---

## 0.7 — Marco de trabajo "Obeya": equipo virtual multidisciplinario (obligatorio desde 26-jul-2026)

**Instrucción de Jesús (26-jul-2026):** que cualquier sesión que lea
esta bitácora razone las decisiones de peso como si fuera una **junta
tipo Obeya** (el "cuarto grande" de Lean, donde los responsables de
cada frente se sientan juntos con la información visible y deciden
rápido, en vez de que cada área decida por su lado y se descubran los
choques después) — con dos alas de expertise sentadas en esa misma
sala, más un facilitador que pone la disciplina:

**Ala de Obra (Rompeolas Oriente, construcción marítima):**
- **Director de Obra / Superintendente de Construcción** — secuencia
  constructiva real del rompeolas (núcleo → secundarias → coraza →
  berma → berma de apoyo, por cuerpo), qué es físicamente posible en
  campo.
- **Jefe de Logística de Acarreos** — flujos de camión, bancos,
  báscula, ciclos, cuellos de botella reales de patio/frente de obra.
- **Dirección Ejecutiva/Financiera** — impacto en costo, en avance
  contractual, en lo que se reporta a dirección o al cliente.
- **Seguridad e Higiene** — cuando el cambio toca flujo de camiones,
  básculas, o algo que un capturista opera en campo.
- **Asesor Lean Construction (FARO)** — desperdicio del LADO FÍSICO de
  la obra (esperas de camión, retrabajo de captura, sobreinventario en
  patio).

**Ala de Software:**
- **Arquitecto/Dev Lead** — decisiones de diseño sobre `index.html`
  (monolito vanilla JS), estructura de Firestore, deuda técnica.
- **QA** — casos borde, qué se rompe si esto se usa mal o a medias.
- **Seguridad** — `firestore.rules`, permisos por rol, exposición de
  datos entre capturista/coordinador/admin/master.
- **DBA / Integridad de datos** — consistencia de agregados
  (`resumenes/*`), migraciones, qué pasa si dos escrituras chocan.
- **UX de campo** — que la pantalla se pueda usar con una mano, con
  sol, con guantes, con señal intermitente — no UX de escritorio.

**Facilitador — Master Black Belt Lean Six Sigma:** no aporta una
disciplina más a la lista — dirige la junta. Su directiva explícita es
cazar **desperdicio de pensamiento y retrabajo** en las OCHO formas
clásicas (DOWNTIME: Defectos, sobreproducción, Espera, No-uso de
talento, Transporte, Inventario, Movimiento, Exceso de procesamiento),
aplicadas tanto al lado de obra como al de software. Dos ejemplos ya
vividos en este proyecto que el Master Black Belt debe señalar como
lo que son:
- El incidente Drive/GitHub (sección 63) = **retrabajo puro** (mismo
  bug, corregido dos veces, con pérdida de trabajo de por medio) por
  no verificar la fuente antes de sobrescribir.
- Repetir código de auditoría en secciones nuevas en vez de consolidar
  en 0.5 (regla que ya existe ahí) = **exceso de procesamiento**.

**Cómo se usa esto en la práctica (para que la junta misma no se
vuelva el desperdicio):**
1. **No se convoca a todo el comité para cada tarea trivial.** Antes de
   simular la junta, la sesión se pregunta: "¿qué rol(es) de esta lista
   tendría algo real que decir aquí?" — y responde solo con esos, 1-3
   líneas de aporte concreto cada uno, no relleno de personaje. Si la
   respuesta es "ninguno, es una corrección de sintaxis", no se convoca
   nada.
2. Se convoca la junta completa (o la mayoría del ala relevante) para:
   cambios de arquitectura, bugs con impacto financiero o de avance de
   obra, features nuevas que toquen flujo de camión/báscula, o cuando
   Jesús lo pida explícitamente.
3. Formato mínimo cuando sí aplica: **(a)** la decisión o el problema en
   una línea, **(b)** 2-4 aportes de rol, cortos y concretos, **(c)** la
   directiva del Master Black Belt (qué desperdicio se evita decidiendo
   así), **(d)** la decisión final.
4. **Nota de Claude, sin filtro (mismo criterio que la sección 0.5):**
   el riesgo real de este marco es que se vuelva teatro — diez
   personajes opinando en abstracto sin decir nada que un solo párrafo
   directo no dijera igual. Si una sesión se encuentra escribiendo
   "aportes" genéricos solo para llenar el formato, eso ES el
   desperdicio de pensamiento que el Master Black Belt debería estar
   cazando — se corta, y se responde directo. Este marco es una
   herramienta de priorización y de no dejar un ángulo importante fuera
   (ej. no proponer un cambio de flujo de báscula sin que alguien con
   cabeza de "Seguridad" o de "Logística de Acarreos" lo mire primero),
   no una capa de narrativa obligatoria sobre cada respuesta.

---

## 1. Roles reales del sistema (verificado en `index.html`, línea ~465)

El PDF original hablaba de un solo rol `MASTER` en mayúsculas. **Eso no
existe en el código.** El sistema real tiene 5 roles, todos en
**minúsculas**, definidos así:

```js
const rol = currentUserDoc.rol || 'capturista';
const esMaster        = rol === 'master';
const esAdmin         = rol === 'admin';
const esCoordinador   = rol === 'coordinador';
const esVisor         = rol === 'visor';
const esCapturista    = rol === 'capturista';
```

| Rol           | Función en la app hoy                                   | Rol en el módulo Six Sigma |
|---------------|-----------------------------------------------------------|------------------------------|
| `capturista`  | Da de alta tickets en báscula.                            | Genera los datos crudos (Bloque A, B.2, B.3). |
| `coordinador` | Supervisión de campo.                                     | Sin acceso al panel 6 Sigma por ahora (a confirmar con Jesús si se necesita). |
| `admin`       | Administración de usuarios (solo puede tocar capturistas). | Sin acceso al panel 6 Sigma por ahora. |
| `visor`       | Solo lectura de reportes generales.                        | Sin acceso al panel 6 Sigma. |
| `master`      | Rol máximo, ya usado en varias partes de la app.           | **Único rol con acceso al panel "6 Sigma" (Bloque B.1).** |

### 1.1 Correcciones aplicadas respecto al `SIXSIGMA.pdf` original

1. **Rol:** toda condición de acceso al panel Black Belt debe escribirse
   `rol === 'master'` (minúsculas), nunca `'MASTER'`. El PDF original
   tenía esto mal.
2. **Ciclo de pesaje real:** el PDF asumía 4 timestamps nuevos
   (`t1_fila_ts` a `t4_destare_ts`) como si sustituyeran o extendieran
   el flujo de captura actual. En realidad `index.html` ya maneja un
   ciclo de **2 pesajes** (`fecha1`/`hora1` = primer pesaje/entrada,
   `fecha2`/`hora2` = segundo pesaje/tara, ver `getFormData()` línea
   ~3523) y un estado `status: 'pendiente' | 'completo'` para viajes con
   solo el primer pesaje capturado. El Bloque B.2 (fila de báscula) **no
   sustituye esto** — es una pantalla nueva y adicional para medir el
   tiempo de espera ANTES del primer pesaje, que hoy no se mide en
   ningún lado.
3. **Ya existe un sistema de agregados con `increment()`:** la app
   mantiene `resumenes/{año-mes}` y `resumenes/avance_acopio`,
   actualizados con `increment()` en cada alta/edición/baja
   (`aplicarResumen()`, `aplicarAgregadoAvanceAcopio()`,
   `moverResumen()`, `moverAgregadoAvanceAcopio()`). El panel 6 Sigma
   (Bloque B.1) **debe seguir el mismo patrón** para cualquier métrica
   agregada que necesite consultarse seguido (evitar repetir el
   incidente de la sección 2 más abajo).
4. **Ya existe la librería SheetJS/XLSX** integrada y en uso
   (`XLSX.utils.json_to_sheet`, `XLSX.writeFile`, ver `index.html` línea
   ~5794, función de exportación de la pestaña Reportes). El Bloque B.1
   reutiliza esta misma dependencia, no hay que agregar nada al CDN.
5. **Hay TRES puntos distintos donde un ticket llega a Firestore**, no
   uno solo, y los tres deben tocarse para que Bloque A y Bloque B.3 no
   tengan huecos:
   - Guardado normal en línea — función principal de guardar, rama
     `if (!window._editFid)` para alta y rama `else` para edición
     (`index.html` líneas ~1216 y ~1232).
   - Cola offline (`procesarColaOffline()`, líneas ~1130–1146) — cuando
     el capturista guarda sin señal en campo (algo frecuente en obra
     marítima) y el registro se sube después al recuperar conexión.
   - Migración histórica de `localStorage` (`migrarLocalStorage()`,
     línea ~1637) — caso único, de una sola vez, para datos viejos. No
     necesita métricas de tiempo de captura (no tiene sentido medir
     duración de algo ya migrado), pero si se le agrega
     `ediciones_contador` a los documentos nuevos, aquí también debe
     inicializarse en `0` para no romper el resumen de First Pass Yield.

---

## 2. Lección aprendida de `BOT.MD` que aplica directo aquí (léela antes de programar)

En `BOT.MD` sección 14 quedó documentado un incidente real: la app se
quedó sin cupo de lecturas gratis de Firestore (50,000/día) porque un
listener traía hasta 9,500 documentos completos cada vez que alguien
abría la app. **Ese mismo error es fácil de repetir con Six Sigma** si
el panel del Master (Bloque B.1) hace `getDocs()` sobre toda la
colección `stats_analisis` sin filtro para calcular Cp/Cpk o R&R.

**Regla para este proyecto:** cualquier indicador que el panel 6 Sigma
muestre en pantalla en tiempo real (no la descarga puntual a Excel) debe
salir de un documento agregado con `increment()`, igual que ya hace
`resumenes/avance_acopio`. La descarga a Excel para Minitab (que sí
necesita el detalle fila por fila, no se puede agregar) se trata como
una acción explícita y puntual del Master —un botón, no un listener—
para que el costo de lectura sea previsible y ocurra solo cuando
alguien realmente lo pide.

---

## 3. Contexto de negocio y operación

La aplicación controla la logística y el suministro de material pétreo
para la obra marítima Rompeolas Oriente en Veracruz, México. El flujo
actual procesa entre 80 y 150 viajes diarios de camiones tipo volteo,
moviendo materiales clasificados en catálogo fijo (NÚCLEO, SECUNDARIA 1,
SECUNDARIA 2, BERMA, BERMA DE APOYO, CORAZA, REZAGA) desde bancos
autorizados hacia frentes de colocación específicos (Cuerpos 1 a 5,
Morro y Muro).

El cuello de botella identificado es el procesamiento administrativo de
datos: un tiempo de ciclo medio estimado de 7.25 horas diarias por
auxiliar, del cual ~72.4% se atribuye a Desperdicio de Sobreprocesamiento
(Muda). **Nota:** esta cifra viene del análisis original en papel del
Black Belt, no de datos capturados por el sistema todavía — justamente
el objetivo del Bloque A es dejar de depender de una estimación y medir
esto con datos reales.

---

## 4. Estructura de datos de la nueva colección `stats_analisis`

Se crea una colección **independiente** de `acarreos`, para no
contaminar la colección productiva ni arriesgar los índices ya
existentes que usa el bot de Telegram (ver `BOT.MD` secciones 7, 11 y
12 — varios de esos índices dependen de la forma exacta de los
documentos de `acarreos`).

| Campo                  | Tipo       | Propósito Six Sigma                                                   |
|-------------------------|------------|-------------------------------------------------------------------------|
| `id_ticket`             | String     | Llave relacional con el documento de `acarreos` (el `_fid`), para auditoría cruzada. |
| `capturista_id`         | String     | `currentUser.uid` del operador — variable "Operador" del estudio R&R. |
| `captura_inicio_ts`     | Timestamp  | `Date.now()` al primer `focus`/interacción con un campo clave del formulario. |
| `captura_fin_ts`        | Timestamp  | `Date.now()` al confirmarse el guardado exitoso en Firestore. |
| `duracion_captura_seg`  | Number     | Métrica primaria (Y): `Math.floor((fin - inicio) / 1000)`. |
| `t1_fila_ts`             | Timestamp  | Llegada del camión a la fila de báscula (módulo nuevo "Fila Báscula", Bloque B.2). |
| `t2_bruto_ts`            | Timestamp  | Hora del pesaje inicial — puede tomarse de `fecha1`+`hora1` ya existentes, no se duplica captura manual. |
| `t3_salida_ts`           | Timestamp  | Salida de báscula hacia el frente de tiro (nuevo, Bloque B.2). |
| `t4_destare_ts`          | Timestamp  | Segundo pesaje/tara — puede tomarse de `fecha2`+`hora2` ya existentes. |
| `ediciones_contador`     | Number     | Contador incremental de modificaciones post-guardado. Alimenta First Pass Yield. |

**Aclaración importante sobre `t2` y `t4`:** como el ciclo de pesaje ya
existe en `acarreos` (`fecha1`/`hora1`, `fecha2`/`hora2`), **no se le
pide al capturista que teclee esos dos tiempos otra vez**. Se copian del
mismo payload que ya arma `getFormData()` al momento de escribir en
`stats_analisis`, así el capturista solo interactúa con los campos
nuevos de verdad: `t1_fila_ts` (pantalla "Fila Báscula") y `t3_salida_ts`
(evento a definir — ver pendiente en Bloque B.2).

---

## 5. Bloques de trabajo

### Bloque A — Reloj de captura no invasivo

**Objetivo:** medir cuánto le toma al capturista llenar y guardar un
ticket, sin agregar clics.

**Mecanismo:**
1. ✅ **Decidido con Jesús (13/07/2026):** el campo disparador es
   `f-fecha1` (fecha del 1er pesaje) — es el primer campo del formulario y
   no se auto-rellena con JS, así que el primer `focus` real del capturista
   cae ahí en la práctica. Variable en memoria `tiempoInicioFormulario`,
   asignada con `Date.now()` en el primer evento `focus` sobre
   `#f-fecha1`.
2. Al ejecutarse exitosamente el `addDoc()`/`updateDoc()` de un ticket
   (en **cualquiera** de los 3 puntos de guardado descritos en la
   sección 1.1, punto 5), se calcula
   `Math.floor((Date.now() - tiempoInicioFormulario) / 1000)` y se
   escribe en paralelo (no bloqueante) a `stats_analisis`.
3. **Caso offline:** si el ticket se guarda en la cola local
   (`saveToOutbox`), el reloj ya corrió en el dispositivo, así que
   `duracion_captura_seg` se calcula y se guarda igual **en el momento
   del guardado local**, no cuando se sincroniza — de lo contrario el
   tiempo incluiría las horas que el celular estuvo sin señal, lo cual
   invalidaría la métrica.

**Estado:** pendiente de construir. No requiere cambios de UI visibles
para el capturista.

### Bloque B.1 — Panel "6 Sigma" para el rol `master`

**Objetivo:** consola de analítica restringida al rol `master` (ver
sección 1), con indicadores en tiempo real vía agregados (sección 2) y
descarga puntual a Excel con formato listo para Minitab (columnas
numéricas, sin texto que requiera limpieza).

**Diseño:**
- Pestaña/sección nueva, renderizado condicionado a `esMaster` (variable
  ya existente en `index.html`, línea ~467 — reutilizar, no inventar
  una nueva condición).
- Indicadores en pantalla: salen de un documento agregado
  `resumenes/stats_analisis` (o similar, a definir nombre exacto),
  actualizado con `increment()` cada vez que se escribe en
  `stats_analisis`, mismo patrón que `aplicarResumen()`.
- Botón de descarga: usa `XLSX.utils.json_to_sheet` +
  `XLSX.writeFile` (ya integrado, ver sección 1.1 punto 4) sobre una
  consulta puntual y acotada (por rango de fecha, no "todo el
  histórico" sin filtro — mismo cuidado que ya aprendió el bot con
  ACARREOS "Todo el tiempo", ver `BOT.MD` sección 17).

**Estado:** pendiente de construir. Depende de que Bloque A y B.3 ya
estén generando datos — no tiene caso construir el panel antes de tener
qué mostrar.

### Bloque B.2 — Tracking de ciclo logístico parcial (fila de báscula)

**Objetivo:** aislar el tiempo de espera en fila (antes invisible para el
sistema) del tiempo de operación de pesaje y traslado.

**✅ Hecho — v1 el 13/07/2026, rediseñado a v2 el 16/07/2026** (ver
sección 9 para el detalle día por día). Diseño real que quedó en
producción (v2, reemplaza por completo lo que decía este bloque antes):

- Pantalla "Fila Báscula": **Tipo de camión** (Volteo/Góndola/
  Articulado — Góndola y Articulado piden 2 placas, frontal y trasera,
  que se guardan combinadas en un solo campo `placas` separadas por
  `" / "`), Placas, Económico (opcional — si se deja vacío, modal
  "Llenar económico" / "Dejar sin número" → `"S/N"`).
- El camión pasa **2 veces** por la fila por cada viaje completo (una
  cargado para el bruto, otra vacío para el tara/destare) — son **2
  timestamps de entrada y 2 de salida**, no 1 de cada uno como se
  pensaba originalmente:
  - `t1_fila_ts` (1a entrada) → botón "Registrar Entrada a fila".
  - `t3_salida_ts` (1a salida, hacia el frente) → botón "Salida hacia
    frente" en la lista "En tránsito".
  - `t1b_fila_ts` (2a entrada, de regreso vacío) → botón verde "🟢 Entra
    a fila" en el buscador "Esperando destare".
  - `t3b_salida_ts` (2a salida) → botón amarillo "🟡 Sale de fila", **en
    el mismo buscador. Obligatorio** antes de poder capturar el 2do
    pesaje del ticket (`saveRecord()` lo valida y bloquea si falta).
  - `t2_bruto_ts` y `t4_destare_ts` se toman de `fecha1`/`hora1` y
    `fecha2`/`hora2` del ticket, como estaba planeado.
- **Liga por ID, no por texto:** en Captura, el campo "Tipo de camión" se
  movió al inicio de "Identificación" y "Placas" pasó de texto libre a
  un `<select>` que solo muestra camiones de `fila_bascula` con
  `t3_salida_ts` puesto, `cerrado:false` y `id_ticket` vacío (1 lectura
  acotada por `tipo_camion`, sin listener). Al elegir una placa, el
  económico se autorellena y el ticket guarda `fila_bascula_id`. Ya NO
  existe fallback de placa manual — si el camión no pasó por Fila
  Báscula, Captura lo bloquea (decisión de Jesús, 16/07/2026).
  - **Bug corregido 16/07/2026:** el desplegable de Placas solo se
    llenaba al cambiar el select de Tipo de camión (`onchange`), no al
    volver a la pantalla — si ya estaba seleccionado y la salida se
    registraba después, la lista quedaba congelada. Se agregó refresco
    automático al entrar a la pestaña de Captura + link manual "🔄
    refrescar".
- Al guardar el ticket (`saveRecord()`), `procesarFilaBasculaDeTicket()`
  liga (`id_ticket`+`boleta`) el documento de `fila_bascula` por su ID
  exacto — ya no se adivina por placas/económico. Si el ticket queda
  completo (no pendiente), también lo cierra (`cerrado:true`) y copia
  los 4 tiempos a `stats_analisis`.

Cálculos resultantes (los 3 que sí tienen sentido con el ciclo real):
- Espera en fila (bruto): `t2 - t1`
- Tiempo en el viaje (ir a descargar y volver): `t1b - t3`
- Espera en fila (tara): `t4 - t1b`

**Colección `fila_bascula`** — campos reales: `tipo_camion`, `placas`,
`economico`, `t1_fila_ts`, `t3_salida_ts`, `t1b_fila_ts`,
`t3b_salida_ts`, `id_ticket`, `boleta`, `cerrado`, `creadoPor`.

### Bloque B.3 — Control de retrabajo (First Pass Yield)

**Objetivo:** cuantificar la tasa de errores de transcripción humana.

**✅ Hecho 13/07/2026.** `ediciones_contador` en los 3 puntos de guardado
de `acarreos` (creación = 0, edición = `increment(1)`, migración = 0). El
panel B.1 lo usa de forma aproximada (`capturas_editadas_eventos` en el
agregado `resumenes/stats_analisis`, cuenta EVENTOS de edición, no
tickets únicos editados — documentado así a propósito, evita tener que
leer la colección completa).

---

### Bloque B.2 v3 — Pokayokes del flujo de captura (18-jul-2026)

Correcciones y refuerzos pedidos por Jesús tras usar la app en campo con
varios capturistas simultáneos. Todo lo de esta sección **ya está
implementado**, sobre el diseño v2 de Fila Báscula (2 pasadas por
báscula, liga por ID) descrito arriba.

**1) Hora del 1er pesaje: vuelve a ser manual.** La FECHA sigue
automática (viene de `t1_fila_ts`, cuándo se formó el camión en fila),
pero la HORA ahora se escribe a mano, tal como la imprime el ticket
físico que da el operador de báscula — es el dato real de cuánto tarda
el pesaje, y no coincide con ningún timestamp que la app pueda inferir
sola. Con esto quedan 3 tiempos con fuente clara:
- Espera en fila = hora del ticket de báscula − `t1_fila_ts` (entrada a fila)
- Tiempo pesándose = `t3_salida_ts` ("Sale a tiro") − hora del ticket de báscula

**2) Cronómetro de captura (Bloque A) movido a "Tipo de camión".**
`marcarInicioCaptura()` ya no arranca al elegir placa — arranca al elegir
Tipo de camión, porque ahora es el PRIMER campo del formulario (ver
punto 4).

**3) Reordenado el formulario de Captura.** Antes: Pesajes → Material y
Destino → Identificación → Pesos. Ahora: **Identificación** (Tipo de
camión primero, luego Placas/Económico) → **Material y Destino** →
**Pesajes** (fecha auto + hora manual) → **Pesos** (bruto). Coincide con
el flujo real: primero se sabe qué camión es, después qué trae y a
dónde va, al final se pesa.

**4) Registro de flota (`flota/{placas}`) — nueva colección.** Guarda
`{ economico, tipo_camion, actualizadoPor, actualizadoTs }` por placa.
Se usa en `registrarEntradaFila()`:
- Si la placa ya existe en `flota`, su económico se usa SIEMPRE
  automáticamente — ya no se vuelve a preguntar ni se confía en lo que
  se teclee cada vez en Fila Báscula.
- Si es placa nueva: se sigue el flujo normal (campo vacío → modal
  "Llenar económico"/"Dejar sin número"), y al guardar se registra en
  `flota` para las próximas veces.
- **Pokayoke real:** para VOLTEO (no aplica a Góndola/Articulado, que
  todavía no tienen económicos propios y repiten "S/N"), antes de
  guardar un económico nuevo se busca si ya pertenece a OTRA placa
  (`dbFlotaBuscarPorEconomico`) — si sí, se bloquea con alerta indicando
  a qué placa pertenece. Esto es justo lo que faltaba: Jesús detectó 2
  volteos distintos con el mismo económico registrados el mismo día.
- En Captura, el desplegable de Placas ya NO muestra el económico en el
  texto (antes decía "AAA111 · 11") — solo la placa. El económico se
  sigue autorellenando aparte, en su propio campo.

**5) Candado contra doble reserva.** Si dos capturistas abren Captura
casi al mismo tiempo, ambos podían ver la misma placa disponible en el
desplegable. Ahora, justo antes de crear el ticket, `saveRecord()`
vuelve a leer el documento de `fila_bascula` por su ID exacto y confirma
que `id_ticket` siga vacío — si alguien más ya la reservó, bloquea con
un mensaje claro pidiendo refrescar Placas.

**6) Visibilidad por capturista en Fila Báscula.** Antes, "Camiones con
Material" y "Camiones Destare" mostraban TODOS los camiones a TODOS los
capturistas — riesgo real con varias básculas: un capturista podía
darle "Sale a tiro" o "Destarado" sin querer a un camión que no era el
suyo. Ahora: **capturista solo ve los camiones que él mismo registró**
(`creadoPor == su uid`); admin, coordinador y master siguen viendo todo.
Filtro aplicado del lado del cliente (mismo criterio de seguridad que ya
usa el resto de la app — reglas de Firestore siguen permitiendo lectura
a cualquier `estaAutorizado()`, esto es una ayuda operativa contra
errores, no una restricción de confidencialidad).

**7) Bug de zona horaria corregido.** `combinarFechaHora()` no forzaba
huso horario — con celulares mal configurados, los cálculos de espera en
fila podían salir mal. Se forzó el offset `-06:00` (CDMX, sin horario de
verano desde 2022).

**8) Cola offline: cierre de báscula se agregó ahí también.** Antes,
completar un destare sin señal subía el ticket al reconectar pero nunca
cerraba `fila_bascula` ni escribía a `stats_analisis`. Ya se agregó en
ambas ramas (CREATE y UPDATE) de `procesarColaOffline()`, con cuidado de
no cerrar el ciclo si el ticket quedó en estado `'conflicto'` (boleta
duplicada) en vez de `'completo'`.

**Pendiente real, no resuelto todavía:** si una placa ya registrada en
`flota` tiene el económico MAL capturado desde el principio, hoy no hay
forma de corregirlo desde la app (ni siquiera coordinador/master) — se
tendría que editar directo en Firestore Console. Preguntar a Jesús si
vale la pena un botón de corrección en Admin para esto.

---

## 6. Arquitectura de seguridad — Reglas de Firestore

**✅ Resuelto 18-jul-2026.** El borrador original de este archivo (más
abajo, tachado por referencia histórica) asumía Custom Claims
(`request.auth.token.role`), copiando el supuesto del `SIXSIGMA.pdf`
original. **Se verificó contra `firestore.rules` real del proyecto:
no existe una sola referencia a `token.role`, `customClaims` ni
`setCustomUserClaims` en todo el proyecto** (ni en `index.html` ni en
`firestore.rules`). El proyecto SIEMPRE validó rol con lectura de
documento, nunca con Custom Claims — el patrón ya en producción es:

```
function miPerfil() {
  return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data;
}
function estaAutorizado() {
  return request.auth != null
    && exists(/databases/$(database)/documents/usuarios/$(request.auth.uid))
    && miPerfil().status == 'autorizado';
}
function rol() { return miPerfil().rol; }
function esMaster() { return estaAutorizado() && rol() == 'master'; }
function puedeCapturar() {
  return estaAutorizado() && rol() in ['capturista', 'coordinador', 'admin', 'master'];
}
```

Y las reglas reales de `fila_bascula`, `stats_analisis` y `flota` (ya
implementadas en `firestore.rules`, sección "Six Sigma Bloques B.1/B.2")
usan exactamente estas funciones — `puedeCapturar()` para crear/editar,
`esMaster()` para borrar y para la descarga a Excel. **No hace falta
tocar ni una línea**, el diseño original de esta sección (con
`request.auth.token.role`, más abajo) nunca se implementó así y quedaba
obsoleto.

<details>
<summary>Borrador original (obsoleto, se conserva solo como referencia histórica de la duda que existía)</summary>

Corrigiendo el rol (sección 1.1, punto 1):

```
match /stats_analisis/{documento} {
  allow create: if request.auth != null && request.auth.token.role == 'capturista';
  allow read, update, delete: if request.auth != null && request.auth.token.role == 'master';
}
```

~~Pendiente de confirmar: el proyecto usa hoy el campo `rol` dentro
del documento del usuario en Firestore (ver sección 1, `currentUserDoc.rol`),
no queda claro en el código revisado si también existen Custom Claims
(`request.auth.token.role`) configurados en paralelo.~~ — confirmado
18-jul-2026: no existen, ver arriba.

</details>

---

## 7. Checklist general (arrancar por aquí en la próxima sesión)

- [x] Confirmar con Jesús el campo exacto que dispara
      `tiempoInicioFormulario` en Bloque A — **resuelto 13/07/2026:
      `f-fecha1`** (ver sección 5, Bloque A).
- [x] Decidir el evento que dispara `t3_salida_ts` en Bloque B.2 —
      **resuelto 13/07/2026: botón nuevo "Salida hacia frente"** en la
      pantalla Fila Báscula, con colección auxiliar `fila_bascula` (ver
      sección 5, Bloque B.2).
- [x] Confirmar si existen Custom Claims de Firebase Auth o si las
      reglas deben validarse por lectura de documento (sección 6). —
      **resuelto 18-jul-2026: no existen Custom Claims en el proyecto**
      (verificado por `grep` en `index.html` y `firestore.rules`, cero
      coincidencias de `token.role`/`customClaims`). Las reglas reales
      ya usan lectura de documento (`miPerfil()`/`rol()`/`esMaster()`/
      `puedeCapturar()`), consistente con el resto de la app.
- [x] Implementar Bloque B.3 primero (el más simple, sin dependencias
      de diseño pendiente) como prueba del patrón de escritura paralela
      a `stats_analisis`. **Hecho: `ediciones_contador` ya está en los
      3 puntos de guardado (creación=0, edición=increment(1), migración=0).**
- [x] Implementar Bloque A. **Hecho 13/07/2026:** `marcarInicioCaptura()`
      en el `focus` de `f-fecha1`, `registrarStatsCaptura()` escribe a
      `stats_analisis` en el guardado en línea (con `id_ticket` real) y en
      el guardado offline (duración calculada al momento local, `id_ticket`
      null hasta que sincronice — se cruza por `boleta`). Reset del reloj
      en `clearForm()`.
- [x] Implementar Bloque B.2. **Hecho 13/07/2026:** pestaña "Fila Báscula"
      nueva (colección `fila_bascula`), botón "Registrar Entrada" (t1) y
      lista en vivo con botón "Salida hacia frente" (t3) por vehículo. El
      cierre es automático: `intentarCerrarFilaBascula()` se dispara al
      guardar un ticket que queda `completo` (creación con los 2 pesajes de
      una vez, o edición que completa un pendiente — el caso más común),
      busca por placas/económico un vehículo con t1 y t3 ya capturados, y
      copia los 4 tiempos al documento de `stats_analisis` de ese ticket
      (t2/t4 se calculan de fecha1+hora1 / fecha2+hora2). Todo best-effort,
      sin bloquear el guardado real del ticket.
- [ ] Implementar Bloque B.1 (panel Master), una vez haya datos reales
      de los tres bloques anteriores para mostrar.
- [ ] Escribir las reglas de seguridad definitivas de `stats_analisis`
      en Firebase Console (o `firestore.rules` si el proyecto lo
      maneja como archivo — verificar).
- [ ] Actualizar este archivo al cerrar cada bloque, con fecha, qué se
      tocó y qué quedó pendiente — mismo formato que las entradas de
      `BOT.MD`.

---

## 8. Guía de continuidad para una IA que retome esto

1. Leer las secciones 0 y **0.5** completas antes de escribir una sola
   línea de código. El resto del archivo (secciones 1 en adelante) es
   historial de referencia — se consulta con `grep`/búsqueda según el
   tema que se esté tocando, ya no es lectura obligatoria línea por
   línea en cada sesión (ver el razonamiento completo en la sección 0.5).
2. Revisar también `BOT.MD` sección 0 — aunque es un proyecto distinto,
   comparte la misma base de Firestore y las mismas lecciones de costo
   de lecturas (sección 2 de este archivo).
3. **Nunca** usar `'MASTER'` en mayúsculas para condicionar acceso — el
   rol real es `'master'` (sección 1).
4. Cualquier cambio a `index.html` debe tocar los **tres** puntos de
   guardado de tickets listados en la sección 1.1, punto 5, no solo el
   principal — de lo contrario los tickets creados offline o migrados
   quedarán con datos de Six Sigma incompletos.
5. Antes de agregar cualquier indicador visible en tiempo real en el
   panel del Master, preguntarse: "¿esto lee la colección completa o un
   agregado?" Si es lo primero, rediseñar como agregado con
   `increment()` (sección 2).
6. Actualizar este archivo al cerrar cada cambio, con fecha, qué se
   tocó, qué NO se tocó y por qué — igual disciplina que `BOT.MD`.
7. Una fase/bloque por entrega. No mezclar Bloque A con Bloque B.2 en
   el mismo paso, para poder revertir fácil si algo sale mal.

---

---

## 9. Historial de avance

- **13/07/2026** — Documento reescrito de cero a partir del
  `SIXSIGMA.pdf` original, cotejado línea por línea contra el código
  real de `index__1_.html` (`grep` confirmó que ningún campo del
  módulo existe todavía) y contra la disciplina/lecciones ya
  documentadas en `BOT.MD`. Cambios principales respecto al PDF:
  rol corregido a minúsculas (`master`, no `MASTER`), aclarado que el
  ciclo de 2 pesajes ya existe y B.2 es un módulo adicional (no un
  reemplazo), identificados los 3 puntos reales de guardado de tickets
  en el código, y agregada la sección 2 (lección de cupo de Firestore)
  como regla de diseño obligatoria para el panel del Master. **Todavía
  no se tocó ni una línea de `index.html` — este archivo es solo
  planeación.**

- **13/07/2026 (más tarde, mismo día)** — Resueltos los dos pendientes
  bloqueantes del checklist: (1) el campo que dispara el reloj de
  captura del Bloque A es `f-fecha1`; (2) `t3_salida_ts` del Bloque B.2
  se captura con un botón nuevo "Salida hacia frente" en la pantalla
  Fila Báscula, que requiere una colección auxiliar `fila_bascula` para
  llevar el estado de los vehículos "en tránsito" en báscula. Con esto
  ya no hay pendientes de diseño bloqueantes para empezar a programar.
  **Siguiente paso: implementar Bloque B.3 (contador de ediciones),
  el más simple de los cuatro, como prueba del patrón antes de meterle
  a A y B.2. Todavía no se tocó código.**

- **15/07/2026** — Archivo renombrado de `SIXSIGMA.md` a
  `INSTRUCCIONESAPP.md` por instrucción del dueño del proyecto (evitar
  confusión con el proyecto de certificación Six Sigma independiente).
  Se agregó la sección 10 con una observación nueva de Jesús: los 4
  paneles (Reportes, Suministros, Resumen, Bancos) obligan a leer la
  colección `acarreos` completa por separado con el botón "Ver TODO el
  histórico", sin caché compartido ni persistencia entre sesiones, lo
  que agota rápido el cupo gratis de 50,000 lecturas/día compartido con
  el bot de Telegram. Diagnóstico verificado contra el código real;
  diseño de solución (agregado con `increment()` + caché compartido
  entre paneles) en borrador. **Todavía no se tocó código de
  `index.html` para esto.**

---

## 10. Observación pendiente — Lecturas excesivas por panel (reportada 15/07/2026)

**Reportado por Jesús, textual (ver `OBSERVACIONES_APP_ACARREOS.txt`):**
al entrar a los paneles "Reportes", "Suministros", "Resumen" y "Bancos",
hay que darle clic al botón "Ver todo el histórico" en cada uno por
separado, y cada clic de esos son ~6,000 lecturas. Con 2 usuarios
haciendo esto ya se agota el cupo gratis de 50,000 lecturas/día
(compartido con el bot de Telegram, ver sección 2). Pide que al entrar
se lea automáticamente un resumen actualizado, para gastar 1 lectura al
día en vez de repetir la lectura completa por cada panel y cada usuario.

### 10.1 Diagnóstico verificado contra `index.html`

Confirmado con `grep`/lectura directa, no es solo percepción del
usuario — el código de hoy realmente funciona así:

- Hay **tres cachés independientes en memoria**, uno por panel:
  `dashHistoricoCompleto` (Gráficos), `resumenHistoricoCompleto`
  (Resumen — y **Bancos reutiliza este mismo caché**, ver
  `cargarHistoricoCompletoBancos()` línea ~5982), y
  `reportesHistoricoCompleto` (Reportes). Cada uno se llena con su
  propio botón (`btn-dash-historico`, `btn-resumen-historico`,
  `btn-reportes-historico`), y cada botón dispara
  `traerTodoFirestore(null, null, …)` — una lectura **sin filtro de
  fecha** de TODA la colección `acarreos`, paginada de 1,500 en 1,500
  (línea ~1625).
- Estos cachés viven solo en memoria de la pestaña del navegador: se
  pierden al recargar la página o cerrar sesión. No hay persistencia
  (ni `localStorage`, ni un documento agregado en Firestore), así que
  cada sesión nueva de cada usuario vuelve a pagar el costo completo si
  quiere ver "todo el histórico" en cualquiera de los 4 paneles.
- Sí existe ya una función de conteo previo (`confirmarLecturaCompleta()`,
  línea ~1657, usa `getCountFromServer()`) que avisa cuántos documentos
  se van a leer antes de hacerlo — mitiga el susto pero no reduce el
  gasto real de lecturas.
- El panel de Admin (`cargarPanelAdmin()`, línea ~680) no hace lectura
  masiva de `acarreos`: usa `onSnapshot` sobre la colección de usuarios
  (`COL_USERS`), que es pequeña. El botón que el usuario describe como
  "Leer todo el resumen" del panel de admin no se encontró textual en el
  código — probablemente se refiere de memoria a uno de los botones "Ver
  TODO el histórico" de los otros paneles, o a un botón que ya no existe
  con ese texto exacto. **Pendiente confirmar con Jesús cuál botón es
  exactamente**, para no diagnosticar a ciegas.
- El rol `visor` ya tiene un mecanismo parecido a lo que pide Jesús: en
  vez de botón manual, `startRealtimeSync()` (línea ~821) le carga
  automáticamente los últimos 90 días con una sola lectura puntual al
  entrar, sin necesidad de dar clic. Es la referencia de diseño más
  cercana a lo que se pide en esta sección.

### 10.2 Dirección de solución propuesta (sin construir todavía)

Mismo patrón que ya usa la app y que exige la sección 2 de este archivo
para el panel Six Sigma: **agregado con `increment()`, no lectura
completa repetida**.

1. Definir un documento agregado único, ej. `resumenes/historico_global`
   (o reusar el patrón de `resumenes/{año-mes}` ya existente,
   sección 1.1 punto 3), actualizado con `increment()` en cada
   alta/edición/baja de `acarreos` — igual que ya hace
   `aplicarResumen()`.
2. Al entrar a cualquiera de los 4 paneles (Reportes, Suministros,
   Resumen, Bancos), leer ese único documento agregado automáticamente
   (1 lectura), en vez de exigir que cada panel dispare su propio
   `traerTodoFirestore()` de la colección completa.
3. Compartir el caché en memoria entre los 4 paneles en vez de tener
   tres/cuatro independientes (`dashHistoricoCompleto`,
   `resumenHistoricoCompleto`/Bancos, `reportesHistoricoCompleto`) —
   una sola lectura completa (cuando de verdad se necesite el detalle
   fila por fila, no solo el agregado) sirve para los 4, no se repite
   por panel.
4. El botón "Ver TODO el histórico" no desaparece: sigue disponible para
   cuando alguien necesita el detalle fila por fila (ej. exportar a
   Excel), pero deja de ser la única forma de ver un resumen actualizado
   al entrar.
5. Revisar si conviene bajar el conteo de lecturas del agregado también
   para el bot de Telegram, ya que el cupo de 50,000/día es compartido
   (ver sección 2 y `BOT.MD`).

**Estado:** diagnóstico hecho, diseño en borrador → **implementado
15/07/2026** (ver entrada en sección 9). Pendiente: correr una sola vez el
botón "Recalcular total histórico" en Admin para el respaldo inicial.

### 10.3 Implementado 15/07/2026

1. `aplicarResumen()` ahora escribe el mismo `payload` (mismos
   `increment()`) en dos documentos: `resumenes/{año-mes}` (ya existía) y
   `resumenes/historico_global` (nuevo, sin cortar por mes). Cero cambios
   en los 5 puntos de llamada existentes — se resuelve dentro de la
   función, mismo criterio que ya usa `aplicarAgregadoAvanceAcopio()`.
2. `recalcularHistoricoGlobal()` (nuevo botón en Admin, "Recalcular total
   histórico") — respaldo inicial de una sola lectura completa de
   `acarreos`, mismo patrón que `recalcularResumen()`. **Se debe correr una
   sola vez** para poblar el documento con los datos históricos ya
   existentes; de ahí en adelante `aplicarResumen()` lo mantiene al día.
3. `asegurarHistoricoGlobal(idBanner)` (nuevo) — 1 lectura de
   `resumenes/historico_global` vía el puente ya existente
   `window.leerDocResumen()`, cacheada en `window.historicoGlobalData` (se
   invalida sola cuando `aplicarResumen()` vuelve a escribir). Pinta un
   banner de texto ("📌 Total histórico: N viaje(s) · X ton") en el
   `idBanner` recibido.
4. Se agregó un banner (`banner-historico-global-{graficos,resumen,
   reportes,bancos}`) al inicio de cada uno de los 4 paneles que reportó
   Jesús, y se llamó `asegurarHistoricoGlobal(...)` al inicio de
   `renderDashboard()`, `initResumenTab()`, `initReportesTab()` y
   `initBancosTab()`. Con esto el total de viajes/toneladas aparece solo
   con entrar al panel — 1 lectura, no 6,000 — sin tocar nada de la
   detección de datos ni las tablas de detalle que ya existían (siguen
   usando la ventana reciente por default y "Ver TODO el histórico" sigue
   disponible para el detalle fila por fila, sin cambios).
5. No se tocó el botón "Ver TODO el histórico" ni `traerTodoFirestore()` —
   siguen igual, para cuando de verdad se necesite exportar o filtrar el
   detalle completo.

**Pendiente:** correr `recalcularHistoricoGlobal()` una vez en producción
(botón en Admin) para que el banner deje de mostrar "(pendiente respaldo
inicial)" y refleje el total real acumulado desde el inicio del proyecto.

---

## 11. Observaciones nuevas — 16-jul-2026 (pendientes, capturadas a mitad del rediseño de Fila Báscula v2)

Reportadas por Jesús/Sikot el mismo día en que se estaba construyendo Fila
Báscula v2 (Tipo de camión + placas dinámicas + búsqueda por placas para
la 2da pasada). Se documentan aquí para no perderlas mientras se termina
esa reestructura, en el orden en que llegaron. Ninguna de las 4 está
implementada todavía.

### 11.1 — Botón "Leer todo el resumen" (Admin) no aclara qué hace / no evita las 6,000 lecturas por panel

Jesús reporta que sigue sin quedarle claro qué hace el botón "Leer todo el
resumen" del panel Admin, porque al entrar a Reportes, Suministros,
Resumen o Bancos sigue teniendo que darle "Ver TODO el histórico" en CADA
panel por separado — cada click ahí son ~6,000 lecturas. Con 5 usuarios
usando la app, el cupo gratis de Firestore (50k lecturas/día) se agotaría
con apenas 2 usuarios activos.

Pide: que al entrar a la app se lea automáticamente UN resumen agregado
(ya actualizado) en vez de que cada panel dispare su propio
`traerTodoFirestore()` completo — para que el costo sea ~1 lectura/día +
las nuevas que se vayan agregando, nunca cerca de las 50k.

**Nota de contexto (revisar con Jesús antes de tocar código):** esto es la
MISMA necesidad diagnosticada e —implementada, según la sección 10 de
este archivo— el 15-jul-2026 (`resumenes/historico_global`, banners en
los 4 paneles). Este reporte sugiere que en la práctica el banner no
está resolviendo lo que Jesús necesita, o que sigue usando "Ver TODO el
histórico" por costumbre o por necesitar de verdad el detalle fila por
fila. Falta confirmar en campo: ¿ya aparece el banner de
`historico_global` y es insuficiente (falta más que el total), o el
banner no está apareciendo?

### 11.2 — ✅ IMPLEMENTADO 18-jul-2026 — PDF de Bancos: columnas de Placa y Folio, desglosado por viaje, encabezado de rango de fechas

En el PDF de Bancos, agregar:
- Columna de **Placa**.
- Columna de **Folio**.

(para identificar el camión exacto con su material y rango cargado ese
día — por lo que el PDF pasa de ser un resumen agregado a desglosarse
viaje por viaje).

Desglose de columnas pedido: **Banco, Fecha, Placa, Folio, Material,
Viaje** (con sumatoria total al final), **Tonelada** (con sumatoria total
al final), **Ton/Viaje** — o sea el promedio — (con su propia
sumatoria/promedio al final).

Encabezado del PDF: agregar el **rango de fechas que se está filtrando**
(no la fecha/hora en que se imprimió) — texto tipo: *"Viajes de camiones
del día (fecha inicio) al día (fecha fin)"*.

### 11.3 — ✅ YA ESTABA IMPLEMENTADO (verificado 18-jul-2026) — Placas dobles también para camiones Articulados, con 1 hueco corregido

Agregar la opción de 2 placas (igual que Góndola) a los camiones tipo
**Articulado**.

Encaja directo con el rediseño de Fila Báscula v2 ya en construcción:
cuando se implemente Tipo de camión + placas dinámicas, incluir
ARTICULADO en la misma lógica de doble placa que GONDOLA (VOLTEO se
queda con una sola placa).

### 11.4 — ✅ IMPLEMENTADO 18-jul-2026 — Nuevo botón para Visor y Master: gráfica de tendencia con análisis estadístico R²

Agregar un botón nuevo, visible solo para los roles `visor` y `master`,
que muestre una gráfica de tendencia con análisis estadístico de R²
(regresión / bondad de ajuste). **Ya no está pendiente de aclarar** —
Jesús anexó `TENDENCIA.md` (16-jul-2026) con la especificación completa,
transcrita íntegra a continuación.

#### 11.4.1 — Requisitos de UI/UX

- Nueva sección o ventana modal: **"Análisis de Tendencias / Proyecciones"**.
- Campo numérico **"Objetivo de TON / DÍA"** (ej. 10000) donde el usuario
  fija una meta de capacidad diaria futura.
- Botón de acción **"Generar Análisis"**.
- Panel de resumen comparativo que muestre el porcentaje **R²** y la
  **fecha exacta proyectada en el calendario** para AMBOS modelos de
  regresión (lineal y cuadrático).

#### 11.4.2 — Lógica de agregación y limpieza de datos

- Leer los registros de acarreo existentes y agrupar dinámicamente para
  calcular el **"Tonelaje Total por Día"** (sumatoria de toneladas por
  fecha única).
- Convertir las fechas en un **índice numérico secuencial** (t = 1, 2,
  3…) que represente los días laborables consecutivos — este es el eje X
  de las fórmulas de regresión.

#### 11.4.3 — Procesamiento matemático (algoritmos de regresión)

- **Modelo lineal**: `Y = a + bt`, calculado sobre los datos diarios
  agregados. Calcular y guardar su **R²**.
- **Modelo cuadrático**: `Y = a + bt + ct²`, para capturar la aceleración
  operativa del proyecto. Calcular y guardar su **R²**.
- **Cálculo del objetivo**: despejar `t` en ambas ecuaciones, igualando
  `Y` al "Objetivo de TON/DÍA" capturado por el usuario. Convertir el `t`
  resultante de vuelta a una fecha de calendario real — esa es la fecha
  que se muestra como "se alcanza la meta".

#### 11.4.4 — Visualización (Chart.js, ya instalado en el proyecto)

- Gráfico mixto:
  - Tonelaje histórico real diario → **scatter plot** (puntos azules).
  - Proyección de la regresión lineal → **línea recta** hacia el futuro,
    hasta tocar la intersección con el objetivo.
  - Proyección de la regresión cuadrática → **curva** hacia el futuro.
- Tooltips interactivos al pasar el cursor: fecha calendario, toneladas
  estimadas ese día, y la fórmula matemática activa.

**Decisiones ya confirmadas por Jesús (16-jul-2026):**
- **Día laborable = lunes a viernes.** Los sábados se excluyen del índice
  `t` (solo se trabaja medio jornal, distorsionaría la regresión).
  Domingos tampoco cuentan (no hay operación). Si un día laborable no
  tiene registros, ese día igual ocupa su lugar en la secuencia `t` con
  tonelaje 0 — no se salta, para no romper el espaciado uniforme que
  necesitan las fórmulas de regresión.
- **Fuente de datos: TODO el histórico completo** (vía
  `traerTodoFirestore()`), no una ventana acotada. Nota de costo: esto es
  una lectura completa de la colección `acarreos` cada vez que se le da
  "Generar Análisis" — igual de costosa que "Ver TODO el histórico" (ver
  observación 11.1). Como este botón es de uso ocasional (visor/master
  generando un análisis puntual, no algo que se dispare solo al entrar a
  la app), el costo es aceptable; NO debe convertirse en un listener ni
  dispararse automáticamente al abrir la sección.
- **Si la meta ya se alcanzó**: mostrar cuánto se ha rebasado (ej.
  "Meta superada por 1,240 ton" o el % por encima del objetivo), en vez
  de una fecha proyectada a futuro. Falta definir el texto/formato exacto
  cuando se construya, pero el comportamiento ya está decidido: no se
  muestra una fecha pasada como si fuera una proyección.
- Pendiente todavía sin resolver: qué pasa si el modelo nunca alcanza el
  objetivo (pendiente de la regresión ≤ 0) — no lo cubrieron las 3
  respuestas de Jesús, hay que preguntarlo cuando se construya este punto.

---

**Estado de las 4:** 11.4 ✅ implementada 18-jul-2026, 11.2 ✅ implementada
18-jul-2026, 11.3 ✅ verificada/corregida 18-jul-2026 (ver detalle en la
sección 15). Solo 11.1 sigue en cola.

---

## 15. Detalle de implementación — 11.3 Placas dobles Articulado (18-jul-2026)

**Hallazgo al revisar antes de programar:** esta observación en realidad
**ya estaba resuelta** — cuando se construyó Fila Báscula v2 (la
reestructura que estaba en marcha el mismo 16-jul-2026 en que Jesús
reportó esto), Articulado ya se agregó con el mismo tratamiento que
Góndola:
- El selector de tipo de camión en Fila Báscula ya dice "Articulado (2
  placas)".
- `toggleSegundaPlacaFila()` ya muestra el campo de placa trasera para
  ambos (`GONDOLA` y `ARTICULADO`).
- `registrarEntradaFila()` ya arma `placas` como "frontal / trasera" para
  ambos, con su propio mensaje de validación ("El articulado trae 2
  placas — captura también la trasera.").
- El pokayoke de "no puede haber 2 volteos con el mismo económico" ya
  exime explícitamente a Góndola y Articulado (ninguno de los dos usa
  económico propio todavía).
- Los filtros multiselección de tipo de camión en Resumen y Reportes ya
  incluían la casilla "Articulado" desde antes.

**Lo que SÍ estaba roto y se corrigió ahora:** al revisar todo el código
que distingue por `tipo_camion` (no solo el flujo de captura, sino todo
lo que lo consume después) se encontraron **2 lugares que contaban
"pendientes de destare" por tipo de camión y se olvidaban de
Articulado** — solo sumaban Góndolas y Volteos:
1. El resumen del día en la pestaña "Resumen" (`⏳ Pendientes de
   destare: X góndolas, Y volteos.`).
2. El mismo conteo en el panel de "Reportes".

Un camión Articulado pendiente de destare quedaba invisible en ambos
resúmenes (no se perdía el dato, solo no se contaba en el texto). Se
agregó `pendArticulados` en los dos lugares, con su propio texto
("X articulado(s)") intercalado entre góndolas y volteos.

**No se tocó nada más** — el resto del flujo de Articulado (captura,
validación, pokayoke de económico, filtros) ya estaba completo y
correcto, no requería cambios.

**Verificación antes de entregar:** `grep` de todas las comparaciones
`=== 'GONDOLA'`/`'GONDOLA'` en `index.html` para confirmar que no
quedara ningún otro lugar tratando a Góndola distinto de Articulado sin
razón; sintaxis completa revalidada con `node --check`.

---

## 14. Detalle de implementación — 11.2 PDF de Bancos por viaje (18-jul-2026)

**Qué cambió:** `descargarPdfBancos()` en `index.html` — antes generaba un
PDF agregado (Banco → Material, con viajes/toneladas/promedio por grupo).
Ahora genera un **desglose viaje por viaje**, una fila por ticket, con
las columnas exactas que pidió Jesús: **Banco, Fecha, Placa, Folio,
Material, Viaje, Tonelada, Ton/Viaje**, más una fila final "TOTAL
GENERAL" con la sumatoria de Viaje y Tonelada, y el **promedio real**
(no una suma) en Ton/Viaje.

- La columna "Viaje" vale `1` en cada fila (un ticket = un viaje) — así
  la fila de TOTAL GENERAL suma correctamente el total de viajes, igual
  que ya hacía la tabla agregada anterior.
- "Ton/Viaje" por fila es la misma tonelada del ticket (un viaje ÷ 1
  viaje = esa misma tonelada); donde de verdad aporta información nueva
  es en la fila de TOTAL GENERAL, que sí es el promedio real
  (toneladas totales ÷ viajes totales).
- Filas ordenadas por Banco → Fecha → Placa, para que sea fácil cotejar
  contra el ticket físico o el sindicato.
- **Encabezado con el rango de fechas filtrado** (no la fecha/hora de
  impresión), texto: *"Viajes de camiones del día (fecha) al día
  (fecha)"* — o solo *"del día (fecha)"* si el filtro es un único día.
  Si el usuario dejó "Rango de días" sin capturar Desde/Hasta, el rango
  mostrado se calcula del primer y último `fecha1` realmente presentes
  en los datos filtrados (nunca queda un encabezado vacío o genérico
  tipo "todos los días"). La fecha/hora de generación se sigue
  mostrando, pero como dato secundario, ya no como encabezado principal.
- **Orientación cambiada a horizontal (landscape)**: con las 3 columnas
  nuevas (Placa, Folio, Viaje) el ancho vertical (8.5") se quedaba corto
  sin truncar texto — sobre todo Placa, que en góndola/articulado trae 2
  placas juntas ("ABC-123 / XYZ-456"). No se pidió explícitamente, pero
  era necesario para que la tabla no se viera apretada; si se prefiere
  mantener vertical, es un cambio de una sola línea (`orientation`).

**No se tocó:** la tabla agregada que se ve EN PANTALLA en la pestaña
Bancos (`renderBancosTabla`/`construirJerarquiaBancos`) — Jesús pidió el
desglose específicamente "en el PDF", así que la vista en pantalla se
dejó igual (resumen por Banco/Material, útil para un vistazo rápido);
solo el PDF exportable cambió a detalle por viaje. Los filtros de banco y
periodo (día/semana/mes/rango) siguen siendo exactamente los mismos que
ya existían y se aplican igual al PDF nuevo.

**Verificación antes de entregar:** sintaxis completa de `index.html`
revalidada con `node --check`; confirmado que `descargarPdfBancos` y su
export a `window` quedaron definidos una sola vez (sin duplicados de la
versión anterior).

---

## 13. Detalle de implementación — 11.4 Análisis de Tendencias (18-jul-2026)

**Dónde vive:** pestaña nueva "📈 Tendencia" en el menú lateral (`nd-tendencia`
→ `tab-tendencia`), junto a "6 Sigma". Visible solo para `visor` y `master`
(`visibilidadPorTab.tendencia = esMaster || esVisor`). `initTendenciaTab()`
no dispara ninguna lectura — el análisis solo corre al darle clic a
"Generar Análisis" (mismo criterio de costo que "Ver TODO el histórico",
ver 11.1).

**Decisiones confirmadas por Jesús en esta sesión (18-jul-2026):**
1. Si un modelo nunca cruza la meta con la pendiente actual (lineal con
   pendiente ≤ 0, o cuadrático sin raíz futura real): se muestra **igual
   una fecha**, no un mensaje bloqueante. Como matemáticamente no existe
   una fecha real de cruce en ese caso, se usa un **horizonte de
   referencia de 10 años (~2,600 días laborables)** desde el último día
   real, etiquetado explícitamente como "(referencial)" en la UI — se
   optó por ser transparente en el texto en vez de inventar un número de
   toneladas o una fecha exacta falsa.
2. Solo cuentan viajes con `status === 'completo'` para el tonelaje
   diario (tonelaje real, ya con tara).
3. Vive en pestaña nueva del menú lateral, no en modal.

**Algoritmo implementado** (`tnd_*` en `index.html`):
- `tnd_construirSerie()`: agrupa toneladas por `fecha1`, arma la
  secuencia de días laborables (lunes-viernes) desde el primer hasta el
  último día con datos, con 0 en los días sin registro completo (no se
  salta ninguno, para no romper el espaciado uniforme de la regresión).
- `tnd_regresionLineal()` / `tnd_regresionCuadratica()`: mínimos
  cuadrados clásicos (ecuaciones normales, resueltas con la regla de
  Cramer para el caso cuadrático 3×3), con cálculo de R² (`1 - SSres/SStot`).
- `tnd_resolverLineal()` / `tnd_resolverCuadratico()`: despejan `t` para
  el objetivo capturado por el usuario; si el modelo evaluado en el
  último día real ya iguala o supera el objetivo, marcan "alcanzada" con
  el exceso en toneladas; si no hay pendiente/raíz futura, marcan
  "referencial" (ver decisión #1).
- `tnd_avanzarDiasLaborables()`: convierte el `t` resultante de vuelta a
  fecha calendario, avanzando solo días laborables desde el último día
  real (con tope de seguridad de 20,000 pasos ≈ 77 años, para no colgar
  el navegador en un caso extremo de pendiente casi-cero).
- Gráfico mixto en Chart.js (`chart-tendencia`): scatter de tonelaje real
  + línea de proyección lineal + curva de proyección cuadrática + línea
  punteada del objetivo, con tooltip de fecha/toneladas/modelo.

**Verificación antes de entregar:** se probó el motor de regresión en
aislado (fuera del HTML, con Node) con datos perfectamente lineales y
perfectamente cuadráticos — recupera los coeficientes exactos y R²=1 en
ambos casos — y se probaron los 4 casos de negocio (meta ya alcanzada,
pendiente negativa → referencial, cuadrático con raíz futura válida,
cuadrático sin cruce → referencial) y la construcción de la serie diaria
(relleno correcto de días laborables sin datos con 0, fines de semana
excluidos). Sintaxis completa de `index.html` revalidada con
`node --check` después de insertar el bloque.

**No se tocó:** ninguna otra pestaña ni función existente — es código
100% nuevo, aislado bajo el prefijo `tnd_` para no chocar con nada de lo
que ya existía.

---

## 12. Correcciones 18-jul-2026 (segunda tanda del mismo día) — todas implementadas

Reportadas por Jesús después de seguir probando la app en campo, tras el
lote de Pokayokes de la sección 5 (Bloque B.2 v3). Las 6 ya están hechas
en `index.html`; se documentan aquí con el mismo criterio de siempre:
qué se tocó y qué NO se tocó.

### 12.1 — Contraseña: escritura libre (bug real, corrompía el valor)

El auto-mayúsculas global (sección "Auto-mayúsculas global" en el
`<script>` no-módulo) se agregó pensando en boleta/folio/placas/
económico/búsquedas, pero tenía un efecto colateral no previsto:
`togglePasswordVisibility()` cambia el input de `type="password"` a
`type="text"` para "mostrar" la contraseña, y en ese momento el campo SÍ
calificaba como "texto" para el listener — forzando a MAYÚSCULAS el
valor REAL guardado (no solo la vista), no nada más algo cosmético.
Cualquier corrección o tecleo de una contraseña con minúsculas mientras
estaba visible quedaba dañada de forma permanente.

**Corrección:** se agregó `data-no-upper` a `#login-pass` (login) y
`#nc-pass` (crear cuenta) — la misma excepción que ya existía para
"Nombre completo". Contraseña queda con escritura 100% libre sin importar
si se está mostrando u ocultando.

### 12.2 — Captura > Identificación: el desplegable de Placas mostraba camiones de OTROS capturistas

`poblarPlacasDisponibles()` (la función que llena el `<select>` de
Placas en Captura) solo filtraba por `tipo_camion` + estar libre
(`!cerrado && !id_ticket && t3_salida_ts`), sin filtrar por quién lo
registró — a diferencia de Fila Báscula, que desde la sección 5 (punto 6)
ya solo muestra a cada capturista los camiones que él mismo dio de alta.
Resultado: el capturista A veía en Captura también las placas que había
liberado ("Sale a tiro") el capturista B.

**Corrección:** se reutilizó la misma función `puedoVerRegistroFila(r)`
que ya filtraba Fila Báscula, ahora también dentro del filtro de
`poblarPlacasDisponibles()`. Capturista solo ve lo suyo; admin,
coordinador y master (que ya devuelven `true` sin condición en esa
función) siguen viendo todo, sin cambios para ellos.

### 12.3 — Botones "🟢 Entra a fila" y "🟡 Destarado" no se bloqueaban al primer clic

A diferencia del flujo de "Registrar Entrada a fila" / "Sale a tiro", los
2 botones de la 2da pasada (`registrarEntradaFilaSegunda` /
`registrarSalidaFilaSegunda`, en "Camiones Destare") solo quedaban
`disabled` cuando el re-render disparado por el snapshot de Firestore
(`onFilaBasculaCambio`) volvía a pintar la lista. Con la latencia normal
de red, un doble clic accidental alcanzaba a mandar la escritura 2 veces
antes de que llegara esa actualización — riesgo real de doble
timestamp/doble evento.

**Corrección:** ambas funciones ahora reciben también el botón (`this`)
como segundo parámetro y lo deshabilitan de inmediato al entrar a la
función, antes del `await` a Firestore — sin esperar el round-trip. Si la
escritura falla, se vuelve a habilitar en el `catch` para poder
reintentar. El re-render por snapshot sigue funcionando igual que antes
para el resto de casos (otro capturista, refresco de pantalla, etc.).

### 12.4 — Filtro Material → Destino en "Material y Destino"

No existía ninguna validación de qué materiales pueden ir a qué
destinos — el formulario dejaba armar cualquier combinación. Reglas de
negocio confirmadas por Jesús:

| Material | Destinos permitidos |
|---|---|
| **CORAZA** | Los 2 acopios + Cuerpo 1, 2 y 3. **No** Muro (no lleva coraza), **no** Cuerpo 4 ni Cuerpo 5 (llevan core-locs). Tampoco Morro ni Área de Prefabricados — la instrucción los limita explícitamente a "solo los dos acopios y los cuerpos". |
| **NUCLEO** | Sin restricción — todos los acopios y todos los cuerpos. |
| **SECUNDARIA 1 / SECUNDARIA 2 / BERMA / BERMA DE APOYO** | Todos lados **excepto Muro**. |
| **AREA DE PREFABRICADOS** (como destino) | No se restringe por material — es un destino genérico fuera de la estructura del rompeolas, no cubierto por ninguna de las reglas anteriores, así que se deja siempre disponible. |

**✅ Confirmado por Jesús (18-jul-2026):** "Morro" queda **excluido**
para Coraza e **incluido** para Secundaria 1/2, Berma y Berma de apoyo —
exactamente como se había implementado por supuesto propio. **No se
necesitó ningún cambio de código**, la tabla `EXCLUSIONES_DESTINO_POR_MATERIAL`
ya está correcta tal como quedó en la entrega anterior.

**Implementación:** tabla `EXCLUSIONES_DESTINO_POR_MATERIAL` (lista de
destinos que NO se permiten por material) + función
`filtrarDestinosPorMaterial()`, que deshabilita (no elimina) las
`<option>` no permitidas de `#f-destino` cada vez que cambia `#f-material`.
Si el destino ya elegido deja de ser válido, se limpia y se avisa con
`alert()`. Se llama también desde `clearForm()` (para resetear al abrir
un ticket nuevo) y desde `editRecord()` — en este último caso ANTES de
fijar el destino guardado del registro, para que un ticket histórico con
una combinación que ya no se permite hoy siga mostrándose tal cual al
editar, sin borrar el dato ni lanzar la alerta.

**No se tocó:** las tablas `RANGOS` / `RANGOS_ACOPIO` (que definen el
rango de peso, no el destino permitido) se dejaron intactas — algunas
combinaciones que ya no se pueden ELEGIR de nuevo (ej. Cuerpo 4 +
Coraza) siguen teniendo su rango ahí por si algún ticket histórico las
usa; no afecta nada porque ya no se puede volver a seleccionar esa
combinación desde el formulario.

### 12.5 — Encabezados del Excel "6 Sigma" (`descargarExcelSixSigma`)

Encabezados renombrados/reordenados según pidió Jesús, para que la hoja
se entienda sin tener que adivinar qué mide cada columna. Orden final (15
columnas):

1. Boleta
2. Capturista
3. Inicio Captura
4. Fin Captura
5. Duracion de captura
6. Veces editado
7. 1a Entrada a fila (Cargado)
8. Salida hacia frente
9. **Tiempo en fila bruto (mm:ss)** — columna que ya existía al final de
   la hoja como "Espera en fila bruto (seg)", movida aquí justo después
   de "Salida hacia frente" y expresada en mm:ss (no en segundos planos).
10. Pesaje bruto (se mantiene igual — es la hora "forzada" del ticket físico de báscula)
11. 2da Entrada a fila (Destare) — antes decía "2a entrada a fila (vacío, de regreso)"
12. Pesaje tara/destare (se mantiene igual — hora "forzada" del ticket físico)
13. Tiempo en fila Tara (mm:ss) — antes "Espera en fila - tara (mm:ss)"
14. Tiempo en tirar material (hh:mm:ss) — antes "Tiempo en el viaje/frente (mm:ss)". Es el tiempo entre "Sale a tiro" y que el camión se vuelve a formar (ya vacío) para el destare. Se cambió a **hh:mm:ss** (no mm:ss) porque un camión que no regresa a destararse el mismo rato genera ciclos de varias horas.
15. ID INTERNO — antes "ID interno (referencia)"

**Se eliminaron** las 4 columnas numéricas en segundos que traía la hoja
al final ("Duración captura (seg)", "Espera en fila bruto (seg)",
"Tiempo en viaje/frente (seg)", "Espera en fila tara (seg)") — Jesús
señaló que "Espera en fila tara (seg)" duplicaba el dato que ya está en
"Espera en fila - tara (mm:ss)"; se verificó que las otras 3 tenían
exactamente el mismo problema (cada una es el mismo número que ya
aparece, en otro formato, en alguna columna mm:ss/hh:mm:ss de la propia
hoja), así que se quitaron las 4, no solo la que Jesús vio directamente.

**Diagnóstico de la duda original de Jesús ("me marca 0s o 1s"):** se
revisó el dato — no es un bug ni un dato corrupto. `t1b_fila_ts` /
`t4_destare_ts` se toman en el momento exacto del clic en
"Entra a fila"/"Destarado" del lado del capturista, y como él mismo
reporta que le dio clic "casi luego luego" después del ticket de
báscula, 0–1 segundo de diferencia es el dato real, no un error de
captura. Lo que sí se corrigió aparte fue el FORMATO: antes esas 3
columnas de tiempo usaban `formatearDuracionSeg()` (la misma función de
las tarjetas KPI en pantalla, que da textos tipo "3 min 45s" o "0s"),
que no es formato "mm:ss" real pese a que el encabezado ya decía
"(mm:ss)". Se agregaron `formatearMMSS()` y `formatearHHMMSS()`
específicas para el Excel (ej. "00:01", "00:00:45"), sin tocar
`formatearDuracionSeg()` porque las tarjetas KPI en pantalla la siguen
usando tal cual y no fue parte de lo pedido.

### 12.6 — Verificación de bugs/datos corruptos antes de entregar (pedido explícito)

Se revisó, antes de entregar:
- Sintaxis completa de los 3 bloques `<script>` de `index.html` (extraídos
  y validados con `node --check`) — sin errores.
- IDs duplicados de elementos del DOM — ninguno.
- Que las funciones nuevas (`filtrarDestinosPorMaterial`,
  `formatearMMSS`, `formatearHHMMSS`, el segundo parámetro `btn` de
  `registrarEntradaFilaSegunda`/`registrarSalidaFilaSegunda`) quedaran
  definidas una sola vez, sin duplicados de la función original.
- Que `puedoVerRegistroFila()` esté disponible antes de usarse en
  `poblarPlacasDisponibles()` (funciona por hoisting de `function`, ya
  que ambas viven en el mismo `<script>` no-módulo).
- Que el conteo de anchos de columna (`worksheet['!cols']`) del Excel
  coincida 1 a 1 con las 15 columnas nuevas (antes eran 19).
- Que no quedara ningún encabezado viejo del Excel referenciado en otra
  parte del código (dashboard/KPIs usan sus propios textos, separados,
  sin relación con los encabezados de la hoja descargable — no se
  tocaron).

### 12.7 — Custom Claims de Firebase Auth (sección 6/7): confirmado, no existen

Se revisó directamente contra el código (no hizo falta esperar
confirmación de Jesús): `grep` de `token.role`, `customClaims` y
`setCustomUserClaims` en `index.html` y `firestore.rules` — **cero
coincidencias**. El proyecto nunca usó Custom Claims; las reglas reales
de `fila_bascula`, `stats_analisis` y `flota` ya usan el patrón de
lectura de documento (`miPerfil()`/`rol()`/`esMaster()`/`puedeCapturar()`)
consistente con el resto de la app desde su implementación original.
Ver sección 6, actualizada con el detalle completo. **No se tocó
`firestore.rules`** — ya estaba correcto.

**Pendiente real para siguiente sesión:** ~~si Jesús quiere el mismo
pokayoke de deshabilitar-al-clic (sección 12.3) también en "Registrar
Entrada a fila" y "Sale a tiro"~~ — **✅ resuelto el 19-jul-2026, ver
sección 22.**

---

## 16. Correcciones 18-jul-2026 (tercera tanda del mismo día) — todas implementadas

Reportadas por Jesús con capturas de pantalla, sobre el punto 11.1
(lecturas de Firestore) y los puntos 11.2/11.4 ya construidos.

### 16.1 — Bancos mostraba cifras distintas según si dabas "Ver TODO"

**Causa real:** la tabla de Bancos se armaba de `window.db` (una ventana
reciente con tope — `LIMITE_VENTANA`, hasta 9,500 docs) o, si el usuario
daba clic en "Ver TODO el histórico", de una lectura completa de
`acarreos` (~6,218 docs). Con el filtro "01/01/2026 al 18/07/2026" la
ventana reciente solo traía 5,254 de los 6,218 viajes reales — de ahí el
banner diciendo un total distinto al de la tabla.

**Ya existía** un agregado mensual `resumenes/{YYYY-MM}` con
`por_banco_material_rango.{clave}.{viajes,ton,banco,material,rango}`
(sección 1.1 del bot de Telegram, mantenido con `increment()` en cada
alta/edición/baja) — pero Bancos nunca lo leía, solo lo escribía.

**Fix:** nueva función `calcularResumenBancosAgregado(desde, hasta,
bancosFiltro)`:
- Meses **completos** dentro del rango → 1 lectura por mes
  (`leerDocResumen(mes)`, ya gratis de mantener).
- Meses **parciales** en los extremos del rango (a lo más 2, los bordes)
  → 1 consulta acotada SOLO a esos días exactos
  (`traerTodoFirestore(subDesde, subHasta)`), nunca al histórico
  completo.
- `renderBancos()` ahora es `async` y llama a esta función
  automáticamente en cada cambio de filtro — ya no depende de que el
  usuario dé clic en ningún botón para ver cifras correctas.
- El PDF de Bancos también se separó: si hay rango de fechas (Día /
  Semana / Mes / Rango con Desde-Hasta llenos), hace su propia lectura
  acotada EXACTA a ese rango antes de generar el PDF — ya no depende de
  "Ver TODO el histórico" tampoco.
- Los botones "Ver TODO el histórico" / "Volver a ventana" de Bancos
  **se dejaron intactos** (no se quitaron del HTML) porque todavía
  afectan la precisión del buscador de folio individual
  (`renderBancosFolio()`, que sí necesita registros fila por fila, no
  agregados) — pendiente real: aclarar con Jesús si vale la pena
  reescribir también el buscador de folio con un enfoque acotado
  parecido, o si el uso ocasional actual es aceptable.

**Nota de costo:** el resumen automático de Bancos cuesta típicamente
unas decenas de lecturas (meses del rango + 0-2 consultas acotadas),
muy lejos de las miles de "Ver TODO". Reportes y Resumen **no se
tocaron** en esta ronda — siguen con el patrón viejo (ventana / Ver
TODO manual); si Jesús quiere el mismo fix ahí, es la siguiente fase
natural, reutilizando `calcularResumenBancosAgregado` como base.

### 16.2 — PDF de Bancos: falta columna Boleta y orden de folio

- Agregada columna **BOLETA** (entre Fecha y Placa).
- Orden cambiado de banco→fecha→**placa** a banco→fecha→**folio**
  (ascendente, numérico — se le quitan las letras al folio antes de
  comparar, por si trae prefijo).

### 16.3 — Análisis de Tendencias: casi sin datos, gráfica se estira a 2028, y vuelve a leer todo

Tres síntomas, la mayoría de la misma causa raíz:

- **Bug real encontrado:** el filtro `r.status === 'completo'` dejaba
  fuera casi todo el histórico migrado/antiguo, que no tiene ese campo
  poblado de forma consistente (el status pendiente/completo es de una
  fase posterior a esos registros). Por eso decía "5 días laborables (3
  viajes completos)" con 6,218 viajes reales en la base. **Fix:** filtra
  por toneladas > 0 en vez de por `status` (y excluye explícitamente
  `pendiente`/`conflicto`, que sí deben quedar fuera).
- **Gráfica se estiraba demasiado:** con pocos puntos reales, la
  proyección hasta la fecha de cruce (a veces años en el futuro)
  estiraba el eje X tanto que los puntos reales quedaban invisibles.
  **Fix:** el horizonte VISUAL de la gráfica se limita a
  `máx(40, últimoT × 4)` días laborables — la fecha proyectada en texto
  sigue siendo exacta aunque la línea/curva no llegue a tocar el
  objetivo en el dibujo (aviso ⚠️ en pantalla cuando esto pasa).
- **Volvía a leer todo el histórico en cada clic de "Generar":** ahora
  reutiliza `window.resumenHistoricoCompleto` si Bancos/Reportes/Resumen
  ya lo cargaron antes en la misma sesión (botón "Ver TODO"); si no,
  pide confirmación con el costo estimado (mismo diálogo que usan esos
  botones) antes de leer, en vez de dispararse solo.

### 16.4 — Bonus: 2 bugs de referencia entre `<script>` distintos (no reportados, encontrados al investigar 16.1)

`resumenHistoricoCompleto` es una variable `let` declarada dentro del
`<script type="module">` — dos lugares en el `<script>` normal
(`usarVentanaRecienteEnBancos` / `cargarHistoricoCompletoBancos`, y el
equivalente de Resumen) la referenciaban SIN `window.`, lo cual truena
en tiempo de ejecución (`ReferenceError`) porque un script normal no
puede ver un `let` de un módulo distinto. Corregido a
`window.resumenHistoricoCompleto` en ambos lugares. Mismo tipo de bug
que ya se había atrapado antes con `increment`/`db_f`/`auth` (ver
sección 5, Bloque B.2) — recordatorio: cualquier variable que necesite
leerse desde fuera del `<script type="module">` debe exponerse
explícitamente con `window.nombre = nombre`, nunca asumir que un `let`
"se ve" entre scripts distintos.

**Estado:** las 4 implementadas y validadas (sintaxis + balance de
llaves + sin llamadas crudas de Firestore fuera del módulo). Pendiente
de prueba en campo por Jesús.

---

## 17. Correcciones 18-jul-2026 (cuarta tanda, misma noche) — 1 hecha, 1 pausada

### 17.1 — ✅ Editar ticket abría el formulario como si fuera captura nueva (fecha1 bloqueada/borrada)

Jesús reportó que al editar un ticket viejo (migrado, sin `fecha1`), el
campo "Fecha 1er pesaje" no lo dejaba escribir. Causa real (dos bugs
encadenados, no solo el `readonly` visible):
1. `f-fecha1` es `readonly` a propósito en captura NUEVA (se auto-llena
   desde Fila Báscula) — pero `editRecord()` no distinguía, así que
   editar heredaba el mismo candado.
2. `poblarPlacasDisponibles()` (se llama dentro de `editRecord()` cuando
   el ticket no tiene `fila_bascula_id`, típico en registros viejos)
   borra `f-fecha1` como parte de su lógica normal de captura nueva —
   así que aunque se hubiera desbloqueado, la volvía a dejar vacía.

**Fix:** `editRecord()` desbloquea `f-fecha1` (editable libremente,
etiqueta cambia a "editando ticket — corrígela libremente") y restaura
su valor real DESPUÉS de `poblarPlacasDisponibles()`. `clearForm()`
regresa el candado para la siguiente captura nueva. `calcCiclo()` ahora
también se recalcula al tocar `f-fecha1`/`f-hora1` (antes solo escuchaba
`f-fecha2`/`f-hora2`).

### 17.2 — ✅ RESUELTO (19-jul-2026) — "El ciclo es requerido" bloqueaba para siempre el guardado en tickets viejos sin ciclo

**Causa raíz real** (no era lo que decía la hipótesis pendiente de la
sesión anterior — `poblarPlacasDisponibles()` y `editRecord()` sí
preservaban bien fecha1/hora1/fecha2/hora2, ese flujo estaba correcto):
el problema es que algunos tickets viejos migrados desde Excel **de
verdad nunca tuvieron hora1, o nunca tuvieron fecha2/hora2** — no es
que la app los perdiera al editar, es que esos datos jamás existieron
(vinieron de un Excel con solo fecha, sin horario de báscula). Como
`calcCiclo()` (línea ~4768) exige las 4 columnas para calcular algo,
el campo ciclo se queda vacío por siempre en esos registros, y la
validación de `saveRecord()` (línea ~1502) bloqueaba el guardado sin
ninguna salida — la única forma de pasarla habría sido inventar una
hora falsa, que es justo lo que Jesús no quería hacer.

**Fix:** en `saveRecord()` (línea ~1490) se agregó
`esEdicionHistoricaIncompleta` — es `true` solo si YA se está editando
un ticket existente (`window._editFid`) Y el registro ORIGINAL, antes
de tocar nada (`window._editOriginal`, se fija en `editRecord()` al
abrir la edición), ya le faltaba `hora1`, `fecha2` u `hora2` desde
antes. Con esa condición en `true`, se dispensan los 3 requisitos de
hora1/fecha2/hora2/ciclo — se guarda el hueco histórico tal cual en vez
de forzar un dato inventado. **No afecta** capturas nuevas (ahí no hay
`_editFid` todavía) ni la edición de tickets que sí tienen su ciclo
completo (ahí la condición da `false` y se sigue exigiendo todo igual
que antes) — solo destraba el caso real de datos incompletos desde su
origen. `fecha1` y `boleta`/`folio`/`económico` siguen siendo
obligatorios siempre, edición histórica o no.

---

## 18. Prueba de campo con rol visor, 18-jul-2026 (noche) — 1 bug corregido, 3 explicados/pendientes de decisión

Jesús entró desde otro celular con una cuenta `visor` y reportó, sin picar
botones, lo que veía en cada pestaña.

### 18.1 — ✅ CORREGIDO — Suministros (Gráficos) solo mostraba 5,248 de 6,212 viajes

Era la única de las 4 pestañas que reportó que le faltaba el mismo fix
de `calcularResumenGenericoAgregado` que ya tenían Resumen, Reportes y
Bancos — seguía leyendo de `window.db` (ventana limitada). `renderDashboard()`
ahora es `async` y usa `calcularResumenGenericoAgregado(desde, hasta,
filtros, {soloOrigenBanco:true})` (se agregó esa opción a la función
genérica, más un desglose `porMes` para la gráfica de tendencia mensual/
anual, que antes también dependía de la ventana). Se quitaron los botones
"Ver TODO el histórico"/"Volver a ventana" de esta pestaña — ya no tienen
efecto en los números, dejarlos habría sido confuso.

**Pendiente real (no se tocó):** decidir si se quitan también los mismos
botones de Resumen/Reportes/Bancos — en esos tres, a diferencia de
Suministros, el botón "Ver TODO" todavía puede ser necesario para: la
tabla de detalle fila por fila (si existe), el buscador de folio
individual de Bancos (`renderBancosFolio()`, ver sección 16.1), y las
exportaciones a Excel/PDF con detalle. Falta confirmar con Jesús si esos
usos siguen siendo necesarios o si también se pueden migrar a agregados.

### 18.2 — Acopio Marino "disponible: 100,246 t" — revisado, NO es bug

Jesús esperaba más, restando el total histórico general (161,263.7 t)
menos lo colocado en el muro (18,542 t). Se revisó `computeAcopios()` y
el escritor `aplicarAgregadoAvanceAcopio()`: la resta real es correcta
(`existencia = entradas − salidas`, por acopio). La razón del número es
que el proyecto tiene DOS rutas de negocio distintas (ver sección 3):
Banco→Acopio→Muro (dos viajes, sí pasa por el inventario de Acopio) y
Banco→Muro directo (un viaje, `suministro_y_colocacion:true`, NUNCA toca
el inventario de Acopio). El total histórico general (161,263.7 t) mezcla
ambas rutas; la resta que hacía Jesús a mano solo es válida si TODO lo
colocado hubiera salido de Acopio, lo cual no es el caso en este
proyecto. `acopio_salidas` en 0 para todos los materiales indica que,
hasta hoy, ninguna colocación registrada vino de Acopio Marino/Terrestre
— todo lo colocado fue directo de Banco. **No requiere código nuevo**,
salvo que Jesús confirme en campo que sí ha habido colocaciones desde
Acopio y no se están reflejando (ahí sí habría que investigar de nuevo).

### 18.3 — Metas: "Meta mes" vs. lo que Jesús esperaba ("Meta actual" acumulada)

Análisis (curva S / avance de obra, estándar de control de proyectos de
construcción): comparar el avance de julio contra la meta AISLADA de
julio castiga a la obra los primeros días de cada mes (aunque vaya
adelantada desde meses anteriores, arranca en rojo). Lo correcto para un
semáforo de avance real es comparar ACUMULADOS: `Meta acumulada a la
fecha` (suma de metas de todos los meses ≤ mes actual) contra `Real
acumulado a la fecha` (todo lo colocado desde el inicio del programa,
con la misma lógica de "colocado en cuerpos" que ya usa "Real mes").
`Meta total` (todo el programa) ya está bien, según Jesús. **Propuesta,
sin construir todavía:** agregar una tercera columna "Meta acumulada" +
"Real acumulado" + "% acumulado", y mover el semáforo 🔴🟡🟢 a evaluar
ESE acumulado en vez de "Meta mes" vs "Real mes" aislados. "Meta mes"/
"Real mes" se conservarían aparte, como referencia de ritmo del mes en
curso (útil, pero no como semáforo de atraso/adelanto real). Pendiente
de que Jesús confirme si quiere que se construya así.

### 18.4 — Tendencia: modelo cuadrático que "sube y luego baja" — explicado, no es bug

El R² de 42.3%/42.5% (lineal vs. cuadrático) y el mensaje "no hay cruce
matemático real" ya sabían decir la verdad: es comportamiento normal
de una regresión cuadrática tipo Minitab (`Y = a + bt + ct²`) cuando el
coeficiente `c` sale negativo — la parábola abre hacia abajo, sube, toca
un vértice y **empieza a bajar** en la proyección a largo plazo. Es un
efecto conocido de extrapolar cuadráticas más allá del rango de datos
real (bueno para interpolar, poco confiable para extrapolar lejos) — no
es un error de cálculo, el modelo sí replica la lógica de Minitab.
**Mejora de presentación sugerida, no construida:** cortar la curva roja
dibujada en su vértice (el pico) en vez de seguir dibujando el tramo
descendente, que no tiene sentido físico para tonelaje acumulado de
obra. Pendiente de confirmar con Jesús si se implementa.

---

---

## 19. Correcciones 18-jul-2026 (quinta tanda) — respuesta a los 4 puntos de Jesús sobre la sesión anterior

Jesús reabrió 3 de los 4 puntos que la tanda anterior (sección 18) había
cerrado como "explicado, no es bug" o dejado como propuesta sin
construir, y reportó un 4o problema nuevo en el bot de Telegram.

### 19.1 — 🔴 REABIERTO — Acopio Marino "disponible: 100,246 t": el "no es
bug" de 18.2 quedó en duda, se agregó verificación en vivo

Jesús aportó el dato que faltaba: la pestaña Suministros (Gráficos),
filtrada por Cuerpo (Destino) = Acopio Marino, muestra **140,857.22 t**
suministradas a Acopio Marino (captura de pantalla adjunta) — no
100,246 t. Si `acopio_salidas` de Acopio Marino es 0 (como decía 18.2),
la existencia disponible debería ser ~140,857 t, no 100,246 t. Eso
apunta a que **`resumenes/avance_acopio` está desfasado**, no a que la
resta esté mal — la lógica de `computeAcopios()` (`existencia = entradas
− salidas`) sigue siendo correcta, el problema es que `entradas` que
trae ese documento ya no coincide con el dato real.

**Hipótesis más probable (no confirmada, requiere que Jesús la corra):**
antes del fix de la Fase 14.2 (`updateDoc()` en vez de `setDoc+merge`,
ver comentario en `aplicarAgregadoAvanceAcopio()`), los `increment()`
sobre rutas anidadas con punto (`acopio_entradas.<clave>.ton`) no se
fusionaban de forma confiable — así que movimientos de Acopio
registrados ANTES de ese fix pudieron perderse silenciosamente del
agregado, aunque sí quedaron en el ticket crudo. Eso explicaría que el
recálculo directo desde los tickets (lo que usa Suministros/Gráficos)
dé más alto que el agregado incremental.

**No se corrigió "a ciegas"** (no hay acceso a la base real desde este
chat para confirmar la hipótesis). En vez de eso, se construyó una
herramienta de verificación en vivo:

- Nuevo botón **"🔍 Verificar consistencia (Suministrado vs. Acopios)"**
  en la pestaña Acopios (`renderAcopios()` / `verificarConsistenciaAcopios()`,
  `index.html`).
- Compara, por cada Acopio, el total de `entradas` que ya trae el
  resumen (`resumenes/avance_acopio`, lo que ya se mostraba como
  "Suministrado (histórico)") contra un recálculo independiente y
  barato con `calcularResumenGenericoAgregado(null, null, {destinos:
  [acopio]}, {soloOrigenBanco:true})` — la misma función/criterio que ya
  usa Suministros/Gráficos (sección 18.1), NO lee el histórico completo.
- Si difieren por más de 1 t (margen de redondeo), muestra un banner
  rojo explicando que la existencia disponible no es confiable y manda
  a Jesús directo a **Admin → "Recalcular totales de Avances/Acopios"**
  (botón que ya existía, `recalcularAgregadoAvanceAcopio()`, sección
  1.1 punto 3 / FASE 14.2 § 4.6 — SÍ lee toda la colección una vez, por
  eso no se dispara solo, es una acción explícita).

**Pendiente real:** que Jesús entre a Acopios y le dé clic a "Verificar
consistencia". Si confirma el desfase, correr "Recalcular totales" en
Admin debería corregir el número de 100,246 t sin tocar más código —
la reconstrucción (`recalcularAgregadoAvanceAcopio()`, línea ~1350) ya
usa la misma lógica correcta de `conceptoEfectivo()`/`computeConcepto()`
que el agregado incremental, solo que parte de los tickets crudos en
vez de `increment()` acumulado, así que no hereda el desfase.

### 19.2 — ✅ Metas: semáforo movido a ACUMULADO a la fecha (confirmado por Jesús)

Implementada la propuesta de la sección 18.3 tal cual, sin cambios:
Jesús confirmó "diste en el clavo, hazlo así". En `initMetasTab()`:

- Nueva columna **"Meta acum. a la fecha"** = suma de `datos.meses[m]`
  para todos los meses `m <= mesActual` (comparación lexicográfica
  `'YYYY-MM'`, funciona directo).
- El semáforo 🔴🟡🟢 ahora evalúa `% acum.` (`Real acum. / Meta acum. a
  la fecha`), no `% mes` como antes.
- "Meta mes" / "Real mes" / "% mes" se conservan en la tabla, reetiquetado
  como "% mes (ritmo)" — referencia de qué tan bien va el mes en curso,
  ya NO determina el color del semáforo.
- "Meta total" (todo el programa) se conserva igual, sin cambios —
  Jesús ya la había confirmado como correcta.

### 19.3 — ✅ Tendencia: el horizonte de "10 años" se acotó al fin de obra real (6/6/29)

Jesús explicó que sus cálculos en Minitab sí daban una tendencia hacia
arriba (consistente con el R²/regresión ya implementados, sección
18.4 — eso no era el problema); lo que había que corregir es que,
cuando el modelo no cruza el objetivo con la pendiente actual, el
código mandaba la fecha "referencial" ~10 años al futuro (2600 días
laborables fijos), sin relación con el programa real de la obra.

**Fix:** nueva constante `TND_FIN_OBRA = 6/junio/2029` (fecha de fin de
obra confirmada por Jesús) y helper `tnd_diasLaborablesEntre()`. En
`tnd_resolverLineal()` y `tnd_resolverCuadratico()`:
- El caso "no hay cruce matemático real" (pendiente plana/negativa, o
  cuadrática sin raíz futura) ya NO usa 2600 días fijos — calcula los
  días laborables reales desde el último dato hasta `TND_FIN_OBRA` y
  usa esa fecha como tope. El mensaje en pantalla cambió de "⚠️ ...
  horizonte de 10 años" a "🔴 ... NO se alcanza la meta antes del fin de
  obra (6 de junio de 2029)".
- Nuevo caso: si el modelo SÍ cruza el objetivo matemáticamente pero la
  fecha calculada cae DESPUÉS del 6/6/29, se marca `excedeFinObra:true`
  y se muestra en rojo: "Se alcanzaría hasta el [fecha] — después del
  fin de obra (6/6/29)" — antes esto se mostraba igual que un cruce
  normal (📅 azul/neutral), sin avisar que se sale del programa.
- No se tocó la lógica de la regresión en sí (`tnd_regresionLineal`,
  `tnd_regresionCuadratica`) ni el R²/mensaje de "no hay cruce
  matemático" (sección 18.4) — seguían correctos, según confirmó Jesús.

### 19.4 — ⏸️ PENDIENTE — Bot de Telegram: "TODOS" (banco+material) suma ~333k t cuando el histórico real es ~161k t

Jesús reportó que el comando de Telegram que desglosa acarreos por
banco y material, sumado a mano, da ~333 mil toneladas — casi el doble
del total histórico real (161,263.7 t). **No se investigó ni se
corrigió todavía**: el bot de Telegram vive en `worker.js` (Cloudflare
Worker), un proyecto hermano documentado en `BOT.MD`, no en
`index.html` — no se subió ese archivo a este chat, así que no hay
código que revisar.

**Hipótesis sin confirmar** (a partir del patrón "~2x del real"): el
bot probablemente está sumando dos desgloses que se traslapan en vez de
ser mutuamente excluyentes — por ejemplo, si agrupa por
banco→material→**rango** pero el mismo material aparece repetido bajo
más de un rango con el mismo texto visible (o si sobre-cuenta al armar
el mensaje "TODOS" iterando materiales Y rangos por separado y sumando
ambos). Sin ver `worker.js` no se puede confirmar cuál de las dos es.

**Pendiente real para la siguiente sesión:** subir `worker.js` (o el
archivo que Jesús suba como `index.js` del bot) junto con `BOT.MD` para
diagnosticar con el código real, en vez de adivinar aquí.

### 19.5 — ✅ RESUELTO — Botones "Ver TODO"/"Volver a ventana" ocultos en Resumen, Reportes y Bancos

Jesús confirmó que ya no los necesita, y preguntó algo importante: "¿se
supone que en automático estamos viendo TODO EL HISTÓRICO? cada que un
usuario entre debería poder ver todos los datos". Se revisó el código
real (no la suposición de la sección 16.1/18.1) para responder eso con
certeza, panel por panel:

- **Resumen:** la tabla ya usa `calcularResumenGenericoAgregado()` en
  automático desde una corrección previa sin numerar en este archivo
  (comentario en código: "tercera tanda, punto 2 — URGENTE") — **sí**
  muestra todo el histórico solo con entrar, filtrable por fecha, sin
  necesitar "Ver TODO". Lo único que SÍ seguía dependiendo de la ventana
  reciente era el **PDF** (`descargarPdfResumen()`) — corregido aquí
  mismo con el mismo patrón acotado que ya tenía el PDF de Bancos
  (16.4.1): si hay rango Desde/Hasta, lee directo y exacto de Firestore
  (`traerTodoFirestore`); si no, usa la ventana (casos "Día"/"Semana"/
  "Mes" puntuales, que siempre caen dentro de ella).
- **Reportes:** "Completados" también ya usa el agregado mensual
  (mismo comentario de código). "Pendientes" sigue leyendo la ventana
  reciente **a propósito** (es información de HOY, no histórica). El
  Excel de esta pestaña (`descargarExcelDesdeTab`) ya lee directo de
  Firestore con sus propios filtros, nunca dependió de la ventana.
- **Bancos:** tabla (16.1), PDF (16.4.1) y buscador de folio
  (`dbBuscarPorFolio`, consulta directa a Firestore, tercera tanda punto
  3) — los tres ya eran autosuficientes. La nota "pendiente real" de la
  sección 16.1 sobre el buscador de folio quedó obsoleta, ya estaba
  resuelta.

**Conclusión:** el sistema SÍ funciona como Jesús esperaba — todo
usuario ve el histórico completo (filtrable por fecha) desde que entra,
sin lecturas de miles de documentos. Los botones eran vestigiales.

**Fix:** los 3 pares de botones se **ocultaron** (`style="display:none"`)
en vez de borrarse — las funciones JS (`cargarHistoricoCompletoResumen`,
`usarVentanaRecienteEnBancos`, etc.) se dejan intactas como respaldo
silencioso por si algún flujo interno todavía las invoca, sin exponerlas
en la UI para no confundir. "Descargar PDF" de Resumen se dejó visible
— es la única acción de ese grupo que sigue haciendo algo real.

---

## 20. 19-jul-2026 — Tres pedidos de Jesús: eliminar fila desde la app, auditoría de rangos, rediseño de Tendencia

### 20.1 — ✅ IMPLEMENTADO — Master elimina camiones de Fila Báscula directo desde la app

Jesús pidió no depender de entrar a Firebase desde computadora para
sacar de la fila un camión mal capturado (duplicado, error, camión que
se fue sin avisar) — necesita hacerlo desde el celular en campo.

**Implementación:** `window.eliminarRegistroFilaBascula(id, btn)`
(`index.html` línea ~7020) — `deleteDoc` sobre la colección
`fila_bascula`, con `confirm()` antes de borrar. Restringido a
`window._currentUserRol === 'master'` (doble candado: la función lo
verifica internamente Y el botón solo se pinta si `esMaster`, mismo
patrón que el resto de acciones destructivas de la app). Botón 🗑️ rojo
agregado en `renderFilaBascula()` (lista "Camiones con Material" /
en tránsito) y en `filtrarBuscadorDestare()` (lista "Camiones Destare").
No hace falta repintar a mano tras el borrado: el listener global de
`fila_bascula` (sección 1, línea ~620) detecta el cambio y dispara
`onFilaBasculaCambio()` solo, en todos los dispositivos conectados.

### 20.2 — ✅ IMPLEMENTADO, con bug encontrado y corregido — Auditoría de rangos (panel 6 Sigma)

Origen: Jesús notó viajes de NÚCLEO con rango "0.30 a 0.50", que no
existe para ese material en `RANGOS_ACOPIO` (línea ~4066) — solo existen
`'0.02 a 0.20 ton'` y `'0.01 a 0.50 ton'`. Sospecha propia de Jesús:
error del exportador CSV→Firebase al migrar su Excel. Confirmado con el
código real: **el rango sí es inválido de verdad**, no es un
malentendido.

**Implementación:** `window.auditarRangosMaterial()` (`index.html` línea
~7210) + tarjeta "🔍 Auditoría de rangos" en el panel 6 Sigma (Bloque
B.1, solo `esMaster`). Consulta puntual acotada por fecha Desde/Hasta
(`traerTodoFirestore`, mismo patrón de costo que
`descargarExcelSixSigma` — no es un listener, no lee sin fecha). Compara
`material`+`rango` de cada ticket contra `RANGOS_ACOPIO` y lista las
combinaciones que no existen, con conteo y hasta 5 folios de ejemplo por
combinación.

**Bug real (encontrado por Jesús al probar, corregido el mismo día):**
la primera versión comparaba `r.rango` **crudo** contra `RANGOS_ACOPIO`
(que siempre lleva sufijo `" ton"`), pero buena parte del histórico
guarda el rango sin ese sufijo o con espacios distintos — la app ya
tiene una función `normalizarRango()` (línea ~974) para resolver
exactamente este problema (la usa el resto del código: agregados de
Acopios, `por_banco_material_rango`, etc.), pero se me olvidó aplicarla
aquí. Resultado del bug: marcaba como "inválidos" rangos correctos como
`0.02 a 0.20` de Núcleo (1,804 tickets falsos positivos de 2,182
reportados en la primera corrida). **Fix:** se agregó
`normalizarRango(r.rango || '')` antes de comparar, igual que el resto
de la app. Verificado con `node --check` sobre el módulo extraído.

**Dato real que sí sobrevivió al fix:** ~242 tickets de NÚCLEO con rango
`0.30 a 0.50 ton` (normalizado) siguen siendo un defecto genuino — no
existe para ese material aunque se normalice. **Pendiente real:** Jesús
corrige el dato en computadora (no se tocó el histórico desde este
chat, la auditoría es de solo lectura).

### 20.3 — ✅ IMPLEMENTADO — Panel "Tendencia" rediseñado estilo Minitab (menos texto, más visual)

Jesús reportó dos problemas sobre el panel entregado en la sección
anterior de esta misma fecha: (1) no entendía los banners de texto
largo (R² de confiabilidad, nota de vértice de la cuadrática) comparado
con la salida de Minitab, que él sí sabe leer; (2) la app "es más
visual y fácil de entender", pidió quitar el exceso de texto.

**Fix — se quitó por completo:** el banner de confiabilidad por R²
(`tnd-confiabilidad`) y la nota de párrafo sobre el vértice de la
cuadrática (`tnd-vertice-nota`) — ambos eliminados del HTML y del JS de
`generarAnalisisTendencia()` (línea ~7721). Las tarjetas de KPI de R²
también se quitaron (Minitab tampoco las muestra).

**Se agregó en su lugar (formato real de un "Trend Analysis" de
Minitab):**
- **Ecuación ajustada** de cada modelo, ej. `Yₜ = 245.3 + 18.7·t` (lineal)
  o con término `t²` (cuadrático) — texto corto en monoespaciado, sin
  explicación aparte.
- **MAPE / MAD / MSD** — las 3 medidas de precisión estándar de Minitab
  Trend Analysis, calculadas sobre los puntos usados en el ajuste (MAPE
  excluye días con `y = 0` para no dividir entre cero; MAD y MSD sí los
  incluyen).
- Fecha proyectada como badge corto (✅/🔴/📅), con el detalle completo
  movido al atributo `title` (tooltip al mantener presionado) en vez de
  texto visible.
- **Gráfica:** se separó cada modelo en 2 series — "Ajuste" (línea
  sólida, `t ≤ ultimoT`, sobre datos reales) y "Pronóstico" (línea
  punteada, `t > ultimoT`) — así se ve de un vistazo dónde termina el
  dato real y empieza la proyección, sustituyendo lo que antes se
  explicaba con la nota de vértice en texto.

**No se tocó:** la lógica de negocio de los resolvers
(`tnd_resolverLineal`/`tnd_resolverCuadratico`, fin de obra 6/6/29,
sección 19.3) ni el campo "Analizar desde" (excluir arranque, sección
19 de esta misma fecha) — siguen igual, solo se acortó su etiqueta en
el HTML.

---

## 21. 19-jul-2026 — Bug relacionado a 17.2: editar un ticket viejo (sin fila_bascula_id) perdía su placa y bloqueaba el guardado

Jesús reportó (boleta 2603932233, folio 2348): al editar un ticket ya
completo, el modal pedía "Selecciona las placas del camión (debe estar
registrado en Fila Báscula con salida hacia el frente ya hecha)" — la
misma regla que aplica a captura NUEVA, aplicada por error a una
EDICIÓN de un ticket que ya tenía su placa capturada.

**Causa raíz:** en `editRecord()` (línea ~1701), cuando el ticket **no**
tiene `fila_bascula_id` (registros de antes de esa liga, o cualquier
ticket cuyo camión ya no esté "libre" en Fila Báscula — que es
prácticamente siempre, para un ticket ya completo), se llama a
`poblarPlacasDisponibles()`, que repuebla el `<select>` de placas
**solo** con camiones actualmente libres en la fila. La placa real del
ticket no está ahí (su camión ya se fue hace rato), así que el select
quedaba sin selección — y `saveRecord()` exige `data.placas`
igual que en captura nueva.

**Fix:** mismo patrón que ya se usó para `fecha1` en esta misma rama
(sección 17.1): después de `poblarPlacasDisponibles()`, se inyecta una
opción extra con la placa/económico **original** del ticket
(`r.placas`/`r.economico`), ya seleccionada, con un `value` sintético
(`'__ticket_original__'`, no es un id real de `fila_bascula`). El
usuario puede seguir cambiando a otro camión de la lista si de verdad
se equivocó de placa; si no toca nada, se guarda con la placa que ya
tenía. `f-fila-bascula-id` se deja vacío en este caso (correcto: no hay
2da salida de fila que validar para un ticket sin esa liga).

**No se tocó:** la rama `if (r.fila_bascula_id)` (ticket ya ligado a un
camión de Fila Báscula) — esa nunca tuvo el problema, ya inyectaba su
propia opción.

---

## 22. 19-jul-2026 — Pokayoke doble-clic agregado a "Registrar Entrada a fila" y "Sale a tiro"

Cerraba el pendiente abierto en 12.7: `registrarEntradaFilaSegunda`/
`registrarSalidaFilaSegunda` (Destare) ya tenían el candado de
deshabilitar-al-clic desde el 18-jul-2026 (sección 12.3), pero
`registrarEntradaFila()` ("🚛 Registrar Entrada a fila", captura
principal de Fila Báscula) y `registrarSalidaFrente()` ("Sale a tiro",
lista de Camiones con Material) se habían quedado sin él.

**Fix — mismo patrón exacto que 12.3:**
- `registrarSalidaFrente(filaId, btn)` (línea ~7038): se agregó
  `if (btn) { if (btn.disabled) return; btn.disabled = true; }` al
  entrar, y `btn.disabled = false` en el `catch` si falla. El botón HTML
  ahora pasa `this` como 2do argumento.
- `registrarEntradaFila(btn)` (línea ~6946): esta función es más larga,
  con varios `return` de validación a la mitad (tipo de camión vacío,
  placas vacías, económico duplicado, modal de económico cancelado,
  etc.) — en vez de repetir `btn.disabled = false` antes de cada uno, se
  envolvió el cuerpo completo en `try { … } finally { if (btn)
  btn.disabled = false; }`, así el botón se reactiva siempre al salir,
  sea por una validación fallida o por terminar bien. El botón HTML
  ("🚛 Registrar Entrada a fila") ahora pasa `this`.

Verificado con `node --check` sobre el módulo extraído — sin funciones
duplicadas, sin romper sintaxis.

---

## 23. 19-jul-2026 — Causa real de la brecha R² 42% (app) vs 72% (Minitab de Jesús)

Jesús compartió su presentación (`PP.pptx`, 6 capturas de Minitab) y el
prompt que había preparado con Gemini describiendo su metodología real
de limpieza de datos. Comparando contra el código, se encontró la causa
exacta — no era el sábado (eso ya estaba bien excluido) ni un problema
de ajuste estadístico, era una diferencia de **qué cuenta como un punto
de dato**.

**El proceso real de Jesús en Minitab (confirmado por su prompt a
Gemini):** agrupa tonelaje por fecha, elimina sábados (medio turno), y
**re-indexa secuencialmente (X=1,2,3…) SOLO los días que ya tienen una
fila en su base de datos.** Un día sin fila simplemente no existe en su
secuencia — no es que valga 0, es que no se cuenta en absoluto.

**Lo que hacía la app hasta hoy** (`tnd_serieDesdeMapaFechas()`, línea
~7631): recorría CADA día laborable (lunes a viernes) entre la primera
y la última fecha del histórico, y si un día no tenía dato, le ponía
**Y=0 y lo metía a la regresión como un punto real más**. Eso es
exactamente lo que la metodología de Jesús NO hace. Cada hueco de datos
(no necesariamente un paro real y documentado — puede ser simplemente
un día sin fila capturada) se convertía en un cero falso que
contaminaba la regresión, inflaba la variabilidad y aplanaba el
ajuste — de ahí que el cuadrático de la app diera ~42-42.5% de R² contra
el 72.00% real de Jesús en Minitab con los mismos datos de fondo.

**Fix:** `tnd_serieDesdeMapaFechas()` ahora solo agrega un punto a la
serie (y solo entonces avanza el índice `t`) si el día laborable
**tiene una llave real** en el mapa de tonelaje por fecha — si no la
tiene, se salta completo, igual que en Minitab. Un día con dato
`Y=0` explícito (un paro documentado con 0 toneladas capturado a
propósito) sigue contando como punto real, porque si tiene llave en el
mapa. La única diferencia es con los días que de plano no tienen
ninguna fila.

**Se aprovechó para regresar el R²** como badge compacto junto a
MAPE/MAD/MSD en cada tarjeta de modelo (línea ~3893) — Jesús lo quitó
la sesión pasada por exceso de texto, pero el R² en sí es corto y es
justo el número que compara contra su 72.00% de Minitab, así que se
reincorporó sin volver a los banners de párrafo.

**Pendiente para la siguiente prueba de campo:** correr el análisis de
nuevo y confirmar que el R² cuadrático ahora se acerque al 72.00% de
Minitab. Si sigue habiendo una brecha después de este fix, la siguiente
hipótesis a revisar sería si el agregado mensual (`tendencia_diaria`,
usado por `calcularTendenciaAgregada()`) tiene sus propios huecos de
fechas por meses no reconstruidos con "Recalcular resumen" en Admin —
en ese caso habría que forzar la reconstrucción de esos meses antes de
comparar.

Verificado con `node --check` sobre el módulo extraído.

**Adición (mismo día):** Jesús probó desde el 1 de marzo y el R² subió
de 42% a 59-61% — mejora real, sigue sin llegar al 72% de Minitab (ver
pendiente arriba: probablemente algún mes del agregado mensual todavía
tenga huecos). También pidió un tooltip táctil en R²/MAPE/MAD/MSD (no
hay "hover" en celular): se agregó `mostrarInfoMetrica()` — un solo div
flotante compartido (`#tnd-metric-tooltip`, `position:fixed`) que se
reposiciona y cambia de texto según qué etiqueta se toque, con una
explicación corta de cada métrica. Se cierra tocando la misma etiqueta
de nuevo, tocando otra, o tocando cualquier otro lado de la pantalla.

---

## 24. Guía para la próxima IA — patrones recurrentes de bugs y mapa de funciones clave

Esta sección no documenta un cambio puntual — es una destilación de
lecciones que se repitieron 2+ veces en las sesiones del 18/19-jul-2026.
Léela antes de tocar `editRecord()`, `saveRecord()`, o cualquier análisis
estadístico nuevo — te ahorra encontrar el mismo bug otra vez con otro
campo.

### 24.1 — El patrón de bug más repetido: "editar pierde un dato que captura nueva no necesita"

`editRecord()` reconstruye el formulario llamando a funciones que
originalmente se diseñaron para **captura NUEVA** (`poblarPlacasDisponibles()`,
etc.), donde es correcto y esperado que empiecen vacías/limitadas a lo
"disponible ahora". El bug aparece cuando esa misma función se reutiliza
al EDITAR un ticket ya existente: borra o filtra el valor que el ticket
YA tenía, y no hay ningún paso que lo restaure — el usuario ve el campo
vacío y un mensaje de validación como si estuviera capturando desde
cero. Pasó dos veces con dos campos distintos:
- **`fecha1`** (sección 17.1, 18-jul-2026): `poblarPlacasDisponibles()`
  la borra a la fuerza; se restaura después con `r.fecha1`.
- **`placas`** (sección 21, 19-jul-2026): la misma función solo ofrece
  camiones "disponibles ahora" en el `<select>`; un ticket viejo casi
  nunca tiene el suyo ahí. Se inyecta una opción extra con la placa
  original del ticket.

**Antes de agregar o modificar cualquier campo en `editRecord()`**:
pregúntate si ese campo pasa por alguna función pensada para captura
nueva (búscalo por nombre de función, no solo por el id del campo). Si
sí, verifica explícitamente que el valor original del ticket sobreviva
esa llamada — si no, es el mismo bug con otro nombre. Campos ya
confirmados que SÍ sobreviven bien porque se asignan directo desde `r.*`
sin pasar por una función de captura nueva: `economico`, `boleta`,
`folio`, `bruto_kg`, `tara_kg` (ver `flds` al inicio de `editRecord()`,
línea ~1658).

### 24.2 — Metodología de series de tiempo: NUNCA rellenar huecos con 0

Lección de la sección 23: si en el futuro se construye otro análisis
estadístico sobre una serie de fechas (no solo Tendencia), la regla que
Jesús usa en Minitab es **un día sin fila de datos no cuenta como Y=0
— simplemente no existe en la secuencia**. Rellenar automáticamente los
huecos de fecha con cero (por comodidad de programación, para tener un
`t` continuo) contamina cualquier regresión o promedio con "ceros
falsos" que no representan paros reales, y va a producir métricas
peores que las que Jesús obtiene con su propio proceso manual. Antes de
escribir un nuevo agregado por fecha, decide explícitamente: ¿un día sin
registro es (a) un cero real y documentado, o (b) simplemente ausencia
de dato? Solo (a) debe contar como punto en cualquier estadística.

### 24.3 — Antes de comparar contra un catálogo (tipo `RANGOS_ACOPIO`), normaliza primero

Lección de la sección 20.2: el histórico de esta app tiene texto libre
capturado en distintos momentos con formato inconsistente (con/sin
sufijo `" ton"`, espacios extra). Ya existe `normalizarRango()` (línea
~974) para esto — cualquier comparación nueva contra `RANGOS_ACOPIO` o
agrupación por rango DEBE pasar por ella primero, o vas a marcar como
"inválido"/"distinto" un montón de datos que en realidad son iguales.

### 24.4 — Flujo de verificación obligatorio antes de entregar cualquier cambio a `index.html`

Este archivo no tiene build ni linter propio, así que la única red de
seguridad es esta rutina manual — **siempre**, incluso para cambios
"triviales":
```bash
python3 -c "
import re
html = open('index.html', encoding='utf-8').read()
scripts = re.findall(r'<script type=\"module\">(.*?)</script>', html, re.S)
open('s0.mjs','w',encoding='utf-8').write(scripts[0])
"
node --check s0.mjs
```
Si `node --check` no imprime nada, la sintaxis del módulo principal está
bien (hay un 2do `<script type="module">` más chico y suelto que da
error de sintaxis al concatenarlo con el primero — es un falso positivo
de la extracción ingenua, no un bug real; revisar cada script por
separado si hace falta descartar duda). Nunca editar directo en
`/mnt/user-data/uploads/` (es de solo lectura) — copiar primero a
`/home/claude/`, editar ahí, y copiar el resultado final a
`/mnt/user-data/outputs/`.

### 24.5 — Mapa rápido de funciones clave (líneas aproximadas, se mueven con cada edición — usar como punto de partida para `grep`, no como verdad absoluta)

| Función / constante | Qué hace | ~Línea |
|---|---|---|
| `normalizarRango()` | Normaliza texto de rango antes de comparar/agrupar | 974 |
| `saveRecord()` | Validaciones + guardado de un ticket (nuevo o editado) | 1490 |
| `editRecord()` | Puebla el formulario para editar un ticket existente | 1652 |
| `RANGOS_ACOPIO` | Catálogo de rangos válidos por material | 4112 |
| `poblarPlacasDisponibles()` | Llena el `<select>` de placas — pensada para captura NUEVA | 4324 |
| `calcCiclo()` | Calcula el ciclo (fecha1/hora1 → fecha2/hora2) | 4814 |
| `registrarEntradaFila()` | Fila Báscula — entrada principal | 6949 |
| `registrarSalidaFrente()` | Fila Báscula — "Sale a tiro" | 7041 |
| `eliminarRegistroFilaBascula()` | Borrado de camiones en fila, solo master | 7086 |
| `registrarEntradaFilaSegunda()` / `registrarSalidaFilaSegunda()` | Fila Báscula — 2do ciclo (destare) | 7175 |
| `auditarRangosMaterial()` | Auditoría de rango vs. catálogo, panel 6 Sigma | 7276 |
| `tnd_serieDesdeMapaFechas()` | Construye la serie t=1..N para Tendencia (solo días con dato real) | 7651 |
| `mostrarInfoMetrica()` | Tooltip táctil de R²/MAPE/MAD/MSD | 7819 |
| `generarAnalisisTendencia()` | Regresión lineal/cuadrática + render del panel Tendencia | 7843 |

---

## 25. 19-jul-2026 — PDF de Bancos separado por material + REZAGA faltaba en todo el catálogo de filtros

### 25.1 — ✅ PDF de Bancos ahora separa por banco + material

`descargarPdfBancos()` (línea ~8604) ordenaba banco → fecha → folio.
Ahora ordena **banco → material (orden de catálogo fijo, no
alfabético) → folio**, y se agregó un renglón separador en negritas
entre cada grupo banco+material con su subtotal de viajes y toneladas
— no es solo orden silencioso, la separación se ve físicamente en el
PDF. El orden de material usado es el mismo catálogo de negocio de la
sección 3: Núcleo, Secundaria 1, Secundaria 2, Berma, Berma de apoyo,
Coraza, Rezaga.

### 25.2 — ✅ RESUELTO — REZAGA no existía en NINGÚN filtro/catálogo de material de la app

Jesús reportó que los tickets de Rezaga no aparecían al filtrar por
material en Suministros/Bancos (que son la MISMA pestaña, `tab-graficos`
— "Suministros" en el menú es solo el nombre que se le puso al botón de
navegación). Se confirmó: **REZAGA nunca se agregó** a ninguno de los 4
grupos de checkboxes de filtro de material que existen en la app —
`cb-mat-*` (Suministros/Bancos, línea ~3052), `cb-resumen-mat-*`
(Resumen, línea ~3435), `cb-reportes-mat-*` (Reportes, línea ~3614),
`cb-excel-mat-*` (Excel, línea ~3726) — ni a `NOMBRES_MATERIAL` (línea
~6002, mapa de nombre para mostrar) ni a `nombreMaterialLegible()`
(línea ~5612, usado por la auditoría de rangos de la sección 20.2). Si
ya existen tickets con `material: 'REZAGA'` en Firestore (probablemente
de una migración/CSV, ya que tampoco estaba en el formulario de captura
nueva), quedaban invisibles en cuanto se aplicara cualquier filtro de
material.

**Fix aplicado (alcance acotado a filtros y visualización):** se agregó
"Rezaga" como opción de checkbox en los 4 grupos de filtro, y a
`NOMBRES_MATERIAL`/`nombreMaterialLegible()` para que se muestre bien
en vez del texto crudo `REZAGA`.

**NO se tocó a propósito (falta información de negocio real):**
- El `<select id="f-material">` de **captura nueva** (línea ~2752) — si
  Jesús quiere poder capturar tickets NUEVOS de Rezaga desde la app
  (no solo ver los que ya existen), hace falta agregarlo ahí también.
- `RANGOS_ACOPIO` (línea ~4112) y la tabla por Cuerpo (línea ~4104) —
  Rezaga no tiene rangos de tonelaje definidos en ningún lado del
  código ni de la conversación. **No se inventaron números.** Si Rezaga
  sí maneja una clasificación de rango como los demás materiales,
  Jesús necesita dar los valores reales (igual que existen para
  Núcleo/Secundaria/Berma/Coraza) antes de agregarlo al formulario de
  captura y a la auditoría de rangos (sección 20.2) — mientras tanto,
  `auditarRangosMaterial()` trata a Rezaga como "material fuera de
  catálogo, no se audita" (mismo comportamiento seguro que ya tenía
  con "ÁREA DE PREFABRICADOS"), así que no generará falsos positivos.

Verificado con `node --check` sobre el módulo extraído.

---

## 26. 19-jul-2026 — Editar ticket como sección aislada de Captura (sin fuga de estado) + Camiones Destare sin filtro por capturista

Jesús reportó 2 problemas reales probando en campo, actuando como
Six Sigma Black Belt / QA sobre la app:

### 26.1 — Campos bloqueados al editar (patrón recurrente, ver sección 24.1) + fuga de estado entre Editar y Captura nueva

**Los 2 síntomas reportados:**
1. Al editar un ticket, seguía habiendo "bloqueos" de campos (esta vez
   fue la fecha del 1er pesaje, la misma clase de bug que ya se corrigió
   2 veces antes — sección 17.1 con `fecha1`, sección 21 con `placas`;
   ver el patrón general documentado en la sección 24.1).
2. **Bug nuevo, más serio:** si el usuario entraba a "Editar" un ticket y
   se salía SIN guardar (cualquier otro botón del menú, incluido
   "Captura" para dar de alta un ticket nuevo), los valores del ticket
   que estaba editando se quedaban pegados en el formulario y
   "se autorellenaban" en lo que debía ser una captura nueva — porque
   Editar y Captura comparten el mismo formulario físico (`#tab-form`) y
   nada limpiaba el estado al salir sin guardar.

**Decisión de diseño — separación FUNCIONAL + VISUAL, no duplicar el HTML:**
Jesús pidió explícitamente "dos secciones completamente aisladas". Se
evaluaron 2 caminos:
- **(A) Duplicar todo el formulario** (~30 campos, todos los `oninput`/
  `onchange`, todas las funciones de auto-relleno) en una segunda copia
  exclusiva para editar.
- **(B) Blindar el formulario único** para que (i) sea IMPOSIBLE que se
  filtre estado entre editar y capturar, y (ii) sea VISUALMENTE
  inconfundible cuál modo está activo.

Se eligió **(B)**, y se lo explico directo porque es una decisión de
ingeniería, no solo seguir la instrucción al pie de la letra: la opción
(A) habría *duplicado* el mecanismo exacto que ya causó 3 bugs distintos
(sección 24.1) — con 2 copias del formulario, cada campo nuevo que se
agregue en el futuro habría que acordarse de tocarlo en los DOS lugares,
y la sección 24.1 ya demuestra que ese tipo de duplicación/reutilización
descuidada es la fuente #1 de bugs en esta app. La opción (B) resuelve el
problema de raíz (que el estado se filtre) sin duplicar superficie de
mantenimiento. Si después de probar esto Jesús prefiere igual la
duplicación completa, es un cambio identificado y acotado — no hay que
rediseñar nada, solo construir la segunda copia.

**Qué se implementó (opción B):**

1. **Blindaje funcional contra la fuga de estado** — en `showTab(t)`: si
   hay una edición activa (`window._editFid`) y se navega a CUALQUIER
   pestaña que no sea `'form'`, se cancela automáticamente
   (`clearForm()`) antes de cambiar de pestaña. Además, el botón de menú
   "Captura" ya no llama a `showTab('form')` directo — ahora llama a
   `irACapturaNueva()`, que cancela cualquier edición activa primero.
   Resultado: es **imposible** llegar a una captura nueva con datos de
   una edición todavía en los campos, sin importar por dónde se navegue.
2. **Banner de "modo edición"** — franja de color café/ámbar (deliberadamente
   distinta a cualquier otro color de la app) al inicio de `#tab-form`
   cuando `editRecord()` está activo: dice la boleta que se está editando,
   aclara "esto NO es una captura nueva... el viaje se sobrescribe, no
   se crea uno nuevo", y trae su propio botón "✕ Cancelar edición". El
   botón "Guardar registro" cambia a "Guardar cambios" mientras tanto.
   `clearForm()` oculta el banner y regresa el botón a su texto normal.
3. **`fecha1` vuelve a estar libre al editar** (ya se había corregido en
   18-jul, sigue igual — el problema que Jesús vio esta vez en las
   capturas de pantalla ya estaba resuelto en el código, era la versión
   vieja del archivo la que todavía lo tenía bloqueado).
4. **Auditoría completa de "candados de captura nueva" en `saveRecord()`**
   (lo que Jesús pidió como regla general — "se debe permitir editar
   absolutamente todo a libertad"): se revisó cada validación una por
   una. Se encontró y corrigió una: la verificación de que
   `fila_bascula_id` tenga `t3b_salida_ts` (evita crear un ticket
   "completo" sin haber pasado por el flujo de báscula) se estaba
   aplicando también al EDITAR un ticket que ya está completo — si el
   registro de Fila Báscula se había borrado después (limpieza, master
   quitando un duplicado), esto bloqueaba una simple corrección de texto
   en un ticket que de por sí ya pasó ese filtro al crearse. Ahora esa
   validación solo aplica a captura nueva (`!window._editFid`). El resto
   de las validaciones (boleta, folio, económico, material, banco,
   destino, tipo de camión, pesos) son reglas de negocio válidas para
   AMBOS casos — un ticket editado también debe tener todo eso, así que
   esas se dejaron igual a propósito.

**Reporta al mismo resumen:** confirmado, no se tocó — `saveRecord()` ya
distinguía correctamente `addDoc` (nuevo) vs `updateDoc` (edición,
sobreescribe el mismo documento) desde antes; ese comportamiento ya era
correcto.

### 26.2 — "Camiones Destare" ya no filtra por quién capturó el camión

Confirmado el escenario que describió Jesús: un camión puede tirar su
material con un capturista y regresar a destararse con OTRO capturista
(destare en cualquier báscula). Antes, "Camiones Destare" usaba el mismo
filtro `puedoVerRegistroFila()` que "Camiones con Material" — un
capturista solo veía ahí los camiones que ÉL había registrado, así que
no podía destarar el camión que llegó con otro compañero.

**Fix:** se quitó el filtro de `filtrarBuscadorDestare()` (la lista de
"Camiones Destare") — ahora cualquier capturista ve TODOS los camiones
esperando destare, sin importar quién los registró. Master sigue viendo
todo igual que siempre (no cambió nada para ese rol).

**No se tocó** (por instrucción explícita de Jesús — "esto solo aplica
aquí, no en la captura de camiones"):
- "Camiones con Material" (la lista de arriba en Fila Báscula, 1ra
  entrada/salida) — sigue filtrando por capturista.
- El desplegable de placas en Captura → Identificación
  (`poblarPlacasDisponibles()`) — sigue filtrando por capturista (esta
  es la regla original de la sección 12.2, sin relación con destare).

### 26.3 — De paso, bug preexistente encontrado y corregido (no reportado por Jesús)

Al revisar duplicados de `id` en todo el HTML antes de entregar (rutina
de la sección 24.4), se encontró `id="dash-fuente-actual"` repetido 2
veces dentro de la pestaña Gráficos — un `<div>` colgado sin ningún
código que lo actualizara (el único `document.getElementById` de ese id
en todo el JS solo alcanza al primero). Era HTML muerto, se quitó.

**Verificación antes de entregar:** sintaxis del módulo revalidada con
`node --check`; cero IDs de `id` duplicados en todo el archivo (antes de
esta sesión había 1: el de 26.3); se repasó cada validación de
`saveRecord()` una por una para confirmar cuáles son reglas de negocio
(aplican siempre) vs. candados de flujo de captura nueva (deben excluir
`window._editFid`).

**Pendiente de decisión de Jesús:** si después de probar el banner +
blindaje funcional (opción B) todavía se siente que hace falta la
separación literal en 2 pestañas distintas (opción A), es una segunda
entrega acotada — no bloquea nada de lo demás.

---

## 27. 20-jul-2026 — Placas al editar ya NO consulta Fila Báscula (causa real de 26.1) + Pendientes filtrado por quién destaró

Jesús probó en campo la separación de Captura/Editar (sección 26,
"opción B" — blindaje del formulario único) y encontró que el síntoma
seguía vivo, con evidencia clara en capturas de pantalla: al editar la
boleta #2, la fecha del 1er pesaje aparecía en blanco y Placas mostraba
"— Ninguno disponible, regístralo en Fila Báscula —" con la alerta "Debe
estar registrado en Fila Báscula con salida hacia el frente ya hecha" al
guardar — físicamente imposible en un ticket que ya completó ese ciclo
hace rato. Reportó también un segundo problema real de operación con
"Pendientes".

### 27.1 — Causa raíz real de 26.1: Placas seguía dependiendo de `fila_bascula` al editar

La sección 26 blindó la fuga de estado ENTRE Editar y Captura (banner,
`irACapturaNueva()`, cancelación al navegar) — eso sí funciona. Pero no
tocó la causa de fondo del síntoma de fecha1/placas: `editRecord()`
todavía intentaba resolver el campo Placas consultando `fila_bascula`
(por `fila_bascula_id`, o repoblando "camiones disponibles ahora" si no
había liga) — el mismo patrón recurrente de la sección 24.1. Un ticket ya
completo casi nunca sigue "disponible" en Fila Báscula (su camión ya
liberó la placa o el registro se cerró/borró), así que esa consulta
**no tiene ningún sentido de negocio al editar** — el dato real ya vive
guardado en el propio ticket (`r.placas`, `r.fecha1`, `r.economico`).

**Fix de raíz (no otro parche sobre el mismo síntoma):** Placas deja de
ser, al editar, un `<select>` ligado a disponibilidad de Fila Báscula.
Se agregó un input de texto libre exclusivo para edición
(`f-placas-edit`, dentro de `wrap-placas-edit`), separado del `<select
id="f-placas">` de captura nueva (ahora envuelto en
`wrap-placas-captura`) — mismo patrón de aislamiento por campo que ya
usa el banner de modo edición, sin duplicar el resto del formulario.
`editRecord()` ya NO llama a `poblarPlacasDisponibles()` ni a
`dbFilaBasculaLeer()` para nada — solo asigna directo
`f-placas-edit.value = r.placas` y dea `f-fila-bascula-id` tal cual
estaba (no se re-liga ni se re-valida). Como resultado:
- `fecha1` ya no se puede borrar por este camino — nunca se vuelve a
  tocar después de asignarse desde `r.fecha1`.
- El económico tampoco se ve afectado.
- El mensaje de validación de Placas en `saveRecord()` ahora distingue
  modo: en captura nueva sigue pidiendo Fila Báscula; al editar
  (`window._editFid`) solo pide "Ingresa las placas del camión."
- El `<select id="f-tipo-camion">` ya no dispara
  `poblarPlacasDisponibles()` mientras se edita (`onchange="if
  (!window._editFid) poblarPlacasDisponibles();"`), para que cambiar el
  tipo de camión al corregir un ticket no vuelva a intentar tocar Fila
  Báscula.
- `clearForm()` regresa Placas al modo captura (oculta
  `wrap-placas-edit`, muestra `wrap-placas-captura`, limpia el texto
  libre) para el siguiente ticket nuevo.

**Nota de diseño para la próxima IA que retome esto:** los candados de
`saveRecord()` que sí dependían de `fila_bascula_id` (2da salida de fila,
candado de doble reserva) YA estaban correctamente excluidos con
`!window._editFid` desde la sección 26 — no hicieron falta cambios ahí,
la única pieza rota era la construcción del campo Placas dentro de
`editRecord()`. Aplica la lección de 24.1: antes de tocar/agregar un
campo en `editRecord()`, verificar que NINGUNA función pensada para
captura nueva (`poblarPlacasDisponibles`, `autorellenarDesdeFilaBascula`,
cualquier lectura de `fila_bascula`) quede en su camino.

### 27.2 — "Pendientes" ahora solo muestra a cada capturista lo que ÉL destaró

Escenario real confirmado por Jesús: 3 capturistas (uno de ellos en una
báscula dedicada solo a destare) pueden destarar camiones que capturó
cualquiera de los otros — eso ya funciona bien desde la sección 26.2
("Camiones Destare" sin filtro por capturista). El problema aparecía un
paso después: en **Pendientes**, los 3 capturistas veían los 3 camiones
por igual, aunque solo quien destaró cada uno tiene el peso real
enfrente para teclearlo — ver la lista completa no aporta nada y es
riesgo de captura fuera de secuencia (alguien completando, sin querer o
por confusión, el pesaje de un camión que no destaró él).

**Fix:**
1. `registrarSalidaFilaSegunda()` ("🟡 Destarado") ahora guarda también
   `destarado_por: currentUser.uid` en el documento de `fila_bascula`.
2. Nueva función `puedeVerPendiente(r)` (junto a `puedoVerRegistroFila()`,
   mismo criterio de roles): admin/coordinador/master ven todo, igual
   que siempre. Para capturista: si el camión ya tiene `t3b_salida_ts`
   (ya destarado), solo lo ve quien lo destaró
   (`fila.destarado_por === uid`) — salvo que sea un destare de ANTES de
   este cambio, sin `destarado_por` guardado, en cuyo caso se deja
   visible para todos (no esconder pendientes viejos sin dueño
   registrado). Si todavía no se destara, se ve por quien lo capturó
   originalmente (`r.creadoPor`), igual que ya era el comportamiento
   implícito de bloqueo por estado.
3. `renderPendientes()` aplica el filtro:
   `db.filter(r => (...) && puedeVerPendiente(r))`.

**Verificación antes de entregar:** `node --check` sobre el módulo
principal extraído (2 `<script type="module">`, se probó el primero,
que es el real — el 2do es chico y suelto, falso positivo conocido de
la extracción ingenua, ver sección 24.4); cero IDs duplicados en todo
el archivo (`f-placas-edit`, `wrap-placas-captura`, `wrap-placas-edit`
son los 3 IDs nuevos, verificados únicos).

---

## 27.3 — 20-jul-2026 (mismo día, con evidencia en foto) — Económico y fecha1 TODAVÍA se borraban al editar: 2do disparador de `poblarPlacasDisponibles()` encontrado en `showTab()`

Jesús probó 27.1 con capturas de pantalla reales (boleta #260341242366):
Placas ya funcionaba perfecto (mostraba "ND7337D" correctamente, el fix
de 27.1 sí sirvió), pero **Económico** y **Fecha 1er pesaje** seguían
apareciendo en blanco al entrar a editar — obligando a volver a
teclearlos a mano cada vez, justo el "trabajo doble" que se quería
eliminar.

**Causa real (distinta a la de 27.1, no era la misma repetida):**
`editRecord()` llama a `showTab('form')` como su ÚLTIMO paso. `showTab()`
tiene esta línea, pensada para captura nueva (si vuelves a la pestaña
Captura y ya habías elegido tipo de camión, refresca qué placas siguen
disponibles):
```js
if (t === 'form' && document.getElementById('f-tipo-camion').value) poblarPlacasDisponibles();
```
Como `editRecord()` ya puso `'VOLTEO'` (o lo que sea) en `f-tipo-camion`
ANTES de llamar a `showTab('form')`, esta condición se cumplía también
al editar — disparando `poblarPlacasDisponibles()` una SEGUNDA vez, por
una vía que no estaba mapeada en 27.1. Esa función borra
`fila_bascula_id`/económico/fecha1 sin condición al arrancar (para dejar
el formulario "limpio" antes de repoblar). Como en modo edición el
`<select id="f-placas">` real está oculto (27.1 ya lo desconectó), el
síntoma no se veía ahí — pero económico y fecha1 sí se seguían borrando,
porque esos campos son compartidos por los dos modos.

**Fix:** mismo patrón que el `onchange` de tipo de camión (27.1) — se
excluye el modo edición:
```js
if (t === 'form' && !window._editFid && document.getElementById('f-tipo-camion').value) poblarPlacasDisponibles();
```

**Lección para la próxima IA (refuerza 24.1):** `poblarPlacasDisponibles()`
tenía DOS puntos de entrada distintos, no uno — el `onchange` del select
y esta línea suelta dentro de `showTab()`. Antes de dar por cerrado un
bug de "función de captura nueva se ejecuta durante edición", conviene
un `grep` de TODOS los call sites de la función sospechosa (no solo el
más obvio), exactamente como se hizo aquí después del reporte. Se
repitió ese `grep` sobre `poblarPlacasDisponibles()` completo y se
confirmó que ya no queda ningún disparador sin proteger: el `onchange`
del tipo de camión, esta línea de `showTab()`, y la llamada dentro de
`clearForm()` (esa sí debe correr siempre, es la que deja limpia la
pestaña para el siguiente ticket nuevo).

**Verificación antes de entregar:** `node --check` OK, cero IDs
duplicados.

---

## 28. 20-jul-2026 — El gesto de "deslizar atrás" (Android/iOS) cerraba la app en vez de regresar a la pantalla anterior

Jesús reportó que, parado en Editar, el gesto nativo del celular para
"regresar" (deslizar desde el borde, o el botón atrás de Android) le
cerraba la app entera en vez de mandarlo a Base de Datos.

**Causa:** ese gesto no es algo que la app controle directamente — es
navegación real del navegador (dispara `popstate`). Como la app nunca
metía nada al historial del navegador (`history.pushState`/
`replaceState`), no había ninguna entrada "anterior" a la que regresar
dentro de la app — el sistema simplemente hacía lo único que podía:
cerrar/salir.

**Fix:** `showTab(t, opts)` ahora lleva su propio manejo de historial:
- Navegación normal entre pestañas del menú → `history.replaceState`
  (no acumula). Igual que en una app nativa, deslizar atrás parado en
  una pestaña principal del menú puede seguir cerrando la app — eso es
  esperado, no es el bug reportado.
- Entrar a Captura/Editar (`irACapturaNueva()` / `editRecord()`, ambas
  ahora llaman `showTab('form', {push:true})`) → `history.pushState`,
  mete una entrada nueva. Así, deslizar atrás desde ahí cae en la
  pestaña de donde se vino (normalmente Base de Datos) en vez de salir.
- Nuevo listener `popstate` (justo después de `showTab()`): captura ese
  regreso real del sistema y llama `showTab(t, {fromPopstate:true})`
  para no volver a tocar el historial (evitaría que el gesto solo
  funcionara la primera vez).
- Como bono: al guardar (éxito) o cancelar una edición, esas rutas usan
  `showTab(..., )` sin `push` (replaceState) — la entrada de "Editar" se
  reemplaza en vez de apilarse, así que no quedan entradas fantasma del
  formulario ya guardado/cancelado esperando en el historial.
- El aviso de "salida de 'form' con edición activa sin guardar cancela
  sola" (sección 19/25) sigue aplicando igual cuando el cambio de
  pestaña viene del gesto de atrás, porque pasa por la misma función
  `showTab()`.

**Alcance de esta entrega:** solo se instrumentó el entrar/salir de
Captura-Editar (era el caso reportado). Los modales (detalle de ticket,
confirmaciones) NO están todavía enganchados al historial — deslizar
atrás con un modal abierto se comporta igual que antes. Si en campo
resulta molesto, es una segunda entrega acotada (mismo patrón:
`pushState` al abrir el modal, cerrarlo desde el listener de
`popstate`).

**Verificación antes de entregar:** `node --check` OK, cero IDs
duplicados.

---

## 29. 20-jul-2026 — El fix del gesto de "atrás" (sección 28) se extiende a TODOS los overlays de la app

Jesús pidió, con razón, que el fix de la sección 28 (que solo cubría
entrar/salir de Captura-Editar) se hiciera bien desde un inicio para
TODOS los modales — detalle de ticket, barcaza, económico obligatorio, y
el menú lateral —, no solo para uno.

**Diseño generalizado:** `window._activeOverlay` guarda cuál overlay
está abierto ahora mismo (`'ticket' | 'barcaza' | 'economico' | 'menu' |
null`). Cada función que ABRE un overlay llama a `_pushOverlayState(nombre)`
(mete una entrada nueva al historial). Cada función que lo CIERRA por
una vía normal (botón X, tocar fuera del modal, elegir una opción,
seleccionar un nav-item del menú) llama a `_cerrarOverlayHistorial(nombre)`
(reemplaza esa entrada por una simple de la pestaña actual, para no
dejar entradas fantasma). El listener de `popstate` (el que atiende el
gesto real del sistema) queda genérico: si hay un overlay abierto y el
historial ya se movió lejos de su entrada, solo le hace la limpieza
visual — reusando las mismas funciones de cierre normales
(`closeModalForce`, `cerrarBarcazaModal`, `cerrarMenuLateral`), porque
`_cerrarOverlayHistorial` se vuelve un no-op seguro cuando el historial
ya no apunta a ese overlay (o sea, cuando fue el propio gesto el que lo
movió) — no hizo falta duplicar lógica de cierre en dos versiones.

Se conectaron los 4 overlays existentes en la app:
- **Detalle de ticket** (`openModal`/`closeModalForce`).
- **Detalle de barcaza** (`abrirBarcazaModal`/`cerrarBarcazaModal`).
- **Menú lateral** (`abrirMenuLateral`/`cerrarMenuLateral`).
- **Económico obligatorio** (`abrirEconomicoModal`/`resolverEconomicoModal`)
  — con una excepción deliberada: como es una decisión obligatoria (le
  falta el # económico al camión) y a propósito NO tiene botón de
  cancelar ni "tocar fuera para cerrar", el gesto de atrás NO lo cierra
  — se re-apila de inmediato para que se quede abierto. Dejar que el
  gesto lo saltara sería una puerta trasera para guardar un ticket sin
  ese dato obligatorio.

**Nota técnica para la próxima IA:** el archivo mezcla un
`<script type="module">` (líneas ~412–2427, ahí viven `openModal`,
`editRecord`, `saveRecord`, `getFormData`) con dos `<script>` normales
(uno chico ~2501–2525, y el grande ~4070–9374, ahí viven `showTab`,
`closeModalForce`, `abrirBarcazaModal`, el menú lateral, y ahora todo lo
de esta sección). Un módulo tiene su propio scope para lo que ÉL declara
arriba, pero la resolución de nombres que NO declara sigue cayendo en el
objeto global (`window`) compartido con los `<script>` normales — por
eso `openModal()` (adentro del módulo) puede llamar en frío a
`_pushOverlayState(...)` aunque esa función se declare más abajo, en el
`<script>` normal: en tiempo de ejecución (cuando de verdad se hace
clic) ya se cargó y registró todo. Esto ya se venía usando en el código
original (`editRecord()` ya llamaba a `closeModalForce()` así) — se
mantuvo el mismo patrón, no se inventó uno nuevo. Ojo: esto SOLO
funciona en ese sentido (módulo → global); al revés (un `<script>`
normal llamando algo declarado únicamente dentro del módulo, sin que el
módulo lo haya expuesto con `window.algo = ...`) sí fallaría.

**Verificación antes de entregar:** se extrajeron y validaron con
`node --check` los 3 bloques de script reales del archivo (el módulo y
los 2 `<script>` normales — la extracción por regex reporta a veces un
4to bloque falso positivo por un comentario que menciona literalmente
"`<script>`" en texto, ver sección 24.4, no es un bug real); cero IDs
duplicados en todo el archivo.

---

## 30. Guía maestra de metodología — léela junto con las secciones 0, 2, 8 y 24

Esta sección no reemplaza a la 0 (contexto), 2 (lección de cupo de
Firestore), 8 (guía de continuidad) ni 24 (patrones de bugs recurrentes
+ mapa de funciones) — las complementa con lo que se aprendió en la
sesión del 20-jul-2026, y las junta en un solo lugar para que una IA
nueva no tenga que reconstruir el criterio desde cero leyendo 30
secciones sueltas.

### 30.1 — Mapa rápido de arquitectura (para orientarse en minutos, no horas)

- Un solo archivo, `index.html`, sin build ni bundler. Backend
  Firebase/Firestore. Es una PWA instalable (Android/iOS).
- Navegación tipo SPA: una sola función `showTab(t, opts)` controla qué
  pestaña se ve. No hay "páginas" separadas ni rutas de servidor.
- **El archivo mezcla 3 bloques de `<script>` con reglas de scope
  distintas** — esto ya causó una duda real en la sección 29:
  - `<script type="module">` (~línea 412–2427): aquí viven `openModal`,
    `editRecord`, `saveRecord`, `getFormData`.
  - Dos `<script>` normales (uno chico ~2501–2525, uno grande
    ~4070–9374): aquí viven `showTab`, `closeModalForce`,
    `abrirBarcazaModal`, el menú lateral, Fila Báscula, Pendientes,
    Tendencia, etc. — la mayoría del código vive aquí.
  - Un módulo puede llamar en frío (sin `window.`) a una función
    declarada en un `<script>` normal, porque la resolución de nombres
    no declarados en el módulo cae al objeto global compartido — PERO
    al revés (un `<script>` normal llamando algo que solo existe dentro
    del módulo) si truena, a menos que el módulo lo haya expuesto
    explícitamente con `window.algo = ...`. Antes de mover una función
    de un bloque a otro, o de llamar algo "a secas" desde un lugar
    nuevo, ubica primero en qué bloque vive cada cosa (`grep -n` de la
    definición y de los 3 `<script`/`</script>` de la sección 24.4/30.4).
- **4 overlays existen hoy** (detalle de ticket, detalle de barcaza,
  económico obligatorio, menú lateral), todos enganchados al historial
  del navegador para que el gesto de "atrás" del sistema no cierre la
  app (sección 29). Cualquier modal NUEVO que se agregue debe seguir el
  mismo patrón (`_pushOverlayState('nombre')` al abrir,
  `_cerrarOverlayHistorial('nombre')` al cerrar) — si no, va a
  reintroducir exactamente el bug de la sección 28/29.
- **Ciclo de vida real de un ticket:** Fila Báscula (entrada + salida) →
  Captura (1er pesaje, boleta/folio/placas/material/destino) →
  Pendientes (2do pesaje/destare — puede pasar en CUALQUIER báscula,
  con un capturista distinto al que hizo el 1er pesaje, sección 26.2) →
  aparece en Base de Datos, Resumen, Reportes, Acopios. **Editar** es
  una sección funcionalmente aislada de Captura (mismo formulario físico
  pero blindado contra fuga de estado, sección 26) que sobrescribe el
  mismo documento — nunca crea uno nuevo.
- Roles reales (minúsculas, no `'MASTER'`): ver sección 1. Capturista
  normalmente solo ve lo que él mismo registró — **excepto en "Camiones
  Destare"**, donde ve todo (sección 26.2), y en "Pendientes", donde
  solo ve lo que él mismo destaró (sección 27.2). Esas dos excepciones
  al mismo patrón general son fáciles de romper sin querer si se toca
  `puedoVerRegistroFila()`/`puedeVerPendiente()` sin leer por qué son
  distintas.

### 30.2 — Disciplina de "causa raíz", no de "parche al síntoma"

Esto ya estaba en la sección 24.1, pero la sesión del 20-jul-2026 lo
reforzó con un ejemplo muy claro (sección 27.3): el primer intento de
arreglar "económico/fecha1 se borran al editar" (sección 27.1) sí
resolvió una causa real, pero había una SEGUNDA vía de entrada al mismo
síntoma (una línea suelta dentro de `showTab()`) que no se detectó hasta
que Jesús probó en campo y mandó capturas de pantalla mostrando que el
bug seguía vivo.

**Regla:** cuando encuentres la función que causa un bug, antes de darlo
por cerrado, corre `grep` de **todos los call sites** de esa función
(no solo el que llevó al bug a simple vista) y verifica cada uno. Un
mismo mecanismo problemático casi siempre tiene más de una puerta de
entrada en un archivo de +9,000 líneas con años de parches encima.

### 30.3 — Alcance completo desde la primera entrega, no solo el caso reportado

Lección de la sección 28→29 en la misma sesión: el primer fix del gesto
de "atrás" solo cubrió Captura/Editar (el caso que Jesús reportó
literalmente). Jesús tuvo que pedir explícitamente "hazlo con todas los
modales" — con razón, porque el mismo mecanismo (falta de historial de
navegador) aplicaba igual de mal a los otros 3 overlays de la app, y
detectar eso no dependía de que él probara cada uno por separado, sino
de que quien programa se pregunte "¿este patrón de bug/fix aplica en
otro lado de la app aunque no me lo hayan pedido ahí?" **la primera
vez**, no hasta que lo señalen.

**Regla:** al recibir un reporte puntual, identifica el **mecanismo**
general detrás (no el caso particular), y evalúa explícitamente si ese
mecanismo se repite en otras partes de la app antes de entregar. Si
decides NO extender el fix a otros lugares similares, dilo explícito en
la respuesta y en la bitácora (con la razón), en vez de dejar que Jesús
lo descubra después y tenga que volver a pedirlo.

### 30.4 — Cómo interpretar los reportes de Jesús

- Prueba en campo real: celular, camiones reales, básculas reales, y
  manda capturas de pantalla como evidencia. Tómalas literalmente —
  cuando algo se ve en blanco en la foto, está en blanco; no asumas que
  es un problema de la captura de pantalla o algo cosmético.
- Cuando describe una secuencia operativa ("llega a fila, sale de fila,
  captura, vuelve a llegar a fila, destara..."), es el flujo real de la
  obra, no un caso hipotético de esquina — trátalo como especificación,
  no como anécdota.
- Su fraseo es casual y a veces coloquial ("de qué le sirve...",
  "cereza del pastel", "me explico?") pero la observación técnica detrás
  casi siempre es precisa. No la suavices, no la reinterpretes "para que
  tenga más sentido", y no asumas que quiso decir algo más simple de lo
  que escribió — si de plano hay ambigüedad real, pregunta con opciones
  concretas en vez de adivinar.
- Si dice "creo que ya lo habíamos corregido" y no hay evidencia clara
  en la bitácora, dilo honestamente en vez de asumir que sí se hizo —
  y ofrece verificar contra el código actual.
- Espera que, antes de programar, se entienda el impacto en **todo el
  ciclo** del ticket (Fila Báscula → Captura → Pendientes →
  Resumen/Reportes/Acopios/Bot de Telegram), no solo el campo puntual
  que menciona — varias correcciones reales terminaron tocando 2–3
  puntos relacionados (secciones 26, 27, 27.3, 29).
- Espera trabajo terminado y verificado, no una entrega a medias que
  "probablemente funciona" — de ahí la molestia explícita cuando el
  mismo síntoma reapareció en 27.3 y cuando el alcance quedó corto en
  28. La forma de evitarlo es 30.2 + 30.3, no prometer menos.

### 30.5 — Checklist obligatorio antes de decir "listo, ya quedó"

1. ¿Se buscaron **todos** los call sites del mecanismo que se tocó
   (`grep` amplio, no solo el que se ve a simple vista)? (30.2)
2. ¿Este mismo patrón de bug/necesidad existe en otro lugar de la app
   que no se mencionó explícitamente pero comparte el mecanismo?
   Corregirlo también, o decir explícitamente por qué no. (30.3)
3. Verificación de sintaxis y de IDs — el comando de la sección 24.4
   solo cubre el `<script type="module">`; el archivo también tiene 2
   `<script>` normales con lógica real (30.1), así que desde esta
   sesión la verificación completa es:
   ```bash
   python3 -c "
   import re
   html = open('index.html', encoding='utf-8').read()
   mods = re.findall(r'<script type=\"module\">(.*?)</script>', html, re.S)
   open('mod0.mjs','w',encoding='utf-8').write(mods[0])
   plains = re.findall(r'<script>(.*?)</script>', html, re.S)
   for i,p in enumerate(plains):
       open(f'plain{i}.js','w',encoding='utf-8').write(p)
   "
   node --check mod0.mjs
   for f in plain*.js; do node --check "$f"; done
   grep -o 'id="[^"]*"' index.html | sort | uniq -c | sort -rn | awk '$1>1'
   ```
   La extracción por regex de los `<script>` normales a veces genera un
   bloque falso positivo cuando un comentario del código menciona
   literalmente el texto "`<script>`" (pasó ya, ver 24.4) — si un bloque
   da error, ábrelo primero y confirma si es texto de comentario cortado
   a la mitad antes de asumir que es un bug real.
4. Nunca editar directo en `/mnt/user-data/uploads/` (solo lectura):
   copiar a `/home/claude/`, editar ahí, copiar el resultado final a
   `/mnt/user-data/outputs/`.
5. ¿Se actualizó este archivo (fecha, qué se tocó, qué NO se tocó y por
   qué, y la lección para la próxima IA si aplica) **antes** de entregar
   los archivos al usuario, no después?
6. "Una fase por entrega" (sección 0/8) sigue aplicando — resolver en
   una misma entrega las partes de un mismo reporte está bien (como en
   esta sesión), pero no mezclar con trabajo pendiente de otras
   secciones (ver 19.1, 19.4) sin que se pida explícitamente.

---

## 32. 21-jul-2026 — Batch grande de 13 correcciones/features (CONFIRMADO, listo para código)

Jesús mandó una lista de 13 pedidos en un solo mensaje y pidió
explícitamente: (1) preguntar todo lo necesario ANTES de escribir este
archivo, (2) entregar este archivo ANTES de tocar `index.html`. Se
hicieron 3 rondas de preguntas (9 en total) — esta sección ya recoge
las respuestas confirmadas, no son propuestas abiertas. **No se ha
tocado `index.html` con nada de esto todavía** — el modo nocturno
(sección 31) se había quedado a medias (paleta + detección automática
sí están, falta el interruptor manual en el menú + verificación) y se
retoma junto con este batch en la siguiente entrega de código.

### 32.1 — Destare a prueba de errores

Las DOS medidas juntas (confirmado, no una u otra):
- "Camiones Destare" se divide en 2 bloques por capturista: **"Tus
  camiones"** (los que él capturó en peso bruto — mismo criterio que ya
  usa `puedoVerRegistroFila()`) y **"Otros camiones"** (el resto).
- Al dar clic en "Entra a fila" (segunda entrada, para destare) sobre
  CUALQUIER camión, diálogo de confirmación antes de reclamarlo.

### 32.2 — Bug de permisos capturista2 al completar destare — CAUSA RAÍZ CONFIRMADA

Con las reglas reales de Firestore ya revisadas, la causa **no** es de
UI ni de `puedoVerRegistroFila()` — es la regla de `update` de
`acarreos`:
```
allow update: if estaAutorizado()
  && (
    rol() in ['coordinador', 'admin', 'master']
    || (rol() == 'capturista' &&
        (!resource.data.keys().hasAny(['creadoPor']) || resource.data.creadoPor == request.auth.uid))
  )
  && camposConceptoValidos(request.resource.data);
```
Un capturista **solo puede actualizar un ticket si `creadoPor` es él
mismo** (o el ticket es viejo y no tiene `creadoPor`). Cuando
Capturista2 intenta completar (`completarPendiente()`, que hace
`update` sobre el doc de `acarreos`) un ticket cuyo `creadoPor` es
Capturista1, Firestore lo rechaza — de ahí el "no tiene permisos". Esto
es EXACTAMENTE lo que el diseño de la sección 26.2/27.2 ya asumía que
podía pasar (destare en cualquier báscula, por cualquier capturista) —
pero nunca se ajustó la regla de escritura para permitirlo, solo la
lectura/visibilidad en la UI.

**Fix propuesto (pendiente de escribir en `firestore.rules`, Jesús
tiene que desplegarlo él mismo desde la consola de Firebase — Claude no
tiene acceso a desplegar reglas):**
```
// NUEVO — permite completar un pendiente a quien hizo el destare
// (fila_bascula.destarado_por), aunque no sea quien creó el ticket.
function fueDestaradoPorMi(data) {
  return 'fila_bascula_id' in data && data.fila_bascula_id != ''
    && get(/databases/$(database)/documents/fila_bascula/$(data.fila_bascula_id)).data.destarado_por == request.auth.uid;
}

allow update: if estaAutorizado()
  && (
    rol() in ['coordinador', 'admin', 'master']
    || (rol() == 'capturista' &&
        (!resource.data.keys().hasAny(['creadoPor'])
         || resource.data.creadoPor == request.auth.uid
         || fueDestaradoPorMi(resource.data)))
  )
  && camposConceptoValidos(request.resource.data);
```
Depende de `fila_bascula.destarado_por`, campo que ya se agregó en la
sección 27.2 (`registrarSalidaFilaSegunda`) — así que esto funciona
solo, sin migrar datos viejos, para cualquier destare hecho DESDE esa
sección en adelante. Un destare de antes de 27.2 (sin `destarado_por`)
seguirá bloqueado para quien no sea el creador original o
coordinador/admin/master — caso raro, aceptable, no se migra histórico.

### 32.3 — Colección "Flota" — CONFIRMADA

Jesús lo adivinó bien y el propio comentario en las reglas lo confirma
literalmente: es el registro persistente placa → económico
(`flota/{placasId}`, doc ID = la(s) placa(s)), que sirve para (a)
autorellenar el económico al elegir una placa ya conocida, y (b)
detectar si un económico ya está asignado a otra placa (pokayoke contra
duplicados). Existe desde el 18-jul-2026. **No requiere ningún cambio**
— se documenta aquí solo para que quede registrado qué es y no se
vuelva a preguntar.

### 32.4 — Bloqueo exclusivo del camión al reclamarlo para destare

- Al dar clic en "Entra a fila" (segunda), el camión desaparece de
  "Otros camiones" para los demás capturistas — exclusivo de quien lo
  reclamó. Requiere un campo NUEVO en `fila_bascula` (no existía):
  `reclamado_por` (uid), guardado en `registrarEntradaFilaSegunda()` —
  mismo patrón que `destarado_por` (sección 27.2) pero un paso antes.
  La UI de "Camiones Destare" (`filtrarBuscadorDestare()`, sección
  26.2) deja de mostrar sin filtro: ahora, un camión con `reclamado_por`
  ya puesto solo lo ve ese capturista (y admin/coordinador/master,
  siempre — confirmado). Uno SIN reclamar sigue viéndose por todos
  (para que cualquiera lo pueda tomar primero).
- Admin/coordinador/master ven y operan todo siempre, sin bloqueo
  (confirmado).
- Al dar clic en "Destarado", el camión desaparece por completo de
  "Camiones Destare" (para todos, incluido quien lo reclamó) y pasa a
  **Capturar Destare** (antes "Pendientes").
- **Autoliberar (confirmado):** quien reclamó el camión (además de
  master/admin) puede "soltarlo" si se equivocó — un botón tipo
  "↩️ Liberar" visible SOLO para quien tiene `reclamado_por == su uid`
  (y siempre para master/admin), que limpia `reclamado_por` y regresa
  el camión a "Otros camiones" para todos.

### 32.5 — Rename "Pendientes" → "Capturar Destare"
Todas las referencias visuales (nav-drawer, títulos de pestaña,
mensajes al usuario). Los nombres internos de función/variable
(`renderPendientes`, `puedeVerPendiente`, `tab-pendientes`, etc.) **NO**
se renombran — sería puro riesgo de romper algo por cosmética interna,
sin ningún beneficio visible para Jesús. Regla general: rename de texto
visible sí, rename de identificadores de código no, salvo que se pida
explícito.

### 32.6 — Rename "Captura" → "Capturar Peso Bruto"
Mismo criterio que 32.5: solo texto visible.

### 32.7 — Nueva pestaña "Auditar"
Vista/modal dentro de la app (confirmado, no pestaña nueva del
navegador), con 4 botones:
- **Económicos duplicados**: mismo # económico, placas distintas,
  excluye vacío y "S/N".
- **Camiones sin # económico**: vacío o "S/N".
- **Revisar rangos inválidos**: boletas cuyo rango no existe en el
  catálogo para ese material — ver 32.8, se fusiona con lo ya existente
  de Six Sigma.
- **Revisar ciclos muy largos**: entrada a fila (peso bruto) → salida
  de destare (`t3b_salida_ts`), diferencia > 3 horas.

### 32.8 — "Auditar Rangos" (Six Sigma) → se mueve y fusiona
Confirmado: es el mismo análisis que "Revisar rangos inválidos". Se
reubica el existente dentro de "Auditar" (no se programa dos veces). Al
tocar el código, localizar la implementación actual dentro de la
pestaña Six Sigma antes de escribir nada nuevo.

### 32.9 — Reorganización del menú lateral
"Fila Báscula" pasa a "Trabajo diario". Propuesta (Jesús puede
ajustarla en la próxima ronda si algo no le acomoda):
- *Trabajo diario*: Capturar Peso Bruto, Fila Báscula, Camiones
  Destare, Capturar Destare.
- *Consulta*: Resumen, Reportes, Base de datos.
- *Analítica*: Suministros, Avances, Acopios, Bancos, Metas.
- *Herramientas*: Excel, 6 Sigma, Tendencia, **Auditar** (nueva).
- *Administración*: Admin.

### 32.10 — PDF de Bancos
Agregar fila de promedio ton/viaje por banco+material también de forma
INTERMEDIA (después de cada combinación banco/material en la tabla),
no solo al final como ya está.

### 32.11 — Orden de materiales en gráficos de Metas
Núcleo > Berma de Apoyo > Berma > Secundaria 1 > Secundaria 2 > Coraza
— aplica DENTRO de cada Cuerpo (ver 32.12).

### 32.12 — "Morro" como Cuerpo nuevo + mini-módulo de piezas (Core Locs)

No es un material — es un Cuerpo nuevo (como ya existen Cuerpo 1,
Cuerpo 2... dentro de Metas, confirmado que esa agrupación ya existe
hoy), con su propio set completo de materiales medidos en toneladas:
Núcleo, Berma de Apoyo, Berma, Secundaria 1, Secundaria 2 (mismo orden
de 32.11).

**Coraza en Morro y Cuerpo 5 es un mini-módulo aparte (CONFIRMADO,
construir desde cero — no existe nada hoy):** son Core Locs, se
cuantifican por PIEZA, no por tonelada, y no pasan por el flujo normal
de báscula/ticket. Diseño propuesto para esta primera versión (si algo
no cuadra, se ajusta en código sin bloquear el resto del batch):
- Un formulario simple de captura — **"Piezas de Coraza (Core Locs)"**,
  visible dentro de Metas (o Admin) para los roles que ya pueden
  capturar (capturista, coordinador, admin, master) — con: Cuerpo
  (Morro / Cuerpo 5), fecha, cantidad de piezas colocadas ese día.
  Cada captura es un registro nuevo (no se sobrescribe), igual que un
  ticket normal — así se puede editar/corregir un día puntual sin
  perder el histórico.
- Catálogo: se agrega una "meta en piezas" configurable por Cuerpo
  (Morro, Cuerpo 5) en el mismo lugar donde ya se configuran las metas
  en toneladas de los demás materiales.
- En la tabla de Metas, la fila de Coraza para Morro/Cuerpo 5 usa las
  mismas 8 columnas de 32.13 pero en PIEZAS en vez de toneladas (mismo
  semáforo, mismos umbrales de %) — no se mezcla con los totales en
  toneladas de los demás materiales de ese Cuerpo.
- Nueva colección de Firestore sugerida: `piezas_coraza` (o similar),
  con reglas espejo de `acarreos` (create: rol capturable +
  creadoPor==uid; update: coordinador/admin/master cualquiera,
  capturista solo lo suyo; delete: solo master) — Jesús deberá
  desplegar esa regla nueva igual que la de 32.2.

### 32.13 — Columnas de Metas (nuevo orden), por material dentro de cada Cuerpo — DEFINICIÓN FINAL
```
Meta mes | Real mes | 🚦(mes) | Meta acumulada hoy | Real acumulado hoy | 🚦(hoy) | Meta total (catálogo) | % Avance Total
```
- **Real mes** = lo registrado SOLO en el mes en curso (sin meses
  anteriores). **Real acumulado** = lo registrado desde siempre,
  sumando meses anteriores (avance de todo el proyecto a la fecha).
  Confirmado, son dos datos distintos.
- **Meta acumulada hoy — CONFIRMADO, opción (a):** también es
  acumulada de TODO el proyecto a la fecha, no solo del mes en curso.
  Fórmula: suma de las metas mensuales de todos los meses YA CERRADOS
  (completos) + la porción prorrateada del mes en curso (Meta mes ×
  días hábiles transcurridos ÷ días hábiles totales del mes). Así sí
  pareja de forma justa contra "Real acumulado" (ambos son del
  proyecto completo a la fecha).
- 🚦(mes) compara Meta mes vs Real mes. 🚦(hoy) compara Meta acumulada
  hoy vs Real acumulado. Mismos umbrales en los dos: ≥90% verde,
  70–89% amarillo, <70% rojo (confirmado).
- Días hábiles = L–S, excluyendo domingos y días festivos oficiales de
  México (confirmado). Lista a usar (Art. 74 LFT): 1-ene, 1er lunes de
  feb, 3er lunes de mar, 1-may, 16-sep, 3er lunes de nov, 25-dic (y
  1-dic cada 6 años, próxima 2030, sin impacto inmediato). **Sigue
  pendiente confirmar si hay paros/festivos locales de la obra que
  también deba excluir** — si no dice nada Jesús, se programa solo con
  esta lista oficial y se ajusta después si hace falta (no bloquea).
- "Meta total" = total del catálogo (todo el proyecto, no el mes).

### 32.14 — Único punto realmente abierto
Festivos/paros locales de obra además de los oficiales de México
(32.13) — no bloquea el inicio del código, se puede agregar después si
aplica.

**Con esto, el batch de 13 puntos queda completamente especificado y
listo para pasar a código.** Antes de tocar `index.html` se retoma
también el cierre pendiente del modo nocturno (sección 31: falta el
interruptor manual en el menú lateral + verificación final).

---

*Regla de disciplina (igual que `BOT.MD`): una fase por entrega, y este
archivo se actualiza SIEMPRE que se cierre o se modifique un paso, antes
de pasar a la siguiente fase.*

---

## 33. 21-jul-2026 — Batch de 13 (sección 32): Fase 1 implementada

Del batch de 13 puntos confirmado en la sección 32, se implementó hoy la
**Fase 1**: los puntos autocontenidos, de bajo riesgo y sin dependencias
con features todavía no construidas. Verificado contra `index.html` real
antes de tocar código (regla 24.4) y sintaxis validada con `node --check`
sobre los 3 bloques `<script>` después del cambio.

- **32.5 — ✅ Rename "Pendientes" → "Capturar Destare"** (solo texto
  visible: botón del menú lateral, atajo rápido de coordinador, y el
  mensaje que referencia la pestaña por nombre en el banner de un ticket
  pendiente). Identificadores internos (`renderPendientes`,
  `tab-pendientes`, `nd-pendientes`) sin tocar, tal como pedía 32.5.
- **32.6 — ✅ Rename "Captura" → "Capturar Peso Bruto"** (mismo criterio:
  solo el texto del botón del menú lateral).
- **32.9 — ✅ Reorganización del menú lateral (parcial):** grupo "Trabajo
  diario" ahora junta Capturar Peso Bruto, Fila Báscula y Capturar
  Destare en ese orden (antes Fila Báscula vivía en "Consulta"). Los
  grupos Consulta/Analítica/Herramientas/Administración quedan como ya
  estaban. **"Auditar" (32.7/32.8) no se agregó al menú todavía** porque
  esa pestaña no existe como feature construida — se agrega en la fase
  que la construya, no antes (así no queda un botón muerto en el menú).
- **32.10 — ✅ PDF de Bancos:** la fila de encabezado de cada grupo
  banco+material (ya existente, con subtotal de viajes y toneladas)
  ahora también trae el promedio ton/viaje de ESE grupo en la misma
  fila, además del promedio general que ya se mostraba solo al final.
- **32.11 — ✅ Orden de materiales en Metas:** dentro de cada Cuerpo, las
  filas de material en la tabla de `initMetasTab()` ahora se ordenan
  Núcleo > Berma de Apoyo > Berma > Secundaria 1 > Secundaria 2 > Coraza,
  en vez del orden que traía el objeto del programa. Nota: esto se aplica
  sobre la tabla de Metas **actual** (8 columnas ya existentes) — el
  rediseño completo de columnas de 32.13 (Meta mes/Real mes/🚦(mes)/Meta
  acumulada hoy/Real acumulado hoy/🚦(hoy)/Meta total/% Avance Total,
  con prorrateo de días hábiles) es una fase aparte, todavía no
  construida, ver pendientes abajo.

### Verificación pendiente — Fase 1 (32.5, 32.6, 32.9 parcial, 32.10, 32.11)

**Falta que Jesús verifique en campo/producción** (código ya entregado y
con sintaxis validada, pero sin probar contra el uso real todavía):

- [ ] Menú lateral: "Capturar Peso Bruto" y "Capturar Destare" se ven
      bien en el celular (texto no se corta/encima con el ícono).
- [ ] "Fila Báscula" ahora aparece dentro del grupo "Trabajo diario"
      (antes estaba en "Consulta") — confirmar que el orden no estorba
      el flujo diario de captura.
- [ ] Atajo rápido del header para el rol `coordinador` dice "Capturar
      Destare" y sigue llevando a la pestaña correcta.
- [ ] PDF de Bancos: la fila de encabezado de cada grupo banco+material
      ahora trae también el promedio ton/viaje de ESE grupo — confirmar
      que el número intermedio calcula bien comparado a mano con algún
      grupo real.
- [ ] Metas: dentro de un Cuerpo con varios materiales, confirmar que el
      orden en pantalla es Núcleo, Berma de Apoyo, Berma, Secundaria 1,
      Secundaria 2, Coraza (con datos reales, no solo con el catálogo
      vacío).

## 34. 21-jul-2026 — Batch de 13 (sección 32): Fase 2 implementada — 32.1, 32.2, 32.4

- **32.1 + 32.4 — ✅ implementadas juntas** (mismo módulo, "Camiones
  Destare" en Fila Báscula):
  - `filtrarBuscadorDestare()` reescrita: se divide en dos bloques, **Tus
    camiones** (`creadoPor === tu uid`, mismo criterio que
    `puedoVerRegistroFila()`) y **Otros camiones** (el resto).
  - Un camión con `reclamado_por` puesto solo lo ve quien lo reclamó (y
    siempre admin/coordinador/master); uno sin reclamar se sigue viendo
    por todos.
  - `registrarEntradaFilaSegunda()` ahora pide confirmación
    (`confirm()`) antes de reclamar CUALQUIER camión, y al confirmar
    guarda `reclamado_por` (uid) junto con `t1b_fila_ts`, mismo patrón
    que ya usaba `destarado_por` (sección 27.2), un paso antes.
  - Nueva función `liberarCamionFilaSegunda()` — botón "↩️ Liberar",
    visible solo para quien tiene `reclamado_por == su uid` (y siempre
    para master/admin). Limpia únicamente `reclamado_por` (deja
    `t1b_fila_ts` tal cual, el camión ya entró físicamente a la fila) y
    el camión vuelve a verse por todos en "Otros camiones".
  - Un camión con `t3b_salida_ts` ya puesto ("Destarado") ahora sale por
    completo de la lista de "Camiones Destare" — ya vive en "Capturar
    Destare" esperando el peso real. Antes se quedaba visible con los
    botones deshabilitados.
  - No requirió cambio de `firestore.rules` — `reclamado_por` es un
    campo más dentro de `fila_bascula`, cubierto igual que
    `destarado_por` por la regla ya desplegada (`puedeCapturar()` para
    create/update, sin validación de campos específicos en esa
    colección).
- **32.2 — ✅ regla escrita, pendiente de despliegue por Jesús.** El
  archivo `firestore-rules-fase2-32.2.md` (entregado junto con este
  batch) trae el diff exacto: función `fueDestaradoPorMi()` nueva +
  reemplazo del `allow update` de `acarreos`. Claude no tiene acceso
  para publicar reglas — Jesús debe pegarlo en Firebase Console o en su
  `firestore.rules` y publicar. **Hasta que se despliegue, el bug
  original de 32.2 (capturista2 sin permisos al completar destare de un
  ticket ajeno) sigue existiendo en producción** — el código de
  `index.html` ya está listo para funcionar en cuanto la regla se
  publique, no necesita otro cambio de este lado.

### Verificación pendiente — Fase 2 (32.1, 32.4)

- [ ] Probar con 2 capturistas reales (2 dispositivos) que "Tus
      camiones"/"Otros camiones" se llenan correctamente y que reclamar
      un camión en un dispositivo lo oculta del otro (salvo para
      admin/coordinador/master).
- [ ] Confirmar que el diálogo de confirmación al reclamar no estorba el
      flujo (Jesús puede pedir quitarlo si en la práctica se siente
      lento con volumen alto de camiones).
- [ ] Probar "↩️ Liberar" de principio a fin: reclamar con un usuario,
      liberar, y confirmar que otro capturista ya puede reclamarlo o
      destararlo.
- [ ] Confirmar que un camión desaparece de "Camiones Destare" en cuanto
      se marca "Destarado", en los 2 bloques (Tus/Otros).

### Pendiente — Fase 3 y siguientes

1. **32.7 + 32.8** — pestaña nueva "Auditar".
2. **32.12** — "Morro" como Cuerpo nuevo + mini-módulo de piezas Core
   Locs (colección nueva `piezas_coraza` + regla de Firestore nueva que
   Jesús también deberá desplegar).
~~3. 32.13 — rediseño completo de columnas de Metas~~ — **construido el
21-jul-2026, ver sección 36.** 32.14 (festivos/paros locales de obra)
sigue abierto, no bloquea nada más.

~~4. Modo nocturno~~ — **construido desde cero el 21-jul-2026, ver
sección 35** (la bitácora decía que solo faltaba el interruptor; en
realidad no existía nada de esto en el código real — ver discrepancia
documentada ahí mismo). Pendiente solo la verificación en campo listada
al final de la sección 35, no bloquea nada más.

---

## 35. 21-jul-2026 — Modo nocturno: construido desde cero (con una discrepancia importante encontrada)

**Discrepancia encontrada antes de programar (regla 30.4 aplica también al
revés — no asumir que algo existe solo porque la bitácora lo dice):** la
introducción de la sección 32 afirmaba que el modo nocturno ya tenía
"paleta + detección automática", y que solo faltaba el interruptor manual.
Se hizo `grep` de `dark`/`oscuro`/`nocturno` sobre `index.html` real antes
de tocar código (regla 24.4) y **no se encontró absolutamente nada** — ni
paleta, ni detección, ni interruptor. Se construyó todo desde cero, no
solo el interruptor que decía faltar. Se le informó a Jesús de esta
discrepancia antes de programar, en vez de asumir silenciosamente.

### Decisión confirmada con Jesús — REVISADA (v2, mismo día)
Primera versión construida: interruptor de 3 opciones (Auto/Claro/Oscuro)
segmentado, al fondo del menú lateral. **Jesús lo probó y pidió cambiarlo**
por un solo botón — ícono de luna, junto al atajo rápido y el hamburguesa
en el header (arriba, siempre visible, no hay que abrir el menú) — que
alterna directo entre claro/oscuro con un toque. Se mantuvo la detección
automática del sistema como comportamiento de ARRANQUE (antes de que el
usuario toque el botón la primera vez), y el botón pasa a ser un override
manual explícito desde el primer toque en adelante — así no se pierde la
detección automática que Jesús ya valoraba, pero la interacción del día a
día es un solo tap, no un menú de 3 opciones. `establecerTema('auto')`
sigue existiendo en el código por si se quiere reexponer una opción
explícita de "volver a automático" más adelante, pero no hay ningún botón
que la llame en esta versión — el botón de luna implementado es
`toggleTema()`, que decide con base en cómo se ve la app en ese momento
(no en si el estado de partida era "auto"), así el primer toque siempre
hace lo esperado sin importar de dónde partió.

### Qué se construyó
- **Botón de luna en el header** (`#theme-toggle-btn`, mismo tamaño/estilo
  que el hamburguesa y el atajo rápido) — un tap alterna claro/oscuro;
  el ícono se resalta (fondo más claro) cuando el modo oscuro está activo.
- **Paleta oscura completa** (`:root[data-theme="dark"]`) — mismos 12
  tokens semánticos que ya usaba casi todo el CSS (`--bg`, `--surface`,
  `--border`, `--border-strong`, `--text`, `--text-muted`, `--accent*`,
  `--danger*`, `--warning*`, `--info*`). Los `-light` de acento/estado en
  modo oscuro usan `rgba()` con transparencia en vez de un hex sólido
  nuevo por cada uno — se ven bien encima de `--surface` sin tener que
  calcular manualmente un tono oscuro distinto para cada badge.
- **3 tokens nuevos** (`--neutral-bg`, `--alert-amber-bg`/`-border`,
  `--alert-amber2-bg`/`-border`/`-text`) para los ÚNICOS lugares del
  archivo que tenían un color de fondo fijo en vez de variable y que sí
  se habrían visto mal en oscuro (tarjeta de estatus en Reportes, aviso
  de transferencia entre Acopios, `.calc-field-neutral`, el track de la
  barra de progreso de Metas, el fondo de la gráfica de meses en
  Suministros, y el badge "Estancado" de Fila Báscula — este último
  además tenía un bug menor de estar hardcodeado en vez de usar
  `var(--danger)`/`var(--danger-light)` como su badge gemelo de
  "Conflicto" justo arriba, ya corregido de paso).
- **Se revisaron TODOS los demás colores hardcodeados del archivo**
  (regla 30.2, no solo "arreglar hasta que deje de verse mal a simple
  vista") y se decidió explícitamente **NO tocarlos**, porque ya son
  botones/toasts de color sólido con texto blanco (Excel verde, Liberar
  gris-azul, Destarado ámbar, sync-toast, tooltip de Tendencia,
  banner-modo-edicion) que se ven igual de bien en cualquier tema.
- **Pantalla de splash (`--splash-*`) deliberadamente sin tocar** — es su
  propia identidad visual, no parte del tema de la app en sí.
- **Script anti-parpadeo** al inicio de `<head>` (antes de `<style>` y de
  cualquier otro script): lee `localStorage.temaPreferencia` (o el
  sistema, si es "auto") y pone `data-theme` en `<html>` de forma
  síncrona, para que la app no muestre un flash de tema claro antes de
  cambiar a oscuro en cada carga.
- **`aplicarTema()` / `establecerTema()` / `toggleTema()`** (bloque
  `<script>` grande, junto a `abrirMenuLateral()`/`cerrarMenuLateral()`,
  mismo patrón `window.algo = algo`): guardan la preferencia en
  `localStorage.temaPreferencia` (`'auto'|'claro'|'oscuro'`), resaltan
  el ícono de luna cuando el oscuro está activo, y — mientras la
  preferencia siga en "auto" (el usuario no ha tocado el botón todavía)
  — escuchan cambios en vivo de `prefers-color-scheme` con la app ya
  abierta (ej. el celular cambia de tema a cierta hora), sin necesitar
  recargar.

### Explícitamente NO se tocó (y por qué)
- El `<meta name="theme-color">` de la barra de estado del sistema
  (línea ~11) se queda fijo en el verde de marca — no se hizo dinámico
  por tema. Es un detalle cosmético menor (la barra de estado del
  celular no cambiaría de color con el tema), no bloquea nada; se puede
  agregar después si Jesús lo pide.
- No se migraron los botones/toasts de color sólido mencionados arriba a
  variables — funcionan bien tal cual en ambos temas, cambiarlos habría
  sido riesgo sin beneficio real.

### Verificación de sintaxis (regla 24.4/30.5)
`node --check` limpio en el módulo principal y en los 3 `<script>`
normales (el error de `plain1.js` es el mismo falso positivo YA
documentado en 24.4 — un comentario que menciona literalmente la palabra
"script" corta mal la extracción ingenua por regex; se confirmó
abriendo el fragmento, es texto de comentario, no un bug real). Cero IDs
duplicados.

### Verificación pendiente — Jesús debe probar en campo
- [ ] El botón de luna en el header se ve bien junto al atajo rápido y
      el hamburguesa (no se encima, se distingue cuándo está activo).
- [ ] "Automático" sí cambia solo cuando el celular cambia de tema del
      sistema (probar cambiando el tema de Android/iOS con la app
      abierta, sin recargar).
- [ ] "Claro"/"Oscuro" manual sobreviven a cerrar y volver a abrir la app
      (persistencia en `localStorage`).
- [ ] Revisar visualmente las pantallas con más contenido (Base de
      datos, Reportes, Tendencia, 6 Sigma) en modo oscuro — son las que
      tienen más elementos y donde más fácil se detecta un color que se
      haya escapado.
- [ ] Confirmar que el badge "Estancado" de Fila Báscula se ve igual de
      bien que el badge "Conflicto" (mismo patrón, corregido de paso).

---

## 36. 21-jul-2026 — 32.13: rediseño completo de columnas de Metas (construido)

Se verificó `initMetasTab()` contra `index.html` real antes de tocar código
(regla 30.4): la tabla anterior tenía 8 columnas pero en OTRO orden y con
OTRA fórmula de "meta acumulada" (sumaba el mes en curso completo, sin
prorratear). Se reemplazó por la definición final de la sección 32.13.

### Qué se construyó
- **Nuevo orden de columnas** (por material, dentro de cada Cuerpo):
  `Material | Meta mes | Real mes | 🚦 mes | Meta acum. hoy | Real acum.
  hoy | 🚦 hoy | Meta total | % Avance total` — exactamente el orden
  confirmado en 32.13.
- **`🚦 mes`** (nuevo, no existía): compara Meta mes vs Real mes. Antes
  solo había "% mes (ritmo)" sin semáforo.
- **`🚦 hoy`**: mismo criterio que el semáforo único que ya existía, pero
  ahora compara contra "Meta acum. hoy" con la fórmula de prorrateo nueva
  (antes comparaba contra la suma simple de meses `<= mesActual`, que
  incluía el mes en curso completo aunque apenas fuera el día 3).
- **Umbrales del semáforo cambiados** en los dos (🚦 mes y 🚦 hoy): ahora
  🟢 ≥90% · 🟡 70–89% · 🔴 <70% (antes era 🟡 60–89% · 🔴 <60% para el
  semáforo único que existía). Confirmado explícito en 32.13.
- **Prorrateo por días hábiles (lo nuevo más grande de esta fase):**
  `Meta acum. hoy` = suma de metas de meses YA CERRADOS (anteriores al mes
  en curso) + `Meta mes × días hábiles transcurridos ÷ días hábiles
  totales del mes`. Se agregaron helpers dentro de `initMetasTab()`
  (`festivosOficialesMX()`, `esDiaHabilMX()`, cálculo de
  `diasHabTotalesMes`/`diasHabTranscurridos` una sola vez por render, no
  por material — mismo costo que antes). Días hábiles = L–S, excluyendo
  domingos y los 7-8 festivos oficiales de México (Art. 74 LFT: 1-ene, 1er
  lunes feb, 3er lunes mar, 1-may, 16-sep, 3er lunes nov, 25-dic, y 1-dic
  cada 6 años). Probado con Node fuera de la app: julio 2026 da 27 días
  hábiles totales y 18 transcurridos al día 21 — verificado a mano contra
  el calendario real antes de entregar.
- **Columna nueva `% Avance total`** (no existía): `Real acum. hoy ÷ Meta
  total del catálogo`, SIN semáforo (es una referencia de avance del
  proyecto completo, no una meta con fecha) — tal como pedía 32.13.
- El emoji de semáforo que antes iba pegado al nombre del material en la
  primera columna se quitó de ahí — ahora vive en sus propias columnas
  `🚦 mes`/`🚦 hoy`, el nombre del material queda solo.
- **32.14 (festivos/paros locales de obra) sigue sin resolver a
  propósito** — la lista de festivos usada es solo la oficial de México;
  no bloqueaba el resto según lo ya acordado.
- **Explícitamente NO tocado en esta fase:** el mini-módulo de piezas
  Coraza/Core Locs de 32.12 (Morro/Cuerpo 5 en piezas) — es una fase
  aparte, todavía sin construir, sigue en el pendiente.

### Verificación de sintaxis (regla 24.4/30.5)
`node --check` limpio en los 3 `<script>` normales y en el `<script
type="module">` (renombrado a `.mjs` para el chequeo, mismo criterio de
siempre). Cero IDs duplicados en todo el archivo.

### Verificación pendiente — Jesús debe probar en campo
- [ ] Los números de "Meta acum. hoy" en pantalla coinciden con el
      prorrateo esperado a mano para al menos un material real (comparar
      contra el cálculo de días hábiles del mes en curso).
- [ ] `🚦 mes` y `🚦 hoy` muestran colores razonables (ningún material se
      ve todo en rojo por el cambio de umbral 60%→70%, o si sí, confirmar
      que es un caso real de atraso y no un efecto del cambio de regla).
- [ ] La tabla se sigue viendo bien en celular (9 columnas ahora en vez de
      8 — confirmar que el scroll horizontal de la tabla sigue siendo
      cómodo con el dedo, no se ve apretada).
- [ ] `% Avance total` tiene sentido comparado a mano para al menos un
      Cuerpo/material con avance conocido.

### Pendiente — Fase 3 y siguientes (actualizado)
1. **32.7 + 32.8** — pestaña nueva "Auditar".
2. **32.12** — "Morro" como Cuerpo nuevo + mini-módulo de piezas Core
   Locs (colección nueva `piezas_coraza` + regla de Firestore nueva que
   Jesús también deberá desplegar).
3. **32.14** — festivos/paros locales de obra además de los oficiales de
   México (no bloquea nada, se agrega si Jesús lo confirma).

---

## 37. 21-jul-2026 — 32.12 (Morro, parte no-Core Locs): hallazgos y pendientes

Jesús adjuntó `PROGRAMA_2026.xlsx` (fuente de donde sale el documento
Firestore `programa_2026` que lee la pestaña Metas). Se revisó con
`openpyxl` celda por celda antes de tocar nada (regla 30.4).

### Hallazgos confirmados
- **Morro no tiene ningún dato cargado en el Excel fuente.** Las 5 filas
  de material de Morro (Núcleo, Secundaria 1, Secundaria 2, Berma, Berma
  de Apoyo) tienen la columna `CANTIDAD` completamente vacía (`None`, no
  cero) — comparado con Cuerpo 1-5, que sí tienen su total real. No es
  bug de la app ni de la herramienta de subida: el archivo fuente nunca
  tuvo el dato. Cuando Jesús llene esas celdas y vuelva a subir el
  Excel, Morro va a aparecer solo — el código de Metas no filtra nada
  por valor cero ni por cuerpo faltante.
- **Bug real encontrado y corregido en 32.13** (no relacionado a Morro,
  salió al revisar años futuros): la regla del festivo "1-dic cada 6
  años" (transmisión del Ejecutivo Federal) estaba mal — usaba `año % 6
  === 0`. Los años reales de transmisión (2018, 2024, 2030) dan residuo
  **2** al dividir entre 6, no 0. Con la fórmula vieja, 2028 se hubiera
  marcado festivo por error y 2030 (el real) se hubiera perdido.
  Corregido a `año % 6 === 2` en `initMetasTab()`.
- **Arquitectura de meses ya soporta años futuros sin tocar código.**
  Las claves de `meses` son `'YYYY-MM'` completas (con año), así que
  2027/2028/2029 son solo claves nuevas en el mismo objeto — no hay nada
  en el código atado a 2026. Un mes sin subir ya se trata como cero
  automáticamente (`meses[mesActual] || 0`). Confirmado que NO hace
  falta agregar código "para cuando llegue el dato" — sería código
  muerto, ya funciona así hoy.

### Pendientes (bloqueados en datos/archivos que Jesús va a pasar después)
- [ ] **Programa 2027, 2028, 2029** — aún no se los pasan a Jesús desde
      la fuente. Cuando lleguen en el mismo formato de Excel, se suben
      con la misma herramienta y ya funcionan solos (ver hallazgo de
      arquitectura arriba). No requiere ningún cambio de código.
- [ ] **Renombrar el documento `programa_2026` → `programa_general`**
      (o `programa_maestro`) ahora que va a acumular varios años y el
      nombre actual va a confundir. El nombre está fijo en DOS lados:
      el lado de lectura en `index.html` (línea con
      `leerDocResumen('programa_2026')`, cambio de una línea) y el lado
      de escritura en `SUBIR_PROGRAMA_2026.html` (herramienta externa
      de Jesús para subir el Excel — Claude no la tiene). **A propósito
      NO se tocó el lado de `index.html` todavía** — si se renombra solo
      ahí sin tocar la herramienta de subida al mismo tiempo, la
      pestaña Metas se rompe (buscaría `programa_general` pero la
      herramienta seguiría escribiendo en `programa_2026`) hasta que
      Jesús pase el otro archivo. Jesús va a pasar
      `SUBIR_PROGRAMA_2026.html` más tarde — cuando lo tenga, cambiar
      los dos lados en la misma entrega.
- [ ] **Sigue sin resolverse:** en el Excel que mandó Jesús, ningún
      Cuerpo tiene columnas de fecha más allá del 12 de enero de 2026 —
      ni Cuerpo 1, que ya debería llevar meses de avance real. Se
      preguntó dos veces si es (a) el archivo real y el programa
      detallado por día solo llega hasta ahí, o (b) llegó una versión
      recortada — Jesús aún no lo confirma. Esto importa porque si de
      verdad solo hay datos hasta el 12-ene, "Meta acum. hoy" (32.13) va
      a dar números raros para TODOS los Cuerpos en julio, no solo
      Morro — sigue abierto, no se debe asumir nada hasta que Jesús
      confirme.

---

## 38. 21-jul-2026 — Reintento de Morro (mismo Excel, sin cambios) + Pestaña "Auditar" construida (32.7/32.8)

Jesús volvió a adjuntar `PROGRAMA_2026.xlsx` pidiendo agregar Morro a
Metas. Se releyó celda por celda antes de tocar nada (regla 30.4): es
el **mismo archivo** de la sección 37, con las mismas 5 filas de Morro
vacías (`CANTIDAD` y los 15 meses en `None`). No hay nada nuevo que
subir ni nada que programar del lado de `index.html` — `initMetasTab()`
ya es genérico (`Object.keys(programa.cuerpos)`, sin lista fija), así
que Morro va a aparecer solo en cuanto el Excel traiga sus cantidades y
se vuelva a subir con `SUBIR_PROGRAMA_2026.html`. Jesús decidió no
esperar eso y en cambio seguir con otra fase pendiente: la pestaña
"Auditar" (32.7/32.8).

### Qué se construyó
Pestaña nueva `tab-auditar`, visible para **coordinador + admin +
master** (confirmado explícito por Jesús — no solo master, a diferencia
de 6 Sigma), agregada al grupo "Herramientas" del menú lateral después
de Tendencia (orden de 32.9: Excel, 6 Sigma, Tendencia, **Auditar**).
Los 4 chequeos pedidos, cada uno un botón independiente, ninguno se
dispara solo al entrar a la pestaña:

1. **Económicos duplicados** — mismo # económico en placas distintas
   (excluye vacío y "S/N"). Lee la colección `flota` completa (catálogo
   chico, 1 doc por camión que ya pasó por Fila Báscula, no por viaje —
   no es la colección `acarreos`).
2. **Camiones sin # económico** — económico vacío o "S/N" en `flota`.
   Comparte la MISMA lectura de `flota` que el punto 1 (cacheada en
   `window._auditFlotaCache` vía `obtenerFlotaParaAuditar()`), para que
   dar clic a los 2 botones no cueste 2 lecturas de la colección.
3. **Rangos inválidos** — **reubicado, no reprogramado** (32.8): es
   exactamente `auditarRangosMaterial()`, que antes vivía en la pestaña
   6 Sigma. Se movió el bloque HTML (inputs de fecha + botón + resultado,
   mismos IDs `aud-fecha-desde/hasta`/`aud-rangos-resultado`) a Auditar
   y se quitó de 6 Sigma; la función en sí no cambió una línea.
4. **Ciclos muy largos** — "Entra a fila" (`t1_fila_ts`) → "Destarado"
   (`t3b_salida_ts`) > 3 horas. Requirió un bridge nuevo,
   `dbFilaBasculaPorRango(desdeTs, hastaTs)` (mismo patrón de bajo costo
   que `dbStatsAnalisisPorRango`: dos desigualdades sobre el MISMO campo,
   `t1_fila_ts`, sin índice compuesto nuevo). Se necesitó una colección
   nueva para este chequeo (`fila_bascula`, no `stats_analisis`) porque
   `procesarFilaBasculaDeTicket()` nunca copia `t3b_salida_ts` a
   `stats_analisis` — solo copia `t1_fila_ts`, `t2_bruto_ts`,
   `t3_salida_ts`, `t1b_fila_ts` y `t4_destare_ts`.

### Explícitamente NO tocado en esta fase
- La parte de Morro en toneladas (32.12) sigue bloqueada por el Excel
  vacío — no se tocó `initMetasTab()` ni el catálogo.
- El mini-módulo de piezas Core Locs (32.12) sigue sin construir.
- `formatearHHMMSS`/`formatearFechaHoraTs`/`escHtml`/`RANGOS_ACOPIO`/
  `normalizarRango` se reutilizaron tal cual, sin cambios.

### Verificación de sintaxis (regla 24.4/30.5)
Los 4 bloques `<script>` (incluido el `<script type="module">`,
renombrado a `.mjs` para el chequeo) pasan `node --check` limpio. Cero
IDs duplicados en todo el archivo (`grep` de todos los `id="..."`,
incluyendo los movidos de 6 Sigma a Auditar).

### Verificación pendiente — Jesús debe probar en campo
- [ ] El nav-item "Auditar" aparece para coordinador, admin y master, y
      NO aparece para capturista/visor.
- [ ] Los 4 botones de Auditar corren sin error con datos reales
      (aunque sea con 0 incidencias) — confirmar que ninguno tira un
      error de índice de Firestore la primera vez que se usa (si el
      chequeo de "Ciclos muy largos" lo pide, hay que crear el índice
      compuesto en la consola de Firebase — mismo procedimiento que
      cualquier otro `where`+`orderBy` nuevo de la app).
- [ ] "6 Sigma" sigue funcionando igual sin el bloque de "Auditoría de
      rangos" que se le quitó (el resto de la pestaña no debió cambiar).
- [ ] Con datos reales, confirmar que "Económicos duplicados" y
      "Camiones sin # económico" no se contradicen con lo que Jesús ya
      sabe de la flota real (para descartar un bug de lectura antes de
      confiar en el reporte).

### Pendiente — sigue igual que la sección 36
1. **32.12** — Morro en toneladas (bloqueado por datos) + mini-módulo de
   piezas Core Locs (sin construir, no depende de Morro).
2. **32.14** — festivos/paros locales de obra (no bloquea).

---

## 39. 21-jul-2026 — Auditar: feedback de Jesús sobre la sección 38 (mismo día)

Jesús pidió opinión sobre qué más agregar a Auditar. Se propusieron 4
ideas ancladas en reglas de negocio ya existentes en el código (mismo
hueco que "rangos inválidos": la regla solo se valida en captura nueva,
no contra el histórico). Respuesta de Jesús: **1 (boletas duplicadas)
se vuelve bloqueo duro, no auditoría** · **2 (material→destino) sí,
construir** · **3 (folio de barcaza faltante) no es relevante, no se
construye** · **4 (peso neto ≤0) no lo entendía, se explicó, queda
pendiente de decisión**.

### Qué se construyó
- **Boleta duplicada — YA NO es un `confirm()` que se pueda pasar por
  alto.** Antes (línea ~1664): "Ya existe la boleta #X. ¿Guardar como
  duplicado?" con opción de continuar. Ahora es un bloqueo duro: si la
  boleta ya existe, se avisa y `return` sin guardar — no hay forma de
  guardarla desde el formulario. Sigue aplicando SOLO a captura nueva
  (`!window._editFid`), como ya estaba, así que editar un ticket
  existente no se marca como "duplicado de sí mismo". **Límite
  conocido, no tocado en esta fase:** el flujo offline (`saveToOutbox`,
  cuando `!navigator.onLine`) hace `return` ANTES de llegar a este
  chequeo — una boleta duplicada capturada sin señal todavía no se
  detecta hasta sincronizar. Es una laguna preexistente, no introducida
  aquí; si Jesús la quiere cerrada, es una fase aparte (validar contra
  Firestore al sincronizar desde el outbox).
- **Nueva 5ª tarjeta en Auditar — "Material a destino no permitido"**:
  mismo patrón que "Rangos inválidos" (`traerTodoFirestore` acotado por
  fecha + comparación contra catálogo), pero contra
  `EXCLUSIONES_DESTINO_POR_MATERIAL` (línea ~4335 — ej. Coraza no puede
  ir a Muro/Morro/Cuerpo 4/5). Detecta tickets viejos/editados/
  importados que hayan saltado esa regla (el formulario de captura
  nueva ya la aplica desde el 18-jul-2026, sección 25). Función nueva
  `auditarMaterialDestino()`, HTML con sus propios inputs de fecha
  (`aud-md-fecha-desde/hasta`) y resultado (`aud-md-resultado`).

### Explícitamente NO construido
- **Folio de barcaza faltante en colocación marina** — descartado por
  Jesús, no relevante.
- **Peso neto ≤ 0** — Jesús no entendía el caso de uso; se explicó que
  `neto_kg = bruto_kg - tara_kg`, y un error de captura (invertir bruto
  y tara, mal leer la báscula, dígito de más/menos) puede dar 0 o
  negativo — físicamente imposible para un camión cargado, señal de un
  error de digitación en uno de los dos pesos. Ya existe un `confirm()`
  descartable en captura (línea 1630, sin tocar); igual que boleta, ese
  `confirm()` es la puerta por donde se cuelan los que sí importan
  auditar. **Pendiente de decisión de Jesús:** ¿se agrega como 6ª
  tarjeta de Auditar, se vuelve también bloqueo duro como boleta, o se
  deja como está?

### Verificación de sintaxis (regla 24.4/30.5)
`node --check` limpio en los 4 bloques `<script>` (módulo renombrado a
`.mjs` para el chequeo). Cero IDs duplicados en todo el archivo.

### Verificación pendiente — Jesús debe probar en campo
- [ ] Capturar una boleta ya existente y confirmar que YA NO se puede
      guardar (antes sí se podía con "Guardar como duplicado").
- [ ] Confirmar que EDITAR un ticket existente (con su propia boleta
      sin cambiar) sigue guardando normal — no debe marcarse como
      duplicado de sí mismo.
- [ ] "Material a destino no permitido" corre sin error con datos
      reales y, si hay 0 incidencias, lo confirma explícito (no se
      queda en blanco).
- [ ] Decidir qué hacer con "Peso neto ≤ 0" (6ª tarjeta / bloqueo duro
      / dejarlo como está).

---

## 40. 21-jul-2026 — Peso neto ≤ 0: decisión de Jesús (mismo día, cierra el pendiente de la sección 39)

Jesús decidió: **bloqueo duro**, igual criterio que boleta duplicada.

### Qué se cambió
`if (data.neto_kg <= 0 && !confirm(...)) return;` → `if (data.neto_kg <= 0) { alert(...); return; }`
(línea ~1630). **Diferencia importante con boleta duplicada:** este
bloqueo aplica tanto a captura nueva como a EDICIÓN — a propósito, no es
un descuido. Boleta duplicada solo bloquea captura nueva porque el
propio ticket editado siempre "coincide con su boleta original" (sería
un falso positivo bloquearlo). Peso neto ≤0 es un error físico
(bruto/tara invertidos o mal digitados) que es igual de inválido si
pasa al editar como si pasa al capturar — no hay razón de negocio para
permitirlo en un caso y no en el otro.

### Explícitamente NO tocado
- El chequeo de `bruto_kg <= 0` y `tara_kg <= 0` (líneas 1627/1629) ya
  eran bloqueo duro desde antes — sin cambios.
- El caso `esPendiente` (solo 1er pesaje) sigue sin pedir tara/neto,
  como ya estaba — este bloqueo vive dentro del mismo `if
  (!esPendiente)` de antes.

### Verificación de sintaxis (regla 24.4/30.5)
`node --check` limpio en los 4 bloques `<script>`. Cero IDs duplicados.

### Verificación pendiente — Jesús debe probar en campo
- [ ] Capturar un ticket con bruto/tara que den neto ≤0 y confirmar que
      YA NO se puede guardar (antes sí, con "Guardar de todas formas").
- [ ] Editar un ticket viejo cuyo neto ya fuera ≤0 (si existe alguno en
      el histórico) y confirmar que el bloqueo también aplica ahí — Jesús
      tendrá que corregir el peso para poder guardar el resto de la
      edición.

### Pendiente — sigue igual
1. **32.12** — Mini-módulo de piezas Core Locs (Morro/Cuerpo 5), sin
   construir, no depende del Excel de Morro.
2. **32.14** — festivos/paros locales de obra (no bloquea).

---

## 41. 21-jul-2026 — 32.14 cerrado sin cambios de código: no hay festivos locales adicionales

Se preguntó a Jesús qué tipo de días locales había que excluir del
prorrateo de "Meta acum. hoy" (32.13), además de domingos y festivos
oficiales de México. Respuesta: **ninguno** — es un contrato de obra
pública, no se excluyen festividades informales (carnavales, final del
mundial, etc.), solo domingos y los festivos oficiales del Art. 74 LFT
que `festivosOficialesMX()` ya cubre desde la sección 36.

**32.14 queda resuelto/cerrado sin tocar `index.html` en absoluto** — la
lista actual ya es la correcta, confirmada por Jesús. No es un pendiente
abierto, es una confirmación de que lo ya construido está completo.

### Pendiente — solo queda 32.12
**32.12** — Mini-módulo de piezas Core Locs (Morro/Cuerpo 5): formulario
de captura + colección nueva `piezas_coraza` + regla de Firestore que
Jesús deberá desplegar. Sin construir todavía, no depende del Excel de
Morro (esa parte en toneladas sigue bloqueada por datos, ver sección 37).

---

## 42. 21-jul-2026 — 32.2 confirmado en producción + 32.12 (Core Locs) cerrado por decisión de alcance: el batch de 13 queda completo

### 32.2 — ✅ CONFIRMADO EN PRODUCCIÓN
Jesús desplegó la regla de `firestore.rules` entregada en la sección 34
(función `fueDestaradoPorMi()` + reemplazo del `allow update` de
`acarreos`) y confirmó que el bug de permisos ya no ocurre: un
capturista distinto al que creó el ticket ya puede completar un destare
sin el error "Missing or insufficient permissions". Cierra el pendiente
que quedaba abierto desde la sección 34 (el código de `index.html` ya
estaba listo desde entonces; solo faltaba el despliegue de la regla,
que Claude no puede hacer directamente).

### 32.12 — ✅ CERRADO por decisión de alcance (Core Locs fuera de la app)
Jesús confirmó que el mini-módulo de piezas Core Locs **no aplica a
esta app**, no como "en pausa para después": las corazas de Morro y
Cuerpo 5 no se llenan con material de banco, se cuantifican por PIEZA
(Core Loc), y aunque el Core Loc sí es parte de otros conceptos de la
obra (p. ej. "Suministro de core locs"), esos conceptos tampoco pasan
por acarreo/báscula. Como esta app solo maneja acarreos de material de
banco, el mini-módulo queda **fuera de alcance de forma permanente**,
no como pendiente técnico. No se crea la colección `piezas_coraza` ni
su regla de Firestore, y no se agrega ningún formulario de captura por
pieza.

La otra mitad de 32.12 — Morro en toneladas dentro de la tabla de Metas
— sigue sin ser tarea de código (ver sección 37): `initMetasTab()` ya
es genérico y va a mostrar a Morro solo en cuanto Jesús suba un
`PROGRAMA_2026.xlsx` con esas 5 filas llenas. No hay nada que Claude
deba construir para eso.

### Batch de 13 (sección 32) — queda completo
Con esto se cierran los 14 puntos de la sección 32 (32.1 a 32.14). Todo
lo que quedaba abierto era: (a) el despliegue de la regla de 32.2 —
confirmado hoy — y (b) el alcance de 32.12 — resuelto hoy, con Core
Locs descartado y Morro-en-toneladas pendiente de datos, no de código.
No queda ningún punto abierto de este batch que requiera tocar
`index.html` o `firestore.rules`.

---

## 43. 21-jul-2026 — Cierra la duda de la sección 37: el "corte del 12 de enero" era un bug de formato de fecha, no falta de datos. `SUBIR_PROGRAMA_2026.html` reconstruido. Orden y banner de Metas corregido.

### 37 — ✅ CERRADO: causa raíz confirmada, no era falta de datos
Jesús compartió `PROGRAMA_2026.xlsx` de nuevo y explicó que las fechas
del encabezado (fila 1, columnas C en adelante) se capturaron en
formato DD/MM/AAAA. Al inspeccionar el archivo con Python/openpyxl se
confirmó el bug exacto: las columnas pensadas como "1 feb 2026", "1 mar
2026"... "1 dic 2026" (día=01, mes variando 02-12) quedaron guardadas
como día variando 01-12 dentro de ENERO (mes=01 fijo) — típico swap
DD/MM ↔ MM/DD al escribir la fecha en Excel. Por eso todas esas
columnas caían en el mismo mes lógico y `initMetasTab()` solo veía
datos hasta "el 12 de enero": nunca fue un corte real de información,
todos los Cuerpos sí tienen programa completo para 2026.

Jesús también notó, aparte del swap, que las fechas deberían ser FIN de
mes (no inicio) para poder prorratear bien — se corrigieron ambas cosas
a la vez en un Excel nuevo: `PROGRAMA_2026_corregido.xlsx` con:
- Columna "dic-2025" (antes guardada como 12-ene-2025 por el mismo
  swap) → corregida a 1-dic-2025.
- Columnas 2026 → fin de cada mes real: 31-ene, 28-feb, 31-mar, 30-abr,
  31-may, 30-jun, 31-jul, 31-ago, 30-sep, 31-oct, 30-nov, 31-dic.
- La columna de noviembre 2025 ("21/11/25") no se tocó — no tiene
  ambigüedad DD/MM (no existe el mes 21). Nota: Jesús la recordaba como
  "24 de noviembre"; queda un desfase de 3 días sin resolver, sin
  importancia según Jesús.

Como `index.html` nunca parsea el Excel directamente (solo lee
`resumenes/programa_2026` ya procesado en Firestore), este fix no tocó
código — solo el archivo fuente. Confirmado con Jesús: **Morro sigue en
ceros** en este Excel (no se agregó dato nuevo ahí, solo se corrigieron
fechas de encabezado).

### `SUBIR_PROGRAMA_2026.html` — reconstruido desde cero
Jesús perdió el archivo original y no se encontró en el repo público de
GitHub (no indexado / probablemente privado). Se reconstruyó como
herramienta aparte de un solo archivo, mismo `firebaseConfig` que
`index.html` (mismo proyecto Firebase), con:
- Login con Firebase Auth, acceso restringido a **rol master**
  únicamente (supuesto de Claude, no confirmado explícitamente por
  Jesús — fácil de abrir a más roles si hace falta).
- Lee el Excel con SheetJS (`xlsx@0.18.5`, mismo CDN que ya usa
  `index.html`) con `cellDates:true` — así toma la fecha real guardada
  en la celda, sin volver a interpretar texto (evita reintroducir el
  bug DD/MM de la sección 37).
- Detecta secciones (Cuerpos) de forma genérica: cualquier fila cuya
  columna A NO esté en el catálogo de materiales conocidos
  (`NUCLEO, SECUNDARIA 1/2, CORAZA, BERMA, BERMA DE APOYO, COLOCACION
  MARINA/TERRESTRE, REZAGA`) se trata como el inicio de una sección
  nueva — no hace falta mantener una lista fija de Cuerpos/Morro/Muro.
- Preview obligatorio ANTES de subir: lista los meses detectados
  (avisando si dos columnas caen en el mismo mes — el mismo bug de la
  sección 37, para que no se repita en silencio nunca más), y las
  secciones/materiales detectados, con aviso si alguna sección quedó
  sin materiales (posible fila huérfana o typo).
- El botón de subir hace `setDoc` de **reemplazo completo** del
  documento `resumenes/programa_2026` (no merge parcial) — para que no
  queden materiales viejos huérfanos si el catálogo cambia.
- Acepta `.xlsx`, `.xls` y `.csv` (la bitácora original, en el
  comentario de `initMetasTab()`, se refiere al archivo como "el CSV" —
  se dejó abierto a los tres formatos por si acaso).

**Bug de despliegue encontrado y corregido en la misma sesión:** Jesús
reportó que "no hacía nada" al usarla. Causa: la estaba abriendo
directo desde el navegador con protocolo `file://` (doble clic en el
archivo descargado) — los `<script type="module">` que usa para
conectarse a Firebase quedan bloqueados por el navegador en ese modo,
sin ningún aviso visible, pasa con cualquier archivo que se suba, no
solo con Excel. Se agregaron dos cosas: (1) un aviso en pantalla que
detecta `location.protocol === 'file:'` y explica que hay que subir el
HTML al repo y abrirlo por su URL de GitHub Pages (igual que
`index.html`); (2) la función de análisis quedó envuelta en try/catch
con mensaje de error visible, para que ningún fallo futuro (de
cualquier causa) vuelva a quedarse callado.

**Pendiente sin resolver:** Jesús aún no confirma si la sección
"EXTRAORDINARIOS" del Excel (fila suelta entre Morro y Muro Tarquina,
sin materiales propios) debe seguir existiendo como fila en el Excel o
puede quitarse — ver el punto 43 de abajo (orden/banner de Metas), que
ya la trata como una etiqueta y no como Cuerpo real, así que técnicamente ya no
importa si la fila sigue en el Excel o no (se ignora automáticamente
por no tener materiales).

### Orden de Cuerpos en Metas + banner "Extraordinarios" (a petición de Jesús, con foto de la pestaña Metas)
`initMetasTab()` pintaba los Cuerpos con `Object.keys(programa.cuerpos)
.sort()` — orden alfabético. Esto ponía "EXTRAORDINARIOS" antes de
"MORRO" (CUERPO 5, EXTRAORDINARIOS, MORRO, MURO TARQUINA) aunque el
Excel ya trae el orden correcto de arriba a abajo (Cuerpo 5, Morro,
Extraordinarios, Muro Tarquina) — el Excel estaba bien, el bug era
100% del lado de `index.html`. Además "EXTRAORDINARIOS" se pintaba como
tarjeta propia con tabla vacía (sin materiales), en vez de ser lo que
Jesús explicó que es: una etiqueta que describe a Muro Tarquina ("el
muro tarquina es un concepto extraordinario"), no un Cuerpo con datos
propios.

Cambios en `initMetasTab()`:
- `ORDEN_CUERPOS_METAS` = orden fijo de negocio (Cuerpo 1→5, Morro,
  Muro Tarquina) en vez de alfabético — cualquier Cuerpo nuevo no
  listado se va al final, sin excluirlo (mismo patrón que
  `ORDEN_MATERIALES_METAS` de la sección 32.11).
- `SECCIONES_EXTRAORDINARIAS` = Set con "MURO TARQUINA" — antes de
  pintar su tarjeta se inserta un separador visual con el texto
  "Extraordinarios" (usa `var(--accent)` / `var(--accent-light)`, ya
  existentes, ninguna variable/color nuevo).
- Cualquier Cuerpo con 0 materiales ya no se pinta como tarjeta vacía
  (aplica automáticamente a la fila "EXTRAORDINARIOS" del Excel, y a
  cualquier caso futuro parecido).

Verificado: `node --check` sobre el bloque de `initMetasTab()` sin
errores, sin IDs duplicados en el archivo completo.

**Sin tocar:** el Excel no necesitó ningún cambio para este punto — ya
traía el orden correcto; el bug estaba solo en cómo `index.html` lo
reordenaba al pintar.

---

## 44. 21-jul-2026 — 🔴 Hallazgo importante: bug real de `deleteDoc is not defined` en "eliminar de Fila Báscula". Rango de Núcleo→Muro confirmado y corregido en el catálogo.

### El bug real (no era de permisos, ni de red, ni de reglas de Firestore)
Jesús reportó que no podía eliminar camiones de "Fila Báscula" ni con
cuenta master — el mensaje decía "No se pudo eliminar. Revisa tu
conexión e intenta de nuevo." Antes de tocar nada se descartó lo obvio:
- Otras acciones de master (borrar usuario, borrar ticket) sí
  funcionaban — descarta un problema amplio de sesión/rol.
- El botón 🗑️ solo se pinta si `esMasterFila`/`esMasterDestare`, y
  `eliminarRegistroFilaBascula()` revalida `window._currentUserRol`
  otra vez adentro — descarta un falso-positivo del lado del cliente.

Se mejoró primero el mensaje de error genérico para mostrar el código
real de Firebase (`e.code`/`e.message`) — con eso Jesús mandó captura y
apareció el verdadero error: **`deleteDoc is not defined`**.

**Causa raíz confirmada:** `index.html` separa un `<script
type="module">` (arriba, donde viven los imports directos de Firestore:
`deleteDoc`, `doc`, `collection`, etc.) de varios `<script>` normales
(abajo, donde vive la lógica de Fila Báscula, Pendientes, etc. — ver
sección 30.1). Para que el código de los `<script>` normales pueda usar
Firestore, existe un patrón de "puentes" ya establecido:
`window.dbFilaBasculaAgregar`, `Actualizar`, `Suscribir`,
`BuscarAbiertas`, `BuscarPorTipo`, `Leer`, `PorRango` — todos definidos
dentro del módulo y expuestos a `window` para que el script normal los
use. **Pero nunca se creó el puente para eliminar.**
`eliminarRegistroFilaBascula()` (línea ~7507, dentro de un `<script>`
normal) llamaba a `deleteDoc(doc(db_f, COL_FILA_BASCULA, id))` en
crudo — código que compila perfecto (no hay forma de detectarlo con
`node --check`, ambos bloques son JS válido por separado) pero que
truena en el navegador porque `deleteDoc`/`doc` no existen fuera del
módulo. La sección 20.1 (donde se implementó este botón originalmente)
nunca lo notó porque probablemente se probó en un momento en que el
código todavía no estaba dividido en bloques separados, o simplemente
no se volvió a probar tras una reorganización posterior — no quedó
registrado cuál de las dos cosas pasó.

**Por qué "borrar un ticket normal" sí funcionaba mientras tanto:** esa
llamada (línea 1819) vive DENTRO del propio `<script type="module">`,
antes del punto donde empiezan los bloques normales — no necesita
puente. Coincidencia de apariencia (mismo `deleteDoc(doc(...))`), pero
un caso funciona y el otro no, dependiendo únicamente de en qué bloque
de `<script>` vive cada línea.

**Corrección aplicada:**
1. Nuevo puente `window.dbFilaBasculaEliminar(filaId)` agregado junto a
   los demás puentes de Fila Báscula, mismo patrón exacto.
2. `eliminarRegistroFilaBascula()` ahora llama a
   `window.dbFilaBasculaEliminar(id)` en vez de `deleteDoc(doc(...))`
   directo.
3. El mensaje de error de esa función se queda mejorado de forma
   permanente (muestra `e.code`/`e.message` reales) — ya sirvió una vez
   para diagnosticar esto en minutos en vez de adivinar a ciegas, vale
   la pena mantenerlo así para cualquier fallo futuro de este botón.

**Lección agregada a la sección 0.5** (ver el bullet ampliado de
"Arquitectura de 3 bloques `<script>`"): antes de escribir o tocar
CUALQUIER llamada directa a una función de Firebase fuera del módulo,
verificar que su puente exista — no asumir que "ya debe estar" solo
porque llamadas parecidas sí funcionan.

### Rango de Núcleo → Muro: confirmado y corregido
Retomando el hallazgo de la sesión anterior (RANGOS['MURO']['NUCLEO']
decía '0.01 a 0.50 ton' en el código, mientras Jesús pedía '0.02 a
0.20 ton', y los 817 tickets históricos ya traían este último valor):
Jesús confirmó que el correcto es **0.02 a 0.20 ton**. Se corrigió la
tabla `RANGOS` en `index.html` (línea ~4350) — antes probablemente se
copió por error el mismo valor que usan Cuerpo 3/4/5 y Morro para
Núcleo. Con esto, cualquier ticket NUEVO de Núcleo→Muro se va a
autorrellenar bien desde ahora.

**Importante para no confundirse después:** como los 817 tickets
históricos de Núcleo→Muro YA traían "0.02 a 0.20" (el valor correcto),
**no hace falta correrles ninguna corrección con
`CORREGIR_RANGO_NUCLEO.html`** — el problema estaba 100% en el
catálogo, no en los datos de Muro. La corrección real pendiente de
aplicar con esa herramienta sigue siendo solo el grupo Núcleo→Acopio
Marino, donde sí hay tickets con el rango equivocado. Sin confirmar
todavía si `MORRO` (que en el mismo catálogo `RANGOS` también tiene
'0.01 a 0.50 ton' para Núcleo) tiene el mismo problema — no se tocó,
pendiente de preguntarle a Jesús.

**Sin tocar:** `CORREGIR_RANGO_NUCLEO.html` no necesitó cambios — ya
tenía el objetivo correcto (0.02 a 0.20 ton) para el grupo Muro desde
que se construyó.

---

## 45. 22-jul-2026 — Cierra el último pendiente de la sección 44: MORRO → NUCLEO no necesita corrección

Se retomó el único punto que había quedado abierto al cerrar la sección
44 (¿`RANGOS['MORRO']['NUCLEO']` tiene el mismo problema que tenía
`MURO`, con el valor `'0.01 a 0.50 ton'` posiblemente copiado por
error de Cuerpo 3/4/5?).

**Verificación contra `index.html` (no se asumió nada de la bitácora):**
se confirmó con `grep` que `RANGOS['MORRO']['NUCLEO']` efectivamente
sigue en `'0.01 a 0.50 ton'` (línea ~4360), igual que el valor viejo e
incorrecto que tenía Muro antes de la sección 44. A diferencia del caso
de Muro, aquí no había forma de verificar por datos históricos porque
Claude no tiene acceso a Firestore desde este entorno — solo al
archivo estático.

**Confirmado por Jesús:**
- El valor correcto para MORRO → NUCLEO **sí es `'0.01 a 0.50 ton'`**
  (a diferencia de Muro, que sí necesitaba el cambio a `0.02 a 0.20`).
  **No se toca `RANGOS` en `index.html`.**
- No hace falta correr ninguna corrección de tickets históricos:
  **todavía no existe ningún ticket capturado de Morro→Núcleo en
  Firestore**, así que no aplica `CORREGIR_RANGO_NUCLEO.html` ni
  ninguna herramienta similar.

**Resultado:** cero cambios de código. Se cierra sin construir nada.

### Pendiente — no queda ningún punto abierto conocido
Con esto se cierra el último pendiente heredado de la sección 44. El
batch de 13 (sección 32) sigue completo (sección 42) y no hay ningún
otro punto abierto identificado en el historial al 22-jul-2026.

---

## 46. 22-jul-2026 — Auditoría cruzada (2 IAs distintas) + correcciones mecánicas aplicadas

### Contexto
Jesús le pidió a dos IAs distintas que auditaran la app de forma
independiente (`Auditoria1.md` y `Auditoria2.md`, ambas generadas fuera
de esta conversación) y las compartió aquí para decidir qué corregir.
**Antes de tocar una sola línea, Claude verificó cada hallazgo contra
el código real** (`index.html`, `sw.js`, `manifest.json` tal como
estaban subidos hoy) — no se le tomó la palabra a ninguna de las dos
auditorías, siguiendo la lección de la sección 30.4/44 ("no asumir que
algo existe o no existe solo porque lo dice un documento externo").

**Resultado de la verificación: las dos auditorías fueron muy
precisas.** Prácticamente todos los hallazgos se confirmaron
exactamente como los describían, incluyendo conteos exactos (522
estilos inline, 108 `alert()`, 12 `!important`, 7 referencias a
`SIXSIGMA.md` en las líneas exactas que decían). El único hallazgo que
Claude marcó como dudoso fue el de terminología Black Belt/Green Belt
(Auditoría 1, H-04) — la bitácora dice "Black Belt" consistentemente en
6 lugares y "Green Belt" no aparece ni una vez, así que probablemente
la otra IA mezcló contexto externo que no tiene que ver con este
proyecto. **Jesús confirmó: se ignora — la certificación real es Black
Belt en Lean Six Sigma, y esta app también sirve para sacar los datos
de esa certificación.**

### `</div>` huérfano — verificación propia, no solo la de la auditoría
La Auditoría 2 (H-01) reportó un `</div>` sobrante justo después de
cerrar `#tab-admin` (línea 4180). Antes de borrarlo, Claude corrió su
**propio** contador de profundidad de anidación de `<div>` sobre el
archivo real — pero con un cuidado adicional que ninguna de las dos
auditorías menciona explícitamente: **hay que excluir el contenido de
los bloques `<script>` del conteo**, porque esos bloques generan HTML
dinámico dentro de strings de JS (`html += '<div>...'`) que tienen su
propia lógica interna de apertura/cierre y ensucian cualquier conteo
ingenuo hecho sobre el archivo completo. Contando SOLO el HTML estático
real (fuera de `<script>`): **antes del fix, 513 aperturas contra 514
cierres — confirmado, sobraba un cierre.** Después de quitar esa línea:
513/513, perfectamente balanceado. Verificado con Python, no solo con
lectura visual.

### Correcciones mecánicas aplicadas hoy (cero riesgo, sin tocar lógica de negocio)
Jesús decidió: (1) el zoom del viewport lo decide Claude para mejor
flujo de uso — se quita el bloqueo; (2) sí subir `CACHE_NAME` al
corregir `sw.js`; (3) ignorar lo de Black Belt/Green Belt (ver arriba).
Con eso, se aplicaron en una sola entrega (todos mecánicos, ninguno
toca funciones ni lógica):

- **`index.html`:**
  - Quitado el `</div>` huérfano de la línea 4180 (ver arriba).
  - 4 colores hex fijos en Fila Báscula → variables CSS existentes:
    `#c62828`→`var(--danger)` (🗑️ eliminar), `#2e7d32`→`var(--accent)`
    (🟢 Entra a fila), `#f9a825`→`var(--warning)` (🟡 Destarado),
    `#546e7a`→`var(--info)` (↩️ Liberar). Mismo patrón ya usado en otras
    partes de la app (botones Autorizar/Revocar de Admin, línea ~793).
  - Banner "Instalar app" (PWA): 2 usos de `#0f6e56` fijo →
    `var(--accent)`, para que responda a modo oscuro.
  - Comentario HTML con `--` inválido (línea ~2535) → cambiado a `—`
    (guion largo).
  - `&` sin escapar en la URL de Google Fonts (línea 35) → `&amp;`.
  - Las 7 referencias a `SIXSIGMA.md` (líneas 508, 692, 2033, 2492,
    3910, 7303, 8024) → `INSTRUCCIONESAPP.md`.
  - Quitado `maximum-scale=1.0` del `<meta name="viewport">` — permite
    zoom táctil de nuevo (decisión de Claude, no se encontró ninguna
    razón de negocio en el código ni en la bitácora que justificara
    bloquearlo, y el contexto de uso real — celular en campo, sol,
    posible cansancio visual — se beneficia más de poder acercar la
    pantalla que de evitar que alguien la desalinee sin querer).

- **`sw.js`:**
  - Agregado `cdn.jsdelivr.net` a la lista de exclusión de caché
    (`esFirebaseOExterno`), mismo criterio que ya tenía
    `cdnjs.cloudflare.com` — cubre `xlsx.js` y `chart.js`.
  - `CACHE_NAME` subido de `'control-acarreos-v3'` a
    `'control-acarreos-v4'` para forzar la actualización en los
    celulares que ya tienen la app instalada.

- **`manifest.json`:** sin cambios — el hallazgo de Auditoría 2 (H-04,
  sin variante de color para modo oscuro) requiere una decisión de
  diseño (media query en `<meta name="theme-color">`, que el estándar
  de `manifest.json` no soporta de forma nativa/confiable) y queda para
  cuando se aborde el backlog grande, no es un fix mecánico de una
  línea.

**Verificación antes de entregar:** `node --check` sobre los 4 bloques
`<script>` de `index.html` (limpio), `node --check` sobre `sw.js`
(limpio), `grep` de IDs duplicados (ninguno), y el conteo de balance de
`<div>` ya descrito arriba.

### Pendiente — backlog grande, confirmado por Jesús para "el final"
Jesús pidió dejar esto para después de terminar con la bitácora y las
correcciones mecánicas, ya que toma más tiempo. Quedan 3 hallazgos, ya
diagnosticados y priorizados por ambas auditorías:

1. **Lecturas masivas de Firestore repetidas por panel** (Auditoría 1,
   H-01/H-05) — Reportes, Suministros, Resumen y Bancos mantienen 3
   cachés independientes en memoria, cada uno dispara su propia lectura
   completa de `acarreos` sin filtro de fecha. Ya diagnosticado en la
   sección 10 (15-jul-2026) con una dirección de solución redactada
   (10.2: documento agregado único + `increment()`, caché compartida
   entre los 4 paneles) — **nunca se construyó**. Es el hallazgo más
   crítico de las dos auditorías combinadas: con el cupo gratuito de
   Firestore compartido con el bot de Telegram, puede dejar sin
   servicio a ambos en pleno uso de obra. Debería ser lo primero del
   backlog grande cuando se retome.
2. **522 estilos inline / solo 2 media queries reales (1 de
   accesibilidad, 1 de breakpoint) y 12 `!important`** (Auditoría 1,
   H-02) — refactor progresivo a clases/variables CSS, no urgente.
3. **108 `alert()`/16 `confirm()` nativos como mecanismo de
   validación** (Auditoría 1, H-03) — mejora de UX, no bloqueante.

También sin resolver (no es un fix de código, es una decisión de
diseño): variante de modo oscuro para `manifest.json` (Auditoría 2,
H-04, ver arriba).

### Sin tocar
`manifest.json` no se modificó. El backlog grande (Firestore, estilos
inline, `alert()`) tampoco — queda pendiente para cuando Jesús lo pida,
después de esta ronda de correcciones mecánicas.

---

## 47. 22-jul-2026 — Segunda ronda de auditorías (verificación de la sección 46) + 🔴 corrección de un error propio: el fix de lecturas masivas de Firestore (H-01) SÍ estaba construido

### Las correcciones mecánicas de la sección 46: confirmadas sin regresiones
Jesús le pidió a las mismas dos IAs que revisaran los cambios de la
sección 46 (`SegundaAuditoria1.md`, `SegundaAuditoria2.md`). Ambas
confirman, de forma independiente, que los 8 fixes mecánicos quedaron
bien aplicados y sin efectos secundarios: `</div>` balanceado (513/513
fuera de `<script>`, mismo método de conteo que ya se usó en la sección
46), 0 referencias a `SIXSIGMA.md`, 0 `--` residual en comentarios, los
5 colores de Fila Báscula + banner PWA ya usan variables CSS, zoom
liberado sin romper nada, `sw.js` con `jsdelivr.net` + `CACHE_NAME` v4,
`manifest.json` intacto (pospuesto a propósito). `node --check` limpio
en los 4 bloques `<script>` y en `sw.js`. Cero IDs duplicados. Cero
regresiones nuevas detectadas por ninguna de las dos.

### 🔴 Error real de Claude, encontrado por `SegundaAuditoria1.md` (hallazgo R-1) — corregido
La sección 46 (escrita hoy, antes de esta) afirmaba que la solución al
hallazgo H-01 de la primera Auditoría 1 (lecturas masivas de Firestore
por panel) **"nunca se construyó"** y la dejaba en el backlog grande.
**Esto es falso.** Ya estaba implementada desde el **15-jul-2026**,
documentada en la sección 10.3 de este mismo archivo — que Claude no
volvió a revisar antes de escribir esa frase en la sección 46, y
tampoco verificó contra el código en ese momento (rompiendo su propia
disciplina de "verificar contra `index.html` real antes de afirmar algo
sobre qué existe o no", sección 30.4/44).

**Verificado ahora, con `grep` directo sobre `index.html`:**
- `aplicarResumen()` (línea ~1133) escribe el mismo `payload` con
  `increment()` en DOS documentos: `resumenes/{año-mes}` (como
  siempre) Y `resumenes/historico_global` (línea ~1243-1254).
- `asegurarHistoricoGlobal(idBanner)` (línea ~4779) hace **una sola
  lectura** de `resumenes/historico_global`, cacheada en
  `window.historicoGlobalData`, y pinta un banner de texto ("📌 Total
  histórico: N viaje(s) · X ton").
- Se llama exactamente desde los 4 paneles que reportaba el hallazgo
  original: `renderDashboard()` (Gráficos, línea 5755),
  `initResumenTab()` (línea 6264), `initBancosTab()` (línea 8962),
  `initReportesTab()` (línea 9544).

**Lo que SÍ sigue pendiente de verdad** (esto es lo único real del
backlog de Firestore, no todo el mecanismo):
1. El botón "Ver TODO el histórico" (con `traerTodoFirestore()` y los 3
   cachés de detalle `dashHistoricoCompleto`/`resumenHistoricoCompleto`/
   `reportesHistoricoCompleto`) sigue sin cooldown ni tope duro — sigue
   siendo el hallazgo H-05 de la Auditoría 1 original, sin construir.
   Ya no es crítico como antes, porque ahora es una acción explícita del
   usuario (clic en un botón), no algo que pase solo al entrar al panel.
2. Esos 3 cachés de detalle siguen separados por panel (no se
   unificaron en uno solo) — mejora posible, no urgente.
3. **Acción pendiente de Jesús, no de código:** correr el botón
   "Recalcular total histórico" (Admin) **una sola vez** en producción,
   si no se ha corrido todavía — sin eso, el banner de "Total histórico"
   se queda mostrando "(pendiente respaldo inicial)" en vez del total
   real acumulado desde el inicio del proyecto. No hay forma de que
   Claude confirme esto desde este entorno (no tiene acceso a
   Firestore) — hay que confirmarlo con Jesús directamente.

### Observación menor de `SegundaAuditoria1.md` (no urgente)
Reporta 9 selectores CSS repetidos dentro de los bloques `<style>`
(`.active`, `.open`, `.nav-drawer`, `.lbl`, `.val`, entre otros) — la
propia auditoría aclara que probablemente son variantes de
tema/estado, no duplicados accidentales de la sección 46. Queda anotado
para revisar cuando se aborde el refactor de CSS (H-02 del backlog
grande), sin acción ahora.

### Sin tocar
Ningún cambio de código en esta sección — todo lo de aquí es
verificación y corrección de la BITÁCORA, no de `index.html`/`sw.js`/
`manifest.json`. El backlog grande sigue igual que en la sección 46,
solo que ahora acotado correctamente (ver arriba): el hallazgo de
lecturas masivas por panel YA no es "sin construir", es "construido,
con 2 mejoras menores pendientes".

### Lección agregada a la sección 0.5
Se refuerza (no se duplica, ya existía en 30.4/44): antes de escribir
en la bitácora que algo "no se ha construido" o "sigue pendiente",
grep del código real primero — sobre todo si el tema ya tiene una
sección numerada anterior en este mismo archivo (en este caso, la 10.3
ya lo desmentía y estaba a 656 líneas de donde se escribió el error).

---

## 48. 22-jul-2026 — 🔴 Bug real reportado por Jesús: Metas nunca actualizaba "Colocación Terrestre"/"Colocación Marina" de ningún Cuerpo

### El bug (con captura de un ticket de prueba)
Jesús mandó capturas de un ticket inventado: Núcleo, destino Cuerpo 1,
vertido Terrestre, 850 ton. La fila NÚCLEO de Metas sí mostraba los 850
(Real mes), pero la fila **COLOCACION TERRESTRE** del mismo Cuerpo se
quedaba en 0/0 — y explicó que debería sumar ahí también, aparte de en
Núcleo. Lo mismo aplicaría para Vertido Marino → fila "Colocación
Marina".

### Causa raíz confirmada
`initMetasTab()` calcula "Real mes" a partir de
`resumenes/{mes}.por_combinacion` y "Real acumulado" a partir de
`resumenes/avance_acopio.colocado_por_fila` — ambos mapas indexados por
`destino + material`. El problema: **ninguna de las dos funciones que
alimentan estos mapas (`aplicarResumen()`, `aplicarAgregadoAvanceAcopio()`)
guardaba jamás una entrada usando el CONCEPTO/VERTIDO como si fuera un
material** — solo guardaban por el material real (NUCLEO, BERMA, etc.).
Como "COLOCACION TERRESTRE"/"COLOCACION MARINA" son filas del catálogo
de Metas que representan un CORTE distinto (por tipo de colocación, no
por material), nunca tuvieron una ruta de datos propia. No era un bug
de un ticket en particular — **nunca había datos en esas filas, para
ningún Cuerpo, desde que existe la pestaña Metas.**

### Fix aplicado — en las 4 funciones que tenían que cambiar juntas
Se agrega una entrada ESPEJO adicional (sin quitar la del material
real) bajo el pseudo-material `COLOCACION_TERRESTRE`/`COLOCACION_MARINA`
cuando `conceptoEfectivo(rec)` es una colocación y el destino no es
MURO (Muro no tiene fila propia de colocación, usa `colocado_muro`
aparte, sin cambios ahí):
1. `aplicarResumen()` (línea ~1133) — entrada espejo en `por_combinacion`.
2. `aplicarAgregadoAvanceAcopio()` (línea ~1044) — entrada espejo en
   `colocado_por_fila`.
3. `recalcularResumen()` (línea ~1272) — **duplica la lógica de
   `aplicarResumen()` de forma independiente**, no la reutiliza — se
   tuvo que reflejar el mismo fix ahí también, o el botón "Recalcular
   resumen" habría seguido reconstruyendo el histórico SIN estas filas.
4. `recalcularAgregadoAvanceAcopio()` (línea ~1396) — mismo caso, duplica
   la lógica de `aplicarAgregadoAvanceAcopio()` de forma independiente,
   mismo fix reflejado.

Es intencional que las toneladas se cuenten dos veces dentro de
`por_combinacion`/`colocado_por_fila` (una vez por material real, otra
por tipo de colocación) — son dos vistas distintas del mismo viaje,
mismo criterio que ya usa `avance_acopio` con
`total_marino`/`total_terrestre` en paralelo a `colocado_por_fila`.

**Nota de scope descartada como falsa alarma:** antes de tocar código,
Claude sospechó que `conceptoEfectivo()` (declarada en el `<script>`
normal de más abajo, línea ~4733) podría no estar disponible al
llamarse a secas desde `aplicarResumen()`/`aplicarAgregadoAvanceAcopio()`
(que viven en el `<script type="module">` de arriba) — mismo patrón que
el bug real de `deleteDoc` de la sección 44. Se descartó tras revisar:
a diferencia de un `import` de módulo (que NUNCA se filtra al scope
global), una `function` declarada en un `<script>` normal SÍ se cuelga
de `window` — y como estas llamadas solo se EJECUTAN cuando alguien
guarda un ticket (mucho después de que todos los `<script>` de la
página ya cargaron), sí encuentran `conceptoEfectivo` sin problema. Ya
estaba funcionando así en producción (por eso "Real mes" de Núcleo sí
salía bien en la captura de Jesús). Aun así, se usó el patrón más
seguro `window.conceptoEfectivo(rec)` con respaldo (mismo que ya usaba
el código en la línea 9759) en vez de la llamada a secas, para no
depender de este razonamiento de scope en el futuro.

### Pendiente — acción de Jesús, no de código
Este fix usa `increment()`, así que **solo aplica a tickets nuevos**.
Para que el histórico ya capturado también sume en las filas de
Colocación, hay que correr en Admin, en este orden: (1) "Recalcular
resumen" y (2) "Recalcular totales de Avances/Acopios". Sin confirmar
todavía si Jesús ya las corrió.

### Verificado antes de entregar
`node --check` en los 4 bloques `<script>` (limpio), balance de `<div>`
fuera de `<script>` (513/513, sin cambios ya que esta sección no tocó
HTML), 0 IDs duplicados.

### Sin tocar
`initMetasTab()` no necesitó ningún cambio — ya suma por
`destino+material` tal cual venga la clave, así que basta con que el
agregado le entregue la clave correcta. Tampoco se tocó el catálogo
`RANGOS`/`RANGOS_ACOPIO` ni `CATALOGO_TOTALES`.

---

## 49. 22-jul-2026 — Muro Tarquina se QUITA de la pestaña Metas (decisión de Jesús) + rename a "Muro" en el código

### Intento de fix (no documentado en su momento, revertido después)
Después de la sección 48, Jesús reportó que "Real acumulado" de Muro
Tarquina seguía en 0 en Metas pese a tener ~18,000 ton capturadas. Se
diagnosticaron y corrigieron DOS causas reales, verificadas contra el
código:
1. **Nombre distinto para el mismo Cuerpo:** los tickets guardan
   `destino: "MURO"` (dropdown de captura, `RANGOS`,
   `EXCLUSIONES_DESTINO_POR_MATERIAL`, etc. — todo usa "MURO"), pero el
   Excel del programa nombra a ese mismo Cuerpo "MURO TARQUINA" (así
   llega a `programa.cuerpos`). `initMetasTab()` armaba su clave de
   búsqueda con el nombre del Excel ("MURO TARQUINA||material"), pero
   los agregados (`por_combinacion`/`colocado_por_fila`) se llenan con
   la clave real del ticket ("MURO||material") — nunca coincidían, ni
   para Real mes ni para Real acumulado. Se corrigió con un alias
   puntual solo en la búsqueda (`ALIAS_CUERPO_A_DESTINO`).
2. **Muro nunca escribía su desglose por material:**
   `aplicarAgregadoAvanceAcopio()`/`recalcularAgregadoAvanceAcopio()`
   excluían a Muro de `colocado_por_fila` a propósito (solo sumaban al
   total plano `colocado_muro`) — tenía sentido antes de que Muro
   tuviera materiales propios en Metas, pero quedó obsoleto. Se agregó
   que Muro también escribiera su entrada real de `colocado_por_fila`
   (conservando `colocado_muro` para no romper el resumen plano de
   Avances/Acopios).
3. Se le indicó a Jesús además corregir a mano una tercera cosa (Meta
   total de Núcleo/Muro en 0 porque el Excel nunca trajo cantidad ahí):
   usar el ya existente `MURO_META_TOTAL = 20000` como respaldo del
   `cantidad_total` faltante, solo para esa fila.

**Resultado: Jesús reportó que "no se corrigió para nada"** — el
desglose de Muro en Metas seguía sin cuadrar bien pese a las 3
correcciones de arriba. No se investigó una cuarta causa porque Jesús
prefirió simplificar en vez de seguir depurando.

### Decisión final: Muro se quita de Metas
Jesús pidió: (1) quitar Muro Tarquina de la pestaña Metas por completo,
y (2) renombrar "Muro Tarquina" → "Muro" en todo el código, para evitar
confusiones futuras con el nombre real del destino.

**Cambios aplicados en `index.html`:**
- `initMetasTab()`: se quita `'MURO TARQUINA'` de `ORDEN_CUERPOS_METAS`;
  se agrega una exclusión explícita (`if (cuerpo.toUpperCase().startsWith('MURO')) return;`)
  que salta cualquier Cuerpo cuyo nombre empiece con "MURO" — cubre
  tanto "MURO" como "MURO TARQUINA", sin depender de cuál sea el nombre
  exacto que traiga el Excel. Se revierte el alias
  `ALIAS_CUERPO_A_DESTINO` (ya no hace falta, no se procesa ese Cuerpo).
  Se quita también `SECCIONES_EXTRAORDINARIAS` y el banner
  "Extraordinarios" (sección 43) — su único miembro era Muro Tarquina;
  al quitar su tarjeta, el banner ya no tiene para qué existir.
- `aplicarAgregadoAvanceAcopio()` y `recalcularAgregadoAvanceAcopio()`:
  se **revierte** el fix del punto 2 de arriba — Muro vuelve a escribir
  solo `colocado_muro` (total plano para Avances/Acopios), sin
  `colocado_por_fila` ni `colocado_por_vertido`. Ya no tiene sentido
  seguir escribiendo ese desglose si Metas nunca lo va a leer — son
  escrituras de Firestore de más, sin ningún lector.
- Comentarios que decían "Muro Tarquina" renombrados a "Muro" en las 3
  funciones tocadas. Queda UNA mención de "MURO TARQUINA" a propósito
  (línea ~8917, dentro de un comentario que explica por qué se quitó —
  ahí sí importa el nombre real del Excel para que quede claro el
  motivo histórico).

**Lo que NO se tocó:** el total plano de Muro en Avances/Acopios
(`colocado_muro`, `MURO_META_TOTAL = 20000`) sigue funcionando exactamente
igual que siempre — esta sección solo afecta la pestaña Metas. Tampoco
se tocó el Excel/`programa_2026` en Firestore — el Cuerpo "MURO
TARQUINA" sigue existiendo ahí tal cual, solo que ahora Metas lo
ignora explícitamente por nombre.

### Verificado antes de entregar
`node --check` en los 4 bloques `<script>` (limpio), balance de `<div>`
fuera de `<script>` (513/513, sin cambios — no se tocó HTML), 0 IDs
duplicados, 0 referencias funcionales a "MURO TARQUINA" (solo la
histórica ya descrita).

### Pendiente
Ninguno de código. Queda pendiente de Jesús: correr "Recalcular resumen"
y "Recalcular totales de Avances/Acopios" una vez más en Admin, para
que el histórico deje de traer las entradas de `colocado_por_fila` de
Muro que sí se llegaron a escribir mientras estuvo activo el intento
fallido (no son incorrectas, solo quedan sin usar — no es indispensable
correrlo, pero deja el agregado más limpio).

---

## 50. 23-jul-2026 — Lista grande de Jesús ("CAMBIOS URGENTES"): se divide en fases, aún sin construir

### Contexto
Jesús pidió en un solo mensaje 7 cosas distintas, varias tocando zonas
distintas de `index.html` (Captura, Fila Báscula, Resumen, Base de
datos, y datos de `programa_2026` en Firestore). Siguiendo la regla de
"una fase por entrega" (sección 0), no se escribió código todavía — se
propuso dividir el pedido y se le pidió a Jesús que eligiera con cuál
empezar. **Esta sección deja registradas las 6 fases para que cualquier
IA que retome esto sepa exactamente qué falta, aunque se hayan hecho en
sesiones/chats distintos.**

### Verificado antes de proponer fases
Se confirmó contra el código real que los dos pedidos que abrieron la
conversación (quitar Muro Tarquina de Metas, renombrar "Muro Tarquina"
→ "Muro") **ya estaban hechos desde la sección 49 (22-jul-2026)** — no
hizo falta ningún cambio nuevo, solo se verificó con `grep` que los
dropdowns dicen "Muro" y que Metas excluye `startsWith('MURO')`.

### Fase 1 — Captura inteligente (pendiente)
- Filtro para que "Material y Destino" no permita registrar un
  movimiento de un Acopio hacia sí mismo (p. ej. "Acopio Marino" →
  "Acopio Marino", "Acopio Terrestre" → "Acopio Terrestre"). Hoy el
  formulario lo permite y solo advierte con un mensaje amarillo (ver
  imagen adjunta de Jesús del 23-jul), pero debería bloquearse o al
  menos no ofrecerse como opción de Destino cuando coincide con Origen.
- Autoselección de Destino según Origen ("llenado inteligente"): si
  Origen = "Acopio Marino" → Destino se preselecciona "Vertido Marino";
  si Origen = "Acopio Terrestre" → Destino se preselecciona "Vertido
  Terrestre". Debe seguir siendo editable, solo cambia el valor por
  default para agilizar la captura.

### Fase 2 — Tickets con advertencia (pendiente)
- Al cerrar la captura, si el material que sale de un Acopio no tiene
  existencia actual en ese Acopio, mostrar una alerta de confirmación
  ("¿seguro? este material no está en existencia actualmente").
- Si Jesús/el capturista autoriza de todos modos, el ticket se guarda
  con una marca de "Advertencia" (ícono triangular amarillo).
- Nueva sección en "Base de datos", junto a "Ver tickets de barcaza":
  **"Tickets de acopio"**, con dos botones — "Correctos" y "Con
  advertencia" (o inconsistencias). Misma lógica de edición que ya se
  usa para los demás tickets de esa sección.

### Fase 3 — Fila Báscula / Camiones destare (pendiente)
- Para **capturistas**: cambiar "Tus camiones" / "Otros camiones" de
  dos listas simultáneas a dos botones tipo switch — al presionar uno
  se muestra esa lista y se oculta la otra (evita lista larga en
  pantalla chica). Para **coordinador** y **master**: sigue una sola
  lista completa + buscador por placas (sin cambios para ellos).
- Bug a investigar y corregir: al dar "Entra a fila" y luego "Liberar"
  por error, el camión debe quedar completamente libre (no debe seguir
  apareciendo como "En fila, falta destarado") y su timestamp de fila
  debe reiniciarse para que otro capturista pueda volver a registrar su
  entrada desde cero. Pendiente verificar contra el código real si el
  reinicio de timestamp ya ocurre o no (no asumir, sección 0.5).
- Visibilidad: cuando un capturista da "Entra a fila", ese camión debe
  desaparecer de la lista para los demás capturistas — solo debe seguir
  visible para quien lo ingresó, y para coordinador/master (que ya
  pueden liberar camiones, sin cambios en ese permiso).

### Fase 4 — Info del ticket en destarado (pendiente)
- La tarjeta que muestra el ticket en proceso de destarado (ver imagen
  de Jesús: Boleta 555, Placas AAA) no muestra Folio (aparece en
  blanco) y le faltan Material, Banco y Destino. Agregar los 4 campos
  para identificar el ticket más rápido desde báscula.

### Fase 5 — Resumen en tiempo real entre roles (pendiente)
- Reportado por Jesús: con dos capturistas registrando desde celulares
  y una cuenta master abierta en tablet en la pestaña "Resumen", los
  totales no se actualizan en tiempo real. Debe funcionar para todos
  los rangos/roles. Pendiente diagnosticar si el listener de Resumen no
  existe, está mal filtrado, o es un problema de agregado no
  actualizado en escritura (revisar patrón de "costo de lecturas" de la
  sección 0.5 antes de proponer un listener nuevo sin filtro).

### Fase 6 — Cantidades de Programa 2026 (pendiente, es dato + subida a Firebase, no cambio de `index.html`)
Cantidades a agregar a los conceptos "Colocación Marina", "Colocación
Terrestre" y "Rezaga" (hoy sin cantidad) para cada Cuerpo:

| Cuerpo   | Marino        | Terrestre    | Rezaga    |
|----------|---------------|--------------|-----------|
| Cuerpo 1 | 115,214.86    | 90,646.76    | 5,444.68  |
| Cuerpo 2 | 234,281.18    | 177,051.58   | 5,640.96  |
| Cuerpo 3 | 319,545.48    | 264,317.66   | 5,640.96  |
| Cuerpo 4 | 1,342,107.51  | 673,316.78   | 11,046.88 |
| Cuerpo 5 | 1,912,745.20  | 670,178.69   | 11,987.04 |
| Morro    | 432,167.74    | 114,197.09   | 1,880.32  |

**Cuerpo 3 / Marino confirmado (23-jul-2026):** Jesús escribió
"319,545,48" (con coma en vez de punto) por error de dedo; confirmó que
es "319,545.48". Tabla ya corregida arriba, lista para subirse a
Firestore cuando se trabaje la Fase 6.

### Pendiente
Las 6 fases de arriba, todas sin construir. Jesús eligió con cuál
empezar en esta misma sesión — ver la sección siguiente (cuando exista)
para el detalle de implementación de la fase que se haya trabajado.
No se tocó `index.html` en esta sección — solo bitácora.

---

## 51. 23-jul-2026 — Fase 3 (Fila Báscula/Camiones destare): 3 bugs corregidos + división Tus/Otros solo capturista. Fase 6 (MORRO) ya estaba hecha.

### Contexto
Jesús reportó 4 problemas de golpe, etiquetados como "después de
verificar Fase 4" pero el contenido real corresponde a **Fase 3** (la
sección 50 de arriba), no a Fase 4 (esa sigue sin construir). Se
verificó contra `index.html` real antes de tocar nada (regla 0.5).

### 50.1 — ✅ CORREGIDO — "Liberar" no reiniciaba el ciclo de destare
`liberarCamionFilaSegunda()` solo limpiaba `reclamado_por`, dejaba
`t1b_fila_ts` intacto → el camión seguía mostrando "En fila, falta
Destarado" en vez de volver a "Falta Entra a fila". Ahora también
resetea `t1b_fila_ts: null` y `destarado_por: ''`, así el próximo
`registrarEntradaFilaSegunda()` arranca un ciclo de tiempos nuevo desde
cero, como pidió Jesús.

### 50.2 — ✅ CORREGIDO — Coordinador no podía liberar
`puedeLiberar` en `filtrarBuscadorDestare()` solo comprobaba
`rol === 'admin' || rol === 'master'` — le faltaba `'coordinador'`. Ya
se agregó. **Sobre "el botón no aparece en la cuenta Master" que
reportó Jesús:** el código de `puedeLiberar` para `master` ya estaba
correcto antes de este cambio (no requería el fix); no se pudo
reproducir la causa exacta sin verlo en vivo — si sigue sin aparecer
después de este despliegue, revisar en consola del navegador si
`window._currentUserRol` realmente vale `'master'` en esa sesión (no
asumir por el nombre de la cuenta) y si `dbFilaBasculaActualizar`
completó sin error al dar "Entra a fila".

### 50.3 — ✅ CORREGIDO — "Tus camiones"/"Otros camiones" ahora solo se divide para capturista
Antes `filtrarBuscadorDestare()` aplicaba el split tuyos/otros a TODOS
los roles por igual. Ahora:
- **Capturista:** dos botones tipo switch (`window._destareVistaTab`,
  `'tuyos'` por default) — solo se pinta la lista activa, la otra queda
  oculta por completo.
- **Coordinador/master:** una sola lista completa con TODOS los
  camiones visibles (sin filtro de reclamado_por más que el que ya
  aplicaba `esAdminOMasterCoordDestare`), igual que antes — sin
  cambios de permiso para ellos, solo de presentación.

### Visibilidad (camión reclamado sigue viéndose para otro capturista)
El filtro `visibles` (línea ~7638) ya excluía correctamente camiones
con `reclamado_por` de otro uid antes de este cambio — es lógica
correcta contra un listener en tiempo real (`onSnapshot` global, sin
caché obsoleta). No se encontró un bug adicional de fondo aquí; es
posible que lo reportado por Jesús fuera consecuencia del mismo split
tuyos/otros roto de 50.3 (un camión reclamado por master podía seguir
cayendo del lado "otros" visualmente aunque la lista de fondo ya lo
filtrara mal en otro punto). Pendiente que Jesús confirme en campo tras
este despliegue si el síntoma persiste.

### Fase 6 (MORRO) — ya estaba implementada, no requirió cambios
Jesús pidió agregar a Excel las cantidades de MORRO (Núcleo 339,691.17,
Secundaria 2 59,265.44, Secundaria 1 54,931.65, Berma 50,921.33, Berma
de apoyo 41,555.24). Se verificó `CATALOGO_TOTALES` (línea ~4519) y
esos 5 valores YA estaban cargados exactos, igual que
`CATALOGO_VERTIDO_TOTALES` con Morro Marino/Terrestre (línea ~4549).
No se tocó nada de esta parte — ya está en producción.

### Verificación de sintaxis (regla 24.4/30.5)
- `node --check` sobre el `<script type="module">` principal: OK.
- `node --check` sobre los 4 bloques `<script>` normales no vacíos:
  3 OK; el 4to (`plain5`) da el mismo falso positivo ya documentado en
  24.4 (corte de comentario por la extracción ingenua con regex) — se
  confirmó que las funciones tocadas hoy viven en el bloque que SÍ pasó
  limpio (`grep` de `liberarCamionFilaSegunda`/`_destareVistaTab`).
- `id=` duplicados: 0 de 443 IDs totales.

### Sin tocar
Fase 1, 2, 4, 5 (siguen pendientes, ver sección 50). No se tocó
`SUBIR_PROGRAMA_2026.html`.

### Pendiente
- Jesús debe probar en campo con cuenta master real si el botón
  "Liberar" aparece ahora (ver nota de 50.2).
- Confirmar que la visibilidad entre capturistas quedó resuelta tras
  el fix de 50.3, o si sigue siendo un bug aparte.
- Fases 1, 2, 4, 5 del pedido original de la sección 50.

---

## 52. 23-jul-2026 — Fase 4: tarjeta de "Camiones Destare" ahora muestra Folio, Material, Banco y Destino

### Qué se cambió
`renderCamion()` dentro de `filtrarBuscadorDestare()` (línea ~7649) solo
mostraba Placas/Económico/Tipo/Boleta — `fila_bascula` no guarda
Folio/Material/Banco/Destino, esos viven en el ticket real (colección
`tickets`). Se agregó una búsqueda por `r.id_ticket` con
`window.findRecord()` (helper ya existente, línea ~515, mismo que usa
el resto de la app para cruzar `db`/`dbHistorial` por `_fid`) y se
imprime una línea nueva con los 4 campos cuando el ticket se encuentra.
Si `id_ticket` no tiene ticket vinculado todavía (caso raro, o ticket
en `dbHistorial` fuera de rango cargado), simplemente no se muestra esa
línea — no rompe la tarjeta.

### Verificado antes de tocar
`renderPendientes()` (la tarjeta de "Pendientes"/tara) YA mostraba
estos 4 campos desde antes — no era la tarjeta que Jesús reportó. La
tarjeta real con el problema es la de "Camiones Destare" en Fila
Báscula, confirmado por el nombre de campos usados en la captura
("Boleta 555, Placas AAA" es el formato de `renderCamion`, no el de
`renderPendientes`).

### Verificación de sintaxis (24.4/30.5)
`node --check` en el módulo principal y los 3 bloques `<script>` no
vacíos que sí son código real: sin errores. `id=` duplicados: 0.

### Sin tocar
Fases 1, 2, 5 (siguen pendientes).

### Pendiente
Fases 1, 2, 5 del pedido original de la sección 50.

---

## 53. 23-jul-2026 — `PROGRAMA_2026_actualizado.xlsx` corregido: Morro ya trae los 8 conceptos completos

### Contexto
Jesús notó que Morro no traía todas las cantidades en el Excel que se
sube con `SUBIR_PROGRAMA_2026.html`. Se verificó contra el archivo real
en Drive: la sección Morro tenía Colocación Marina/Terrestre/Rezaga con
cantidad, pero Núcleo/Secundaria 2/Secundaria 1/Berma/Berma de apoyo
estaban en blanco (celda `CANTIDAD` vacía). **No es el mismo dato que
`CATALOGO_TOTALES`/`CATALOGO_VERTIDO_TOTALES` de `index.html`** (esos ya
tenían Morro completo desde antes, ver sección 51) — este archivo es el
insumo para `resumenes/programa_2026` en Firestore, independiente.

### Qué se hizo
Se reconstruyó `PROGRAMA_2026_actualizado.xlsx` completo (misma hoja
`in`, mismos encabezados de fecha, mismos totales y desgloses
mensuales de Cuerpo 1-5/Morro/Extraordinarios/Muro Tarquina) y se
agregaron los 5 totales de Morro que faltaban, con los valores que dio
Jesús:
Núcleo 339,691.17 · Secundaria 2 59,265.44 · Secundaria 1 54,931.65 ·
Berma 50,921.33 · Berma de apoyo 41,555.24.
No se inventó desglose mensual para estos 5 (Jesús no lo dio) — quedan
sin meses, igual que Colocación Marina/Terrestre/Rezaga de Morro ya
traían antes.

### Verificado antes de entregar
Se comparó celda por celda contra el archivo original (54 filas de
material + 8 de sección, encabezados de fecha, todos los totales y
meses de Cuerpo 1-5) — coincide exacto, solo cambian las 5 celdas de
Morro que estaban vacías.

### Pendiente — acción de Jesús, no de código
Subir este archivo con `SUBIR_PROGRAMA_2026.html` (login master, tal
cual ya lo usó antes) — reemplaza por completo
`resumenes/programa_2026`. No se tocó `index.html` en esta sección.

---

## 54. 23-jul-2026 — Fase 1 (Captura inteligente): filtro anti Acopio→mismo Acopio + autoselección de Vertido

### Contexto
Se retomó el trabajo en un chat distinto al de las secciones 51-53. Antes
de tocar nada se detectó que los archivos de Drive (`index.html` e
`INSTRUCCIONESAPP.md`) ya estaban más avanzados que la copia que Jesús
había subido al chat al inicio de la conversación (esa copia no traía las
secciones 51-53). Se comparó con `diff` — la única diferencia real era
esa: Fase 3, Fase 4 y el fix del Excel de Morro (secciones 51-53), ya
resueltas. Se adoptaron los archivos de Drive como base y se continuó
sobre ellos, para no perder ese trabajo. **Lección para la próxima
sesión: si el trabajo puede haber seguido en otro chat con acceso a
Drive, comparar ambas copias con `diff` antes de asumir cuál es la más
reciente — no asumir por fecha de subida del chat actual.**

### Qué se construyó (Fase 1 completa)
1. **Filtro anti Acopio→mismo Acopio** (`filtrarDestinoPorOrigenAcopio()`,
   nueva función, junto a `updateOrigenOptions()`): cuando el Origen es
   "Acopio Marino" o "Acopio Terrestre", esa misma opción se deshabilita
   en el select de Destino (mismo patrón que `filtrarDestinosPorMaterial()`
   — deshabilita, no elimina, para no romper el flujo si el origen vuelve
   a cambiar). Si ya había una selección inválida cuando cambia el origen,
   se limpia con un `alert()` explicando por qué. Los cruces reales
   (Marino → Terrestre y viceversa) siguen permitidos, con el mismo aviso
   amarillo de "transferencia entre acopios" que ya existía
   (`checkTransferenciaAcopios()`, sin cambios).
2. **Autoselección de Vertido ("llenado inteligente")**
   (`autoSeleccionarVertido()`, nueva función, llamada desde
   `toggleVertido()` y desde el `onchange` de `#f-banco`): cuando el
   origen es un Acopio y el destino elegido usa el campo Vertido (una
   colocación: Cuerpo/Muro/Morro), se preselecciona Marino o Terrestre
   según el acopio de origen. Sigue siendo editable a mano.

### Verificado que NO rompe la edición de tickets existentes
`editRecord()` llama `toggleVertido()` (línea ~1847) y DESPUÉS sobreescribe
`f-vertido` con el valor real guardado (línea ~1848) — el auto-llenado
puede disparar de paso, pero el valor auténtico del ticket gana siempre
al final, sin pérdida de datos. `updateOrigenOptions()` (línea ~1825)
también dispara el filtro nuevo, pero en ese punto `f-banco` todavía está
vacío (se llena en la línea siguiente), así que no interfiere. Un ticket
viejo que ya tuviera guardado un Acopio→mismo Acopio (si alguno existe)
se sigue mostrando normal al editar — el filtro nuevo solo bloquea
selecciones nuevas vía UI, no pisa `.value` asignado por script.

### Verificación de sintaxis (regla 24.4/30.5)
- `node --check` sobre el módulo principal (`type="module"`, 109,822
  caracteres extraídos): OK.
- `node --check` sobre los 3 bloques `<script>` planos no vacíos: OK los
  3 (a diferencia de sesiones anteriores, ninguno dio el falso positivo
  de `plain5` — probablemente por cómo cayeron los cortes de bloque esta
  vez; no se investigó más porque los 3 pasaron limpio).
- `id=` duplicados: 0 de 443 IDs totales.

### Sin tocar
Fases 2 y 5 (siguen pendientes). No se tocó Fila Báscula, Resumen, ni
`programa_2026`.

### Pendiente
Fases 2 (Tickets con advertencia) y 5 (Resumen en tiempo real) del
pedido original de la sección 50.

---

## 55. 23-jul-2026 — Fase 2 (Tickets con advertencia): construida completa

### Qué se construyó
1. **Chequeo al guardar** (`saveRecord()`, línea ~1700): si el origen es un
   Acopio y el material+rango que sale de ahí tiene existencia ≤ 0 según
   el agregado `resumenes/avance_acopio` (mismo dato que ya usa la
   pestaña "Acopios" — 1 solo doc leído vía `asegurarDatosAvancesAcopios()`,
   respeta la regla de costo de lecturas), se muestra un `confirm()` de
   advertencia. Si el capturista confirma, el ticket se guarda con
   `advertencia_existencia: true` en el documento. Si la verificación
   falla (ej. sin señal), NO bloquea el guardado — solo se pierde la
   advertencia informativa.
2. **Insignia visual** 🔺 "Sin existencia en Acopio" en la tarjeta del
   ticket en Base de datos (usa los tokens `--alert-amber2-*` que ya
   existían en `:root`, sin inventar color nuevo).
3. **Sección "Tickets de acopio"** en Base de datos, junto al botón
   "Ver solo tickets de Barcaza": dos botones — "✅ Correctos" y
   "🔺 Con advertencia" (`setFiltroAcopio()`, mismo patrón toggle que ya
   usaba `toggleSoloBarcaza()`, ver `renderDB()`). Filtran sobre
   `origen_tipo === 'ACOPIO'` combinado con `advertencia_existencia`.
   Se combinan (AND) con el buscador y con el filtro de barcaza. Reutiliza
   el modal de edición existente (`openModal`/`editRecord`) sin cambios —
   misma lógica que el resto de tickets de esa sección, como pidió Jesús.

### Detalle técnico importante — el módulo vs. el resto del código
`saveRecord()` vive dentro del único `<script type="module">` del archivo
(línea 457-2610). `computeAcopios()`, `asegurarDatosAvancesAcopios()` y
`nombreMaterialLegible()` viven en un `<script>` normal más abajo — un
módulo ES no comparte scope léxico con un script clásico. Se llamaron
con prefijo `window.` explícito (mismo patrón que el resto de
`saveRecord()` ya usa para `window.dbFilaBasculaLeer`, etc.).
`nombreMaterialLegible` no estaba expuesta en `window` — se le agregó
`window.nombreMaterialLegible = nombreMaterialLegible;` porque hacía
falta llamarla desde el módulo. **Lección para la próxima sesión: antes
de llamar cualquier función desde dentro de `saveRecord()`/el bloque
module, verificar si esa función vive en el mismo bloque `<script>` o en
otro — si es otro, siempre usar `window.` y confirmar que esa función SÍ
se expone ahí (`grep` de `window.nombreDeFuncion =`).**

### Verificado antes de tocar
Se confirmó con `grep` que `getFormData()` (línea ~5439) ya devuelve
`origen_tipo`, `banco`, `material` y `rango` (con `'PENDIENTE'` como
centinela de "rango aún no definido", mismo valor que ya usa
`computeAcopios`/la pestaña Acopios) — no hizo falta agregar ningún
campo nuevo al objeto de datos del formulario.

### Verificación de sintaxis (regla 24.4/30.5)
- `node --check` sobre los 4 bloques `<script>` no vacíos (1 module + 3
  planos): los 4 OK, sin errores.
- `id=` duplicados: 0 de 445 IDs totales (445 = 443 de la Fase 1 + 2
  nuevos: `btn-acopio-correctos`, `btn-acopio-advertencia`).

### Sin tocar
Fase 5 (Resumen en tiempo real, sigue pendiente). No se tocó Fila
Báscula ni `programa_2026`.

### Pendiente
Fase 5 del pedido original de la sección 50 — es la única que queda.

---

## 56. 23-jul-2026 — Fase 5 (Resumen en tiempo real): diagnosticada y corregida — cierra el pedido original de la sección 50

### Diagnóstico (antes de tocar nada, regla 0.5)
Se verificó contra el código real de dónde saca sus datos la pestaña
Resumen: `renderResumen()` (línea ~7074) llama a
`calcularResumenGenericoAgregado()`, que lee los documentos
`resumenes/{YYYY-MM}` con `window.leerDocResumen(mes)` — un `getDoc()`
puntual, **sin `onSnapshot` propio**. Ese agregado mensual SÍ se
mantiene al día en cada guardado (vía `aplicarResumen()`/`moverResumen()`
en `saveRecord()`), pero nada disparaba `renderResumen()` de nuevo
automáticamente — solo se recalculaba al abrir la pestaña o cambiar
filtros/periodo. El listener en tiempo real que SÍ existe
(`onSnapshot` de la colección de tickets, línea ~924, activo para
capturista/coordinador/admin/master) actualiza `window.db` y llama
`renderDB()` en cada cambio, pero nunca llamaba a `renderResumen()`.
**Esa es la causa exacta:** dos capturistas guardando desde celular sí
llegaban a Firestore y sí actualizaban `resumenes/{mes}`, pero quien
estaba viendo Resumen en otro dispositivo se quedaba con el cálculo de
la última vez que abrió/tocó esa pestaña.

### Qué se corrigió
Se reutilizó el `onSnapshot` de tickets que YA existía (línea ~924) —
**sin agregar ninguna lectura nueva de la colección de tickets** — para
que, cuando llega un cambio Y la pestaña Resumen está abierta en ese
momento (`#tab-resumen.active`), dispare `window.renderResumen()`
automáticamente. Esto sí agrega lecturas nuevas, pero acotadas: son las
mismas que ya hacía `calcularResumenGenericoAgregado()` al abrir la
pestaña manualmente (unos pocos `getDoc` de `resumenes/{mes}`, nunca la
colección completa de tickets), con un **debounce de 800ms** para que
varias escrituras seguidas (dos capturistas guardando casi al mismo
tiempo) colapsen en un solo recálculo en vez de uno por escritura suelta.

### Verificado antes de entregar
- El listener ya corre para capturista/coordinador/admin/master (no solo
  master) — confirmado con `grep` de `rolesConSync`, así que el fix
  aplica a todos los rangos, como pidió Jesús.
- `renderResumen()` vive fuera del `<script type="module">` (mismo caso
  que la Fase 2, sección 55) — se llamó como `window.renderResumen()`
  desde dentro del módulo, no `renderResumen()` a secas.
- El rol `visor` NO usa este listener (carga histórico de 90 días con
  una sola lectura puntual, por diseño — ver comentario de la sección
  19.2/20 en el propio código) — el refresco en vivo de Resumen no
  aplica a `visor`, que ya es de solo lectura por decisión previa.

### Verificación de sintaxis (regla 24.4/30.5)
`node --check` sobre los 4 bloques `<script>` no vacíos: los 4 OK.
`id=` duplicados: 0 de 445 IDs totales (sin cambios de conteo — esta
fase no agregó ningún elemento con `id` nuevo).

### Sin tocar
Nada más — con esta fase se cierran las 6 fases del pedido de la
sección 50 (CAMBIOS URGENTES).

### Pendiente
Ninguna fase pendiente del pedido de la sección 50. Jesús dijo que
antes de subir a GitHub quiere terminar de escribir todos los cambios
primero y luego revisar la app completa paso a paso — no hay código
nuevo pendiente hasta que arranque esa revisión.

---

## 57. 23-jul-2026 — Diagnóstico de campo de Jesús cierra los 2 pendientes de la sección 51 (botón "Liberar" y visibilidad) — no era bug, es diseño correcto

### Contexto
Retomado en una sesión de chat nueva (sin acceso de escritura a la
carpeta de Drive por límite de tamaño de subida — Jesús actualiza los
archivos manualmente desde ahí en adelante). Antes de responder se
descargó y revisó la versión real de `index.html` en Drive (no se
asumió el estado del código).

### Prueba de campo que hizo Jesús (Fase 3 / sección 51)
- **"Mis camiones" (Tus camiones):** el botón "Liberar" sí aparece,
  tanto en cuenta capturista como en cuenta master, y al usarlo el
  camión sí vuelve correctamente a "Pendiente de entrar a fila" — esto
  confirma que el fix de 50.1 (reinicio de `t1b_fila_ts`) quedó bien.
- **"Otros camiones" (cuenta capturista):** un camión que **nadie ha
  reclamado todavía** no muestra el botón "Liberar". Jesús confirmó que
  ese camión no decía "reclamado" ni "reclamado por ti" en ningún
  momento — es decir, no es el caso de "reclamado por otro capturista",
  es un camión libre que sigue esperando "Entra a fila".

### Diagnóstico — NO es un bug, es el comportamiento correcto
Se verificó contra el código real (línea ~7796):
```
const puedeLiberar = !!r.reclamado_por && (r.reclamado_por === uid || rol === 'admin' || rol === 'coordinador' || rol === 'master');
```
La condición exige `reclamado_por` truthy — si nadie ha reclamado el
camión, `puedeLiberar` da `false` **para cualquier rol, incluido
master/coordinador**, porque no hay nada que liberar todavía (Liberar
deshace una reclamación existente, no es un botón de estado general).
Esto cierra los dos pendientes que había dejado abiertos la sección 51:
- El botón "Liberar" en cuenta master **sí funciona** cuando corresponde
  (camión reclamado) — la sección 51 ya lo daba por bueno sin poder
  confirmarlo en vivo; queda confirmado.
- La "visibilidad rota" que se sospechaba en 51 como posible efecto
  secundario del split tuyos/otros **no existe** — lo que Jesús vio es
  el filtro `puedeLiberar` funcionando exactamente como se diseñó.

### No se tocó código
Esta sesión no modificó `index.html` — es una confirmación de
diagnóstico, no un fix. `INSTRUCCIONESAPP.md` es el único archivo
tocado aquí.

### Pendiente
- **Fase 3 (sección 50) queda oficialmente cerrada** — sin pendientes
  abiertos.
- Seguir con lo que Jesús traiga de la revisión completa paso a paso
  que mencionó en la sección 56 (aún no ha arrancado esa revisión).

---

## 58. 23-jul-2026 — Homologación visual: Boleta en negritas como dato principal en "Camiones Destare" (antes era Placas+Económico)

### Contexto
Jesús notó (con capturas de pantalla de campo) que la tarjeta de un
mismo camión se identifica con un dato distinto según la pantalla:
- **"Capturar Destare" (Pendientes):** negritas en **Boleta**
  (`window.renderPendientes`, línea ~6382).
- **"Fila Báscula → Camiones Destare":** negritas en **Placas +
  Económico** (línea ~7798), con la Boleta como texto secundario chico.

Jesús propuso homologar usando **Boleta** como criterio en ambas, por
ser un valor único e irrepetible (a diferencia de Placas, que se repite
entre viajes del mismo camión).

### Cambio (quirúrgico, un solo bloque)
En la tarjeta de "Camiones Destare" (~línea 7798) se intercambió el
orden: ahora la primera línea en `<strong>` es `Boleta {r.boleta}`, y la
segunda línea (texto chico, `--text-muted`) pasa a mostrar
`{tipo_camion} · {placas}{economico}`. No se tocó ningún otro dato ni
la tarjeta de "Capturar Destare" (esa ya estaba correcta desde antes).

### Verificación de sintaxis (regla 24.4/30.5)
- `node --check` sobre los 2 `<script type="module">` y 4 `<script>`
  normales: 2 OK limpios de origen (el módulo principal y el bloque
  normal donde vive `liberarCamionFilaSegunda`/la tarjeta editada — se
  confirmó con `grep` que el cambio cayó en ese bloque). Los otros 2
  dan el mismo falso positivo ya documentado en 24.4 (corte de
  comentario por la extracción ingenua con regex).
- `diff` contra el `index.html` bajado de Drive antes de editar:
  confirma que el único cambio es el intercambio de esas 2 líneas.

### Sin tocar
Nada más — no se tocó la tarjeta de "Capturar Destare"
(`renderPendientes`), ni ningún otro archivo.

### Nota operativa (repetir en cada entrega mientras dure la
restricción de subida a Drive)
Esta sesión **no tiene permiso de escribir en la carpeta de Drive**
(límite de tamaño de subida reportado por Jesús) — Jesús sube los
archivos manualmente. Se le entrega `index.html` e
`INSTRUCCIONESAPP.md` actualizados para que él mismo reemplace los de
Drive.

### Pendiente
- Jesús sube manualmente el `index.html` actualizado a Drive y prueba
  en campo que ambas pantallas (Capturar Destare / Camiones Destare)
  ahora muestran la Boleta en negritas de forma consistente.

---

## 59. 23-jul-2026 — 🔴 Bug real reportado por Jesús: las tarjetas de Barcaza ignoraban el filtro "Correctos/Con advertencia" de Fase 2

### Contexto
Jesús probó las Pruebas 3, 4 y 5 de la Fase 2 (sección 55) — las tres
salieron bien excepto un detalle en la Prueba 5: al filtrar "🔺 Con
advertencia" en "Tickets de acopio", además de los tickets individuales
correctos (Boleta #9969, #3668) también aparecían las 3 tarjetas
agregadas de Barcaza (Barcaza 1, 2, 3), aunque ninguna de ellas tuviera
ningún ticket con advertencia. Jesús señaló el criterio correcto: las
tarjetas de Barcaza NO deberían aparecer con ese filtro activo salvo
que carguen un ticket que sí tenga la advertencia — y en ese caso, la
propia tarjeta de Barcaza debería mostrar también la insignia, porque
está cargando un material que, según el Acopio de origen, no existía.

### Causa (verificada contra el código real antes de tocar nada)
`renderDB()` (línea ~5716) calculaba las tarjetas de Barcaza con
`computeBarcazaGrupos(filteredSearch)` — `filteredSearch` es el
resultado **solo del buscador de texto**, sin aplicar ni el filtro
"Ver solo tickets de Barcaza" (`soloBarcazaDB`) ni el nuevo filtro de
Fase 2 (`filtroAcopioDB`). Esto era intencional desde la Fase 15 para
que la tarjeta de Barcaza siguiera visible sin tener que activar el
toggle de barcaza — pero al agregar Fase 2 nadie conectó ese filtro
nuevo a las tarjetas agregadas, así que quedaron "sordas" a
Correctos/Con advertencia.

### Qué se corrigió
1. Se cambió la fuente de las tarjetas de `filteredSearch` a
   `filtered` (la misma variable que ya incorpora `soloBarcazaDB` Y
   `filtroAcopioDB`). Efecto: si no hay ningún filtro de acopio activo,
   el resultado es idéntico a antes (sigue sin depender del toggle de
   barcaza, como quería la Fase 15); si el filtro Correctos/Con
   advertencia está activo, la tarjeta de Barcaza solo aparece si le
   queda al menos un ticket que cumpla ese filtro.
2. Se agregó una insignia 🔺 "Sin existencia en Acopio" a la propia
   tarjeta agregada de Barcaza cuando `g.tickets.some(t =>
   t.advertencia_existencia)` — mismos tokens de color
   (`--alert-amber2-*`) que ya usa la insignia del ticket individual,
   sin inventar un color nuevo.

### Verificado antes de tocar
Se confirmó con `grep`/lectura que `g.tickets` (el arreglo que arma
`computeBarcazaGrupos()`) conserva el objeto completo del ticket, así
que `t.advertencia_existencia` está disponible sin tener que agregar
ningún campo nuevo a esa función.

### Verificación de sintaxis (regla 24.4/30.5)
`node --check`: el bloque real donde vive `computeBarcazaGrupos`
(confirmado con `grep`) pasó limpio. Los 2 fragmentos que dan error son
el mismo falso positivo ya documentado en 24.4 (corte de comentario por
la extracción ingenua con regex). `diff` contra la copia de Drive antes
de editar confirma que el único cambio nuevo es este (aparte del
cambio de negritas de la sección 58, ya incluido de antes).
`id=` duplicados: 0.

### Sin tocar
Nada más — no se tocó `renderPendientes`, ni la tarjeta de Camiones
Destare, ni ningún otro archivo.

### Nota operativa
Sigue sin haber permiso de escritura en la carpeta de Drive — se
entrega `index.html` actualizado para que Jesús lo suba manualmente.

### Pendiente
- Jesús sube el `index.html` actualizado y repite la Prueba 5: filtrar
  "🔺 Con advertencia" y confirmar que ahora NO aparecen las Barcazas
  1/2/3 (que son correctas), y que si alguna barcaza sí carga un
  ticket con advertencia, aparece con la insignia.
- Seguir con la Fase 5 (Resumen en tiempo real) de la revisión completa.

---

## 60. 23-jul-2026 — Revisión completa en campo: Fase 5 confirmada, cierra (casi) todo el pedido de la sección 50

### Contexto
Continuación de la revisión guiada paso a paso (pregunta-instrucción /
respuesta de Jesús) sobre las 6 fases del pedido "CAMBIOS URGENTES"
(sección 50). Se siguió el orden: Fase 1 → Fase 2 (+ fix de Barcaza de
la sección 59) → Fase 3 → Fase 5.

### Prueba 6 — Resumen en tiempo real
Jesús confirmó ("¡Eureka!") que el Resumen se actualiza solo sin
recargar ni dar clic en nada, tras guardar un ticket desde otra
sesión/pestaña — el fix de la sección 56 (listener de tickets
disparando `window.renderResumen()` con debounce de 800ms) queda
confirmado en campo.

### Estado final de las 6 fases de la sección 50, tras esta revisión
| Fase | Descripción | Estado |
|---|---|---|
| 1 | Captura inteligente (anti Acopio→mismo Acopio + autoselección Vertido) | ✅ Confirmada en campo |
| 2 | Tickets con advertencia (+ fix de Barcaza, sección 59) | ✅ Confirmada en campo |
| 3 | Fila Báscula / Camiones destare | ✅ Confirmada en campo |
| 4 | Info en tarjeta de destare (Folio/Material/Banco/Destino) | ✅ Confirmada en campo (screenshot con Boleta 965 mostrando los 4 datos) |
| 5 | Resumen en tiempo real | ✅ Confirmada en campo (Prueba 6) |
| 6 | Cantidades MORRO en `PROGRAMA_2026_actualizado.xlsx` | ⏳ Excel corregido y entregado (sección 53) — pendiente que Jesús confirme si ya lo subió con `SUBIR_PROGRAMA_2026.html` |

### Sin tocar
Ninguna, esta sesión fue solo de verificación/pruebas guiadas — sin
cambios de código nuevos más allá de los ya reportados en las
secciones 58 y 59.

### Pendiente
- Confirmar con Jesús si Fase 6 (subida del Excel) ya se hizo, para
  cerrar oficialmente las 6 fases del pedido de la sección 50.
- A partir de aquí, quedar a la espera de lo que Jesús encuentre en el
  resto de su revisión paso a paso de la app (pantallas no cubiertas
  por este pedido de 6 fases).

## 62. 25-jul-2026 — 🔴 Bug real encontrado por auditoría con Drive: typo en `CATALOGO_TOTALES` (Cuerpo 1 / Berma) — CORREGIDO

**Contexto:** Auditoría técnica completa de `index.html` vía Google Drive
(sesión con Claude + integración de Drive), cruzando el catálogo de metas
contra `PROGRAMA_2026_actualizado.xlsx` (el programa maestro, también en
la carpeta ACARREOS APP de Drive).

**Hallazgo:** La meta de BERMA para CUERPO 1 en `CATALOGO_TOTALES`
(línea ~4547) tenía `cantidad: 13594.09`, mientras que el programa
maestro (`PROGRAMA_2026_actualizado.xlsx`, hoja `in`) tiene
`13,549.09` para ese mismo concepto — una transposición de dígitos
(549 → 594) al capturar el catálogo a mano. Se verificó el resto de
materiales de Cuerpo 1 y BERMA DE APOYO en los otros 5 cuerpos/Morro:
todos coincidían exactamente con el xlsx: este era el único valor
desalineado.

**Confirmado por Jesús:** el valor correcto es `13549.09` (error de
dedo al capturar).

**Fix aplicado:**
```js
// Antes:
{ cuerpo:'CUERPO 1', material:'BERMA', rango:'0.30 a 0.50 ton', cantidad: 13594.09 },
// Después:
{ cuerpo:'CUERPO 1', material:'BERMA', rango:'0.30 a 0.50 ton', cantidad: 13549.09 },
```

**Impacto:** El % de avance y "faltante" mostrados en la pestaña Metas
para Cuerpo 1 / Berma estaban sesgados por 45 toneladas (~0.3% de esa
fila). Con el fix, ese cálculo queda alineado con el programa maestro.

**Verificación antes de entregar:**
- `node --check` limpio en ambos bloques (`module`, ~2,170 líneas;
  normal, ~5,770 líneas).
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Cambio aislado a una sola línea (`CATALOGO_TOTALES`), sin tocar
  ninguna otra lógica.

**Otros hallazgos de la misma auditoría, aún NO corregidos (pendientes
de decisión/priorización con Jesús):**
- H-05 (`confirmarLecturaCompleta`) sigue siendo solo un `confirm()`,
  sin cooldown/tope duro real, en los 8 puntos de "Ver TODO el
  histórico".
- `recalcularHistoricoGlobal()` no reconstruye `tendencia_diaria` y lo
  borra (via `setDoc` de reemplazo total) cada vez que se corre —
  desincronizado con `aplicarResumen()`. Sin consumidor conocido hoy,
  pero riesgo de crecimiento de documento sin límite.
- Fallos silenciosos (`console.error` sin aviso visual al usuario) en
  la rama de creación de doc de `aplicarResumen()`/
  `aplicarAgregadoAvanceAcopio()` cuando el doc de resumen no existe y
  el `setDoc` de emergencia también falla.
- `manifest.json` sigue sin variante de modo oscuro (decisión ya
  tomada anteriormente; no se pudo re-verificar el archivo porque no
  está en la carpeta de Drive).
- Estilos inline (529, antes 522) y `alert()` (109, antes 108)
  crecieron ligeramente.
- Pendiente de revisar a fondo (no cubierto en esta pasada): permisos
  por rol (doble candado UI+función), manejo offline en los 3 puntos
  de guardado, consistencia de zona horaria UTC-6, costo de lecturas
  Firestore de las funciones agregadas después de la sección 46.

## 63. 26-jul-2026 — 🔴 Incidente: divergencia Drive vs. GitHub causó pérdida temporal de `eliminarStatsAnalisisDeTicket` — RECUPERADO

**Qué pasó:** La sección 62 (fix de `CATALOGO_TOTALES`) se hizo sobre
una copia de `index.html` descargada de **Google Drive**. Esa copia de
Drive no tenía la función `eliminarStatsAnalisisDeTicket` (limpieza de
`stats_analisis` al borrar un ticket, documentada como sección 61 y
fechada 24-jul-2026) — función que **sí existía en el repo de GitHub**
desde antes, subida ahí en otra sesión sin pasar por Drive.

Al subir la versión corregida (basada en Drive) al repo, se sobrescribió
la versión más nueva de GitHub y con ella se perdió esa función completa
(~80 líneas) y su llamada en `deleteRecord()`. El commit
`50c9c74` (24-jul) la tenía; el commit `001b29d` (26-jul, con el fix de
la sección 62) ya no.

**Causa raíz:** Drive y GitHub se estaban tratando como si fueran la
misma fuente de verdad, pero divergieron — alguien subió una versión
directo a GitHub sin reflejarla también en Drive. La próxima vez que se
audite o corrija algo, **hay que diffear ambas fuentes antes de asumir
cuál es la más reciente** (no basta con mirar la fecha de modificación
de Drive).

**Recuperación aplicada:** se restauró `eliminarStatsAnalisisDeTicket`
completa (idéntica al commit `50c9c74`) y su llamada en `deleteRecord()`,
fusionada sobre la copia ya corregida de la sección 62. Se agregó un
comentario en el código señalando esta recuperación.

**Verificación antes de entregar:**
- `node --check` limpio en ambos bloques (`module` y normal) tras la
  fusión.
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Se confirmaron las 3 dependencias de la función
  (`dbStatsAnalisisBuscarPorTicket`, `incrementarStatsResumen`,
  `getDocs`/`query`/`collection`/`where`) presentes en la copia base
  antes de pegar la función de vuelta.
- Corregida además una referencia cruzada equivocada dentro del propio
  comentario del fix de la sección 62 (decía "sección 50" por error de
  redacción, debía decir "sección 62").

**Pendiente para Jesús:** confirmar que no hay más trabajo hecho
"solo en GitHub, nunca en Drive" (o viceversa) antes de seguir usando
ambos como si fueran espejos exactos uno del otro.

## 64. 26-jul-2026 — Se establece protocolo de ID de sesión (ver sección 0.6) y se pasa a trabajar directo contra GitHub

**Sesión:** Sonnet5-20260726-A

Por instrucción directa de Jesús, a partir de hoy se trabaja
**directo contra el repositorio de GitHub**
(`rigodlt-maker/CONTROL-ACARREOS`), y se deja de usar Google Drive como
fuente de este proyecto — precisamente por el incidente de la sección
63.

Se agrega la sección 0.6 con el protocolo de identificación: cada
sesión (de cualquier IA, no solo Claude) elige su propio ID
(`[Modelo]-[YYYYMMDD]-[letra]`) al empezar, y lo antepone a cualquier
entrada que agregue aquí. El objetivo es poder rastrear qué sesión hizo
qué cambio, y detectar más rápido si dos sesiones trabajaron sobre
copias distintas sin saberlo (como pasó con Drive vs. GitHub).

Esta sesión se identifica como **`Sonnet5-20260726-A`**.

**Nota operativa:** esta sesión no tiene forma de hacer `git push`
directo al repo — el flujo sigue siendo clonar/leer, entregar el
archivo corregido, y que Jesús lo suba manualmente. El ID de sesión
documenta quién *preparó* el cambio, no quién lo subió.

## 65. 26-jul-2026 — Se establece el marco "Obeya" (equipo virtual multidisciplinario + Master Black Belt) — ver sección 0.7

**Sesión:** Sonnet5-20260726-A

Por instrucción de Jesús: cualquier sesión que razone sobre este
proyecto debe poder convocar, cuando la decisión lo justifique, una
junta virtual tipo Obeya con dos alas — obra (Rompeolas Oriente:
Director de Obra, Logística de Acarreos, Dirección Financiera,
Seguridad e Higiene, Lean Construction/FARO) y software (Arquitecto,
QA, Seguridad, DBA, UX de campo) — facilitada por un Master Black Belt
Lean Six Sigma cuya directiva es cazar desperdicio de pensamiento y
retrabajo (framework DOWNTIME) en ambos lados.

Se agregó la sección 0.7 con el detalle completo de cuándo convocarla,
el formato mínimo, y una advertencia explícita (mía, sin filtro) sobre
el riesgo de que este marco se vuelva teatro narrativo en vez de una
herramienta real de priorización — si una sesión encuentra que está
llenando el formato sin decir nada nuevo, debe cortarlo y responder
directo.

## 66. 26-jul-2026 — 🟠 H-05 resuelto: cooldown de 10 min por panel en "Ver TODO el histórico" — CORREGIDO

**Sesión:** Sonnet5-20260726-A

**Junta Obeya realizada (ver sección 0.7):** Logística de Acarreos
señaló el riesgo real (si se agota el cupo de Firestore en oficina, el
bot de Telegram deja de responder en campo); Arquitecto propuso
`localStorage` + timestamp por panel, sin tocar Firestore; QA marcó 3
casos borde (persistencia entre refrescos, llave independiente por
panel, mensaje con minutos restantes); Master Black Belt dirigió hacia
la solución más barata posible. Decisión de Jesús: 10 minutos, por
panel (no global).

**Qué se cambió:** `confirmarLecturaCompleta(desde, hasta, panel)`
ahora acepta un tercer parámetro opcional `panel`. Si se pasa, revisa
`localStorage['cooldownLecturaCompleta_' + panel]`; si pasaron menos de
10 minutos desde el último uso confirmado de ESE panel, bloquea con un
`alert()` indicando cuántos minutos faltan — sin llamar a Firestore. Si
no se pasa `panel`, el comportamiento es idéntico al de antes (por si
alguna llamada futura no lo necesita).

Se actualizaron los 7 call sites reales de "leer todo el histórico"
(no eran 8 como se estimó en la auditoría de la sección 62, se
recontaron directo en el código): `dash`, `db`, `resumen`, `tendencia`,
`bancos`, `reportes`, `excel_reportes` — cada uno con su propia llave,
para que usar uno no bloquee los demás.

**Verificación antes de entregar:**
- `node --check` limpio en ambos bloques (`module` y normal).
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Confirmado que los 7 call sites (ya no 8) quedaron con su panel
  correspondiente, sin dejar ninguno con `confirmarLecturaCompleta(null,
  null)` sin tercer argumento.

**Limitación conocida, aceptada a propósito:** `localStorage` es por
navegador/dispositivo, no por usuario ni compartido entre sesiones —
dos personas en dos computadoras distintas pueden cada una gastar su
propio cupo de 10 minutos en paralelo. Se decidió así porque agregar un
cooldown compartido de verdad (en Firestore) consumiría lecturas
adicionales para resolver un problema de exceso de lecturas — Master
Black Belt lo hubiera señalado como desperdicio circular. Si en campo
se ve que esto no es suficiente, la siguiente opción sería un doc
único en Firestore con el timestamp por panel (1 lectura extra por
intento, mucho más barato que las lecturas de "leer todo").

## 67. 26-jul-2026 — 🟠 `historico_global` ya no escribe `tendencia_diaria` (dejó de estar desincronizado con `recalcularHistoricoGlobal()`) — CORREGIDO

**Sesión:** Sonnet5-20260726-A

**Contexto real de volumen (dato de Jesús):** la app espera 300-500
registros/día, con una base total esperada de 250,000-500,000
registros en la vida del proyecto. Con ese dato, corrijo una
imprecisión de mi propio análisis anterior (sección 62/auditoría): el
riesgo de que `historico_global` se acercara al límite de 1MB de
Firestore por `tendencia_diaria` era mucho menor de lo que sugerí — a
ese ritmo, unos 1,000-1,600 días hábiles en varios años de proyecto
pesarían ~70-110 KB, lejos del límite. **El motivo real para quitarlo
no es el tamaño, es que no tiene ningún consumidor** (confirmado de
nuevo en el código actual: el único lector de `historico_global`,
línea ~5060, solo usa `total_viajes`/`total_ton`).

**Junta Obeya realizada (ver sección 0.7):** DBA/Integridad de datos
señaló que mantener sincronizadas dos funciones (`aplicarResumen()` y
`recalcularHistoricoGlobal()`) para un campo sin lector es esfuerzo sin
beneficio; Arquitecto propuso dejar de escribirlo en vez de
"reparar" la función de recálculo; QA confirmó que no rompe ningún
lector existente; Master Black Belt dirigió hacia eliminar la
escritura muerta en vez de sincronizar dos funciones para nada.
Jesús aprobó la dirección, con la condición explícita de no afectar
la arquitectura actual.

**Qué se cambió:** en `aplicarResumen()`, el `payload` que se usa para
el doc MENSUAL (`ref`) sigue exactamente igual (con `tendencia_diaria`
normal). Para el doc `historico_global` (`refGlobal`) se arma ahora un
`payloadGlobal` — copia del mismo payload, pero sin las claves que
empiezan con `tendencia_diaria.` — y es ESE el que se escribe ahí.
`recalcularHistoricoGlobal()` no se tocó (ya no incluía ese campo, y
ahora eso es consistente con lo que escribe `aplicarResumen()`, en vez
de una omisión).

**Impacto:** cero cambio visible para Jesús ni para el equipo — nadie
leía ese campo desde `historico_global`. Se elimina la desincronización
entre las dos funciones y el documento deja de crecer con un campo sin
uso.

**Verificación antes de entregar:**
- `node --check` limpio en ambos bloques (`module` y normal).
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Reconfirmé en el código actual (no solo en la auditoría vieja) que
  ningún lector de `historico_global` usa `tendencia_diaria`.
- El doc MENSUAL (`ref`) no se tocó — sigue recibiendo
  `tendencia_diaria` exactamente igual que antes.

**No se tocó, a propósito:** la estructura de `por_combinacion` y
`por_banco_material_rango` en `historico_global` — esos campos SÍ
tienen lectores reales, y su tamaño está acotado por el catálogo de
combinaciones banco×material×destino×tipo_camión (no crece con cada
registro nuevo, solo con combinaciones nuevas), así que no hay el mismo
problema ahí.

## 68. 26-jul-2026 — 🟡 Fallos silenciosos en `aplicarResumen()`/`aplicarAgregadoAvanceAcopio()` ahora avisan con toast — CORREGIDO

**Sesión:** Sonnet5-20260726-A

**Qué estaba mal (de la auditoría, sección 62/Bloque 4):** si escribir
el agregado de `resumenes/{mes}` o `resumenes/avance_acopio` fallaba
(incluida la rama donde el doc ni siquiera existía y el `setDoc` de
emergencia también fallaba), el error se tragaba con `console.error` —
sin ningún aviso visual. El ticket en sí se guardaba bien; solo el
agregado en tiempo real quedaba desactualizado, sin que nadie en campo
lo notara.

**Qué se cambió:** en las 4 ramas de catch afectadas (2 en
`aplicarResumen()`, 2 en `aplicarAgregadoAvanceAcopio()`) se agregó
`window.showSyncToast('⚠️', ..., 'err', 7000)` junto al
`console.error` que ya existía. Se usó el toast existente (`err`,7 s)
en vez de `alert()` a propósito — un `alert()` bloquea la pantalla y
detendría al capturista a media faena por un fallo que no es culpa
suya y que no le impide seguir trabajando; el toast avisa sin
bloquear, y el mensaje le dice qué botón de Admin usar para corregirlo
("Recalcular resumen"/"Recalcular totales").

**Verificación antes de entregar:**
- `node --check` limpio en ambos bloques (`module` y normal).
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Confirmé que `window.showSyncToast` ya se usa desde el bloque
  `module` en otras partes (ej. `deleteRecord()`, sección 63) — mismo
  patrón, sin problema de orden de carga entre `<script type="module">`
  (diferido) y el `<script>` normal donde vive `showSyncToast` (se
  ejecuta antes por ser síncrono, sin `defer`/`async`).

**No se tocó:** el resto de los `catch(e){ console.warn/error(...) }`
que se revisaron en la auditoría original (lecturas de respaldo tipo
"No se pudo leer el resumen de X mes") — esos son fallos de LECTURA
con fallback silencioso aceptable (el dato de ese mes simplemente no
se suma, no hay corrupción ni desfase permanente), distinto de estos 4
que son fallos de ESCRITURA de un agregado que sí queda desactualizado
hasta que alguien lo note.

## 69. 26-jul-2026 — 🔴 Bug real en `firestore.rules`: "Área de Prefabricados" rechazado al guardar — CORREGIDO. Auditoría completa de permisos por rol.

**Sesión:** Sonnet5-20260726-A

**Contexto:** Jesús compartió `firestore.rules` directo en el chat (no
vivía ni en Drive ni en GitHub hasta ahora — primera vez que se puede
auditar contra el código real). Se recomienda **subir este archivo al
repo de GitHub** junto con `index.html`, para que quede versionado
igual que el resto.

**🔴 Bug encontrado — confirmado y corregido:** `computeConcepto()` en
`index.html` devuelve `concepto: 'SUMINISTRO_PREFABRICADOS'` para el
destino "Área de Prefabricados" (agregado jul-2026), pero
`conceptoValido()` en las reglas nunca se actualizó para incluir ese
valor — la propia regla trae un comentario que ya advertía esto
("si esa función cambia, actualizar aquí también"). Resultado real:
**cualquier ticket guardado con ese destino era rechazado** por
Firestore con "Missing or insufficient permissions". Es un destino
real y seleccionable (material CORAZA → Área de Prefabricados), así
que esto bloqueaba una operación de campo legítima, no un caso de
borde teórico.

**Fix:** se agregó `'SUMINISTRO_PREFABRICADOS'` a la lista de
`conceptoValido()`. Sin cambios en ninguna otra regla. Balance de
llaves/paréntesis verificado, sin diferencias fuera de esa línea.

**🟡 Hallazgo menor, sin corregir todavía:** el botón "Autorizar" en
Admin (`cambiarStatusUsuario`) se muestra a cualquiera que vea el
panel de usuarios, sin filtrar por rol como sí hacen "Revocar" y
"Eliminar" (`esMaster || (esAdmin && rol==='capturista')`). Si un
admin intenta autorizar a alguien que no sea capturista, la regla lo
rechaza y ve un error crudo de Firebase en vez de que el botón no
aparezca. Impacto bajo hoy (el auto-registro público ya se eliminó,
casi no deberían existir pendientes con otro rol) — queda pendiente
por decidir si se corrige.

**[CERRADO — ver sección 73, 26-jul-2026]** Este hallazgo ya se corrigió
en una sesión posterior de ese mismo día; esta nota se quedó sin
actualizar. Confirmado contra el código real el 27-jul-2026 (sesión
Sonnet5-20260726-A): línea ~792 ya usa `puedeEliminar` igual que
Eliminar/Revocar. No requiere ningún cambio adicional.

**✅ Verificado sin hallazgos, cruzando código real contra reglas
reales (no solo contra la documentación):**
- `origen_tipo` ('BANCO'/'ACOPIO'), `tipo_camion`
  ('VOLTEO'/'GONDOLA'/'ARTICULADO'), `vertido`
  ('','MARINO','TERRESTRE'): los valores que la UI realmente escribe
  coinciden exactamente con las listas blancas de las reglas.
- Botón "Eliminar" ticket: correctamente oculto para todo lo que no
  sea `master`, igual que `esMaster()`.
- Selector de "Rol" de usuario: correctamente oculto para admin (solo
  master lo ve), coincide con la regla de `usuarios/update`.
- `t1_fila_ts`/`dia_captura` protegidos en `fila_bascula`: nada en el
  código intenta editarlos después de creados, así que la protección
  nunca se activa por error ni bloquea un flujo real.

**Verificación antes de entregar:**
- Balance de llaves `{}`/paréntesis `()` idéntico al original salvo la
  línea agregada.
- No pude correr un validador real de reglas de Firestore (no hay
  emulador disponible en este entorno) — la verificación fue manual,
  línea por línea contra el archivo original. Recomendado: probar el
  guardado de un ticket con destino "Área de Prefabricados" en cuanto
  se despliegue, para confirmar en producción real.

## 70. 26-jul-2026 — Prueba de campo del fix de la sección 69 encuentra 2 hallazgos nuevos: regla de negocio de Rezaga/Prefabricados (🟡 pendiente de decisión) y ticket eliminado deja huérfana su fila de báscula (🔴 CORREGIDO)

**Sesión:** Sonnet5-20260726-A

**Contexto:** Jesús probó en la app real el fix de la sección 69
(destino "Área de Prefabricados"). El guardado sí funcionó (confirma
que el fix de `firestore.rules` quedó bien publicado). Durante la
prueba encontró 2 cosas más.

**🟡 Hallazgo 1 — regla de negocio, PENDIENTE de decisión de Jesús (no
corregido todavía):** el campo de rango no deja capturar nada para
"Área de Prefabricados" — esto NO es un bug, es diseño intencional (el
campo es `readonly` para todo destino que no sea Cuerpo/Acopio, se
llena solo desde catálogo o se marca "pendiente"). Pero al probarlo,
Jesús aclaró la regla de negocio real: **"Área de Prefabricados" es
una plataforma de colados, no debería recibir NINGÚN material tipo
piedra (Núcleo, Berma, Secundaria 1/2) — solo Rezaga.** Hoy
`EXCLUSIONES_DESTINO_POR_MATERIAL` solo excluye ese destino para
CORAZA; todo lo demás pasa. Esto retoma el pendiente de la sección
25.2 (Rezaga nunca se agregó al catálogo de `f-material` por falta de
reglas de negocio) — ya con la regla real en mano. Quedan 2 caminos sin
decidir todavía:
  1. Excluir "Área de Prefabricados" de TODOS los materiales actuales
     (el destino queda huérfano hasta que se agregue Rezaga).
  2. Agregar Rezaga al catálogo de materiales ahora, y que sea el
     único que pueda ir a ese destino.

**🔴 Hallazgo 2 — CORREGIDO:** Jesús (cuenta master) intentó eliminar
el ticket de prueba desde "Base de Datos", esperando que también
limpiara su registro en Fila Báscula (ya que un ticket borrado = mal
capturado/de prueba, y ya no hay nada que destarar). Resultado real:
`deleteRecord()` borraba el ticket de `acarreos` correctamente, pero
**nunca tocaba el documento de `fila_bascula` ligado** — quedaba
huérfano, apuntando (`id_ticket`) a un ticket que ya no existe, sin
forma de completarlo (no hay ticket que destarar) ni de liberar la
placa para una captura nueva desde la UI. Confirmado en el código:
esto aplica a CUALQUIER ticket con `fila_bascula_id` (o sea, todo
ticket que nació de "Entrada a fila" normal), no solo a los de
prueba — riesgo real en campo, no solo de testing.

**Junta Obeya realizada (ver sección 0.7):** Logística de Acarreos
confirmó que un camión así queda "fantasma"; Arquitecto señaló que ya
existe el mismo patrón para `stats_analisis` (sección 61/63) y que
extenderlo a `fila_bascula` es consistente, no una idea nueva; QA pidió
tolerancia a tickets viejos sin `fila_bascula_id`; Master Black Belt lo
marcó como defecto real de flujo (DOWNTIME: Defectos).

**Qué se cambió:** en `deleteRecord()`, si el ticket tenía
`fila_bascula_id`, ahora también se borra ese documento de
`fila_bascula` (vía `dbFilaBasculaEliminar`, ya existente — mismo
candado de permisos `esMaster()` en las reglas, sin cambios ahí).
Tolerante: si el ticket no tenía `fila_bascula_id` (tickets viejos), o
el doc ya no existe, no hace nada — envuelto en su propio try/catch
para no bloquear el resto del borrado si esto falla.

**Aclaración importante — esto NO se aplicó retroactivamente:** el
ticket de prueba original de Jesús (el que quedó huérfano ANTES de
este fix) sigue huérfano en `fila_bascula` — este cambio solo afecta
eliminaciones FUTURAS. Para limpiar ese registro de prueba específico,
hay que borrarlo manualmente desde la consola de Firebase, o
re-registrar una "Entrada a fila" nueva con esas mismas placas (crea un
documento nuevo e independiente, sin tocar el huérfano) y luego usar el
botón 🗑️ de Fila Báscula sobre el huérfano viejo directamente.

**Verificación antes de entregar:**
- `node --check` limpio en ambos bloques (`module` y normal).
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Confirmé que `esMaster()` en `firestore.rules` ya cubre el delete de
  `fila_bascula` sin necesitar ningún cambio de reglas.

## 71. 26-jul-2026 — Rezaga agregada al catálogo de captura, restringida a Muro/Morro/Cuerpos + Área de Prefabricados

**Sesión:** Sonnet5-20260726-A

Decisiones de Jesús: Rezaga sin clasificación de rango (siempre pendiente), permitida en Muro/Morro/Cuerpos + Área de Prefabricados (NO en Acopio Marino/Terrestre), sin entrada en Metas/CATALOGO_TOTALES (Prefabricados no es parte del programa original — confirmado ya excluido de Avances/Acopios por diseño previo, ver computeConcepto/SUMINISTRO_PREFABRICADOS).

**Cambios:** (1) opción "Rezaga" agregada a `f-material`; (2) `EXCLUSIONES_DESTINO_POR_MATERIAL` — se agregó 'AREA DE PREFABRICADOS' a la exclusión de Núcleo/Secundaria 1-2/Berma/Berma de Apoyo, y nueva entrada `REZAGA: ['ACOPIO MARINO','ACOPIO TERRESTRE']`; (3) `updateRangos()` auto-marca y deshabilita "pendiente" cuando material=REZAGA **y no es edición** (`!window._editFid` — se encontró y corrigió a tiempo un bug real: sin ese candado, editar un ticket viejo de Rezaga con rango histórico real lo hubiera sobrescrito a 'PENDIENTE' al guardar, por cómo `saveRecord()` prioriza el checkbox sobre el valor del campo).

**Verificación:** `node --check` limpio en ambos bloques, sin IDs duplicados de DOM.

## 72. 26-jul-2026 — Zona horaria: sin hallazgos. Costo de lecturas: `dbFilaBasculaBuscarPorTipo()` corregido

**Sesión:** Sonnet5-20260726-A

**Zona horaria:** el dato crítico (`fecha1`/`dia_captura`, decide el mes de cada ticket) ya usa `timeZone:'America/Mexico_City'` explícito — correcto. Solo `isoHoy()` (pre-rellenar filtro "este mes" en Resumen/Bancos/Reportes) usa hora local del dispositivo — bajo riesgo, no toca datos guardados, usuario puede corregir el filtro a mano. Sin fix necesario.

**Costo de lecturas:** `dbFilaBasculaBuscarPorTipo()` (llena el desplegable de Placas en cada "Nueva captura") filtraba solo por `tipo_camion`, sin `cerrado` — con 300-500 tickets/día y sin purga de registros cerrados, la lectura iba a crecer sin límite con el tiempo. Se agregó `where('cerrado','==',false)`, mismo patrón que su función hermana `dbFilaBasculaBuscarAbiertas`. Puede pedir crear índice compuesto (tipo_camion+cerrado) la primera vez — Firestore da el link en consola. Los 3 botones "Recalcular..." (admin) sí leen la colección completa sin cooldown, pero ya tienen su propio `confirm()` de aviso y deshabilitan el botón mientras corren — riesgo bajo, uso admin poco frecuente, sin cambio.

**Verificación:** `node --check` limpio en ambos bloques.

## 73. 26-jul-2026 — Botón "Autorizar" ya respeta el candado de rol (mismo criterio que Revocar/Eliminar) — CORREGIDO

**Sesión:** Sonnet5-20260726-A

El botón "Autorizar" (Admin → Usuarios, cuentas con status 'pendiente') se mostraba a cualquiera sin filtrar por rol del usuario objetivo, a diferencia de "Revocar"/"Eliminar". Se agregó la misma condición `puedeEliminar` (`esMaster || (esAdmin && rolUsuario==='capturista')`) — un admin ya no ve el botón para un pendiente que no sea capturista, evitando el error crudo de Firestore al intentarlo.

**Verificación:** `node --check` limpio en ambos bloques, sin IDs duplicados de DOM.

## 74. 26-jul-2026 — H-05 Fase 1: mensajes claros de "sin señal" en los 6 puntos de escritura de Fila Báscula — CORREGIDO

**Sesión:** Sonnet5-20260726-A

Decisión de Jesús: solo Fase 1 (mensaje claro), sin cola offline — la app es webapp, no corre sin internet desde cero (los otros 3 puntos con cola offline cubren señal intermitente con la página ya cargada, no "cero internet").

**Qué se cambió:** helper `mensajeErrorFilaBascula(accion, e)` a nivel de módulo (disponible desde el arranque) — si `!navigator.onLine` o `e.code==='unavailable'`, muestra "Sin señal — el registro de X NO se guardó..." en vez del error crudo de Firebase; para cualquier otro tipo de error, conserva el mensaje técnico original (no se oculta información real de un bug). Aplicado en los 6 puntos: registrar entrada, registrar salida, reclamar para destare, liberar camión, registrar destarado, eliminar (este último conserva además su mensaje extendido de diagnóstico para errores que no sean de señal). No se tocó `procesarFilaBasculaDeTicket` (línea ~8138): esa escritura vive dentro del flujo de cierre de ticket, ya cubierto por el manejo de la sección 68.

**Nota de implementación:** el primer intento puse el helper DENTRO de `registrarEntradaFila()` por error — no hubiera estado disponible hasta la primera vez que alguien registrara una entrada. Se corrigió antes de entregar, moviéndolo a nivel de módulo.

**Verificación:** `node --check` limpio en ambos bloques, sin IDs duplicados de DOM.

**Pendiente, sin decidir:** la Fase 2 (cola offline real para Fila Báscula) queda descartada por ahora según el razonamiento de Jesús arriba.

## 75. 26-jul-2026 — Causa real de la lentitud a 6,000 viajes: `renderDB()` corría completo en cada escritura, aunque la pestaña no estuviera visible — CORREGIDO

**Sesión:** Sonnet5-20260726-A

**Causa raíz encontrada:** el listener principal de `acarreos` (`onSnapshot`, ventana de `ventanaDias` días, tope 3,000-9,500 docs) llamaba `renderDB()` — función pesada: filtra, agrupa tarjetas de Barcaza, reconstruye la lista — en CADA escritura de CUALQUIER usuario, sin verificar si la pestaña "Base de Datos" estaba siquiera abierta. Con captura activa de varios capturistas, esto significa trabajo pesado constante en segundo plano en cada celular conectado, sin que nadie lo esté viendo — probablemente la causa principal de la lentitud reportada a solo 6,000 registros totales.

**Fix:** `renderDB()` ahora solo corre si `#tab-db` está activa. El botón del menú "Base de Datos" fuerza un render fresco al entrar, así la lista nunca se ve obsoleta.

**Verificación:** `node --check` limpio en ambos bloques, sin IDs duplicados.

**Otros riesgos de escala identificados (400-500k registros), sin corregir todavía — requieren decisión/priorización de Jesús:**
1. `LIMITE_VENTANA` (tope 9,500 docs en la ventana de 30 días): a 300-500 viajes/día, 30 días = 9,000-15,000 — va a chocar con el tope regularmente, mostrando "⚠️ Se alcanzó el tope de carga" cada vez más seguido. Requiere decidir: ¿bajar la ventana default, subir el tope, o rediseñar a paginación real?
2. El listener remapea TODO el array (`snapshot.docs.map(...)`) en cada cambio, en vez de procesar solo `snapshot.docChanges()` (patrón estándar de Firestore para listeners grandes) — más costoso de lo necesario incluso con el fix de este punto, pero de menor impacto ahora que ya no corre en segundo plano.
3. No se auditó a fondo el resto de funciones que procesan arrays completos en el cliente (Gráficos, Reportes) para confirmar cuáles escalan mal a cientos de miles de registros — pendiente si se quiere profundizar.

## 76. 26-jul-2026 — Ventana de carga de "Base de Datos" redimensionada para 300-500 viajes/día — CORREGIDO

**Sesión:** Sonnet5-20260726-A

Confirmado por Jesús: "Base de Datos" (ventana en vivo) casi siempre se usa para días recientes (pendientes, correcciones) — el historial viejo se resuelve con Reportes/Resumen o "Ver TODO el histórico". Con eso:

**Qué se cambió:**
- Opciones de ventana: de 7/30/90/365 días a **7/15/30 días** (default 7, antes 30). 90/365 días quedaban muy por debajo de lo prometido a este volumen de todos modos (ej. "30 días" en realidad solo mostraba 12-20 días de datos reales antes de este fix).
- `LIMITE_VENTANA`: `{7:4000, 15:8500, 30:16000}` (antes `{7:3000, 30:6000, 90:9500, 365:9500}`), techo duro de 9500→17000 — dimensionado para 300-500 viajes/día real, no para el volumen de cuando se escribió el código original.

**Pendiente relacionado, NO corregido (fuera de lo que se pidió hoy):** `cargarHistoricoParaVisor()` (línea ~985) sigue cargando 90 días fijos con `traerTodoFirestore()` para el rol visor — a 300-500/día eso son 27,000-45,000 lecturas POR SESIÓN de visor, y el comentario original ya advertía que puede haber varios visores a la vez (ej. 4 directores). Vale la pena revisarlo en otra sesión — mismo cupo compartido de 50,000/día que el bot de Telegram.

**Verificación:** `node --check` limpio en ambos bloques, sin IDs duplicados de DOM.

## 77. 27-jul-2026 — Pendiente de la sección 76: cooldown de 10 min para `cargarHistoricoParaVisor()` — CORREGIDO (alcance parcial, ver abajo)

**Sesión:** Sonnet5-20260726-A

**Qué se cambió:** se agregó `cooldownHistoricoVisorRestanteMin()` (mismo
patrón de `localStorage` + 10 min que `confirmarLecturaCompleta()`, sección
66, pero **sin** su diálogo `confirm()` — este flujo corre automático al
abrir la app y desde el botón de sync manual, así que bloquear con un
diálogo en cada apertura sería mala UX para un rol que solo consulta).
`cargarHistoricoParaVisor()` ahora, si ya hay datos en memoria (`db`) y el
cooldown sigue activo, **no vuelve a leer Firestore** — reutiliza lo que ya
está cargado y solo refresca la nota visual con los minutos restantes.
`manualSync()` (el botón de sync del visor) ahora avisa explícito con un
toast "Ya actualizaste hace poco — espera N min" cuando el cooldown está
activo, en vez de repetir la lectura completa cada toque.

**Alcance de este fix, explícito (30.3):** cierra el caso de mayor riesgo
real identificado en la sección 76 — uno o varios visores tocando el botón
de sync manual repetidamente. **NO cierra** el caso de recargar/reabrir la
app: la memoria de `db` se pierde al recargar la página, así que una
recarga dentro de la ventana de cooldown vuelve a leer completo aunque el
timestamp en `localStorage` siga vigente (el cooldown en sí sigue activo,
pero no hay datos en memoria que reutilizar). Cerrar ese caso requeriría
cachear el dataset mismo entre recargas (`sessionStorage`, con manejo de
tamaño y de timestamps de Firestore al serializar) — se decidió no hacerlo
en esta misma entrega para no mezclar dos cambios de riesgo distinto; queda
como pendiente aparte si Jesús decide que vale la pena.

**Verificación antes de entregar:**
- `node --check` limpio en los 4 bloques `<script>` reales del archivo
  (extraídos por posición exacta de apertura/cierre, no por regex simple —
  ver nota de falso positivo en 24.4/30.5).
- Grep de IDs duplicados de DOM fuera de `<script>`: cero.
- Confirmado que ambas funciones tocadas (`cargarHistoricoParaVisor`,
  `manualSync`) siguen viviendo en el mismo bloque `<script type="module">`
  donde ya estaban — el cambio no las movió de bloque.

## 78. 27-jul-2026 — Auditoría sección 75 pendiente #3 (Gráficos/Reportes) — hallazgo real + fix (Resumen y Bancos incluidos)

**Sesión:** Sonnet5-20260726-A

**Lo que ya estaba bien:** ni `renderDashboard()` ni `renderReportes()` están
enganchados al listener de fondo (`onSnapshot`) — solo corren al entrar a
la pestaña o cambiar un filtro. No repiten el bug de `renderDB()` (sección
75). Ambas ya usaban agregados mensuales (`resumenes/{mes}`) como ruta
principal, no lectura de la colección completa.

**Hallazgo real:** `calcularResumenGenericoAgregado()`/`calcularResumenBancosAgregado()`
mezclaban "traer del rango" con "filtrar por banco/material/destino/tipo de
camión" — el filtro es 100% cliente, pero cada checkbox togglead@o volvía a
leer Firestore desde cero, incluyendo `traerTodoFirestore()` del **mes en
curso completo** cada vez que el rango llega a "hoy" (caso normal —
Estatus Operativo, Suministros del día, etc.). Afecta las 4 pestañas que
comparten estas funciones: Gráficos, Reportes, Resumen y Bancos.

**Fix:** se separó "traer" de "filtrar". Dos funciones nuevas,
`obtenerLineasCrudasRango()` y `obtenerLineasCrudasBancosRango()`, cachean
en memoria (60s) las líneas crudas por rango de fechas exacto; el filtrado
sigue siendo síncrono sobre esas líneas. Togglear un checkbox ya no dispara
lectura de red si el rango de fechas no cambió.

**Por qué son DOS caches separados, no uno:** al revisar `aplicarResumen()`
antes de unificar, se encontró que `por_combinacion` (fuente de
Gráficos/Reportes/Resumen) y `por_banco_material_rango` (fuente de Bancos)
NO son equivalentes — `por_combinacion` cuenta doble los tickets de
colocación a propósito (fix del 22-jul para Metas: material real +
pseudo-material "COLOCACION TERRESTRE/MARINA"). Compartir una sola fuente
habría duplicado viajes/toneladas de colocación en Bancos. Se detectó ANTES
de entregar, no en producción.

**Verificación:** `node --check` limpio en los 4 bloques reales, cero IDs
duplicados, confirmado que ningún call site externo cambió de firma.

---

## 79. 03-ago-2026 — PDF de Bancos: 3 columnas nuevas + reordenado por fecha/hora ascendente; Gráficos: pastel por Banco con % (mismos colores que la barra existente)

**Sesión:** Sonnet5-20260803-A

**Contexto:** primera entrega de esta sesión. Se leyó `INSTRUCCIONESAPP.md`
completo (0, 0.5, 0.6, 0.7, 1, 2, 6, 7, 8, 30 y 69–78) y se verificó contra
`index.html` real (roles, `stats_analisis`, `fila_bascula`, catálogo REZAGA,
campo `hora1`/`hora2`/`ciclo` ya existente en cada ticket) antes de tocar
código — sin junta Obeya completa: son 2 cambios acotados de UI/reporte,
sin impacto de arquitectura, financiero ni de flujo de báscula/camión, así
que no aplicaba convocar el comité completo (regla de la sección 0.7,
punto 1). Sí se aplicó el criterio de Arquitecto/UX de campo de forma
puntual (ver aclaración de layout responsivo abajo).

**Nota de protocolo (sección 0.6, punto 3):** esta sesión partió de
`index.html`/`INSTRUCCIONESAPP.md` subidos directo por Jesús al chat, no
del repo de GitHub — no fue técnicamente posible comparar contra la
versión actual del repo antes de generar estos archivos (sin acceso a red
en este entorno). **Verificar contra el repo antes de subir**, por si hubo
cambios de otra sesión que esta copia no conoce.

### 79.1 — PDF de Bancos (`descargarPdfBancos()`)

**Aclaración antes de listar el cambio:** Jesús pidió 4 columnas nuevas
("Fecha", "Hora primer pesaje", "Hora segundo pesaje", "Ciclo"), pero
**"Fecha" ya existía** en el PDF desde antes (sección 11.2/12.5). Se
interpretó como que se refería a las otras 3, y se dejó la columna Fecha
donde ya estaba (no se duplicó). Si la intención era otra cosa con
"Fecha", decírmelo y se ajusta.

**Qué se cambió:**
1. **3 columnas nuevas**, colocadas junto a Fecha: `1er PESAJE` (`hora1`),
   `2do PESAJE` (`hora2`), `CICLO` (`r.ciclo`, string ya calculado y
   guardado en cada ticket al completar el destare — sección 12.5/26, no
   se recalculó nada nuevo). Tickets con `status: 'pendiente'` (sin 2do
   pesaje todavía) muestran `⏳` en esas dos columnas, en vez de un dato
   falso.
2. **Orden dentro de cada grupo banco+material** cambió de "por número de
   folio" a **ascendente por fecha+hora del 1er pesaje** (de la primera
   fecha/hora a la última), usando `combinarFechaHora()` ya existente
   (sección 72, mismo criterio CDMX -06:00 que el resto de la app). **La
   división física por banco+material con su renglón de subtotal (sección
   19) no se tocó** — Jesús pidió explícitamente seguir respetándola, y
   el cambio de orden es *dentro* de cada grupo, no reemplaza la
   agrupación.
3. Tabla reacomodada a 12 columnas (antes 9): `BANCO, FECHA, 1er PESAJE,
   2do PESAJE, CICLO, BOLETA, PLACA, FOLIO, MATERIAL, VIAJE, TONELADA,
   TON/VIAJE`. Anchos de columna redimensionados para caber en la misma
   hoja landscape carta (9.65" de 9.8" útiles) — fuente bajada de 8pt a
   7.5pt (7pt en encabezado) para no perder legibilidad de las columnas
   ya angostas como Placa (dobles de góndola/articulado).

**Explícitamente NO tocado:** la tabla en pantalla de Bancos
(`renderBancosTabla`), el filtro por banco/periodo, ni el Excel de Bancos
— solo el PDF, mismo alcance que la sección 11.2 original.

### 79.2 — Gráficos: pastel de Bancos con % + recoloreo de la barra existente

**Qué se construyó:**
1. Gráfica de pastel nueva (`chart-banco-pie`), junto a la dona de
   Material existente, con las mismas toneladas por banco que ya calcula
   `renderDashboard()` (`porBancoAgg`, agregado mensual — no se agregó
   ninguna lectura nueva a Firestore, se reusa el mismo dato que ya
   alimentaba la gráfica de barras).
2. **Layout responsivo** (`.charts-row-2`, mismo breakpoint de 1024px que
   ya usa `.nav-drawer`): en escritorio/PWA con espacio de sobra, dona y
   pastel van lado a lado, como pidió Jesús ("a un lado de la gráfica de
   dona"). **En celular se apilan** (una sola columna) — criterio de UX
   de campo (sección 0.7): dos gráficas circulares a media pantalla en un
   teléfono se vuelven ilegibles con una mano, y ningún otro `.chart-card`
   de la app va lado a lado en móvil.
3. **% dentro de cada rebanada**: no hay plugin de etiquetas de datos
   cargado (el proyecto no trae `chartjs-plugin-datalabels` por CDN, y no
   se agregó dependencia nueva) — se escribió un plugin propio
   (`pieBancoLabelsPlugin`), mismo patrón ya usado en el proyecto
   (`customBubblePlugin`, sección 20.3/tendencia). Rebanadas menores al 3%
   no imprimen texto (no cabe legible) — el tooltip sí muestra el % exacto
   siempre, al tocar/pasar el mouse.
4. **Mismo color por banco en pastel y barra**: `colorParaBanco()`, paleta
   fija de 8 colores muy distintos entre sí a propósito (pedido explícito:
   "no usar colores similares"), asignados por posición en el catálogo
   real `ORIGEN_BANCOS` (5 bancos hoy) — determinístico, no depende del
   orden en que el agregado filtrado devuelva las llaves. Bancos fuera del
   catálogo fijo (dato legado inesperado) caen a un color estable por hash
   del nombre, para no repetir sin querer el color de un banco real.

**Explícitamente NO construido en esta entrega (a propósito):** la
descarga a PDF de la sección de Gráficos. Jesús pidió dejarlo aparte
porque va a ser más específico de lo que parece a primera vista y se va a
necesitar varias sesiones — queda como **pendiente abierto explícito**,
no implementado ni parcialmente empezado. Cuando se retome, aplica la
sección 0.7 completa (Arquitecto para decidir si reusa `jsPDF` +
`html2canvas`/captura de `<canvas>` vs. tabla tipo `autoTable`, UX de
campo para el tamaño de página, más el alcance exacto que Jesús vaya a
precisar).

**Verificación antes de entregar (checklist 30.5):**
- 4 bloques `<script>` reales extraídos por posición exacta de
  apertura/cierre (no por regex simple — el archivo tiene comentarios que
  mencionan literalmente el texto `<script>`, ver nota 24.4): `node
  --check` limpio en los 4.
- `grep` de IDs de DOM duplicados fuera del `<script type="module">`:
  cero.
- Confirmado que `colorParaBanco()`/`pieBancoLabelsPlugin`/
  `chartBancoPie` viven en el mismo `<script>` normal donde ya vivía
  `renderDashboard()` (bloque grande, 4730–10756) — no hay llamada
  cruzada de módulo a normal ni viceversa que necesite puente nuevo.
- `fechaHoraTs()`/`combinarFechaHora()` usados en el PDF viven en el mismo
  bloque normal que `descargarPdfBancos()` — sin puente `window.*`
  necesario más allá del ya existente (`window.combinarFechaHora`).
- No se tocaron los 3 puntos de guardado de tickets (sección 1.1.5) — este
  cambio es de lectura/reporte, no de escritura.

**Pendiente de que Jesús pruebe en campo:** que el PDF de Bancos siga
abriendo bien en celular con las 12 columnas (verificar que no se vea
apretado en pantallas más chicas al abrir el PDF desde el navegador
móvil), y que el layout lado-a-lado de las gráficas se vea bien en el
PWA de escritorio/Windows que ya usan algunos roles.

## 79. 27-jul-2026 — Prueba de uso simulada (12 sesiones concurrentes) — SOLO HALLAZGOS, sin código tocado

**Sesión:** Sonnet5-20260726-A

Simulación pedida por Jesús: 3 visores, 1 master, 2 admin, 1 coordinador, 5
capturistas conectados a la vez, cada capturista capturando ~3 viajes/2min
(450 viajes/hora combinado — 8-10x el supuesto de 300-500/día). Simulación
de código (trazado función por función), no prueba de carga real contra
Firebase.

**H1 (menor):** el listener global de `fila_bascula` (línea 665) corre para
los 12 roles sin excepción, incluido visor — el comentario de la sección
20/77 dice que visor "no usa listener en tiempo real", cierto solo para el
listener grande de tickets. Impacto bajo (tope 80).

**H2 (grave):** el costo dominante NO son las capturas, es conectar 9
sesiones con listener vivo (master+2admin+1coord+5capturistas): hasta
~37,000 lecturas SOLO por abrir la app, antes de capturar nada — ~74% del
cupo diario compartido de 50,000. Sostenido un turno completo a la tasa
pedida, el estimado total (~70,000-80,000 lecturas) rompe el cupo diario y
tumba también al bot de Telegram (cupo compartido).

**H3 (correctness, no escala):** `fila_bascula` se actualiza con
`updateDoc()` plano (línea 2764), sin `runTransaction` ni verificación de
versión. Dos capturistas tocando el MISMO camión casi al mismo tiempo
pueden pisarse campos en silencio (ej. perder `destarado_por`). Raro a
300-500/día, más probable bajo carga simultánea alta.

**Lo que sí aguanta:** gating de `renderDB()` (sección 75), cache de 60s
(sección 78), `increment()` en resumenes (atómico, sin riesgo de carrera).

**Pendiente, sin decidir todavía:** cuál atacar primero — H2 (más grave,
cupo), `docChanges()` (ya discutido, ayuda CPU no cupo), o H3 (transacción
en fila_bascula, correctness).

## 80. 27-jul-2026 — H2 de la sección 79 (el más grave): ventana de listener por rol — CORREGIDO (parcial, ver alcance)

**Sesión:** Sonnet5-20260726-A

**Qué se cambió:** `startRealtimeSync(rol)` ahora usa una ventana fija de
2 días / tope 1,500 documentos para `capturista` (no ve la pestaña "Base de
Datos", solo necesita Pendientes reciente + un pre-check de duplicado que
de todos modos tiene respaldo real en Firestore). Coordinador/admin/master
siguen usando el selector `ventanaDias` normal (7/15/30 días).

**Impacto estimado (mismo método de trazado de código de la sección 79):**
el costo de "solo abrir la app" con 5 capturistas + 1 master + 2 admin + 1
coordinador conectados baja de ~37,000 a ~23,500 lecturas estimadas
(-36%) — capturistas pasan de hasta 4,000 docs c/u a hasta 1,500 c/u.

**Alcance, explícito (30.3) — esto NO cierra H2 por completo:** el ahorro
es sobre la lectura INICIAL al conectarse. El costo de propagación
continua (cada escritura se reparte a las 9 sesiones vivas, sin importar
el tamaño de su ventana — un ticket nuevo siempre cae dentro de cualquier
ventana) NO se reduce con este cambio. En el escenario sostenido de la
sección 79 (450 viajes/hora todo el día), ese costo de propagación
(~32,000-40,000/día) sigue ahí y sigue pudiendo romper el cupo compartido
de 50,000/día. Cerrar eso de raíz requeriría que capturista deje de tener
listener EN VIVO (pasar a un modelo de "pull" tipo visor, sección 77) —
cambio con trade-off de UX (Pendientes deja de ser instantáneo) que no se
implementó hoy porque necesita decisión explícita de Jesús.

**Verificación:** `node --check` limpio en los 4 bloques reales, cero IDs
duplicados, confirmado que `cambiarVentana()` (el único otro call site de
`startRealtimeSync`, sin argumento de rol) no es alcanzable por capturista
(no tiene el selector en su UI), así que sigue usando la ruta normal sin
riesgo.

## 81. 27-jul-2026 — Corrección de volumen: la sección 79 exageró la tasa sostenida

**Sesión:** Sonnet5-20260726-A

Jesús corrigió el supuesto de la sección 79: el tope real es **150 camiones
× 3 viajes = 450 entradas + 450 destares (900 en `fila_bascula`)**, hasta
~1,500 registros/día contando barcaza — MUY cerca del supuesto original de
300-500 viajes/día con el que ya está calibrado el resto de la app
(LIMITE_VENTANA, cooldowns), no las 3,600-4,500/día que asumía el
escenario B ("sostenido todo el día") de la sección 79.

**Recalculado con el volumen correcto (post-fix sección 80):** propagación
continua ≈ 1,000 escrituras `acarreos`/día × 9 sesiones + ~900 escrituras
`fila_bascula`/día × 12 sesiones ≈ ~19,800 lecturas/día de fan-out, más
~24,500 de lectura inicial (ya con el fix de la sección 80) ≈ **~44,000
lecturas/día estimadas** — cerca del límite de 50,000 compartido con el
bot de Telegram, pero NO el reventón catastrófico de 70,000-80,000 que
calculaba la sección 79 con la tasa exagerada. El fix de la sección 80
sigue siendo válido y necesario (da margen real), pero la severidad de H2
bajo volumen real es "ajustado, sin margen sobrado" — no "se rompe seguro".

**Sobre la pregunta de Jesús (Pendientes sin sync instantáneo):** confirmado
antes de descartar esa opción — el emparejamiento en vivo entre básculas
(1er pesaje ↔ destare) pasa por el listener GLOBAL de `fila_bascula`
(línea 665, chico, tope 80, vive para los 12 roles) que la sección 80 NO
tocó. La pestaña "Pendientes" (basada en `db`, el array grande) es más
bien una vista de supervisión para tickets atorados +12h, no el mecanismo
que usan los capturistas para cerrar un ciclo en el momento. Aun así,
Jesús decidió no arriesgar el flujo de trabajo con ese cambio — queda
descartado por ahora, no se implementa.

## 82. 27-jul-2026 — H3 de la sección 79: transacción para reclamar/destarar en fila_bascula — CORREGIDO

**Sesión:** Sonnet5-20260726-A

**Qué se cambió:** nuevo bridge `window.dbFilaBasculaReclamarSiLibre(filaId,
campoReclamo, campos)` — lee el documento dentro de un `runTransaction` y
RECHAZA la escritura (con mensaje claro) si el campo de reclamo
(`reclamado_por` o `destarado_por`) ya tiene dueño, en vez de pisarlo en
silencio como hacía `dbFilaBasculaActualizar()` (updateDoc plano).
Conectado en los dos puntos donde la UI promete exclusividad:
`registrarEntradaFilaSegunda` (reclamar para destare) y
`registrarSalidaFilaSegunda` (marcar destarado).

**Por qué solo esos dos, no todo `fila_bascula`:** son los únicos dos
lugares donde la UI le promete al capturista "esto es tuyo en exclusiva"
(línea ~8172). El resto de las actualizaciones (t3_salida_ts de "sale a
tiro", liberar camión, cerrar ciclo desde `procesarFilaBasculaDeTicket`)
son timestamps o limpiezas de estado sin esa promesa de exclusividad —
seguir usando `dbFilaBasculaActualizar()` (updateDoc plano) para esos es
correcto y no se tocó.

**Verificación:** `node --check` limpio en los 4 bloques reales, cero IDs
duplicados, `runTransaction` importado en el módulo (línea 461) y usado
solo ahí — el helper viejo sigue intacto para sus otros 3 call sites.

## 83. 27-jul-2026 — docChanges(): pendiente restante de la sección 79 — CORREGIDO

**Sesión:** Sonnet5-20260726-A

**Qué se cambió:** el listener principal (`startRealtimeSync`) ya no hace
`db = snapshot.docs.map(...)` (remapeo COMPLETO del array, hasta
17,000/4,000/1,500 objetos según el rol, en CADA evento del listener, sin
importar que solo cambiara 1 documento). Ahora usa `snapshot.docChanges()`
y actualiza `db` con `splice()` puntual usando `newIndex`/`oldIndex` que
ya calcula el SDK según el `orderBy(fecha1 desc)` de la query. `db` se
reinicia explícito (`db = []`) justo antes de suscribirse — necesario
porque los índices de docChanges() son relativos a ESTA query; sin el
reset, cambiar de ventana (`cambiarVentana()`) dejaría splices mal
alineados sobre datos de la ventana anterior.

**Qué mejora y qué NO (dicho explícito, igual que en las entregas
anteriores):** esto es CPU/memoria del dispositivo, no cupo de Firestore —
las lecturas ya se facturan por documento cambiado sin importar cómo las
procese el cliente. Con 9 sesiones conectadas, cada escritura ajena pasa
de reconstruir hasta miles de objetos en cada teléfono a tocar 1-3.

**Verificación:** `node --check` limpio en los 4 bloques reales, cero IDs
duplicados. Confirmado que Firestore emite `removed` correctamente cuando
un doc nuevo empuja fuera del `limit(tope)` a uno viejo (comportamiento
documentado del SDK), así que `db` se mantiene acotado sin lógica extra.

**Cierre de la sección 79:** con esto quedan atendidos los 3 hallazgos de
la prueba de uso simulada (H2 sección 80, H3 sección 82, docChanges()
sección 83).

## 84. 27-jul-2026 — Fallo silencioso restante en aplicarResumen() (historico_global) — CORREGIDO

**Sesión:** Sonnet5-20260726-A

De los 3 puntos de escritura de `aplicarResumen()` (mensual, avance_acopio,
historico_global), los dos primeros ya tenían aviso visual desde la
sección 68 — `historico_global` se quedó fuera por descuido, solo
`console.error`. Se agregó el mismo toast: "Ticket guardado, pero el total
histórico no se pudo actualizar. Usa 'Recalcular total histórico' en
Admin." No afecta el resumen del mes en curso, solo el total rápido de
"TODO el histórico" (Gráficos/Resumen/Reportes/Bancos).

**Verificación:** `node --check` limpio en los 4 bloques, sin IDs duplicados.

## 85. 27-jul-2026 — Corrección de económico mal capturado en flota — CORREGIDO

**Sesión:** Sonnet5-20260726-A

Nueva tarjeta en Auditar → "Corregir económico de una placa", visible
solo para `master` (`initAuditarTab()`, oculta por defecto vía
`display:none` para coordinador/admin). Solo corrige placas que YA
existen en `flota` (no crea nuevas) y no toca tickets ya guardados en
`acarreos` con el económico anterior — corregir históricos es una
operación distinta y más riesgosa, se dejó fuera a propósito. Invalida
`window._auditFlotaCache` al guardar para que el siguiente chequeo de
duplicados/sin-económico lo vea corregido de inmediato.

**Verificación:** `node --check` limpio en los 4 bloques, sin IDs
duplicados, confirmado que `initAuditarTab()` se dispara al abrir la
pestaña (línea 3195).

**Pendientes reales que quedan:** modo oscuro en manifest.json (cosmético).

## 86. 27-jul-2026 — Auditoría pre-demo (barrido completo del archivo) + contador de splash para visor — CORREGIDO

**Sesión:** Sonnet5-20260726-A

Antes de una presentación a dirección, barrido automático de TODO el
archivo (no solo lo tocado hoy): 95/95 `onclick`/`onchange` con función
real, cero funciones duplicadas, 244 `getElementById` revisados.

**Falsa alarma descartada:** `dash-historico-nota` (Gráficos) no tiene
elemento en el HTML — pero es el mismo patrón intencional que Bancos/
Resumen/Reportes (sección 19.5, 18-jul: Jesús pidió ocultar esos botones
porque las tablas ya leen agregado automático). No es un bug, no se tocó.

**Hueco real, menor, corregido:** `app-loading-msg` no existía en el
splash (`fb-loading`) — durante la carga inicial del rol visor (90 días)
no se mostraba el contador de progreso, aunque el código ya lo intentaba
actualizar (protegido con `if (el)`, nunca truena, solo no se veía). Se
agregó `<p id="app-loading-msg">` debajo de "Conectando…".

**Verificación:** `node --check` limpio en los 4 bloques, sin IDs
duplicados. No se encontró nada roto en el resto de la app.

## 87. 03-ago-2026 — 🔴 Bug real reportado por Jesús: editar un ticket ya destarado lo "regresaba" a pendiente y le borraba fecha2/tara/neto — CORREGIDO (3 causas relacionadas)

**Sesión:** Sonnet5-20260803-A

Jesús reportó que al editar un ticket ya completo (ej. corregir el peso),
el ticket aparecía en "Base de Datos" con el badge "⏳ Pendiente" aunque
ya tenía sus dos pesajes, ya estaba destarado y ya contaba en gráficas de
material/metas. La edición no se aplicaba de verdad ("no se reclasifica
ni se reedita"). Pidió también, explícitamente, que ninguna edición
altere el timestamp original de creación del ticket.

**Diagnóstico (sesión de preguntas con Jesús para descartar hipótesis):**
pasaba con tickets recientes capturados 100% dentro de la app (no solo
importados de Excel), y encontrando el ticket directo en la lista en vivo
de "Base de Datos" (se descartó que fuera por una copia vieja de
`dbHistorial`/"Ver TODO el histórico" — ese listener SÍ se confirmó en
vivo, con `docChanges()` reemplazando el registro completo en cada
edición). La causa exacta de por qué el `status` de un ticket puede
quedar en `'pendiente'` estando de hecho completo no se pudo confirmar
100% sin acceso de lectura en vivo a Firestore (se necesitaría inspeccionar
el documento real de una boleta afectada, ej. "DTFMH") — el fix aplicado
es defensivo por diseño: cierra la clase completa del bug en vez de
apostar a una sola causa raíz.

**Causas encontradas y corregidas, las tres en el mismo patrón recurrente
de la sección 24.1 ("función pensada solo para un flujo se ejecuta sin
distinguir el otro"):**

1. **`getFormData()` confiaba ciegamente en `status` para decidir
   `esPendiente` al editar** (línea ~5832). Si ese campo quedaba
   desincronizado de la realidad del ticket por cualquier motivo (incluida
   una edición previa ya afectada por este mismo bug — el bug se
   auto-perpetuaba), la siguiente edición volvía a marcar el ticket como
   pendiente y `getFormData()` vaciaba `fecha2`/`hora2`/`ciclo`/`tara_kg`/
   `neto_kg`/`ton` (línea 5841-5871, ya diseñado así a propósito para
   captura NUEVA). **Fix:** además de `status`, ahora se verifica evidencia
   real de que el destare ya se hizo (`fecha2`+`hora2`+`tara_kg>0` en
   `window._editOriginal`) — si existe, se trata como completo sin
   importar lo que diga `status`. Blindaje, no solo corrección del síntoma.
2. **`ts` (timestamp original de creación) se sobrescribía en cada edición.**
   `getFormData()` siempre agrega `ts: new Date().toISOString()` al
   payload — necesario para la rama de CREAR (que lo pisa con
   `serverTimestamp()`), pero nadie lo pisaba ni lo borraba en la rama de
   EDITAR (`saveRecord()`, ambos casos online y cola offline en
   `procesarColaOffline()`). **Fix:** `delete payload.ts` / `delete nuevo.ts`
   antes de escribir en ambos flujos de edición — una edición ahora nunca
   toca el timestamp original, tal como pidió Jesús.
3. **Doble conteo en el panel Six Sigma al editar un ticket ya cerrado.**
   `procesarFilaBasculaDeTicket()` se llama igual desde captura nueva/
   `completarPendiente()` que desde `saveRecord()` en modo edición, sin
   distinguir los dos casos — cada edición de un ticket ya completo volvía
   a sumar sus tiempos de ciclo a `incrementarStatsResumen()` (línea
   ~8379), inflando `ciclos_bascula_cerrados` y las sumas de espera cada
   vez que alguien corregía algo. **Fix:** se lee `fila.cerrado` ANTES de
   actualizar el documento de `fila_bascula`; si ya estaba cerrado, se
   sigue actualizando `stats_analisis` (para reflejar correcciones de
   fecha/hora) pero se salta el incremento del agregado — solo cuenta la
   primera vez que el ciclo se cierra.

**Verificación:** `node --check` limpio en los 4 bloques de `<script>`,
cero IDs de DOM duplicados, los 5 puntos de cambio quedaron en el bloque
de `<script>` correcto según su dependencia (imports de Firebase
`serverTimestamp`/`updateDoc` dentro del `<script type="module">`; lógica
de `getFormData()`/`procesarFilaBasculaDeTicket()` en el `<script>` normal,
usando solo los puentes `window.dbFilaBascula*`/`window.dbStatsAnalisis*`
ya existentes, sin llamadas nuevas a Firebase fuera del módulo).

**Pendiente real que queda, requiere decisión de Jesús (no corregido en
esta sesión, es dato ya escrito, no código):** este fix previene que el
bug se repita hacia adelante, pero **no corrige tickets que ya quedaron
mal marcados en el pasado** (status:'pendiente' con datos completos, y los
agregados de `resumenes`/panel Six Sigma potencialmente ya inflados por
ediciones previas afectadas). Antes de dar esto por cerrado del todo,
sería sano correr una auditoría puntual (ej. `where('status','==','pendiente')
AND fecha2 != null`) para ver el tamaño real del problema y decidir si
hace falta una corrección de datos aparte — se deja pendiente de que
Jesús confirme si quiere esa auditoría ahora o después.

## 88. 04-ago-2026 — PDF de "Gráficos" con análisis en texto (3 páginas: dona+pastel / barra Banco / barra Mes-Año) — reemplaza la versión simple de imágenes+tabla

**Sesión:** Sonnet5-20260803-B (continuación, ya 04-ago-2026 al momento de
esta entrega).

**⚠️ Nota de reconciliación (mismo patrón de la sección 63):** esta sección
88 reemplaza una sección 88 previa ("PDF de la pestaña Gráficos — dona +
pastel + barra Banco + barra Mes/Año, con tabla resumen") que otra sesión
construyó en paralelo mientras esta seguía en definición con Jesús. Esa
versión exportaba las 4 gráficas como imagen (`chart.toBase64Image()`) +
una tabla resumen, sin párrafo de análisis en texto ni cálculo de "vueltas
por camión". Jesús confirmó explícitamente reemplazarla por la versión con
narrativa (no dejar ambas, no solo agregar encima) — ver la pregunta y
respuesta de reconciliación en el chat, 04-ago-2026.

**Contexto/spec completo (recuperado del chat, se había perdido de este
archivo en la sección 88 anterior):** ver preguntas y respuestas completas
más abajo (88.1). Resumen del pedido original de Jesús: PDF horizontal
carta, 3 páginas — página 1: dona Material + pastel Banco; página 2: barra
Banco; página 3: barra Mes/Año (según el toggle activo) — cada página con
encabezado de filtros activos (Material/Banco) y un párrafo de análisis en
texto generado con los datos y filtros reales del momento de la descarga.

### 88.1 — Decisiones cerradas con Jesús (preguntas y respuestas, mismo día)

1. **Identidad de camión:** placa completa (incluye dobles de
   góndola/articulado).
2. **Denominador de promedios (viajes/día, vueltas/camión):** solo días
   con actividad real (días trabajados), nunca días calendario — mismo
   criterio en Banco (páginas 1-2) y en Mes/Año (página 3).
3. **Alcance del texto:** extremo de mayor + extremo de menor actividad,
   más un resumen breve de los demás (no solo los 2 extremos, tampoco
   lista exhaustiva uno por uno).
4. **"Vueltas por camión" de un banco específico:** cuenta TODOS los
   viajes de ese camión en el periodo (no solo los que fueron a ese banco
   puntual) — un camión puede desviarse a otro banco el mismo día por
   cierre de vialidad u otro percance. Sí respeta el filtro de Banco
   activo (el universo de viajes considerado son los bancos filtrados, no
   el histórico completo del camión).
5. **Página 1 (dona Material + pastel Banco):** SÍ lleva párrafo de
   análisis para Material también, no solo Banco.
6. **Página 2 (barra Banco):** repite EXACTAMENTE el mismo párrafo de
   Banco que la página 1 (mismo texto, solo cambia la gráfica).
7. **Página 3 (Mes/Año):** sigue el toggle Mensual/Anual activo en
   pantalla al momento de descargar.
8. **Encabezado de filtros:** solo Material + Banco (Destino/Cuerpo NO se
   agrega, aunque esté filtrado en pantalla).
9. **Costo de lecturas:** lectura acotada EXACTA al rango filtrado, mismo
   patrón que el PDF de Bancos (sección 11.2/79) — con aviso/confirmación
   antes de leer si el rango es grande (>90 días o "todo el histórico").
10. **Botón:** uno solo, genera las 3 páginas juntas.

### 88.2 — Qué se construyó

- **`descargarPdfGraficos()`** reescrita completa (antes: exportaba las 4
  gráficas como imagen + tabla resumen, sin texto — ver nota de
  reconciliación arriba).
- **Lectura de datos:** `traerTodoFirestore(desde, hasta)` acotada al
  rango exacto de `dash-fecha-desde`/`dash-fecha-hasta` (mismo patrón que
  `descargarPdfBancos`), filtrado después por los mismos criterios que
  `getDashboardFiltered()` (origen_tipo=BANCO + banco/material/cuerpo
  activos) — así el análisis en texto usa exactamente el mismo universo
  que las gráficas en pantalla, aunque la lectura sí sea nueva (no
  reusa las instancias de Chart.js para los NÚMEROS del texto, solo para
  las imágenes de las gráficas).
- **Aviso de rango grande:** `confirm()` si no hay Desde/Hasta fijado o si
  el rango supera 90 días, antes de leer — mismo criterio que "Ver TODO
  el histórico" (sección 66).
- **Helpers nuevos** (fuera de la función, reusables): `tonOfReg()`,
  `diasTrabajadosDe()`, `vueltasPorCamionDia()`, `agruparRegs()`,
  `agruparRegsPorMesVista()`, `armarAnalisisTexto()`, `fmtFechaLarga()`.
- **"Vueltas por camión" en Mes/Año (página 3):** a diferencia de Banco,
  aquí el universo de conteo es el propio grupo (mes o año), no todo el
  rango filtrado — un camión activo en marzo no debe mezclarse con sus
  viajes de abril. Se armó manual (no reusa `armarAnalisisTexto()` con un
  `universo` compartido) por esta diferencia de alcance.
- **Material sin "vueltas por camión":** se omite esa métrica en el
  párrafo de Material (un mismo camión suele cargar más de un material en
  el día, la cifra no aporta información clara ahí) — decisión de diseño,
  no viene de una pregunta explícita a Jesús; queda documentada por si la
  quiere de otra forma.
- **Extra (pedido aparte, mismo mensaje de Jesús):** la dona de Material
  (`renderDashboard()`, `porMaterial`) ya no incluye los pseudo-materiales
  "COLOCACION MARINA"/"COLOCACION TERRESTRE". Causa raíz encontrada: no
  eran del campo `por_material` (ese siempre usa el material real), sino
  de `por_combinacion` — que desde el fix del 22-jul-2026 (sección
  "Metas nunca mostraba avance...") guarda una ENTRADA ESPEJO por vertido
  de colocación para que Metas viera avance ahí. `calcularResumenGenericoAgregado()`
  (la usa Suministros/Gráficos) lee de `por_combinacion`, así que heredaba
  esa entrada espejo como si fuera un material más. El fix filtra esos 2
  valores literales al construir `porMaterial`, sin tocar `por_combinacion`
  ni Metas (que sigue necesitando esa entrada espejo tal cual).

**Explícitamente NO tocado:** `renderDashboard()` más allá del filtro de
`porMaterial` arriba, los filtros/slicers de la pestaña, las 4 gráficas en
pantalla, ni `por_combinacion`/Metas.

**Verificación antes de entregar (checklist 30.5):**
- 4 bloques `<script>` reales extraídos por posición exacta de
  apertura/cierre: `node --check` limpio en los 4.
- `grep` de IDs de DOM duplicados en todo el archivo: cero (sin IDs
  nuevos — se reusa `btn-graficos-pdf` que ya existía).
- Confirmado que los helpers nuevos y `descargarPdfGraficos()` viven en
  el mismo `<script>` normal donde ya viven `chartMaterial`/`chartBanco`/
  `chartBancoPie`/`chartMeses`/`renderDashboard()`/`nombreBanco()`/
  `nombreMaterial()`/`getMsSelected()`/`traerTodoFirestore` (vía
  `window.*`)/`guardarPdfDescarga()` — cero puentes nuevos necesarios.
- No se tocaron los 3 puntos de guardado de tickets (sección 1.1.5) —
  cambio de lectura/reporte, no de escritura.

**Pendiente de que Jesús pruebe en campo:**
1. Que el párrafo de análisis lea bien en letra 9pt en las 3 páginas
   (landscape carta) — si se ve muy apretado, se puede subir a 2 columnas
   o bajar el tamaño de las gráficas.
2. Que el aviso de "rango grande" no estorbe en el uso normal (rangos de
   un mes o menos no deberían disparar el aviso nunca).
3. Que los números de "vueltas por camión" cuadren con lo que Jesús
   espera ver en campo — es una métrica nueva, vale la pena que la
   revise con un caso real antes de repartir el PDF a Dirección.

---

## 89. 04-ago-2026 — Fix: "vueltas por camión al día" del PDF de Gráficos usaba la fórmula equivocada — CORREGIDO (promedio de promedios diarios, no total/total)

**Sesión:** Sonnet5-20260803-B (continuación).

**Primer intento (INCOMPLETO, corregido en la misma sesión):** Jesús
reportó que "vueltas por camión al día" salía con decimal y dijo que "no
puede ser así". El primer diagnóstico fue de FORMATO (redondear a entero
al mostrarlo, dejando el cálculo igual) — quedó registrado y aplicado,
pero Jesús aclaró que el problema real era la FÓRMULA, no el formato: con
la fórmula correcta el decimal es válido y esperado.

**Fórmula correcta (dada por Jesús con ejemplo numérico):** NO es
`total_viajes ÷ total_camiones_distintos ÷ total_días` (así estaba, y así
quedó cuando solo se redondeaba) — ese cálculo pesa distinto según cuántos
camiones trabajaron cada día (un día con muchos camiones diluye el
promedio de un día con pocos). Lo correcto es: **por cada día, promedio =
viajes de ese día ÷ camiones distintos de ese día; se suman esos
promedios diarios y se dividen entre el número de días.**

Ejemplo de Jesús (1-10 agosto): día 1 con 5 camiones e hicieron 2,3,2,3,3
viajes (13 viajes) → promedio del día = 13/5 = 2.6. Día 2 con 3 camiones
e hicieron 3,3,2 (8 viajes) → promedio = 8/3 ≈ 2.67. Así para cada día del
periodo, y al final: (2.6 + 2.67 + … días 3 a 10) ÷ número de días = el
resultado final, que sí puede (y debe) salir con decimal.

**Fix:** `vueltasPorCamionDia()` reescrita — agrupa los viajes de las
placas del grupo por `fecha1`, calcula el promedio diario
(viajes_del_día / camiones_distintos_del_día) y devuelve el promedio de
esos promedios diarios. El resto de la lógica no cambió: sigue
identificando camiones por placa completa, sigue contando TODOS los
viajes de esas placas dentro del `universo` filtrado (no solo los del
grupo puntual — pregunta 4 de la sección 88), y en Mes/Año sigue usando
como universo el propio grupo (no todo el rango — ver sección 88.2).

**Formato final:** "viajes por día" (total del grupo ÷ días, sin desglose
por camión) se queda en entero (`Math.round`) — no es la métrica que
Jesús corrigió, y su propio ejemplo también la usa sin decimal. "Vueltas
por camión al día" SÍ se muestra con 1 decimal ahora — dos formateadores
separados (`fmtV` para viajes, `fmtVueltas` para vueltas) en las 2 partes
del PDF que arman este texto (Banco/Material y Mes/Año).

**Nota de proceso:** al aplicar el primer fix (el de redondeo) un
`str_replace` borró por accidente una línea de código (`old_str` incluía
la línea pero `new_str` no la repitió) — se detectó al revisar el archivo
antes de correr `node --check` y se corrigió en el momento, antes de
entregar nada. Se documenta aquí porque es justo el tipo de error que la
verificación de la sección 30.5 existe para atrapar.

**Verificación:** `node --check` limpio en los 4 bloques `<script>`
reales; cero IDs de DOM duplicados (no se tocó HTML en esta entrega, solo
la función `vueltasPorCamionDia()` y los formateadores de las 2 llamadas
que arman el texto del PDF).

## 90. 04-ago-2026 — Gráficos (Suministros): 2 recuadros nuevos "Vueltas promedio" y "Camiones promedio por día" — CORREGIDO

**Sesión:** Sonnet5-20260804-A (nueva sesión, continúa la numeración de la bitácora subida).

Jesús pidió 2 recuadros nuevos junto a "Viajes (filtrados)"/"Toneladas
(filtradas)" en Suministros: "Vueltas promedio" y "Camiones promedio por
día" (camiones ÚNICOS por día — un camión con 2-3 viajes el mismo día
cuenta 1 sola vez ese día).

**Decisión de arquitectura, explícita antes de codear:** `renderDashboard()`
usa el agregado mensual barato (`calcularResumenGenericoAgregado`, sin
placas ni desglose diario) — a propósito, por todo el trabajo de costo de
las secciones 78-83. Estos 2 KPIs SÍ necesitan detalle placa-por-placa, que
solo existe leyendo `traerTodoFirestore()` (igual que ya resolvió el PDF de
este mismo tab, sección 88). Ponerlos a calcularse automático en cada
cambio de filtro habría reintroducido exactamente el problema de lecturas
caras ya cerrado. Se implementaron BAJO DEMANDA: botón nuevo "🔄 Calcular
vueltas y camiones promedio", mismo aviso que el PDF si el rango es >90
días o no está fijado. Los 2 recuadros se resetean a "—" cada vez que
cambian los filtros, para no dejar pegado un número de un filtro viejo.

**Fórmula usada (misma que ya corrigió Jesús para el PDF, sección 89):**
por cada día, promedio = viajes del día ÷ camiones distintos del día; se
promedian esos promedios diarios (no total÷total). "Camiones promedio por
día" usa el mismo agrupado por día, promediando camiones distintos del día
directamente (sin dividir entre viajes).

**Verificación:** `node --check` limpio en los 4 bloques, sin IDs
duplicados. No se tocó `vueltasPorCamionDia()` (la función ya corregida y
delicada de la sección 89) — se escribió una lógica de agrupado por día
independiente para no arriesgar esa función ya probada.
