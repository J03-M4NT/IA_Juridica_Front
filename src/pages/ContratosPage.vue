<template>
  <q-page class="contratos-page q-pa-md fade-in">
    <div class="page-header q-mb-lg">
      <div class="text-h5 text-weight-bold q-mb-sm header-gradient">
        <q-icon name="description" class="q-mr-sm" /> Contratos
      </div>
      <p class="text-body2 text-grey-7">Genera contratos personalizados desde plantillas profesionales</p>
    </div>

    <!-- Sección: Almacen contratos en Firebase -->

    <div class="firebase-section q-mb-xl">
      
      <div class="text-subtitle1 text-weight-bold q-mb-md" style="display: flex; align-items: center; gap: 8px;">
        <q-icon name="cloud" color="orange" />
        Contratos Almacenados
        <q-badge color="orange" :label="store.firebaseContratos.length" />
      </div>

      <!-- Loading state -->
      <div v-if="store.firebaseLoading" class="text-center q-pa-lg">
        <q-spinner-dots size="40px" color="orange" />
        <p class="text-grey-7 q-mt-sm">Cargando contratos...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="store.firebaseError" class="text-center q-pa-lg">
        <q-icon name="error" size="40px" color="negative" />
        <p class="text-negative q-mt-sm">{{ store.firebaseError }}</p>
      </div>

      <!-- Sin contratos -->
      <div v-else-if="store.firebaseContratos.length === 0" class="text-center q-pa-lg">
        <q-icon name="folder_open" size="40px" color="grey-5" />
        <p class="text-grey-6 q-mt-sm">No hay contratos almacenados aún</p>
      </div>

      <!-- Lista + Previsualizador -->
      <div v-else class="row q-col-gutter-lg">

        <!-- Columna izquierda: Lista de contratos -->
        <div class="col-12 col-md-4">
          <q-card class="templates-card">
            <q-card-section class="templates-header">
              <div class="text-h6 text-weight-medium">Archivos de Contratos</div>
              <q-icon name="folder" size="sm" color="orange" />
            </q-card-section>
            <q-card-section class="templates-list">
              <q-list separator class="rounded-borders">
                <q-item
                  v-for="contrato in store.firebaseContratos"
                  :key="contrato.id"
                  clickable
                  :active="store.selectedContrato?.id === contrato.id"
                  @click="selectFirebaseContrato(contrato)"
                  v-ripple
                  class="template-item"
                >
                  <q-item-section avatar>
                    <q-icon name="picture_as_pdf" color="red" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ contrato.name }}</q-item-label>
                    <q-item-label caption class="text-grey-7">{{ contrato.type }}</q-item-label>
                  </q-item-section>
                  <q-item-section side v-if="store.selectedContrato?.id === contrato.id">
                    <q-icon name="visibility" color="orange" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- Columna derecha: Vista previa del PDF -->
         <div class="col-12 col-md-8">

          <template v-if="store.selectedContrato">
            <q-card class="editor-card">
              
              <q-card-section class="editor-header">
                <div class="row items-center justify-between">
                  <div>
                    <h6 class="text-h6 text-weight-medium q-mb-xs">{{ store.selectedContrato.name }}</h6>
                    <p class="text-caption text-grey-7">{{ store.selectedContrato.type }}</p>
                  </div>
                  <q-badge color="orange" label="Firebase" />
                </div>
              </q-card-section>

              <q-card-section class="editor-content">
                <div class="pdf-viewer-section">
                  <div class="text-subtitle2 text-weight-medium q-mb-md">
                    <q-icon name="picture_as_pdf" color="orange" class="q-mr-sm" />
                    Vista Previa - Primera Página
                  </div>

                  <!-- Loading -->
                  <div v-if="fbLoadingPdf" class="pdf-loading text-center q-pa-xl">
                    <q-spinner-dots size="50px" color="orange" />
                    <p class="text-grey-7 q-mt-md">Cargando PDF...</p>
                  </div>

                  <!-- Error -->
                  <div v-else-if="fbPdfError" class="pdf-error text-center q-pa-xl">
                    <q-icon name="error" size="50px" color="negative" />
                    <p class="text-negative q-mt-md">{{ fbPdfError }}</p>
                    <q-btn
                      flat
                      color="orange"
                      label="Reintentar"
                      @click="selectFirebaseContrato(store.selectedContrato!)"
                      class="q-mt-md"
                    />
                  </div>

                  <!-- Canvas del PDF (solo primera página) -->
                  <div v-else class="pdf-canvas-container">
                    <canvas ref="fbPdfCanvas" class="pdf-canvas"></canvas>
                    <div v-if="fbPdfDoc" class="q-mt-sm text-center text-caption text-grey-6">
                      Mostrando página 1 de {{ fbNumPages }}
                    </div>
                  </div>

                </div>

              </q-card-section>

            </q-card>

            <!-- Botón de descarga -->
            <q-card class="export-card q-mt-md">
              <q-card-section>
                <div class="text-subtitle2 text-weight-medium q-mb-md">Descargar Contrato</div>
                <div class="row justify-center">
                  <q-btn
                    color="orange"
                    icon="download"
                    label="Descargar PDF"
                    @click="downloadFirebaseContrato"
                    :loading="fbDownloading"
                    class="export-btn"
                    unelevated
                  >
                    <q-tooltip>Descargar el archivo PDF desde Firebase</q-tooltip>
                  </q-btn>
                </div>
              </q-card-section>
            </q-card>
          </template>  

          <!-- Estado vacío cuando no hay contrato seleccionado -->
          <div v-else class="empty-state text-center q-pa-xl">

            <q-icon name="touch_app" size="4rem" color="grey-5" class="q-mb-md" />
            
            <div class="text-h6 text-grey-7 q-mb-sm">
              Selecciona un contrato para previsualizar
            </div>

            <p class="text-body2 text-grey-6">
              Haz click en un contrato de la lista para ver la primera página
            </p>

          </div>

        </div>
        
      </div>

    </div>

    <!-- Separador visual entre secciones -->
    <q-separator class="q-mb-lg" />
    <p class="text-body2 text-grey-7 q-mb-md">
      <q-icon name="edit" class="q-mr-xs" /> Plantillas editables (Supabase)
    </p>


    <!-- -------------------------------------- -->

    <div class="row q-col-gutter-lg">
      <!-- Columna de Selección de Plantillas (obtenidas de Supabase) -->
      <div class="col-12 col-md-4">
        <q-card class="templates-card">
          <q-card-section class="templates-header">
            <div class="text-h6 text-weight-medium">Plantillas de Contratos</div>
            <q-icon name="library_books" size="sm" color="primary" />
          </q-card-section>

          <q-card-section class="templates-list">
            <q-list separator class="rounded-borders">
              <!-- NUEVO: Bucle dinámico que crea un botón por cada plantilla de Supabase -->
              <q-item
                v-for="template in templates"
                :key="template.id"
                clickable
                :active="currentTemplate?.id === template.id"
                @click="selectTemplate(template)"
                v-ripple
                class="template-item"
              >
                <q-item-section avatar>
                  <q-icon name="article" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ template.name }}</q-item-label>
                  <q-item-label caption class="text-grey-7">{{ template.type }}</q-item-label>
                </q-item-section>
                <q-item-section side v-if="currentTemplate?.id === template.id">
                  <q-icon name="check_circle" color="positive" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Columna del Editor de Contrato o Visor PDF (se activa al seleccionar una plantilla) -->
      <div class="col-12 col-md-8">
        <template v-if="currentTemplate">
          <q-card class="editor-card">
            <q-card-section class="editor-header">
              <div class="row items-center justify-between">
                <div>
                  <h6 class="text-h6 text-weight-medium q-mb-xs">{{ currentTemplate.name }}</h6>
                  <p class="text-caption text-grey-7">{{ currentTemplate.type }}</p>
                </div>
                <q-badge color="primary" label="Activo" />
              </div>
            </q-card-section>

            <q-card-section class="editor-content">
              <!-- Si el contrato tiene storage_path, mostramos el visor PDF -->
              <template v-if="currentTemplate.storage_path">
                <div class="pdf-viewer-section">
                  <div class="text-subtitle2 text-weight-medium q-mb-md">
                    <q-icon name="picture_as_pdf" color="primary" class="q-mr-sm" />
                    Vista Previa del Contrato
                  </div>
                  
                  <!-- Loading state -->
                  <div v-if="loadingPdf" class="pdf-loading text-center q-pa-xl">
                    <q-spinner-dots size="50px" color="primary" />
                    <p class="text-grey-7 q-mt-md">Cargando PDF...</p>
                  </div>

                  <!-- Error state -->
                  <div v-else-if="pdfError" class="pdf-error text-center q-pa-xl">
                    <q-icon name="error" size="50px" color="negative" />
                    <p class="text-negative q-mt-md">{{ pdfError }}</p>
                    <q-btn
                      flat
                      color="primary"
                      label="Reintentar"
                      @click="loadPDFPreview"
                      class="q-mt-md"
                    />
                  </div>

                  <!-- PDF Canvas -->
                  <div v-else class="pdf-canvas-container">
                    <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
                    
                    <!-- PDF Navigation -->
                    <div v-if="pdfDoc" class="pdf-nav q-mt-md row justify-center items-center">
                      <q-btn
                        flat
                        round
                        dense
                        icon="chevron_left"
                        :disable="currentPage <= 1"
                        @click="prevPage"
                      />
                      <span class="q-mx-md text-body2">
                        Página {{ currentPage }} de {{ numPages }}
                      </span>
                      <q-btn
                        flat
                        round
                        dense
                        icon="chevron_right"
                        :disable="currentPage >= numPages"
                        @click="nextPage"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Si NO tiene storage_path, mostramos el editor HTML normal -->
              <template v-else>
                <contract-editor
                  :template="currentTemplate"
                  :modified-contract="getModifiedContract(currentTemplate.id)"
                  @update:contract="updateContract"
                />
              </template>
            </q-card-section>
          </q-card>

          <!-- Acciones de Exportación -->
          <q-card class="export-card q-mt-md">
            <q-card-section>
              <div class="text-subtitle2 text-weight-medium q-mb-md">Exportar Contrato</div>
              <div class="row q-col-gutter-md justify-center">
                <!-- Botón de descarga PDF original (solo si tiene storage_path) -->
                <div v-if="currentTemplate.storage_path" class="col-auto">
                  <q-btn
                    color="accent"
                    icon="download"
                    label="Descargar PDF Original"
                    @click="downloadOriginalPDF"
                    :loading="downloading"
                    class="export-btn"
                    unelevated
                  >
                    <q-tooltip>Descargar el archivo PDF original desde Supabase</q-tooltip>
                  </q-btn>
                </div>

                <!-- Botón de exportar a Word (solo si NO tiene storage_path, o sea, es editable) -->
                <div v-if="!currentTemplate.storage_path" class="col-auto">
                  <q-btn
                    color="primary"
                    icon="file_download"
                    label="Exportar como Word"
                    @click="exportToWord"
                    :loading="exporting"
                    class="export-btn"
                    unelevated
                  >
                    <q-tooltip>Descargar en formato Word (.docx) editable</q-tooltip>
                  </q-btn>
                </div>

                <!-- Botón de exportar a PDF generado (solo si NO tiene storage_path) -->
                <div v-if="!currentTemplate.storage_path" class="col-auto">
                  <q-btn
                    color="secondary"
                    icon="picture_as_pdf"
                    label="Exportar como PDF"
                    @click="exportToPDF"
                    :loading="exporting"
                    class="export-btn"
                    unelevated
                  >
                    <q-tooltip>Generar y descargar en formato PDF</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- Estado inicial cuando no hay plantilla seleccionada -->
        <div v-else class="empty-state text-center q-pa-xl">
          <q-icon name="description" size="4rem" color="grey-5" class="q-mb-md" />
          <div class="text-h6 text-grey-7 q-mb-sm">
            Selecciona una plantilla para comenzar
          </div>
          <p class="text-body2 text-grey-6">
            Elige una plantilla de contrato de la lista para empezar a personalizar tu documento
          </p>
        </div>
      </div>
    </div>

    <!-- Estado de Carga -->
    <q-inner-loading :showing="isLoading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <!-- Manejo de Errores -->
    <q-dialog v-model="showErrorDialog">
      <q-card class="error-dialog">
        <q-card-section class="row items-center">
          <q-avatar icon="error" color="negative" text-color="white" />
          <span class="q-ml-sm text-weight-medium">{{ store.error }}</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch, nextTick } from 'vue'; // 'ref' se mantiene para 'exporting', hay imports para firebase
