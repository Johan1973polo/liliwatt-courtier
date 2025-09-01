# 🚀 Guide d'installation Firebase pour ECOGIES

Ce guide vous aidera à configurer Firebase pour faire fonctionner le système d'authentification sur Netlify.

## 📋 Étapes d'installation

### 1. Créer un projet Firebase (5 minutes)

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Cliquez sur **"Créer un projet"**
3. Nommez-le : `ecogies-energy`
4. Désactivez Google Analytics (pas nécessaire)
5. Cliquez sur **"Créer le projet"**

### 2. Activer l'authentification

1. Dans le menu gauche, cliquez sur **"Authentication"**
2. Cliquez sur **"Commencer"**
3. Onglet **"Sign-in method"**
4. Activez **"Adresse e-mail/Mot de passe"**
5. Cliquez sur **"Enregistrer"**

### 3. Créer le compte administrateur

1. Toujours dans Authentication
2. Onglet **"Users"**
3. Cliquez sur **"Ajouter un utilisateur"**
4. Email : `admin@ecogies.fr`
5. Mot de passe : Choisissez un mot de passe fort
6. Cliquez sur **"Ajouter"**

### 4. Configurer Firestore Database

1. Menu gauche → **"Firestore Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez **"Mode production"**
4. Sélectionnez la région : **"eur3 (europe-west)"**
5. Cliquez sur **"Créer"**

### 5. Configurer les règles de sécurité Firestore

1. Dans Firestore, onglet **"Règles"**
2. Remplacez le contenu par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Les admins peuvent tout faire
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Les vendeurs peuvent créer des notifications
    match /notifications/{notification} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
        (resource.data.vendeurId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Les utilisateurs peuvent lire leur propre profil
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Cliquez sur **"Publier"**

### 6. Créer les collections initiales

1. Dans Firestore, cliquez sur **"Démarrer une collection"**
2. ID de collection : `users`
3. Pour le premier document :
   - ID : Cliquez sur **"ID automatique"**
   - Champs :
     - `email` (string) : `admin@ecogies.fr`
     - `role` (string) : `admin`
     - `createdAt` (timestamp) : Cliquez sur l'icône horloge
4. Cliquez sur **"Enregistrer"**

5. Créez une autre collection : `notifications` (laissez-la vide)

### 7. Obtenir la configuration Firebase

1. Cliquez sur l'engrenage ⚙️ → **"Paramètres du projet"**
2. Descendez jusqu'à **"Vos applications"**
3. Cliquez sur l'icône **"</>"** (Web)
4. Nom de l'app : `ECOGIES Web`
5. Cliquez sur **"Enregistrer l'application"**
6. Copiez la configuration qui apparaît :

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 8. Mettre à jour les fichiers

1. Ouvrez `login-firebase.html`
2. Remplacez la configuration Firebase (ligne ~370) par la vôtre
3. Faites de même dans `index-firebase.html` (à créer)

### 9. Modifier index.html pour Firebase

Ajoutez au début de index.html (après la balise `<script>`) :

```javascript
// Configuration Firebase
const firebaseConfig = {
  // Votre configuration ici
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Vérifier l'authentification
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'login-firebase.html';
  } else {
    // Récupérer le rôle depuis Firestore
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        window.userRole = userData.role;
        window.currentUserEmail = user.email;
        
        // Appliquer les restrictions selon le rôle
        if (userData.role === 'vendeur') {
          // Cacher les étapes 6 et 7
          document.getElementById('step6').style.display = 'none';
          document.getElementById('step7').style.display = 'none';
        }
      }
    });
  }
});

// Fonction pour envoyer une notification MEC
async function envoyerNotificationMEC() {
  if (!extractedData) {
    alert('Veuillez d\'abord effectuer une analyse complète');
    return;
  }
  
  try {
    await db.collection('notifications').add({
      vendeurEmail: currentUserEmail,
      vendeurId: auth.currentUser.uid,
      clientName: extractedData.nom_client,
      data: {
        extractedData: extractedData,
        selectedFournisseurRef: selectedFournisseurRef,
        volumeData: volumeData,
        prixReferenceData: prixReferenceData
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ MEC envoyée à l\'administrateur pour finalisation');
  } catch (error) {
    console.error('Erreur:', error);
    alert('❌ Erreur lors de l\'envoi');
  }
}
```

## 🚀 Déploiement sur Netlify

1. **Préparez vos fichiers** :
   - `login-firebase.html` (renommez en `login.html` pour la production)
   - `index.html` (modifié avec Firebase)
   - Tous les autres fichiers

2. **Créez un dossier** avec tous les fichiers

3. **Sur Netlify** :
   - Glissez-déposez le dossier sur [Netlify Drop](https://app.netlify.com/drop)
   - Ou connectez votre repo GitHub

4. **Configuration Netlify** :
   - Ajoutez un fichier `_redirects` :
   ```
   /* /index.html 200
   ```

## ✅ Test du système

1. Allez sur votre site Netlify
2. Connectez-vous avec `admin@ecogies.fr`
3. Créez un vendeur test
4. Testez la connexion vendeur dans un autre navigateur
5. Vérifiez les restrictions d'accès

## 🔒 Sécurité importante

- **Ne partagez jamais** votre configuration Firebase publiquement
- **Changez** le mot de passe admin par défaut
- **Activez** l'authentification à deux facteurs pour l'admin
- **Surveillez** l'utilisation dans Firebase Console

## 📊 Limites gratuites Firebase

- **Authentication** : 10 000 utilisateurs/mois gratuits
- **Firestore** : 
  - 50 000 lectures/jour
  - 20 000 écritures/jour
  - 20 000 suppressions/jour
  - 1 GB stockage

Largement suffisant pour votre usage !

## 🆘 Support

En cas de problème :
1. Vérifiez la console Firebase pour les erreurs
2. Vérifiez les règles de sécurité Firestore
3. Assurez-vous que les collections existent
4. Vérifiez la configuration dans vos fichiers

---

💡 **Conseil** : Faites d'abord un test en local avant de déployer sur Netlify.