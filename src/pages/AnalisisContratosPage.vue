<template>
  <q-page class="analisis-page" :class="{ 'analisis-page--with-pdf': store.archivoAdjunto, 'analisis-page--trabajo': etapa === 'trabajo' }">

    <!-- Section header — se encoge y se atenúa al bajar en el chat, para
         devolverle espacio a la conversación sin perder el título del
         todo (ver onMessagesScroll). -->
    <!-- En la vista de trabajo el encabezado grande se oculta: el documento
         y el panel de análisis/chat usan todo el alto de la pantalla. -->
    <div v-show="etapa !== 'trabajo'" class="page-header" :class="{ 'page-header--compact': chatDesplazado }">
      <div class="section-icon-wrap icon-blue">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B352B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div>
        <h1 class="page-title">Análisis de Contratos</h1>
        <p class="page-subtitle">Sube un contrato en Word para revisar sus riesgos, editarlo y hacer preguntas sobre él</p>
      </div>
    </div>

    <!-- Selector de archivo compartido por los tres pasos -->
    <input
      ref="archivoInputRef"
      type="file"
      accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
      style="display:none"
      @change="onArchivoSeleccionado"
    />

    <!-- PASO 1: subir el contrato -->
    <div v-if="etapa === 'subir'" class="etapa-centro">
      <div
        class="subir-zona"
        :class="{ 'subir-zona--arrastrando': isDraggingFile, 'subir-zona--leyendo': procesandoArchivo }"
        role="button"
        tabindex="0"
        @click="!procesandoArchivo && abrirSelectorArchivo()"
        @keydown.enter.prevent="!procesandoArchivo && abrirSelectorArchivo()"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <template v-if="procesandoArchivo">
          <q-spinner-dots color="primary" size="36px" />
          <p class="subir-titulo">Leyendo el documento…</p>
          <p class="subir-sub">Los contratos largos pueden tardar unos segundos.</p>
        </template>
        <template v-else>
          <div class="subir-icono">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <path d="M17 8l-5-5-5 5"/>
              <path d="M12 3v12"/>
            </svg>
          </div>
          <p class="subir-titulo">Sube el contrato que quieres revisar</p>
          <p class="subir-sub">Arrástralo aquí o haz clic para elegirlo · Word (.docx), hasta 25 MB</p>
          <span class="subir-boton">Elegir archivo</span>
        </template>
      </div>
      <p v-if="errorAdjunto" class="adjunto-error etapa-error">{{ errorAdjunto }}</p>
    </div>

    <!-- PASO 2: ¿qué quieres hacer con el documento? (la IA aún no hizo nada) -->
    <div v-else-if="etapa === 'elegir' && store.archivoAdjunto" class="etapa-centro">
      <div class="elegir-tarjeta">
        <div class="elegir-archivo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
          <span class="elegir-archivo-nombre">{{ store.archivoAdjunto.nombre }}</span>
          <button type="button" class="elegir-cambiar" @click="quitarAdjunto">Cambiar archivo</button>
        </div>

        <h2 class="elegir-titulo">¿Qué quieres hacer con este documento?</h2>

        <div class="elegir-opciones">
          <button
            v-for="accion in ACCIONES_DOCUMENTO"
            :key="accion.id"
            type="button"
            class="elegir-opcion"
            :disabled="store.loading"
            @click="accion.id === 'riesgos' ? analizarRiesgos() : elegirAccion(accion.mensaje)"
          >
            <span class="elegir-opcion-titulo">{{ accion.titulo }}</span>
            <span class="elegir-opcion-desc">{{ accion.descripcion }}</span>
          </button>
        </div>

        <div class="elegir-pregunta">
          <span class="elegir-pregunta-label">O pregunta algo concreto</span>
          <div class="composer-pill">
            <q-input
              v-model="preguntaInicial"
              placeholder="Ej. ¿qué penalidades hay si me retraso en el pago?"
              type="textarea"
              autogrow
              borderless
              :disable="store.loading"
              :max-height="120"
              class="composer-textarea-pill"
              hide-bottom-space
              @keydown.enter.exact.prevent="elegirAccion(preguntaInicial)"
            />
            <button
              class="ask-btn-round"
              :disabled="store.loading || !preguntaInicial.trim()"
              title="Preguntar"
              @click="elegirAccion(preguntaInicial)"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PASO 3: trabajo — documento a la izquierda; a la derecha un solo
         panel con pestañas (Análisis / Chat), para no tener tres columnas
         apretadas ni el análisis repetido en el chat. -->
    <div v-else class="analisis-layout analisis-layout--split">

    <!-- Documento: previsualización tipo Word, con cambios en amarillo y
         riesgos en rojo marcados directamente sobre el texto. Aparece al
         adjuntar un documento, al lado del chat. -->
    <div v-if="store.archivoAdjunto" class="documento-panel">
      <div class="documento-panel-header">
        <div class="documento-panel-titulo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
          </svg>
          {{ store.archivoAdjunto?.nombre }}
        </div>

        <div class="documento-panel-acciones">
          <!-- Solo para PDF: para Word no hace falta elegir vista — el
               documento ya se ve con su estructura real y se edita ahí
               mismo. "Vista original" (render pixel-exacto) solo tiene
               sentido para PDF, que sí pierde estructura al extraerse a
               texto plano. -->
          <div v-if="!esWordAdjunto" class="documento-tabs">
            <button
              type="button"
              class="documento-tab"
              :class="{ 'documento-tab--active': tabDocumento === 'original' }"
              @click="tabDocumento = 'original'"
            >
              Vista original
            </button>
            <button
              type="button"
              class="documento-tab"
              :class="{ 'documento-tab--active': tabDocumento === 'editando' }"
              @click="tabDocumento = 'editando'"
            >
              Editando
            </button>
            <button
              type="button"
              class="documento-tab"
              :class="{ 'documento-tab--active': tabDocumento === 'final' }"
              @click="tabDocumento = 'final'"
            >
              Documento final
            </button>
          </div>

          <button type="button" class="documento-descargar" :disabled="descargandoDocumento" @click="descargarDocumento">
            <q-spinner v-if="descargandoDocumento" size="14px" />
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <path d="M7 10l5 5 5-5"/>
              <path d="M12 15V3"/>
            </svg>
            {{ esWordAdjunto ? 'Descargar Word' : 'Descargar documento' }}
          </button>
        </div>
      </div>
      <!-- Avisos de edición/descarga del Word (qué se aplicó, qué no). -->
      <p v-if="avisoEditor" class="documento-aviso documento-aviso--editor">{{ avisoEditor }}</p>
      <p v-else-if="avisoDescarga" class="documento-aviso">{{ avisoDescarga }}</p>
      <p v-else-if="esWordAdjunto" class="documento-aviso documento-aviso--ayuda">
        Puedes editar el texto directamente aquí. Al descargar, tus cambios se aplican sobre tu Word original y se conserva todo su formato.
      </p>
      <div class="documento-panel-body">
        <!-- Word: panel único, sin pestañas — el documento ya se ve con su
             estructura real (mammoth conserva negritas/listas/tablas), con
             las marcas de sugerencia superpuestas, y es editable ahí mismo
             (solo el texto de cada párrafo: ver onBeforeInputDocumento). -->
        <template v-if="esWordAdjunto">
          <div v-if="cargandoVistaWord" class="documento-cargando">
            <q-spinner-dots color="primary" size="34px" />
            <p>Cargando documento…</p>
          </div>
          <!-- Vista fiel del Word (docx-preview): sin fuentes ni tamaños
               propios de la app, se ve con los del documento. -->
          <div class="documento-word-zoom" :style="{ zoom: zoomDocumento }">
            <div
              ref="documentoEditableRef"
              class="documento-word"
              contenteditable="true"
              spellcheck="false"
              @beforeinput="onBeforeInputDocumento"
              @paste="onPasteDocumento"
              @drop.prevent
              @input="onDocumentoInput"
              @blur="onDocumentoBlur"
              @click="onDocumentoClick"
            ></div>
          </div>
        </template>

        <!-- PDF: mantiene las 3 pestañas — acá sí hace falta distinguir la
             vista pixel-exacta del original (canvas de pdf.js) de la vista
             editable, porque la extracción a texto plano sí pierde
             estructura. -->
        <template v-else>
          <div v-if="tabDocumento === 'original'" class="documento-original">
            <div v-if="cargandoOriginal" class="pdf-panel-status">
              <q-spinner-dots color="primary" size="36px" />
              <p>Cargando vista original…</p>
            </div>
            <div v-else-if="errorOriginal" class="pdf-panel-status">
              <p>{{ errorOriginal }}</p>
            </div>
            <template v-else>
              <div class="documento-original-canvas-wrap">
                <canvas ref="pdfCanvasRef"></canvas>
              </div>
              <div v-if="totalPaginasOriginal > 1" class="documento-original-nav">
                <button type="button" class="pdf-nav-btn" :disabled="paginaOriginal <= 1" @click="paginaOriginalAnterior">‹</button>
                <span>Página {{ paginaOriginal }} de {{ totalPaginasOriginal }}</span>
                <button type="button" class="pdf-nav-btn" :disabled="paginaOriginal >= totalPaginasOriginal" @click="paginaOriginalSiguiente">›</button>
              </div>
            </template>
          </div>

          <template v-else>
            <div class="documento-page">
              <!-- Editando: editable, con marcas de cambios/riesgos visibles -->
              <div
                v-show="tabDocumento === 'editando'"
                ref="documentoEditableRef"
                class="documento-texto documento-texto--editable"
                contenteditable="true"
                @input="onDocumentoInput"
                @blur="onDocumentoBlur"
                @click="onDocumentoClick"
              ></div>
              <!-- Documento final: solo lectura, sin marcas -->
              <div
                v-if="tabDocumento === 'final'"
                class="documento-texto"
                v-html="documentoFinalHtml"
              ></div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <div class="panel-derecho">
      <div class="panel-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="panel-tab"
          :class="{ 'panel-tab--activa': vistaDerecha === 'analisis' }"
          :aria-selected="vistaDerecha === 'analisis'"
          @click="vistaDerecha = 'analisis'"
        >
          Análisis de riesgos
          <span v-if="cargandoSugerencias" class="panel-tab-estado">…</span>
          <span v-else-if="sugerencias.length" class="panel-tab-cuenta">{{ sugerencias.length }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="panel-tab"
          :class="{ 'panel-tab--activa': vistaDerecha === 'chat' }"
          :aria-selected="vistaDerecha === 'chat'"
          @click="vistaDerecha = 'chat'"
        >
          Chat
        </button>
      </div>

      <!-- Pestaña Análisis -->
      <div v-show="vistaDerecha === 'analisis'" class="panel-contenido">
        <!-- Sugerencias: solo lectura — el análisis de riesgos de la IA. Aplicar
             cambios reales ahora se hace en Word (ver el CTA arriba), no acá.
             La lógica de aplicar/descartar/deshacer sigue existiendo en el
             script (aplicarSugerencia, descartarSugerencia, deshacerSugerencia,
             reconsiderarSugerencia, sugerenciasAplicadas, sugerenciasDescartadas)
             por si se vuelve a necesitar — solo dejó de usarse desde esta vista. -->
        <div v-if="cargandoSugerencias || sugerencias.length || sugerenciasAplicadas.length || errorSugerencias" class="sugerencias-rail">

          <div class="sugerencias-rail-header">Sugerencias</div>

          <div class="sugerencias-rail-body">
            <div v-if="cargandoSugerencias" class="sugerencias-cargando">
              <q-spinner-dots color="primary" size="28px" />
              <p class="sugerencias-cargando-titulo">Analizando el contrato</p>
              <p class="sugerencias-cargando-sub">LexIT está revisando las cláusulas y evaluando riesgos…</p>
              <p v-if="(store.archivoAdjunto?.texto.length ?? 0) > 30000" class="sugerencias-cargando-sub">
                Es un contrato largo: se revisa por partes y puede tardar un par de minutos.
              </p>
            </div>
            <div v-else-if="errorSugerencias" class="sugerencias-error-state">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p class="sugerencias-error-titulo">No se pudo generar el análisis</p>
              <p class="sugerencias-error-sub">{{ errorSugerencias }}</p>
              <button type="button" class="sugerencias-reintentar-btn" @click="generarSugerencias">Reintentar</button>
            </div>
            <template v-else>
              <!-- Cada bloque filtra la lista por ese nivel; "Total" muestra todas. -->
              <div class="sugerencias-metricas">
                <button
                  type="button"
                  class="metrica-bloque"
                  :class="{ 'metrica-bloque--activo': filtroNivel === null }"
                  :aria-pressed="filtroNivel === null"
                  @click="filtroNivel = null"
                >
                  <span class="metrica-numero">{{ conteoSugerencias.total }}</span>
                  <span class="metrica-label">Total</span>
                </button>
                <button
                  v-for="nivel in NIVELES_RIESGO"
                  :key="nivel.valor"
                  type="button"
                  class="metrica-bloque"
                  :class="[`metrica-bloque--${nivel.valor}`, { 'metrica-bloque--activo': filtroNivel === nivel.valor }]"
                  :aria-pressed="filtroNivel === nivel.valor"
                  @click="filtroNivel = filtroNivel === nivel.valor ? null : nivel.valor"
                >
                  <span class="metrica-numero">{{ conteoSugerencias[nivel.valor] }}</span>
                  <span class="metrica-label">{{ nivel.etiqueta }}</span>
                </button>
              </div>

              <p v-if="filtroNivel && sugerenciasVisibles.length === 0" class="sugerencias-filtro-vacio">
                No hay observaciones de riesgo {{ filtroNivel }}.
                <button type="button" class="sugerencias-filtro-quitar" @click="filtroNivel = null">Ver todas</button>
              </p>

              <div class="sugerencias-list">
                <div v-for="s in sugerenciasVisibles" :id="`sugerencia-${s.id}`" :key="s.id" class="sugerencia-card">
                  <div class="sugerencia-card-top">
                    <div class="sugerencia-clausula">{{ s.clausula }}</div>
                    <span class="riesgo-badge" :class="s.nivel ? `riesgo-badge--${s.nivel}` : 'riesgo-badge--cambio'">
                      {{ s.nivel ? `Riesgo ${s.nivel}` : 'Cambio sugerido' }}
                    </span>
                  </div>

                  <p class="sugerencia-explicacion">
                    <strong>{{ s.tipo === 'riesgo' ? 'Por qué es riesgosa:' : 'Por qué se sugiere:' }}</strong>
                    {{ s.explicacion }}
                  </p>

                  <p v-if="s.textoSugerido" class="sugerencia-nuevo">
                    <strong>Así se podría redactar mejor:</strong> {{ s.textoSugerido }}
                  </p>

                  <p class="sugerencia-original">
                    <strong>Texto actual:</strong> &ldquo;{{ s.textoOriginal }}&rdquo;
                  </p>

                  <!-- Base legal de la base jurídica: solo cuando un artículo
                       sustenta directamente la sugerencia; se abre con un clic. -->
                  <details v-if="s.baseLegal" class="sugerencia-base">
                    <summary>
                      <span class="sugerencia-base-etiqueta">Base legal</span>
                      {{ s.baseLegal.documento }}<template v-if="s.baseLegal.articulo !== undefined"> · Art. {{ s.baseLegal.articulo }}°{{ s.baseLegal.sufijo ? `-${s.baseLegal.sufijo}` : '' }}</template>
                    </summary>
                    <p class="sugerencia-base-texto">&ldquo;{{ s.baseLegal.texto }}&rdquo;</p>
                  </details>

                  <!-- Aplica el texto sugerido en el documento; al descargar,
                       entra al Word original como cualquier otra edición. -->
                  <p v-if="s.error" class="sugerencia-error">{{ s.error }}</p>
                  <p v-if="observacionNoUbicada === s.id" class="sugerencia-error">
                    No se encontró este texto en el documento (puede que ya haya cambiado).
                  </p>
                  <div class="sugerencia-acciones">
                    <!-- Lleva al lugar del documento donde está la observación. -->
                    <button type="button" class="sugerencia-ver" @click="verObservacion(s)">Ver observación</button>
                    <button v-if="s.textoSugerido && esWordAdjunto" type="button" class="sugerencia-aplicar" @click="aplicarSugerencia(s)">Aplicar al documento</button>
                  </div>
                </div>
              </div>

              <div v-if="sugerenciasAplicadas.length" class="sugerencias-aplicadas">
                <p class="sugerencias-aplicadas-titulo">Aplicadas al documento ({{ sugerenciasAplicadas.length }})</p>
                <div v-for="s in sugerenciasAplicadas" :key="s.id" class="sugerencia-aplicada-fila">
                  <span class="sugerencia-aplicada-texto">✓ {{ s.clausula }}</span>
                  <button type="button" class="sugerencia-deshacer" @click="deshacerSugerencia(s)">Deshacer</button>
                  <p v-if="s.error" class="sugerencia-error">{{ s.error }}</p>
                </div>
              </div>
            </template>
          </div>
        </div>
        <div v-if="!cargandoSugerencias && !sugerencias.length && !sugerenciasAplicadas.length && !errorSugerencias" class="analisis-vacio">
          <p class="analisis-vacio-titulo">Aún no hay un análisis de riesgos</p>
          <p class="analisis-vacio-sub">Revisa cada cláusula del contrato y marca las riesgosas.</p>
          <button type="button" class="subir-boton analisis-vacio-btn" @click="analizarRiesgos">Analizar riesgos</button>
        </div>
      </div>

      <!-- Pestaña Chat -->
      <div v-show="vistaDerecha === 'chat'" class="panel-contenido">
        <!-- Chat wrapper -->
        <div
          class="chat-wrapper"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >

          <!-- Overlay al arrastrar un archivo -->
          <div v-if="isDraggingFile" class="drop-overlay">
            <div class="drop-overlay-content">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <path d="M17 8l-5-5-5 5"/>
                <path d="M12 3v12"/>
              </svg>
              <p>Suelta tu Word (.docx) aquí</p>
            </div>
          </div>

          <!-- Messages area -->
          <div class="messages-area" ref="messagesBox" @scroll="onMessagesScroll">
            <div v-for="(mensaje, index) in mensajes" :key="index" class="message-wrapper">

              <!-- AI message: bloque de texto simple, sin avatar ni burbuja -->
              <div v-if="mensaje.esIA" class="msg-block msg-block--ai">
                <div class="msg-meta msg-meta--ai">LEXIT AI · {{ formatTimestamp(mensaje.timestamp) }}</div>

                <!-- Mientras llega el primer trozo del stream, puntos de "escribiendo" -->
                <div v-if="!mensaje.contenido && store.loading && index === mensajes.length - 1" class="typing-dots">
                  <span></span><span></span><span></span>
                </div>
                <template v-else>
                  <div
                    class="msg-content formatted-message"
                    v-html="formatMessage(mensaje.contenido, mensaje.fuentes?.length ?? 0)"
                    @click="onClickEnRespuesta($event, index)"
                  ></div>
                  <div v-if="mensaje.referencias?.length" class="msg-refs">
                    <strong>Referencias:</strong>
                    <div v-for="(ref, idx) in mensaje.referencias" :key="idx" class="q-mt-xs">{{ ref }}</div>
                  </div>

                  <!-- Fuentes citadas de Pinecone (siempre visibles) -->
                  <div v-if="mensaje.fuentes?.length" class="fuentes-block">
                    <div class="fuentes-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <path d="M14 2v6h6"/>
                      </svg>
                      <span>Basado en {{ mensaje.fuentes.length }} fuente(s) de la base de datos jurídica</span>
                    </div>

                    <!-- Cada cita es un cuadro pequeño y cerrado; el texto solo
                         se muestra al hacer clic (en el cuadro o en su [n]
                         dentro de la respuesta), una cita abierta a la vez. -->
                    <div class="fuentes-chips">
                      <button
                        v-for="(fuente, fi) in mensaje.fuentes"
                        :key="fi"
                        type="button"
                        class="fuente-chip"
                        :class="{ 'fuente-chip--abierta': citaAbierta[index] === fi }"
                        :aria-expanded="citaAbierta[index] === fi"
                        @click="alternarCita(index, fi)"
                      >
                        <span class="fuente-chip-num">{{ fi + 1 }}</span>
                        <span class="fuente-chip-nombre">
                          {{ fuente.nombreDocumento || 'Documento' }}<template v-if="fuente.numeroArticulo"> · Art. {{ fuente.numeroArticulo }}°{{ fuente.sufijoArticulo ? `-${fuente.sufijoArticulo}` : '' }}</template>
                        </span>
                      </button>
                    </div>

                    <Transition name="cita">
                      <div
                        v-if="citaAbierta[index] !== undefined && mensaje.fuentes[citaAbierta[index]!]"
                        :key="citaAbierta[index]"
                        class="fuente-detalle"
                      >
                        <div class="fuente-detalle-cabecera">
                          <span class="fuente-doc-name">
                            [{{ citaAbierta[index]! + 1 }}] {{ mensaje.fuentes[citaAbierta[index]!]!.nombreDocumento || 'Documento' }}<template v-if="mensaje.fuentes[citaAbierta[index]!]!.numeroArticulo"> · Artículo {{ mensaje.fuentes[citaAbierta[index]!]!.numeroArticulo }}°{{ mensaje.fuentes[citaAbierta[index]!]!.sufijoArticulo ? `-${mensaje.fuentes[citaAbierta[index]!]!.sufijoArticulo}` : '' }}</template>
                          </span>
                          <button type="button" class="fuente-detalle-cerrar" aria-label="Cerrar cita" @click="cerrarCita(index)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                        <p class="fuente-texto">&ldquo;{{ mensaje.fuentes[citaAbierta[index]!]!.texto }}&rdquo;</p>
                      </div>
                    </Transition>
                  </div>

                  <div class="msg-actions">
                    <button type="button" class="msg-action-btn" title="Copiar" @click="copiarMensaje(mensaje.contenido, index)">
                      <svg v-if="copiedIndex !== index" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </button>
                  </div>
                </template>
              </div>

              <!-- User message: burbuja alineada a la derecha -->
              <div v-else class="msg-block msg-block--user">
                <div class="msg-bubble-user">{{ mensaje.contenido }}</div>
              </div>

            </div>
          </div>

          <!-- Input area -->
          <div class="input-area">

            <!-- Archivo adjunto -->
            <div v-if="store.archivoAdjunto" class="composer-chip-row">
              <span class="composer-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                {{ store.archivoAdjunto.nombre }}
                <button type="button" class="composer-chip-remove" aria-label="Quitar archivo adjunto" @click="quitarAdjunto">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </span>
              <button type="button" class="composer-reanalizar" :disabled="store.loading" @click="volverAAnalizar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Volver a analizar
              </button>
            </div>
            <p v-if="procesandoArchivo" class="adjunto-extrayendo">Leyendo documento…</p>
            <p v-if="errorAdjunto" class="adjunto-error">{{ errorAdjunto }}</p>

            <div class="composer-pill">
              <button
                type="button"
                class="plus-btn"
                :disabled="store.loading || procesandoArchivo"
                title="Cambiar documento Word"
                @click="abrirSelectorArchivo"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>

              <q-input
                v-model="pregunta"
                placeholder="Pregunta algo sobre el contrato..."
                type="textarea"
                autogrow
                borderless
                :disable="store.loading"
                :max-height="160"
                class="composer-textarea-pill"
                hide-bottom-space
                @keydown.enter.exact.prevent="enviarConsulta"
              />

              <button
                class="ask-btn-round"
                :disabled="store.loading || (!pregunta.trim() && !store.archivoAdjunto)"
                title="Preguntar"
                @click="enviarConsulta"
              >
                <svg v-if="!store.loading" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
                </svg>
                <q-spinner v-else size="16px" color="white" />
              </button>
            </div>

            <div v-if="store.error" class="error-row">
              <q-icon name="error" color="negative" size="18px" />
              <span class="error-text">{{ store.error }}</span>
            </div>
          </div>

        </div>
      </div>
    </div>

    </div>

  </q-page>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAnalisisContratosStore, esSolicitudDeAnalisisDeRiesgos } from '../stores/analisis-contratos-store'