import { storeToRefs } from 'pinia';
import { useContratosStore, type ContractTemplate } from '../stores/contratos-store';
import ContractEditor from '../components/ContractEditor.vue';

// imports para Firebase:
import type { ContratoFirebase } from '../services/contratosService';



// --- LÓGICA DEL COMPONENTE ---
const store = useContratosStore();

// PASO 1: Desestructurar el store manteniendo la reactividad con storeToRefs.
// Las propiedades como 'templates', 'currentTemplate', 'isLoading' y 'error' ahora son refs reactivas.
const { templates, currentTemplate, isLoading, error } = storeToRefs(store);

// PASO 2: Desestructurar las acciones directamente, ya que son funciones.
const { fetchTemplates, setCurrentTemplate, updateModifiedContract, getModifiedContract, exportToWord: exportToWordAction, exportToPDF: exportToPDFAction, getPDFUrl, downloadOriginalPDF: downloadOriginalPDFAction } = store;

const exporting = ref(false);
const downloading = ref(false);

// Estados para el visor PDF
const pdfCanvas = ref<HTMLCanvasElement | null>(null);
const pdfDoc = ref<any>(null);
const currentPage = ref(1);
const numPages = ref(0);
const loadingPdf = ref(false);
const pdfError = ref<string | null>(null);


