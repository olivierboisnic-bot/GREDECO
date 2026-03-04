# Guide d'Import Excel - Multiplicateurs de Quantité

## Vue d'ensemble

Ce guide explique comment importer des services depuis un fichier Excel et comment le système détecte automatiquement les multiplicateurs de quantité.

## Structure du fichier Excel

Le fichier Excel doit contenir les colonnes suivantes :

| Colonne | Description | Exemple |
|---------|-------------|---------|
| **Langues** | Code de langue (FR, EN, etc.) | FR |
| **Type d etudes** | Type d'étude (Clinique ou Laboratoire) | Clinique |
| **Nom du service** | Nom du service | Recrutement de panélistes |
| **Appareil** | Description de l'appareil ou du service | Description du service |
| **Prix unitaire** | Prix HT en euros | 100.00 |
| **TVA** | Taux de TVA en pourcentage | 20% |
| **Mandatory Type** | Type d'obligation | Mandatory Clinical |
| **Multiplicateur de Quantité** | Type de multiplicateur (voir ci-dessous) | Multiplié par nombre de panélistes/peau |

## Types de Multiplicateurs

Le système détecte automatiquement le type de multiplicateur en fonction du texte dans la colonne "Multiplicateur de Quantité" :

### 1. Quantité Fixe (none)
**Textes détectés :**
- "Quantité fixe (aucun multiplicateur)"
- "Quantité fixe"
- "Fixe"
- "Aucun"
- Cellule vide

**Utilisation :** Services qui ne dépendent ni du nombre de panélistes ni du nombre de temps de mesure.

**Exemples :**
- Matériel clinique
- Achat de kit
- Frais fixes

### 2. Multiplié par Panélistes/Peau (panelists)
**Textes détectés :**
- "Multiplié par nombre de panélistes/peau"
- "Panélistes"
- "Panelists"
- Textes contenant "panelist" ou "panéliste" SANS "×" ni "temps"

**Utilisation :** Services facturés une fois par panéliste, quel que soit le nombre de temps de mesure.

**Exemples :**
- Recrutement de panélistes
- Indemnisation des panélistes
- Consultation dermatologique

### 3. Multiplié par Temps de Mesure (timepoints)
**Textes détectés :**
- "Multiplié par nombre de temps de mesure"
- "Temps de mesure"
- "Timepoint"
- Textes contenant "temps de mesure" ou "timepoint" SANS "×" ni "panelist"

**Utilisation :** Services facturés à chaque temps de mesure, indépendamment du nombre de panélistes.

**Exemples :**
- Calibration d'équipement
- Préparation de matériel par session

### 4. Multiplié par Panélistes × Temps (both)
**Textes détectés :**
- "Panélistes/Peau_condition × Temps de mesure"
- "Panelistes/Peau_condition × Temps de mesure"
- Tout texte contenant "×" ET "peau" ET "temps"
- Tout texte contenant "×" ET "panelist" ET "temps"

**Utilisation :** Services facturés pour chaque combinaison panéliste × temps de mesure.

**Exemples :**
- Mesures instrumentales (Cutomètre, Chromamètre, etc.)
- Photographies par panéliste et par visite
- Scores cliniques répétés

### 5. Multiplié par Peau et Condition uniquement (skin_and_condition)
**Textes détectés :**
- "Multiplié par peau et condition only (excluant timepoint)"
- Textes contenant "peau et condition" ET ("excluant" OU "only")

**Utilisation :** Services facturés par type de peau et condition testée, sans multiplication par le nombre de temps de mesure.

**Exemples :**
- Culture cellulaire sur différents types de peau
- Tests ex vivo par condition

## Exemples Complets

### Exemple 1 : Service à quantité fixe
```
Langues: FR
Type d etudes: Clinique
Nom du service: Gestion de l'étude (synopsis, cahier d'observation)
Appareil: Administratif
Prix unitaire: 1000.00
TVA: 20%
Mandatory Type: Mandatory Clinical
Multiplicateur de Quantité: Quantité fixe (aucun multiplicateur)
```
**Résultat :** `multiplier_type = 'none'`

### Exemple 2 : Service multiplié par panélistes
```
Langues: FR
Type d etudes: Clinique
Nom du service: Indemnisation des panélistes
Appareil: Administratif
Prix unitaire: 25.00
TVA: 20%
Mandatory Type: Optional
Multiplicateur de Quantité: Multiplié par nombre de panélistes/peau
```
**Résultat :** `multiplier_type = 'panelists'`

### Exemple 3 : Service multiplié par panélistes × temps
```
Langues: EN
Type d etudes: Clinique
Nom du service: Cutometer MP 580: measurement of skin elasticity
Appareil: Cutometer
Prix unitaire: 35.00
TVA: 20%
Mandatory Type: Optional
Multiplicateur de Quantité: Panélistes/Peau_condition × Temps de mesure
```
**Résultat :** `multiplier_type = 'both'`

### Exemple 4 : Service multiplié par peau et condition
```
Langues: FR
Type d etudes: Laboratoire
Nom du service: Culture cellulaire (par type de cellules primaires)
Appareil: Culture
Prix unitaire: 60.00
TVA: 20%
Mandatory Type: Optional
Multiplicateur de Quantité: Multiplié par peau et condition only (excluant timepoint)
```
**Résultat :** `multiplier_type = 'skin_and_condition'`

## Débogage

Lors de l'import, le système affiche dans la console du navigateur (F12) des informations de débogage pour la première ligne importée :

```
Exemple de détection multiplicateur:
  Texte original: Panélistes/Peau_condition × Temps de mesure
  Texte en minuscules: panélistes/peau_condition × temps de mesure
  Type détecté: both
  isFixedQuantity: false
  hasSkinAndCondition: false
  hasBoth: true
  hasPanelistsOnly: false
  hasTimepointsOnly: false
```

## Vérification après Import

Après l'import, vous pouvez vérifier que les multiplicateurs ont été correctement détectés :

1. Ouvrez la page "Services & Tarifs"
2. Vérifiez les badges colorés affichés pour chaque service :
   - **Badge bleu** "× Panélistes/Peau" : multiplier_type = 'panelists'
   - **Badge bleu** "× Temps" : multiplier_type = 'timepoints'
   - **Badge bleu** "× Panélistes/Peau_condition × Temps" : multiplier_type = 'both'
   - **Badge bleu** "× Peau et Condition (sans Temps)" : multiplier_type = 'skin_and_condition'
   - **Pas de badge** : multiplier_type = 'none'

## Résolution de Problèmes

### Le multiplicateur n'est pas détecté
**Solution :** Vérifiez que le texte dans la colonne "Multiplicateur de Quantité" correspond exactement à l'un des formats reconnus.

### Tous les services ont "Quantité fixe"
**Solution :** Assurez-vous que la colonne "Multiplicateur de Quantité" existe et contient des valeurs. Vérifiez l'orthographe des colonnes.

### Les accents causent des problèmes
**Solution :** Le système gère les accents. Assurez-vous que votre fichier Excel est bien encodé en UTF-8.

## Export Excel

Pour obtenir un modèle Excel avec les bons formats :

1. Cliquez sur "Exporter les Services" dans la page "Services & Tarifs"
2. Le fichier exporté contiendra tous les services actuels avec les formats corrects
3. Utilisez ce fichier comme modèle pour vos imports futurs

## Notes Importantes

- L'import **efface toutes les données existantes** (services, devis, etc.)
- Une confirmation est demandée avant l'import
- Les lignes avec des données invalides sont ignorées et comptées dans le rapport d'import
- Le système affiche le nombre de services importés et le nombre de lignes ignorées
