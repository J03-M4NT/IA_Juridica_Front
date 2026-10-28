// =========================
// DOCUMENTOS LEGALES (Términos y condiciones y Política de privacidad)
// Texto tal cual del documento "TyC actualizado - LEXIT AI - V1.3.docx".
// Se muestran como páginas dentro de LexIT (/legal), no como
// archivo. En el texto, **así** marca las negritas del original.
// =========================

export type BloqueLegal =
  | { tipo: 'p'; texto: string }
  | { tipo: 'lista'; items: string[] }
  | { tipo: 'tabla'; columnas: string[]; filas: string[][] }

export interface SeccionLegal {
  id: string
  numero: string
  titulo: string
  bloques: BloqueLegal[]
}

export interface DocumentoLegal {
  slug: string
  descripcion: string
  titulo: string
  version: string
  actualizado: string
  aviso: { titulo: string; parrafos: string[] } | null
  intro: string[]
  secciones: SeccionLegal[]
  cierre: string
}

export const DOCUMENTOS_LEGALES: DocumentoLegal[] = [
  {
    "slug": "terminos-y-condiciones",
    "descripcion": "Condiciones que rigen el acceso y uso de la plataforma LEXIT AI durante la fase Beta.",
    "aviso": {
      "titulo": "Aviso importante",
      "parrafos": [
        "LEXIT AI es una herramienta de apoyo documental e informativo basada en inteligencia artificial. No presta asesoría legal, no sustituye a un abogado colegiado y no genera relación abogado-cliente. Todo resultado generado por la plataforma debe ser verificado por un profesional del derecho antes de su uso. El Servicio se encuentra actualmente en fase Beta, sin costo, con las limitaciones funcionales que se describen en este documento.",
        "La aceptación de los Términos y Condiciones constituye una Declaración Jurada, mediante la cual el usuario manifiesta de forma expresa su aceptación y conformidad con todos los términos establecidos en la presente sección. Asimismo, declara haber leído íntegra y diligentemente cada una de sus disposiciones y estar plenamente de acuerdo con su contenido."
      ]
    },
    "intro": [],
    "secciones": [
      {
        "id": "s0",
        "numero": "0",
        "titulo": "Identificación del proveedor",
        "bloques": [
          {
            "tipo": "lista",
            "items": [
              "**Nombre comercial: **LEXIT AI",
              "**Domicilio: **Av. Central 365, distrito de Santiago de Surco, provincia y departamento de Lima, Perú.",
              "**Correo de contacto: **lexitiajuridica@gmail.com"
            ]
          },
          {
            "tipo": "p",
            "texto": "En adelante, \"LEXIT AI\", \"nosotros\" o \"el Proveedor\". Estos Términos y Condiciones se emiten a nombre de quien opera comercialmente bajo la marca LEXIT AI. Mientras el Servicio se preste en fase Beta y de forma gratuita, este documento constituye una declaración de buena fe frente al Usuario sobre las condiciones de uso del Servicio."
          }
        ]
      },
      {
        "id": "s1",
        "numero": "1",
        "titulo": "Definiciones",
        "bloques": [
          {
            "tipo": "lista",
            "items": [
              "**\"Servicio\" o \"Plataforma\":** el asistente jurídico con inteligencia artificial operado bajo la marca LEXIT AI, incluyendo el sitio web, la aplicación, sus funcionalidades de consulta normativa, generación y consulta de formatos de contratos civiles patrimoniales, entre otros, y difusión de novedades normativas.",
              "**\"Usuario\" o \"Usted\": **la persona natural que se registra accede o utiliza el Servicio.",
              "**\"Cuenta\": **el registro individual que habilita el acceso al Servicio.",
              "**\"Contenido del Usuario\": **documentos, textos, consultas y demás información que el Usuario ingrese, cargue o transmita a la Plataforma.",
              "**\"Resultado\": **todo texto, formato, resumen o material generado por el Servicio en respuesta al Contenido del Usuario.",
              "**\"Materiales\": **los formatos de contratos, plantillas y demás contenido puesto a disposición por LEXIT AI a través del Servicio."
            ]
          }
        ]
      },
      {
        "id": "s2",
        "numero": "2",
        "titulo": "Aceptación y capacidad",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**2.1** Al registrarse, marcar la casilla de aceptación o utilizar el Servicio de cualquier forma, el Usuario declara haber leído, entendido y aceptado íntegramente estos Términos y Condiciones."
          },
          {
            "tipo": "p",
            "texto": "**2.2 Capacidad legal. **El Usuario declara ser mayor de dieciocho (18) años y contar con plena capacidad de ejercicio conforme al Código Civil peruano."
          }
        ]
      },
      {
        "id": "s3",
        "numero": "3",
        "titulo": "Descripción del Servicio",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**3.1 Naturaleza. **LEXIT AI es un asistente jurídico basado en inteligencia artificial orientado a: (a) consultas sobre normativa peruana; (b) acceso a formatos de contratos civiles patrimoniales; y (c) difusión de novedades normativas. Está dirigido principalmente a estudiantes de derecho, estudios jurídicos especializados en materia civil patrimonial y emprendedores."
          },
          {
            "tipo": "p",
            "texto": "**3.2 No es asesoría legal.** Los Resultados generados por el Servicio no constituyen asesoría jurídica, opinión legal, dictamen ni recomendación profesional. El uso del Servicio no crea relación abogado-cliente entre el Usuario y LEXIT AI, ni genera secreto profesional bajo el Código de Ética del Abogado. El Usuario reconoce que debe verificar todo Resultado en las fuentes oficiales y con un profesional habilitado antes de utilizarlo o presentarlo ante cualquier autoridad."
          },
          {
            "tipo": "p",
            "texto": "**3.3 Fase Beta. **El Servicio se presta actualmente en fase de desarrollo continuo (Beta), sin costo. LEXIT AI podrá modificar, ampliar, limitar o suspender funcionalidades en cualquier momento sin que ello genere derecho a compensación, dado el carácter gratuito y experimental de esta etapa."
          }
        ]
      },
      {
        "id": "s4",
        "numero": "4",
        "titulo": "Licencia de uso",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**4.1 **Sujeto al cumplimiento de estos Términos y Condiciones, LEXIT AI concede al Usuario una licencia limitada, revocable, no exclusiva, no transferible y no sublicenciable, para acceder y usar el Servicio con fines profesionales, académicos o personales lícitos."
          },
          {
            "tipo": "p",
            "texto": "**4.2 Restricciones. **El Usuario no podrá: (a) realizar ingeniería inversa, descompilar o intentar extraer la arquitectura o los modelos subyacentes del Servicio; (b) acceder mediante robots, scrapers u otro medio automatizado no autorizado; (c) usar el Servicio para desarrollar un producto competidor o realizar análisis comparativos con fines comerciales; (d) compartir sus credenciales de acceso; (e) cargar contenido que infrinja derechos de terceros, sea ilícito, o esté sujeto a secreto profesional sin contar con la autorización correspondiente; (f) usar el Servicio para presentar ante cualquier autoridad Resultados no verificados como si fueran ciertos o definitivos."
          }
        ]
      },
      {
        "id": "s5",
        "numero": "5",
        "titulo": "Registro y Cuenta",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**5.1 **El Usuario se obliga a proporcionar información veraz, actualizada y completa al registrarse, y a mantenerla así durante la vigencia de su Cuenta."
          },
          {
            "tipo": "p",
            "texto": "**5.2 **Las credenciales de acceso son personales e intransferibles. El Usuario es responsable de toda actividad realizada desde su Cuenta."
          },
          {
            "tipo": "p",
            "texto": "**5.3 **LEXIT AI podrá suspender o cancelar una Cuenta cuando la información proporcionada resulte falsa, o cuando se detecte un uso contrario a estos Términos y Condiciones."
          }
        ]
      },
      {
        "id": "s6",
        "numero": "6",
        "titulo": "Inteligencia artificial: naturaleza, límites y deber de verificación",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**6.1 Naturaleza probabilística.** El Servicio emplea modelos de inteligencia artificial de terceros para generar Resultados. Estos modelos son sistemas probabilísticos que pueden producir información inexacta, desactualizada, incompleta o inventada, incluyendo referencias normativas o jurisprudenciales que no existen o que no dicen lo que el Resultado afirma. LEXIT AI no garantiza la exactitud, vigencia ni integridad de ningún Resultado."
          },
          {
            "tipo": "p",
            "texto": "**6.2 Deber de verificación del Usuario. **El Usuario se obliga a verificar todo Resultado en las fuentes oficiales antes de utilizarlo, especialmente antes de presentarlo ante cualquier autoridad, contraparte o tercero. El Usuario asume la responsabilidad exclusiva por las decisiones que adopte con apoyo del Servicio."
          },
          {
            "tipo": "p",
            "texto": "**6.3 Procesamiento por terceros.** El Servicio se apoya en proveedores de infraestructura y de modelos de inteligencia artificial de terceros para generar Resultados. El detalle del tratamiento de datos personales aplicable a este procesamiento, incluyendo la ubicación de los servidores y las garantías de transferencia internacional, se encuentra desarrollado en la **Política de Privacidad** de LEXIT AI, la cual forma parte integrante de estos Términos y Condiciones."
          },
          {
            "tipo": "p",
            "texto": "**6.4 Supervisión humana. **LEXIT AI informa que el Servicio se encuentra en un proceso continuo de incorporación de controles de transparencia y revisión, conforme a la normativa peruana sobre uso de inteligencia artificial. El Usuario reconoce que, en la fase Beta actual, la verificación de los Resultados es una obligación que recae sobre él conforme a la cláusula 6.2."
          }
        ]
      },
      {
        "id": "s7",
        "numero": "7",
        "titulo": "Propiedad intelectual",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**7.1 Contenido del Usuario.** El Usuario conserva la titularidad del Contenido el cual sea propio del mismo. Declara contar con los derechos necesarios para cargarlo en la Plataforma."
          },
          {
            "tipo": "p",
            "texto": "**7.2 Licencia operativa.** El Usuario otorga a LEXIT AI una licencia no exclusiva y gratuita para almacenar, procesar y transmitir su Contenido, con la única finalidad de operar y prestar el Servicio, incluyendo su procesamiento por los proveedores de inteligencia artificial mencionados en la cláusula 6.3."
          },
          {
            "tipo": "p",
            "texto": "**7.3 Sin entrenamiento no autorizado. **LEXIT AI no utiliza el Contenido del Usuario para entrenar modelos de inteligencia artificial propios ni de terceros, salvo autorización expresa y separada del Usuario. Esto no incluye el procesamiento técnico necesario que los proveedores de infraestructura realizan para generar el Resultado solicitado, conforme a lo descrito en la Política de Privacidad."
          },
          {
            "tipo": "p",
            "texto": "**7.4 Materiales y propiedad de LEXIT AI. **Los formatos de contratos, plantillas, software, marcas y demás elementos de la Plataforma (en adelante, “Activos Digitales”) son de titularidad de LEXIT AI o de sus licenciantes, y están protegidos por el Decreto Legislativo N.° 822 y demás normas de propiedad intelectual aplicables."
          },
          {
            "tipo": "p",
            "texto": "**7.5 Uso de los Activos Digitales.** LEXIT autoriza el uso por parte del Usuario de los documentos generados en base de los Activos Digitales y demás elementos de titularidad de LEXIT. El Usuario se compromete a no subutilizar los mismos fuera de la plataforma. Del mismo modo, el Usuario se compromete a no sacar ningún beneficio económico derivado de la transferencia de los mismos fuera del uso tolerado de la plataforma."
          },
          {
            "tipo": "p",
            "texto": "LEXIT se reserva el derecho de ceder los derechos relacionados con los Activos Digitales, de forma expresa en los casos que considere aplicables."
          },
          {
            "tipo": "p",
            "texto": "**7.6** **Material Audiovisual Complementario (MAC).** LEXIT podrá incorporar dentro de la plataforma fotografías, ilustraciones y otros recursos audiovisuales obtenidos de terceros, incluidos repositorios que ofrecen contenido bajo licencias de uso gratuito o abierto (Material Audiovisual Complementario, en adelante “MAC”)."
          },
          {
            "tipo": "p",
            "texto": "Dichos recursos se utilizan en conformidad a las licencias y condiciones aplicables a cada uno y permanecen sujetos a los derechos de sus respectivos titulares. Salvo indicación expresa en contrario, su incorporación no implica la transferencia de derechos de propiedad intelectual ni la atribución exclusiva sobre estos recursos a LEXIT AI."
          },
          {
            "tipo": "p",
            "texto": "En ese sentido, los mismos fueron extraídos bajo modalidades de Cesión por el autor, Free to Use, Openly Licensed y Public Domain. Del mismo modo, se utilizaron fotografías anónimas, salvo excepciones donde se efectuó una cesión de uso a través de un intermediario. Al respecto, de acuerdo con las condiciones de los repositorios de donde se extrajo la licencia de uso del MAC, todos los derechos se encuentran reconocidos a con sus titulares."
          },
          {
            "tipo": "p",
            "texto": "**7.8** **Relación del Usuario con el MAC.** El Usuario se obliga a no extraer, de ninguna forma, el MAC para usos propios o comerciales sin autorización del autor. El MAC, no representa una identidad visual o fuente de beneficio económico para LEXIT AI. LEXIT AI, podrá sustituir o retirar dichos recursos cuando resulte necesario por razones legales, contractuales o comerciales."
          },
          {
            "tipo": "p",
            "texto": "Para más información referente a esta sección, comunicarse con: lexitiajuridica@gmail.com"
          }
        ]
      },
      {
        "id": "s8",
        "numero": "8",
        "titulo": "Confidencialidad",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**8.1 **LEXIT AI tratará el Contenido del Usuario con la debida reserva y limitará su acceso interno al personal estrictamente necesario para prestar el Servicio."
          },
          {
            "tipo": "p",
            "texto": "**8.2 Secreto profesional.** El Usuario es el único responsable de evaluar si la carga de información amparada por el secreto profesional resulta compatible con sus deberes deontológicos, y de contar con el consentimiento de su cliente cuando corresponda. Se recomienda evitar cargar datos identificativos de terceros cuando no sea estrictamente necesario."
          }
        ]
      },
      {
        "id": "s9",
        "numero": "9",
        "titulo": "Protección de datos personales",
        "bloques": [
          {
            "tipo": "p",
            "texto": "El tratamiento de los datos personales recabados a través del Servicio se rige por la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento. Como parte de dicho tratamiento, la información asociada al perfil del Usuario es sometida a un proceso de anonimización. El detalle de las finalidades del tratamiento, los plazos de conservación, los derechos del Usuario y las garantías aplicables se desarrolla en la Política de Privacidad de LEXIT AI, la cual forma parte integrante de los Términos y Condiciones."
          }
        ]
      },
      {
        "id": "s10",
        "numero": "10",
        "titulo": "Servicio gratuito (Beta)",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**10.1 **El Servicio se presta actualmente sin costo, sin que ello implique compromiso alguno de continuidad, disponibilidad o soporte por parte de LEXIT AI."
          },
          {
            "tipo": "p",
            "texto": "**10.2 **LEXIT AI se reserva el derecho de introducir, en el futuro, planes de pago para el Servicio. De hacerlo, las condiciones aplicables serán informadas oportunamente a los Usuarios mediante una actualización de estos Términos y Condiciones, previa a su entrada en vigencia."
          },
          {
            "tipo": "p",
            "texto": "**10.3 **LEXIT AI se reserva el derecho de eliminar Cuentas creadas durante el periodo de pruebas (Beta). En ese sentido se suprimirán todos los datos relacionados a las mismas de nuestros sistemas. La eliminación de la Cuenta, después de un periodo mayor a un (01) año posterior a su creación, será notificada mediante una comunicación simple al correo electrónico consignado en la creación de la misma."
          },
          {
            "tipo": "p",
            "texto": "**10.4 **El Usuario se compromete a no realizar procesos de Ingeniería Inversa, de detectarlo, se procederá con la baja de la Cuenta sin perjuicio de las acciones legales correspondientes."
          },
          {
            "tipo": "p",
            "texto": "**10.5 **El Usuario se compromete a no replicar las funciones a las cuales tiene acceso dentro de la plataforma. El Usuario declara, al aceptar los Términos y Condiciones, que tiene acceso a información privilegiada, comercial y de otra naturaleza. LEXIT AI se reserva el derecho de efectuar las acciones legales correspondientes y el Usuario"
          },
          {
            "tipo": "p",
            "texto": "**10.6 **El Usuario se compromete a no competir con LEXIT AI y a no realizar Ingeniería Inversa en la búsqueda de copiar las funciones de la plataforma durante el proceso de pruebas (Beta)."
          }
        ]
      },
      {
        "id": "s11",
        "numero": "11",
        "titulo": "Garantías y exención de responsabilidad",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**11.1** El Servicio se proporciona \"tal cual\" y \"según disponibilidad\". En la máxima medida permitida por la ley peruana, LEXIT AI excluye toda garantía implícita, incluyendo las de idoneidad para un fin particular o funcionamiento ininterrumpido."
          },
          {
            "tipo": "p",
            "texto": "**11.2** LEXIT AI no garantiza que los Resultados sean exactos, completos o vigentes, ni que el Servicio esté libre de errores. El Usuario se compromete al aceptar los Términos y Condiciones, a actuar con la Diligencia adecuada y correspondiente a las actividades que busca realizar."
          },
          {
            "tipo": "p",
            "texto": "**11.3 **LEXIT AI no se hace responsable, bajo ninguna circunstancia, de perjuicios generados por el mal uso, o poca diligencia de uso, relacionado con los productos generados. El Usuario, al aceptar los Términos y Condiciones se encuentra de acuerdo, bajo declaración jurada, que el mismo, se hace responsable por el uso de la documentación o información generada, con la debida diligencia en el uso de la plataforma."
          }
        ]
      },
      {
        "id": "s12",
        "numero": "12",
        "titulo": "Limitación de responsabilidad",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**12.1 Exclusión de daños indirectos. **LEXIT AI no será responsable por daños indirectos, incidentales o consecuenciales derivados del uso del Servicio, incluyendo pérdida de oportunidad, de ingresos o de datos."
          },
          {
            "tipo": "p",
            "texto": "**12.2 Riesgos asumidos por el Usuario. **El Usuario asume el riesgo derivado de usar Resultados sin la verificación exigida en la cláusula 6.2, y de las decisiones que adopte con apoyo del Servicio."
          }
        ]
      },
      {
        "id": "s13",
        "numero": "13",
        "titulo": "Modificaciones del los Términos y Condiciones",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Mientras el Servicio se preste en fase Beta y de forma gratuita, LEXIT AI podrá modificar estos Términos y Condiciones en cualquier momento, mediante la publicación de la versión actualizada en la Plataforma. El uso continuado del Servicio con posterioridad a dicha publicación implica la aceptación de la versión vigente."
          }
        ]
      },
      {
        "id": "s14",
        "numero": "14",
        "titulo": "Vigencia y terminación",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**14.1 **El Usuario puede solicitar el cierre de su Cuenta en cualquier momento escribiendo a lexitiajuridica@gmail.com."
          },
          {
            "tipo": "p",
            "texto": "**14.2 **LEXIT AI podrá suspender o cancelar una Cuenta ante el incumplimiento de estos Términos y Condiciones, o ante sospecha razonable de fraude o uso indebido."
          },
          {
            "tipo": "p",
            "texto": "**14.3 **Terminada la prueba, subsisten las obligaciones ya devengadas y las cláusulas que por su naturaleza deban continuar vigentes, incluyendo las Secciones 6, 7, 8, 11 y 12."
          }
        ]
      },
      {
        "id": "s15",
        "numero": "15",
        "titulo": "Solución de controversias",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**15.1 **Toda controversia derivada de estos Términos y Condiciones o del uso del Servicio será resuelta ante los jueces y tribunales de la ciudad de Lima, Perú."
          }
        ]
      },
      {
        "id": "s16",
        "numero": "16",
        "titulo": "Disposiciones generales",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**16.1 **Ley aplicable. estos Términos y Condiciones se rige por las leyes de la República del Perú."
          },
          {
            "tipo": "p",
            "texto": "**16.2 Divisibilidad. **Si alguna cláusula de estos Términos y Condiciones fuera declarada inválida o ineficaz, las demás mantendrán plena vigencia."
          },
          {
            "tipo": "p",
            "texto": "**16.3 Cesión.** El Usuario no podrá ceder su posición contractual sin autorización previa y escrita de LEXIT AI."
          },
          {
            "tipo": "p",
            "texto": "**16.4 Fuerza mayor. **Ninguna parte responderá por incumplimientos derivados de caso fortuito o fuerza mayor, conforme al artículo 1315 del Código Civil."
          },
          {
            "tipo": "p",
            "texto": "**16.5 No renuncia.** La falta de ejercicio de un derecho por LEXIT AI no constituye renuncia al mismo."
          },
          {
            "tipo": "p",
            "texto": "**16.6 Idioma.** El idioma de estos Términos y Condiciones y del Servicio es el español."
          }
        ]
      },
      {
        "id": "s17",
        "numero": "17",
        "titulo": "Contacto",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Para cualquier consulta, solicitud o comunicación relacionada con estos Términos y Condiciones, el Usuario puede escribir a: lexitiajuridica@gmail.com."
          }
        ]
      }
    ],
    "cierre": "LEXIT AI. Términos y Condiciones de Uso. Versión 1.0 (Fase Beta).",
    "titulo": "Términos y Condiciones de Uso de LEXIT AI",
    "version": "1.0 (Fase Beta)",
    "actualizado": "06 de octubre de 2026"
  },
  {
    "slug": "politica-de-privacidad",
    "descripcion": "Cómo LEXIT AI trata los datos personales conforme a la Ley N.° 29733 y su Reglamento.",
    "aviso": null,
    "intro": [
      "En medida en que, como consecuencia del uso de la plataforma, la empresa (en adelante, “LEXIT” o “LEXIT AI”) acceda, recopile, registre, organice, conserve, consulte, utilice, transmita, almacene, suprima o realice cualquier operación de tratamiento sobre Datos Personales, LEXIT dará cumplimiento a la Ley N°29733 (Ley de Protección de Datos Personales) y su Reglamento aprobado por Decreto Supremo N° 016-2024-JUS. Del mismo modo, entiéndase la presente sección como parte integrante de los Términos y Condiciones de LEXIT AI."
    ],
    "secciones": [
      {
        "id": "s1",
        "numero": "1",
        "titulo": "Identificación del responsable",
        "bloques": [
          {
            "tipo": "lista",
            "items": [
              "**Nombre comercial: **LEXIT AI",
              "**Domicilio:** Av. Central 365, distrito de Santiago de Surco, provincia y departamento de Lima, Perú",
              "**Correo de contacto para temas de datos personales: **lexitiajuridica@gmail.com"
            ]
          }
        ]
      },
      {
        "id": "s2",
        "numero": "2",
        "titulo": "Datos que recopilamos",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**2.1 Datos de registro.** Al efectuar la creación de un usuario, entendiéndose el mismo como una ficción de representación de los datos de la persona natural con el propósito de uso de las herramientas digitales, dentro de la plataforma digital denominada LEXIT (“Cuenta”) es recabado el correo electrónico de la persona natural (Usuario); y, en caso de registro mediante un proveedor externo de autenticación, la información básica de perfil asociada (nombre y correo). Dicha información es sometida a un proceso de anonimización como parte del tratamiento descrito en la sección 3. Del mismo modo, al crear la cuenta, el Usuario confirma a título de Declaración Jurada que es mayor de edad y se encuentra en capacidad de ejercicio."
          },
          {
            "tipo": "p",
            "texto": "**2.2 Contenido que usted ingresa.** Las consultas, documentos y contratos que carga o redacta en la Plataforma (\"Contenido del Usuario\"), incluyendo el historial completo de sus conversaciones con el asistente."
          },
          {
            "tipo": "p",
            "texto": "**2.3 Datos de uso. **Información técnica generada automáticamente por la interacción del Usuario con la Plataforma (páginas visitadas, eventos de uso, frecuencia de acceso), recabada mediante una herramienta de analítica no invasiva. No sea realiza ningún proceso de tracking digital o recopilación explicita del uso en tiempo real de la plataforma ajeno al acceso de la información relacionada con la interacción directa a con las funciones específicas de la plataforma."
          },
          {
            "tipo": "p",
            "texto": "**2.4 Lo que no recopilamos actualmente. **No solicitamos ni verificamos su fecha de nacimiento, y no recopilamos datos biométricos ni genéticos. Del mismo modo, el Usuario se encuentra en la libertad de consignar su nombre completo o la abreviación del mimso."
          }
        ]
      },
      {
        "id": "s3",
        "numero": "3",
        "titulo": "Finalidad del tratamiento",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Los datos personales del Usuario son tratados para las siguientes finalidades: (a) creación y administración de la Cuenta; (b) generación de los Resultados solicitados a través del asistente; (c) habilitación del acceso al historial de conversaciones anteriores; (d) análisis del uso general de la Plataforma, con fines de mejora del Servicio; (e) cumplimiento de obligaciones legales, cuando corresponda."
          },
          {
            "tipo": "p",
            "texto": "La información de perfil del Usuario es anonimizada como parte de este tratamiento, se traduce en interacciones o datos numéricos genéricos y no dependientes del contenido de la cuenta. El Contenido del Usuario no es utilizado para entrenar modelos de inteligencia artificial de terceros, conforme a lo señalado en la cláusula 7.3 de los Términos y Condiciones."
          }
        ]
      },
      {
        "id": "s4",
        "numero": "4",
        "titulo": "Base legal",
        "bloques": [
          {
            "tipo": "p",
            "texto": "El tratamiento se sustenta en su consentimiento, otorgado al aceptar esta Política y los Términos y Condiciones al momento de registrarse, y en la necesidad de tratar los datos para poder prestarle el Servicio que usted solicita."
          }
        ]
      },
      {
        "id": "s5",
        "numero": "5",
        "titulo": "Con quién compartimos su información (encargados de tratamiento)",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Para operar el Servicio, nos apoyamos en los siguientes proveedores, que actúan como encargados de tratamiento y procesan datos por nuestra instrucción:"
          },
          {
            "tipo": "tabla",
            "columnas": [
              "Proveedor",
              "Función",
              "Ubicación de procesamiento"
            ],
            "filas": [
              [
                "Un proveedor de infraestructura en la nube",
                "Base de datos, autenticación de usuarios, almacenamiento de archivos, analítica de uso",
                "Estados Unidos (región us-central1)"
              ],
              [
                "Un proveedor externo de modelos de inteligencia artificial",
                "Generación de los Resultados del asistente a partir de su Contenido",
                "Procesamiento a través de la infraestructura empresarial de nuestro proveedor de modelos de inteligencia artificial."
              ]
            ]
          },
          {
            "tipo": "p",
            "texto": "Nuestro proveedor de modelos de inteligencia artificial no utiliza el contenido que usted envía a través de su servicio empresarial para entrenar sus modelos base. Esto es distinto del tratamiento que aplican las versiones de consumo masivo de herramientas de inteligencia artificial disponibles al público en general, a las cuales no estamos sujetos."
          },
          {
            "tipo": "p",
            "texto": "No vendemos, alquilamos ni compartimos su información con terceros para fines publicitarios ajenos al Servicio."
          }
        ]
      },
      {
        "id": "s6",
        "numero": "6",
        "titulo": "Transferencia internacional de datos",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Sus datos y su Contenido se almacenan y procesan en servidores ubicados fuera del territorio peruano, a través de los proveedores señalados en la sección 5. Al usar el Servicio, usted acepta esta transferencia transnacional. Del mismo modo, los datos son tratados inicialmente en territorio peruano y el acceso a los mismos se realiza dentro de la jurisdicción peruana. En caso de que el Usuario use la plataforma o se suscriba a la misma desde otro punto geográfico, las Partes (entiéndase como LEXIT y el Usuario) se someten a la jurisdicción peruana, declarando competente la autoridad competente en la solución de conflictos relacionados con Protección de Datos Personales."
          }
        ]
      },
      {
        "id": "s7",
        "numero": "7",
        "titulo": "Conservación de sus datos",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**7.1 **Mientras nos encontramos en fase Beta, estamos implementando de forma progresiva nuestra política formal de plazos de conservación. En esta etapa, el Contenido del Usuario y su historial de conversaciones se conservan mientras su Cuenta permanezca activa."
          },
          {
            "tipo": "p",
            "texto": "**7.2** Si usted solicita el cierre de su Cuenta o la eliminación de su información, atenderemos su solicitud escribiendo a lexitiajuridica@gmail.com. Le informamos, con transparencia, que en esta fase Beta la eliminación se procesa de forma manual por nuestro equipo, y no de forma automática e inmediata; nos comprometemos a atender su solicitud dentro de un plazo razonable y a informarle cuando se haya completado."
          },
          {
            "tipo": "p",
            "texto": "**7.3 **Estamos trabajando en automatizar este proceso conforme el Servicio avance de su fase Beta."
          }
        ]
      },
      {
        "id": "s8",
        "numero": "8",
        "titulo": "Sus derechos (Derechos ARCO)",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Usted puede ejercer en cualquier momento sus derechos de:"
          },
          {
            "tipo": "lista",
            "items": [
              "**Acceso**: conocer qué datos suyos tratamos.",
              "**Rectificación**: corregir datos inexactos.",
              "**Cancelación**: solicitar la eliminación de sus datos, conforme a lo descrito en la sección 7.",
              "**Oposición**: oponerse a un tratamiento específico.",
              "**Portabilidad: **solicitar una copia de su información en un formato que pueda llevarse. Actualmente, usted puede exportar directamente desde la Plataforma sus documentos y resúmenes individuales en formato Word o PDF; si necesita la totalidad de su historial en otro formato, puede solicitarlo por el correo de contacto."
            ]
          },
          {
            "tipo": "p",
            "texto": "Puede ejercer estos derechos escribiendo a lexitiajuridica@gmail.com. Responderemos dentro de los plazos que establece la ley: veinte (20) días hábiles para solicitudes de acceso, y diez (10) días hábiles para rectificación, cancelación y oposición, contados desde la recepción de su solicitud completa."
          }
        ]
      },
      {
        "id": "s9",
        "numero": "9",
        "titulo": "Tecnologías de analítica",
        "bloques": [
          {
            "tipo": "p",
            "texto": "**9.1 **Se emplea una herramienta de analítica para conocer el uso general de la Plataforma (páginas visitadas, frecuencia de uso, retención de usuarios), a través de tecnologías de identificación distintas a las cookies tradicionales, siendo una alternativa menos invasiva."
          },
          {
            "tipo": "p",
            "texto": "**9.2 **En esta versión de la Plataforma, esta herramienta se activa automáticamente al ingresar al sitio. El usuario puede limitar este rastreo directamente desde la configuración de su navegador."
          }
        ]
      },
      {
        "id": "s10",
        "numero": "10",
        "titulo": "Seguridad",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Aplicamos medidas técnicas y organizativas razonables para proteger su información, apoyadas en la infraestructura de seguridad de nuestros proveedores de servicios en la nube. Ninguna medida de seguridad es infalible; le recomendamos no compartir sus credenciales de acceso con terceros."
          },
          {
            "tipo": "p",
            "texto": "En caso de un incidente de seguridad que afecte significativamente sus datos personales, se lo notificaremos junto con la Autoridad Nacional de Protección de Datos Personales, cuando corresponda legalmente, dentro de los plazos que establece la normativa vigente."
          },
          {
            "tipo": "p",
            "texto": "Si detectamos un comportamiento anómalo del Usuario relacionado con Datos Personales, LEXIT se reserva el derecho de suspender la cuenta o su cierre definitivo en virtud de la acción realizada."
          }
        ]
      },
      {
        "id": "s11",
        "numero": "11",
        "titulo": "Menores de edad",
        "bloques": [
          {
            "tipo": "p",
            "texto": "El Servicio no está dirigido a personas menores de dieciocho (18) años. Si usted es padre, madre o tutor y considera que un menor de edad nos ha proporcionado datos personales, puede contactarnos para que procedamos a eliminarlos."
          }
        ]
      },
      {
        "id": "s12",
        "numero": "12",
        "titulo": "Cambios a esta Política",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Podemos actualizar esta Política para reflejar cambios en el Servicio o en la normativa aplicable. Podrá comunicarse mediante aviso destacado en la Plataforma."
          }
        ]
      },
      {
        "id": "s13",
        "numero": "13",
        "titulo": "Contacto",
        "bloques": [
          {
            "tipo": "p",
            "texto": "Para cualquier consulta relacionada con el tratamiento de sus datos personales, escríbanos a: lexitiajuridica@gmail.com."
          }
        ]
      }
    ],
    "cierre": "LEXIT AI. Política de Privacidad. Versión 1.0 (Fase Beta).",
    "titulo": "Política de Privacidad de LEXIT AI",
    "version": "1.0 (Fase Beta)",
    "actualizado": "06 de octubre de 2026"
  }
]
