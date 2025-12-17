# 📦 PACKAGE DE DÉPLOIEMENT - GREDECO QUOTATION

## 📋 TOUS LES FICHIERS À COPIER

---

### 1️⃣ web.config (Pour serveur IIS - Windows)

Créez un fichier nommé `web.config` et copiez-y ce contenu :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
      <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
  </system.webServer>
</configuration>
```

---

### 2️⃣ .htaccess (Pour serveur Apache - Linux)

Créez un fichier nommé `.htaccess` (avec le point devant) :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

---

## 🚀 GUIDE DE DÉPLOIEMENT

### ⚠️ ÉTAPE 1 : COMPILER L'APPLICATION

**OBLIGATOIRE avant tout déploiement :**

```bash
npm install
npm run build
```

Cela crée le dossier `dist/` avec l'application compilée.

---

### 🌐 OPTION A : Serveur IIS (Windows)

1. Copiez tout le contenu de `dist/` vers votre serveur
2. Copiez le fichier `web.config` dans le même dossier
3. Dans IIS Manager :
   - Créez un nouveau site
   - Pointez vers le dossier
   - Port 80 (ou 443 pour HTTPS)
4. Installez le module URL Rewrite si nécessaire

---

### 🌐 OPTION B : Serveur Apache (Linux)

```bash
# Activer les modules
sudo a2enmod rewrite deflate expires headers
sudo systemctl restart apache2

# Copier les fichiers
sudo mkdir -p /var/www/html/gredeco
sudo cp -r dist/* /var/www/html/gredeco/
sudo cp .htaccess /var/www/html/gredeco/
sudo chown -R www-data:www-data /var/www/html/gredeco

# Créer le Virtual Host
sudo nano /etc/apache2/sites-available/gredeco.conf
```

Contenu du fichier de configuration :
```apache
<VirtualHost *:80>
    ServerName votre-domaine.com
    DocumentRoot /var/www/html/gredeco
    <Directory /var/www/html/gredeco>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
# Activer le site
sudo a2ensite gredeco.conf
sudo systemctl reload apache2
```

---

### ☁️ OPTION C : Déploiement Cloud (LE PLUS SIMPLE)

**Netlify (Gratuit - Recommandé) :**
1. Allez sur https://app.netlify.com/drop
2. Glissez-déposez le dossier `dist/`
3. Votre site est en ligne !

**Vercel :**
```bash
npm i -g vercel
vercel
```

---

## ✅ Vérifications Post-Déploiement

- [ ] L'application se charge
- [ ] Le logo apparaît
- [ ] Vous pouvez créer un devis
- [ ] Les données sont sauvegardées
- [ ] Les PDF se génèrent
- [ ] HTTPS est actif

---

## 🔧 Problèmes Courants

**Erreur 404 sur les routes ?**
- IIS : Installez URL Rewrite
- Apache : Activez mod_rewrite

**Erreur Supabase ?**
- Vérifiez votre connexion internet
- Connectez-vous à https://app.supabase.com

---

## 📞 Aide

- Supabase : https://supabase.com/docs
- IIS : https://docs.microsoft.com/iis
- Apache : https://httpd.apache.org/docs/

Version 1.0 - 2025-11-18
