import { Document, Packer, Paragraph, TextRun, Tab, Table, TableRow, TableCell, WidthType, convertInchesToTwip, AlignmentType, LevelFormat, Header, Footer } from 'docx';
import html2pdf from 'html2pdf.js';

// Referencias de numeración registradas una sola vez en el Document (ver
// más abajo) — permite que <ol>/<ul> del HTML salgan como listas reales de
// Word (<w:numPr>), no como texto plano "1. 2. 3." con sangría.
const NUMERACION_ORDENADA = 'documento-lista-ordenada';
const NUMERACION_VINETAS = 'documento-lista-vinetas';

interface ParagraphOptions {
  size?: number;
  alignment?: typeof AlignmentType[keyof typeof AlignmentType];
  indent?: {
    left?: number;
    right?: number;
  };
  numbering?: {
    reference: string;
    level: number;
  };
}

interface TextRunProps {
  text?: string;
  children?: (string | Tab)[];
  size?: number;
  bold?: boolean;
  italics?: boolean;
  font?: string;
}

// Fuente de respaldo cuando no se pudo detectar la fuente real del tema
// del documento original (ver mammothExtractor.ts: detectarFuenteDelTema)
// — típica de documento legal, para PDFs (que no tienen tema que leer) o
// si la detección falla por cualquier motivo.
const FUENTE_DOCUMENTO_LEGAL = 'Times New Roman';

// Un run cuyo texto tenía tabulaciones (<w:tab/> en el original — mammoth
// las convierte a '\t' literal, ver document-to-html.js) no puede pasarse
// como un string plano: se parte en fragmentos de texto intercalados con
// Tab() reales, para que Word los siga tratando como saltos de tabulador
// (con sus propios tabuladores por defecto, igual que el original — acá
// no hace falta definir tabStops a mano) en vez de como espacio común.
function fragmentosConTabs(texto: string): (string | Tab)[] {
  const partes = texto.split('\t');
  const resultado: (string | Tab)[] = [];
  partes.forEach((parte, i) => {
    if (parte) resultado.push(parte);
    if (i < partes.length - 1) resultado.push(new Tab());
  });
  return resultado;
}

// Un fragmento de texto con su propio formato (negrita/cursiva) — un
// párrafo puede tener varios, ej. "El arrendador entrega el inmueble en
// **buen estado** de conservación." es 3 fragmentos, solo el del medio en
// negrita. Antes se armaba UN solo TextRun por párrafo y se ponía todo en
// negrita si HABÍA algún <strong> en cualquier parte — eso negriteaba
// párrafos enteros por una sola palabra en negrita en el original.
interface RunFragmento {
  text: string;
  bold?: boolean;
  italic?: boolean;
}



