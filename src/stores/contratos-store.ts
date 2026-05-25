import { defineStore } from 'pinia';
import { exportToWord, exportToPDF } from '../utils/documentExport'; // Mantenemos las funciones de exportación
import { supabase } from '../lib/supabaseClient';
import {
  listenContratos,
  getContratoDownloadURL,
  downloadContrato,
  type ContratoFirebase
} from '../services/contratosService';
import type { Unsubscribe } from 'firebase/firestore';


/**
 * NUEVA INTERFAZ: Define la estructura de una plantilla de contrato que viene de Supabase.
 * Nota que volvemos a usar 'content' y 'variables', en lugar de 'storage_path'.
 */
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

    // Nuevos estados para los contratos de Firebase:
    firebaseContratos: [] as ContratoFirebase[],
    selectedContrato: null as ContratoFirebase | null,
    firebaseLoading: false,
    firebaseError: null as string | null,
    _unsubscribeContratos: null as Unsubscribe | null,

    // -----------------------------
    // Esto es de supabase:

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
      try {
        const contract = this.modifiedContracts.find(c => c.templateId === templateId);
        if (!contract) {
          console.error('Contrato no encontrado:', templateId);
          throw new Error('No se encontró el contrato para exportar');
        }

        // CORRECCIÓN 2: No se puede usar un getter (`this.getTemplateById`) dentro de una acción de esta manera.
        // En su lugar, buscamos directamente en el array de estado `this.templates`.
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
          console.error('Plantilla no encontrada:', templateId);
          throw new Error('No se encontró la plantilla del contrato');
        }

        const blob = await exportToWord(contract.modifiedContent, template.name);

        return blob;
      } catch (error) {
        console.error('Error en exportToWord:', error);
        throw error;
      }
    },

    async exportToPDF(templateId: string): Promise<Blob> {
      try {
        const contract = this.modifiedContracts.find(c => c.templateId === templateId);
        if (!contract) {
          console.error('Contrato no encontrado:', templateId);
          throw new Error('No se encontró el contrato para exportar');
        }

        // CORRECCIÓN 2 (aplicada también aquí): Buscamos directamente en el array de estado.
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
          console.error('Plantilla no encontrada:', templateId);
          throw new Error('No se encontró la plantilla del contrato');
        }

        const blob = await exportToPDF(contract.modifiedContent, template.name);

        return blob;
      } catch (error) {
        console.error('Error en exportToPDF:', error);
        throw error;
      }
    },

    /**
     * Obtiene la URL pública de un PDF desde Supabase Storage
     */
    async getPDFUrl(storagePath: string): Promise<string> {

      try {

        const storage = getStorage()

        const fileRef = storageRef(storage, storagePath)

        const url = await getDownloadURL(fileRef)

        return url

      } catch (error) {
        console.error('Error obteniendo URL del PDF:', error);
        throw error;
      }
    },


    // Descarga el PDF original desde Supabase Storage
    async downloadOriginalPDF(templateId: string): Promise<Blob> {
      try {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
          throw new Error('Plantilla no encontrada');
        }

        if (!template.storage_path) {
          throw new Error('Este contrato no tiene un PDF almacenado');
        }

        const { data, error } = await supabase.storage
          .from('contratos_archivos')
          .download(template.storage_path);

        if (error || !data) {
          console.error('Error descargando PDF:', error);
          throw new Error(`Error al descargar el PDF: ${error?.message || 'Desconocido'}`);
        }

        return data;
      } catch (error) {
        console.error('Error en downloadOriginalPDF:', error);
        throw error;
      }
    },


    // -------------------------------------------------

    // Seccion para Firebase:

    startListeningFirebaseContratos() {
      // Evitar múltiples suscripciones simultáneas
      if (this._unsubscribeContratos) {
        return; // Ya estamos escuchando
      }

      this.firebaseLoading = true;
      this.firebaseError = null;

      // listenContratos retorna una función para cancelar la escucha
      this._unsubscribeContratos = listenContratos(
        // Callback de éxito: se ejecuta cada vez que hay cambios
        (contratos) => {
          this.firebaseContratos = contratos;
          this.firebaseLoading = false;
        },
        // Callback de error
        (error) => {
          this.firebaseError = error.message;
          this.firebaseLoading = false;
        }
      );
    },

    // Nuevo: Detener la escucha en tiempo real.
    /*

    ¿Por qué es importante?
    - Cada onSnapshot mantiene una conexión WebSocket abierta con Firebase.
    - Si no la cerramos cuando el componente se desmonta, seguirá
   consumiendo recursos y podría causar memory leaks.

    */

    stopListeningFirebaseContratos() {
      if (this._unsubscribeContratos) {
        this._unsubscribeContratos(); // Cancela la suscripción
        this._unsubscribeContratos = null;
      }
    },


    // Seleccionar contrato de Firebase para previsualizar:
    selectFirebaseContrato(contrato: ContratoFirebase | null) {
      this.selectedContrato = contrato;
    },

    // Obtener URL de descarga de un contrato:
    async getFirebaseContratoURL(storagePath: string): Promise<string> {
      return await getContratoDownloadURL(storagePath);
    },

    // Descargar el contrato como blob:
    async downloadFirebaseContrato(storagePath: string): Promise<Blob> {
      return await downloadContrato(storagePath);
    },

  },


});
