import html2pdf from 'html2pdf.js';
import { asBlob } from 'html-to-docx';

/**
 * Exporta contenido HTML a un archivo PDF.
 *
 * @param htmlContent El contenido HTML del contrato a exportar.
 * @param fileName El nombre que tendrá el archivo (sin la extensión).
 * @returns Una Promesa que se resuelve con el Blob del archivo PDF.
 */
export async function exportToPDF(htmlContent: string, fileName: string): Promise<Blob> {
  // 1. html2pdf.js necesita un elemento del DOM para trabajar.
  // Creamos un div temporal que no será visible en la página.
  const element = document.createElement('div');

  // 2. Para asegurar que el PDF se vea lo más parecido a la vista previa,
  // envolvemos el contenido en una estructura que simule una página A4.
  // Usaremos las mismas clases que en tu `ContractEditor.vue`.
  element.innerHTML = `
    <div style="width: 210mm; min-height: 297mm; padding: 2cm; background: white; box-sizing: border-box;">
      ${htmlContent}
    </div>
  `;

  // 3. Configuramos las opciones de exportación para html2pdf.js.
  const options = {
    margin: 0, // El padding ya está en nuestro div, así que no necesitamos margen.
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  // 4. Generamos el PDF y lo devolvemos como un Blob.
  // La librería se encarga de todo el proceso complejo.
  const pdfBlob = await html2pdf().from(element).set(options).output('blob');

  return pdfBlob as Blob;
}

/**
 * Exporta contenido HTML a un archivo Word (.docx).
 *
 * @param htmlContent El contenido HTML a exportar.
 * @param fileName El nombre del archivo (sin extensión).
 * @returns Una Promesa que se resuelve con el Blob del archivo DOCX.
 */
export async function exportToWord(htmlContent: string, fileName: string): Promise<Blob> {
  // La librería html-to-docx espera una cadena HTML completa.
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`;

  const docxBlob = await asBlob(fullHtml, {
    orientation: 'portrait',
    margins: {
      top: 1440, // 1 pulgada en twips (1/20 de punto)
      right: 1440,
      bottom: 1440,
      left: 1440,
    },
  });

  return docxBlob as Blob;
}