import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'
import { extraerTextoPDF } from '../utils/pdfExtractor'
import { renderizarWord } from '../utils/vistaWord'
import { sugerirCambiosContrato, type SugerenciaCambio } from '../services/geminiService'
import { exportToWord } from '../utils/documentExport'
import { resaltarEnHtml, quitarMarcasSugerencia } from '../utils/htmlTexto'
import { calcularCambios } from '../utils/edicionWord'
import { subirDocumentoTemporal, descargarWordEditado } from '../services/documentosTemporalesService'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'

const store = useAnalisisContratosStore()
const authStore = useAuthStore()
const pregunta = ref('')

const { mensajes } = storeToRefs(store)
const messagesBox = ref<HTMLElement | null>(null)

// Puramente visual: encoge/atenúa el encabezado mientras se baja en el
// chat, para devolverle espacio a la conversación (ver .page-header--compact).
const chatDesplazado = ref(false)

function onMessagesScroll(event: Event) {
  chatDesplazado.value = (event.target as HTMLElement).scrollTop > 16
}

const copiedIndex = ref<number | null>(null)

async function copiarMensaje(texto: string, index: number) {
  try {
    await navigator.clipboard.writeText(texto)
    copiedIndex.value = index
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null
    }, 1500)
  } catch (err) {
    console.error('No se pudo copiar:', err)
  }
}

// ✅ Adjuntar PDF al chat (privado de esta conversación, nunca se indexa
// en Pinecone — ver analisis-contratos-store.ts)
const archivoInputRef = ref<HTMLInputElement | null>(null)
const procesandoArchivo = ref(false)
const errorAdjunto = ref('')

// Se incrementa en cada intento de extracción y al desmontar, para poder
// descartar el resultado de una extracción en curso si el usuario
// selecciona otro archivo antes de que termine, o si sale de la página.
let intentoExtraccion = 0

