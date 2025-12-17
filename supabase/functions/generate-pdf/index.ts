import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const quotation = await req.json();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 1cm 1.5cm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #111827;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 3px solid #2563eb;
    }

    .logo {
      width: 140px;
    }

    .company-info {
      text-align: right;
      font-size: 8pt;
      color: #374151;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 1rem;
    }

    .info-section {
      font-size: 8pt;
    }

    .info-label {
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.25rem;
    }

    .info-value {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .client-name {
      font-size: 9pt;
      font-weight: bold;
      color: #111827;
      margin-bottom: 0.25rem;
    }

    .study-title-box {
      background: #eff6ff;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }

    .study-title {
      font-size: 9pt;
      font-weight: bold;
      color: #1e40af;
      text-transform: uppercase;
    }

    .study-volunteers {
      font-size: 8pt;
      color: #374151;
      margin-top: 0.5rem;
    }

    .study-design {
      background: linear-gradient(to right, #faf5ff, #eff6ff);
      padding: 0.75rem;
      border: 1px solid #c4b5fd;
      margin-bottom: 1rem;
    }

    .study-design-title {
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #111827;
      margin-bottom: 0.5rem;
    }

    .study-design-content {
      font-size: 8pt;
      color: #1f2937;
      line-height: 1.5;
    }

    .objective-section {
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }

    .objective-title {
      background: #e0e7ff;
      padding: 0.5rem;
      font-size: 8pt;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 0.5rem;
    }

    .service-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
      page-break-inside: auto;
    }

    .service-table thead tr {
      background: #f3f4f6;
    }

    .service-table th {
      text-align: left;
      padding: 0.5rem;
      font-size: 7pt;
      font-weight: 600;
      color: #111827;
      border: 1px solid #d1d5db;
    }

    .service-table td {
      padding: 0.4rem 0.5rem;
      font-size: 7pt;
      color: #1f2937;
      border: 1px solid #d1d5db;
      page-break-inside: avoid;
    }

    .service-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    .service-table .text-right {
      text-align: right;
    }

    .totals-table {
      width: 50%;
      margin-left: auto;
      margin-top: 1rem;
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }

    .totals-table td {
      padding: 0.4rem 0.5rem;
      font-size: 8pt;
      border-bottom: 1px solid #e5e7eb;
    }

    .total-label {
      font-weight: 600;
      text-align: right;
      padding-right: 1rem;
      color: #111827;
    }

    .total-value {
      text-align: right;
      font-weight: 600;
      color: #111827;
    }

    .credit-impot {
      background: #f9fafb;
      padding: 0.5rem;
      margin-bottom: 0.75rem;
      font-size: 8pt;
      font-style: italic;
      color: #6b7280;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
    }

    .signature-box {
      background: #f9fafb;
      padding: 0.75rem;
      border: 1px solid #9ca3af;
      width: 48%;
    }

    .footer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      font-size: 7pt;
      color: #4b5563;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 2px solid #d1d5db;
      page-break-inside: avoid;
      page-break-after: always;
    }

    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <svg class="logo" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
      <text x="10" y="35" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#2563eb">GREDECO</text>
    </svg>
    <div class="company-info">
      <div style="font-weight: bold; margin-bottom: 0.25rem;">Dr Sylvie BOISNIC</div>
      <div>45 bd Vincent Auriol</div>
      <div>75013 Paris</div>
      <div>Tél: 01 45 86 58 82</div>
      <div>gredeco@gredeco.com</div>
    </div>
  </div>

  <div class="content-grid">
    <div class="info-section">
      <div class="info-label">Devis N°</div>
      <div class="info-value">${quotation.quote_number}</div>
      <div class="info-label">Date</div>
      <div class="info-value">${new Date(quotation.date).toLocaleDateString('fr-FR')}</div>
    </div>
    <div class="info-section">
      <div class="info-label">Client</div>
      <div class="client-name">${quotation.customer?.first_name} ${quotation.customer?.last_name}</div>
      ${quotation.customer?.address ? `<div class="info-value">${quotation.customer.address}</div>` : ''}
      ${quotation.customer?.email?.length > 0 ? `<div class="info-value">${quotation.customer.email.join(', ')}</div>` : ''}
      ${quotation.customer?.phone ? `<div class="info-value">${quotation.customer.phone}</div>` : ''}
    </div>
  </div>

  <div class="study-title-box">
    <div class="study-title">${quotation.study_title}</div>
    ${quotation.volunteers ? `<div class="study-volunteers">${quotation.volunteers} volontaires</div>` : ''}
  </div>

  ${quotation.study_design ? `
  <div class="study-design">
    <div class="study-design-title">Design de l'étude</div>
    <div class="study-design-content">${quotation.study_design}</div>
  </div>
  ` : ''}

  ${quotation.services && quotation.services.length > 0 ? quotation.services.map((objective: any) => `
    <div class="objective-section">
      <div class="objective-title">${objective.objectiveName}</div>
      <table class="service-table">
        <thead>
          <tr>
            <th style="width: 50%;">Service</th>
            <th style="width: 15%; text-align: center;">Quantité</th>
            <th style="width: 18%; text-align: right;">Prix unit. HT</th>
            <th style="width: 17%; text-align: right;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${objective.services.map((service: any) => `
            <tr>
              <td>${service.name}</td>
              <td style="text-align: center;">${service.quantity}</td>
              <td class="text-right">${service.unit_price.toFixed(2)}&nbsp;€</td>
              <td class="text-right">${(service.quantity * service.unit_price).toFixed(2)}&nbsp;€</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('') : ''}

  <table class="totals-table">
    <tr>
      <td class="total-label">Total HT:</td>
      <td class="total-value">${quotation.totals?.totalHT?.toFixed(2) || '0.00'}&nbsp;€</td>
    </tr>
    <tr>
      <td class="total-label">TVA (20%):</td>
      <td class="total-value">${quotation.totals?.totalTVA?.toFixed(2) || '0.00'}&nbsp;€</td>
    </tr>
    <tr>
      <td class="total-label">Total TTC:</td>
      <td class="total-value">${quotation.totals?.totalTTC?.toFixed(2) || '0.00'}&nbsp;€</td>
    </tr>
  </table>

  <div class="credit-impot">
    <p>GREDECO a reçu l'agrément en ce qui concerne le crédit d'impôt en faveur de la recherche de 2022 à 2026</p>
  </div>

  <div class="signatures">
    <div class="signature-box">
      <div style="font-size: 8pt; font-weight: bold; margin-bottom: 0.5rem;">Bon pour accord</div>
      <div style="font-size: 8pt; margin-bottom: 0.25rem;">Signature Investigateur</div>
      <div style="height: 4rem; margin: 0.5rem 0; display: flex; align-items: center;">
        <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAoAE0DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6RmCjk1la5ryaSIoo4mu7+4yLe1jOGkI6kn+FR3Y8D64FUU8OXOrqH1y7acNg/Y7ZjHCntkfM31J59B0qkur0Jv0RavvGGj6fcCCbUIftB6QRnfIfoq5P6VUk8e2Cci01ZlHVl0m5OP/Iefyrcs9OtdPhEVrbRW0Q52RIFH5Cp9o9Ka5F0f3/8AADUyNH8W6Xrk729rdg3UYDPazI0UyD1MbgMB+FbNc54zsIZtPjuERRqUEimyl6MJiQFXP91jww9Ca6FelJ23QK+zHUUmaM1JQtFFFAHlmna5rt3qWqaamkSwNPcy2sErRG6YQxSNGu0KVVQxUyckn5wCOBi4t3r7lvP0rxHeAnK7J7W3A+gWRTj6102JvDM03l2zXGmSyNN+5GXgZiWckd1LEnjkZNaen6zZaoga1uo5uASqt8y/UdR+NdLqdVFWMVHuzipbrWbWJ3Tw9rUaoCxc6rCcYGc4MhB+lWdA8a6xNpkE994X1NUdSwnjaCTcmTsbajk5K4OAO9a+uXfiFZ5ItLs7RkIHl3Mz7gPXcmQfyJqlDfeJrhorSX+y7W5K/vHg8ycLx1I+UDPbmjdapfeC0ejY2xgs/FWsz3sGr3yyW4WN7FlEZtyR12su5S3rntxWhN4PtFV5HudRnIBOGvZDn2A3Vf0zRlsrh7uWV7m9kjWKSd8DKqSQABxBlj+vetOsnPpF6FqOmp5pLpt1qNj52mJr2k6iyZRVkYCN/RvNyhA78Eema0YtJ8YaZqFtcQ6hDq8RtRHPbXk/kIJuCXUrCxPTAHHU5zxjuaWq9q9rEqnbqcnJeeMo1Lf2XosmDkxpqEwYj2JhxmurXJAzS0Vk3foaJWEPSs++0DTtTYNdWUE7DozoCR+NFFJXWqBq4kPh6wg+5bKo9Mmr0NvHbrtjRUX0UYooobb3YWsSUUUUDCiiigAooooA/9k=" alt="Signature Sylvie Boisnic" style="max-height: 3.5rem; max-width: 100%;" />
      </div>
      <div style="font-size: 8pt;">Dr Sylvie BOISNIC</div>
    </div>
    <div class="signature-box">
      <div style="font-size: 8pt; font-weight: bold; margin-bottom: 0.5rem;">Bon pour accord</div>
      <div style="font-size: 8pt; margin-bottom: 0.25rem;">Signature promoteur</div>
      <div style="height: 4rem; border-bottom: 2px solid #6b7280; margin: 0.5rem 0;"></div>
    </div>
  </div>

  <div class="footer-info">
    <div>
      <div style="font-weight: bold; margin-bottom: 0.25rem;">Informations bancaires</div>
      <div>IBAN: FR76 3000 4009 4500 0103 5530 V88</div>
      <div>BIC: BNPAFRPPXXX</div>
    </div>
    <div>
      <div style="font-weight: bold; margin-bottom: 0.25rem;">Conditions de règlement</div>
      <div>Paiement à 30 jours fin de mois</div>
      <div>SIRET: 332 739 510 00038 - APE: 7219Z</div>
    </div>
  </div>

  <div style="display: block; height: 0; page-break-after: always; break-after: page;"></div>

  <div style="page-break-before: always; break-before: page; page-break-inside: avoid; margin-top: 0; padding-top: 0;">
    <div style="background: linear-gradient(to right, #faf5ff, #eff6ff); padding: 0.75rem; border: 1px solid #e9d5ff; margin-bottom: 1rem;">
      <h2 style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin: 0; color: #111827;">Conditions Générales de Vente</h2>
    </div>

    <div style="font-size: 8pt; line-height: 1.5;">
      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 1 - Objet</h3>
        <p style="color: #4b5563; margin: 0;">
          Les présentes conditions générales de vente s'appliquent à toutes les prestations de services effectuées par GREDECO. Toute commande implique l'acceptation sans réserve par l'acheteur et son adhésion pleine et entière aux présentes conditions générales de vente qui prévalent sur tout autre document de l'acheteur.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 2 - Prix</h3>
        <p style="color: #4b5563; margin: 0;">
          Les prix des prestations sont ceux en vigueur au jour de la prise de commande. Ils sont libellés en euros et calculés hors taxes. Par voie de conséquence, ils seront majorés du taux de TVA et des frais de transport applicables au jour de la commande. GREDECO s'accorde le droit de modifier ses tarifs à tout moment. Toutefois, elle s'engage à facturer les marchandises commandées aux prix indiqués lors de l'enregistrement de la commande.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 3 - Escompte</h3>
        <p style="color: #4b5563; margin: 0;">
          Aucun escompte ne sera consenti en cas de paiement anticipé.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 4 - Modalités de paiement</h3>
        <p style="color: #4b5563; margin: 0 0 0.5rem 0;">
          Les modalités de règlement du montant total du devis s'établiront comme suit :
        </p>
        <p style="color: #4b5563; margin: 0 0 0.25rem 0;">
          <strong>Acompte :</strong> Un acompte de 50% du montant total du devis sera exigible à la signature du devis.
        </p>
        <p style="color: #4b5563; margin: 0 0 0.5rem 0;">
          <strong>Solde :</strong> Le solde restant, soit 50% du montant total, sera réglé à 30 jours à compter de la date d'émission du rapport d'étude final.
        </p>
        <p style="color: #4b5563; margin: 0 0 0.25rem 0;">
          <strong>Moyens de Paiement :</strong> Les règlements peuvent être effectués :
        </p>
        <ul style="color: #4b5563; margin: 0; padding-left: 1.5rem;">
          <li>Soit par chèque</li>
          <li>Soit par virement bancaire</li>
        </ul>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 5 - Retard de paiement</h3>
        <p style="color: #4b5563; margin: 0 0 0.25rem 0;">
          En cas de défaut de paiement total ou partiel des marchandises livrées au jour de la réception, l'acheteur doit verser à GREDECO une pénalité de retard égale à trois fois le taux de l'intérêt légal.
        </p>
        <p style="color: #4b5563; margin: 0 0 0.25rem 0;">
          Le taux de l'intérêt légal retenu est celui en vigueur au jour de la livraison des marchandises.
        </p>
        <p style="color: #4b5563; margin: 0 0 0.25rem 0;">
          A compter du 1er janvier 2015, le taux d'intérêt légal sera révisé tous les 6 mois (Ordonnance n°2014-947 du 20 août 2014).
        </p>
        <p style="color: #4b5563; margin: 0 0 0.25rem 0;">
          Cette pénalité est calculée sur le montant TTC de la somme restant due, et court à compter de la date d'échéance du prix sans qu'aucune mise en demeure préalable ne soit nécessaire.
        </p>
        <p style="color: #4b5563; margin: 0;">
          En sus des indemnités de retard, toute somme, y compris l'acompte, non payée à sa date d'exigibilité produira de plein droit le paiement d'une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement. Articles 441-6, I alinéa 12 et D. 441-5 du code de commerce.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 6 - Clause résolutoire</h3>
        <p style="color: #4b5563; margin: 0;">
          Si dans les quinze jours qui suivent la mise en oeuvre de la clause "Retard de paiement", l'acheteur ne s'est pas acquitté des sommes restant dues, la vente sera résolue de plein droit et pourra ouvrir droit à l'allocation de dommages et intérêts au profit de GREDECO.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 7 - Clause de réserve de propriété</h3>
        <p style="color: #4b5563; margin: 0;">
          GREDECO conserve la propriété des biens vendus jusqu'au paiement intégral du prix, en principal et en accessoires. À ce titre, si l'acheteur fait l'objet d'un redressement ou d'une liquidation judiciaire, GREDECO se réserve le droit de revendiquer, dans le cadre de la procédure collective, les marchandises vendues et restées impayées.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 8 - Livraison</h3>
        <p style="color: #4b5563; margin: 0;">
          La livraison est effectuée soit par la remise directe de la marchandise à l'acheteur, soit par l'envoi d'un avis de mise à disposition en magasin à l'attention de l'acheteur, soit au lieu indiqué par l'acheteur sur le bon de commande. Le délai de livraison indiqué lors de l'enregistrement de la commande n'est donné qu'à titre indicatif et n'est aucunement garanti. Par voie de conséquence, tout retard raisonnable dans la livraison des produits ne pourra pas donner lieu au profit de l'acheteur à: l'allocation de dommages et intérêts, l'annulation de la commande. Le risque du transport est supporté en totalité par l'acheteur. En cas de marchandises manquantes ou détériorées lors du transport, l'acheteur devra formuler toutes les réserves nécessaires sur le bon de commande à réception desdites marchandises. Ces réserves devront être, en outre, confirmées par écrit dans les cinq jours suivant la livraison, par courrier recommandé AR.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 9 - Force majeure</h3>
        <p style="color: #4b5563; margin: 0;">
          La responsabilité de GREDECO ne pourra pas être mise en oeuvre si la non-exécution ou le retard dans l'exécution de l'une de ses obligations décrites dans les présentes conditions générales de vente découle d'un cas de force majeure. À ce titre, la force majeure s'entend de tout événement extérieur, imprévisible et irrésistible au sens de l'article 1148 du Code civil.
        </p>
      </div>

      <div style="margin-bottom: 0.75rem;">
        <h3 style="font-weight: bold; color: #111827; margin-bottom: 0.375rem; font-size: 8pt;">Article 10 - Tribunal compétent</h3>
        <p style="color: #4b5563; margin: 0;">
          Tout litige relatif à l'interprétation et à l'exécution des présentes conditions générales de vente est soumis au droit français. À défaut de résolution amiable, le litige sera porté devant le Tribunal de commerce de Paris.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return new Response(JSON.stringify({ html }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});