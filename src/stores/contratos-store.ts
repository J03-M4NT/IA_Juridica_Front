import { defineStore } from "pinia"
import { exportToWord, exportToPDF } from "../utils/documentExport"

import { db } from "../firebase/firebaseConfig"
import { collection, getDocs } from "firebase/firestore"

import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage"

export interface ContractTemplate {
  id: string
  name: string
  type: string
  storage_path?: string
  content?: string
  variables?: any[]
}

interface ModifiedContract {
  templateId: string
  variables: Record<string, string>
  modifiedContent: string
}

export const useContratosStore = defineStore("contratos", {
  state: () => ({
    templates: [] as ContractTemplate[],
    currentTemplate: null as ContractTemplate | null,
    modifiedContracts: [] as ModifiedContract[],
    isLoading: false,
    error: null as string | null
  }),

  getters: {
    getTemplateById: (state) => {
      return (id: string) => state.templates.find(t => t.id === id)
    },

    getModifiedContract: (state) => {
      return (templateId: string) =>
        state.modifiedContracts.find(m => m.templateId === templateId)
    }
  },

  actions: {

    /*
    ===============================
    OBTENER PLANTILLAS DESDE FIRESTORE
    ===============================
    */

    async fetchTemplates() {

      this.isLoading = true
      this.error = null

      try {

        const querySnapshot = await getDocs(collection(db, "contract_templates"))

        const templates: ContractTemplate[] = []

        querySnapshot.forEach((doc) => {

          templates.push({
            id: doc.id,
            ...doc.data()
          } as ContractTemplate)

        })

        this.templates = templates

        console.log("CONTRATOS CARGADOS:", templates)

      } catch (error) {

        console.error("Error cargando contratos:", error)
        this.error = "Error cargando contratos"

      } finally {

        this.isLoading = false

      }
    },

    /*
    ===============================
    SELECCIONAR PLANTILLA
    ===============================
    */

    setCurrentTemplate(template: ContractTemplate | null) {

      this.currentTemplate = template

      if (template) {

        this.updateModifiedContract(
          template.id,
          {},
          template.content || ""
        )

      }
    },

    /*
    ===============================
    ACTUALIZAR CONTRATO MODIFICADO
    ===============================
    */

    updateModifiedContract(
      templateId: string,
      variables: Record<string, string>,
      modifiedContent: string
    ) {

      const index = this.modifiedContracts.findIndex(
        m => m.templateId === templateId
      )

      const modifiedContract = {
        templateId,
        variables,
        modifiedContent
      }

      if (index === -1) {

        this.modifiedContracts.push(modifiedContract)

      } else {

        this.modifiedContracts[index] = modifiedContract

      }
    },

    /*
    ===============================
    EXPORTAR WORD
    ===============================
    */

    async exportToWord(templateId: string): Promise<Blob> {

      const contract = this.modifiedContracts.find(
        c => c.templateId === templateId
      )

      if (!contract) {
        throw new Error("Contrato no encontrado")
      }

      const template = this.templates.find(
        t => t.id === templateId
      )

      if (!template) {
        throw new Error("Plantilla no encontrada")
      }

      const blob = await exportToWord(contract.modifiedContent, template.name)

      return blob
    },

    /*
    ===============================
    EXPORTAR PDF
    ===============================
    */

    async exportToPDF(templateId: string): Promise<Blob> {

      const contract = this.modifiedContracts.find(
        c => c.templateId === templateId
      )

      if (!contract) {
        throw new Error("Contrato no encontrado")
      }

      const template = this.templates.find(
        t => t.id === templateId
      )

      if (!template) {
        throw new Error("Plantilla no encontrada")
      }

      const blob = await exportToPDF(contract.modifiedContent, template.name)

      return blob
    },

    /*
    ===============================
    OBTENER URL DEL PDF DESDE FIREBASE STORAGE
    ===============================
    */

    async getPDFUrl(storagePath: string): Promise<string> {

      try {

        const storage = getStorage()

        const fileRef = storageRef(storage, storagePath)

        const url = await getDownloadURL(fileRef)

        return url

      } catch (error) {

        console.error("Error obteniendo PDF:", error)
        throw error

      }
    }

  }
})