interface SugerenciaConError extends SugerenciaCambio {
  error?: string | undefined
  // Foto del contenido del documento (html si es Word, texto si es PDF)
  // justo antes y justo después de aplicar esta sugerencia — red de
  // seguridad para Deshacer cuando la búsqueda de textoSugerido falla
  // (ver deshacerSugerencia).
  contenidoAntesDeAplicar?: string | undefined
  contenidoDespuesDeAplicar?: string | undefined
}

const sugerencias = ref<SugerenciaConError[]>([])
const sugerenciasAplicadas = ref<SugerenciaConError[]>([])
const sugerenciasDescartadas = ref<SugerenciaConError[]>([])
const cargandoSugerencias = ref(false)
const errorSugerencias = ref('')

// Sin consumidor actualmente — se deja sin usar en vez de borrarlo por si
// se vuelve a necesitar.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mostrandoAnalisisRiesgos = computed(() =>
  cargandoSugerencias.value || sugerencias.value.length > 0 || !!errorSugerencias.value
)

// Franja de métricas del panel de sugerencias (solo lectura) — cuenta por
// nivel de riesgo; las de tipo "cambio" (sin nivel) solo suman al total.
const conteoSugerencias = computed(() => {
  let alto = 0
  let medio = 0
  let bajo = 0
  for (const s of sugerencias.value) {
    if (s.nivel === 'alto') alto++
    else if (s.nivel === 'medio') medio++
    else if (s.nivel === 'bajo') bajo++
  }
  return { total: sugerencias.value.length, alto, medio, bajo }
})

// Filtro por nivel al hacer clic en las métricas (null = todas). Solo
// cambia qué tarjetas se listan; las marcas del documento siguen todas.
type NivelRiesgo = 'alto' | 'medio' | 'bajo'
const NIVELES_RIESGO: { valor: NivelRiesgo; etiqueta: string }[] = [
  { valor: 'alto', etiqueta: 'Alto' },
  { valor: 'medio', etiqueta: 'Medio' },
  { valor: 'bajo', etiqueta: 'Bajo' }
]
const filtroNivel = ref<NivelRiesgo | null>(null)
const sugerenciasVisibles = computed(() =>
  filtroNivel.value ? sugerencias.value.filter(s => s.nivel === filtroNivel.value) : sugerencias.value
)

// "Ver observación": lleva al lugar del documento donde está marcada la
// observación (<mark data-sugerencia-id>) y la hace destacar un momento.
const observacionNoUbicada = ref<string | null>(null)
let temporizadorObservacion: ReturnType<typeof setTimeout> | null = null

async function verObservacion(s: SugerenciaConError) {
  observacionNoUbicada.value = null
  // PDF: las marcas solo se ven en la pestaña "editando".
  if (!esWordAdjunto.value && tabDocumento.value !== 'editando') {
    tabDocumento.value = 'editando'
    await nextTick()
  }
  const marca = documentoEditableRef.value?.querySelector<HTMLElement>(`[data-sugerencia-id="${CSS.escape(s.id)}"]`)
  if (!marca) {
    observacionNoUbicada.value = s.id
    return
  }
  marca.scrollIntoView({ behavior: 'smooth', block: 'center' })
  documentoEditableRef.value?.querySelectorAll('.hl-foco').forEach(m => m.classList.remove('hl-foco'))
  marca.classList.add('hl-foco')
  if (temporizadorObservacion) clearTimeout(temporizadorObservacion)
  temporizadorObservacion = setTimeout(() => marca.classList.remove('hl-foco'), 2400)
}

function limpiarSugerencias() {
  sugerencias.value = []
  sugerenciasAplicadas.value = []
  sugerenciasDescartadas.value = []
  errorSugerencias.value = ''
}

// Se llama al adjuntar un documento nuevo o al quitar el actual, para que
// una edición sin guardar de un documento anterior no quede "colgada"
// bloqueando el refresco del panel (ver watch(documentoHtml) más abajo).
function reiniciarEdicion() {
  if (debounceEdicionId !== null) {
    clearTimeout(debounceEdicionId)
    debounceEdicionId = null
  }
  editandoActivamente = false
  htmlGuardadoDesdeEditor = null
  cargandoVistaWord.value = false
  tabDocumento.value = 'original'
  limpiarVistaOriginal()
  archivoWordOriginalRef.value = null
}

async function generarSugerencias() {
  if (!store.archivoAdjunto) return
  flushEdicionPendiente()
  cargandoSugerencias.value = true
  errorSugerencias.value = ''
  try {
    sugerencias.value = await sugerirCambiosContrato(store.archivoAdjunto.texto)
  } catch (err) {
    errorSugerencias.value = 'No se pudieron generar las sugerencias. Intenta de nuevo.'
    console.error('Error generando sugerencias:', err)
  } finally {
    cargandoSugerencias.value = false
  }
}

// descartarSugerencia/reconsiderarSugerencia/aplicarSugerencia/
// deshacerSugerencia: el panel de Sugerencias pasó a ser de solo lectura
// (ver la vista en el template) — esta lógica de aplicar/descartar en el
// navegador se deja intacta y sin usar, no se borra, por si se vuelve a
// necesitar más adelante.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function descartarSugerencia(id: string) {
  const s = sugerencias.value.find(item => item.id === id)
  if (!s) return
  sugerencias.value = sugerencias.value.filter(item => item.id !== id)
  sugerenciasDescartadas.value = [...sugerenciasDescartadas.value, s]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function reconsiderarSugerencia(id: string) {
  const s = sugerenciasDescartadas.value.find(item => item.id === id)
  if (!s) return
  sugerenciasDescartadas.value = sugerenciasDescartadas.value.filter(item => item.id !== id)
  s.error = undefined
  sugerencias.value = [...sugerencias.value, s]
}

function aplicarSugerencia(s: SugerenciaConError) {
  flushEdicionPendiente()
  const adjuntoAntes = store.archivoAdjunto
  const contenidoAntes = adjuntoAntes ? (adjuntoAntes.html ?? adjuntoAntes.texto) : undefined
  const aplicado = store.aplicarCambioEnAdjunto(s.textoOriginal, s.textoSugerido)
  if (aplicado) {
    s.error = undefined
    const adjuntoDespues = store.archivoAdjunto
    s.contenidoAntesDeAplicar = contenidoAntes
    s.contenidoDespuesDeAplicar = adjuntoDespues ? (adjuntoDespues.html ?? adjuntoDespues.texto) : undefined
    sugerencias.value = sugerencias.value.filter(item => item.id !== s.id)
    sugerenciasAplicadas.value = [...sugerenciasAplicadas.value, s]
  } else {
    s.error = 'No se pudo ubicar este texto exacto en el documento (puede que ya haya cambiado).'
  }
}

// Reusa aplicarCambioEnAdjunto con los argumentos invertidos: busca el
// texto que quedó aplicado (textoSugerido) y lo vuelve al original — es
// la misma operación, en sentido contrario, sin necesitar una acción
// nueva en el store (sirve igual para el camino Word/HTML y PDF/texto
// plano, que aplicarCambioEnAdjunto ya bifurca internamente).
//
// Red de seguridad: si esa búsqueda por texto no encuentra nada (por
// ejemplo, porque el HTML pasó por una normalización del navegador que
// alteró algún detalle invisible entre aplicar y deshacer), pero el
// documento sigue exactamente como quedó justo después de aplicar ESTA
// sugerencia (nada más lo tocó desde entonces), se restaura directamente
// la foto guardada en aplicarSugerencia — sin depender de encontrar el
// fragmento como string.
function deshacerSugerencia(s: SugerenciaConError) {
  flushEdicionPendiente()

  function marcarComoDeshecha() {
    s.error = undefined
    sugerenciasAplicadas.value = sugerenciasAplicadas.value.filter(item => item.id !== s.id)
    sugerencias.value = [...sugerencias.value, s]
  }

  if (store.aplicarCambioEnAdjunto(s.textoSugerido, s.textoOriginal)) {
    marcarComoDeshecha()
    return
  }

  const adjunto = store.archivoAdjunto
  const contenidoActual = adjunto ? (adjunto.html ?? adjunto.texto) : undefined
  const puedeRestaurar = adjunto && s.contenidoAntesDeAplicar !== undefined && contenidoActual === s.contenidoDespuesDeAplicar
  if (puedeRestaurar) {
    if (adjunto.html) {
      store.actualizarHtmlAdjunto(s.contenidoAntesDeAplicar!)
    } else {
      store.actualizarTextoAdjunto(s.contenidoAntesDeAplicar!)
    }
    marcarComoDeshecha()
    return
  }

  s.error = 'No se pudo deshacer: el texto aplicado ya no está tal cual en el documento (puede que lo hayas editado después).'
}

// Marca sobre el texto del documento: cada sugerencia pendiente se resalta
// en su posición real dentro de store.archivoAdjunto.texto — amarillo para
// "cambio", rojo (por nivel) para "riesgo". Sin solapes: si dos anotaciones
// caen sobre el mismo tramo, se queda la primera.
function escapeHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface Tramo { inicio: number; fin: number; sugerencia: SugerenciaConError }

