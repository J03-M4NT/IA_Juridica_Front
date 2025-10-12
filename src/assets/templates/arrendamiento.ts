import type { ContractTemplate } from '../../stores/contratos-store';

export const arrendamientoTemplate: ContractTemplate = {
  id: '1',
  name: 'Contrato de Arrendamiento',
  type: 'arrendamiento',
  content: `
  <div class="page"><div class="contract-content">
      <div class="header">
        <h1>CONTRATO DE ARRENDAMIENTO</h1>
      </div>

      <div class="contract-body">
  <p>Conste por el presente contrato de arrendamiento, que suscribe de una parte {{nombreArrendador}}, identificada con D.N.I. N° {{dniArrendador}}, con domicilio en {{domicilioArrendador}}, Distrito de {{ciudadFirma}}, Provincia y Departamento de {{ciudadFirma}}, a quien en adelante se le denominara “EL ARRENDADOR” y de la otra parte {{nombreArrendatario}}, identificado con D.N.I. N° {{dniArrendatario}} domiciliado en {{domicilioArrendatario}}, Distrito de {{ciudadFirma}}, Provincia y Departamento de {{ciudadFirma}} a quienes se les denominará “LOS ARRENDATARIOS”, en los términos y condiciones siguientes:</p>

        <h2>CLÁUSULA PRIMERA.- OBJETO DEL CONTRATO</h2>
  <p>EL ARRENDADOR da en alquiler a EL ARRENDATARIO el inmueble de su propiedad, situado en {{direccionInmueble}}.</p>

        <h2>CLÁUSULA SEGUNDA.- DURACIÓN DEL CONTRATO</h2>
  <p>El plazo de duración del arrendamiento será por {{plazoContrato}} forzoso, y comenzará a partir del {{fechaInicio}} y terminará el {{fechaFin}} sin necesidad de aviso previo.</p>
  <p>El Contrato podrá renovarse a su vencimiento, si ambas partes están de acuerdo, para lo cual EL ARRENDATARIO deberán informar a EL ARRENDADOR de su deseo de renovar el contrato, por escrito con una anticipación no menor de {{renewalNoticeDays}} días calendarios a la fecha prevista para la renovación, debiendo constar ésta de documento escrito.</p>
        <p>Queda prohibido el subarrendamiento, cesión o traspaso del inmueble.</p>

        <h2>CLÁUSULA TERCERA.- RENTA MENSUAL</h2>
  <p>La renta mensual se fija en la suma de {{montoRenta}} ({{montoRentaLetras}}) que será pagada por “EL ARRENDATARIO” en forma adelantada, sin necesidad de requerimiento ni cobranza previa.</p>

        <h2>CLÁUSULA CUARTA.- FALTA DE PAGO</h2>
  <p>La falta de pago oportuna de la renta estipulada después de {{diasPago}} días es causal de resolución del presente contrato conforme lo establece el artículo 1697 del código civil peruano vigente, y autoriza a EL ARRENDADOR a entablar las acciones ejecutivas de desalojo respectivo. Asimismo, la falta de pago generará intereses compensatorios y moratorios en las tasas permitidas por ley.</p>

        <h2>CLÁUSULA QUINTA.- USO DEL INMUEBLE</h2>
  <p>“EL ARRENDATARIO” se obligan a destinar el inmueble bajo este contrato exclusivamente {{usoInmueble}} (a casa – habitación o local comercial).</p>

        <h2>CLÁUSULA SEXTA.- PAGO DE IMPUESTOS Y SERVICIOS</h2>
  <p>Será de cuenta obligatoria de “EL ARRENDATARIO” pagar puntualmente los recibos y gastos que se generen a partir de la fecha del inicio del arrendamiento del inmueble materia del presente contrato, comprometiéndose al pago de {{responsableServicios}} (los Arbitrios Municipales, así como al consumo de energía eléctrica, agua, desagüe, teléfono, gas, televisión por cable, Internet).</p>
        <p>Será de cuenta de LOS ARRENDATARIOS el pago del Impuesto Predial, y cualquier otro impuesto, tributo creado o por crearse, que graven directamente la propiedad inmueble.</p>

        <h2>CLÁUSULA SÉPTIMA.- SOBRE LA ENTREGA Y CUIDADO DEL INMUEBLE</h2>
        <p>EL ARRENDATARIO se obliga a entregar el inmueble el XX de XXXXXXXX de XXXX. El ARRENDADOR se obliga a entregar el inmueble en buenas condiciones de conservación y funcionamiento. EL ARRENDATARIO se compromete a mantener y conservar el inmueble en las mismas condiciones en que los recibe, salvo el normal desgaste de uso cuidadoso.</p>
        <p>En caso que se produzcan, durante la vigencia del presente contrato, daños o deterioros en el inmueble generados por causas que sean imputables a EL ARRENDATARIO la reparación de los mismos será de cargo y cuenta de EL ARRENDATARIO, a satisfacción del ARRENDADOR.</p>

        <h2>CLÁUSULA OCTAVA.- DESOCUPACIÓN DEL INMUEBLE</h2>
        <p>Al término del presente contrato, EL ARRENDATARIO se obliga a desocupar el inmueble y hacer entrega del mismo a EL ARRENDADOR en las mismas condiciones en que lo recibió, salvo el desgaste normal de uso cuidadoso, y bajo inspección de éste último a quien deberá devolver las llaves que hubiere recibido al inicio del contrato.</p>

        <h2>CLÁUSULA NOVENA.- SOBRE MODIFICACIONES AL INMUEBLE</h2>
        <p>“LOS ARRENDATARIOS” no podrán modificar o alterar los bienes arrendados, ni afectar la estructura o los acabados. Cualquier mejora o cambio que desee realizar deberá tener la autorización escrita de “EL ARRENDADOR”, quedando, de ser realizada, como parte del bien, sin desembolso posterior de “EL ARRENDADOR”.</p>

        <h2>CLÁUSULA DÉCIMA.- PAGO DE LA GARANTÍA</h2>
  <p>En garantía del fiel cumplimiento de todas y cada una de las obligaciones materia de este contrato, “LOS ARRENDATARIOS” entregan a “EL ARRENDADOR”, a la firma del presente contrato, la suma equivalente a {{montoGarantia}} ({{montoGarantiaLetras}}), por concepto de garantía y adelantos correspondientes.</p>
  <p>Dicha suma no podrá ser imputada al pago de la renta y/o penalidades, mientras “EL ARRENDATARIO” se encuentren en uso de los bienes arrendados, y será devuelta sin intereses al vencimiento del plazo del contrato.</p>

        <p>Una vez que “LOS ARRENDATARIOS” hayan acreditado el pago de todas sus obligaciones y dejado el inmueble y muebles arrendados, y “EL ARRENDADOR” haya comprobado el estado de éstos, los cuales deberán encontrarse en las mismas condiciones en las que les fueron entregados, salvo el deterioro del uso normal y cuidadoso. La garantía servirá para cubrir total o parcialmente el pago de las obligaciones incumplidas por “LOS ARRENDATARIOS”.</p>

  <h2>CLÁUSULA DÉCIMA PRIMERA.- ALLANAMIENTO FUTURO</h2>
  <p>De conformidad al art. 5º de la Ley Nº 30201 que modifica el art. 594º del Código Procesal Civil, LOS ARRENDATARIOS se allanan desde ya a la demanda judicial para desocupar el inmueble por las causales de vencimiento de contrato de arrendamiento o por incumplimiento del pago de la renta de {{montoRenta}}. De acuerdo a lo establecido en el art. 330º y siguientes del Código Procesal Civil.</p>

        <div class="signatures">
          <p class="signing-text">Ambas partes declaran su conformidad con todas y cada una de las cláusulas del presente contrato, firmándolo en dos ejemplares igualmente válidos.</p>

          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-line">____________________________</div>
              <p class="signer-title">ARRENDADOR</p>
              <p class="signer-name">{{nombreArrendador}}</p>
            </div>

            <div class="signature-block">
              <div class="signature-line">____________________________</div>
              <p class="signer-title">ARRENDATARIO</p>
              <p class="signer-name">{{nombreArrendatario}}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      /* Página A4 visual */
      .page {
        width: 21cm;
        min-height: 29.7cm;
        margin: 0 auto; /* centrar la página */
        background: #fff; /* mostrar la hoja en blanco */
        position: relative;
        box-shadow: 0 0 0 rgba(0,0,0,0);
        display: inline-block; /* permite centrar sin overflow */
        max-width: 100%; /* no exceder el contenedor */
        overflow: visible; /* permitir que bloque de firmas absolutos se vean en preview */
        vertical-align: top;
      }

      /* Contenido del contrato con márgenes de 1 pulgada */
      .contract-content {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.6; /* mayor legibilidad */
        color: #000;
        width: 21cm; /* ancho fijo igual a A4 */
        max-width: 100%;
        min-height: calc(29.7cm - 2 * 2.54cm); /* altura util de la hoja */
        box-sizing: border-box; /* padding incluido en el ancho */
        padding: 2.54cm; /* márgenes interiores */
        margin: 0 auto;
        display: flex;
        flex-direction: column;
      }

      /* Header */
      .header { text-align: center; }

      .header h1 {
        font-size: 14pt;
        font-weight: bold;
        text-transform: uppercase;
        margin: 0.4em 0 0.8em 0; /* ajuste fino: menos espacio encima, más debajo */
      }

      /* Body */
  .contract-body { text-align: justify; margin-bottom: 1.2cm; }

      .contract-content p { margin: 0.5em 0; text-indent: 1.5em; }

      .signature-section { display: flex; justify-content: space-between; gap: 1.5cm; }

      .signature-block { width: calc(50% - 0.75cm); text-align: center; }

      .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto 0.35em auto; }

      /* Impresión / Export PDF: asegurar A4 y márgenes */
      @media print {
        .page, .contract-content { width: 21cm; height: 29.7cm; }
        body, html { background: #fff; }
        h1, h2, .clause, .signatures, .signature-section { page-break-inside: avoid; }
      }
    </style>
  </div></div>
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
      key: 'renewalNoticeDays',
      label: 'Días de aviso para renovación',
      type: 'number',
      required: false,
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