// Estados para los contratos de Firebase:
const fbPdfCanvas = ref<HTMLCanvasElement | null>(null);
const fbPdfDoc = ref<any>(null);
const fbCurrentPage = ref(1);
const fbNumPages = ref(0);
const fbLoadingPdf = ref(false);
const fbPdfError = ref<string | null>(null);
const fbDownloading = ref(false);


// El diálogo de error ahora usa la ref 'error' desestructurada.
const showErrorDialog = computed<boolean>({
  get: () => !!error.value,
  set: (val: boolean) => {
    if (!val) {
      error.value = null; // Limpia el error al cerrar el diálogo
    }
  }
});


// Al cargar el componente, llama a la acción para buscar las plantillas en Supabase.
onMounted(async () => {
  await store.fetchTemplates();

  // NUEVO: Iniciar escucha en tiempo real de contratos de Firebase
  store.startListeningFirebaseContratos();

});

/*
Limpiar la suscripcion cuando el componente se desmonte.
Sin esto, la conexion con Firebase seguiria abiera en segundo plano.
*/
onUnmounted(() => {
  store.stopListeningFirebaseContratos();
});




/**
 * FUNCIÓN CONSERVADA: Selecciona la plantilla actual en el store.
 */
const selectTemplate = (template: ContractTemplate) => {
  store.setCurrentTemplate(template);
};

