import type { ContractTemplate } from '../../stores/contratos-store';

export const arrendamientoTemplate: ContractTemplate = {
  id: '1',
  name: 'Contrato de Arrendamiento',
  type: 'arrendamiento',
  content: `
    <div class="contract-content">
      <div class="header">
        <h1>CONTRATO DE ARRENDAMIENTO DE BIEN INMUEBLE</h1>
      </div>

      <div class="contract-body">
        <p class="intro-text">Conste por el presente documento, el Contrato de Arrendamiento que celebran de una parte:</p>

        <p class="party-info"><strong>EL ARRENDADOR:</strong> {{nombreArrendador}}, identificado con DNI N° {{dniArrendador}}, con domicilio en {{domicilioArrendador}}, a quien en adelante se le denominará EL ARRENDADOR; y de la otra parte,</p>

        <p class="party-info"><strong>EL ARRENDATARIO:</strong> {{nombreArrendatario}}, identificado con DNI N° {{dniArrendatario}}, con domicilio en {{domicilioArrendatario}}, a quien en adelante se le denominará EL ARRENDATARIO.</p>

        <p class="clause-intro">En los términos y condiciones siguientes:</p>

        <div class="clause">
          <h2>PRIMERA: DEL INMUEBLE</h2>
          <p>EL ARRENDADOR es propietario del inmueble ubicado en {{direccionInmueble}}, el mismo que se encuentra inscrito en la Partida Registral N° {{partidaRegistral}} del Registro de Predios de {{registroPredios}}.</p>
        </div>

        <div class="clause">
          <h2>SEGUNDA: OBJETO DEL CONTRATO</h2>
          <p>Por el presente contrato, EL ARRENDADOR da en arrendamiento a EL ARRENDATARIO el inmueble descrito en la cláusula primera, para destinarlo única y exclusivamente para {{usoInmueble}}.</p>
        </div>

        <div class="clause">
          <h2>TERCERA: RENTA Y FORMA DE PAGO</h2>
          <p>Las partes acuerdan que el monto de la renta mensual será de S/. {{montoRenta}} ({{montoRentaLetras}}), que será pagada en forma mensual y por adelantado, dentro de los {{diasPago}} primeros días de cada mes, en el domicilio del ARRENDADOR o mediante depósito en cuenta bancaria que éste designe.</p>
        </div>

        <div class="clause">
          <h2>CUARTA: PLAZO DEL CONTRATO</h2>
          <p>El plazo de duración del presente contrato es de {{plazoContrato}}, el mismo que se computa a partir del {{fechaInicio}} y vencerá indefectiblemente el {{fechaFin}}, fecha en la que EL ARRENDATARIO deberá devolver el inmueble sin más aviso.</p>
        </div>

        <div class="clause">
          <h2>QUINTA: OBLIGACIONES DEL ARRENDADOR</h2>
          <p>Son obligaciones de EL ARRENDADOR:</p>
          <ol class="clause-list">
            <li>Entregar el inmueble arrendado en la fecha pactada, en buen estado de conservación, habitabilidad e higiene.</li>
            <li>Mantener al ARRENDATARIO en el uso del inmueble durante todo el plazo del contrato.</li>
            <li>Realizar todas las reparaciones necesarias durante el arrendamiento.</li>
          </ol>
        </div>

        <div class="clause">
          <h2>SEXTA: OBLIGACIONES DEL ARRENDATARIO</h2>
          <p>Son obligaciones de EL ARRENDATARIO:</p>
          <ol class="clause-list">
            <li>Pagar puntualmente el monto de la renta en la forma y oportunidad convenidas.</li>
            <li>Destinar el inmueble al uso convenido en el contrato.</li>
            <li>Permitir las visitas de inspección por parte del ARRENDADOR previo aviso.</li>
            <li>No subarrendar el inmueble materia del presente contrato.</li>
            <li>Devolver el inmueble al vencimiento del contrato sin más deterioro que el de su uso ordinario.</li>
          </ol>
        </div>

        <div class="clause">
          <h2>SÉPTIMA: SERVICIOS Y TRIBUTOS</h2>
          <p>Los servicios de agua potable, energía eléctrica, gas y otros servicios públicos serán asumidos por {{responsableServicios}}. El pago del impuesto predial y arbitrios municipales corresponden al ARRENDADOR.</p>
        </div>

        <div class="clause">
          <h2>OCTAVA: GARANTÍA</h2>
          <p>Al momento de la suscripción del presente contrato, EL ARRENDATARIO entrega a EL ARRENDADOR la suma de S/. {{montoGarantia}} ({{montoGarantiaLetras}}) por concepto de garantía, la misma que será devuelta al término del contrato previa verificación del buen estado del inmueble.</p>
        </div>

        <div class="clause">
          <h2>NOVENA: RESOLUCIÓN DEL CONTRATO</h2>
          <p>El incumplimiento de cualquiera de las obligaciones asumidas por EL ARRENDATARIO en el presente contrato constituirá causal de resolución del mismo, al amparo del artículo 1697° del Código Civil.</p>
        </div>

        <div class="signatures">
          <p class="signing-text">Ambas partes declaran su conformidad con todas y cada una de las cláusulas del presente contrato, firmándolo en dos ejemplares igualmente válidos, en la ciudad de {{ciudadFirma}} a los {{fechaFirma}}.</p>

          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-line">____________________________</div>
              <p class="signer-title">EL ARRENDADOR</p>
              <p class="signer-name">{{nombreArrendador}}</p>
              <p class="signer-dni">DNI: {{dniArrendador}}</p>
            </div>

            <div class="signature-block">
              <div class="signature-line">____________________________</div>
              <p class="signer-title">EL ARRENDATARIO</p>
              <p class="signer-name">{{nombreArrendatario}}</p>
              <p class="signer-dni">DNI: {{dniArrendatario}}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .contract-content {
        /* Configuración básica del documento */
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;

        /* Tamaño A4 y márgenes */
        width: 21cm;
        min-height: 29.7cm;
        margin: 0 auto;
        padding: 2.54cm; /* 1 pulgada = 2.54cm, margen estándar */
        box-sizing: border-box;
        background: white;

        /* Configuración de página */
        page-break-after: always;
      }

      /* Título principal */
      .header h1 {
        font-size: 14pt;
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        margin: 0 0 4cm 0; /* Espacio significativo después del título */
        line-height: 1.3;
      }

      /* Cuerpo del contrato */
      .contract-body {
        text-align: justify;
      }

      /* Párrafos */
      .intro-text,
      .party-info,
      .clause-intro {
        margin-bottom: 1.5em;
        text-align: justify;
        line-height: 2;
      }

      /* Cláusulas */
      .clause {
        margin-bottom: 2em;
        page-break-inside: avoid;
      }

      .clause h2 {
        font-size: 12pt;
        font-weight: bold;
        text-transform: uppercase;
        margin: 2em 0 1em;
      }

      /* Listas */
      .clause-list {
        margin: 1em 0 1em 3cm; /* Sangría de 3cm para listas */
        padding: 0;
      }

      .clause-list li {
        margin-bottom: 1em;
        text-align: justify;
        line-height: 1.5;
        page-break-inside: avoid;
      }

      /* Firmas */
      .signatures {
        margin-top: 4cm;
        page-break-inside: avoid;
      }

      .signing-text {
        margin-bottom: 3cm;
        text-align: justify;
      }

      .signature-section {
        display: flex;
        justify-content: space-between;
        margin: 4cm 3cm 0; /* Márgenes laterales para las firmas */
      }

      .signature-block {
        width: 7cm; /* Ancho fijo para el bloque de firma */
        text-align: center;
      }

      .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 0.5cm;
      }

      .signer-title {
        font-weight: bold;
        margin: 0.5cm 0;
        text-transform: uppercase;
      }

      .signer-name,
      .signer-dni {
        margin: 0.3cm 0;
      }

      /* Ajustes para impresión */
      @media print {
        .contract-content {
          margin: 0;
          padding: 2.54cm;
          width: 21cm;
          height: 29.7cm;
          page-break-after: always;
        }

        /* Evitar saltos de página en elementos importantes */
        h1, h2, .clause, .signatures {
          page-break-inside: avoid;
        }

        /* Forzar salto de página cuando sea necesario */
        .page-break {
          page-break-before: always;
        }
      }
    </style>
  `,
  variables: [
    {
      key: 'nombreArrendador',
      label: 'Nombre del Arrendador',
      type: 'text',
      required: true,
    },
    {
      key: 'dniArrendador',
      label: 'DNI del Arrendador',
      type: 'text',
      required: true,
    },
    {
      key: 'domicilioArrendador',
      label: 'Domicilio del Arrendador',
      type: 'text',
      required: true,
    },
    {
      key: 'nombreArrendatario',
      label: 'Nombre del Arrendatario',
      type: 'text',
      required: true,
    },
    {
      key: 'dniArrendatario',
      label: 'DNI del Arrendatario',
      type: 'text',
      required: true,
    },
    {
      key: 'domicilioArrendatario',
      label: 'Domicilio del Arrendatario',
      type: 'text',
      required: true,
    },
    {
      key: 'direccionInmueble',
      label: 'Dirección del Inmueble',
      type: 'text',
      required: true,
    },
    {
      key: 'partidaRegistral',
      label: 'Número de Partida Registral',
      type: 'text',
      required: true,
    },
    {
      key: 'registroPredios',
      label: 'Registro de Predios',
      type: 'text',
      required: true,
    },
    {
      key: 'usoInmueble',
      label: 'Uso del Inmueble',
      type: 'text',
      required: true,
    },
    {
      key: 'montoRenta',
      label: 'Monto de la Renta (en números)',
      type: 'number',
      required: true,
    },
    {
      key: 'montoRentaLetras',
      label: 'Monto de la Renta (en letras)',
      type: 'text',
      required: true,
    },
    {
      key: 'diasPago',
      label: 'Días para el Pago',
      type: 'number',
      required: true,
    },
    {
      key: 'plazoContrato',
      label: 'Plazo del Contrato',
      type: 'text',
      required: true,
    },
    {
      key: 'fechaInicio',
      label: 'Fecha de Inicio',
      type: 'date',
      required: true,
    },
    {
      key: 'fechaFin',
      label: 'Fecha de Fin',
      type: 'date',
      required: true,
    },
    {
      key: 'responsableServicios',
      label: 'Responsable de Servicios',
      type: 'text',
      required: true,
    },
    {
      key: 'montoGarantia',
      label: 'Monto de la Garantía (en números)',
      type: 'number',
      required: true,
    },
    {
      key: 'montoGarantiaLetras',
      label: 'Monto de la Garantía (en letras)',
      type: 'text',
      required: true,
    },
    {
      key: 'ciudadFirma',
      label: 'Ciudad de Firma',
      type: 'text',
      required: true,
    },
    {
      key: 'fechaFirma',
      label: 'Fecha de Firma',
      type: 'date',
      required: true,
    }
  ]
};
