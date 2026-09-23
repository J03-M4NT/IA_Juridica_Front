import sys

with open('src/pages/LandingPage.vue', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if lines[i].startswith('<<<<<<< ours'):
        head_lines = []
        i += 1
        while not lines[i].startswith('======='):
            head_lines.append(lines[i])
            i += 1
        i += 1 # skip =======
        theirs_lines = []
        while not lines[i].startswith('>>>>>>> theirs'):
            theirs_lines.append(lines[i])
            i += 1
        i += 1 # skip >>>>>>> theirs
        
        # Now we decide based on the content of head_lines
        head_text = ''.join(head_lines)
        theirs_text = ''.join(theirs_lines)
        
        if "import { onMounted, onUnmounted, ref } from 'vue'" in head_text:
            new_lines.extend(head_lines)
        elif 'pageRoot' in head_text and 'authButtonsRef' in theirs_text:
            new_lines.extend([
                'const pageRoot = ref<HTMLElement | null>(null)\n',
                'const authButtonsRef = ref<InstanceType<typeof AuthButtons> | null>(null)\n\n',
                'function abrirAuth() {\n',
                '  authButtonsRef.value?.abrirLogin()\n',
                '}\n\n',
                'function scrollToSection(id: string) {\n',
                "  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })\n",
                '}\n\n',
                'const prefersReducedMotion = () =>\n',
                "  window.matchMedia('(prefers-reduced-motion: reduce)').matches\n\n",
                'let handleMouseMove: ((e: MouseEvent) => void) | null = null\n',
                'const scrollTriggers: ScrollTrigger[] = []\n'
            ])
        elif 'IntersectionObserver' in theirs_text and 'scrollTriggers' in head_text:
            new_lines.extend(head_lines)
        elif '<article class="feature-card">' in head_text and 'Análisis de PDF' in head_text:
            # Features section. We want to keep the main's features (Consultas, Gestión, Normas),
            # but use HEAD's styling (icon-teal, icon-pink, icon-purple)
            features = """          <article class="feature-card">
            <div class="feature-icon-wrap icon-teal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <path d="M8 9h8"/>
                <path d="M8 13h5"/>
              </svg>
            </div>
            <h3 class="feature-title">Consultas Legales</h3>
            <p class="feature-description">Chatea con una IA especializada en derecho peruano — o adjunta un contrato (PDF o Word) para un análisis de riesgos cláusula por cláusula, con base legal citada.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-wrap icon-pink">
"""
            new_lines.append(features)
        elif '<article class="feature-card">' in head_text and 'icon-purple' in head_text:
            features2 = """              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 7h18"/>
                <path d="M3 7l2-3h14l2 3"/>
                <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/>
                <path d="M9 12h6"/>
              </svg>
            </div>
            <h3 class="feature-title">Gestión de Contratos</h3>
            <p class="feature-description">Elige una plantilla y complétala conversando con la IA, o edítala tú mismo. Descárgala lista, con marca de agua, o sigue editándola en Word con el complemento de LEXIT.</p>
          </article>

          <article class="feature-card">
            <div class="feature-icon-wrap icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h3 class="feature-title">Normas del Día</h3>
            <p class="feature-description">Las normas publicadas en El Peruano, organizadas por sector, con un resumen diario generado por IA y lo más relevante para tu práctica.</p>
          </article>
"""
            new_lines.append(features2)
        else:
            # For CSS styles
            new_lines.extend(head_lines)
            
    else:
        new_lines.append(lines[i])
        i += 1

with open('src/pages/LandingPage.vue', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Resolved ours/theirs conflicts successfully.')