/**
 * FUNCIÓN CONSERVADA: Actualiza el contenido modificado del contrato en el store.
 */
const updateContract = (templateId: string, variables: Record<string, string>, content: string) => {
  store.updateModifiedContract(templateId, variables, content);
};

/**
 * FUNCIÓN CONSERVADA: Llama a la acción del store para exportar a Word.
 */
const exportToWord = async () => {
  if (!currentTemplate.value) return;

  exporting.value = true;
  try {
    const blob = await exportToWordAction(currentTemplate.value.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.value.name}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Error exporting to Word:', err);
    // El diálogo de error se mostrará automáticamente porque estamos asignando al store.error
  } finally {
    exporting.value = false;
  }
};

/**
 * FUNCIÓN CONSERVADA: Llama a la acción del store para exportar a PDF.
 */
const exportToPDF = async () => {
  if (!currentTemplate.value) return;

  exporting.value = true;
  try {
    const blob = await exportToPDFAction(currentTemplate.value.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.value.name}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Error exporting to PDF:', err);
    // El diálogo de error se mostrará automáticamente
  } finally {
    exporting.value = false;
  }
};

/**
 * Carga la vista previa del PDF usando PDF.js
 */
const loadPDFPreview = async () => {
  if (!currentTemplate.value?.storage_path || !pdfCanvas.value) {
    return;
  }

  loadingPdf.value = true;
  pdfError.value = null;

  try {
    // Obtener la URL del PDF desde Supabase
    const pdfUrl = await getPDFUrl(currentTemplate.value.storage_path);

    // Cargar PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configurar el worker de PDF.js usando CDN (más confiable con Vite)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

    // Cargar el documento PDF
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc.value = await loadingTask.promise;
    numPages.value = pdfDoc.value.numPages;
    currentPage.value = 1;

    // Renderizar la primera página
    await renderPage(1);
  } catch (err: any) {
    console.error('Error cargando PDF:', err);
    pdfError.value = err?.message || 'Error al cargar el PDF';
  } finally {
    loadingPdf.value = false;
  }
};