// Construye la lista de párrafos/tablas de docx a partir del HTML del
// editor — compartida entre exportToWord (documento limpio) y
// exportToWordConMarcaDeAgua (mismo cuerpo, con header/footer extra), así
// las dos exportaciones producen exactamente el mismo contenido de body.
const construirChildrenDesdeHtml = (content: string, fuente: string): (Paragraph | Table)[] => {
  /* eslint-disable @typescript-eslint/no-explicit-any */

  // Crear un elemento temporal para procesar el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Eliminar estilos y scripts del HTML para evitar que su contenido se trate como texto
  tempDiv.querySelectorAll('style, script').forEach(el => el.remove());

    // Procesar el contenido por secciones
    const children: (Paragraph | Table)[] = [];

    // Función para crear un párrafo a partir de uno o más fragmentos con
    // formato propio (ver RunFragmento) — reemplaza a la vieja
    // createParagraph(text: string), que solo podía aplicar un formato a
    // todo el párrafo junto.
    const crearParrafo = (runs: RunFragmento[], options: ParagraphOptions = {}) => {
      const textRuns = runs
        .filter(r => r.text)
        .map(r => {
          const runProps: TextRunProps = r.text.includes('\t')
            ? { children: fragmentosConTabs(r.text), font: fuente }
            : { text: r.text, font: fuente };
          if (options.size) runProps.size = options.size;
          if (r.bold) runProps.bold = true;
          if (r.italic) runProps.italics = true;
          return new TextRun(runProps);
        });

      type LocalParagraphProps = {
        children: any[];
        spacing: { line: number; before: number; after: number };
        alignment?: typeof AlignmentType[keyof typeof AlignmentType];
        indent?: { left?: number; right?: number };
        numbering?: { reference: string; level: number };
      };

      const paragraphProps: LocalParagraphProps = {
        children: textRuns,
        spacing: { line: 360, before: 200, after: 200 },
        // La alineación real de Word para un párrafo sin w:jc explícito
        // (el caso más común) es IZQUIERDA, no justificada — JUSTIFIED
        // acá solo debe salir cuando el original estaba explícitamente
        // justificado (ver documento-align-justify en el caso 'p' abajo).
        alignment: options.alignment || AlignmentType.LEFT,
      };

      if (options.indent) {
        paragraphProps.indent = {};
        if (options.indent.left) paragraphProps.indent.left = options.indent.left;
        if (options.indent.right) paragraphProps.indent.right = options.indent.right;
      }

      if (options.numbering) {
        paragraphProps.numbering = options.numbering;
      }

      return new Paragraph(paragraphProps as any);
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

    // Recorre los hijos de un nodo y arma la lista de fragmentos con su
    // formato heredado (negrita/cursiva) — un <strong>/<em> anidado hereda
    // el formato de sus ancestros, así que una palabra en negrita dentro de
    // un párrafo ya en cursiva queda negrita Y cursiva, no solo negrita.
    // <br> se convierte en un espacio (no en '', que pegaría el texto de
    // antes y de después sin separación).
    const extraerRuns = (node: Node, boldHeredado = false, italicHeredado = false): RunFragmento[] => {
      const runs: RunFragmento[] = [];
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          // Colapsa espacios/saltos de línea repetidos, pero preserva los
          // caracteres tab (incluidos varios seguidos) — mammoth los deja
          // como '\t' literal cuando el original usaba tabuladores de Word
          // para alinear columnas (ej. un bloque de firmas), y crearParrafo
          // los convierte de vuelta a tabuladores reales de Word.
          const texto = (child.textContent ?? '').replace(/[^\S\t]+/g, ' ');
          if (texto) runs.push({ text: texto, bold: boldHeredado, italic: italicHeredado });
          return;
        }
        if (child instanceof Element) {
          const tag = child.tagName.toLowerCase();
          if (tag === 'style' || tag === 'script') return;
          if (tag === 'br') {
            runs.push({ text: ' ', bold: boldHeredado, italic: italicHeredado });
            return;
          }
          const esNegrita = boldHeredado || tag === 'strong' || tag === 'b';
          const esCursiva = italicHeredado || tag === 'em' || tag === 'i';
          runs.push(...extraerRuns(child, esNegrita, esCursiva));
        }
      });
      return runs;
    };

    // Función recursiva para procesar nodos
    const processNode = (node: Node) => {
      // Ignore style and script elements entirely
      if (node instanceof Element && ['style', 'script'].includes(node.tagName.toLowerCase())) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || '';
        if (text) {
          children.push(crearParrafo([{ text }]));
        }
        return;
      }

      if (node instanceof Element) {
        const tagName = node.tagName.toLowerCase();

        switch (tagName) {
          case 'h1': {
            const runs = extraerRuns(node, true);
            if (runs.length) {
              children.push(crearParrafo(runs, { size: 28, alignment: AlignmentType.CENTER }));
            }
            break;
          }

          case 'h2': {
            const runs = extraerRuns(node, true);
            if (runs.length) {
              children.push(crearParrafo(runs, { size: 24 }));
            }
            break;
          }

          case 'ol':
          case 'ul': {
            // Numeración/viñeta real de Word (<w:numPr>), no un "1. " de
            // texto plano pegado a mano — así Word sigue reconociendo la
            // lista como lista de verdad (renumera si se borra un ítem,
            // se puede cambiar el estilo de numeración, etc.).
            const referencia = tagName === 'ol' ? NUMERACION_ORDENADA : NUMERACION_VINETAS;
            Array.from(node.children).forEach(li => {
              const runsLi = extraerRuns(li);
              if (runsLi.length === 0) return;
              children.push(crearParrafo(runsLi, {
                numbering: { reference: referencia, level: 0 }
              }));
            });
            break;
          }

          case 'p': {
            const runs = extraerRuns(node);
            if (runs.length) {
              const style: ParagraphOptions = { size: 24 }; // 12pt
              // Alineación real capturada por mammothExtractor.ts (ver
              // ALINEACION_CENTRO_ID/ALINEACION_IZQUIERDA_ID/
              // ALINEACION_JUSTIFICADA_ID) — si no matchea ninguna clase,
              // crearParrafo cae en su default (izquierda, no justificado
              // — ver el comentario ahí).
              if (node.classList.contains('documento-align-center')) {
                style.alignment = AlignmentType.CENTER;
              } else if (node.classList.contains('documento-align-justify')) {
                style.alignment = AlignmentType.JUSTIFIED;
              } else if (node.classList.contains('documento-align-left')) {
                style.alignment = AlignmentType.LEFT;
              }
              children.push(crearParrafo(runs, style));
            }
            break;
          }

          case 'table': {
            // Sin este caso, <table>/<tr>/<td> caían en el default (solo
            // recorrer hijos) y el texto de las celdas terminaba como
            // párrafos sueltos, perdiendo la grilla por completo.
            const filas = Array.from(node.querySelectorAll('tr'));
            if (filas.length === 0) break;

            const numColumnas = Math.max(...filas.map(fila => fila.querySelectorAll('td, th').length));
            if (numColumnas === 0) break;

            const tableRows = filas.map(fila => {
              const celdas = Array.from(fila.querySelectorAll('td, th'));
              const tableCells = celdas.map(celda => {
                const runsCelda = extraerRuns(celda);
                const parrafoCelda = crearParrafo(runsCelda, { size: 24 });
                return new TableCell({
                  width: { size: Math.round(100 / numColumnas), type: WidthType.PERCENTAGE },
                  children: [parrafoCelda]
                });
              });
              return new TableRow({ children: tableCells });
            });

            children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            break;
          }

          default:
            // Procesar los hijos recursivamente
            node.childNodes.forEach(child => processNode(child));
            break;
        }
      }
    };

    // Procesar todo el contenido
    processNode(tempDiv);

    return children;
};

