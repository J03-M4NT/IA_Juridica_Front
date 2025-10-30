import { defineStore } from 'pinia';
import { exportToWord, exportToPDF } from '../utils/documentExport';
import { arrendamientoTemplate } from '../assets/templates/arrendamiento';

export interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: Array<{
    key: string;
    label: string;
    type: 'text' | 'date' | 'number';
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
    async fetchTemplates() {
      this.isLoading = true;
      this.error = null;
      try {
        // Simular una pequeña demora para mostrar el estado de carga
        await new Promise(resolve => setTimeout(resolve, 500));

        // Cargar la plantilla de arrendamiento
        this.templates = [arrendamientoTemplate];
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Error desconocido';
      } finally {
        this.isLoading = false;
      }
    },

    setCurrentTemplate(template: ContractTemplate) {
      this.currentTemplate = template;
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

        const template = this.getTemplateById(templateId);
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

        const template = this.getTemplateById(templateId);
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
  },
});
