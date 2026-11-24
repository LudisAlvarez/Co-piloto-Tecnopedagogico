# Co-piloto Tecnopedagógico · I.E. Los Garzones

Agente pedagógico para la planificación docente (ADDIE + TPACK), hecho con **Vue 3 + Vite + Nuxt UI**, con **Gemini** como motor de IA e inicio de sesión individual para cada docente.

## Estructura del proyecto

| Ruta | Qué contiene |
|---|---|
| `src/main.js` | Arranque de Vue, enrutador y Nuxt UI |
| `src/App.vue` | Raíz de la app (`UApp`) |
| `src/components/Tablero.vue` | Barra lateral y estructura del panel (`UDashboardGroup`, `UDashboardSidebar`) |
| `src/views/` | Una vista por sección: `Inicio` (presentación + ingreso), `Mesa`, `Copiloto`, `Planeaciones`, `Repositorio`, `Estrategias`, `Analisis`, `Exportar`, `Ayuda` |
| `src/store.js` | Estado compartido y acciones del agente |
| `src/lib/prompt.js` | **Prompt Maestro ROCAS v1.1** con los cuatro modelos explícitos (Tutor, Conocimiento, Alumno, Mundo). Lo usa el servidor para hablar con Gemini |
| `src/lib/bitacora.js` | Exporta a Excel la bitácora de decisiones, las recomendaciones y las fuentes consultadas |
| `src/components/Panel*.vue` | Pestañas del lienzo: Recomendaciones, Bitácora, Fuentes y Modelos |
| `src/lib/backend.js` | Conexión con Supabase y con el agente. Tiene un modo "claude" solo para el prototipo |
| `src/lib/repositorio.js` | Estrategias didácticas, búsqueda en el repositorio curricular y lectura de PDF/Word |
| `src/lib/exportar.js` | Exportación a Word y PDF |
| `src/lib/plantilla.js` | Plantilla de plan de clase del docente: detecta los campos del .docx y escribe la planeación en el archivo original |
| `src/main.css` | Tema visual (colores, tipografías) |
| `src/lib/orientaciones-ti.json` | Texto de las Orientaciones Curriculares de Tecnología e Informática (MEN), por página |
| `api/agente.js` | Función del servidor que llama a **Gemini**. La clave nunca llega al navegador |
| `api/clave.js` | Prueba la clave de Gemini de cada docente y la guarda en su cuenta |
| `api/_gemini.js` | Utilidades del servidor: sesión del docente, su clave y conexión con Gemini con modelos de respaldo |
| `api/config.js` | Entrega a la página los datos públicos de Supabase |
| `supabase.sql` | Crea las tablas `planeaciones`, `documentos`, `plantillas` y `claves` con seguridad por docente. Se puede ejecutar varias veces |

## Puesta en marcha

Cada docente usa **su propia clave gratuita de Gemini**: al entrar por primera vez, la aplicación le pide conectarla y le muestra cómo obtenerla en Google AI Studio. Por eso el proyecto no necesita una clave de Gemini propia ni tiene costo de IA.

### 1. Supabase (base de datos y cuentas, gratis)

1. Cree un proyecto en https://supabase.com.
2. En **SQL Editor**, pegue todo `supabase.sql` y pulse **Run**. Crea las tablas `planeaciones`, `documentos`, `plantillas` y `claves`, cada una con reglas para que cada docente vea solo lo suyo.
3. En **Project Settings → API**, copie la **Project URL** y la clave **anon public**.

### 2. Ingreso con Google

1. En https://console.cloud.google.com cree (o elija) un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre «Co-piloto Tecnopedagógico», su correo de soporte. Publíquela.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo *Aplicación web*.
   - En **URI de redireccionamiento autorizados** ponga: `https://SU-PROYECTO.supabase.co/auth/v1/callback` (Supabase le muestra esta dirección exacta en el paso siguiente).
4. Copie el **ID de cliente** y el **Secreto de cliente**.
5. En Supabase: **Authentication → Sign In / Providers → Google**, actívelo y pegue el ID y el secreto.

### 3. Vercel