// Convierte el texto plano del documento en el HTML que se muestra —
// opcionalmente con marcas de cambio/riesgo resaltadas — con párrafos
// reales (como un documento de Word) en vez de un bloque corrido. La usan
// tanto la vista "Editando" (con marcas) como "Documento final" y la
// exportación a Word (ambas sin marcas, tramos: []), así las tres siempre
// muestran/exportan exactamente lo mismo.
function textoAHtmlConMarcas(texto: string, tramosSugerencias: SugerenciaConError[]): string {
  if (!texto) return ''

  const tramos: Tramo[] = []
  for (const s of tramosSugerencias) {
    if (!s.textoOriginal) continue
    const inicio = texto.indexOf(s.textoOriginal)
    if (inicio === -1) continue
    const fin = inicio + s.textoOriginal.length
    const solapa = tramos.some(t => inicio < t.fin && fin > t.inicio)
    if (!solapa) tramos.push({ inicio, fin, sugerencia: s })
  }
  tramos.sort((a, b) => a.inicio - b.inicio)

  let html = ''
  let cursor = 0
  for (const tramo of tramos) {
    html += escapeHtml(texto.slice(cursor, tramo.inicio))
    const clase = tramo.sugerencia.tipo === 'riesgo'
      ? `hl-riesgo hl-riesgo--${tramo.sugerencia.nivel ?? 'medio'}`
      : 'hl-cambio'
    html += `<mark class="${clase}" data-sugerencia-id="${tramo.sugerencia.id}">${escapeHtml(texto.slice(tramo.inicio, tramo.fin))}</mark>`
    cursor = tramo.fin
  }
  html += escapeHtml(texto.slice(cursor))

  // La extracción del PDF junta todo el texto de una página en un solo
  // bloque corrido (no hay salto de línea entre cláusulas) — para que se
  // vea "como el documento real" en vez de todo pegado, se inserta un
  // corte de párrafo antes de cada encabezado de cláusula/artículo que
  // aparece en mayúsculas (o "Artículo N°" en los códigos legales).
  const conCortes = html.replace(
    /(\S)(\s+)(CL[ÁA]USULA\s+[A-ZÁÉÍÓÚÑ]+|ART[IÍ]CULO\s+\d+°?|Art[íi]culo\s+\d+°?)/g,
    '$1\n\n$3'
  )

  // Párrafos reales (como un documento de Word) en vez de un solo bloque
  // con <br> — se parte por los saltos de línea dobles (los que ya traía
  // la extracción entre páginas, más los que se acaban de insertar arriba).
  return conCortes
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// true si el documento adjunto es un Word (mammoth) en vez de un PDF —
// bifurca entre HTML real (Word) y texto plano con heurísticas de párrafo
// (PDF, sin cambios) en los computeds de abajo.
const esWordAdjunto = computed(() => !!store.archivoAdjunto?.html)

const documentoHtml = computed(() => {
  const adjunto = store.archivoAdjunto
  if (!adjunto) return ''
  return adjunto.html
    ? resaltarEnHtml(adjunto.html, sugerencias.value)
    : textoAHtmlConMarcas(adjunto.texto, sugerencias.value)
})

// Vista limpia (sin marcas) — es tanto la pestaña "Documento final" como
// el HTML que se manda a convertir a .docx, así preview y descarga son
// literalmente el mismo contenido.
const documentoFinalHtml = computed(() => {
  const adjunto = store.archivoAdjunto
  if (!adjunto) return ''
  return adjunto.html ?? textoAHtmlConMarcas(adjunto.texto, [])
})

// =========================
// EDICIÓN MANUAL DEL DOCUMENTO (pestaña "Editando")
// =========================
type TabDocumento = 'original' | 'editando' | 'final'
const tabDocumento = ref<TabDocumento>('original')
const documentoEditableRef = ref<HTMLDivElement | null>(null)
const descargandoDocumento = ref(false)

// No es un ref reactivo a propósito: solo se lee de forma síncrona dentro
// del watcher de documentoHtml, no necesita disparar re-renders.
let editandoActivamente = false
let debounceEdicionId: ReturnType<typeof setTimeout> | null = null

// Único punto que lee el DOM y lo manda al store. Se llama como mucho una
// vez por pausa al tipear, nunca en cada tecla (leer el DOM fuerza reflow).
// Camino PDF: innerText (no textContent, que pegaría párrafos sin
// espacio). Camino Word: innerHTML, pero antes hay que desenvolver los
// <mark data-sugerencia-id> que el watcher de documentoHtml pintó para
// preview — si no, esas marcas quedarían persistidas en el documento real
// (para PDF esto nunca fue un problema porque innerText ya las descarta).
// HTML que el propio editor acaba de guardar en el store. Cuando el store
// cambia por esto, la pantalla YA muestra ese contenido: no se redibuja
// (redibujar pierde el cursor y hacía "saltar" la vista al editar).
let htmlGuardadoDesdeEditor: string | null = null

function comitarEdicion() {
  const el = documentoEditableRef.value
  if (el && store.archivoAdjunto) {
    if (store.archivoAdjunto.html) {
      htmlGuardadoDesdeEditor = quitarMarcasSugerencia(el.innerHTML)
      store.actualizarHtmlAdjunto(htmlGuardadoDesdeEditor)
    } else {
      store.actualizarTextoAdjunto(el.innerText)
    }
  }
  editandoActivamente = false
}

// Fuerza el commit de cualquier edición pendiente AHORA MISMO, en vez de
// esperar al debounce. Se llama antes de cualquier otra acción que lea o
// reemplace archivoAdjunto.texto (Aplicar, Generar sugerencias, Volver a
// analizar, Descargar, cambiar de pestaña) — si no, una de esas acciones
// podría pisar el texto recién tipeado con una foto vieja, o al revés.
function flushEdicionPendiente() {
  if (debounceEdicionId !== null) {
    clearTimeout(debounceEdicionId)
    debounceEdicionId = null
    comitarEdicion()
  }
}

// =========================
// PROTECCIONES DEL EDITOR (Word)
// Los cambios se aplican sobre el .docx original párrafo por párrafo (ver
// utils/edicionWord.ts), así que en pantalla solo se permite editar texto
// DENTRO de cada párrafo: nada que cree, una o divida párrafos, ni que
// cambie formato (eso no se puede trasladar al Word sin alterarlo).
// =========================
const ENTRADAS_BLOQUEADAS = new Set(['insertParagraph', 'insertLineBreak', 'insertFromDrop', 'insertHorizontalRule', 'insertOrderedList', 'insertUnorderedList'])
const avisoEditor = ref('')
let temporizadorAvisoEditor: ReturnType<typeof setTimeout> | null = null

function avisarEditor(mensaje: string) {
  avisoEditor.value = mensaje
  if (temporizadorAvisoEditor) clearTimeout(temporizadorAvisoEditor)
  temporizadorAvisoEditor = setTimeout(() => { avisoEditor.value = '' }, 4000)
}

function parrafoDe(nodo: Node | null): Element | null {
  const el = nodo instanceof Element ? nodo : nodo?.parentElement ?? null
  return el?.closest('[data-p]') ?? null
}

function onBeforeInputDocumento(event: InputEvent) {
  if (!esWordAdjunto.value) return
  if (ENTRADAS_BLOQUEADAS.has(event.inputType) || event.inputType.startsWith('format')) {
    event.preventDefault()
    avisarEditor('Aquí solo se edita el texto de cada párrafo. Para agregar párrafos o cambiar formato, descarga el Word.')
    return
  }
  // Borrar o escribir sobre una selección que abarca dos párrafos, o
  // Retroceso/Suprimir en el borde de un párrafo, los uniría.
  for (const rango of event.getTargetRanges()) {
    const inicio = parrafoDe(rango.startContainer)
    const fin = parrafoDe(rango.endContainer)
    if (!inicio || !fin || inicio !== fin) {
      event.preventDefault()
      avisarEditor('No se pueden unir ni borrar párrafos completos desde aquí. Edita el texto dentro de cada párrafo.')
      return
    }
  }
}

// Lo pegado entra como texto simple y en una sola línea (sin crear
// párrafos ni traer formato de otro documento).
function onPasteDocumento(event: ClipboardEvent) {
  if (!esWordAdjunto.value) return
  event.preventDefault()
  const texto = (event.clipboardData?.getData('text/plain') ?? '').replace(/\s*[\r\n]+\s*/g, ' ')
  if (texto) document.execCommand('insertText', false, texto)
}

function onDocumentoInput(event: Event) {
  if ((event as InputEvent).isComposing) return
  editandoActivamente = true
  if (debounceEdicionId !== null) clearTimeout(debounceEdicionId)
  debounceEdicionId = setTimeout(() => {
    debounceEdicionId = null
    comitarEdicion()
  }, 400)
}

function onDocumentoBlur() {
  flushEdicionPendiente()
}

// Reemplaza el HTML del panel editable a mano en vez de bindear v-html
// reactivo — así Vue nunca le "pisa" el cursor al usuario mientras
// escribe. Solo se refresca cuando NO hay una edición en curso (aplicar,
// descartar, generar sugerencias, o adjuntar un documento nuevo sí deben
// verse reflejados al toque).
// Único punto que escribe el innerHTML del panel editable — lo llaman
// tanto el watcher de documentoHtml como cualquier momento en que el div
// pueda haber quedado sin sincronizar por no haber existido en el DOM
// cuando documentoHtml cambió (ver watch(tabDocumento) más abajo: para
// PDF, el div de "Editando" vive detrás de un v-else de tabDocumento —
// mientras la pestaña activa es "Vista original" ni siquiera está
// montado, así que un watch normal no alcanza para llenarlo la primera
// vez que se lo muestra).
function sincronizarPanelEditable(html: string) {
  const el = documentoEditableRef.value
  if (!el || editandoActivamente) return
  if (el.innerHTML === html) return
  // El cambio viene de lo que el usuario escribió: la pantalla ya lo tiene
  // (salvo que el panel se acabe de montar vacío).
  if (el.childNodes.length > 0 && htmlGuardadoDesdeEditor !== null && store.archivoAdjunto?.html === htmlGuardadoDesdeEditor) return

  // Reemplazar el innerHTML resetea el scroll del contenedor a 0 por
  // default — sin esto, aplicar/descartar una sugerencia hace que la
  // vista "salte" al principio del documento en vez de quedarse donde
  // el usuario estaba mirando/editando.
  const contenedor = el.closest<HTMLElement>('.documento-panel-body')
  const scrollPrevio = contenedor?.scrollTop ?? 0

  el.innerHTML = html

  if (contenedor) contenedor.scrollTop = scrollPrevio
}

watch(documentoHtml, (html) => {
  sincronizarPanelEditable(html)
  void nextTick(ajustarZoomDocumento)
}, { immediate: true })

// =========================
// VISTA FIEL DEL WORD: estilos y zoom
// El CSS que genera docx-preview (fuentes, tamaños, márgenes del
// documento) se inyecta en <head> mientras hay un Word abierto. El zoom
// hace que la hoja completa quepa en el ancho del panel, como el "Ajustar
// al ancho" de Word.
// =========================
let estiloVistaWord: HTMLStyleElement | null = null
watch(() => store.archivoAdjunto?.estilosDocx, css => {
  if (!css) {
    estiloVistaWord?.remove()
    estiloVistaWord = null
    return
  }
  if (!estiloVistaWord) {
    estiloVistaWord = document.createElement('style')
    estiloVistaWord.setAttribute('data-vista-word', '')
    document.head.appendChild(estiloVistaWord)
  }
  estiloVistaWord.textContent = css
}, { immediate: true })

const zoomDocumento = ref(1)
let observadorPanelDocumento: ResizeObserver | null = null

function ajustarZoomDocumento() {
  const editable = documentoEditableRef.value
  const envoltorioZoom = editable?.parentElement
  const panel = editable?.closest<HTMLElement>('.documento-panel-body')
  if (!editable || !envoltorioZoom || !panel || !editable.querySelector('section.docx')) return

  // Se mide el ancho REAL del contenido a tamaño natural (zoom 1), incluido
  // lo que sobresale de la hoja (tablas o imágenes más anchas que el texto,
  // que Word permite): así el zoom hace caber TODO el documento en el panel.
  const zoomActual = zoomDocumento.value
  envoltorioZoom.style.zoom = '1'
  const anchoContenido = editable.scrollWidth
  envoltorioZoom.style.zoom = String(zoomActual)

  const estilo = getComputedStyle(panel)
  const disponible = panel.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
  if (anchoContenido <= 0 || disponible <= 0) return
  zoomDocumento.value = Math.min(1, Math.max(0.3, disponible / anchoContenido))
}

// "Cargando documento…" mientras se dibuja la vista del Word al entrar al
// paso 3. Insertar cientos de KB de HTML congela la pantalla un instante,
// así que: (1) el aviso se activa ya en el clic de la opción (ver
// analizarRiesgos/elegirAccion), (2) se espera a que el navegador lo PINTE
// de verdad (dos cuadros) antes de insertar el documento, y (3) se deja
// visible un mínimo para que no parpadee.
const cargandoVistaWord = ref(false)
let inicioCargaVistaWord = 0
const MIN_MS_AVISO_CARGA = 400

function esperarPintado(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

function mostrarCargandoVistaWord() {
  if (!esWordAdjunto.value || cargandoVistaWord.value) return
  cargandoVistaWord.value = true
  inicioCargaVistaWord = performance.now()
}

async function dibujarVistaWord(el: HTMLElement) {
  mostrarCargandoVistaWord()
  await esperarPintado()
  if (documentoEditableRef.value !== el) return
  sincronizarPanelEditable(documentoHtml.value)
  ajustarZoomDocumento()
  await esperarPintado()
  const restante = MIN_MS_AVISO_CARGA - (performance.now() - inicioCargaVistaWord)
  if (restante > 0) await new Promise(resolve => setTimeout(resolve, restante))
  cargandoVistaWord.value = false
}

watch(documentoEditableRef, el => {
  observadorPanelDocumento?.disconnect()
  const panel = el?.closest('.documento-panel-body')
  if (!el || !panel) return
  observadorPanelDocumento = new ResizeObserver(() => ajustarZoomDocumento())
  observadorPanelDocumento.observe(panel)
  void dibujarVistaWord(el)
})

watch(tabDocumento, (nuevo, anterior) => {
  if (anterior === 'editando') flushEdicionPendiente()
  if (nuevo === 'original') void cargarVistaOriginal()
  // El div de "Editando" (para PDF) no existe en el DOM mientras la
  // pestaña activa es "Vista original" (ver comentario en
  // sincronizarPanelEditable) — al entrar a "Editando" recién ahí se
  // monta, así que hay que sincronizarlo a mano en vez de esperar a que
  // documentoHtml cambie de valor (puede que no vuelva a cambiar nunca).
  if (nuevo === 'editando') {
    void nextTick().then(() => sincronizarPanelEditable(documentoHtml.value))
  }
})

// =========================
// VISTA ORIGINAL: render pixel-exacto del PDF real vía pdf.js, sin pasar
// por la extracción de texto — así la previsualización puede ser una
// copia visual exacta del PDF que el usuario subió, sin depender de
// ninguna heurística de párrafos/cláusulas.
// =========================
const archivoOriginalRef = ref<File | null>(null)
// Archivo Word crudo tal como se subió — se guarda para poder devolverlo
// bit a bit en la descarga cuando no hubo ningún cambio (ver
// descargarDocumento), en vez de reconstruirlo siempre con la librería docx.
const archivoWordOriginalRef = ref<File | null>(null)
const pdfCanvasRef = ref<HTMLCanvasElement | null>(null)
const pdfDocOriginal = shallowRef<PDFDocumentProxy | null>(null)
const paginaOriginal = ref(1)
const totalPaginasOriginal = ref(0)
const cargandoOriginal = ref(false)
const errorOriginal = ref('')
let renderizandoOriginal = false

async function renderizarPaginaOriginal(numeroPagina: number) {
  const pdf = pdfDocOriginal.value
  const canvas = pdfCanvasRef.value
  if (!pdf || !canvas) return

  renderizandoOriginal = true
  try {
    const page = await pdf.getPage(numeroPagina)
    const viewport = page.getViewport({ scale: 1.3 })
    canvas.width = viewport.width
    canvas.height = viewport.height

    const contexto = canvas.getContext('2d')
    if (!contexto) return
    await page.render({ canvasContext: contexto, viewport }).promise
  } catch (err) {
    errorOriginal.value = 'No se pudo mostrar esta página del PDF.'
    console.error('Error renderizando página original:', err)
  } finally {
    renderizandoOriginal = false
  }
}

// Se carga una sola vez por documento adjunto (guardado por limpiarVistaOriginal
// al quitar/reemplazar el adjunto) — cambiar de pestaña de ida y vuelta no
// vuelve a parsear el PDF entero cada vez.
async function cargarVistaOriginal() {
  if (pdfDocOriginal.value || cargandoOriginal.value) {
    // Ya cargado (o cargando): solo hace falta pintar la página actual si
    // el canvas todavía no tiene nada (ej. se acaba de montar la pestaña).
    if (pdfDocOriginal.value) await nextTick().then(() => renderizarPaginaOriginal(paginaOriginal.value))
    return
  }
  const archivo = archivoOriginalRef.value
  if (!archivo) return

  cargandoOriginal.value = true
  errorOriginal.value = ''
  try {
    const arrayBuffer = await archivo.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise
    pdfDocOriginal.value = pdf
    totalPaginasOriginal.value = pdf.numPages
    paginaOriginal.value = 1
    cargandoOriginal.value = false
    await nextTick()
    await renderizarPaginaOriginal(1)
  } catch (err) {
    errorOriginal.value = 'No se pudo cargar la vista original de este PDF.'
    console.error('Error cargando vista original:', err)
    cargandoOriginal.value = false
  }
}

function paginaOriginalAnterior() {
  if (paginaOriginal.value <= 1 || renderizandoOriginal) return
  paginaOriginal.value--
  void renderizarPaginaOriginal(paginaOriginal.value)
}

function paginaOriginalSiguiente() {
  if (paginaOriginal.value >= totalPaginasOriginal.value || renderizandoOriginal) return
  paginaOriginal.value++
  void renderizarPaginaOriginal(paginaOriginal.value)
}

function limpiarVistaOriginal() {
  archivoOriginalRef.value = null
  pdfDocOriginal.value = null
  paginaOriginal.value = 1
  totalPaginasOriginal.value = 0
  cargandoOriginal.value = false
  errorOriginal.value = ''
}

const PIE_LEXIT = 'Generado con asistencia de LexIT AI — no reemplaza asesoría legal profesional'

// Estilos inline, no clase CSS scoped: exportToWord solo lee el HTML tal
// cual (no conoce los estilos compilados de Vue) para decidir negrita/
// encabezados/párrafos. Se agrega solo en el momento de exportar (no se
// persiste en el store), así no contamina la vista en pantalla ni se
// acumula si se descarga dos veces. No es un footer real de Word (que se
// repite por página) — es un párrafo final visible, una sola vez, al pie
// del documento.
function conPieDePagina(html: string): string {
  return `${html}<p style="margin-top:2.5em;padding-top:0.8em;border-top:1px solid #999;font-size:0.8rem;color:#666;font-style:italic;">${escapeHtml(PIE_LEXIT)}</p>`
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function descargarDocumento() {
  if (!store.archivoAdjunto) return
  flushEdicionPendiente()
  descargandoDocumento.value = true
  try {
    const nombre = store.archivoAdjunto.nombre.replace(/\.(pdf|docx?)$/i, '') || 'documento'

    // Word (con o sin cambios): pasa siempre por el servidor, que aplica
    // los cambios sobre el .docx ORIGINAL sin reconstruirlo — encabezados,
    // pies, logos, tablas y estilos quedan exactamente como estaban — y le
    // agrega el membrete LEXIT, igual que la descarga de Contratos.
    if (esWordAdjunto.value) {
      await descargarWordConCambios()
      return
    }

    const blob = await exportToWord(conPieDePagina(documentoFinalHtml.value), nombre, store.archivoAdjunto.fuenteDetectada)
    descargarBlob(blob, `${nombre}.docx`)
  } catch (err) {
    console.error('Error exportando el documento:', err)
    const mensaje = err instanceof Error ? err.message : 'No se pudo generar el documento.'
    errorAdjunto.value = mensaje
    avisoDescarga.value = mensaje
  } finally {
    descargandoDocumento.value = false
  }
}

// Subida en curso del .docx original: la descarga del Word editado la
// espera si el usuario descarga antes de que termine.
let subidaDocxEnCurso: Promise<void> | null = null

// Resultado de la última descarga del Word editado (cuántos cambios se
// aplicaron y cuáles no), para mostrárselo al usuario.
const avisoDescarga = ref('')

async function descargarWordConCambios() {
  const adjunto = store.archivoAdjunto
  if (!adjunto?.html) return
  avisoDescarga.value = ''

  // Aunque no haya cambios se pasa por el servidor: es el que agrega el
  // membrete LEXIT al Word original.
  const cambios = calcularCambios(adjunto.htmlOriginal ?? adjunto.html, quitarMarcasSugerencia(adjunto.html))

  // El original se sube a Storage al adjuntarlo; si aún no terminó (o
  // falló), se espera / se reintenta aquí.
  if (!store.archivoAdjunto?.storagePathDocx && subidaDocxEnCurso) await subidaDocxEnCurso
  if (!store.archivoAdjunto?.storagePathDocx && archivoWordOriginalRef.value) {
    await subirParaAbrirEnWord(archivoWordOriginalRef.value)
  }
  const storagePath = store.archivoAdjunto?.storagePathDocx
  if (!storagePath) {
    throw new Error('No se pudo preparar el documento original. Revisa tu conexión e intenta de nuevo.')
  }

  const resultado = await descargarWordEditado(storagePath, cambios, adjunto.nombre, { marcaLexit: true })
  window.location.href = resultado.url

  if (resultado.fallidos.length > 0) {
    const ejemplo = resultado.fallidos[0]
    avisoDescarga.value = `Se aplicaron ${resultado.aplicados} de ${cambios.length} cambios. ` +
      `${resultado.fallidos.length} no se pudieron aplicar sin alterar el formato` +
      (ejemplo ? ` (por ejemplo, en "${ejemplo.antes.slice(0, 60)}…": ${ejemplo.motivo})` : '') +
      '. Hazlos directamente en Word.'
  } else {
    avisoDescarga.value = resultado.aplicados > 0
      ? `Word descargado con ${resultado.aplicados} cambio(s), el membrete LEXIT y el formato original intacto.`
      : 'Word descargado con el membrete LEXIT y el formato original intacto.'
  }
}

// Sube el .docx original a Storage en segundo plano, sin bloquear la
// extracción de texto que ya se ve al instante — si falla, el botón "Abrir
// en Word" simplemente no aparece (no rompe el resto del flujo).
async function subirParaAbrirEnWord(archivo: File) {
  const uid = authStore.user?.uid
  if (!uid) return
  try {
    const storagePath = await subirDocumentoTemporal(uid, archivo)
    store.marcarStoragePathDocx(archivo.name, storagePath)
  } catch (err) {
    console.error('No se pudo subir el documento para abrir en Word:', err)
  }
}

function onDocumentoClick(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-sugerencia-id]')
  const id = target?.dataset.sugerenciaId
  if (!id) return
  // Si el filtro por nivel oculta esa tarjeta, se quita para poder mostrarla.
  if (!document.getElementById(`sugerencia-${id}`) && filtroNivel.value) {
    filtroNivel.value = null
    void nextTick(() => document.getElementById(`sugerencia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    return
  }
  document.getElementById(`sugerencia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function abrirSelectorArchivo() {
  archivoInputRef.value?.click()
}

// file.type puede llegar vacío para .docx en Windows si el sistema no
// tiene la asociación registrada — no hay que confiar solo en el MIME,
// hace falta el fallback por extensión.
const MIME_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function esWord(archivo: File): boolean {
  return archivo.type === MIME_WORD || /\.docx$/i.test(archivo.name)
}

function esPdf(archivo: File): boolean {
  return archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name)
}

// Mismo tope que storage.rules para documentos-temporales/: el .docx
// original se guarda ahí para poder descargarlo editado con su formato.
const MAX_BYTES_WORD = 25 * 1024 * 1024

async function procesarArchivo(archivo: File) {
  // Solo Word: la edición conserva el formato original aplicando los
  // cambios sobre el .docx (ver utils/edicionWord.ts); con un PDF eso no es
  // posible.
  if (!esWord(archivo)) {
    errorAdjunto.value = esPdf(archivo)
      ? 'Solo se pueden subir documentos Word (.docx). Si tienes el contrato en PDF, guárdalo como Word primero.'
      : 'Solo se pueden subir documentos Word (.docx).'
    return
  }
  if (archivo.size > MAX_BYTES_WORD) {
    errorAdjunto.value = 'El documento pesa más de 25 MB. Prueba reducir el tamaño de las imágenes en Word.'
    return
  }

  const intentoActual = ++intentoExtraccion
  errorAdjunto.value = ''
  procesandoArchivo.value = true
  accionElegida.value = false
  limpiarSugerencias()
  reiniciarEdicion()

  try {
    if (esWord(archivo)) {
      // Vista fiel del Word (fuentes, tamaños, encabezados, pies, logos):
      // ver utils/vistaWord.ts. Cada párrafo queda marcado con su posición
      // para saber, al descargar, cuáles editó el usuario.
      const { html, estilos } = await renderizarWord(archivo)
      if (intentoActual !== intentoExtraccion) return

      store.adjuntarWord(archivo.name, html, estilos)
      if ((store.archivoAdjunto?.texto.trim().length ?? 0) < 20) {
        store.quitarAdjunto()
        errorAdjunto.value = 'No se pudo leer el contenido de este documento Word.'
        return
      }
      archivoWordOriginalRef.value = archivo
      subidaDocxEnCurso = subirParaAbrirEnWord(archivo)
      return
    }

    const texto = await extraerTextoPDF(archivo)
    if (intentoActual !== intentoExtraccion) return

    if (!texto || texto.trim().length < 20) {
      errorAdjunto.value = 'No se pudo extraer texto de este PDF (puede ser un escaneo sin texto).'
      return
    }

    store.adjuntarPdf(archivo.name, texto)
    archivoOriginalRef.value = archivo
    void cargarVistaOriginal()
  } catch (err) {
    if (intentoActual !== intentoExtraccion) return
    errorAdjunto.value = 'No se pudo leer el archivo. Intenta con otro.'
    console.error('Error extrayendo archivo:', err)
  } finally {
    if (intentoActual === intentoExtraccion) {
      procesandoArchivo.value = false
    }
  }
}

async function onArchivoSeleccionado(event: Event) {
  const input = event.target as HTMLInputElement
  const archivo = input.files?.[0]
  input.value = ''
  if (!archivo) return
  await procesarArchivo(archivo)
}

// Arrastrar y soltar un PDF sobre el chat (aparte del botón "Adjuntar").
// El contador evita el parpadeo del overlay al pasar sobre elementos hijos
// (dragleave se dispara también al entrar a un hijo, no solo al salir).
const isDraggingFile = ref(false)
let dragDepth = 0

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragDepth++
  isDraggingFile.value = true
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDraggingFile.value = false
}

async function onDrop(event: DragEvent) {
  dragDepth = 0
  isDraggingFile.value = false
  const archivo = event.dataTransfer?.files?.[0]
  if (!archivo) return
  await procesarArchivo(archivo)
}

function quitarAdjunto() {
  store.quitarAdjunto()
  accionElegida.value = false
  limpiarSugerencias()
  reiniciarEdicion()
}

// =========================
// PASOS DE LA PÁGINA: subir el contrato → elegir qué hacer → trabajo.
// La IA no hace nada hasta que el usuario elige una acción (o escribe su
// propia pregunta); recién ahí aparece la vista de documento + chat +
// sugerencias de siempre.
// =========================
const accionElegida = ref(false)
const preguntaInicial = ref('')

const etapa = computed<'subir' | 'elegir' | 'trabajo'>(() => {
  if (!store.archivoAdjunto) return 'subir'
  return accionElegida.value ? 'trabajo' : 'elegir'
})

// En la vista de trabajo, MainLayout oculta el menú lateral para dar más
// espacio al documento (el botón de la flecha lo vuelve a mostrar).
watch(etapa, e => { store.vistaTrabajoActiva = e === 'trabajo' }, { immediate: true })

const ACCIONES_DOCUMENTO = [
  {
    id: 'riesgos',
    titulo: 'Analizar riesgos',
    descripcion: 'Revisa cada cláusula, marca las riesgosas y sugiere cómo mejorarlas.',
    // Este texto dispara también el panel de sugerencias
    // (esSolicitudDeAnalisisDeRiesgos).
    mensaje: 'Analiza este contrato y sus riesgos.'
  },
  {
    id: 'resumen',
    titulo: 'Resumir el contrato',
    descripcion: 'Partes, objeto, plazo, pagos y obligaciones principales, en lenguaje simple.',
    mensaje: 'Resume este contrato: partes, objeto, plazo, contraprestación y obligaciones principales de cada parte.'
  },
  {
    id: 'obligaciones',
    titulo: 'Obligaciones y plazos',
    descripcion: 'Qué debe hacer cada parte y hasta cuándo, con la cláusula de cada una.',
    mensaje: 'Enumera las obligaciones de cada parte y los plazos importantes del contrato, indicando la cláusula de cada uno.'
  }
] as const

// Pestaña visible del panel derecho en el paso 3.
const vistaDerecha = ref<'analisis' | 'chat'>('chat')

// "Analizar riesgos" genera SOLO el panel de sugerencias (cláusula por
// cláusula, por secciones en contratos largos). No se manda al chat: la
// respuesta del chat repetía el mismo análisis en texto.
async function analizarRiesgos() {
  if (!store.archivoAdjunto || cargandoSugerencias.value) return
  flushEdicionPendiente()
  // Al ENTRAR a la vista de trabajo el documento se dibuja: aviso de carga
  // desde el clic (si ya se está en ella, no se vuelve a dibujar).
  if (etapa.value !== 'trabajo') mostrarCargandoVistaWord()
  accionElegida.value = true
  vistaDerecha.value = 'analisis'
  await generarSugerencias()
}

// Resumen, obligaciones o una pregunta propia: van al chat.
async function elegirAccion(mensaje: string) {
  const texto = mensaje.trim()
  if (!texto || store.loading) return
  if (etapa.value !== 'trabajo') mostrarCargandoVistaWord()
  accionElegida.value = true
  vistaDerecha.value = 'chat'
  pregunta.value = texto
  preguntaInicial.value = ''
  await enviarConsulta()
}

onUnmounted(() => {
  intentoExtraccion++
  if (debounceEdicionId !== null) clearTimeout(debounceEdicionId)
  observadorPanelDocumento?.disconnect()
  estiloVistaWord?.remove()
  estiloVistaWord = null
  store.vistaTrabajoActiva = false
  // El documento adjunto es de esta sesión de Análisis — si el usuario
  // navega a otra pestaña (Consultas, Contratos, Normas) y vuelve, no debe seguir
  // apareciendo (store.archivoAdjunto es estado de Pinia, sobrevive a la
  // navegación por sí solo si no se limpia acá).
  quitarAdjunto()
})

function formatTimestamp(ts: Date | string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// =========================
// CITAS DEL CHAT: cuadros cerrados que se abren con un clic (igual que en
// Consultas). Cita abierta en cada mensaje: índice del mensaje → índice de
// la fuente; una a la vez por mensaje.
// =========================
const citaAbierta = ref<Record<number, number>>({})

function alternarCita(indiceMensaje: number, indiceFuente: number) {
  if (citaAbierta.value[indiceMensaje] === indiceFuente) {
    cerrarCita(indiceMensaje)
  } else {
    citaAbierta.value = { ...citaAbierta.value, [indiceMensaje]: indiceFuente }
  }
}

function cerrarCita(indiceMensaje: number) {
  const copia = { ...citaAbierta.value }
  delete copia[indiceMensaje]
  citaAbierta.value = copia
}

// Clic en un [n] dentro del texto de la respuesta (ver formatMessage).
function onClickEnRespuesta(event: MouseEvent, indiceMensaje: number) {
  const boton = (event.target as HTMLElement).closest<HTMLElement>('[data-cita]')
  if (!boton) return
  alternarCita(indiceMensaje, Number(boton.dataset.cita) - 1)
}

// totalFuentes: los [n] que apuntan a una fuente existente se vuelven
// botoncitos que abren esa cita; el resto del texto no cambia.
function formatMessage(content: string, totalFuentes = 0): string {
  return content
    // Separadores (---, ***) y viñetas "* " de Gemini: se resuelven antes
    // que las negritas/cursivas, si no quedan asteriscos sueltos a la vista.
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '<hr>')
    .replace(/^(\s*)[*-]\s+/gm, '$1• ')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#{4,6} (.*$)/gm, '<h4>$1</h4>')
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (original: string, grupo: string) => {
      const numeros = grupo.split(',').map(s => Number(s.trim())).filter(n => n >= 1 && n <= totalFuentes)
      if (numeros.length === 0) return original
      return numeros
        .map(n => `<button type="button" class="cita-ref" data-cita="${n}" title="Ver cita ${n}">${n}</button>`)
        .join('')
    })
    .replace(/\n/g, '<br>')
}

async function enviarConsulta() {
  const mensaje = pregunta.value.trim() ||
    (store.archivoAdjunto ? 'Analiza este contrato y sus riesgos.' : '')

  if (mensaje) {
    // Misma intención, un solo disparo: si este mensaje pide análisis de
    // riesgos, se genera el panel de sugerencias estructurado junto con la
    // respuesta del chat — en paralelo, no como un segundo paso manual.
    // Se evalúa ANTES de llamar a store.enviarConsulta porque esa llamada
    // consume/limpia analisisPendiente al terminar.
    const pideAnalisisDeRiesgos = !!store.archivoAdjunto &&
      (store.analisisPendiente || esSolicitudDeAnalisisDeRiesgos(mensaje))

    try {
      const tareas: Promise<unknown>[] = [store.enviarConsulta(mensaje)]
      if (pideAnalisisDeRiesgos) tareas.push(generarSugerencias())
      await Promise.all(tareas)
      pregunta.value = ''
      await nextTick()
      if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
    } catch (error) {
      console.error('Error al enviar consulta:', error)
    }
  }
}

// "Volver a analizar": regenera solo el análisis de riesgos (panel de
// sugerencias). Antes además mandaba un mensaje al chat que repetía el
// mismo análisis en texto.
async function volverAAnalizar() {
  await analizarRiesgos()
}

onMounted(() => {
  store.iniciarSesion()
  void nextTick().then(() => {
    if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
    // El watch(documentoHtml, ..., { immediate: true }) corre durante el
    // setup del componente, antes de que el ref del template exista —
    // si ya había un documento adjunto al montar la página (ej. se
    // navegó de vuelta a Análisis), el panel editable se queda vacío
    // sin esta sincronización explícita post-mount.
    sincronizarPanelEditable(documentoHtml.value)
  })
})

watch(mensajes, async () => {
  await nextTick()
  if (messagesBox.value) messagesBox.value.scrollTop = messagesBox.value.scrollHeight
}, { deep: true })
</script>

<style scoped>
/* ==============================
   Paleta clara verde-bosque/beige (misma familia que LandingPage.vue,
   Contratos y Consultas), variables propias con prefijo lc-, definidas
   solo dentro de .analisis-page. No se tocan las variables globales
   (--surface, --bg, etc. en src/css/app.scss). Acento en verde oliva
   oscuro, distinto del oliva medio de Consultas, para distinguir esta
   sub-vista dentro de la misma familia de colores.
   ============================== */
.analisis-page {
  --lc-bg: #FFFFFF;
  --lc-surface: #FFFFFF;
  --lc-surface-alt: #D9D4C6;
  --lc-surface-sunken: #BDB59B;
  --lc-border: rgba(23, 33, 27, 0.10);
  --lc-border-strong: rgba(23, 33, 27, 0.18);
  --lc-text: #17211B;
  --lc-text-muted: #3D473A;
  --lc-text-faint: #686A57;
  --lc-accent: #2B352B;
  --lc-accent-hover: #17211B;
  --lc-accent-soft: rgba(43, 53, 43, 0.10);
  --lc-accent-soft-strong: rgba(43, 53, 43, 0.20);
  --lc-accent-warm: #9C9275;
  --lc-accent-warm-soft: rgba(156, 146, 117, 0.18);
  --lc-ink: #F8F7F2;

  /* El max-width:none real vive en ".q-page.analisis-page" más abajo —
     acá no alcanza, empata en especificidad con la regla global ".q-page"
     de MainLayout.vue (max-width:1400px) y puede perder según el orden de
     carga de cada archivo. */
  animation: floatUp 0.5s ease-out both;
  display: flex;
  flex-direction: column;
  /* 94px = el padding vertical de .q-page en MainLayout.vue (34px arriba +
     60px abajo). Sin fijar esta altura, el encabezado + el chat empujan el
     contenido más allá del viewport y es la PÁGINA la que hace scroll,
     arrastrando el composer con ella — en vez de quedarse quieto abajo
     mientras solo se desplazan los mensajes. */
  height: calc(100vh - 94px);
  min-height: 560px;
  overflow: hidden;
}

/* .q-page trae max-width:1400px + margin:0 auto de MainLayout.vue (regla
   compartida por toda la app) — sin anularla acá, en pantallas anchas se
   ve el fondo claro de .page-container detrás del área oscura (mismo bug
   ya resuelto en ContratosPage.vue). Mayor especificidad que ".q-page"
   (dos clases contra una) para que gane sin tocar esa regla compartida. */
.q-page.analisis-page {
  background: var(--lc-bg);
  max-width: none;
  margin: 0;
}

/* Vista de trabajo (documento + análisis/chat): usa casi todo el alto de
   la ventana. Márgenes mínimos y sin el encabezado grande (se oculta en el
   template); los pasos de subir/elegir mantienen el diseño de siempre. */
.q-page.analisis-page--trabajo {
  padding-top: 12px;
  padding-bottom: 12px;
  height: calc(100vh - 24px);
}

.analisis-page--trabajo .documento-panel-body {
  padding: 10px;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%   { opacity: 0.2; transform: translateY(0); }
  50%  { opacity: 1;   transform: translateY(-3px); }
  100% { opacity: 0.2; transform: translateY(0); }
}

.page-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--lc-border);
  text-align: center;
  transition: opacity 0.25s ease, transform 0.25s ease, margin-bottom 0.25s ease, padding-bottom 0.25s ease;
}

/* Al bajar en el chat, el encabezado se encoge y atenúa en vez de ocupar
   su espacio completo todo el tiempo (ver onMessagesScroll). */
.page-header--compact {
  opacity: 0.4;
  transform: scale(0.92);
  margin-bottom: 6px;
  padding-bottom: 8px;
}

.page-header--compact:hover {
  opacity: 0.9;
}

.section-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px var(--lc-accent-soft-strong);
  transition: width 0.25s ease, height 0.25s ease;
}