/**
 * Renderiza una página específica del PDF
 */
const renderPage = async (pageNum: number) => {
  if (!pdfDoc.value || !pdfCanvas.value) return;

  try {
    const page = await pdfDoc.value.getPage(pageNum);
    const canvas = pdfCanvas.value;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Configurar el viewport con escala apropiada
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Renderizar la página
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;
  } catch (err) {
    console.error('Error renderizando página:', err);
  }
};

/**
 * Navegar a la página anterior
 */
const prevPage = async () => {
  if (currentPage.value <= 1) return;
  currentPage.value--;
  await renderPage(currentPage.value);
};

/*
 * Navegar a la página siguiente
 */
const nextPage = async () => {
  if (currentPage.value >= numPages.value) return;
  currentPage.value++;
  await renderPage(currentPage.value);
};

/*
 * Descarga el PDF original desde Supabase
 */
const downloadOriginalPDF = async () => {
  if (!currentTemplate.value) return;

  downloading.value = true;
  try {
    const blob = await downloadOriginalPDFAction(currentTemplate.value.id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTemplate.value.name}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Error downloading original PDF:', err);
    // El diálogo de error se mostrará automáticamente
  } finally {
    downloading.value = false;
  }
};


// Funcion de los contratos de Firebase: -----------------------||

// Seleccionar contrato de Firebase y cargar su vista previa:
const selectFirebaseContrato = async (contrato: ContratoFirebase) => {

  store.selectFirebaseContrato(contrato);


  // Limpiar estado anterior:
  fbPdfDoc.value = null;
  fbCurrentPage.value = 1;
  fbNumPages.value = 0;
  fbPdfError.value = null;
  fbLoadingPdf.value = true;


  // Esperar que se renderice en el DOM:
  await nextTick();

  if (!fbPdfCanvas.value) {
    fbPdfError.value = 'Error: canvas no disponible';
    fbLoadingPdf.value = false;
    return;
  }


  try{

    // 1. Obtener la URL del PDF desde Firebase Storage
    const pdfUrl = await store.getFirebaseContratoURL(contrato.storagePath);

    // 2. Cargar PDF.js (importación dinámica - solo se descarga cuando se necesita)
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

    // 3. Cargar el documento PDF
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    fbPdfDoc.value = await loadingTask.promise;
    fbNumPages.value = fbPdfDoc.value.numPages;
    fbCurrentPage.value = 1;

    // 4. Renderizar SOLO la primera página
    await renderFbPage(1);


  }catch(err: any){

    console.error('Error cargando PDF de Firebase:', err);
    fbPdfError.value = err?.message || 'Error al cargar el PDF';

  }finally {

    fbLoadingPdf.value = false;

  }

};


