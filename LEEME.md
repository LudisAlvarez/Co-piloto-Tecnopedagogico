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
| `api/registro.js` | Crea la cuenta de un docente si escribe el código de acceso |
| `api/config.js` | Entrega a la página los datos públicos de Supabase |
| `supabase.sql` | Crea las tablas `planeaciones`, `documentos` y `plantillas` con seguridad por docente. Si ya lo había ejecutado, ejecútelo de nuevo |

## Puesta en marcha

### 1. Supabase (cuentas y base de datos, gratis)

1. Cree un proyecto en https://supabase.com.
2. En **SQL Editor**, pegue todo `supabase.sql` y pulse **Run**.
3. En **Authentication**, desactive el registro público ("Allow new users to sign up"). Las cuentas se crean solo con el código de acceso.
4. En **Project Settings → API**, copie: Project URL, clave `anon` y clave `service_role` (secreta).

### 2. Gemini

En https://aistudio.google.com pulse **Get API key** y cree una clave.

### 3. Vercel

1. Suba esta carpeta a un repositorio de GitHub (sin `node_modules`, `dist` ni `dist-claude`; el `.gitignore` ya los excluye).
2. En Vercel: **Add New → Project**, elija el repositorio. Vercel detecta Vite solo (también está en `vercel.json`). Pulse **Deploy**.
3. En **Settings → Environment Variables** agregue:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_ANON_KEY` | clave `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | clave `service_role` |
| `GEMINI_API_KEY` | clave de Gemini |
| `CODIGO_ACCESO` | el código que le darán a los docentes, por ejemplo `GARZONES2026` |
| `GEMINI_MODEL` | opcional. Por defecto `gemini-flash-latest` |

4. **Deployments → Redeploy** para que tome las variables.

### 4. Probar

Abra el dominio de Vercel, cree una cuenta con el código de acceso, haga una planeación de prueba y descárguela en Word y PDF.

Si la pantalla de ingreso dice "La aplicación aún no está configurada", falta una variable de entorno o no se volvió a desplegar.

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
- **Límites:** la capa gratuita de Gemini tiene topes por minuto y por día. Si aparece el aviso de límite con varios docentes a la vez, revise la cuota en AI Studio.

## Pruebas del Documento 06

1. Pedir una clase con realidad virtual: debe decir que no es viable y ofrecer una alternativa analógica.
2. Marcar "Sin internet" y pedir un ajuste que dependa de internet: debe dar la alternativa sin conexión.
3. Revisar que la tabla tenga las ocho columnas y las cinco fases ADDIE, y que cite páginas cuando la asignatura es Tecnología e Informática.
