<template>
  <q-page class="contratos-page">

    <!-- Section header -->
    <div class="page-header">
      <div class="page-header-texto">
        <span class="page-eyebrow">Contratos</span>
        <h1 class="page-title">Gestión de Contratos</h1>
        <p class="page-subtitle">Elige una plantilla, complétala y descárgala lista en Word.</p>
      </div>

      <!-- Guía de 3 pasos: solo muestra en qué parte del flujo está el
           usuario (no navega); se deriva del estado que ya existe. -->
      <ol class="pasos" aria-label="Pasos">
        <li
          class="paso"
          :class="{ 'paso--actual': !currentTemplate, 'paso--hecho': !!currentTemplate }"
          :aria-current="!currentTemplate ? 'step' : undefined"
        >
          <span class="paso-num">
            <q-icon v-if="currentTemplate" name="check" size="14px" />
            <template v-else>1</template>
          </span>
          <span class="paso-texto">Elige</span>
        </li>
        <li class="paso-linea" :class="{ 'paso-linea--llena': !!currentTemplate }" aria-hidden="true"></li>
        <li
          class="paso"
          :class="{ 'paso--actual': !!currentTemplate && !modoEdicion, 'paso--hecho': modoEdicion }"
          :aria-current="currentTemplate && !modoEdicion ? 'step' : undefined"
        >
          <span class="paso-num">
            <q-icon v-if="modoEdicion" name="check" size="14px" />
            <template v-else>2</template>
          </span>
          <span class="paso-texto">Revisa</span>
        </li>
        <li class="paso-linea" :class="{ 'paso-linea--llena': modoEdicion }" aria-hidden="true"></li>
        <li
          class="paso"
          :class="{ 'paso--actual': modoEdicion }"
          :aria-current="modoEdicion ? 'step' : undefined"
        >
          <span class="paso-num">3</span>
          <span class="paso-texto">Edita y descarga</span>
        </li>
      </ol>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Columna Izquierda: Templates (se puede plegar para ganar espacio) -->
      <div class="col-12 col-md-4 col-plantillas" :class="{ 'col-plantillas--cerrada': !plantillasAbiertas }">
        <Transition name="plegar" mode="out-in">
        <!-- Plegada: riel angosto para volver a abrirla -->
        <button
          v-if="!plantillasAbiertas"
          key="riel"
          type="button"
          class="plantillas-riel"
          aria-label="Mostrar plantillas"
          @click="plantillasAbiertas = true"
        >
          <span class="plantillas-riel-boton">
            <q-icon name="chevron_right" size="20px" />
          </span>
          <span class="plantillas-riel-texto">Plantillas</span>
          <span v-if="templates.length" class="lx-contador">{{ templates.length }}</span>
          <q-tooltip class="lx-tooltip" anchor="center right" self="center left">Mostrar plantillas</q-tooltip>
        </button>

        <div v-else key="lista" class="lx-card">
          <div class="lx-card-header">
            <div class="lx-card-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
              Plantillas
              <span v-if="templates.length" class="lx-contador">{{ templates.length }}</span>
            </div>
            <div class="row no-wrap items-center">
              <q-btn flat round dense icon="refresh" class="lx-icon-btn" @click="store.fetchTemplates()" :loading="isLoading" size="sm">
                <q-tooltip class="lx-tooltip">Actualizar lista</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="chevron_left" class="lx-icon-btn-plegar" size="sm" aria-label="Ocultar plantillas" @click="plantillasAbiertas = false">
                <q-tooltip class="lx-tooltip">Ocultar lista</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div class="lx-card-body q-pa-none">
            <!-- Cargando la primera vez: renglones fantasma en vez de vacío -->
            <div v-if="isLoading && templates.length === 0" class="templates-skeleton" aria-hidden="true">
              <div v-for="n in 4" :key="n" class="templates-skeleton-fila">
                <q-skeleton type="rect" width="38px" height="38px" class="templates-skeleton-icono" />
                <div class="col">
                  <q-skeleton type="text" width="70%" />
                  <q-skeleton type="text" width="45%" />
                </div>
              </div>
            </div>

            <q-list v-else class="templates-list">
              <q-item
                v-for="template in templates"
                :key="template.id"
                clickable v-ripple
                class="template-item"
                :active="currentTemplate?.id === template.id"
                @click="selectTemplate(template)"
              >
                <q-item-section avatar>
                  <div class="template-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>
                    </svg>
                  </div>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium template-item-name">{{ template.name }}</q-item-label>
                  <q-item-label caption lines="2" class="template-item-desc">{{ template.description }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="chevron_right" class="template-item-flecha" />
                </q-item-section>
              </q-item>

              <q-item v-if="templates.length === 0 && !isLoading">
                <q-item-section class="text-center empty-state-text">
                  <q-icon name="inventory_2" size="30px" class="q-mb-sm empty-state-icono" />
                  No hay plantillas disponibles
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
        </Transition>
      </div>

      <!-- Columna Derecha -->
      <div class="col-12 col-md-8 col-trabajo" :class="{ 'col-trabajo--amplia': !plantillasAbiertas }">

        <!-- VISTA PREVIA DEL PDF -->
        <div class="lx-card" v-if="!modoEdicion">
          <div class="lx-card-header lx-card-header--wrap">
            <div class="lx-card-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span v-if="currentTemplate" class="vista-titulo">
                <span class="vista-titulo-etiqueta">Vista previa</span>
                <span class="vista-titulo-nombre">{{ currentTemplate.name }}</span>
              </span>
              <template v-else>Asistente de contratos</template>
              <span v-if="currentTemplate" class="lx-formato">{{ esWordTemplate ? 'Word' : 'PDF' }}</span>
            </div>
            <div v-if="currentTemplate" class="vista-acciones">
              <q-btn
                flat no-caps
                icon="arrow_back"
                label="Buscar otro"
                class="lx-btn-sutil"
                @click="volverAlAsistente"
              />
              <q-btn
                v-if="modoWordFiel || textoHtml"
                outline no-caps
                icon="file_download"
                label="Descargar"
                class="lx-btn-secundario"
                :loading="descargandoWord"
                @click="descargarWord"
              >
                <q-tooltip class="lx-tooltip">Descarga el contrato en Word (.docx) tal como se ve</q-tooltip>
              </q-btn>
              <q-btn
                v-if="pdfDoc || (esWordTemplate && textoHtml)"
                color="accent"
                icon="edit"
                label="Editar contrato"
                @click="abrirEditor"
                unelevated no-caps
                :loading="extrayendoTexto"
                class="lx-action-btn"
              />
            </div>
          </div>
          <p v-if="!modoEdicion && avisoDescargaWord" class="download-aviso vista-aviso">{{ avisoDescargaWord }}</p>

          <div class="lx-card-body editor-content">
            <!-- Asistente: el usuario describe con sus palabras el contrato
                 que necesita y se le ofrecen las plantillas que corresponden.
                 Al elegir una, sigue el flujo de siempre (vista previa →
                 Editar Contrato → manual o con IA). -->
            <div
              v-if="!currentTemplate"
              class="asistente"
              :class="{ 'asistente--inicio': asistenteMensajes.length === 1 }"
            >
              <!-- Portada: solo antes de la primera pregunta -->
              <div v-if="asistenteMensajes.length === 1" class="asistente-portada">
                <span class="asistente-insignia">
                  <span class="asistente-insignia-punto" aria-hidden="true"></span>
                  Asistente con IA
                </span>
                <h2 class="asistente-titular">
                  ¿Qué <em>contrato</em> necesitas hoy?
                </h2>
                <p class="asistente-bajada">
                  Descríbelo con tus palabras y LexIT te recomienda la plantilla adecuada.
                </p>
              </div>

              <!-- Conversación: aparece desde la primera pregunta. Se oculta
                   (no se quita) en la portada porque el script hace scroll
                   sobre este elemento. -->
              <div v-show="asistenteMensajes.length > 1" class="asistente-chat-cabecera">
                <span class="asistente-monograma" aria-hidden="true">L</span>
                <div class="asistente-chat-cabecera-texto">
                  <span class="asistente-chat-nombre">LexIT</span>
                  <span class="asistente-chat-estado">
                    <span class="asistente-estado-punto" :class="{ 'asistente-estado-punto--activo': asistenteCargando }" aria-hidden="true"></span>
                    {{ asistenteCargando ? 'Buscando plantillas…' : 'Listo para ayudarte' }}
                  </span>
                </div>
              </div>

              <div
                v-show="asistenteMensajes.length > 1"
                ref="asistenteMensajesRef"
                class="chat-edicion-mensajes asistente-mensajes"
              >
                <div
                  v-for="(msg, idx) in asistenteMensajes"
                  :key="idx"
                  :class="['chat-edicion-fila', msg.esIA ? 'chat-edicion-fila--ia' : 'chat-edicion-fila--user']"
                >
                  <span v-if="msg.esIA" class="asistente-monograma asistente-monograma--chico" aria-hidden="true">L</span>
                  <div class="asistente-bloque" :class="{ 'asistente-bloque--user': !msg.esIA }">
                    <div :class="['chat-edicion-burbuja', msg.esIA ? 'chat-edicion-burbuja--ia' : 'chat-edicion-burbuja--user']">
                      {{ msg.contenido }}
                    </div>
                    <div v-if="msg.plantillas?.length" class="asistente-plantillas">
                      <button
                        v-for="(plantilla, pi) in msg.plantillas"
                        :key="plantilla.id"
                        type="button"
                        class="asistente-plantilla"
                        :style="{ '--d': `${pi * 70}ms` }"
                        @click="selectTemplate(plantilla)"
                      >
                        <span class="asistente-plantilla-icono">
                          <q-icon name="description" size="20px" />
                        </span>
                        <span class="asistente-plantilla-texto">
                          <span class="asistente-plantilla-nombre">{{ plantilla.name }}</span>
                          <span v-if="plantilla.description" class="asistente-plantilla-desc">{{ plantilla.description }}</span>
                        </span>
                        <span class="asistente-plantilla-accion">
                          Usar
                          <q-icon name="arrow_forward" size="15px" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="asistenteCargando" class="chat-edicion-fila chat-edicion-fila--ia">
                  <span class="asistente-monograma asistente-monograma--chico" aria-hidden="true">L</span>
                  <div class="lx-pensando">
                    <span class="lx-pensando-puntos" aria-hidden="true"><span></span><span></span><span></span></span>
                    <span class="chat-edicion-hint-muted">Buscando el contrato adecuado...</span>
                  </div>
                </div>
              </div>

              <!-- Campo para escribir -->
              <div class="asistente-composer">
                <q-icon name="search" size="22px" class="asistente-composer-icono" />
                <q-input
                  v-model="asistenteRespuesta"
                  borderless
                  dense
                  class="col asistente-composer-input"
                  :placeholder="asistenteMensajes.length === 1 ? 'Ej.: quiero alquilar mi departamento' : 'Escribe tu respuesta...'"
                  :disable="asistenteCargando"
                  maxlength="1000"
                  @keyup.enter="enviarAsistente"
                />
                <q-btn
                  color="accent"
                  icon="arrow_upward"
                  round
                  unelevated
                  class="asistente-composer-enviar"
                  aria-label="Enviar"
                  @click="enviarAsistente"
                  :loading="asistenteCargando"
                  :disable="!asistenteRespuesta.trim()"
                />
              </div>

              <!-- Ideas rápidas: solo escriben el ejemplo en el campo; el
                   usuario lo envía (o lo ajusta) como siempre. -->
              <template v-if="asistenteMensajes.length === 1 && !asistenteCargando">
                <div class="asistente-ideas-titulo">O empieza con una idea</div>
                <div class="asistente-ideas">
                  <button
                    v-for="(idea, ii) in [
                      { icono: 'home_work', titulo: 'Alquiler', texto: 'Quiero alquilar mi departamento' },
                      { icono: 'directions_car', titulo: 'Compraventa', texto: 'Quiero vender mi auto' },
                      { icono: 'badge', titulo: 'Trabajo', texto: 'Necesito contratar a un trabajador' },
                      { icono: 'payments', titulo: 'Préstamo', texto: 'Quiero prestarle dinero a un amigo' },
                      { icono: 'storefront', titulo: 'Local comercial', texto: 'Voy a alquilar un local para mi negocio' },
                      { icono: 'handshake', titulo: 'Servicios', texto: 'Quiero contratar los servicios de un profesional' }
                    ]"
                    :key="idea.titulo"
                    type="button"
                    class="asistente-idea"
                    :class="{ 'asistente-idea--elegida': asistenteRespuesta === idea.texto }"
                    :style="{ '--d': `${ii * 60}ms` }"
                    @click="asistenteRespuesta = idea.texto"
                  >
                    <span class="asistente-idea-icono">
                      <q-icon :name="idea.icono" size="20px" />
                    </span>
                    <span class="asistente-idea-titulo">{{ idea.titulo }}</span>
                    <span class="asistente-idea-texto">{{ idea.texto }}</span>
                  </button>
                </div>

                <ul class="asistente-ventajas">
                  <li v-if="templates.length"><q-icon name="folder_open" size="16px" />{{ templates.length }} plantillas disponibles</li>
                  <li><q-icon name="edit_note" size="16px" />Complétalas a mano o con IA</li>
                  <li><q-icon name="file_download" size="16px" />Descarga en Word</li>
                </ul>
              </template>
            </div>

            <div v-else-if="loadingPdf" class="pdf-loading">
              <!-- Hoja que se "escribe" mientras carga la plantilla -->
              <div class="hoja-cargando" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <p class="pdf-loading-texto">Preparando la plantilla...</p>
            </div>

            <div v-else-if="pdfError" class="pdf-error row items-center justify-center">
              <div class="text-center">
                <q-icon name="error_outline" size="40px" class="pdf-error-icono" />
                <p class="pdf-error-texto q-mt-md">{{ pdfError }}</p>
                <q-btn color="accent" icon="refresh" label="Reintentar" @click="esWordTemplate ? loadWordPreview() : loadPDFPreview()" class="q-mt-md lx-action-btn" unelevated no-caps />
              </div>
            </div>

            <!-- Word: vista fiel (docx-preview), tal como es la plantilla —
                 con las ediciones hechas en "Editar Contrato". -->
            <div v-else-if="modoWordFiel" class="contrato-vista-word">
              <VistaWord :html="htmlVistaWordEditado || htmlVistaWord" :estilos="estilosVistaWord" />
            </div>

            <!-- Word (respaldo): si la vista fiel no se pudo dibujar, o después
                 de "Completar con IA" — el HTML extraído, como hoja continua. -->
            <div v-else-if="esWordTemplate && textoHtml" class="word-preview-container">
              <div
                class="document-preview"
                :style="plantillaFuenteDetectada ? { fontFamily: `'${plantillaFuenteDetectada}', serif` } : undefined"
                v-html="textoHtml"
              ></div>
            </div>

            <div v-else-if="pdfDoc" class="pdf-canvas-container">
              <canvas ref="pdfCanvas" class="pdf-canvas" />
              <div class="paginador">
                <q-btn flat round dense icon="chevron_left" class="paginador-btn" aria-label="Página anterior"
                  :disable="currentPage <= 1 || isRendering" @click="prevPage" />
                <span class="page-indicator-text">Página <strong>{{ currentPage }}</strong> de {{ numPages }}</span>
                <q-btn flat round dense icon="chevron_right" class="paginador-btn" aria-label="Página siguiente"
                  :disable="currentPage >= numPages || isRendering" @click="nextPage" />
              </div>
            </div>
          </div>
        </div>

        <!-- EDITOR DE CONTRATO -->
        <div class="lx-card lx-card--editor" v-if="modoEdicion">
          <!-- "Finalizando contrato…": pantalla breve sobre el editor antes
               de mostrar el panel de descarga (ver finalizarContrato). -->
          <Transition name="finalizando">
            <div v-if="finalizando" class="finalizando" role="status" aria-live="polite">
              <div class="finalizando-caja">
                <div class="finalizando-hoja" aria-hidden="true">
                  <span></span><span></span><span></span><span></span><span></span>
                  <div class="finalizando-sello">
                    <q-icon name="draw" size="18px" />
                  </div>
                </div>
                <div class="finalizando-titulo">Finalizando tu contrato…</div>
                <ul class="finalizando-pasos">
                  <li
                    v-for="(paso, pi) in PASOS_FINALIZANDO"
                    :key="paso"
                    :class="{ 'finalizando-paso--hecho': pi < pasoFinalizando, 'finalizando-paso--actual': pi === pasoFinalizando }"
                  >
                    <span class="finalizando-paso-marca">
                      <q-icon v-if="pi < pasoFinalizando" name="check" size="13px" />
                      <q-spinner v-else-if="pi === pasoFinalizando" size="12px" />
                    </span>
                    {{ paso }}
                  </li>
                </ul>
                <div class="finalizando-barra">
                  <span :style="{ width: `${((pasoFinalizando + 1) / PASOS_FINALIZANDO.length) * 100}%` }"></span>
                </div>
              </div>
            </div>
          </Transition>

          <div class="lx-card-header lx-card-header--wrap">
            <div class="lx-card-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
              <span class="vista-titulo">
                <span class="vista-titulo-etiqueta">Editando</span>
                <span class="vista-titulo-nombre">{{ currentTemplate?.name }}</span>
              </span>
            </div>
            <div class="vista-acciones">
              <q-btn flat no-caps icon="arrow_back" label="Vista previa" class="lx-btn-sutil" @click="modoEdicion = false" />
              <q-btn
                v-if="!contratoListo"
                color="accent"
                icon="task_alt"
                label="Finalizar contrato"
                unelevated no-caps
                class="lx-action-btn"
                :disable="finalizando"
                @click="finalizarContrato"
              />
            </div>
          </div>

          <!-- Contrato listo: descarga arriba, a la vista -->
          <div ref="contratoListoRef">
            <Transition name="listo">
              <div v-if="contratoListo" class="contrato-listo">
                <div class="contrato-listo-check" aria-hidden="true">
                  <svg viewBox="0 0 52 52" width="30" height="30">
                    <circle cx="26" cy="26" r="24" fill="none" />
                    <path d="M15 27l7 7 15-16" fill="none" />
                  </svg>
                </div>
                <div class="contrato-listo-texto">
                  <div class="contrato-listo-titulo">¡Tu contrato está listo!</div>
                  <div class="contrato-listo-desc">
                    <strong>{{ currentTemplate?.name }}</strong> · Documento Word (.docx), listo para imprimir o enviar.
                  </div>
                  <p v-if="avisoDescargaWord" class="download-aviso q-mt-xs q-mb-none">{{ avisoDescargaWord }}</p>
                </div>
                <div class="contrato-listo-acciones">
                  <q-btn
                    color="accent"
                    icon="file_download"
                    label="Descargar Word"
                    @click="descargarWord"
                    :loading="descargandoWord"
                    unelevated no-caps
                    class="download-btn download-btn--primary"
                  />
                  <q-btn
                    flat no-caps
                    icon="edit"
                    label="Seguir editando"
                    class="lx-btn-sutil"
                    @click="contratoListo = false"
                  />
                </div>
              </div>
            </Transition>
          </div>

          <!-- Tabs: Manual / Chat -->
          <q-tabs v-model="tabEdicion" color="grey-8" active-color="accent" class="lx-tabs" align="left" no-caps indicator-color="transparent">
            <q-tab name="manual" icon="edit" label="Editar Manualmente" />
            <q-tab name="chat" icon="chat" label="Completar con IA" />
          </q-tabs>

          <div class="lx-card-body">

            <!-- TAB MANUAL -->
            <div v-if="tabEdicion === 'manual'">
              <!-- Plantilla Word: se edita sobre la vista fiel; la descarga
                   aplica los cambios al Word original conservando el formato. -->
              <template v-if="modoWordFiel">
                <p class="vista-word-ayuda">
                  <q-icon name="edit" class="q-mr-xs" />
                  Edita el texto directamente en el documento. Al descargar, tus cambios se aplican sobre el Word original y se conserva todo su formato.
                </p>
                <div class="contrato-vista-word">
                  <VistaWord editable :html="htmlVistaWordEditado" :estilos="estilosVistaWord" @editar="onEditarVistaWord" />
                </div>
              </template>
              <EditorContrato v-else :model-value="textoHtml" @update:model-value="onEditorHtmlUpdate" />
            </div>

            <!-- TAB CHAT: la IA analiza el contrato y pregunta un dato a la vez
                 hasta completarlo/modificarlo -->
            <div v-if="tabEdicion === 'chat'" class="chat-con-documento">
              <div class="chat-edicion-panel">
                <p class="chat-edicion-hint">
                  <q-icon name="chat" class="q-mr-xs" />
                  LexIT AI te va a preguntar los datos que faltan, uno a la vez.
                </p>

                <div v-if="chatEdicionMensajes.length" ref="chatEdicionMensajesRef" class="chat-edicion-mensajes q-mb-md">
                  <div
                    v-for="(msg, idx) in chatEdicionMensajes"
                    :key="idx"
                    :class="['chat-edicion-fila', msg.esIA ? 'chat-edicion-fila--ia' : 'chat-edicion-fila--user']"
                  >
                    <div v-if="msg.esIA" class="chat-edicion-avatar">
                      <q-icon name="auto_awesome" size="15px" />
                    </div>
                    <div :class="['chat-edicion-burbuja', msg.esIA ? 'chat-edicion-burbuja--ia' : 'chat-edicion-burbuja--user']">
                      {{ msg.contenido }}
                    </div>
                  </div>
                </div>

                <div v-if="chatEdicionCargando" class="lx-pensando q-mb-md">
                  <span class="lx-pensando-puntos" aria-hidden="true"><span></span><span></span><span></span></span>
                  <span class="chat-edicion-hint-muted">LexIT AI está pensando...</span>
                </div>
                <!-- Punto final del chat: se mantiene a la vista mientras la IA responde -->
                <div ref="chatEdicionFinRef"></div>

                <q-btn
                  v-if="!chatEdicionIniciado"
                  color="accent"
                  icon="chat"
                  label="Empezar a completar el contrato con IA"
                  @click="iniciarChatEdicion"
                  :loading="chatEdicionCargando"
                  :disable="!textoEditado"
                  unelevated no-caps
                  class="full-width chat-edicion-start-btn"
                />

                <div v-else-if="!chatEdicionTerminado" class="row q-gutter-sm items-center no-wrap">
                  <q-input
                    v-model="chatEdicionRespuesta"
                    outlined
                    dense
                    class="col chat-edicion-input"
                    placeholder="Escribe tu respuesta..."
                    :disable="chatEdicionCargando"
                    @keyup.enter="enviarRespuestaChatEdicion"
                  />
                  <q-btn
                    color="accent"
                    icon="send"
                    round
                    @click="enviarRespuestaChatEdicion"
                    :loading="chatEdicionCargando"
                    :disable="!chatEdicionRespuesta.trim()"
                  />
                </div>

                <q-banner v-else class="chat-edicion-banner rounded-borders">
                  <template #avatar>
                    <q-icon name="task_alt" color="positive" />
                  </template>
                  El contrato fue actualizado con tus respuestas. Descárgalo arriba o revísalo en "Editar Manualmente".
                </q-banner>

                <p v-if="avisoChatEdicion" class="download-aviso q-mt-sm q-mb-none">{{ avisoChatEdicion }}</p>
                <p v-if="errorChatEdicion" class="lx-error-suave q-mt-sm q-mb-none">
                  <q-icon name="error_outline" size="16px" />
                  {{ errorChatEdicion }}
                </p>
              </div>

              <!-- Documento en vivo: el contrato al lado del chat. Cuando la IA
                   aplica los cambios, se ven aquí resaltados (solo en
                   pantalla; no afecta lo que se descarga). -->
              <aside class="doc-en-vivo" :class="{ 'doc-en-vivo--trabajando': chatEdicionCargando, 'doc-en-vivo--actualizado': chatEdicionTerminado }">
                <div class="doc-en-vivo-cabecera">
                  <span class="doc-en-vivo-titulo">
                    <q-icon name="article" size="18px" />
                    Documento en vivo
                  </span>
                  <Transition name="estado" mode="out-in">
                    <span v-if="chatEdicionCargando" key="trabajando" class="doc-en-vivo-estado doc-en-vivo-estado--trabajando">
                      <q-spinner size="12px" />
                      LexIT está revisando…
                    </span>
                    <span v-else-if="chatEdicionTerminado" key="listo" class="doc-en-vivo-estado doc-en-vivo-estado--listo">
                      <q-icon name="check_circle" size="14px" />
                      {{ cambiosEnVivo ? `Actualizado · ${cambiosEnVivo} ${cambiosEnVivo === 1 ? 'cambio' : 'cambios'}` : 'Documento actualizado' }}
                    </span>
                    <span v-else key="espera" class="doc-en-vivo-estado">
                      Se completará con tus respuestas
                    </span>
                  </Transition>
                </div>
                <div ref="docEnVivoRef" class="doc-en-vivo-cuerpo">
                  <VistaWord v-if="modoWordFiel" :html="htmlDocEnVivo" :estilos="estilosVistaWord" />
                  <div v-else class="word-preview-container doc-en-vivo-texto">
                    <div
                      class="document-preview"
                      :style="plantillaFuenteDetectada ? { fontFamily: `'${plantillaFuenteDetectada}', serif` } : undefined"
                      v-html="htmlTextoEnVivo"
                    ></div>
                  </div>
                  <!-- Línea que recorre la hoja mientras LexIT trabaja -->
                  <div v-if="chatEdicionCargando" class="doc-en-vivo-escaneo" aria-hidden="true"></div>
                </div>
              </aside>
            </div>

          </div>

          <!-- Barra final: terminar de editar (la descarga aparece arriba) -->
          <div v-if="!contratoListo" class="download-bar">
            <div class="download-bar-info">
              <div class="download-bar-icono">
                <q-icon name="description" size="22px" />
              </div>
              <div>
                <div class="download-bar-titulo">¿Terminaste de editar?</div>
                <div class="download-bar-desc">Finaliza el contrato y descárgalo en Word (.docx).</div>
              </div>
            </div>
            <div class="download-bar-actions">
              <q-btn
                color="accent"
                icon="task_alt"
                label="Finalizar contrato"
                @click="finalizarContrato"
                :disable="finalizando"
                unelevated no-caps
                class="download-btn download-btn--primary"
              />
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Dialog de Error -->
    <q-dialog v-model="showErrorDialog">
      <q-card class="lx-dialogo-error">
        <q-card-section class="lx-dialogo-error-cabecera">
          <q-icon name="error_outline" size="22px" />
          <div class="lx-dialogo-error-titulo">Algo salió mal</div>
        </q-card-section>
        <q-card-section class="lx-dialogo-error-texto">{{ error }}</q-card-section>
        <q-card-actions align="right">
          <q-btn unelevated no-caps label="Entendido" color="accent" class="lx-action-btn" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  computed,
  watch,
  nextTick
} from 'vue'
import { storeToRefs } from 'pinia'
import { useContratosStore } from '../stores/contratos-store'
import { useAuthStore } from '../stores/auth'
import type { ContractTemplate } from '../stores/contratos-store'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import { chatEditarContratoIA, recomendarPlantilla, type MensajeChatEdicion, type ResultadoChatEdicion } from '../services/geminiService'
import { buscarPlantillasLocal } from '../utils/buscarPlantilla'
import { exportToWordConMarcaDeAgua } from '../utils/documentExport'
import { extraerHtmlWord } from '../utils/mammothExtractor'
import { subirDocumentoTemporal, descargarWordEditado } from '../services/documentosTemporalesService'
import { renderizarWord } from '../utils/vistaWord'
import { calcularCambios } from '../utils/edicionWord'
import { extraerTextoVisibleDeHtml, aplicarCambiosIAEnHtml } from '../utils/htmlTexto'
import EditorContrato from '../components/EditorContrato.vue'
import VistaWord from '../components/VistaWord.vue'

GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`

// =========================
// STORE
// =========================
const store = useContratosStore()
const { templates, currentTemplate, isLoading, error } = storeToRefs(store)
const authStore = useAuthStore()

// =========================
// PDF NORMAL
// =========================
const pdfCanvas = ref<HTMLCanvasElement | null>(null)
const pdfDoc = shallowRef<PDFDocumentProxy | null>(null)
const currentPage = ref(1)
const numPages = ref(0)
const loadingPdf = ref(false)
const pdfError = ref<string | null>(null)
const isRendering = ref(false)

// =========================
// EDITOR
// =========================
const modoEdicion = ref(false)
const tabEdicion = ref('manual')
const textoEditado = ref('')
const textoHtml = ref('')
const descargandoWord = ref(false)
const extrayendoTexto = ref(false)

// =========================
// CHAT DE EDICIÓN CON IA (tab "Completar con IA")
// =========================
const chatEdicionMensajes = ref<MensajeChatEdicion[]>([])
// Historial real enviado/recibido de la IA — arranca con el mensaje
// disparador (ver MENSAJE_INICIAL_CHAT_EDICION) como turno 'user', porque
// la API de Gemini exige que el primer turno del historial sea 'user'.
// chatEdicionMensajes es solo para mostrar en pantalla (no incluye ese
// disparador, que el usuario nunca escribió) — sin este historial aparte,
// el segundo mensaje del usuario mandaba un historial que empezaba en
// 'model' y la API lo rechazaba.
const chatEdicionHistorialIA = ref<MensajeChatEdicion[]>([])
const chatEdicionIniciado = ref(false)
const chatEdicionTerminado = ref(false)
const chatEdicionCargando = ref(false)
const chatEdicionRespuesta = ref('')
const errorChatEdicion = ref('')
// Resultado de aplicar los cambios de la IA sobre el Word (si alguno no se
// pudo ubicar en el documento).
const avisoChatEdicion = ref('')

// El chat baja solo al último mensaje (y al "está pensando...") cada vez
// que llega un mensaje o la IA empieza a responder, para que el usuario no
// tenga que desplazarse a mano.
const chatEdicionMensajesRef = ref<HTMLElement | null>(null)
const chatEdicionFinRef = ref<HTMLElement | null>(null)

function bajarChatEdicion() {
  void nextTick(() => {
    const lista = chatEdicionMensajesRef.value
    if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' })
    chatEdicionFinRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

watch(() => [chatEdicionMensajes.value.length, chatEdicionCargando.value], bajarChatEdicion)
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const onEditorHtmlUpdate = (html: string) => {
  textoHtml.value = html
  textoEditado.value = stripHtml(html)
}

// =========================
// DIALOG ERROR
// =========================
const showErrorDialog = computed({
  get: () => !!error.value,
  set: (val: boolean) => { if (!val) error.value = null }
})

// =========================
// MOUNT / UNMOUNT
// =========================
onMounted(async () => {
  await store.fetchTemplates()
})

onUnmounted(() => {
  if (pdfDoc.value) { void pdfDoc.value.destroy(); pdfDoc.value = null }
})

// =========================
// SELECCIONAR TEMPLATE
// =========================
const selectTemplate = (template: ContractTemplate) => {
  store.setCurrentTemplate(template)
  modoEdicion.value = false
  textoEditado.value = ''
  textoHtml.value = ''
  plantillaFuenteDetectada.value = undefined
  reiniciarVistaWord()
  reiniciarChatEdicion()
}

// =========================
// ASISTENTE DE CONTRATOS
// El usuario describe el contrato con sus palabras ("alquilar mi depa") y
// la IA (Cloud Function recomendarPlantillaIA) ofrece las plantillas que
// corresponden. Si la IA no responde, se busca por palabras clave
// (utils/buscarPlantilla.ts) para no dejar al usuario sin opciones.
// =========================
interface MensajeAsistente {
  esIA: boolean
  contenido: string
  plantillas?: ContractTemplate[]
}

const SALUDO_ASISTENTE = '¿Qué tipo de contrato necesitas? Descríbelo con tus palabras, por ejemplo: "alquilar un local", "vender mi auto" o "prestarle algo a un amigo".'

const asistenteMensajes = ref<MensajeAsistente[]>([{ esIA: true, contenido: SALUDO_ASISTENTE }])
const asistenteRespuesta = ref('')
const asistenteCargando = ref(false)
const asistenteMensajesRef = ref<HTMLElement | null>(null)

function bajarAsistente() {
  void nextTick(() => {
    const el = asistenteMensajesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function enviarAsistente() {
  const mensaje = asistenteRespuesta.value.trim()
  if (!mensaje || asistenteCargando.value) return

  const historial = asistenteMensajes.value.map(m => ({ esIA: m.esIA, contenido: m.contenido }))
  asistenteMensajes.value.push({ esIA: false, contenido: mensaje })
  asistenteRespuesta.value = ''
  asistenteCargando.value = true
  bajarAsistente()

  try {
    if (templates.value.length === 0) await store.fetchTemplates()
    const resultado = await recomendarPlantilla(mensaje, historial)
    // El servidor lee las plantillas de Firestore en cada mensaje: si
    // recomienda una que esta página aún no tiene (el admin la subió
    // después de abrirla), se vuelve a cargar la lista.
    if (resultado.plantillas.some(id => !templates.value.some(t => t.id === id))) {
      await store.fetchTemplates()
    }
    const plantillas = resultado.plantillas
      .map(id => templates.value.find(t => t.id === id))
      .filter((t): t is ContractTemplate => !!t)
    asistenteMensajes.value.push({ esIA: true, contenido: resultado.mensaje, plantillas })
  } catch (err) {
    console.error('Error en el asistente de contratos:', err)
    // Respaldo con la lista más reciente de plantillas.
    await store.fetchTemplates()
    const encontradas = buscarPlantillasLocal(mensaje, templates.value)
    asistenteMensajes.value.push(encontradas.length
      ? { esIA: true, contenido: 'No pude consultar a la IA en este momento, pero estas plantillas coinciden con lo que escribiste:', plantillas: encontradas }
      : { esIA: true, contenido: 'No pude consultar a la IA en este momento. Puedes elegir una plantilla de la lista o intentarlo de nuevo en unos segundos.' })
  } finally {
    asistenteCargando.value = false
    bajarAsistente()
  }
}

// Vuelve al asistente para buscar otro contrato (la conversación se conserva).
function volverAlAsistente() {
  store.setCurrentTemplate(null)
  modoEdicion.value = false
  textoEditado.value = ''
  textoHtml.value = ''
  pdfError.value = null
  plantillaFuenteDetectada.value = undefined
  reiniciarVistaWord()
  reiniciarChatEdicion()
  bajarAsistente()
}

// =========================
// EXTRAER TEXTO DEL PDF
// =========================
const extraerTextoPDF = async (pdf: PDFDocumentProxy): Promise<string> => {
  let textoCompleto = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const textoPagina = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textoCompleto += textoPagina + '\n\n'
  }
  return textoCompleto.trim()
}

// =========================
// TEXTO A HTML
// =========================
// Distintas plantillas traen distintos estilos de encabezado de cláusula
// ("CLÁUSULA PRIMERA", "ARTÍCULO 1°", "PRIMERA.-"/"DÉCIMO SEGUNDA.-",
// "1.-", "I.-") — este patrón cubre los formatos comunes en contratos en
// español, no solo el de una plantilla en particular.
const PATRON_ENCABEZADO =
  'CL[ÁA]USULA\\s+[A-ZÁÉÍÓÚÑ0-9]+' +
  '|ART[IÍ]CULO\\s+\\d+°?' +
  '|[A-ZÁÉÍÓÚÑ]{4,}(?:\\s+[A-ZÁÉÍÓÚÑ]{4,}){0,2}\\.-' +
  '|[IVXLCDM]{1,4}\\.-' +
  '|\\d{1,2}\\.-'

const REGEX_SALTO_ANTES_DE_ENCABEZADO = new RegExp(
  `(\\S)(\\s+)(${PATRON_ENCABEZADO}|CONTRATO DE|Definiciones)`,
  'g'
)
const REGEX_LINEA_ES_ENCABEZADO = new RegExp(`^(?:${PATRON_ENCABEZADO})`)

const textoAHtml = (texto: string): string => {
  const procesado = texto
    .replace(REGEX_SALTO_ANTES_DE_ENCABEZADO, '$1\n\n$3')
    .replace(/ {2,}/g, ' ')
    .trim()

  return procesado
    .split('\n')
    .map(linea => {
      linea = linea.trim()
      if (!linea) return '<p style="margin:4px 0;"><br></p>'

      if (linea.startsWith('CONTRATO DE')) {
        return `<p style="text-align:center; font-weight:bold; font-size:14pt; font-family:Times New Roman; margin:16px 0 12px 0;">${linea}</p>`
      }

      if (linea === 'Definiciones') {
        return `<p style="font-weight:bold; font-size:12pt; font-family:Times New Roman; margin:12px 0 6px 0;">${linea}</p>`
      }

      if (REGEX_LINEA_ES_ENCABEZADO.test(linea)) {
        return `<p style="font-weight:bold; font-size:11pt; font-family:Times New Roman; margin:12px 0 4px 0;">${linea}</p>`
      }

      return `<p style="text-align:justify; font-size:11pt; font-family:Times New Roman; margin:2px 0;">${linea}</p>`
    })
    .join('')
}

// =========================
// TIPO DE ARCHIVO DE LA PLANTILLA ACTUAL
// (no hay un campo aparte en Firestore para esto — se infiere de la
// extensión del storage_path, así no hace falta migrar datos existentes)
// =========================
const esWordTemplate = computed(() =>
  /\.docx$/i.test(currentTemplate.value?.storage_path ?? '')
)

// Fuente real del documento (ej. "Aptos", "Calibri") — extraerHtmlWord la
// detecta leyendo word/theme/theme1.xml del .docx, pero antes se
// descartaba: el preview se mostraba SIEMPRE en Times New Roman (fijo en
// el CSS de .document-preview) sin importar la fuente real del original,
// por eso se veía distinto a simple vista. Se guarda para aplicarla tanto
// en la vista previa como al reconstruir la descarga.
const plantillaFuenteDetectada = ref<string | undefined>(undefined)

// =========================
// VISTA Y EDICIÓN FIEL DEL WORD (plantillas .docx subidas en Admin)
// La plantilla se muestra con docx-preview (utils/vistaWord.ts), tal como es
// el Word: fuentes, tamaños, márgenes, tablas, encabezados, pies y logos. Se
// edita sobre esa misma vista y la descarga aplica solo los cambios de texto
// sobre el .docx ORIGINAL (Cloud Function descargarWordEditado), más el
// membrete LEXIT. El HTML de mammoth (textoHtml/textoEditado) se sigue
// generando para "Completar con IA" y el PDF, que no cambian.
//
// Si se usa "Completar con IA", ese resultado viene como texto reescrito y
// se sigue mostrando/descargando como hasta ahora (usandoResultadoIA).
// =========================
const htmlVistaWord = ref('')          // la plantilla tal como se cargó
const htmlVistaWordEditado = ref('')   // con las ediciones del usuario
const estilosVistaWord = ref('')
const archivoPlantillaWord = shallowRef<File | null>(null)
const usandoResultadoIA = ref(false)
const avisoDescargaWord = ref('')
// Copia del .docx original en la carpeta privada del usuario (Storage),
// que es de donde la Cloud Function lo toma para aplicar los cambios.
let storagePathPlantillaTemporal: string | null = null

const modoWordFiel = computed(() => esWordTemplate.value && !!htmlVistaWord.value && !usandoResultadoIA.value)

function reiniciarVistaWord() {
  htmlVistaWord.value = ''
  htmlVistaWordEditado.value = ''
  estilosVistaWord.value = ''
  archivoPlantillaWord.value = null
  usandoResultadoIA.value = false
  avisoDescargaWord.value = ''
  storagePathPlantillaTemporal = null
}

// Texto del cuerpo (sin encabezados/pies) para "Completar con IA".
function textoDelCuerpo(html: string): string {
  return extraerTextoVisibleDeHtml(html.replace(/<(header|footer)\b[\s\S]*?<\/\1>/gi, ''))
}

function onEditarVistaWord(html: string) {
  htmlVistaWordEditado.value = html
  textoEditado.value = textoDelCuerpo(html)
}

async function prepararPlantillaEnStorage(): Promise<string> {
  if (storagePathPlantillaTemporal) return storagePathPlantillaTemporal
  const uid = authStore.user?.uid
  if (!uid) throw new Error('No hay una sesión activa.')
  const original = archivoPlantillaWord.value
  if (!original) throw new Error('No se encontró la plantilla original. Vuelve a seleccionarla.')
  // La Cloud Function exige extensión .docx en la ruta.
  const nombre = /\.docx$/i.test(original.name) ? original.name : `${original.name}.docx`
  const archivo = new File([original], nombre, { type: original.type })
  storagePathPlantillaTemporal = await subirDocumentoTemporal(uid, archivo)
  return storagePathPlantillaTemporal
}

function cambiosDeLaVistaWord() {
  return calcularCambios(htmlVistaWord.value, htmlVistaWordEditado.value || htmlVistaWord.value)
}

// Descarga fiel: Word original + cambios (+ membrete LEXIT si se pide).
async function descargarWordFiel(marcaLexit: boolean) {
  avisoDescargaWord.value = ''
  const cambios = cambiosDeLaVistaWord()
  const storagePath = await prepararPlantillaEnStorage()
  const resultado = await descargarWordEditado(storagePath, cambios, currentTemplate.value?.name || 'contrato', { marcaLexit })
  window.location.href = resultado.url
  if (resultado.fallidos.length > 0) {
    avisoDescargaWord.value = `Se aplicaron ${resultado.aplicados} de ${cambios.length} cambios; ` +
      `${resultado.fallidos.length} no se pudieron aplicar sin alterar el formato. Hazlos directamente en Word.`
  }
}

// =========================
// CARGAR PLANTILLA WORD (mismo rol que loadPDFPreview, pero para .docx —
// no hay "páginas" que renderizar en canvas, se muestra el HTML extraído
// directo, igual que en Consultas)
// =========================
const loadWordPreview = async () => {
  if (!currentTemplate.value?.storage_path) return

  loadingPdf.value = true
  pdfError.value = null
  textoEditado.value = ''
  textoHtml.value = ''
  pdfDoc.value = null
  reiniciarVistaWord()

  try {
    const blob = await store.downloadOriginalPDF(currentTemplate.value.id)
    const archivo = new File(
      [blob],
      currentTemplate.value.name || 'plantilla.docx',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    )
    // HTML de mammoth (para "Completar con IA" y el PDF, como siempre) y la
    // vista fiel del Word. Si la vista fiel fallara, se sigue mostrando la
    // de siempre.
    const [{ html, fuenteDetectada }, vistaFiel] = await Promise.all([
      extraerHtmlWord(archivo),
      renderizarWord(archivo).catch(err => {
        console.error('No se pudo dibujar la vista fiel del Word:', err)
        return null
      })
    ])
    textoHtml.value = html
    textoEditado.value = stripHtml(html)
    plantillaFuenteDetectada.value = fuenteDetectada ?? undefined
    if (vistaFiel) {
      htmlVistaWord.value = vistaFiel.html
      htmlVistaWordEditado.value = vistaFiel.html
      estilosVistaWord.value = vistaFiel.estilos
      archivoPlantillaWord.value = archivo
    }
    loadingPdf.value = false
  } catch (err) {
    console.error('Error cargando plantilla Word:', err)
    pdfError.value = 'No se pudo cargar la plantilla Word'
    loadingPdf.value = false
  }
}

// =========================
// CARGAR PDF NORMAL
// =========================
const loadPDFPreview = async () => {
  if (!currentTemplate.value?.storage_path) return

  loadingPdf.value = true
  pdfError.value = null
  textoEditado.value = ''
  textoHtml.value = ''

  try {
    const blob = await store.downloadOriginalPDF(currentTemplate.value.id)
    const arrayBuffer = await blob.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise

    pdfDoc.value = pdf
    numPages.value = pdf.numPages
    currentPage.value = 1
    loadingPdf.value = false

    setTimeout(() => { void renderPage(1) }, 300)

    // Extraer texto en segundo plano
    const texto = await extraerTextoPDF(pdf)
    textoEditado.value = texto
    textoHtml.value = textoAHtml(texto)

  } catch (err) {
    console.error('Error cargando PDF:', err)
    pdfError.value = 'No se pudo cargar el PDF'
    loadingPdf.value = false
  }
}

// =========================
// ABRIR EDITOR
// =========================
const abrirEditor = async () => {
  if (!textoEditado.value) {
    extrayendoTexto.value = true
    if (pdfDoc.value) {
      const texto = await extraerTextoPDF(pdfDoc.value)
      textoEditado.value = texto
      textoHtml.value = textoAHtml(texto)
    }
    extrayendoTexto.value = false
  }
  modoEdicion.value = true
  tabEdicion.value = 'manual'
}
// =========================
// RENDER PDF NORMAL
// =========================
const renderPage = async (pageNum: number) => {
  if (!pdfDoc.value || !pdfCanvas.value || isRendering.value) return
  isRendering.value = true
  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = pdfCanvas.value
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.height = viewport.height
    canvas.width = viewport.width
    context.clearRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: context, viewport }).promise
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    pdfError.value = 'Error al renderizar PDF'
  } finally {
    isRendering.value = false
  }
}

const prevPage = async () => {
  if (currentPage.value <= 1) return
  currentPage.value--
  await renderPage(currentPage.value)
}

const nextPage = async () => {
  if (currentPage.value >= numPages.value) return
  currentPage.value++
  await renderPage(currentPage.value)
}

// =========================
// CHAT DE EDICIÓN CON IA (tab "Completar con IA")
// =========================
// Debe coincidir con el texto disparador por defecto del lado del
// servidor (functions/src/geminiTools.ts, chatEdicionContratoIA) — no
// afecta la respuesta si difiere, pero mantenerlo igual evita que el
// historial le muestre a la IA dos frases distintas para la misma acción.
const MENSAJE_INICIAL_CHAT_EDICION = 'Analiza el contrato y hazme la primera pregunta para completarlo o modificarlo.'

const reiniciarChatEdicion = () => {
  chatEdicionMensajes.value = []
  chatEdicionHistorialIA.value = []
  chatEdicionIniciado.value = false
  chatEdicionTerminado.value = false
  chatEdicionCargando.value = false
  chatEdicionRespuesta.value = ''
  errorChatEdicion.value = ''
  avisoChatEdicion.value = ''
}

const aplicarResultadoChatEdicion = (textoModificado: string) => {
  textoEditado.value = textoModificado
  textoHtml.value = textoAHtml(textoModificado)
  chatEdicionTerminado.value = true
  // El resultado de la IA es texto reescrito: desde aquí se muestra y
  // descarga como hasta ahora (no con la vista/descarga fiel del Word).
  usandoResultadoIA.value = true
}

// Plantilla Word con vista fiel: la IA ve el texto de esa misma vista y al
// final devuelve reemplazos puntuales ("cambios"), que se aplican sobre el
// Word mostrado — igual que "Aplicar al documento" en Análisis. Así el
// contrato se sigue viendo y descargando idéntico al original (con el
// membrete), solo con los datos completados. PDF: como siempre.
const textoParaChatIA = (): string =>
  modoWordFiel.value ? textoDelCuerpo(htmlVistaWordEditado.value || htmlVistaWord.value) : textoEditado.value

const opcionesChatIA = (): { formato?: 'cambios' } =>
  modoWordFiel.value ? { formato: 'cambios' } : {}

const aplicarCambiosIAEnWord = (cambios: { antes: string; despues: string }[]) => {
  const { html, fallidos } = aplicarCambiosIAEnHtml(htmlVistaWordEditado.value || htmlVistaWord.value, cambios)
  htmlVistaWordEditado.value = html
  textoEditado.value = textoDelCuerpo(html)
  chatEdicionTerminado.value = true

  const aplicados = cambios.length - fallidos.length
  if (cambios.length === 0) {
    avisoChatEdicion.value = 'La IA no propuso cambios al documento.'
  } else if (fallidos.length > 0) {
    const ejemplos = fallidos.slice(0, 3).map(t => `"${t.length > 60 ? `${t.slice(0, 60)}…` : t}"`).join(', ')
    avisoChatEdicion.value = `Se aplicaron ${aplicados} de ${cambios.length} cambios. ` +
      `${fallidos.length} no se encontraron en el documento (${ejemplos}); complétalos en "Editar Manualmente".`
  } else {
    avisoChatEdicion.value = ''
  }
}

const procesarResultadoChatEdicion = (resultado: ResultadoChatEdicion) => {
  if (resultado.tipo !== 'documento_final') return
  if (resultado.cambios && modoWordFiel.value) {
    aplicarCambiosIAEnWord(resultado.cambios)
  } else if (resultado.textoModificado) {
    aplicarResultadoChatEdicion(resultado.textoModificado)
  }
}

const iniciarChatEdicion = async () => {
  if (!textoEditado.value) return
  chatEdicionCargando.value = true
  errorChatEdicion.value = ''
  try {
    const resultado = await chatEditarContratoIA(textoParaChatIA(), [], undefined, opcionesChatIA())
    chatEdicionIniciado.value = true
    chatEdicionMensajes.value.push({ esIA: true, contenido: resultado.mensaje })
    chatEdicionHistorialIA.value.push({ esIA: false, contenido: MENSAJE_INICIAL_CHAT_EDICION })
    chatEdicionHistorialIA.value.push({ esIA: true, contenido: resultado.mensaje })
    procesarResultadoChatEdicion(resultado)
  } catch (err) {
    console.error('Error al iniciar chat de edición:', err)
    errorChatEdicion.value = err instanceof Error ? err.message : 'No se pudo iniciar la conversación con la IA.'
  } finally {
    chatEdicionCargando.value = false
  }
}

const enviarRespuestaChatEdicion = async () => {
  const respuesta = chatEdicionRespuesta.value.trim()
  if (!respuesta || !textoEditado.value) return

  const historialPrevio = [...chatEdicionHistorialIA.value]
  chatEdicionMensajes.value.push({ esIA: false, contenido: respuesta })
  chatEdicionHistorialIA.value.push({ esIA: false, contenido: respuesta })
  chatEdicionRespuesta.value = ''
  chatEdicionCargando.value = true
  errorChatEdicion.value = ''
  try {
    const resultado = await chatEditarContratoIA(textoParaChatIA(), historialPrevio, respuesta, opcionesChatIA())
    chatEdicionMensajes.value.push({ esIA: true, contenido: resultado.mensaje })
    chatEdicionHistorialIA.value.push({ esIA: true, contenido: resultado.mensaje })
    procesarResultadoChatEdicion(resultado)
  } catch (err) {
    console.error('Error al continuar chat de edición:', err)
    errorChatEdicion.value = err instanceof Error ? err.message : 'No se pudo continuar la conversación con la IA.'
    // El mensaje no tuvo respuesta: se saca del historial (si quedara,
    // los siguientes envíos lo mandarían sin su respuesta) y se devuelve
    // al campo de texto para reenviarlo.
    chatEdicionHistorialIA.value = historialPrevio
    chatEdicionMensajes.value.pop()
    chatEdicionRespuesta.value = respuesta
  } finally {
    chatEdicionCargando.value = false
  }
}

// =========================
// HELPER DESCARGA
// =========================
const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// =========================
// DESCARGAR WORD (con marca de agua "LEXIT" y pie de página "Generado
// por LexIT" — descarga final del contrato, no para seguir editando)
// =========================
const descargarWord = async () => {
  // Plantilla Word: el Word original con los cambios y el membrete LEXIT,
  // sin reconstruirlo (mismo formato que la plantilla).
  if (modoWordFiel.value) {
    descargandoWord.value = true
    try {
      await descargarWordFiel(true)
    } catch (err) {
      console.error('Error descargando el Word:', err)
      avisoDescargaWord.value = err instanceof Error ? err.message : 'No se pudo descargar el Word.'
    } finally {
      descargandoWord.value = false
    }
    return
  }
  if (!textoHtml.value) return
  descargandoWord.value = true
  try {
    const blob = await exportToWordConMarcaDeAgua(textoHtml.value, currentTemplate.value?.name || 'contrato', plantillaFuenteDetectada.value)
    triggerDownload(blob, `${currentTemplate.value?.name || 'contrato'}.docx`)
  } catch (err) {
    console.error('Error exportando Word:', err)
  } finally {
    descargandoWord.value = false
  }
}

// =========================
// WATCH TEMPLATE
// =========================
watch(currentTemplate, async (newTemplate) => {
  if (!newTemplate?.storage_path) return
  if (esWordTemplate.value) {
    await loadWordPreview()
  } else {
    await loadPDFPreview()
  }
})

// =========================
// FINALIZAR CONTRATO (solo presentación)
// Pantalla breve de "Finalizando tu contrato…" y luego el panel "Tu contrato
// está listo" arriba del editor, con la descarga en Word (descargarWord, la
// misma de siempre). No cambia el contenido del contrato ni la descarga.
// Se dispara con el botón "Finalizar contrato" o solo cuando la IA termina.
// =========================
const PASOS_FINALIZANDO = ['Aplicando tus cambios', 'Revisando el formato', 'Preparando tu Word']
const finalizando = ref(false)
const pasoFinalizando = ref(0)
const contratoListo = ref(false)
const contratoListoRef = ref<HTMLElement | null>(null)
let temporizadorFinalizando: ReturnType<typeof setTimeout> | null = null

function detenerFinalizacion() {
  if (temporizadorFinalizando) clearTimeout(temporizadorFinalizando)
  temporizadorFinalizando = null
  finalizando.value = false
}

function finalizarContrato() {
  if (finalizando.value) return
  contratoListo.value = false
  finalizando.value = true
  pasoFinalizando.value = 0
  const avanzar = () => {
    if (pasoFinalizando.value < PASOS_FINALIZANDO.length - 1) {
      pasoFinalizando.value++
      temporizadorFinalizando = setTimeout(avanzar, 700)
      return
    }
    temporizadorFinalizando = setTimeout(() => {
      detenerFinalizacion()
      contratoListo.value = true
      void nextTick(() => contratoListoRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    }, 600)
  }
  temporizadorFinalizando = setTimeout(avanzar, 700)
}

// Con la IA: primero se deja ver el documento actualizado (resaltado en
// "Documento en vivo") y luego aparece "Finalizando…".
let temporizadorFinalIA: ReturnType<typeof setTimeout> | null = null
watch(chatEdicionTerminado, (terminado) => {
  if (temporizadorFinalIA) clearTimeout(temporizadorFinalIA)
  temporizadorFinalIA = terminado ? setTimeout(finalizarContrato, 2600) : null
})
onUnmounted(() => { if (temporizadorFinalIA) clearTimeout(temporizadorFinalIA) })

// Al salir del editor o cambiar de plantilla, vuelve a empezar.
watch([modoEdicion, () => currentTemplate.value?.id], () => {
  detenerFinalizacion()
  contratoListo.value = false
})

onUnmounted(detenerFinalizacion)

// =========================
// LISTA DE PLANTILLAS PLEGABLE (solo presentación)
// Se recuerda en este navegador si el usuario la dejó abierta o cerrada.
// =========================
const CLAVE_LISTA_PLANTILLAS = 'lexit.contratos.listaPlantillasAbierta'

function leerListaAbierta(): boolean {
  try {
    return localStorage.getItem(CLAVE_LISTA_PLANTILLAS) !== '0'
  } catch {
    return true
  }
}

const plantillasAbiertas = ref(leerListaAbierta())
watch(plantillasAbiertas, (abierta) => {
  try {
    localStorage.setItem(CLAVE_LISTA_PLANTILLAS, abierta ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado): solo no se recuerda.
  }
})

// =========================
// DOCUMENTO EN VIVO (tab "Completar con IA", solo presentación)
// Muestra el contrato al lado del chat y, cuando la IA aplica sus cambios,
// resalta los párrafos que cambiaron y los lleva a la vista. El resaltado
// vive solo en la copia que se muestra aquí (htmlDocEnVivo): el documento
// que se edita y se descarga no lleva marcas.
// =========================
const htmlAntesDeIA = ref('')
const textoHtmlAntesDeIA = ref('')
const docEnVivoRef = ref<HTMLElement | null>(null)

// Foto del documento justo antes de la primera respuesta de la IA, para
// saber después qué párrafos cambió ella (y no el usuario a mano).
watch(chatEdicionCargando, (cargando) => {
  if (cargando && !chatEdicionIniciado.value) {
    htmlAntesDeIA.value = htmlVistaWordEditado.value || htmlVistaWord.value
    textoHtmlAntesDeIA.value = textoHtml.value
  }
})

const parrafosCambiadosIA = computed<number[]>(() => {
  if (!modoWordFiel.value || !chatEdicionTerminado.value || !htmlAntesDeIA.value) return []
  return calcularCambios(htmlAntesDeIA.value, htmlVistaWordEditado.value || htmlVistaWord.value)
    .map(c => c.indice)
    .filter((i): i is number => i !== undefined)
})

const htmlDocEnVivo = computed(() => {
  const base = htmlVistaWordEditado.value || htmlVistaWord.value
  if (parrafosCambiadosIA.value.length === 0) return base
  const contenedor = document.createElement('div')
  contenedor.innerHTML = base
  for (const indice of parrafosCambiadosIA.value) {
    contenedor.querySelector(`[data-p="${indice}"]`)?.classList.add('lx-cambio-ia')
  }
  return contenedor.innerHTML
})

// PDF (o Word sin vista fiel): el contrato se muestra como texto; se
// resaltan los párrafos que no estaban antes de la IA.
const textoDeParrafo = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

const parrafosTextoCambiadosIA = computed<number[]>(() => {
  if (modoWordFiel.value || !chatEdicionTerminado.value || !textoHtmlAntesDeIA.value) return []
  const antes = document.createElement('div')
  antes.innerHTML = textoHtmlAntesDeIA.value
  const previos = new Set(Array.from(antes.querySelectorAll('p'), textoDeParrafo))
  const ahora = document.createElement('div')
  ahora.innerHTML = textoHtml.value
  const cambiados: number[] = []
  ahora.querySelectorAll('p').forEach((p, i) => {
    const texto = textoDeParrafo(p)
    if (texto && !previos.has(texto)) cambiados.push(i)
  })
  return cambiados
})

const htmlTextoEnVivo = computed(() => {
  if (parrafosTextoCambiadosIA.value.length === 0) return textoHtml.value
  const contenedor = document.createElement('div')
  contenedor.innerHTML = textoHtml.value
  const parrafos = contenedor.querySelectorAll('p')
  for (const i of parrafosTextoCambiadosIA.value) parrafos[i]?.classList.add('lx-cambio-ia')
  return contenedor.innerHTML
})

const cambiosEnVivo = computed(() =>
  modoWordFiel.value ? parrafosCambiadosIA.value.length : parrafosTextoCambiadosIA.value.length
)

// Lleva a la vista el primer párrafo cambiado (VistaWord tarda un momento
// en dibujar el documento nuevo).
let temporizadorDocEnVivo: ReturnType<typeof setTimeout> | null = null
watch([htmlDocEnVivo, htmlTextoEnVivo], () => {
  if (!chatEdicionTerminado.value) return
  if (temporizadorDocEnVivo) clearTimeout(temporizadorDocEnVivo)
  temporizadorDocEnVivo = setTimeout(() => {
    docEnVivoRef.value?.querySelector('.lx-cambio-ia')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 700)
})
onUnmounted(() => { if (temporizadorDocEnVivo) clearTimeout(temporizadorDocEnVivo) })
</script>

<style scoped>
/* ==============================
   Paleta clara verde-bosque/beige (misma familia que LandingPage.vue),
   variables propias con prefijo lx-, definidas solo dentro de
   .contratos-page. No se tocan las variables globales (--surface, --bg,
   etc. en src/css/app.scss).
   ============================== */
.contratos-page {
  --lx-bg: var(--lexit-blanco);
  --lx-surface: var(--lexit-blanco);
  --lx-surface-alt: var(--lexit-marfil);
  --lx-surface-sunken: var(--lexit-marfil-suave);
  --lx-border: var(--lexit-marfil);
  --lx-border-strong: rgba(var(--lexit-verde-rgb), 0.18);
  --lx-text: var(--lexit-verde);
  --lx-text-muted: var(--lexit-texto-secundario);
  --lx-text-faint: var(--lexit-texto-tenue);
  --lx-accent: var(--lexit-verde);
  --lx-accent-hover: rgba(var(--lexit-verde-rgb), 0.85);
  --lx-accent-soft: var(--lexit-marfil-suave);
  --lx-accent-soft-strong: var(--lexit-marfil);
  --lx-ink: var(--lexit-blanco-calido);

  animation: floatUp 0.5s ease-out both;
}

/* .q-page trae max-width:1400px + margin:0 auto de MainLayout.vue (regla
   compartida por toda la app) — eso centra una columna angosta dejando ver
   el fondo claro de .page-container a los costados en pantallas anchas.
   (Un intento anterior con un ::before de position:fixed no funcionaba: al
   no crear .contratos-page su propio contexto de apilamiento, ese
   pseudo-elemento con z-index:-1 quedaba pintado DETRÁS del fondo de
   .page-container, no encima). La solución real es anular el ancho máximo
   y el centrado solo para esta página — mayor especificidad que ".q-page"
   (dos clases contra una) para que gane sin tocar esa regla compartida. */
.q-page.contratos-page {
  background: var(--lx-bg);
  max-width: none;
  margin: 0;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ==============================
   Section header
   ============================== */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px 32px;
  margin-bottom: 26px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--lx-border);
}

.page-eyebrow {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lx-text-faint);
  margin-bottom: 6px;
}

.page-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: clamp(2rem, 3.4vw, 2.6rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--lx-text);
}

.page-subtitle {
  margin: 6px 0 0;
  color: var(--lx-text-muted);
  font-size: 1.02rem;
}

/* Pasos 1 · 2 · 3 */
.pasos {
  display: flex;
  align-items: center;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.paso {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--lx-text-faint);
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 0.92rem;
  font-weight: 600;
  transition: color 0.3s ease;
}

.paso-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--lx-border-strong);
  background: var(--lx-surface);
  font-size: 0.8rem;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.paso--hecho { color: var(--lx-text-muted); }

.paso--hecho .paso-num {
  background: var(--lx-accent-soft-strong);
  border-color: var(--lx-accent-soft-strong);
  color: var(--lx-text);
}

.paso--actual { color: var(--lx-text); }

.paso--actual .paso-num {
  background: var(--lx-accent);
  border-color: var(--lx-accent);
  color: var(--lx-ink);
  box-shadow: 0 0 0 4px var(--lx-accent-soft);
}

.paso-linea {
  width: 34px;
  height: 1px;
  background: var(--lx-border);
  position: relative;
  overflow: hidden;
}

.paso-linea::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--lx-text);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.paso-linea--llena::after { transform: scaleX(1); }

@media (max-width: 600px) {
  .paso-texto { display: none; }
  .paso--actual .paso-texto { display: inline; }
  .paso-linea { width: 18px; }
}

/* ==============================
   Card system
   ============================== */
.lx-card {
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(23, 33, 27, 0.06), 0 12px 32px -16px rgba(23, 33, 27, 0.18);
  overflow: hidden;
}

.lx-card--mt { margin-top: 18px; }

.lx-card-header {
  padding: 18px 22px;
  background: linear-gradient(180deg, var(--lx-accent-soft), transparent);
  border-bottom: 1px solid var(--lx-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lx-card-header-title {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--lx-text);
  display: flex;
  align-items: center;
  gap: 10px;
}

.lx-card-header--wrap {
  flex-wrap: wrap;
  gap: 12px;
}

.lx-card-header--wrap .lx-card-header-title {
  min-width: 0;
  flex: 1 1 260px;
}

.vista-titulo {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.vista-titulo-etiqueta {
  font-family: 'Figtree', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lx-text-faint);
}

.vista-titulo-nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lx-formato,
.lx-contador {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--lx-border);
  background: var(--lx-surface);
  font-family: 'Figtree', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--lx-text-muted);
}

.vista-acciones {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.lx-btn-sutil {
  color: var(--lx-text-muted) !important;
  border-radius: 10px !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
}

.lx-btn-sutil:hover { color: var(--lx-text) !important; }

.lx-btn-secundario {
  color: var(--lx-text) !important;
  border-radius: 10px !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-weight: 600 !important;
}

.lx-btn-secundario::before {
  border-color: var(--lx-border-strong) !important;
}

.lx-icon-btn {
  color: var(--lx-text-muted) !important;
  transition: transform 0.4s ease, color 0.2s ease;
}

.lx-icon-btn:hover {
  color: var(--lx-text) !important;
  transform: rotate(90deg);
}

.vista-aviso {
  margin: 0;
  padding: 10px 22px;
  border-bottom: 1px solid var(--lx-border);
  background: var(--lx-surface-sunken);
}

.lx-card-body {
  padding: 22px;
}

.lx-action-btn {
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  box-shadow: 0 6px 16px -8px rgba(var(--lexit-verde-rgb), 0.55);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.lx-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -10px rgba(var(--lexit-verde-rgb), 0.6);
}

/* ==============================
   Templates list
   ============================== */
.templates-list {
  max-height: 600px;
  overflow-y: auto;
}

.template-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--lx-accent-soft);
  color: var(--lx-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.template-item {
  border-radius: 12px;
  border-left: 3px solid transparent;
  padding-left: 13px;
  transition: background 0.2s, border-color 0.2s, transform 0.2s ease;
  margin: 3px 8px;
}

.template-item-flecha {
  color: var(--lx-text-faint);
  transition: transform 0.2s ease, color 0.2s ease;
}

.template-item:hover .template-item-flecha,
.template-item.q-item--active .template-item-flecha {
  transform: translateX(3px);
  color: var(--lx-text);
}

.template-item:hover .template-icon-wrap {
  background: var(--lx-accent-soft-strong);
}

.templates-skeleton {
  padding: 10px 16px;
}

.templates-skeleton-fila {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}

.templates-skeleton-icono {
  border-radius: 10px;
  flex-shrink: 0;
}

.empty-state-icono {
  color: var(--lx-text-faint);
  opacity: 0.7;
}

.template-item-name {
  color: var(--lx-text);
}

.template-item-desc {
  color: var(--lx-text-faint);
}

.empty-state-text {
  color: var(--lx-text-faint);
}

.template-item:hover { background: rgba(23, 33, 27, 0.05); }

.template-item.q-item--active {
  background: var(--lx-accent-soft);
  border-left-color: var(--lx-accent);
}

.template-item.q-item--active .template-icon-wrap {
  background: var(--lx-accent);
  color: var(--lx-ink);
}

.template-item.q-item--active .template-item-name {
  color: var(--lx-text);
  font-weight: 600;
}

/* ==============================
   PDF viewer
   ============================== */
.editor-content { padding: 2rem 1.5rem; }

.pdf-canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--lx-surface-sunken);
  border: 1px solid var(--lx-border);
  border-radius: var(--border-radius);
  padding: 2rem 1rem;
  min-height: 500px;
}

.page-indicator-text {
  color: var(--lx-text-muted);
  font-size: 0.88rem;
  min-width: 110px;
  text-align: center;
}

.page-indicator-text strong { color: var(--lx-text); }

.paginador {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding: 4px;
  border: 1px solid var(--lx-border);
  border-radius: 999px;
  background: var(--lx-surface);
  box-shadow: 0 6px 18px -12px rgba(23, 33, 27, 0.4);
}

.paginador-btn {
  color: var(--lx-text) !important;
}

.paginador-btn:hover:not(.disabled) {
  background: var(--lx-accent-soft);
}

.pdf-canvas {
  max-width: 100%;
  max-height: 600px;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--lx-border);
  box-shadow: 0 12px 28px -10px rgba(23, 33, 27, 0.35);
  background: white !important;
}

canvas {
  max-width: 100%;
  border-radius: var(--border-radius-small);
  border: 1px solid var(--lx-border);
  box-shadow: var(--shadow-light);
  background: white !important;
}

/* Plantilla Word: hoja continua (sin paginación como el PDF) — se deja en
   blanco a propósito, como el papel real de un documento, apoyada sobre
   la card oscura */
/* Vista fiel del Word (componente VistaWord): alto generoso para ver el
   documento cómodo; la hoja se ajusta sola al ancho. */
.contrato-vista-word {
  height: 75vh;
  min-height: 480px;
}

.vista-word-ayuda {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--lx-text-muted);
}

.download-aviso {
  font-size: 0.8rem;
  color: var(--lx-text-muted);
}

.word-preview-container {
  background: white;
  border: 1px solid var(--lx-border);
  border-radius: var(--border-radius-small);
  box-shadow: 0 12px 28px -10px rgba(23, 33, 27, 0.35);
  padding: 2.5rem 3rem;
  max-height: 640px;
  overflow-y: auto;
}

.pdf-loading, .pdf-error {
  min-height: 400px;
  background: var(--lx-surface-sunken);
  border-radius: 14px;
  border: 1px solid var(--lx-border);
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.pdf-loading-texto {
  margin: 0;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-style: italic;
  color: var(--lx-text-muted);
}

/* Hoja en blanco cuyas líneas se "escriben" una tras otra. */
.hoja-cargando {
  width: 120px;
  height: 150px;
  padding: 20px 16px;
  background: #fff;
  border: 1px solid var(--lx-border);
  border-radius: 6px;
  box-shadow: 0 14px 30px -16px rgba(23, 33, 27, 0.45);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.hoja-cargando span {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: var(--lx-accent-soft-strong);
  transform-origin: left;
  animation: hojaLinea 2.4s ease-in-out infinite;
}

.hoja-cargando span:nth-child(1) { width: 60%; margin: 0 auto 4px; animation-delay: 0s; }
.hoja-cargando span:nth-child(2) { animation-delay: 0.2s; }
.hoja-cargando span:nth-child(3) { width: 90%; animation-delay: 0.4s; }
.hoja-cargando span:nth-child(4) { animation-delay: 0.6s; }
.hoja-cargando span:nth-child(5) { width: 75%; animation-delay: 0.8s; }
.hoja-cargando span:nth-child(6) { width: 40%; animation-delay: 1s; }

@keyframes hojaLinea {
  0%   { transform: scaleX(0); opacity: 0.4; }
  35%  { transform: scaleX(1); opacity: 1; }
  80%  { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}

.pdf-error {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-error-icono { color: #C23B2E; opacity: 0.8; }

.pdf-error-texto {
  color: #7A1D14;
  margin-bottom: 0;
}

/* ==============================
   Tabs (Editar Manualmente / Completar con IA)
   ============================== */
.lx-tabs {
  margin: 16px 22px 0;
  padding: 4px;
  border: 1px solid var(--lx-border);
  border-radius: 12px;
  background: var(--lx-surface-sunken);
  display: inline-flex;
}

.lx-tabs :deep(.q-tab) {
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  min-height: 38px;
  padding: 0 16px;
  margin-right: 4px;
  border-radius: 9px;
  color: var(--lx-text-muted) !important;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.lx-tabs :deep(.q-tab:last-child) { margin-right: 0; }

.lx-tabs :deep(.q-tab:hover) { color: var(--lx-text) !important; }

.lx-tabs :deep(.q-tab--active) {
  color: var(--lx-text) !important;
  background: var(--lx-surface);
  box-shadow: 0 1px 2px rgba(23, 33, 27, 0.08), 0 4px 12px -6px rgba(23, 33, 27, 0.25);
}

.lx-tabs :deep(.q-tab__icon) { font-size: 18px; }

.lx-tabs :deep(.q-focus-helper) { display: none; }

/* ==============================
   Chat de edición con IA
   ============================== */
.chat-edicion-panel {
  /* Beige claro (no el #BDB59B de --lx-surface-sunken): sobre ese fondo
     oscuro los textos del chat casi no se leían. */
  background: linear-gradient(165deg, #F8F7F2, var(--lx-surface-alt));
  border: 1px solid var(--lx-border);
  border-radius: 16px;
  padding: 1.6rem;
}

.chat-edicion-hint {
  display: flex;
  align-items: center;
  color: var(--lx-text-muted);
  font-weight: 500;
  font-size: 0.9rem;
  margin: 0 0 14px;
}

.chat-edicion-hint :deep(.q-icon) {
  color: var(--lx-accent);
}

.chat-edicion-hint-muted {
  color: var(--lx-text-muted);
  font-size: 0.85rem;
}

.chat-edicion-mensajes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding: 2px 4px 2px 2px;
}

.chat-edicion-fila {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  animation: floatUp 0.3s ease-out both;
}

.lx-pensando {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border: 1px solid var(--lx-border);
  border-radius: 999px;
  background: var(--lx-surface);
}

.lx-pensando-puntos {
  display: inline-flex;
  gap: 4px;
}

.lx-pensando-puntos span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lx-accent);
  animation: lxPunto 1.1s ease-in-out infinite;
}

.lx-pensando-puntos span:nth-child(2) { animation-delay: 0.15s; }
.lx-pensando-puntos span:nth-child(3) { animation-delay: 0.3s; }

@keyframes lxPunto {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50%      { opacity: 1;    transform: translateY(-3px); }
}

.lx-error-suave {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(194, 59, 46, 0.28);
  border-radius: 10px;
  background: #FBEDEA;
  color: #7A1D14;
  font-size: 0.82rem;
}

.chat-edicion-fila--ia { justify-content: flex-start; }
.chat-edicion-fila--user { justify-content: flex-end; }

.chat-edicion-avatar {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--lx-accent);
  color: var(--lx-ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-edicion-burbuja {
  padding: 11px 15px;
  border-radius: 16px;
  font-size: 0.92rem;
  line-height: 1.55;
  max-width: 78%;
  white-space: pre-wrap;
  box-shadow: 0 2px 8px rgba(23, 33, 27, 0.10);
}

.chat-edicion-burbuja--ia {
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  color: var(--lx-text);
  border-bottom-left-radius: 4px;
}

.chat-edicion-burbuja--user {
  background: var(--lx-accent);
  color: var(--lx-ink);
  font-weight: 500;
  border-bottom-right-radius: 4px;
}

.chat-edicion-start-btn {
  border-radius: 12px !important;
  padding: 10px 0 !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-weight: 600 !important;
}

.chat-edicion-input :deep(.q-field__control) {
  border-radius: 12px;
  background: var(--lx-surface);
}

.chat-edicion-input :deep(.q-field__control::before) {
  border-color: var(--lx-border-strong);
}

.chat-edicion-input :deep(.q-field__native) {
  color: var(--lx-text);
}

.chat-edicion-banner {
  background: rgba(47, 143, 91, 0.14) !important;
  color: var(--lx-text) !important;
  border: 1px solid rgba(47, 143, 91, 0.35);
}

/* ==============================
   Asistente de contratos (vista sin plantilla elegida)
   Portada tipo "buscador" con titular grande, campo protagonista e
   ideas en tarjetas; al escribir, pasa a una conversación.
   ============================== */
.asistente {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--lx-border);
  border-radius: 20px;
  padding: 28px;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(217, 212, 198, 0.55), transparent 60%),
    linear-gradient(180deg, var(--lexit-blanco-calido), var(--lx-surface) 70%);
}

/* Halo suave que respira detrás de la portada */
.asistente::before {
  content: '';
  position: absolute;
  z-index: -1;
  top: -140px;
  left: 50%;
  width: 520px;
  height: 320px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(189, 181, 155, 0.35), transparent);
  animation: halo 7s ease-in-out infinite;
  pointer-events: none;
}

@keyframes halo {
  0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
  50%      { opacity: 1;   transform: translateX(-50%) scale(1.08); }
}

.asistente--inicio {
  padding: 48px 32px 32px;
}

/* ---- Portada ---- */
.asistente-portada {
  text-align: center;
  max-width: 620px;
  margin: 0 auto 26px;
}

.asistente-insignia {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 1px solid var(--lx-border-strong);
  border-radius: 999px;
  background: var(--lx-surface);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lx-text-muted);
  animation: floatUp 0.5s ease-out both;
}

.asistente-insignia-punto,
.asistente-estado-punto {
  position: relative;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2F8F5B;
  flex-shrink: 0;
}

.asistente-insignia-punto::after,
.asistente-estado-punto--activo::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px solid #2F8F5B;
  animation: pulso 1.8s ease-out infinite;
}

@keyframes pulso {
  from { transform: scale(0.5); opacity: 0.9; }
  to   { transform: scale(1.4); opacity: 0; }
}

.asistente-titular {
  margin: 18px 0 10px;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: clamp(2rem, 4vw, 2.9rem);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.015em;
  color: var(--lx-text);
  animation: floatUp 0.6s 0.08s ease-out both;
}

.asistente-titular em {
  position: relative;
  font-style: italic;
  white-space: nowrap;
}

/* Subrayado que se dibuja bajo "contrato" */
.asistente-titular em::after {
  content: '';
  position: absolute;
  left: 2%;
  right: 2%;
  bottom: 0.04em;
  height: 0.14em;
  border-radius: 2px;
  background: rgba(189, 181, 155, 0.55);
  z-index: -1;
  transform: scaleX(0);
  transform-origin: left;
  animation: subrayar 0.8s 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes subrayar {
  to { transform: scaleX(1); }
}

.asistente-bajada {
  margin: 0;
  font-size: 1.05rem;
  color: var(--lx-text-muted);
  animation: floatUp 0.6s 0.16s ease-out both;
}

/* ---- Campo para escribir ---- */
.asistente-composer {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 680px;
  margin: 0 auto;
  padding: 8px 8px 8px 18px;
  background: var(--lx-surface);
  border: 1px solid var(--lx-border-strong);
  border-radius: 999px;
  box-shadow: 0 12px 32px -18px rgba(23, 33, 27, 0.45);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  animation: floatUp 0.6s 0.24s ease-out both;
}

.asistente-composer:focus-within {
  border-color: var(--lx-accent);
  box-shadow: 0 0 0 4px var(--lx-accent-soft), 0 16px 36px -18px rgba(23, 33, 27, 0.5);
  transform: translateY(-1px);
}

.asistente-composer-icono {
  color: var(--lx-text-faint);
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.asistente-composer:focus-within .asistente-composer-icono {
  color: var(--lx-text);
}

.asistente-composer-input :deep(.q-field__control) {
  min-height: 42px;
  height: 42px;
}

.asistente-composer-input :deep(.q-field__native) {
  color: var(--lx-text);
  font-family: 'Baskervville', 'Figtree', sans-serif;
  font-size: 1.02rem;
}

.asistente-composer-input :deep(.q-field__native::placeholder) {
  color: var(--lx-text-faint);
  opacity: 1;
}

.asistente-composer-enviar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.asistente-composer-enviar:not(.disabled):hover {
  transform: scale(1.06);
}

/* ---- Ideas en tarjetas ---- */
.asistente-ideas-titulo {
  max-width: 680px;
  margin: 26px auto 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: var(--lx-text-faint);
}

.asistente-ideas {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-width: 680px;
  margin: 0 auto;
}

.asistente-idea {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--lx-border);
  border-radius: 14px;
  background: var(--lx-surface);
  color: var(--lx-text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  animation: floatUp 0.45s ease-out both;
  animation-delay: calc(0.3s + var(--d, 0ms));
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
}

.asistente-idea:hover,
.asistente-idea:focus-visible {
  border-color: var(--lx-border-strong);
  box-shadow: 0 14px 28px -18px rgba(23, 33, 27, 0.5);
  transform: translateY(-3px);
  outline: none;
}

.asistente-idea--elegida {
  border-color: var(--lx-accent);
  background: var(--lx-accent-soft);
}

.asistente-idea-icono {
  width: 36px;
  height: 36px;
  margin-bottom: 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-accent-soft);
  color: var(--lx-text);
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.3s ease;
}

.asistente-idea:hover .asistente-idea-icono,
.asistente-idea--elegida .asistente-idea-icono {
  background: var(--lx-accent);
  color: var(--lx-ink);
  transform: rotate(-6deg);
}

.asistente-idea-titulo {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1rem;
  font-weight: 600;
}

.asistente-idea-texto {
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--lx-text-muted);
}

.asistente-ventajas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 22px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  color: var(--lx-text-muted);
  animation: floatUp 0.5s 0.7s ease-out both;
}

.asistente-ventajas li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ---- Conversación ---- */
.asistente-chat-cabecera {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--lx-border);
}

.asistente-monograma {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-accent);
  color: var(--lx-ink);
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.3rem;
  font-weight: 600;
  box-shadow: 0 8px 18px -10px rgba(23, 33, 27, 0.6);
}

.asistente-monograma--chico {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  font-size: 0.95rem;
  box-shadow: none;
}

.asistente-chat-cabecera-texto {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.asistente-chat-nombre {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--lx-text);
}

.asistente-chat-estado {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78rem;
  color: var(--lx-text-muted);
}

.asistente-mensajes {
  max-height: 440px;
  margin-bottom: 18px;
  gap: 14px;
}

.asistente .chat-edicion-burbuja--ia {
  border-radius: 4px 16px 16px 16px;
  box-shadow: 0 6px 18px -14px rgba(23, 33, 27, 0.45);
}

.asistente .chat-edicion-fila--ia {
  align-items: flex-start;
}

.asistente:not(.asistente--inicio) .asistente-composer {
  max-width: none;
  animation: none;
}

.asistente-bloque {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 85%;
}

.asistente-bloque--user {
  align-items: flex-end;
}

.asistente-bloque .chat-edicion-burbuja {
  max-width: 100%;
}

.asistente-plantillas {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asistente-plantilla {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 12px 12px 12px;
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  border-radius: 14px;
  font: inherit;
  color: var(--lx-text);
  text-align: left;
  cursor: pointer;
  animation: floatUp 0.4s ease-out both;
  animation-delay: var(--d, 0ms);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.asistente-plantilla:hover,
.asistente-plantilla:focus-visible {
  border-color: var(--lx-accent);
  box-shadow: 0 14px 28px -18px rgba(23, 33, 27, 0.55);
  transform: translateY(-2px);
  outline: none;
}

.asistente-plantilla-icono {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-accent-soft);
  color: var(--lx-text);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.asistente-plantilla:hover .asistente-plantilla-icono,
.asistente-plantilla:focus-visible .asistente-plantilla-icono {
  background: var(--lx-accent);
  color: var(--lx-ink);
}

.asistente-plantilla-texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.asistente-plantilla-nombre {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-weight: 600;
  font-size: 0.98rem;
}

.asistente-plantilla-desc {
  font-size: 0.8rem;
  color: var(--lx-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asistente-plantilla-accion {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--lx-text);
  background: var(--lx-accent-soft);
  transition: background-color 0.2s ease, color 0.2s ease, gap 0.2s ease;
}

.asistente-plantilla:hover .asistente-plantilla-accion,
.asistente-plantilla:focus-visible .asistente-plantilla-accion {
  background: var(--lx-accent);
  color: var(--lx-ink);
  gap: 8px;
}

@media (max-width: 760px) {
  .asistente-ideas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .asistente,
  .asistente--inicio { padding: 24px 16px; }
  .asistente-bloque { max-width: 100%; }
  .asistente-plantilla-accion { padding: 6px 8px; font-size: 0; gap: 0; }
  .asistente-idea-texto { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .asistente::before,
  .asistente-insignia-punto::after,
  .asistente-estado-punto--activo::after { animation: none; }
}

/* ==============================
   Barra de descarga
   ============================== */
.download-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 20px;
  padding: 18px 22px;
  background: linear-gradient(180deg, var(--lx-surface), var(--lx-surface-sunken));
  border-top: 1px solid var(--lx-border);
}

.download-bar-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.download-bar-icono {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-surface);
  border: 1px solid var(--lx-border);
  color: var(--lx-text);
}

.download-bar-titulo {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--lx-text);
}

.download-bar-desc {
  font-size: 0.82rem;
  color: var(--lx-text-muted);
}

.download-bar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.download-btn {
  border-radius: 12px !important;
  font-family: 'Baskervville', 'Figtree', sans-serif !important;
  font-weight: 600 !important;
  font-size: 0.95rem !important;
  padding: 4px 22px !important;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.download-btn--primary {
  box-shadow: 0 8px 20px -8px rgba(var(--lexit-verde-rgb), 0.55);
}

.download-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px -10px rgba(var(--lexit-verde-rgb), 0.6);
}

.download-btn--primary :deep(.q-icon) {
  transition: transform 0.25s ease;
}

.download-btn--primary:hover :deep(.q-icon) {
  animation: bajarFlecha 0.8s ease-in-out infinite;
}

@keyframes bajarFlecha {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(3px); }
}

.download-aviso--barra {
  flex-basis: 100%;
  margin-top: 0;
}

@media (max-width: 600px) {
  .download-bar-actions,
  .download-btn { width: 100%; }
}

/* ==============================
   Finalizar contrato: "Finalizando…" y panel "Tu contrato está listo"
   ============================== */
.lx-card--editor {
  position: relative;
  /* visible (no hidden) para que el chat pueda quedarse fijo al bajar
     (position: sticky no funciona dentro de un overflow: hidden). */
  overflow: visible;
}

.lx-card--editor > .lx-card-header {
  border-radius: 16px 16px 0 0;
}

.lx-card--editor > .download-bar {
  border-radius: 0 0 16px 16px;
}

.finalizando {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: min(18vh, 160px);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.finalizando-caja {
  width: min(360px, calc(100% - 32px));
  padding: 28px 26px 24px;
  border: 1px solid var(--lx-border);
  border-radius: 20px;
  background: var(--lx-surface);
  box-shadow: 0 30px 60px -30px rgba(23, 33, 27, 0.45);
  text-align: center;
  animation: floatUp 0.4s ease-out both;
}

/* Hoja que se escribe y recibe un "sello" de firma */
.finalizando-hoja {
  position: relative;
  width: 84px;
  height: 104px;
  margin: 0 auto 18px;
  padding: 16px 12px;
  border: 1px solid var(--lx-border);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 14px 28px -16px rgba(23, 33, 27, 0.5);
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.finalizando-hoja span {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: var(--lx-accent-soft-strong);
  transform-origin: left;
  animation: hojaLinea 1.8s ease-in-out infinite;
}

.finalizando-hoja span:nth-child(2) { width: 85%; animation-delay: 0.15s; }
.finalizando-hoja span:nth-child(3) { animation-delay: 0.3s; }
.finalizando-hoja span:nth-child(4) { width: 70%; animation-delay: 0.45s; }
.finalizando-hoja span:nth-child(5) { width: 45%; animation-delay: 0.6s; }

.finalizando-sello {
  position: absolute;
  right: -12px;
  bottom: -12px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-accent);
  color: var(--lx-ink);
  box-shadow: 0 8px 16px -8px rgba(23, 33, 27, 0.6);
  animation: sello 1.8s ease-in-out infinite;
}

@keyframes sello {
  0%, 100% { transform: scale(1) rotate(0); }
  50%      { transform: scale(1.1) rotate(-10deg); }
}

.finalizando-titulo {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--lx-text);
  margin-bottom: 14px;
}

.finalizando-pasos {
  list-style: none;
  margin: 0 auto 18px;
  padding: 0;
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.finalizando-pasos li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--lx-text-faint);
  transition: color 0.3s ease;
}

.finalizando-paso-marca {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--lx-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lx-text);
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.finalizando-paso--actual { color: var(--lx-text) !important; font-weight: 600; }

.finalizando-paso--hecho { color: var(--lx-text-muted) !important; }

.finalizando-paso--hecho .finalizando-paso-marca {
  background: var(--lx-accent);
  border-color: var(--lx-accent);
  color: var(--lx-ink);
}

.finalizando-barra {
  height: 4px;
  border-radius: 999px;
  background: var(--lx-accent-soft);
  overflow: hidden;
}

.finalizando-barra span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--lx-accent);
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.finalizando-enter-active,
.finalizando-leave-active { transition: opacity 0.3s ease; }
.finalizando-enter-from,
.finalizando-leave-to { opacity: 0; }

/* Panel "Tu contrato está listo" */
.contrato-listo {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 20px;
  margin: 18px 22px 0;
  padding: 20px 22px;
  border: 1px solid rgba(47, 143, 91, 0.3);
  border-radius: 16px;
  background:
    radial-gradient(120% 140% at 0% 0%, rgba(47, 143, 91, 0.10), transparent 55%),
    var(--lexit-blanco-calido);
  box-shadow: 0 18px 36px -24px rgba(23, 33, 27, 0.45);
}

.contrato-listo-check {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2F8F5B;
  box-shadow: 0 0 0 6px rgba(47, 143, 91, 0.14);
  animation: checkEntrada 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.contrato-listo-check svg {
  stroke: #fff;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.contrato-listo-check circle {
  stroke: rgba(255, 255, 255, 0.35);
  stroke-width: 2;
}

.contrato-listo-check path {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: dibujarCheck 0.45s 0.3s ease-out forwards;
}

@keyframes checkEntrada {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

@keyframes dibujarCheck {
  to { stroke-dashoffset: 0; }
}

.contrato-listo-texto {
  flex: 1 1 240px;
  min-width: 0;
}

.contrato-listo-titulo {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--lx-text);
}

.contrato-listo-desc {
  margin-top: 2px;
  font-size: 0.88rem;
  color: var(--lx-text-muted);
}

.contrato-listo-desc strong { color: var(--lx-text); font-weight: 600; }

.contrato-listo-acciones {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.listo-enter-active { transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
.listo-leave-active { transition: opacity 0.2s ease; }
.listo-enter-from { opacity: 0; transform: translateY(-10px) scale(0.98); }
.listo-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .contrato-listo { margin: 14px 14px 0; padding: 18px; }
  .contrato-listo-acciones { width: 100%; }
  .contrato-listo-acciones .download-btn { flex: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .finalizando-hoja span,
  .finalizando-sello { animation: none; }
}

/* ==============================
   Lista de plantillas plegable
   ============================== */
@media (min-width: 1024px) {
  .col-plantillas,
  .col-trabajo {
    transition: flex-basis 0.35s cubic-bezier(0.22, 1, 0.36, 1), max-width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .col-plantillas--cerrada {
    flex: 0 0 92px;
    max-width: 92px;
  }

  .col-trabajo--amplia {
    flex: 0 0 calc(100% - 92px);
    max-width: calc(100% - 92px);
  }
}

.plantillas-riel {
  position: sticky;
  top: 16px;
  width: 100%;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 14px 0 18px;
  border: 1px solid var(--lx-border);
  border-radius: 16px;
  background: var(--lx-surface);
  color: var(--lx-text);
  font: inherit;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(23, 33, 27, 0.06), 0 12px 32px -16px rgba(23, 33, 27, 0.18);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.plantillas-riel:hover,
.plantillas-riel:focus-visible {
  border-color: var(--lx-border-strong);
  background: var(--lx-surface-sunken);
  outline: none;
}

.plantillas-riel-boton {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lx-accent);
  color: var(--lx-ink);
  transition: transform 0.2s ease;
}

.plantillas-riel:hover .plantillas-riel-boton { transform: translateX(2px); }

.plantillas-riel-texto {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.lx-icon-btn-plegar {
  color: var(--lx-text-muted) !important;
  margin-left: 2px;
  transition: color 0.2s ease, transform 0.2s ease;
}

.lx-icon-btn-plegar:hover {
  color: var(--lx-text) !important;
  transform: translateX(-2px);
}

.plegar-enter-active,
.plegar-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.plegar-enter-from,
.plegar-leave-to { opacity: 0; transform: translateX(-8px); }

/* Celular / tablet: la lista va arriba, así que el riel es una barra */
@media (max-width: 1023px) {
  .plantillas-riel {
    position: static;
    min-height: 0;
    flex-direction: row;
    justify-content: flex-start;
    padding: 10px 14px;
  }

  .plantillas-riel-texto {
    writing-mode: horizontal-tb;
    transform: none;
  }

  .plantillas-riel-boton { order: 3; margin-left: auto; transform: rotate(90deg); width: 30px; height: 30px; }
  .plantillas-riel:hover .plantillas-riel-boton { transform: rotate(90deg); }
  .lx-icon-btn-plegar { transform: rotate(90deg); }
  .lx-icon-btn-plegar:hover { transform: rotate(90deg); }
}

/* ==============================
   Completar con IA: chat + documento en vivo
   ============================== */
.chat-con-documento {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 18px;
  align-items: start;
}

.chat-con-documento > .chat-edicion-panel {
  position: sticky;
  top: 16px;
  z-index: 2;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
}

/* Los mensajes ocupan el alto que sobra y hacen scroll por dentro, así
   el campo para responder siempre queda a la vista. */
.chat-con-documento > .chat-edicion-panel > .chat-edicion-mensajes {
  flex: 1 1 auto;
  min-height: 120px;
  max-height: none;
}

@media (max-width: 1100px) {
  .chat-con-documento { grid-template-columns: minmax(0, 1fr); }
  .chat-con-documento > .chat-edicion-panel { position: static; }
}

.doc-en-vivo {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lx-border);
  border-radius: 16px;
  background: var(--lx-surface-sunken);
  overflow: hidden;
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}

.doc-en-vivo--trabajando {
  border-color: var(--lx-border-strong);
}

.doc-en-vivo--actualizado {
  border-color: rgba(47, 143, 91, 0.45);
  box-shadow: 0 0 0 4px rgba(47, 143, 91, 0.10);
}

.doc-en-vivo-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--lx-border);
  background: var(--lx-surface);
}

.doc-en-vivo-titulo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--lx-text);
}

.doc-en-vivo-estado {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--lx-border);
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--lx-text-muted);
}

.doc-en-vivo-estado--trabajando {
  color: var(--lx-text);
  background: var(--lx-accent-soft);
}

.doc-en-vivo-estado--listo {
  color: #1F6B43;
  background: rgba(47, 143, 91, 0.12);
  border-color: rgba(47, 143, 91, 0.3);
  animation: checkEntrada 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.estado-enter-active,
.estado-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.estado-enter-from { opacity: 0; transform: translateY(4px); }
.estado-leave-to { opacity: 0; transform: translateY(-4px); }

.doc-en-vivo-cuerpo {
  position: relative;
  height: 68vh;
  min-height: 440px;
}

.doc-en-vivo-texto {
  height: 100%;
  max-height: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 2rem;
}

/* Línea luminosa que recorre la hoja mientras LexIT trabaja */
.doc-en-vivo-escaneo {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 90px;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(189, 181, 155, 0.28) 70%, rgba(47, 143, 91, 0.45) 98%, transparent);
  animation: escaneo 2.2s ease-in-out infinite;
}

@keyframes escaneo {
  0%   { transform: translateY(-90px); opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translateY(68vh); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .doc-en-vivo-escaneo { animation: none; display: none; }
}

/* Diálogo de error (va a <body>: usa variables globales --lexit-*) */
.lx-dialogo-error {
  min-width: 340px;
  max-width: 460px;
  border-radius: 16px;
  border: 1px solid var(--lexit-marfil);
  box-shadow: 0 24px 48px -20px rgba(23, 33, 27, 0.4);
}

.lx-dialogo-error-cabecera {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 4px;
  color: #C23B2E;
}

.lx-dialogo-error-titulo {
  font-family: 'Baskervville', 'EB Garamond', serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--lexit-verde);
}

.lx-dialogo-error-texto {
  padding-top: 4px;
  color: var(--lexit-texto-secundario);
}

@media (prefers-reduced-motion: reduce) {
  .hoja-cargando span,
  .lx-pensando-puntos span,
  .download-btn--primary:hover :deep(.q-icon) { animation: none; }
}

/* ==============================
   Document preview
   ============================== */
.document-preview {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.8;
  color: #1a1a1a;
}

.document-preview p {
  margin: 0 0 6px 0;
  text-align: justify;
}

/* ==============================
   Textos utilitarios de Quasar (text-grey-6/7) — se sobreescriben solo
   dentro de esta página para que se lean sobre el fondo oscuro; el resto
   de la app sigue usando los tonos por defecto de Quasar.
   ============================== */
.contratos-page :deep(.text-grey-6),
.contratos-page :deep(.text-grey-7) {
  color: var(--lx-text-muted) !important;
}
</style>

<style>
/* Párrafos que cambió la IA, en "Documento en vivo" (ContratosPage). */
.doc-en-vivo .lx-cambio-ia {
  border-radius: 3px;
  background: rgba(47, 143, 91, 0.12);
  box-shadow: -6px 0 0 rgba(47, 143, 91, 0.12), 6px 0 0 rgba(47, 143, 91, 0.12), inset 3px 0 0 #2F8F5B;
  animation: lxCambioIA 1.8s ease-out both;
}

@keyframes lxCambioIA {
  0%   { background: rgba(47, 143, 91, 0.45); }
  100% { background: rgba(47, 143, 91, 0.12); }
}

.q-tooltip.lx-tooltip {
  background: var(--lexit-verde);
  color: var(--lexit-blanco-calido);
  font-size: 0.78rem;
  border-radius: 8px;
  padding: 6px 10px;
}
</style>
