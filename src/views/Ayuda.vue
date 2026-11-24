<script setup>
const pasos = [
  { title: 'Defina las coordenadas', description: 'En la Mesa de trabajo, escriba asignatura, grado y tema, y marque las condiciones reales de su aula.', icon: 'i-lucide-map-pin' },
  { title: 'Ajuste con el co-piloto', description: 'En Co-pilotaje, lea el borrador y pida cambios por chat o con los atajos. Con el clip puede adjuntar hasta 3 archivos (PDF, Word o texto), por ejemplo una planeación anterior o una guía, para que el co-piloto trabaje sobre ellos. En la pestaña Recomendaciones, acepte, modifique o rechace cada propuesta y deje su justificación. Use Editar para cambiar el texto usted mismo y Versión anterior para deshacer.', icon: 'i-lucide-messages-square' },
  { title: 'Lleve al aula', description: 'En Exportar, copie o descargue la planeación en Word o PDF.', icon: 'i-lucide-school' }
]
const preguntas = [
  { label: '¿Para qué sirve el Repositorio curricular?', content: 'Para que el co-piloto se apoye en documentos reales: trae las Orientaciones Curriculares de Tecnología e Informática del MEN y usted puede subir su plan de área, mallas o guías. Debajo de cada respuesta verá qué documento y qué páginas consultó.' },
  { label: '¿Cómo uso las Estrategias didácticas?', content: 'Elija una tarjeta y pulse «Planear con esta estrategia». La Mesa de trabajo se abre con esa estrategia seleccionada.' },
  { label: '¿Qué hace el Análisis curricular?', content: 'Revisa una planeación que usted ya tiene y le devuelve fortalezas, vacíos y sugerencias según las cinco dimensiones de pertinencia: utilidad, coherencia pedagógica, contextualización, usabilidad y viabilidad. No pone nota.' },
  { label: '¿Qué son los cuatro modelos del co-piloto?', content: 'Son las cuatro fuentes con las que el co-piloto arma cada propuesta. Tutor: cómo lo acompaña (propone, pregunta, no impone). Conocimiento: lo que sabe (TPACK, ADDIE, metodologías activas, cinco dimensiones de pertinencia y el repositorio curricular). Alumno: la ficha del grupo que usted describe. Mundo: las condiciones reales de su aula (conectividad, recursos, tiempo). En Co-pilotaje, la pestaña Modelos muestra qué aportó cada uno en su planeación.' },
  { label: '¿Cómo funciona la bitácora de decisiones?', content: 'Cada propuesta del co-piloto llega como una recomendación separada, con su justificación, su valoración de pertinencia y las fuentes que la sustentan. Usted la acepta, la modifica o la rechaza; si la modifica o la rechaza, escribe por qué. Con «Aplicar decisiones al lienzo», el co-piloto ajusta la planeación según lo que decidió y no vuelve a proponer lo rechazado. Todo queda en la pestaña Bitácora y se puede descargar en Excel.' },
  { label: '¿Cómo sé de dónde sale cada recomendación?', content: 'En la planeación verá marcas como R2 (la recomendación que se aplica ahí) y F1 (la fuente consultada). Al hacer clic, lo llevan a la recomendación o al fragmento exacto del documento que leyó el co-piloto, en la pestaña Fuentes. Las marcas no aparecen al exportar.' },
  { label: '¿Puedo exportar en la plantilla de mi institución?', content: 'Sí. En Exportar, suba una vez su formato de plan de clase en Word (.docx). El co-piloto busca los espacios para llenar (celdas vacías, campos que terminan en «:» y líneas ______) y, al pulsar «Descargar en mi plantilla», reparte allí la planeación conservando el diseño, tablas y logos. Los datos que la planeación no tiene, como fecha, sede o firma, quedan en blanco para que usted los complete. Si su formato está en PDF, ábralo en Word y guárdelo como .docx.' },
  { label: '¿Por qué me pide una clave de Gemini?', content: 'El co-piloto funciona con Gemini, la inteligencia artificial de Google. Cada docente conecta su propia clave de la capa gratuita de Google AI Studio, así el servicio no tiene costo. Se conecta una sola vez y queda guardada en su cuenta; puede cambiarla o quitarla desde el menú con su nombre → «Clave de Gemini».' },
  { label: '¿Qué no hace el co-piloto?', content: 'No reemplaza su criterio profesional, no evalúa estudiantes ni produce material para entregarles sin su mediación. Puede equivocarse: verifique los referentes curriculares con el plan de área de la institución. No escriba nombres ni datos personales de estudiantes.' }
]
</script>

<template>
  <UDashboardPanel id="ayuda">
    <template #header>
      <UDashboardNavbar title="Ayuda"><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar>
    </template>
    <template #body>
      <div class="max-w-3xl w-full mx-auto flex flex-col gap-8">
        <section>
          <h1 class="font-display text-4xl">Cómo usar el co-piloto</h1>
          <UTimeline :items="pasos" :default-value="2" class="mt-6" />
        </section>
        <section>
          <h2 class="font-semibold text-lg mb-2">Preguntas frecuentes</h2>
          <UAccordion :items="preguntas" />
        </section>
        <p class="text-xs font-mono text-muted">Proyecto de grado · Licenciatura en Informática · Universidad de Córdoba · Prompt Maestro ROCAS v1.0</p>
      </div>
    </template>
  </UDashboardPanel>
</template>