.section-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.icon-blue { background: var(--lc-accent-soft); }

.page-title {
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-optical-sizing: auto;
  font-size: 1.7rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--lc-text);
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--lc-text-muted);
  font-size: 1rem;
}

/* Ya no hace falta un tope de ancho especial acá — la base
   (.analisis-page) ya no tiene max-width, así que este modificador
   quedaría de más (o peor, constreñiría el ancho justo cuando hay más
   contenido al costado). Se deja la clase declarada (el template sigue
   agregándola) sin reglas, por si vuelve a necesitarse. */

.analisis-layout {
  flex: 1;
  min-height: 0;
  display: flex;
}

.analisis-layout--split {
  gap: 20px;
}

.analisis-layout--split .chat-wrapper {
  min-width: 360px;
}

/* Sin card: sin fondo propio, borde ni sombra — el chat vive directo
   sobre el fondo de la página (misma paleta), en vez de sentirse
   "encerrado" dentro de un recuadro aparte. Un padding lateral generoso
   (en vez del borde de una tarjeta) es lo que le da aire. */
.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  min-height: 0;
  padding: 8px 4vw 0;
}

/* Overlay al arrastrar un archivo sobre el chat */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: rgba(16, 21, 31, 0.92);
  border: 2px dashed var(--lc-accent);
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-overlay-content {
  text-align: center;
  color: var(--lc-accent);
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
}

