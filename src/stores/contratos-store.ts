import { defineStore } from 'pinia';
import { exportToWord, exportToPDF } from '../utils/documentExport'; // Mantenemos las funciones de exportación
import { supabase } from '../lib/supabaseClient';

/**
 * NUEVA INTERFAZ: Define la estructura de una plantilla de contrato que viene de Supabase.
 * Nota que volvemos a usar 'content' y 'variables', en lugar de 'storage_path'.
 */
export interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  storage_path?: string; // Ruta del PDF en Supabase Storage (bucket: contratos_archivos)
  variables: Array<{
    key: string;
    label: string;
    type: 'text' | 'date' | 'number'; // Tipos de variables que tu editor puede manejar
    required: boolean;
  }>;
}

interface ModifiedContract {
  templateId: string;
  variables: Record<string, string>;
  modifiedContent: string;
}

export const useContratosStore = defineStore('contratos', {
  state: () => ({
    templates: [] as ContractTemplate[],
    currentTemplate: null as ContractTemplate | null,
    modifiedContracts: [] as ModifiedContract[],
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    getTemplateById: (state) => {
      return (id: string) => state.templates.find(t => t.id === id);
    },
    getModifiedContract: (state) => {
      return (templateId: string) => state.modifiedContracts.find(
        m => m.templateId === templateId
      );
    },
  },

  actions: {
    /**
     * FUNCIÓN ACTUALIZADA: Esta acción ahora se conecta a tu tabla 'contract_templates' de Supabase
     * para obtener la lista de plantillas de texto disponibles.
     */
    async fetchTemplates() {
      this.isLoading = true;
      this.error = null;
      try {

        // 1. Realizamos la consulta a la tabla 'contract_templates' en Supabase
        const { data, error } = await supabase
          .from('contract_templates')
          .select('*');

        // 2. Manejamos el error si la consulta falla
        if (error) {
          console.error('Error fetching templates from Supabase:', error);
          throw new Error(`Error al obtener plantillas: ${error.message}`);
        }

        // 3. Asignamos los datos obtenidos al estado de la tienda.
        // 'data' ahora contiene la lista de tus contratos con su nombre y la ruta del archivo.
        this.templates = data || [];
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Error desconocido al cargar plantillas';
      } finally {
        this.isLoading = false;
      }
    },

    setCurrentTemplate(template: ContractTemplate | null) { // Permitimos que sea nulo para deseleccionar
      this.currentTemplate = template;
      // CORRECCIÓN 1: Al seleccionar una plantilla, es buena práctica limpiar
      // el estado modificado previo para evitar datos inconsistentes.
      if (template) {
        this.updateModifiedContract(template.id, {}, template.content);
      }
    },

    updateModifiedContract(templateId: string, variables: Record<string, string>, modifiedContent: string) {
      const index = this.modifiedContracts.findIndex(m => m.templateId === templateId);
      const modifiedContract = {
        templateId,
        variables,
        modifiedContent,
      };

      if (index === -1) {
        this.modifiedContracts.push(modifiedContract);
      } else {
        this.modifiedContracts[index] = modifiedContract;
      }
    },

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

        console.log('Exportando a Word:', {
          templateName: template.name,
          contentLength: contract.modifiedContent.length
        });

        const blob = await exportToWord(contract.modifiedContent, template.name);
        console.log('Exportación a Word completada:', {
          size: blob.size,
          type: blob.type
        });

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

        console.log('Exportando a PDF:', {
          templateName: template.name,
          contentLength: contract.modifiedContent.length
        });

        const blob = await exportToPDF(contract.modifiedContent, template.name);
        console.log('Exportación a PDF completada:', {
          size: blob.size,
          type: blob.type
        });

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
        const { data } = supabase.storage
          .from('contratos_archivos')
          .getPublicUrl(storagePath);

        if (!data || !data.publicUrl) {
          throw new Error('No se pudo obtener la URL pública del PDF');
        }

        return data.publicUrl;
      } catch (error) {
        console.error('Error obteniendo URL del PDF:', error);
        throw error;
      }
    },

    /**
     * Descarga el PDF original desde Supabase Storage
     */
    async downloadOriginalPDF(templateId: string): Promise<Blob> {
      try {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
          throw new Error('Plantilla no encontrada');
        }

        if (!template.storage_path) {
          throw new Error('Este contrato no tiene un PDF almacenado');
        }

        console.log('Descargando PDF desde:', template.storage_path);

        const { data, error } = await supabase.storage
          .from('contratos_archivos')
          .download(template.storage_path);

        if (error || !data) {
          console.error('Error descargando PDF:', error);
          throw new Error(`Error al descargar el PDF: ${error?.message || 'Desconocido'}`);
        }

        console.log('PDF descargado exitosamente:', {
          size: data.size,
          type: data.type
        });

        return data;
      } catch (error) {
        console.error('Error en downloadOriginalPDF:', error);
        throw error;
      }
    },
  },
});
