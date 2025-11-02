import { Document, Packer, Paragraph, TextRun, convertInchesToTwip, AlignmentType } from 'docx';
import html2pdf from 'html2pdf.js';

interface ParagraphOptions {
  size?: number;
  bold?: boolean;
  alignment?: typeof AlignmentType[keyof typeof AlignmentType];
  indent?: {
    left?: number;
    right?: number;
  };
}



export const exportToWord = async (content: string, documentName: string): Promise<Blob> => {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    console.log('Iniciando exportación a Word');

  // Crear un elemento temporal para procesar el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Eliminar estilos y scripts del HTML para evitar que su contenido se trate como texto
  tempDiv.querySelectorAll('style, script').forEach(el => el.remove());

    // Procesar el contenido por secciones
    const children: Paragraph[] = [];

    // Función para crear un párrafo con formato
    const createParagraph = (text: string, options: ParagraphOptions = {}) => {
      // Build TextRun props explicitly to avoid passing unsupported options
  const runProps: Record<string, unknown> = { text };
      if (options.size) runProps.size = options.size;
      if (options.bold) runProps.bold = options.bold;


      type LocalParagraphProps = {
        children: any[];
        spacing: { line: number; before: number; after: number };
        alignment?: typeof AlignmentType[keyof typeof AlignmentType];
        indent?: { left?: number; right?: number };
      };

      const paragraphProps: LocalParagraphProps = {
        children: [new TextRun(runProps)],
        spacing: { line: 360, before: 200, after: 200 },
        alignment: options.alignment || AlignmentType.JUSTIFIED,
      };

      if (options.indent) {
        paragraphProps.indent = {};
        if (options.indent.left) paragraphProps.indent.left = options.indent.left;
        if (options.indent.right) paragraphProps.indent.right = options.indent.right;
      }

      return new Paragraph(paragraphProps as any);
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

    // Función recursiva para procesar nodos
    const processNode = (node: Node) => {
      // Ignore style and script elements entirely
      if (node instanceof Element && ['style', 'script'].includes(node.tagName.toLowerCase())) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || '';
        if (text) {
          children.push(createParagraph(text));
        }
        return;
      }

      if (node instanceof Element) {
        const tagName = node.tagName.toLowerCase();
        const text = node.textContent?.trim() || '';

        switch (tagName) {
          case 'h1':
            children.push(createParagraph(text, {
              size: 28,
              bold: true,
              alignment: AlignmentType.CENTER
            }));
            break;

          case 'h2':
            children.push(createParagraph(text, {
              size: 24,
              bold: true
            }));
            break;

          case 'ol':
          case 'ul':
            Array.from(node.children).forEach((li, index) => {
              const listText = li.textContent?.trim() || '';
              if (listText) {
                children.push(createParagraph(`${index + 1}. ${listText}`, {
                  indent: { left: 720 } // 0.5 pulgadas (twip)
                }));
              }
            });
            break;

          case 'p':
            if (text) {
              const style: ParagraphOptions = {
                size: 24 // 12pt
              };

              // Verificar si el párrafo contiene texto en negrita
              if (node.querySelector('strong')) {
                style.bold = true;
              }

              children.push(createParagraph(text, style));
            }
            break;

          default:
            // Procesar los hijos recursivamente
            node.childNodes.forEach(child => processNode(child));
            break;
        }
      }
    };

    // Procesar todo el contenido
    processNode(tempDiv);

    // Crear el documento con los estilos definidos
    const doc = new Document({
      title: documentName,
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      }],
    });    console.log('Documento creado, generando blob...');
    const blob = await Packer.toBlob(doc);
    console.log('Blob generado:', { size: blob.size, type: blob.type });

    return blob;
  } catch (error) {
    console.error('Error en exportToWord:', error);
    throw error;
  }
};

export const exportToPDF = async (content: string, documentName: string): Promise<Blob> => {
  try {
    // Crear un contenedor temporal para el contenido HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // Aplicar estilos base al contenedor temporal (mejor incluir en head para que html2pdf los vea correctamente)
    tempDiv.style.padding = '40px';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '1.5';
    tempDiv.style.textAlign = 'justify';

    // Aplicar estilos específicos globales temporales para la generación
    const styles = document.createElement('style');
    styles.setAttribute('data-temp-pdf-style', 'true');
    styles.textContent = `
      .page { background: #fff; }
      .page, .contract-content { width: 21cm; box-sizing: border-box; }
      h1 { text-align: center; font-size: 14pt; margin: 1em 0; }
      h2 { font-size: 12pt; margin: 1em 0; }
      p { text-align: justify; margin: 1em 0; }
      ol, ul { margin-left: 2em; }
      li { text-align: justify; margin: 0.5em 0; }
    `;

    // Añadir estilos al head temporalmente
    document.head.appendChild(styles);
    document.body.appendChild(tempDiv);

    try {
      // Opciones para la generación del PDF
      const opt = {
        margin: [25.4, 25.4, 25.4, 25.4] as [number, number, number, number], // 1 inch = 25.4 mm
        filename: `${documentName}.pdf`,
        image: { type: 'jpeg' as const, quality: 1 },
        html2canvas: {
          scale: 2.5,
          useCORS: true,
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generar el PDF y obtener el blob
      const worker = html2pdf().from(tempDiv).set(opt);
      // html2pdf.js no tiene siempre .outputPdf('blob') en todas las builds,
      // así que pedimos la salida en arraybuffer y la convertimos a Blob.
      const result = await worker.outputPdf('arraybuffer');

      let pdfBlob: Blob;
      if (result instanceof ArrayBuffer) {
        pdfBlob = new Blob([result], { type: 'application/pdf' });
      } else if (result instanceof Blob) {
        pdfBlob = result;
      } else if (typeof result === 'string' && result.startsWith('data:application/pdf')) {
        // data URI fallback
        const base64 = result.split(',')[1] || '';
        let byteArray: Uint8Array;
        if (typeof atob === 'function') {
          const byteChars = atob(base64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          byteArray = new Uint8Array(byteNumbers);
        } else if (typeof Buffer !== 'undefined') {
          const buf = Buffer.from(base64, 'base64');
          byteArray = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        } else {
          throw new Error('No hay método disponible para decodificar base64');
        }

  // Ensure we pass an ArrayBuffer (not a SharedArrayBuffer) to Blob
  // Make a copy into a plain ArrayBuffer so Blob typing is satisfied
  const copied = new Uint8Array(byteArray.length);
  copied.set(byteArray);
  const ab = copied.buffer;
  pdfBlob = new Blob([ab], { type: 'application/pdf' });
      } else {
        throw new Error('No se pudo generar el PDF: formato de salida inesperado');
      }

      return pdfBlob;
    } finally {
      // Limpiar el contenedor temporal y estilos
      if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
      const existingStyle = document.head.querySelector('style[data-temp-pdf-style]');
      if (existingStyle) existingStyle.remove();
    }
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    throw error;
  }
};