.drop-overlay-content svg { margin-bottom: 8px; }

/* Documento: la pieza grande, protagonista — previsualización tipo Word. */
/* Dos columnas (documento | panel Análisis/Chat): el panel de
   sugerencias/chat es el más ancho; la hoja del documento se ajusta sola
   al espacio con el zoom (ver ajustarZoomDocumento). */
.documento-panel {
  flex: 1;
  min-width: 420px;
  max-width: 800px;
  background: var(--surface-alt);
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-light);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.documento-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(27, 27, 30, 0.08);
  font-family: 'Figtree', sans-serif;
  background: #fff;
  flex-shrink: 0;
}

.documento-panel-titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.documento-panel-acciones {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.documento-tabs {
  display: flex;
  background: var(--surface-alt);
  border-radius: var(--border-radius-small);
  padding: 3px;
  gap: 2px;
}

.documento-tab {
  background: none;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s;
}

.documento-tab:hover { color: var(--ink); }

.documento-tab--active {
  background: #fff;
  color: var(--accent);
  box-shadow: var(--shadow-light);
}

.documento-descargar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 8px 14px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.documento-descargar:hover:not(:disabled) { background: var(--ink-soft); }
.documento-descargar:disabled { opacity: 0.6; cursor: not-allowed; }

.documento-abrir-word-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.documento-abrir-word {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: var(--ink);
  border: 1px solid var(--border-color, #d8d8d8);
  border-radius: var(--border-radius-small);
  padding: 8px 14px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.documento-abrir-word:hover:not(:disabled) { background: #f4f4f4; }
.documento-abrir-word:disabled { opacity: 0.6; cursor: not-allowed; }

.documento-abrir-word-hint {
  font-size: 0.72rem;
  color: var(--text-secondary, #888);
}

.documento-abrir-word-error {
  font-size: 0.72rem;
  color: var(--negative, #c0392b);
}

.documento-panel-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 30px 40px;
}

/* "Cargando documento…" encima del panel mientras se dibuja el Word. */
.documento-cargando {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--surface-alt);
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.documento-cargando p { margin: 0; }

.documento-hint {
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius-small);
  padding: 10px 14px;
  margin-bottom: 18px;
}

.documento-hint-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font-weight: 600;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  text-decoration: underline;
}

.documento-original {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.documento-original-canvas-wrap {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius-small);
  box-shadow: var(--shadow-medium);
  padding: 10px;
  max-width: 100%;
  overflow: auto;
}

.documento-original-canvas-wrap canvas {
  display: block;
  max-width: 100%;
}

.documento-original-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.pdf-nav-btn {
  background: var(--surface-alt);
  border: none;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
  transition: background-color 0.18s;
}

.pdf-nav-btn:hover:not(:disabled) { background: rgba(27, 27, 30, 0.1); }
.pdf-nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* La "hoja" blanca, como un documento de Word */
.documento-page {
  background: #fff;
  border: 1px solid rgba(27, 27, 30, 0.08);
  border-radius: var(--border-radius-small);
  box-shadow: var(--shadow-medium);
  padding: 44px 48px;
}

.documento-texto {
  font-family: 'EB Garamond', serif;
  font-size: 1.08rem;
  line-height: 1.8;
  color: var(--ink);
}

.documento-texto :deep(p) {
  margin: 0 0 1.1em;
  text-align: justify;
}

.documento-texto :deep(p:last-child) { margin-bottom: 0; }

.documento-texto :deep(mark) {
  border-radius: 3px;
  padding: 1px 2px;
  cursor: pointer;
  font-family: inherit;
}

.documento-texto :deep(.hl-cambio) {
  background: #FDE68A;
  color: #4a3800;
}

.documento-texto :deep(.hl-riesgo) {
  text-decoration: underline wavy #C23B2E;
  text-decoration-thickness: 1.5px;
}

.documento-texto :deep(.hl-riesgo--alto) { background: #FBD5D0; color: #7a1d14; }
.documento-texto :deep(.hl-riesgo--medio) { background: #FCE3D6; color: #7a3d14; }
.documento-texto :deep(.hl-riesgo--bajo) { background: #FDEFD6; color: #6b4d14; }

/* Vista fiel del Word (docx-preview). No se le ponen fuente, tamaño ni
   interlineado: los trae el propio documento en el CSS que genera
   docx-preview (ver utils/vistaWord.ts). */
.documento-word-zoom {
  /* El zoom lo calcula ajustarZoomDocumento para que la hoja quepa. */
  transform-origin: top left;
}

.documento-word {
  outline: none;
  cursor: text;
}

.documento-word :deep(.docx-wrapper) {
  padding: 16px;
  background: #d9d9dc;
  border-radius: var(--border-radius-small);
  /* Crece hasta la hoja más ancha (en vez de medir lo que mide el panel):
     si la hoja es más ancha y el contenedor la centra, lo que sobresale a
     la IZQUIERDA queda cortado y no se puede desplazar hasta ahí. */
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
}

.documento-word :deep(section.docx) {
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  /* docx-preview corta con overflow:hidden lo que sobresale de la hoja
     (tablas o imágenes más anchas que el texto, que Word sí muestra en el
     margen): aquí se deja ver todo. */
  overflow: visible;
}

/* Tablas anchas: que se vean completas en vez de recortarse. */
.documento-word :deep(table) {
  max-width: none;
}

.documento-word :deep(header),
.documento-word :deep(footer) {
  cursor: default;
}

.documento-word :deep(mark) {
  border-radius: 2px;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.documento-word :deep(.hl-cambio) { background: #FDE68A; }
.documento-word :deep(.hl-riesgo) {
  text-decoration: underline wavy #C23B2E;
  text-decoration-thickness: 1.5px;
}
.documento-word :deep(.hl-riesgo--alto) { background: #FBD5D0; }
.documento-word :deep(.hl-riesgo--medio) { background: #FCE3D6; }
.documento-word :deep(.hl-riesgo--bajo) { background: #FDEFD6; }

/* "Ver observación": la marca destaca un momento al llegar a ella. */
.documento-word :deep(mark.hl-foco),
.documento-texto :deep(mark.hl-foco) {
  animation: hlFoco 0.8s ease-in-out 3;
}

@keyframes hlFoco {
  0%, 100% { box-shadow: 0 0 0 0 rgba(194, 59, 46, 0); }
  50% { box-shadow: 0 0 0 4px rgba(194, 59, 46, 0.45); }
}

.documento-texto--editable {
  outline: none;
  cursor: text;
  border-radius: 4px;
  transition: box-shadow 0.15s;
}

.documento-texto--editable:focus {
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* Sugerencias: riel angosto al costado del documento, sin pestañas */
.sugerencias-rail {
  width: 300px;
  flex-shrink: 0;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 26px -14px rgba(23, 33, 27, 0.20);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sugerencias-rail-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--lc-border);
  font-family: 'Figtree', sans-serif;
  font-weight: 600;
  font-size: 0.86rem;
  color: var(--lc-text);
  flex-shrink: 0;
}

.sugerencias-rail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  background: var(--lc-surface-alt);
}

/* CTA "Descargar y abrir en Word" — único camino para editar, por eso va
   primero y con más peso visual que cualquier otra cosa del panel. */
.sugerencias-cta {
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid var(--lc-border);
  background: var(--lc-surface-sunken);
}

.sugerencias-cta-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 11px 14px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.sugerencias-cta-btn:hover:not(:disabled) { background: var(--lc-accent-hover); color: #fff; }
.sugerencias-cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.sugerencias-cta-hint {
  margin: 8px 0 0;
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--lc-text-faint);
}

/* Franja de métricas */
.sugerencias-metricas {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.metrica-bloque {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-radius: var(--border-radius-small);
}

.metrica-numero {
  font-family: 'EB Garamond', serif;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  color: var(--lc-text);
}

.metrica-label {
  font-family: 'Figtree', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lc-text-muted);
}

/* Las métricas son botones de filtro. */
button.metrica-bloque {
  font: inherit;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, background-color 0.18s;
}

button.metrica-bloque:hover {
  border-color: rgba(23, 33, 27, 0.28);
}

button.metrica-bloque:focus-visible {
  outline: 2px solid #3D473A;
  outline-offset: 2px;
}

.metrica-bloque--activo {
  border-color: #17211B;
  box-shadow: inset 0 0 0 1px #17211B;
}

.metrica-bloque--alto.metrica-bloque--activo { border-color: #C23B2E; box-shadow: inset 0 0 0 1px #C23B2E; background: rgba(194, 59, 46, 0.06); }
.metrica-bloque--medio.metrica-bloque--activo { border-color: #B9791E; box-shadow: inset 0 0 0 1px #B9791E; background: rgba(185, 121, 30, 0.07); }
.metrica-bloque--bajo.metrica-bloque--activo { border-color: #2F8F5E; box-shadow: inset 0 0 0 1px #2F8F5E; background: rgba(47, 143, 94, 0.07); }

.sugerencias-filtro-vacio {
  font-size: 0.86rem;
  color: var(--lc-text-muted);
  margin: 0 0 12px;
}

.sugerencias-filtro-quitar {
  background: none;
  border: none;
  padding: 0;
  margin-left: 4px;
  font: inherit;
  font-weight: 600;
  color: var(--lc-text);
  text-decoration: underline;
  cursor: pointer;
}

.metrica-bloque--alto .metrica-numero { color: #C23B2E; }
.metrica-bloque--medio .metrica-numero { color: #B9791E; }
.metrica-bloque--bajo .metrica-numero { color: #2F8F5E; }

.sugerencias-cargando {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 36px 16px;
}

.sugerencias-cargando-titulo {
  font-family: 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--lc-text);
  margin: 10px 0 0;
}

.sugerencias-cargando-sub {
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  color: var(--lc-text-muted);
  margin: 0;
  max-width: 220px;
}

.sugerencias-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 32px 16px;
  color: #C23B2E;
}

.sugerencias-error-titulo {
  font-family: 'EB Garamond', serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--lc-text);
  margin: 8px 0 0;
}

.sugerencias-error-sub {
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  color: var(--lc-text-muted);
  margin: 0;
  max-width: 220px;
}

.sugerencias-reintentar-btn {
  margin-top: 10px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 8px 16px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s;
}

.sugerencias-reintentar-btn:hover { background: var(--lc-accent-hover); color: #fff; }

.pdf-panel-status {
  text-align: center;
  color: var(--text-secondary);
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
}

.pdf-panel-error { color: #C23B2E; }

@media (max-width: 1240px) {
  /* Con el documento y las sugerencias apilados debajo del chat (en vez de
     al costado), tres paneles a pantalla completa no caben en un solo
     viewport — se vuelve al scroll normal de la página en vez de forzar
     todo dentro de una altura fija. */
  .analisis-page,
  .q-page.analisis-page--trabajo {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .analisis-layout--split {
    flex-direction: column;
  }

  /* Apilados, cada uno ocupa casi toda la pantalla y la página se
     desplaza entre ellos. */
  .documento-panel {
    width: 100%;
    min-width: 0;
    max-width: none;
    height: 88vh;
  }

  /* El panel de pestañas va debajo del documento, a lo ancho. */
  .panel-derecho {
    width: 100%;
    min-width: 0;
    height: 88vh;
    min-height: 520px;
  }
}

/* ==============================
   Paso 3: panel derecho con pestañas (Análisis / Chat)
   ============================== */
.panel-derecho {
  flex: 1.35;
  min-width: 460px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-tabs {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 10px;
  border: 1px solid var(--lc-border);
  border-radius: 12px;
  background: var(--lc-surface-alt);
}

.panel-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 12px;
  border: none;
  border-radius: 9px;
  background: none;
  color: var(--lc-text-muted);
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.panel-tab:hover { color: var(--lc-text); }

.panel-tab--activa {
  background: var(--lc-surface);
  color: var(--lc-text);
  box-shadow: 0 2px 8px -4px rgba(23, 33, 27, 0.22);
}

.panel-tab-cuenta {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 20px;
}

.panel-tab-estado { color: var(--lc-accent); }

.panel-contenido {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* Dentro del panel, las sugerencias y el chat ocupan todo el ancho. */
.panel-contenido .sugerencias-rail {
  width: auto;
  flex: 1;
  min-height: 0;
}

.panel-contenido .chat-wrapper {
  flex: 1;
  height: auto;
  min-width: 0;
  padding: 0 4px;
}

.analisis-vacio {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 20px;
  border: 1px dashed var(--lc-border-strong);
  border-radius: var(--border-radius);
  text-align: center;
}

.analisis-vacio-titulo {
  margin: 0;
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--lc-text);
}

.analisis-vacio-sub {
  margin: 0;
  font-size: 0.88rem;
  color: var(--lc-text-muted);
}

.analisis-vacio-btn {
  border: none;
  cursor: pointer;
}

/* Chat sin tarjeta ni header propio — el título de la página ya cumple ese
   rol, como en Claude/ChatGPT donde el panel de chat no lleva su propio
   marco. */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  scrollbar-width: thin;
  scrollbar-color: var(--lc-border-strong) transparent;
}

/* Sin tarjeta blanca — solo una franja de acento a la izquierda, texto
   flotando directo sobre el fondo de la página. Bloque de texto simple,
   como dice el comentario del template, ahora sí sin caja alrededor. */
.msg-block--ai {
  max-width: 100%;
  border-left: 3px solid var(--lc-accent);
  padding: 4px 0 4px 18px;
}

.msg-block--user {
  display: flex;
  justify-content: flex-end;
}

.msg-bubble-user {
  max-width: 74%;
  background: var(--lc-accent);
  color: var(--lc-ink);
  padding: 12px 16px;
  border-radius: 16px 16px 4px 16px;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-wrap;
}

.msg-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 9px;
}

.msg-meta--ai { color: var(--lc-accent); }

.msg-content {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--lc-text);
}

.msg-refs {
  font-size: 0.8rem;
  color: var(--lc-text-faint);
  margin-top: 8px;
}

.formatted-message :deep(h1),
.formatted-message :deep(h2),
.formatted-message :deep(h3) {
  font-family: 'EB Garamond', serif;
  font-weight: 600;
  margin: 8px 0 4px;
  color: var(--lc-text);
}

.formatted-message :deep(strong) { font-weight: 600; color: var(--lc-text); }
.formatted-message :deep(em)     { font-style: italic; }

.msg-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.msg-action-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--border-radius-small);
  background: none;
  border: none;
  color: var(--lc-text-faint);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.18s, color 0.18s;
}

.msg-action-btn:hover {
  background: var(--lc-surface);
  color: var(--lc-text);
}

.typing-dots {
  display: inline-flex;
  gap: 6px;
  padding: 4px 0;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background: var(--lc-accent);
  border-radius: 50%;
  display: inline-block;
  opacity: 0.6;
  animation: blink 1s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.30s; }

/* Fuentes citadas */
.fuentes-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--lc-border-strong);
}

.fuentes-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lc-accent);
  background: var(--lc-accent-soft);
  border: 1px solid var(--lc-accent-soft-strong);
  padding: 6px 11px;
  border-radius: var(--border-radius-small);
  font-family: 'Figtree', sans-serif;
}

/* Citas: cuadros pequeños y cerrados; el texto se abre al hacer clic. */
.fuentes-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.fuente-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  padding: 5px 10px 5px 5px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 8px;
  color: var(--lc-text-muted);
  font-family: 'Figtree', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}

.fuente-chip:hover { border-color: var(--lc-accent); color: var(--lc-text); }

.fuente-chip--abierta {
  border-color: var(--lc-accent);
  background: var(--lc-accent-soft);
  color: var(--lc-text);
}

.fuente-chip:focus-visible { outline: 2px solid var(--lc-accent); outline-offset: 2px; }

.fuente-chip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 5px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.fuente-chip-nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fuente-detalle {
  margin-top: 8px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-left: 3px solid var(--lc-accent);
  border-radius: 8px;
  padding: 10px 12px;
}

.fuente-detalle-cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.fuente-detalle-cerrar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: none;
  color: var(--lc-text-faint);
  cursor: pointer;
}

.fuente-detalle-cerrar:hover { background: var(--lc-surface-alt); color: var(--lc-text); }

/* Aparece suave en vez de "de golpe". */
.cita-enter-active,
.cita-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.cita-enter-from,
.cita-leave-to { opacity: 0; transform: translateY(-4px); }

/* Los [n] dentro de la respuesta: botoncitos que abren su cita. */
.formatted-message :deep(.cita-ref) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin: 0 2px;
  padding: 0 4px;
  border: 1px solid var(--lc-accent-soft-strong);
  border-radius: 4px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  font-family: 'Figtree', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  vertical-align: 2px;
  cursor: pointer;
}

.formatted-message :deep(.cita-ref:hover) { background: var(--lc-accent); color: var(--lc-ink); }
.formatted-message :deep(hr) { border: none; border-top: 1px solid var(--lc-border-strong); margin: 12px 0; }
.formatted-message :deep(h4) { font-family: 'EB Garamond', serif; font-weight: 600; margin: 8px 0 4px; color: var(--lc-text); }

.fuente-doc-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--lc-text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 5px;
}

.fuente-texto {
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--lc-text-muted);
  font-style: italic;
  margin: 0;
}

.input-area {
  padding: 8px 2px 0;
  flex-shrink: 0;
}

/* Composer tipo píldora, como Claude: todo en una sola fila redondeada. */
.composer-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.composer-reanalizar {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: var(--lc-accent);
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 4px;
  flex-shrink: 0;
}

.composer-reanalizar:hover:not(:disabled) { text-decoration: underline; }
.composer-reanalizar:disabled { opacity: 0.5; cursor: not-allowed; }

.composer-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  border-radius: var(--border-radius-small);
  padding: 6px 8px 6px 10px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  max-width: 100%;
}

.composer-chip-remove {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  opacity: 0.75;
}

.composer-chip-remove:hover { opacity: 1; }

.adjunto-extrayendo {
  font-size: 0.85rem;
  color: var(--lc-text-muted);
  margin: 0 0 8px;
}

.adjunto-error {
  font-size: 0.85rem;
  color: var(--q-negative);
  margin: 0 0 8px;
}

.composer-pill {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--lc-surface);
  border: 1px solid var(--lc-border-strong);
  border-radius: 26px;
  padding: 7px 7px 7px 8px;
  box-shadow: 0 4px 18px -6px rgba(23, 33, 27, 0.16);
  transition: border-color 0.18s, box-shadow 0.18s;
}

.composer-pill:focus-within {
  border-color: var(--lc-accent);
  box-shadow: 0 0 0 3px var(--lc-accent-soft);
}

.plus-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lc-surface-alt);
  color: var(--lc-text);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.18s;
}

