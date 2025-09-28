import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

// ✅ Configurar el worker de PDF.js con import ?url (método más estable en Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
console.log('✅ Worker de PDF.js configurado en pdfExtractor con import ?url:', pdfjsWorker);

export async function extraerTextoPDF(file: File): Promise<string> {
  try {
    console.log('Iniciando extracción de texto del PDF:', file.name);

    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer creado, tamaño:', arrayBuffer.byteLength);

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF cargado, número de páginas:', pdf.numPages);

    let texto = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Procesando página ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: unknown) => {
        const pdfItem = item as { str?: string };
        return pdfItem.str || '';
      });
      const textoPagina = strings.join(" ");
      texto += textoPagina + "\n";
    }

    console.log('Texto extraído exitosamente, longitud total:', texto.length);
    return texto;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw new Error(`Error al extraer texto del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}
