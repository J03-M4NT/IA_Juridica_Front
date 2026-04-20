<template>
  <q-page class="q-pa-md">

    <div class="row q-col-gutter-lg">

      <!-- LISTA DE CONTRATOS -->
      <div class="col-4">
        <q-card>

          <q-card-section class="text-h6">
            Plantillas de Contratos
          </q-card-section>

          <q-list bordered separator>

            <q-item
              v-for="template in templates"
              :key="template.id"
              clickable
              @click="selectTemplate(template)"
              :active="currentTemplate?.id === template.id"
            >

              <q-item-section>
                <q-item-label>
                  {{ template.name }}
                </q-item-label>

                <q-item-label caption>
                  {{ template.type }}
                </q-item-label>
              </q-item-section>

            </q-item>

          </q-list>

        </q-card>
      </div>


      <!-- VISOR PDF -->
      <div class="col-8">

        <q-card v-if="currentTemplate">

          <q-card-section class="row items-center justify-between">

            <div>

              <div class="text-h6">
                {{ currentTemplate.name }}
              </div>

              <div class="text-caption text-grey">
                {{ currentTemplate.type }}
              </div>

            </div>

            <q-badge color="primary">
              Activo
            </q-badge>

          </q-card-section>


          <q-separator />


          <q-card-section>

            <!-- LOADING -->
            <div
              v-if="loadingPdf"
              class="text-center q-pa-xl"
            >
              <q-spinner-dots size="40px" color="primary" />
              <div class="q-mt-md">
                Cargando PDF...
              </div>
            </div>


            <!-- ERROR -->
            <div
              v-else-if="pdfError"
              class="text-center text-negative q-pa-xl"
            >
              {{ pdfError }}
            </div>


            <!-- CANVAS PDF -->
            <div v-else class="text-center">

              <canvas ref="pdfCanvas"></canvas>

              <div
                v-if="pdfDoc"
                class="q-mt-md row justify-center items-center"
              >

                <q-btn
                  flat
                  icon="chevron_left"
                  @click="prevPage"
                  :disable="currentPage <= 1"
                />

                <span class="q-mx-md">
                  Página {{ currentPage }} / {{ numPages }}
                </span>

                <q-btn
                  flat
                  icon="chevron_right"
                  @click="nextPage"
                  :disable="currentPage >= numPages"
                />

              </div>

            </div>

          </q-card-section>

        </q-card>


        <!-- ESTADO VACIO -->
        <div
          v-else
          class="text-center q-pa-xl text-grey"
        >

          Selecciona un contrato para visualizarlo

        </div>

      </div>

    </div>

  </q-page>
</template>


<script setup lang="ts">

import { onMounted, ref, watch } from "vue"
import { storeToRefs } from "pinia"

import { useContratosStore } from "../stores/contratos-store"

import * as pdfjsLib from "pdfjs-dist"

import workerSrc from "pdfjs-dist/build/pdf.worker.min.js?url"


pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc


const store = useContratosStore()

const { templates, currentTemplate } = storeToRefs(store)

const { fetchTemplates, setCurrentTemplate, getPDFUrl } = store


const pdfCanvas = ref<HTMLCanvasElement | null>(null)

const pdfDoc = ref<any>(null)

const currentPage = ref(1)

const numPages = ref(0)

const loadingPdf = ref(false)

const pdfError = ref<string | null>(null)



onMounted(async () => {

  await fetchTemplates()

})



const selectTemplate = (template:any) => {

  setCurrentTemplate(template)

}



const loadPDFPreview = async () => {

  if (!currentTemplate.value?.storage_path) return

  loadingPdf.value = true

  pdfError.value = null

  try {

    const pdfUrl = await getPDFUrl(
      currentTemplate.value.storage_path
    )

    const loadingTask = pdfjsLib.getDocument(pdfUrl)

    pdfDoc.value = await loadingTask.promise

    numPages.value = pdfDoc.value.numPages

    currentPage.value = 1

    await renderPage(1)

  } catch (error) {

    console.error(error)

    pdfError.value = "No se pudo cargar el PDF"

  }

  loadingPdf.value = false

}



const renderPage = async (pageNum:number) => {

  if (!pdfDoc.value || !pdfCanvas.value) return

  const page = await pdfDoc.value.getPage(pageNum)

  const canvas = pdfCanvas.value

  const context = canvas.getContext("2d")

  const viewport = page.getViewport({ scale: 1.5 })

  canvas.height = viewport.height

  canvas.width = viewport.width

  await page.render({
    canvasContext: context,
    viewport
  }).promise

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



watch(currentTemplate, async (template) => {

  if (template?.storage_path) {

    await loadPDFPreview()

  }

})

</script>



<style scoped>

canvas {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

</style>
