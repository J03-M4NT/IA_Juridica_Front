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
    console.log('Iniciando exportación a Word');

    // Crear un elemento temporal para procesar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // Procesar el contenido por secciones
    const children: Paragraph[] = [];

    // Función para crear un párrafo con formato
    const createParagraph = (text: string, options: ParagraphOptions = {}) => {
      return new Paragraph({
        children: [new TextRun({ ...options, text })],
        spacing: { line: 360, before: 200, after: 200 },
        alignment: options.alignment || AlignmentType.JUSTIFIED,
      });
    };

    // Función recursiva para procesar nodos
    const processNode = (node: Node) => {
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
                  indent: { left: 720 } // 0.5 pulgadas
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

    // Aplicar estilos base
    tempDiv.style.padding = '40px';
    tempDiv.style.fontSize = '12pt';
    tempDiv.style.lineHeight = '1.5';
    tempDiv.style.textAlign = 'justify';

    // Aplicar estilos específicos
    const styles = document.createElement('style');
    styles.textContent = `
      h1 {
        text-align: center;
        font-size: 14pt;
        margin: 1em 0;
      }
      h2 {
        font-size: 12pt;
        margin: 1em 0;
      }
      p {
        text-align: justify;
        margin: 1em 0;
      }
      ol, ul {
        margin-left: 2em;
      }
      li {
        text-align: justify;
        margin: 0.5em 0;
      }
    `;
    tempDiv.appendChild(styles);
    document.body.appendChild(tempDiv);

    try {
      // Opciones para la generación del PDF
      const opt = {
        margin: [25, 20, 25, 20] as [number, number, number, number], // [top, right, bottom, left] en mm
        filename: `${documentName}.pdf`,
        image: { type: 'jpeg' as const, quality: 1 },
        html2canvas: {
          scale: 2,
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
      const pdf = await html2pdf().from(tempDiv).set(opt).outputPdf('blob');
      return new Blob([pdf], { type: 'application/pdf' });
    } finally {
      // Limpiar el contenedor temporal
      document.body.removeChild(tempDiv);
    }
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    throw error;
  }
};