// Renderizar una pagina del PDF de Firebase en el canvas:
const renderFbPage = async (pageNum: number) => {

  if (!fbPdfDoc.value || !fbPdfCanvas.value) return;

  try {

    const page = await fbPdfDoc.value.getPage(pageNum);
    const canvas = fbPdfCanvas.value;
    const context = canvas.getContext('2d');

    if (!context) return;
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;

  } catch (err) {
    console.error('Error renderizando página:', err);
  }

};


// Descargar contrato de Firebase Storage al local del usuario:
const downloadFirebaseContrato = async () => {

  const contrato = store.selectedContrato;
  if (!contrato) return;

  fbDownloading.value = true;

  try {

    // 1. Descarga el archivo como Blob desde Firebase Storage:
    const blob = await store.downloadFirebaseContrato(contrato.storagePath);

    // 2. Crear un enlace temporal de descarga
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contrato.name}.pdf`;
    document.body.appendChild(a);
    a.click();

    // 3. Limpiar el enlace temporal
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (err: unknown) {

    console.error('Error descargando contrato de Firebase:', err);

  } finally {

    fbDownloading.value = false;
  
  }

};

// -------------------------------------------------------------||



/*
 * Watch para cargar la vista previa cuando se selecciona un contrato
 */
watch(currentTemplate, async (newTemplate) => {
  if (newTemplate?.storage_path) {
    await loadPDFPreview();
  }
});
</script>

<style scoped>
.contratos-page {
  background: #f4f6f8;
}

/* Modo Oscuro */
.body--dark .contratos-page {
  background: #121212;
}

.page-header {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.body--dark .page-header {
  border-bottom-color: #333;
}

.header-gradient {
  background: linear-gradient(135deg, var(--q-primary), var(--q-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
}

.templates-card, .editor-card, .export-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #e0e0e0;
  transition: all 0.3s ease;
}
.body--dark .templates-card, .body--dark .editor-card, .body--dark .export-card {
  border-color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.templates-card:hover, .editor-card:hover, .export-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.templates-header {
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Fixeando modo oscuro */
.body--dark .templates-header {
  background-color: #2a2a2a;
  border-bottom-color: #444;
}

.templates-list {
  padding: 0;
}

.template-item:hover {
  background-color: rgba(var(--q-primary-rgb), 0.05);
}

.q-item--active {
  background-color: rgba(var(--q-primary-rgb), 0.1);
  border-left: 4px solid var(--q-primary);
  font-weight: 500;
}

.editor-header {
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

/* Fixeando modo oscuro pt 2 xd */
.body--dark .editor-header {
  background-color: #2a2a2a;
  border-bottom-color: #444;
}

.editor-content {
  padding: 1rem;
}

.export-btn {
  border-radius: 6px;
  padding: 10px 20px;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.export-btn:hover {
  transform: translateY(-1px);
}

.empty-state {
  border: 2px dashed #d0d0d0;
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
.body--dark .empty-state {
  border-color: #444;
}

.error-dialog {
  border-radius: 8px;
}

/* PDF Viewer Styles */
.pdf-viewer-section {
  width: 100%;
}

.pdf-canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  min-height: 500px;
}

.pdf-canvas {
  max-width: 100%;
  height: auto;
  box-shadow: 0 4px 12px rgb(186, 227, 255);
  background: white;
  border-radius: 4px;
}

.pdf-nav {
  background: white;
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.632);
}

.pdf-loading,
.pdf-error {
  min-height: 400px;
  background: #fafafa;
  border-radius: 8px;
}
/* Fixeandoo pt 3 */
.body--dark .pdf-loading,
.body--dark .pdf-error {
  background: #2a2a2a;
}

/* Firebase Section: */
.firebase-section {
  padding: 1rem;
  background: rgba(255, 152, 0, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 152, 0, 0.15);
}
.body--dark .firebase-section {
  background: rgba(255, 152, 0, 0.05);
  border-color: rgba(255, 152, 0, 0.2);
}


</style>
