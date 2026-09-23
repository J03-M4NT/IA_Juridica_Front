import re

with open('src/stores/consultas-store.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify limpiar()
content = content.replace(
    "this.analisisPendiente = false\n    }",
    "this.analisisPendiente = false\n      this.sesionActualId = null\n    }"
)

# 2. Modify enviarConsulta to save session
save_logic = """
      } finally {
        const auth = useAuthStore()
        if (auth.user?.uid) {
          if (!this.sesionActualId) {
            this.sesionActualId = Date.now().toString()
            const primerUserMsg = this.mensajes.find(m => !m.esIA)
            const titulo = primerUserMsg ? primerUserMsg.contenido.substring(0, 30) + (primerUserMsg.contenido.length > 30 ? '...' : '') : 'Nueva Consulta'
            
            this.historialSesiones.unshift({
              id: this.sesionActualId,
              titulo,
              fechaActualizacion: new Date(),
              mensajes: [...this.mensajes],
              archivoAdjunto: this.archivoAdjunto || null
            })
          } else {
            const session = this.historialSesiones.find(s => s.id === this.sesionActualId)
            if (session) {
              session.mensajes = [...this.mensajes]
              session.fechaActualizacion = new Date()
              session.archivoAdjunto = this.archivoAdjunto || null
            }
          }
          
          const session = this.historialSesiones.find(s => s.id === this.sesionActualId)
          if (session) {
             guardarSesion(auth.user.uid, session.id, session.titulo, session.mensajes, session.archivoAdjunto || null).catch(console.error)
          }
        }
        
        this.loading = false
      }
"""
content = content.replace("      } finally {\n        this.loading = false\n      }", save_logic)

# 3. Add new actions before limpiar()
new_actions = """
    async cargarHistorial() {
      const auth = useAuthStore()
      if (auth.user?.uid) {
        try {
          this.historialSesiones = await obtenerHistorial(auth.user.uid)
        } catch (error) {
          console.error('Error cargando historial', error)
        }
      }
    },
    
    cargarSesion(id: string) {
      const session = this.historialSesiones.find(s => s.id === id)
      if (session) {
        this.sesionActualId = id
        this.mensajes = [...session.mensajes]
        this.archivoAdjunto = session.archivoAdjunto || null
      }
    },
    
    nuevaSesion() {
      this.limpiar()
      this.iniciarSesion()
    },

    limpiar() {
"""
content = content.replace("    limpiar() {\n", new_actions)

with open('src/stores/consultas-store.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications to consultas-store.ts completed.")
