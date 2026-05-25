import { defineStore } from 'pinia'
import { exportToWord, exportToPDF } from '../utils/documentExport'
import {
  listenContratos,
  getContratoDownloadURL,
  downloadContrato,
  getTemplateDownloadURL,
  type ContratoFirebase
} from '../services/contratosService'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../firebase/firebaseConfig'
import type { Unsubscribe } from 'firebase/firestore'

export interface ContractTemplate {
  id: string
  name: string
  type: string
  description?: string
  storage_path: string
  content?: string
  variables?: Record<string, string>[]
}

interface ModifiedContract {
  templateId: string
  variables: Record<string, string>
  modifiedContent: string
}

export const useContratosStore = defineStore('contratos', {
  state: () => ({
    firebaseContratos: [] as ContratoFirebase[],
    selectedContrato: null as ContratoFirebase | null,
    firebaseLoading: false,
    firebaseError: null as string | null,
    _unsubscribeContratos: null as Unsubscribe | null,

    templates: [] as ContractTemplate[],
    currentTemplate: null as ContractTemplate | null,
    modifiedContracts: [] as ModifiedContract[],
    isLoading: false,
    error: null as string | null,
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
    // ================================
    // TEMPLATES DE FIREBASE
    // ================================
    async fetchTemplates() {
      this.isLoading = true
      this.error = null

      try {
        const querySnapshot = await getDocs(collection(db, 'contract_templates'))
        const templates: ContractTemplate[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          templates.push({
            id: doc.id,
            name: data.name || 'Sin nombre',
            type: data.type || 'general',
            description: data.description || '',
            storage_path: data.storage_path || '',
            content: data.content,
            variables: data.variables
          } as ContractTemplate)
        })

        this.templates = templates
        console.log('📋 Templates cargados desde Firebase:', templates.length)
      } catch (err) {
        const error = err as Error
        console.error('❌ Error cargando templates:', error)
        this.error = error.message || 'Error cargando plantillas'
      } finally {
        this.isLoading = false
      }
    },

    setCurrentTemplate(template: ContractTemplate | null) {
      this.currentTemplate = template

      if (template) {
        this.updateModifiedContract(
          template.id,
          {},
          template.content || ''
        )
      }
    },

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

    // ================================
    // EXPORTACIÓN
    // ================================
    async exportToWord(templateId: string): Promise<Blob> {
      try {
        const contract = this.modifiedContracts.find(c => c.templateId === templateId)
        if (!contract) {
          throw new Error('No se encontró el contrato para exportar')
        }

        const template = this.templates.find(t => t.id === templateId)
        if (!template) {
          throw new Error('No se encontró la plantilla del contrato')
        }

        return await exportToWord(contract.modifiedContent, template.name)
      } catch (err) {
        const error = err as Error
        console.error('Error en exportToWord:', error)
        throw error
      }
    },

    async exportToPDF(templateId: string): Promise<Blob> {
      try {
        const contract = this.modifiedContracts.find(c => c.templateId === templateId)
        if (!contract) {
          throw new Error('No se encontró el contrato para exportar')
        }

        const template = this.templates.find(t => t.id === templateId)
        if (!template) {
          throw new Error('No se encontró la plantilla del contrato')
        }

        return await exportToPDF(contract.modifiedContent, template.name)
      } catch (err) {
        const error = err as Error
        console.error('Error en exportToPDF:', error)
        throw error
      }
    },

    // ================================
    // FIREBASE STORAGE - TEMPLATES
    // ================================
    async getPDFUrl(storagePath: string): Promise<string> {
      try {
        if (!storagePath) {
          throw new Error('No se proporcionó una ruta de almacenamiento')
        }

        const url = await getTemplateDownloadURL(storagePath)
        return url
      } catch (err) {
        const error = err as Error
        console.error('❌ Error obteniendo URL del PDF:', error)
        throw error
      }
    },

    async downloadOriginalPDF(templateId: string): Promise<Blob> {
      try {
        const template = this.templates.find(t => t.id === templateId)
        if (!template) {
          throw new Error('Plantilla no encontrada')
        }

        if (!template.storage_path) {
          throw new Error('Este contrato no tiene un PDF almacenado')
        }

        return await downloadContrato(template.storage_path)
      } catch (err) {
        const error = err as Error
        console.error('Error en downloadOriginalPDF:', error)
        throw error
      }
    },

    // ================================
    // FIREBASE CONTRATOS GENERADOS
    // ================================
    startListeningFirebaseContratos() {
      if (this._unsubscribeContratos) {
        console.log('⚠️ Ya existe una suscripción activa')
        return
      }

      this.firebaseLoading = true
      this.firebaseError = null

      try {
        this._unsubscribeContratos = listenContratos(
          (contratos) => {
            this.firebaseContratos = contratos
            this.firebaseLoading = false
            console.log('🔥 Contratos Firebase actualizados:', contratos.length)
          },
          (error) => {
            this.firebaseError = error.message
            this.firebaseLoading = false
            console.error('❌ Error escuchando contratos:', error)
          }
        )
      } catch (err) {
        const error = err as Error
        this.firebaseError = error.message
        this.firebaseLoading = false
        console.error('❌ Error iniciando listener:', error)
      }
    },

    stopListeningFirebaseContratos() {
      if (this._unsubscribeContratos) {
        this._unsubscribeContratos()
        this._unsubscribeContratos = null
        console.log('🛑 Listener de contratos detenido')
      }
    },

    selectFirebaseContrato(contrato: ContratoFirebase | null) {
      this.selectedContrato = contrato
    },

    async getFirebaseContratoURL(storagePath: string): Promise<string> {
      try {
        return await getContratoDownloadURL(storagePath)
      } catch (err) {
        const error = err as Error
        console.error('❌ Error obteniendo URL del contrato:', error)
        throw error
      }
    },

    async downloadFirebaseContrato(storagePath: string): Promise<Blob> {
      try {
        return await downloadContrato(storagePath)
      } catch (err) {
        const error = err as Error
        console.error('❌ Error descargando contrato:', error)
        throw error
      }
    },
  }
})
