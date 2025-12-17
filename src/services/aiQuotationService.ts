import { Service } from '../lib/supabase';

export interface StudyDesign {
  studyType: 'ex_vivo' | 'in_vivo';
  numberOfPanelists: number;
  numberOfTimepoints: number;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  skinTypes: string[];
  studyDuration: string;
  objectives: string[];
  methodology: string;
  expectedOutcomes: string[];
}

export interface AIQuotationRecommendation {
  studyDesign: StudyDesign;
  recommendedServices: Array<{
    serviceId?: string;
    serviceName: string;
    description: string;
    quantity: number;
    rationale: string;
  }>;
  notes: string;
  estimatedTimeline: string;
}

export async function analyzeCustomerRequest(
  emailContent: string,
  availableServices: Service[]
): Promise<AIQuotationRecommendation> {
  const prompt = `You are an expert CRO (Contract Research Organization) consultant specializing in cosmetic efficacy studies, both ex vivo and in vivo trials.

IMPORTANT: You will receive customer requests in MULTIPLE LANGUAGES including French (Français), English, Thai (ภาษาไทย), or MIXED languages. You MUST understand and analyze the content regardless of language.

FRENCH LANGUAGE EXPERTISE REQUIRED:
- You are FLUENT in French and understand ALL French cosmetic terminology
- Common French terms you MUST recognize:
  * "blanchissement" / "blanchiment" = whitening/brightening
  * "éclaircissement" / "éclaircissant" = lightening/brightening
  * "taches brunes" / "taches pigmentaires" / "taches sombres" = dark spots
  * "rides" = wrinkles
  * "anti-âge" = anti-aging
  * "fermeté" = firmness
  * "hydratation" = hydration
  * "personnes" / "volontaires" / "participants" = people/volunteers/participants
  * "sujets" = subjects
  * "temps de mesure" / "visites" = timepoints/visits
  * "peau" = skin
  * "pour X personnes" = for X people/panelists

Analyze the following customer request and provide a detailed study design and quotation recommendation.

Available Services Database:
${availableServices.map(s => `- ${s.name} (${s.category}): ${s.description} - €${s.base_price} per ${s.unit}`).join('\n')}

Customer Request:
${emailContent}

CRITICAL EXTRACTION RULES FOR FRENCH REQUESTS:
1. This request may be in French, English, Thai, or mixed languages - analyze it carefully regardless of language
2. Extract study objectives from the text regardless of language:
   - English: "reduce dark spots", "anti-aging", "wrinkle reduction", "hydration", "brightening", "whitening"
   - French: "blanchissement de la peau", "blanchiment", "éclaircissement", "taches brunes", "taches pigmentaires", "taches sombres", "anti-âge", "rides", "hydratation", "éclaircissant", "dépigmentation"
   - Thai: "ลดเลือนจุดด่างดำ" (reduce dark spots), "เพิ่มความกระจ่างใส" (brightness), "เพิ่มความชุ่มชื้น" (hydration)
3. Extract ANY SPECIFIED NUMBERS for panelists/volunteers/subjects or timepoints in ANY language:
   - English: "50 panelists", "20 volunteers", "30 subjects", "4 timepoints", "for 25 people"
   - French: "50 volontaires", "20 sujets", "4 visites", "30 personnes", "pour 30 personnes", "avec 25 participants"
   - Thai: "อาสาสมัคร 50 คน"
   - IMPORTANT FOR FRENCH: The pattern "pour X personnes" means "for X people/panelists" - extract X as numberOfPanelists
4. If a specific number is mentioned (like "20 volontaires", "pour 30 personnes", or "50 panelists"), use that EXACT number for numberOfPanelists
5. If NO specific number is mentioned, recommend 20-30 panelists for in vivo studies
6. Always extract the product name and testing goals from the email
7. FRENCH PATTERN RECOGNITION:
   - "blanchissement de la peau" = skin whitening study
   - "pour X personnes" = study with X panelists
   - "étude de Y semaines" = Y weeks study duration

CRITICAL SERVICE SELECTION RULES - READ CAREFULLY:
You MUST intelligently select ONLY services that match the specific study objectives. Different objectives require different measurements:

**WHITENING/BRIGHTENING Studies** (English: brightening, whitening | French: blanchissement, blanchiment, éclaircissement, éclaircissant, anti-taches, dépigmentation | Thai: ลดจุดด่างดำ, เพิ่มความกระจ่างใส):
- REQUIRED: Search for ALL services in the database containing keywords: "colorimeter", "chromameter", "mexameter", "L*", "ITA", "SkinColorCatch", "brightening", "whitening", "lightening", "éclaircissant"
- REQUIRED: Search for ALL services containing: "photography", "visia", "lifeviz", "photo face"
- OPTIONAL: Services with "corneocyte", "desquamation", "exfoliation"
- YOU MUST suggest EVERY matching service from the database, not just one
- DO NOT INCLUDE: Anti-aging measurements (wrinkles, elasticity) unless also mentioned
- FRENCH EXAMPLES: "blanchissement de la peau", "éclaircissement du teint", "réduction des taches brunes"

**ANTI-AGING Studies** (English: anti-aging, wrinkles | French: anti-âge, rides, fermeté | Thai: ลดริ้วรอย, กระชับ):
- REQUIRED: Search for ALL services containing: "cutometer", "elasticity", "firmness", "élasticité", "fermeté"
- REQUIRED: Search for ALL services containing: "primos", "wrinkle", "ride", "depth", "profondeur"
- REQUIRED: Search for ALL services containing: "photography", "visia", "lifeviz", "visioscan"
- YOU MUST suggest EVERY matching service from the database, not just one
- DO NOT INCLUDE: Whitening measurements (colorimetry) unless also mentioned

**HYDRATION Studies** (English: hydration, moisture | French: hydratation, humidité | Thai: ความชุ่มชื้น):
- REQUIRED: Search for ALL services containing: "corneometer", "hydration", "hydratation", "moisture", "skicon"
- REQUIRED: Search for ALL services containing: "tewl", "water loss", "perte en eau"
- OPTIONAL: Services with "sebumeter", "sebum" for oily skin claims
- YOU MUST suggest EVERY matching service from the database, not just one
- DO NOT INCLUDE: Whitening or anti-aging tests unless also mentioned

**REDNESS/SENSITIVITY Studies** (English: redness, sensitivity | French: rougeurs, sensibilité | Thai: ลดรอยแดง):
- REQUIRED: Search for ALL services containing: "chromameter", "a*", "redness", "rougeur", "erythema"
- REQUIRED: Search for ALL services containing: "sebumeter", "sebum", "irritation"
- OPTIONAL: Services with "corneometer" for barrier function
- YOU MUST suggest EVERY matching service from the database, not just one
- DO NOT INCLUDE: Whitening tests unless also mentioned

**MULTI-OBJECTIVE Studies** (Études multi-objectifs):
- If customer mentions BOTH whitening AND anti-aging (blanchiment ET anti-âge), include tests for BOTH
- If customer mentions ONLY whitening (SEULEMENT blanchiment), include ONLY whitening tests
- If customer changes from whitening to anti-aging, REMOVE whitening tests and ADD anti-aging tests

**MANDATORY FOR IN VIVO STUDIES**:
- ALWAYS include "Panel Recruitment" or "Recrutement de panélistes" service (one-time cost for recruiting volunteers)
- ALWAYS include "Indemnisation" or "Panel Indemnity" service (compensation per panelist)
- These services should be listed under the objective "Recrutement de panélistes"
- DO NOT include these for ex vivo studies (only for in vivo)

FOR EACH SERVICE YOU RECOMMEND:
- SEARCH THE ENTIRE DATABASE for ALL services matching the objective keywords
- In the "rationale" field, EXPLICITLY STATE which objective it addresses
- Example: "Colorimetric analysis - Required to measure skin lightening efficacy for dark spot reduction objective"
- Example: "Cutometer - Required to measure skin firmness improvement for anti-aging objective"
- Example: "Panel Recruitment - Required to recruit volunteers for in vivo study"
- Example: "Indemnisation - Compensation for panelist participation"
- CRITICAL: Suggest ALL relevant services from the database, not just 1-2. If there are 5 colorimetry services, suggest all 5 that match the objective

Based on this request, provide a comprehensive response in the following JSON format:
{
  "studyDesign": {
    "studyType": "ex_vivo" or "in_vivo",
    "numberOfPanelists": number (USE EXACT NUMBER if specified in customer request, otherwise recommend appropriate sample size),
    "numberOfTimepoints": number (USE EXACT NUMBER if specified in customer request, otherwise recommend appropriate measurement schedule),
    "inclusionCriteria": ["criterion1", "criterion2", ...],
    "exclusionCriteria": ["criterion1", "criterion2", ...],
    "skinTypes": ["Fitzpatrick Type I", "Fitzpatrick Type II", "Fitzpatrick Type III", "Fitzpatrick Type IV", etc.],
    "studyDuration": "X weeks/months",
    "objectives": ["objective1", "objective2", ...],
    "methodology": "Brief description of methodology",
    "expectedOutcomes": ["outcome1", "outcome2", ...]
  },
  "recommendedServices": [
    {
      "serviceName": "Service name from available services",
      "description": "Detailed description",
      "quantity": number,
      "rationale": "Why this service is needed"
    }
  ],
  "notes": "Professional notes about the study, regulatory considerations, or special requirements",
  "estimatedTimeline": "Timeline description"
}

CRITICAL INSTRUCTIONS:
1. If the customer specifies a NUMBER OF PANELISTS or VOLUNTEERS in their request, you MUST use that EXACT number in numberOfPanelists
2. If the customer specifies a NUMBER OF TIMEPOINTS or MEASUREMENT TIMES, you MUST use that EXACT number in numberOfTimepoints
3. Look for keywords like: "30 volunteers", "20 panelists", "50 subjects", "4 timepoints", "weekly measurements", etc.
4. For ex vivo studies: tissue procurement, storage, testing conditions, number of donors/replicates, appropriate skin types
5. For in vivo studies: appropriate panel size for statistical power, demographics, Fitzpatrick skin types (I-VI)
6. Appropriate controls and comparative products if needed
7. Regulatory compliance (ISO standards, GLP, cosmetic regulations)
8. Statistical analysis requirements
9. Documentation and reporting needs
10. IMPORTANT: Include specific Fitzpatrick skin types in the skinTypes field (e.g., "Fitzpatrick Type II-IV" or list specific types)

Provide professional, scientifically sound recommendations.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert CRO consultant specializing in cosmetic efficacy studies. You are FLUENT in French and English (and understand Thai and mixed languages). Provide detailed, scientifically accurate recommendations in valid JSON format only, without any markdown formatting or code blocks. CRITICAL FRENCH UNDERSTANDING: You MUST correctly interpret French cosmetic terminology - "blanchissement de la peau" means skin whitening study, "pour 30 personnes" means for 30 panelists, "éclaircissement" means brightening/lightening, "taches brunes" means dark spots. When the customer specifies exact numbers (panelists, volunteers, subjects, volontaires, personnes, participants, timepoints, visites), you MUST use those EXACT numbers in your response. Extract numerical values carefully from patterns like "pour X personnes", "X volontaires", "X participants". Recognize ALL French cosmetic terms: volontaires (volunteers), personnes (people/panelists), rides (wrinkles), anti-âge (anti-aging), blanchissement/blanchiment (whitening), éclaircissement/éclaircissant (brightening/lightening), taches brunes/pigmentaires (dark spots), hydratation (hydration), fermeté (firmness), dépigmentation (depigmentation), etc.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    let jsonContent = content;
    if (content.startsWith('```')) {
      jsonContent = content.replace(/```json?\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    const recommendation: AIQuotationRecommendation = JSON.parse(jsonContent);

    recommendation.recommendedServices = recommendation.recommendedServices.map(service => {
      const matchedService = availableServices.find(s =>
        s.name.toLowerCase().includes(service.serviceName.toLowerCase()) ||
        service.serviceName.toLowerCase().includes(s.name.toLowerCase())
      );

      return {
        ...service,
        serviceId: matchedService?.id,
      };
    });

    return recommendation;

  } catch (error) {
    console.error('Error calling OpenAI API:', error);

    return generateFallbackRecommendation(emailContent, availableServices);
  }
}

function generateFallbackRecommendation(
  emailContent: string,
  availableServices: Service[]
): AIQuotationRecommendation {
  const emailLower = emailContent.toLowerCase();
  const isExVivo = emailLower.includes('ex vivo') || emailLower.includes('ex-vivo') ||
                   emailLower.includes('in vitro') || emailLower.includes('tissue');
  const isInVivo = emailLower.includes('in vivo') || emailLower.includes('clinical') ||
                   emailLower.includes('panel') || emailLower.includes('volunteer');

  const studyType: 'ex_vivo' | 'in_vivo' = isExVivo ? 'ex_vivo' : 'in_vivo';

  const panelistMatch = emailContent.match(/(?:for|with|need|want|require|pour|avec|besoin|sur|de)?\s*(\d+)\s*(?:panelist|volunteer|subject|อาสาสมัคร|คน|people|participants?|volontaires?|sujets?|personnes?)/i);
  const numberOfPanelists = panelistMatch ? parseInt(panelistMatch[1]) : (studyType === 'in_vivo' ? 30 : 6);

  const timepointMatch = emailContent.match(/(\d+)\s*(?:timepoint|measurement|time|temps|mesure|visite)/i);
  const numberOfTimepoints = timepointMatch ? parseInt(timepointMatch[1]) : 4;

  const isWhitening = emailLower.includes('whitening') || emailLower.includes('brightening') ||
                      emailLower.includes('lightening') || emailLower.includes('dark spot') ||
                      emailLower.includes('blanchiment') || emailLower.includes('blanchissement') ||
                      emailLower.includes('éclaircissant') || emailLower.includes('éclaircissement') ||
                      emailLower.includes('taches brunes') || emailLower.includes('taches sombres') ||
                      emailLower.includes('taches pigmentaires') ||
                      emailLower.includes('dépigmentant') || emailLower.includes('dépigmentation') ||
                      emailLower.includes('anti-taches') ||
                      emailLower.includes('จุดด่างดำ') || emailLower.includes('กระจ่างใส') ||
                      emailLower.includes('ขาว');

  const isAntiAging = emailLower.includes('anti-aging') || emailLower.includes('anti aging') ||
                      emailLower.includes('wrinkle') || emailLower.includes('firmness') ||
                      emailLower.includes('elasticity') ||
                      emailLower.includes('anti-âge') || emailLower.includes('anti age') ||
                      emailLower.includes('rides') || emailLower.includes('fermeté') ||
                      emailLower.includes('élasticité') || emailLower.includes('vieillissement') ||
                      emailLower.includes('ริ้วรอย') || emailLower.includes('กระชับ');

  const isHydration = emailLower.includes('hydration') || emailLower.includes('moisture') ||
                      emailLower.includes('hydratation') || emailLower.includes('humidité') ||
                      emailLower.includes('hydratant') ||
                      emailLower.includes('ความชุ่มชื้น');

  const objectives: string[] = [];
  if (isWhitening) {
    objectives.push('Blanchissement/éclaircissement de la peau', 'Réduction des taches brunes');
  }
  if (isAntiAging) {
    objectives.push('Efficacité anti-âge', 'Réduction des rides');
  }
  if (isHydration) {
    objectives.push('Amélioration de l\'hydratation');
  }
  if (objectives.length === 0) {
    objectives.push('Évaluation générale de l\'efficacité');
  }

  let recommendedServices: AIQuotationRecommendation['recommendedServices'] = [];

  if (isWhitening) {
    const colorimetryServices = availableServices.filter(s => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      return (
        (desc.includes('claims: whitening') || desc.includes('claims: brightening') ||
         desc.includes('chromam') || desc.includes('colorim') || desc.includes('ita') ||
         desc.includes('éclaircissant') || desc.includes('lightening') ||
         desc.includes('mexameter') || desc.includes('skincatch') ||
         name.includes('colorim') || name.includes('chromam') || name.includes('mexam') ||
         (desc.includes('l*') && desc.includes('skin'))) &&
        !desc.includes('patte d\'oie') && !desc.includes('crow') && !desc.includes('wrinkle') && !desc.includes('ride')
      );
    });
    colorimetryServices.forEach(service => {
      recommendedServices.push({
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        rationale: 'Analyse colorimétrique - Requise pour mesurer l\'efficacité de blanchissement de la peau et la réduction des taches brunes'
      });
    });

    const visiaService = availableServices.find(s => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      return name === 'visia cr5' && desc.includes('standard(before & after)');
    });
    if (visiaService) {
      recommendedServices.push({
        serviceId: visiaService.id,
        serviceName: visiaService.name,
        description: visiaService.description,
        quantity: 1,
        rationale: 'VISIA CR5 - Documentation visuelle des taches brunes et des effets de blanchissement'
      });
    }
  }

  if (isAntiAging) {
    const cutometerServices = availableServices.filter(s => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      return (
        (desc.includes('claims: anti-aging') || desc.includes('claims: firmness') ||
         desc.includes('cutometer') || desc.includes('elasticity') ||
         desc.includes('élasticité') || desc.includes('firmness') ||
         name.includes('cutometer') || name.includes('elasticity')) &&
        !name.includes('post procedure') && !name.includes('post-procedure') &&
        !name.includes('corps')
      );
    });
    cutometerServices.forEach(service => {
      recommendedServices.push({
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        rationale: 'Cutomètre - Requis pour mesurer l\'élasticité et la fermeté de la peau pour les allégations anti-âge'
      });
    });

    const primosServices = availableServices.filter(s => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      return (
        (desc.includes('claims: anti-aging') || desc.includes('claims: wrinkle') ||
         desc.includes('primos') || desc.includes('wrinkle') ||
         desc.includes('ride') || desc.includes('profondeur') ||
         name.includes('primos') || name.includes('visioscan')) &&
        !name.includes('post procedure') && !name.includes('post-procedure') &&
        !name.includes('corps')
      );
    });
    primosServices.forEach(service => {
      recommendedServices.push({
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        rationale: 'Primos/Profilométrie - Requis pour mesurer la profondeur des rides et l\'amélioration de la texture de la peau'
      });
    });

    const visiaService = availableServices.find(s => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      return name === 'visia cr5' && desc.includes('standard(before & after)');
    });
    if (visiaService) {
      recommendedServices.push({
        serviceId: visiaService.id,
        serviceName: visiaService.name,
        description: visiaService.description,
        quantity: 1,
        rationale: 'VISIA CR5 - Documentation visuelle des effets anti-âge'
      });
    }
  }

  if (isHydration) {
    const corneometerService = availableServices.find(s => {
      const name = s.name.toLowerCase();
      return name === 'cornéomètre';
    });
    if (corneometerService) {
      recommendedServices.push({
        serviceId: corneometerService.id,
        serviceName: corneometerService.name,
        description: corneometerService.description,
        quantity: 1,
        rationale: 'Cornéomètre - Requis pour mesurer les niveaux d\'hydratation de la peau'
      });
    }

    const tewlServices = availableServices.filter(s => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      return (
        desc.includes('tewl') || desc.includes('water loss') ||
        desc.includes('perte en eau') || name.includes('tewl')
      );
    });
    tewlServices.forEach(service => {
      recommendedServices.push({
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        rationale: 'TEWL - Requis pour mesurer la perte en eau transépidermique et la fonction barrière'
      });
    });
  }

  if (studyType === 'in_vivo') {
    const recruitmentService = availableServices.find(s => {
      const desc = s.description.toLowerCase();
      return desc.includes('recruitement panelist') ||
             desc.includes('recruitment panelist') ||
             ((desc.includes('recrutement') || desc.includes('recruitment')) && desc.includes('panelist'));
    });

    if (recruitmentService) {
      recommendedServices.push({
        serviceId: recruitmentService.id,
        serviceName: recruitmentService.name,
        description: recruitmentService.description,
        quantity: numberOfPanelists,
        rationale: 'Recrutement de panélistes - Service obligatoire pour les études in vivo afin de recruter les volontaires'
      });
    }

    const indemnisationService = availableServices.find(s => {
      const desc = s.description.toLowerCase();
      return desc.includes('idemisation panelist') ||
             desc.includes('indemnisation panelist') ||
             ((desc.includes('indemnisation') || desc.includes('idemisation')) && desc.includes('panelist'));
    });

    if (indemnisationService) {
      recommendedServices.push({
        serviceId: indemnisationService.id,
        serviceName: indemnisationService.name,
        description: indemnisationService.description,
        quantity: numberOfPanelists,
        rationale: 'Indemnisation des panélistes - Compensation obligatoire pour la participation des volontaires'
      });
    }
  }

  if (recommendedServices.length === 0) {
    recommendedServices = availableServices.slice(0, 3).map(service => ({
      serviceId: service.id,
      serviceName: service.name,
      description: service.description,
      quantity: 1,
      rationale: 'Basé sur les exigences standard de l\'étude',
    }));
  }

  return {
    studyDesign: {
      studyType,
      numberOfPanelists,
      numberOfTimepoints,
      inclusionCriteria: studyType === 'in_vivo'
        ? ['Âge 18-65 ans', 'Peau saine', 'Pas d\'allergie connue aux produits cosmétiques']
        : ['Échantillons de tissus frais', 'Type de peau standardisé', 'Pas de contamination'],
      exclusionCriteria: studyType === 'in_vivo'
        ? ['Femmes enceintes/allaitantes', 'Affections cutanées actives', 'Procédures cosmétiques récentes']
        : ['Tissu endommagé', 'Échantillons contaminés'],
      skinTypes: studyType === 'in_vivo'
        ? ['Fitzpatrick Type II', 'Fitzpatrick Type III', 'Fitzpatrick Type IV']
        : ['Fitzpatrick Type II-IV'],
      studyDuration: studyType === 'in_vivo' ? '8 semaines' : '2 semaines',
      objectives,
      methodology: studyType === 'in_vivo'
        ? 'Essai clinique en double aveugle contrôlé par placebo'
        : 'Tests ex vivo contrôlés sur échantillons de tissus',
      expectedOutcomes: ['Données d\'efficacité', 'Évaluation de la sécurité', 'Rapport d\'analyse statistique'],
    },
    recommendedServices,
    notes: 'Note: Analyse IA basée sur le contenu de l\'email. Pour des recommandations plus précises, configurez la clé API OpenAI.',
    estimatedTimeline: '12-16 semaines du début de l\'étude au rapport final',
  };
}