// Definiciones de numeración compartidas (ver NUMERACION_ORDENADA/
// NUMERACION_VINETAS) — registradas igual en ambos documentos generados.
const numberingConfig = {
  config: [
    {
      reference: NUMERACION_ORDENADA,
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }]
    },
    {
      reference: NUMERACION_VINETAS,
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START }]
    }
  ]
};

const margenesPagina = {
  top: convertInchesToTwip(1),
  right: convertInchesToTwip(1),
  bottom: convertInchesToTwip(1),
  left: convertInchesToTwip(1),
};

// fuentePorDefecto: la fuente real detectada del tema del .docx original
// (ver mammothExtractor.ts, detectarFuenteDelTema) — si no se detectó
// (ej. viene de un PDF, o el documento no tiene tema legible), se usa
// FUENTE_DOCUMENTO_LEGAL como respaldo.
export const exportToWord = async (content: string, documentName: string, fuentePorDefecto?: string): Promise<Blob> => {
  try {
    const fuente = fuentePorDefecto || FUENTE_DOCUMENTO_LEGAL;
    const children = construirChildrenDesdeHtml(content, fuente);

    // Crear el documento con los estilos definidos
    const doc = new Document({
      title: documentName,
      // Fuente por defecto a nivel de documento, además de fijarla en
      // cada TextRun (ver crearParrafo, dentro de construirChildrenDesdeHtml)
      // — un segundo nivel de garantía para que ningún texto (ej. el de una
      // celda de tabla vacía, o cualquier caso borde no cubierto
      // explícitamente) termine con la fuente por defecto de la librería en
      // vez de la detectada/de respaldo.
      styles: {
        default: {
          document: {
            run: { font: fuente }
          }
        }
      },
      numbering: numberingConfig,
      sections: [{
        properties: { page: { margin: margenesPagina } },
        children,
      }],
    });
    const blob = await Packer.toBlob(doc);

    return blob;
  } catch (error) {
    console.error('Error en exportToWord:', error);
    throw error;
  }
};

const TEXTO_MARCA_AGUA = 'LEXIT';
const TEXTO_PIE_PAGINA = 'Generado por LexIT';

// Membrete de marca en la esquina superior derecha (ver diseño de
// referencia del usuario: wordmark tipo "LA FIDUCIARIA | 25", chico y
// elegante, no la marca de agua diagonal de fondo clásica de Word que se
// había hecho primero) — una fuente serif con tracking amplio, en vez de
// la fuente del cuerpo del documento, para que se lea como logo/membrete
// y no como texto del contrato.
const FUENTE_MARCA = 'Georgia';

// Igual que exportToWord, pero agrega el membrete "LEXIT" en la esquina
// superior derecha de cada página y el texto "Generado por LexIT" en el
// pie de página real de Word (se repite en cada página, a diferencia del
// pie de página de Consultas que es solo un párrafo final visible una vez).
export const exportToWordConMarcaDeAgua = async (content: string, documentName: string, fuentePorDefecto?: string): Promise<Blob> => {
  try {
    const fuente = fuentePorDefecto || FUENTE_DOCUMENTO_LEGAL;
    const children = construirChildrenDesdeHtml(content, fuente);

    const doc = new Document({
      title: documentName,
      styles: {
        default: {
          document: {
            run: { font: fuente }
          }
        }
      },
      numbering: numberingConfig,
      sections: [{
        properties: { page: { margin: margenesPagina } },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: TEXTO_MARCA_AGUA,
                font: FUENTE_MARCA,
                bold: true,
                size: 22,
                characterSpacing: 40,
                color: '2B2B2B',
              })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: TEXTO_PIE_PAGINA, size: 18, color: '999999' })],
            })],
          }),
        },
        children,
      }],
    });

    return await Packer.toBlob(doc);
  } catch (error) {
    console.error('Error en exportToWordConMarcaDeAgua:', error);
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
