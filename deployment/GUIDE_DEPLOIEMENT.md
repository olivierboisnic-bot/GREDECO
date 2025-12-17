# Guide de Déploiement - Application Gredeco Quotation

## 📦 Contenu du Package

Votre application est prête à être déployée. Vous aurez besoin de :
- Le dossier **`dist/`** (contient tous les fichiers de l'application compilée)
- Le fichier **`web.config`** (pour IIS) OU **`.htaccess`** (pour Apache)
- Les variables d'environnement Supabase (déjà intégrées dans le build)

---

## 🚀 Option 1 : Déploiement sur Serveur IIS (Windows)

### Prérequis
- Windows Server avec IIS installé
- Module URL Rewrite installé ([télécharger ici](https://www.iis.net/downloads/microsoft/url-rewrite))

### Étapes

1. **Préparer les fichiers**
   ```
   - Copiez tout le contenu du dossier dist/
   - Copiez le fichier web.config dans le même dossier
   ```

2. **Créer un site dans IIS**
   - Ouvrez le Gestionnaire IIS
   - Clic droit sur "Sites" → "Ajouter un site Web"
   - Nom du site : `Gredeco-Quotation`
   - Chemin physique : pointez vers le dossier contenant vos fichiers
   - Port : 80 (ou 443 pour HTTPS)

3. **Configurer le pool d'applications**
   - Version du .NET CLR : "Aucun code managé"
   - Mode pipeline : "Intégré"

4. **Vérifier les permissions**
   - Le compte `IIS_IUSRS` doit avoir les droits de lecture sur le dossier

5. **Activer HTTPS (recommandé)**
   - Dans IIS, ajoutez une liaison HTTPS
   - Associez un certificat SSL valide

6. **Tester**
   - Accédez à `http://votre-serveur/` ou `https://votre-serveur/`

---

## 🚀 Option 2 : Déploiement sur Serveur Apache (Linux/Windows)

### Prérequis
- Serveur Apache 2.4+
- Module `mod_rewrite` activé

### Étapes

1. **Activer les modules nécessaires**
   ```bash
   sudo a2enmod rewrite
   sudo a2enmod deflate
   sudo a2enmod expires
   sudo a2enmod headers
   sudo systemctl restart apache2
   ```

2. **Copier les fichiers**
   ```bash
   # Exemple pour /var/www/html/gredeco
   sudo mkdir -p /var/www/html/gredeco
   sudo cp -r dist/* /var/www/html/gredeco/
   sudo cp deployment/.htaccess /var/www/html/gredeco/
   sudo chown -R www-data:www-data /var/www/html/gredeco
   ```

3. **Créer un Virtual Host**
   ```bash
   sudo nano /etc/apache2/sites-available/gredeco.conf
   ```

   Contenu :
   ```apache
   <VirtualHost *:80>
       ServerName votre-domaine.com
       DocumentRoot /var/www/html/gredeco

       <Directory /var/www/html/gredeco>
           Options Indexes FollowSymLinks
           AllowOverride All
           Require all granted
       </Directory>

       ErrorLog ${APACHE_LOG_DIR}/gredeco-error.log
       CustomLog ${APACHE_LOG_DIR}/gredeco-access.log combined
   </VirtualHost>
   ```

4. **Activer le site**
   ```bash
   sudo a2ensite gredeco.conf
   sudo systemctl reload apache2
   ```

5. **Configurer HTTPS avec Let's Encrypt (recommandé)**
   ```bash
   sudo apt install certbot python3-certbot-apache
   sudo certbot --apache -d votre-domaine.com
   ```

---

## 🚀 Option 3 : Déploiement sur Nginx

### Configuration Nginx

Créez un fichier de configuration :
```bash
sudo nano /etc/nginx/sites-available/gredeco
```

Contenu :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    root /var/www/html/gredeco;
    index index.html;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Routage SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Activer le site :
```bash
sudo ln -s /etc/nginx/sites-available/gredeco /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🌐 Option 4 : Déploiement Cloud (Simple et Rapide)

### A. Netlify (Recommandé - Gratuit)
1. Allez sur https://app.netlify.com
2. Glissez-déposez le dossier `dist/`
3. Votre site est en ligne en quelques secondes !

### B. Vercel (Gratuit)
1. Installez Vercel CLI : `npm i -g vercel`
2. Dans le dossier du projet : `vercel`
3. Suivez les instructions

### C. GitHub Pages (Gratuit)
1. Créez un repo GitHub
2. Poussez votre code
3. Allez dans Settings → Pages
4. Sélectionnez la branche et le dossier `/dist`

---

## 🔒 Configuration de la Base de Données Supabase

### Variables d'environnement déjà configurées
Les variables suivantes sont déjà intégrées dans le build :
- `VITE_SUPABASE_URL` : URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` : Clé publique Supabase

**Important :** Ces clés sont sécurisées pour une utilisation côté client. La sécurité des données est assurée par les politiques RLS (Row Level Security) configurées dans Supabase.

### Vérifier la configuration Supabase
1. Connectez-vous à https://app.supabase.com
2. Vérifiez que votre projet est actif
3. Assurez-vous que les tables et politiques RLS sont en place

---

## ✅ Checklist Post-Déploiement

- [ ] L'application se charge correctement
- [ ] Le logo Gredeco s'affiche
- [ ] Vous pouvez créer un devis
- [ ] Les données sont sauvegardées dans Supabase
- [ ] Les PDF sont générés correctement
- [ ] HTTPS est configuré (obligatoire en production)
- [ ] Les performances sont bonnes (temps de chargement < 3s)

---

## 🔧 Dépannage

### Erreur 404 sur les routes
- **IIS :** Vérifiez que le module URL Rewrite est installé
- **Apache :** Vérifiez que `mod_rewrite` est activé et que `AllowOverride All` est défini
- **Nginx :** Vérifiez la directive `try_files`

### Erreur de connexion Supabase
- Vérifiez que les variables d'environnement sont correctes
- Testez la connexion depuis https://app.supabase.com
- Vérifiez que l'URL du projet est accessible

### Performance lente
- Activez la compression GZIP
- Configurez le cache navigateur
- Utilisez un CDN si nécessaire
- Activez HTTPS/2

---

## 📞 Support

Pour toute question :
- Documentation Supabase : https://supabase.com/docs
- Documentation IIS : https://docs.microsoft.com/iis
- Documentation Apache : https://httpd.apache.org/docs/

---

## 🔐 Sécurité en Production

**À FAIRE ABSOLUMENT :**
1. ✅ Configurer HTTPS avec un certificat SSL valide
2. ✅ Utiliser des mots de passe forts pour l'accès au serveur
3. ✅ Mettre à jour régulièrement le serveur web
4. ✅ Configurer un pare-feu (firewall)
5. ✅ Activer les logs et la surveillance

**IMPORTANT :** La clé `VITE_SUPABASE_ANON_KEY` est publique et sécurisée pour une utilisation client. Ne partagez JAMAIS votre `SUPABASE_SERVICE_ROLE_KEY` (non utilisée dans cette application).

---

## 📝 Notes

- L'application est une SPA (Single Page Application) React
- Tous les fichiers sont statiques (HTML, CSS, JS)
- Aucune base de données locale n'est nécessaire
- La base de données est hébergée sur Supabase Cloud
- Les fichiers sont optimisés et minifiés pour la production
