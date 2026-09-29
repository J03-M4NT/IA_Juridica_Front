import { renderAsync } from 'docx-preview'

// =========================
// VISTA PREVIA FIEL DEL WORD (Análisis de Contratos)
// docx-preview dibuja el .docx en el navegador tal como es: fuentes,
// tamaños, espaciados, tablas, encabezados, pies de página, logos y
// páginas. Corre en el navegador del usuario: el documento no se envía a
// ningún servicio externo.
//
// Cada párrafo del cuerpo (<p> dentro de <article>) se dibuja en el mismo
// orden que los <w:p> de word/document.xml — verificado con contratos
// reales (1368/1369, 105/105, 40/40, 36/36 en la misma posición). Por eso
// cada uno recibe data-p con su posición: al descargar, el servidor sabe
// exactamente qué párrafo del .docx original cambió (y además lo verifica
// por texto antes de tocarlo, ver functions/src/editarDocx.ts).
// =========================

export interface WordRenderizado {
  html: string
  estilos: string
}

export async function renderizarWord(archivo: File): Promise<WordRenderizado> {
  const contenedor = document.createElement('div')
  const estilos = document.createElement('div')
  // docx-preview mide algunas figuras (logos/líneas VML) al dibujarlas: el
  // contenedor tiene que estar en el documento, aunque fuera de la vista.
  contenedor.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;'
  document.body.append(estilos, contenedor)

  try {
    await renderAsync(await archivo.arrayBuffer(), contenedor, estilos, {
      className: 'docx',
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      // Imágenes incrustadas en el HTML (no URLs temporales que caducan).
      useBase64URL: true,
      experimental: false
    })
    // Las figuras VML terminan de ajustarse en el siguiente cuadro.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    // Posición de cada párrafo del cuerpo (las notas al pie/final, que se
    // dibujan en listas aparte, no son párrafos de document.xml).
    let indice = 0
    contenedor.querySelectorAll('article p').forEach(p => {
      if (p.closest('ol')) return
      p.setAttribute('data-p', String(indice++))
    })
    // Encabezados y pies se ven pero no se editan (viven en otras partes
    // del .docx, que la descarga no modifica).
    contenedor.querySelectorAll('header, footer').forEach(el => el.setAttribute('contenteditable', 'false'))

    return {
      html: contenedor.innerHTML,
      estilos: Array.from(estilos.querySelectorAll('style')).map(s => s.textContent ?? '').join('\n')
    }
  } finally {
    contenedor.remove()
    estilos.remove()
  }
}
