# ECOGIES - Application Courtier Énergie

## 🚀 Déploiement rapide sur Render.com

### Étapes de déploiement (5 minutes)

1. **Créer un compte sur [Render.com](https://render.com)**

2. **Connecter votre GitHub**
   - New > Web Service
   - Connect GitHub repository

3. **Configuration automatique**
   - Render détecte automatiquement Node.js
   - Build Command: `npm install`
   - Start Command: `node server.js`

4. **Variables d'environnement**
   Dans Render Dashboard > Environment :
   ```
   OPENAI_API_KEY=votre_clé_openai
   JWT_SECRET=une_clé_secrète_forte
   PORT=10000
   ```

5. **Déployer**
   - Click "Create Web Service"
   - Attendre 2-3 minutes
   - Votre app est sur : `https://votre-app.onrender.com`

## 🔐 Connexion Admin

**Email:** admin@ecogies.fr  
**Mot de passe:** Admin2024!

⚠️ **IMPORTANT:** Changez ce mot de passe après la première connexion !

## 📋 Fonctionnalités

### Admin peut :
- ✅ Créer/supprimer des vendeurs
- ✅ Voir les MEC en attente
- ✅ Reprendre et finaliser les MEC
- ✅ Générer MEC officielle et envoyer email

### Vendeur peut :
- ✅ Upload factures et extraction
- ✅ Saisir volumes et prix
- ✅ Générer PDF comparatif
- ✅ Faire signer RGPD
- ❌ NE PEUT PAS générer MEC finale
- ❌ NE PEUT PAS envoyer email client

## 🛠️ Structure du projet

```
courtier-energie/
├── server.js           # Serveur avec API auth
├── public/
│   ├── index.html      # App principale
│   ├── login.html      # Page connexion
│   └── admin-panel.html # Gestion admin
├── data/
│   ├── users.json      # Base utilisateurs
│   └── notifications.json # MEC en attente
└── package.json
```

## 📊 Workflow

1. Admin crée vendeur
2. Vendeur travaille jusqu'au comparatif + RGPD
3. Vendeur envoie notification "MEC en attente"
4. Admin reprend et finalise (MEC + email)

## 🔧 Maintenance

- Les données sont dans `/data/*.json`
- Logs disponibles dans Render Dashboard
- Redémarrage automatique si crash

## 📞 Support

Pour toute question : admin@ecogies.fr