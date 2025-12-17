╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║           APPLICATION GREDECO QUOTATION - PACKAGE DE DEPLOIEMENT      ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

📦 CONTENU DE CE DOSSIER
═══════════════════════════════════════════════════════════════════════

✓ web.config           → Configuration pour serveur IIS (Windows)
✓ .htaccess            → Configuration pour serveur Apache (Linux/Windows)
✓ GUIDE_DEPLOIEMENT.md → Guide complet de déploiement (LIRE EN PREMIER)


🚀 DEPLOIEMENT RAPIDE
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│  IMPORTANT : Vous devez d'abord compiler l'application !            │
│                                                                      │
│  Dans le dossier racine du projet, exécutez :                       │
│  $ npm install                                                       │
│  $ npm run build                                                     │
│                                                                      │
│  Cela créera le dossier "dist/" avec tous les fichiers nécessaires │
└─────────────────────────────────────────────────────────────────────┘


OPTION 1 : SERVEUR IIS (Windows)
─────────────────────────────────────────────────────────────────────

1. Copiez tout le contenu de dist/ vers votre serveur
2. Copiez le fichier web.config dans le même dossier
3. Créez un site dans IIS pointant vers ce dossier
4. Installez le module URL Rewrite si nécessaire :
   https://www.iis.net/downloads/microsoft/url-rewrite


OPTION 2 : SERVEUR APACHE (Linux/Windows)
─────────────────────────────────────────────────────────────────────

1. Copiez tout le contenu de dist/ vers /var/www/html/gredeco/
2. Copiez le fichier .htaccess dans le même dossier
3. Activez mod_rewrite :
   $ sudo a2enmod rewrite
   $ sudo systemctl restart apache2


OPTION 3 : DEPLOIEMENT CLOUD (Le plus simple)
─────────────────────────────────────────────────────────────────────

🌐 NETLIFY (Recommandé - Gratuit)
   → https://app.netlify.com/drop
   → Glissez-déposez le dossier dist/
   → En ligne en 30 secondes !

🌐 VERCEL (Gratuit)
   $ npm i -g vercel
   $ vercel

🌐 GITHUB PAGES (Gratuit)
   → Poussez sur GitHub
   → Settings → Pages → Source: dist/


📋 FICHIERS NECESSAIRES
═══════════════════════════════════════════════════════════════════════

Après "npm run build", vous aurez :

dist/
├── index.html          → Page principale
├── assets/
│   ├── *.js            → Code JavaScript compilé
│   └── *.css           → Styles compilés
└── public/
    ├── logo.svg        → Logo Gredeco
    └── ...             → Autres ressources

+ web.config (pour IIS)
OU
+ .htaccess (pour Apache)


🔒 SECURITE
═══════════════════════════════════════════════════════════════════════

✓ Base de données Supabase déjà configurée
✓ Clés API intégrées dans le build (sécurisées pour usage client)
✓ Politiques de sécurité RLS actives dans Supabase

OBLIGATOIRE EN PRODUCTION :
→ Configurez HTTPS (certificat SSL)
→ Utilisez un pare-feu
→ Mettez à jour régulièrement votre serveur


📖 DOCUMENTATION COMPLETE
═══════════════════════════════════════════════════════════════════════

Pour des instructions détaillées, consultez :
→ GUIDE_DEPLOIEMENT.md (dans ce dossier)


❓ BESOIN D'AIDE ?
═══════════════════════════════════════════════════════════════════════

Documentation Supabase : https://supabase.com/docs
Documentation IIS      : https://docs.microsoft.com/iis
Documentation Apache   : https://httpd.apache.org/docs/


═══════════════════════════════════════════════════════════════════════
Version : 1.0
Date    : 2025-11-18
═══════════════════════════════════════════════════════════════════════