1. Suba esta carpeta a un repositorio de GitHub (el `.gitignore` ya excluye `node_modules` y las carpetas compiladas).
2. En Vercel: **Add New → Project**, elija el repositorio y, antes de desplegar, en **Environment Variables** agregue:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_ANON_KEY` | clave `anon public` |
| `GEMINI_API_KEY` | opcional: clave de respaldo si un docente no tiene la suya. Déjela vacía para que cada uno use la propia |
| `GEMINI_MODEL` | opcional. Por defecto `gemini-flash-latest`; si falla, la app prueba `gemini-2.5-flash` y `gemini-flash-lite-latest` |

3. Pulse **Deploy** y copie el dominio que le da Vercel (por ejemplo `https://copiloto-garzones.vercel.app`).
4. En Supabase: **Authentication → URL Configuration**:
   - **Site URL**: el dominio de Vercel.
   - **Redirect URLs**: agregue el dominio de Vercel con `/**` al final (por ejemplo `https://copiloto-garzones.vercel.app/**`).

### 4. Probar

1. Abra el dominio. Pulse **Continuar con Google** (o cree una cuenta con correo).
2. Debe aparecer «Conecte su clave gratuita de Gemini». Siga los pasos, pegue la clave y pulse **Probar y conectar**.
3. Haga una planeación de prueba y descárguela en Word.

Si la pantalla de ingreso dice «La aplicación aún no está configurada», falta una variable de entorno o no se volvió a desplegar. Si Google devuelve un error de redirección, revise el paso 3 de Google y el paso 4 de Vercel.

**Registro con correo:** por defecto Supabase envía un correo de confirmación antes del primer ingreso. Para un piloto con pocos docentes puede desactivarlo en **Authentication → Sign In / Providers → Email → Confirm email**.

## Trabajar en el código

```bash
npm install
npm run dev            # interfaz en http://localhost:5173 (sin /api: el agente no responde)
npx vercel dev         # interfaz + funciones /api, con las variables de un archivo .env
npm run build          # versión para Vercel (carpeta dist)
npm run build:claude   # prototipo para publicar dentro de Claude (carpeta dist-claude)
npm run build:html     # un solo archivo HTML para abrir con doble clic (carpeta dist-html); pide una clave de Gemini
```

Para `vercel dev`, cree un archivo `.env` con las mismas variables de la tabla (no lo suba a GitHub).

## Los cuatro modelos, la bitácora y la trazabilidad

- **Modelo del Alumno:** la Mesa de trabajo tiene una «Ficha del grupo» con las variables del Documento 03 (conocimientos previos, capacidades, dificultades, necesidades de apoyo, familiaridad digital, evidencias). Sin datos personales.
- **Recomendaciones:** el agente entrega de 2 a 5 decisiones pedagógicas por turno (R1, R2…), cada una con justificación TPACK, valoración en las cinco dimensiones de pertinencia, la variable del grupo que la motiva, plan B sin conexión y las fuentes que la sustentan.
- **Bitácora:** el docente acepta, modifica o rechaza cada recomendación; la justificación es obligatoria al modificar o rechazar. «Aplicar decisiones al lienzo» le pide al agente ajustar la planeación, y la bitácora se envía en cada solicitud para que no vuelva a proponer lo rechazado.
- **Trazabilidad:** cada fragmento consultado recibe un identificador (F1, F2…). En la planeación aparecen marcas [R#] y [F#] que llevan a la recomendación o al fragmento exacto. Las marcas se quitan al exportar.
- **Pestaña Modelos:** muestra qué aportó cada uno de los cuatro modelos a la planeación y cómo dice el agente que los usó.
- **Excel:** la bitácora se descarga por planeación (Co-pilotaje o Exportar) o de todas las planeaciones (Mis planeaciones), con hojas de Bitácora, Recomendaciones, Fuentes consultadas e Información.

## Para el equipo investigador

- **Auditar conversaciones:** Supabase → **Table Editor → planeaciones**. La columna `datos` guarda coordenadas, conversación completa, planeación y versiones.
- **Docentes:** Supabase → **Authentication → Users**.
- **Cambiar el Prompt Maestro:** edite `src/lib/prompt.js`, haga commit y Vercel lo vuelve a desplegar. Registre versión, fecha y motivo, como pide el Documento 06.
- **Límites:** cada docente usa la cuota gratuita de su propia clave, con topes por minuto y por día. Si a un docente le aparece el aviso de límite, debe esperar o revisar su cuota en AI Studio.
- **Privacidad:** en la capa gratuita, Google puede usar lo que se envía para mejorar sus productos. La aplicación lo advierte al conectar la clave; insista en no escribir datos personales de estudiantes.

## Pruebas del Documento 06

1. Pedir una clase con realidad virtual: debe decir que no es viable y ofrecer una alternativa analógica.
2. Marcar "Sin internet" y pedir un ajuste que dependa de internet: debe dar la alternativa sin conexión.
3. Revisar que la tabla tenga las ocho columnas y las cinco fases ADDIE, y que cite páginas cuando la asignatura es Tecnología e Informática.