.plus-btn:hover:not(:disabled) { background: var(--lc-accent-soft); color: var(--lc-accent); }
.plus-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.composer-textarea-pill { flex: 1; }

:deep(.composer-textarea-pill .q-field__control) {
  background: transparent !important;
  padding: 0 !important;
  min-height: unset !important;
}

:deep(.composer-textarea-pill .q-field__native) {
  color: var(--lc-text) !important;
  font-family: 'Figtree', sans-serif !important;
  font-size: 1rem !important;
  padding: 7px 0 !important;
  line-height: 1.45 !important;
  resize: none !important;
}

:deep(.composer-textarea-pill .q-field__native::placeholder) {
  color: var(--lc-text-faint) !important;
  opacity: 1 !important;
}

:deep(.composer-textarea-pill .q-field__bottom) { display: none !important; }

.ask-btn-round {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lc-accent);
  color: var(--lc-ink);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.18s, transform 0.18s;
}

.ask-btn-round:hover:not(:disabled) { background: var(--lc-accent-hover); color: #fff; transform: scale(1.05); }
.ask-btn-round:disabled { opacity: 0.4; cursor: not-allowed; }

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: var(--lc-text-muted);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 6px 9px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s, color 0.18s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--surface-alt);
  color: var(--ink);
}

.toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ask-btn {
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 9px 20px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  transition: background-color 0.18s, transform 0.18s;
}

