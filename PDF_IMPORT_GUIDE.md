# Guide d'Import de Devis PDF

## Vue d'ensemble

Cette fonctionnalité permet d'importer un devis existant au format PDF et de recréer automatiquement le devis dans le système avec les informations principales extraites.

## Comment utiliser l'import PDF

### 1. Accéder à la fonctionnalité

1. Allez dans l'onglet **"Historique des Devis"**
2. Cliquez sur le bouton **"Importer PDF"** en haut à droite

### 2. Sélectionner un fichier PDF

1. Cliquez sur **"Choisir un fichier PDF"**
2. Sélectionnez un PDF de devis existant depuis votre ordinateur
3. Le système va automatiquement :
   - Lire le contenu du PDF
   - Extraire les informations textuelles
   - Analyser et parser les données

### 3. Vérifier les données extraites

Le système affiche toutes les informations détectées dans le PDF :

#### Informations Client
- **Numéro de devis** : Le numéro du devis original
- **Nom du client** : Nom du client ou contact
- **Email** : Adresse email du client
- **Société** : Nom de la société du client

#### Informations Générales
- **Date** : Date de création du devis
- **Valide jusqu'au** : Date de validité du devis
- **Type d'étude** : Clinique ou Laboratoire

#### Paramètres de l'étude
- **Nombre de panélistes** : Nombre de participants
- **Nombre de temps de mesure** : Nombre de visites/temps
- **Produit testé** : Description du produit
- **Objectifs d'étude** : Liste des objectifs

### 4. Créer le devis

1. Vérifiez que les informations essentielles sont présentes (au minimum : nom et email du client)
2. Cliquez sur **"Créer le Devis"**
3. Le devis sera créé dans le système avec le statut "Brouillon"

## Informations extraites automatiquement

Le système utilise des expressions régulières pour détecter les informations suivantes dans le PDF :

| Information | Patterns détectés |
|-------------|-------------------|
| **Numéro de devis** | "Devis N°", "Quotation #", etc. |
| **Client** | "Client:", "Customer:", etc. |
| **Email** | Format email standard (xxx@xxx.xxx) |
| **Société** | "Société:", "Company:", "Entreprise:", etc. |
| **Date** | "Date:", "Le:" suivi d'une date (JJ/MM/AAAA) |
| **Validité** | "Valide jusqu'au:", "Valid until:", etc. |
| **Panélistes** | "Nombre de panélistes:", "Number of panelists:", etc. |
| **Temps** | "Nombre de temps:", "Number of timepoints:", etc. |
| **Type d'étude** | "Type d'étude:", "Study type:" (Clinique/Laboratoire) |
| **Produit** | "Produit testé:", "Product tested:", etc. |
| **Objectifs** | "Objectifs d'étude:", "Study objectives:", etc. |
| **Remise globale** | "Remise globale:", "Global discount:", etc. |
| **Langue** | Détection automatique FR/EN selon les mots-clés |

## Limitations importantes

### Services non importés

**IMPORTANT :** Les services et lignes de devis ne sont **pas** importés automatiquement depuis le PDF.

Raison : La structure des tableaux dans les PDF est complexe et variable, rendant l'extraction fiable des services difficile.

**Solution :** Après avoir créé le devis :
1. Cliquez sur le bouton "Modifier" du devis nouvellement créé
2. Ajoutez manuellement les services depuis l'interface de modification
3. Le calcul automatique des quantités et prix se fera comme d'habitude

### Données manquantes

Si certaines informations ne sont pas détectées dans le PDF :
- Elles apparaîtront comme "Non trouvé" dans l'aperçu
- Vous pourrez les ajouter manuellement après la création du devis en cliquant sur "Modifier"

### Format du PDF

Pour de meilleurs résultats, le PDF doit :
- Être un PDF textuel (non scanné/image)
- Contenir du texte sélectionnable
- Suivre une structure claire avec des labels identifiables

## Cas d'usage

### Import réussi

```
✓ PDF contenant du texte clair
✓ Labels standards présents (Client:, Date:, etc.)
✓ Informations structurées
✓ Format de date reconnu (JJ/MM/AAAA)
→ Import réussi avec la plupart des données
```

### Import partiel

```
⚠ PDF avec structure non standard
⚠ Certains labels manquants
⚠ Formats de date différents
→ Import partiel, compléter manuellement après création
```

### Import échoué

```
✗ PDF scanné (image)
✗ PDF protégé/chiffré
✗ Fichier corrompu
→ Erreur lors de la lecture du PDF
```

## Après l'import

Une fois le devis créé :

1. **Vérification** : Le devis apparaît dans l'historique avec le statut "Brouillon"
2. **Modification** : Cliquez sur "Modifier" pour :
   - Corriger les informations si nécessaire
   - Ajouter les services manuellement
   - Ajuster les paramètres
3. **Finalisation** : Une fois les services ajoutés et vérifié :
   - Générez le PDF final
   - Changez le statut en "Envoyé"

## Conseils pour de meilleurs résultats

### 1. Utilisez des PDFs générés par votre système
Les PDFs générés par l'application ont une structure optimale pour la réimportation.

### 2. Vérifiez toujours les données
Même si l'import semble réussi, vérifiez toujours :
- Le nom et l'email du client
- Les dates (création et validité)
- Les nombres (panélistes, temps)

### 3. Complétez les informations manquantes
Si des informations importantes sont marquées "Non trouvé" :
- Notez-les avant de créer le devis
- Éditez le devis immédiatement après la création
- Ajoutez les informations manquantes

### 4. Ajoutez les services manuellement
L'ajout manuel des services vous permet de :
- Vérifier chaque service
- Ajuster les quantités si nécessaire
- Bénéficier du calcul automatique des prix

## Débogage

### Le bouton "Créer le Devis" est grisé

**Cause :** Les informations minimales requises sont manquantes.

**Requis :**
- Nom du client (obligatoire)
- Email du client (obligatoire)

**Solution :** Si ces informations ne sont pas détectées, vous devrez les ajouter manuellement après avoir créé un devis vide ou créer le devis manuellement via le formulaire standard.

### L'import prend beaucoup de temps

**Cause :** PDF volumineux avec beaucoup de pages.

**Solution :** Patientez pendant la lecture. L'import peut prendre de quelques secondes à une minute selon la taille du PDF.

### Erreur "Le fichier doit être un PDF"

**Cause :** Le fichier sélectionné n'est pas un PDF valide.

**Solution :** Assurez-vous que le fichier a l'extension .pdf et est bien un document PDF.

### Les dates ne sont pas détectées

**Cause :** Format de date non reconnu.

**Formats reconnus :**
- JJ/MM/AAAA (01/01/2024)
- JJ-MM-AAAA (01-01-2024)
- JJ/MM/AA (01/01/24)

**Solution :** Si vos dates ont un autre format, elles ne seront pas détectées automatiquement. Vous devrez les ajouter manuellement après la création.

## Sécurité et confidentialité

- Les PDFs sont traités **localement** dans votre navigateur
- Aucun fichier n'est envoyé à un serveur externe
- Les données extraites sont stockées dans votre base Supabase
- La bibliothèque PDF.js est chargée depuis un CDN de confiance (cdnjs.cloudflare.com)

## Support

Pour toute question ou problème avec l'import PDF :
1. Vérifiez que votre PDF est bien textuel (non scanné)
2. Essayez avec un PDF de test simple
3. Consultez les messages d'erreur affichés
4. En cas d'échec persistant, créez le devis manuellement via le formulaire standard
