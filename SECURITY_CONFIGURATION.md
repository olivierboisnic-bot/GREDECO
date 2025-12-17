# Configuration de Sécurité Supabase

Ce document décrit les configurations de sécurité qui doivent être appliquées manuellement via le Dashboard Supabase.

## ✅ Corrections Appliquées Automatiquement

Les problèmes suivants ont été corrigés via les migrations SQL :

### 1. Index de Clés Étrangères
- ✅ **Index `idx_quotation_items_quotation_id`** : Couvre la clé étrangère `quotation_items_quotation_id_fkey`
- ✅ **Index `idx_quotation_items_service_id`** : Couvre la clé étrangère `quotation_items_service_id_fkey`

### 2. Index Inutilisés Supprimés
- ✅ **`idx_quotations_status`** : Index supprimé (non utilisé par les requêtes)
- ✅ **`idx_customers_company`** : Index supprimé (non utilisé par les requêtes)

## ⚠️ Configuration Manuelle Requise

### Protection des Mots de Passe Compromis

**Problème** : Supabase Auth peut vérifier si les mots de passe ont été compromis en utilisant l'API HaveIBeenPwned.org, mais cette fonctionnalité est actuellement désactivée.

**Solution** : Activer cette protection via le Dashboard Supabase

#### Instructions Étape par Étape :

1. **Accéder au Dashboard Supabase**
   - Rendez-vous sur https://supabase.com/dashboard
   - Connectez-vous à votre compte
   - Sélectionnez votre projet

2. **Naviguer vers les Paramètres d'Authentification**
   - Dans le menu latéral, cliquez sur **"Authentication"**
   - Cliquez sur **"Policies"** ou **"Settings"**

3. **Activer la Protection des Mots de Passe**
   - Cherchez l'option **"Password Protection"** ou **"Security"**
   - Activez **"Check for breached passwords"** ou **"Enable HaveIBeenPwned integration"**
   - Cette option vérifie les mots de passe contre la base de données HaveIBeenPwned

4. **Configuration Recommandée**
   ```
   ✅ Enable breached password detection
   ✅ Block passwords found in breaches
   ✅ Require strong passwords (min 8 caractères)
   ```

#### Pourquoi Cette Configuration Est Importante ?

- **Sécurité Renforcée** : Empêche les utilisateurs d'utiliser des mots de passe déjà compromis
- **Protection Contre les Attaques** : Réduit le risque d'attaques par credential stuffing
- **Conformité** : Respecte les meilleures pratiques de sécurité recommandées par l'OWASP
- **Confidentialité** : HaveIBeenPwned utilise le k-anonymity model - votre mot de passe n'est jamais envoyé en clair

#### Vérification

Après activation, testez en créant un compte avec un mot de passe connu pour être compromis (ex: "Password123"). Le système devrait rejeter ce mot de passe.

## 📊 Résumé des Améliorations

| Problème | Statut | Action |
|----------|--------|--------|
| Index de clés étrangères manquants | ✅ Résolu | Migration SQL appliquée |
| Index inutilisés (performance) | ✅ Résolu | Migration SQL appliquée |
| Protection mots de passe compromis | ⚠️ Action requise | Configuration Dashboard manuelle |

## 🔗 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