.ask-btn:hover:not(:disabled) { background: var(--ink-soft); transform: scale(1.03); }
.ask-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sugerencias-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sugerencia-card {
  background: var(--lc-surface);
  border: 1px solid var(--lc-border);
  border-radius: var(--border-radius-small);
  padding: 12px 14px;
}

.sugerencia-card--aplicada {
  background: var(--accent-soft);
  border-color: var(--accent-soft-strong);
}

.sugerencia-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.sugerencia-clausula {
  font-family: 'Figtree', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lc-text-muted);
}

.riesgo-badge {
  flex-shrink: 0;
  font-family: 'Figtree', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.riesgo-badge--alto { background: rgba(194, 59, 46, 0.12); color: #C23B2E; }
.riesgo-badge--medio { background: rgba(185, 121, 30, 0.14); color: #B9791E; }
.riesgo-badge--bajo { background: rgba(47, 143, 94, 0.14); color: #2F8F5E; }
.riesgo-badge--cambio { background: var(--lc-accent-soft); color: var(--lc-accent); }

.sugerencia-explicacion {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--lc-text);
  margin: 0 0 10px;
}

.sugerencia-explicacion strong {
  font-weight: 700;
}

.sugerencia-nuevo {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--lc-text);
  background: var(--lc-accent-soft);
  border-left: 3px solid var(--lc-accent);
  border-radius: 4px;
  padding: 8px 10px;
  margin: 0 0 10px;
}

.sugerencia-original {
  font-size: 0.8rem;
  line-height: 1.5;
  font-style: italic;
  color: var(--lc-text-muted);
  margin: 0;
}

.sugerencia-error {
  font-size: 0.8rem;
  color: #C23B2E;
  margin: 0 0 8px;
}

.sugerencia-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.sugerencia-descartar {
  background: none;
  border: 1px solid rgba(27, 27, 30, 0.14);
  color: var(--text-secondary);
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencia-descartar:hover { background: var(--surface-alt); }

.sugerencia-aplicar {
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencia-aplicar:hover { background: var(--ink-soft); }

.sugerencia-ver {
  background: none;
  border: 1px solid rgba(27, 27, 30, 0.14);
  color: var(--text-secondary);
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}

.sugerencia-ver:hover {
  border-color: rgba(27, 27, 30, 0.32);
  color: var(--ink);
}

.sugerencia-deshacer,
.sugerencia-reconsiderar {
  background: none;
  border: 1px solid rgba(27, 27, 30, 0.14);
  color: var(--text-secondary);
  border-radius: var(--border-radius-small);
  padding: 6px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencia-deshacer:hover,
.sugerencia-reconsiderar:hover { background: var(--surface-alt); }

.sugerencia-card--descartada {
  opacity: 0.55;
}

.sugerencia-descartada-label {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0 0 10px;
}

.sugerencia-aplicada-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  margin: 0;
}

.error-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  justify-content: center;
}

.error-text {
  font-size: 0.88rem;
  color: var(--q-negative);
}

/* ==============================
   Edición del Word: avisos y sugerencias aplicables
   ============================== */
.documento-aviso {
  flex-shrink: 0;
  margin: 0;
  padding: 8px 20px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #3a3a40;
  background: #eef3fb;
  border-bottom: 1px solid rgba(27, 27, 30, 0.08);
}

.documento-aviso--ayuda { color: #6a6a72; background: #fff; }
.documento-aviso--editor { color: #7a3d14; background: #fdf1e6; }

.sugerencias-rail .sugerencia-acciones {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.sugerencias-rail .sugerencia-aplicar {
  background: var(--lc-accent);
  color: var(--lc-ink);
  border: none;
  border-radius: var(--border-radius-small);
  padding: 7px 12px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencias-rail .sugerencia-aplicar:hover { background: var(--lc-accent-hover); color: #fff; }

.sugerencias-rail .sugerencia-error {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: #C23B2E;
}

/* Base legal plegada: se abre con un clic, no aparece "de golpe". */
.sugerencia-base {
  margin-top: 10px;
  border: 1px solid var(--lc-border-strong);
  border-radius: var(--border-radius-small);
  background: var(--lc-surface-alt);
}

.sugerencia-base summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lc-text);
  cursor: pointer;
  list-style: none;
}

.sugerencia-base summary::-webkit-details-marker { display: none; }
.sugerencia-base summary::after { content: '▸'; margin-left: auto; color: var(--lc-text-faint); }
.sugerencia-base[open] summary::after { content: '▾'; }

.sugerencia-base-etiqueta {
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.sugerencia-base-texto {
  margin: 0;
  padding: 0 10px 10px;
  font-size: 0.82rem;
  line-height: 1.5;
  font-style: italic;
  color: var(--lc-text-muted);
}

.sugerencias-aplicadas {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--lc-border-strong);
}

.sugerencias-aplicadas-titulo {
  margin: 0 0 8px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--lc-text-muted);
}

.sugerencia-aplicada-fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
}

.sugerencia-aplicada-texto {
  min-width: 0;
  font-size: 0.85rem;
  color: #2F8F5E;
}

.sugerencias-rail .sugerencia-deshacer {
  background: none;
  border: 1px solid var(--lc-border-strong);
  border-radius: var(--border-radius-small);
  padding: 5px 10px;
  color: var(--lc-text-muted);
  font-family: 'Figtree', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.sugerencias-rail .sugerencia-deshacer:hover { color: var(--lc-text); border-color: var(--lc-text-muted); }

/* ==============================
   Pasos 1 y 2: subir el contrato y elegir qué hacer con él
   ============================== */
.etapa-centro {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}

.subir-zona {
  width: 100%;
  max-width: 620px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 32px;
  border: 2px dashed var(--lc-border-strong);
  border-radius: 18px;
  background: var(--lc-surface-alt);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s, transform 0.18s;
}

.subir-zona:hover,
.subir-zona:focus-visible,
.subir-zona--arrastrando {
  border-color: var(--lc-accent);
  background: var(--lc-accent-soft);
  outline: none;
}

.subir-zona--arrastrando { transform: scale(1.01); }
.subir-zona--leyendo { cursor: progress; }

.subir-icono {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  margin-bottom: 8px;
}

.subir-titulo {
  margin: 0;
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--lc-text);
}

.subir-sub {
  margin: 0;
  font-size: 0.92rem;
  color: var(--lc-text-muted);
}

.subir-boton {
  margin-top: 14px;
  padding: 10px 22px;
  border-radius: 999px;
  background: var(--lc-accent);
  color: var(--lc-ink);
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
}

.etapa-error {
  margin-top: 12px;
  text-align: center;
}

.elegir-tarjeta {
  width: 100%;
  max-width: 720px;
  padding: 28px;
  border: 1px solid var(--lc-border);
  border-radius: 18px;
  background: var(--lc-surface);
  box-shadow: 0 12px 40px -18px rgba(23, 33, 27, 0.20);
}

.elegir-archivo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--lc-surface-alt);
  color: var(--lc-accent);
}

.elegir-archivo-nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Figtree', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--lc-text);
}

.elegir-cambiar {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 2px 4px;
  color: var(--lc-text-muted);
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.elegir-cambiar:hover { color: var(--lc-text); text-decoration: underline; }

.elegir-titulo {
  margin: 22px 0 14px;
  font-family: 'Fraunces', 'EB Garamond', serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--lc-text);
}

.elegir-opciones {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.elegir-opcion {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--lc-border-strong);
  border-radius: 12px;
  background: var(--lc-surface-alt);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, background-color 0.18s, transform 0.18s;
}

.elegir-opcion:hover:not(:disabled) {
  border-color: var(--lc-accent);
  background: var(--lc-accent-soft);
  transform: translateY(-1px);
}

.elegir-opcion:disabled { opacity: 0.5; cursor: not-allowed; }

.elegir-opcion-titulo {
  font-family: 'Figtree', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--lc-text);
}

.elegir-opcion-desc {
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--lc-text-muted);
}

.elegir-pregunta {
  margin-top: 18px;
}

.elegir-pregunta-label {
  display: block;
  margin-bottom: 8px;
  font-family: 'Figtree', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--lc-text-muted);
}

.elegir-pregunta .composer-pill {
  padding-left: 16px;
}

@media (max-width: 600px) {
  .chat-wrapper {
    height: 70vh;
    min-height: 420px;
  }

  .msg-bubble-user { max-width: 88%; }

  .elegir-opciones { grid-template-columns: 1fr; }
  .elegir-tarjeta { padding: 20px; }
  .subir-zona { padding: 40px 20px; }
}
</style>
