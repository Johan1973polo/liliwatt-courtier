const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { formidable } = require('formidable');
const fs = require('fs').promises;
const pdf = require('pdf-parse');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'liliwatt-secret-key-2024';

// Créer le dossier data s'il n'existe pas
const initDataFolder = async () => {
  const dataDir = path.join(__dirname, 'data');
  if (!require('fs').existsSync(dataDir)) {
    require('fs').mkdirSync(dataDir);
  }
  
  // Créer le fichier users.json avec un admin par défaut s'il n'existe pas
  const usersFile = path.join(dataDir, 'users.json');
  if (!require('fs').existsSync(usersFile)) {
    const defaultAdmin = {
      id: Date.now().toString(),
      email: 'johan.mallet@liliwatt.fr',
      password: await bcrypt.hash('Jaguar2026@', 10),
      role: 'admin',
      name: 'Johan Mallet',
      createdAt: new Date().toISOString()
    };
    
    require('fs').writeFileSync(usersFile, JSON.stringify({ users: [defaultAdmin] }, null, 2));
    console.log('✅ Admin par défaut créé: johan.mallet@liliwatt.fr / Jaguar2026@');
  }
  
  // Créer le fichier notifications.json s'il n'existe pas
  const notifsFile = path.join(dataDir, 'notifications.json');
  if (!require('fs').existsSync(notifsFile)) {
    require('fs').writeFileSync(notifsFile, JSON.stringify({ notifications: [] }, null, 2));
  }
};

// Initialiser les dossiers et fichiers
initDataFolder();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API LILIWATT - GPT-4 EXTRACTION PARFAITE!', 
    timestamp: new Date(),
    version: 'COMPLETE_V2'
  });
});

// Route principale
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 Serveur LILIWATT OPTIMISÉ</h1>
    <p>✅ GPT-4 Extraction Complète</p>
    <p>✅ Génération RGPD + PDF</p>
    <p>✅ Calculs optimisés</p>
    <a href="/interface.html">👉 Accéder à l'interface</a>
  `);
});

// Route pour traiter l'upload et l'extraction
app.post('/api/upload-and-extract', async (req, res) => {
  console.log('🔍 POST /api/upload-and-extract appelé');
  
  const form = formidable({ multiples: true, maxFileSize: 20 * 1024 * 1024 });
  
  try {
    const [fields, files] = await form.parse(req);
    const file1 = Array.isArray(files.file) ? files.file[0] : files.file;
    const file2 = Array.isArray(files.file2) ? files.file2[0] : files.file2;
    
    if (!file1) {
      return res.status(400).json({ success: false, error: 'Aucun fichier uploadé' });
    }
    
    console.log('📄 Fichier(s) reçu(s):', file1.originalFilename, file2?.originalFilename || '');
    
    // Lire le contenu du premier fichier
    let content1 = '';
    if (file1.mimetype === 'application/pdf') {
      const dataBuffer = await fs.readFile(file1.filepath);
      const data = await pdf(dataBuffer);
      content1 = data.text.substring(0, 5000); // 5000 caractères max
    } else {
      const dataBuffer = await fs.readFile(file1.filepath);
      content1 = dataBuffer.toString('utf-8').substring(0, 5000);
    }
    
    // Lire le second fichier si présent
    let content2 = '';
    if (file2) {
      if (file2.mimetype === 'application/pdf') {
        const dataBuffer = await fs.readFile(file2.filepath);
        const data = await pdf(dataBuffer);
        content2 = data.text.substring(0, 5000);
      } else {
        const dataBuffer = await fs.readFile(file2.filepath);
        content2 = dataBuffer.toString('utf-8').substring(0, 5000);
      }
    }
    
    // Combiner les contenus
    const fullContent = content2 ? 
      `=== FACTURE PÉRIODE 1 (été) ===\n${content1}\n\n=== FACTURE PÉRIODE 2 (hiver) ===\n${content2}` : 
      content1;
    
    console.log('🤖 Extraction GPT-4 ULTRA-PRÉCISE en cours...');
    console.log('📏 Taille du contenu:', fullContent.length, 'caractères');
    
    // Extraction avec GPT-4 ULTRA-OPTIMISÉ
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Tu es L'EXPERT ABSOLU en extraction de factures d'énergie françaises pour LILIWATT.
Tu DOIS extraire TOUTES les informations avec une PRÉCISION MAXIMALE !

⚠️ IMPORTANT POUR C4/C2 : Tu as 2 FACTURES (été + hiver) à analyser !
- FACTURE 1 (été) : contient HPE et HCE
- FACTURE 2 (hiver) : contient HPH et HCH
- OBLIGATOIRE : EXTRAIS LES 4 PRIX depuis les 2 factures !
- NE JAMAIS laisser un prix à 0 pour C4 !

🔍 IDENTIFICATION DU FOURNISSEUR (PRIORITÉ ABSOLUE) :
- Identifie TOUJOURS le fournisseur en premier (EDF, ENGIE, Total, ENI, Primeo, etc.)
- Si EDF → les prix sont TOUJOURS en c€/kWh, extraire directement
- Si PRIMEO → les prix sont en €/MWh, extraire tel quel
- Autres fournisseurs → GARDE L'UNITÉ D'ORIGINE sans conversion

🚨 RÈGLES CRITIQUES D'EXTRACTION :

1. SEGMENT (DÉTECTION ULTRA-PRÉCISE) :
   - Si GAZ → "GAZ"
   - Si ÉLECTRICITÉ + UN SEUL tarif visible → "C5-BASE" 
   - Si ÉLECTRICITÉ + 2 tarifs (HP/HC ou heures pleines/creuses) → "C5-HPHC"
   - Si ÉLECTRICITÉ + 4 tarifs (HPE/HCE/HPH/HCH) → "C4"
   - Si ÉLECTRICITÉ + 5 tarifs (+ POINTE) → "C2"

2. PRIX/TARIFS (EXTRACTION BRUTE SANS CONVERSION) :
   Cherche ABSOLUMENT PARTOUT ces indicateurs :
   - "prix", "tarif", "€/kWh", "c€/kWh", "centimes", "€/MWh"
   - "base", "HP", "HC", "heures pleines", "heures creuses"
   - "HPE", "HCE", "HPH", "HCH", "pointe"
   - "molécule"
   
   EXTRACTION SELON L'UNITÉ VISIBLE :
   - Si tu vois "0.1911 €/kWh" → extraire 0.1911
   - Si tu vois "19.11 c€/kWh" → extraire 19.11
   - Si tu vois "191.10 €/MWh" → extraire 191.10
   - Si tu vois "251,60 €/MWh" → extraire 251.60 (convertir virgule en point)
   - Si tu vois "25 160" ou "25160" → extraire 25160 tel quel
   - NE JAMAIS CONVERTIR, extraire la valeur brute !
   
   POUR C4 : CHERCHE dans les 2 FACTURES :
   - FACTURE ÉTÉ : HPE et HCE (OBLIGATOIRE)
   - FACTURE HIVER : HPH et HCH (OBLIGATOIRE)
   - SI UN PRIX MANQUE : Relis la facture correspondante !

3. VOLUMES/CONSOMMATIONS :
   Extrais TOUTES les consommations en kWh :
   - Pour HP/HC : volume HP et volume HC séparément
   - Pour GAZ : consommation totale en kWh ou CAR en MWh/an
   - Si en MWh, multiplie par 1000 pour avoir en kWh

4. PUISSANCE SOUSCRITE (ATTENTION PRIMEO !) :
   Pour PRIMEO spécifiquement :
   - Chercher "Puissance souscrite kVA" dans section "VOS RELEVÉS D'INDEX"
   - OU chercher "Puissance souscrite" dans tableaux de consommation
   - IGNORER ABSOLUMENT les "kVA/jour" des composantes tarifaires
   - IGNORER les calculs type "0,54 €/kVA/jour" ou "Prime fixe kVA"
   - Extraire la VRAIE puissance contractuelle (ex: 36 kVA, 42 kVA, etc.)
   
   Pour AUTRES fournisseurs :
   - Chercher "Puissance souscrite" standard
   - Valeur normale entre 6 et 1000 kVA

5. DONNÉES OBLIGATOIRES :
   - PDL (14 chiffres) ou PCE (14 chiffres pour gaz)
   - Puissance souscrite RÉELLE (pas les calculs tarifaires !)
   - Date fin contrat COMPLÈTE (format JJ/MM/AAAA, ex: 15/09/2025)
     ⚠️ IMPORTANT: Extraire la date COMPLÈTE avec jour, mois ET année !
     Si tu ne vois que le jour, cherche le mois et l'année ailleurs dans la facture
     Ne JAMAIS retourner juste "15" mais toujours "15/09/2025" par exemple
   - Type offre précis
   - Adresses COMPLÈTES

6. SIREN CLIENT (9 chiffres) :
   IGNORE ces SIREN de gestionnaires : 552081317, 444786511, 777921987
   Cherche le VRAI SIREN du client

FOUILLE CHAQUE MOT, CHAQUE LIGNE ! Sois ULTRA-AGRESSIF !

🔴 RÈGLE ABSOLUE POUR C4 :
- Tu DOIS extraire HPE et HCE de la facture été
- Tu DOIS extraire HPH et HCH de la facture hiver
- JAMAIS laisser un prix à 0 pour C4 !
- Si un prix manque, RECHERCHE ENCORE dans les 2 factures !

Format JSON EXACT :
{
  "nom_client": "",
  "siren": "",
  "pdl_pce": "",
  "segment": "",
  "fournisseur": "",
  "type_offre": "",
  "puissance_souscrite": 0,
  "date_fin_contrat": "",
  "adresse_facturation": "",
  "adresse_consommation": "",
  "prix_base_centimes": 0,
  "prix_hp_centimes": 0,
  "prix_hc_centimes": 0,
  "prix_hpe_centimes": 0,
  "prix_hce_centimes": 0,
  "prix_hph_centimes": 0,
  "prix_hch_centimes": 0,
  "prix_pointe_centimes": 0,
  "prix_molecule_eur_mwh": 0,
  "prix_abonnement_eur": 0,
  "volume_hp_kwh": 0,
  "volume_hc_kwh": 0,
  "volume_base_kwh": 0,
  "volume_total_kwh": 0,
  "iban": ""
}`
        },
        {
          role: "user",
          content: `FACTURE(S) À ANALYSER AVEC PRÉCISION MAXIMALE :
Énergie sélectionnée: ${fields.energyType}
Profil choisi: ${fields.profileType}

CONTENU COMPLET À FOUILLER :
${fullContent}

EXTRAIS ABSOLUMENT TOUT ! Trouve les prix coûte que coûte !
Si une donnée n'existe pas, mets "N/A" pour texte ou 0 pour nombres.`
        }
      ],
      temperature: 0.01,
      max_tokens: 2000
    });
    
    const responseText = completion.choices[0].message.content.trim();
    console.log('✅ Réponse GPT-4 ULTRA-PRÉCISE reçue');
    
    // Parser le JSON
    let result;
    try {
      // Nettoyer la réponse de GPT-4 qui peut contenir du texte avant/après
      let cleanedResponse = responseText;
      
      // Si la réponse contient ```json, extraire le JSON
      if (responseText.includes('```json')) {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          cleanedResponse = jsonMatch[1];
        }
      } else if (responseText.includes('```')) {
        // Si juste des backticks sans "json"
        const jsonMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          cleanedResponse = jsonMatch[1];
        }
      } else if (responseText.includes('{')) {
        // Extraire le JSON brut s'il est présent
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
      }
      
      cleanedResponse = cleanedResponse.trim();
      result = JSON.parse(cleanedResponse);
      console.log('🎯 JSON parsé avec succès:', result);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      console.error('📝 Texte reçu:', responseText);
      return res.status(500).json({ 
        success: false, 
        error: 'GPT-4 n\'a pas retourné un JSON valide',
        raw: responseText 
      });
    }
    
    // Nettoyer les fichiers temporaires
    await fs.unlink(file1.filepath);
    if (file2) await fs.unlink(file2.filepath);
    
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error('💥 Erreur complète:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.toString()
    });
  }
});

// Route pour générer le PDF RGPD
app.post('/api/generate-rgpd', async (req, res) => {
  try {
    const { clientData, extractedData } = req.body;
    
    console.log('📄 Génération RGPD PDF pour:', clientData.nom);
    
    // Ici on peut ajouter la génération PDF avec jsPDF ou autre
    // Pour l'instant, on retourne les données formatées
    
    const rgpdData = {
      success: true,
      client: clientData,
      factureData: extractedData,
      dateGeneration: new Date().toLocaleDateString('fr-FR'),
      message: 'RGPD généré avec succès'
    };
    
    res.json(rgpdData);
    
  } catch (error) {
    console.error('❌ Erreur génération RGPD:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ========== SYSTÈME D'AUTHENTIFICATION ==========

// Helper pour lire/écrire les fichiers JSON
const readJSON = async (filename) => {
  try {
    const data = await fs.readFile(path.join(__dirname, 'data', filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return filename === 'users.json' ? { users: [] } : { notifications: [] };
  }
};

const writeJSON = async (filename, data) => {
  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  await fs.writeFile(path.join(__dirname, 'data', filename), JSON.stringify(data, null, 2));
};

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Middleware pour vérifier si admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Route de connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await readJSON('users.json');
    
    let user = data.users.find(u => u.email === email);
    
    console.log('🔍 Login tentative:', email, '- user dans JSON:', !!user);
    // Si pas dans users.json, chercher dans Google Sheets (vendeurs/référents)
    if (!user && DRIVE_CREDENTIALS) {
      const sheetUser = await getVendeurFromSheets(email);
      if (sheetUser) {
        if (password === sheetUser.password) {
          // Détecter si c'est un référent (son email apparaît dans colonne G d'autres vendeurs)
          const allUsers = await getVendeursFromSheets();
          const isReferent = allUsers.some(u => u.referent_email === email);
          const mesVendeurs = isReferent ? allUsers.filter(u => u.referent_email === email).map(u => u.email) : [];
          const role = isReferent ? 'referent' : 'vendeur';
          
          const token = jwt.sign(
            { 
              id: 'user_' + Date.now(), 
              email: sheetUser.email, 
              role,
              drive_folder_id: sheetUser.drive_folder_id,
              mes_vendeurs: mesVendeurs
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          return res.json({ 
            success: true, token, 
            user: { 
              email: sheetUser.email, 
              role, 
              nom: sheetUser.prenom + ' ' + sheetUser.nom,
              mes_vendeurs: mesVendeurs
            } 
          });
        }
      }
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, drive_folder_id: user.drive_folder_id || '' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour créer un utilisateur (admin only)
app.post('/api/auth/create-user', verifyToken, isAdmin, async (req, res) => {
  try {
    const { email, password, role = 'vendeur', drive_folder_id = '' } = req.body;
    const data = await readJSON('users.json');
    
    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Cet email existe déjà' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: role === 'admin' ? `admin_${Date.now()}` : `vendeur_${Date.now()}`,
      email,
      password: hashedPassword,
      role: role,
      drive_folder_id: drive_folder_id,
      created: new Date().toISOString(),
      created_by: req.user.id
    };
    
    data.users.push(newUser);
    await writeJSON('users.json', data);
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour lister les vendeurs (admin only)
app.get('/api/auth/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('users.json');
    const vendeurs = data.users
      .filter(u => u.role === 'vendeur')
      .map(u => ({
        id: u.id,
        email: u.email,
        created: u.created,
        last_login: u.last_login,
        info: u.info // Inclure les infos pour l'affichage
      }));
    
    res.json({ success: true, users: vendeurs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour lister tous les utilisateurs (admin only)
app.get('/api/auth/all-users', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('users.json');
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      created: u.created,
      last_login: u.last_login,
      info: u.info
    }));
    
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour obtenir un utilisateur spécifique
app.get('/api/auth/users/:id', verifyToken, async (req, res) => {
  try {
    const data = await readJSON('users.json');
    const user = data.users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Vérifier les permissions (admin peut tout voir, vendeur seulement lui-même)
    if (req.user.role !== 'admin' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    
    // Ne pas renvoyer le mot de passe hashé
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour mettre à jour les infos d'un utilisateur (admin only)
app.put('/api/auth/users/:id/info', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('users.json');
    const userIndex = data.users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Mettre à jour les infos
    data.users[userIndex].info = req.body.info;
    await writeJSON('users.json', data);
    
    res.json({ success: true, message: 'Informations mises à jour' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour supprimer un vendeur (admin only)
app.delete('/api/auth/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('users.json');
    data.users = data.users.filter(u => u.id !== req.params.id);
    await writeJSON('users.json', data);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour créer une notification (vendeur)
app.post('/api/notifications', verifyToken, async (req, res) => {
  try {
    const data = await readJSON('notifications.json');
    
    // Vérifier si une notification existe déjà pour ce client et ce vendeur
    const existingNotif = data.notifications.find(n =>
      n.vendeur_id === req.user.id &&
      n.client_name === req.body.client_name &&
      (n.status === 'pending' || n.status === 'pending_referent')
    );
    
    if (existingNotif) {
      // Mettre à jour la notification existante au lieu d'en créer une nouvelle
      existingNotif.date = new Date().toISOString();
      existingNotif.extractedData = req.body.extractedData;
      existingNotif.client_name = req.body.client_name || existingNotif.client_name;
      existingNotif.segment = req.body.segment || existingNotif.segment;
      await writeJSON('notifications.json', data);
      
      res.json({ success: true, notification: existingNotif, updated: true });
    } else {
      // Créer une nouvelle notification
      // Chercher le référent du vendeur
      let referent_email = '';
      try {
        const allUsers = await getVendeursFromSheets();
        const vendeur = allUsers.find(u => u.email === req.user.email);
        referent_email = vendeur?.referent_email || '';
      } catch(e) {}

      const notification = {
        id: `notif_${Date.now()}`,
        vendeur_id: req.user.id,
        vendeur_email: req.user.email,
        vendeur_drive_folder_id: req.user.drive_folder_id || '',
        referent_email,
        date: new Date().toISOString(),
        date_soumission_vendeur: new Date().toISOString(),
        status: referent_email ? 'pending_referent' : 'pending',
        historique: [{
          role: 'vendeur',
          email: req.user.email,
          action: 'Soumission MEC',
          date: new Date().toISOString()
        }],
        ...req.body
      };

      data.notifications.push(notification);
      await writeJSON('notifications.json', data);
      
      res.json({ success: true, notification });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour mettre à jour drive_folder_id d'un vendeur
app.put('/api/auth/users/:email/drive-folder', verifyToken, isAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { drive_folder_id } = req.body;
    
    // Extraire l'ID depuis un lien Drive complet si nécessaire
    const folderId = drive_folder_id.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1] || drive_folder_id;
    
    const data = await readJSON('users.json');
    const user = data.users.find(u => u.email === email);
    
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    
    user.drive_folder_id = folderId;
    await writeJSON('users.json', data);
    
    res.json({ success: true, email, drive_folder_id: folderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour lister les notifications (admin only)
app.get('/api/notifications', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('notifications.json');
    const pending = data.notifications.filter(n => n.status === 'pending' || n.status === 'pending_referent');
    
    res.json({ success: true, notifications: pending });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer une notification spécifique
app.get('/api/notifications/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('notifications.json');
    const notification = data.notifications.find(n => n.id === req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour marquer une notification comme complète
app.put('/api/notifications/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('notifications.json');
    const notif = data.notifications.find(n => n.id === req.params.id);
    
    if (notif) {
      notif.status = 'completed';
      notif.completed_at = new Date().toISOString();
      notif.completed_by = req.user.id;
      await writeJSON('notifications.json', data);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les MEC complétées
app.get('/api/notifications/completed', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('notifications.json');
    const completed = data.notifications.filter(n => n.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
    
    res.json({ success: true, notifications: completed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour supprimer une notification (admin only)
app.delete('/api/notifications/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const data = await readJSON('notifications.json');
    const index = data.notifications.findIndex(n => n.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    
    data.notifications.splice(index, 1);
    await writeJSON('notifications.json', data);
    
    res.json({ success: true, message: 'Notification supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour vérifier le token
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

app.listen(port, () => {
  console.log(`🚀 SERVEUR LILIWATT ULTRA-OPTIMISÉ démarré sur http://localhost:${port}`);
  console.log(`🧪 Test API: http://localhost:${port}/api/test`);
  console.log(`🌐 Interface: http://localhost:${port}/`);
  console.log(`🤖 GPT-4 EXTRACTION ULTRA-PRÉCISE activée`);
  console.log(`📄 Génération RGPD + PDF disponible`);
});


// ===== GOOGLE SHEETS AUTH =====
const SHEETS_ID = '11gVGMBtqMUhPh70yjMgjW-yLDht6fO0KqWJAF53ASXk';

async function getVendeurFromSheets(email) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: DRIVE_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'A:G'
    });
    const rows = res.data.values || [];
    for (const row of rows) {
      const rowEmail = row[3] || '';
      if (rowEmail.toLowerCase() === email.toLowerCase()) {
        return {
          email: rowEmail,
          password: row[2] || '',
          drive_folder_id: row[5] || '',
          nom: row[0] || '',
          prenom: row[1] || '',
          role: 'vendeur'
        };
      }
    }
    return null;
  } catch(e) {
    console.error('Sheets error:', e.message, e.stack);
    return null;
  }
}
// ===== FIN GOOGLE SHEETS AUTH =====

// ===== GOOGLE DRIVE INTEGRATION =====
const { google } = require('googleapis');
let DRIVE_CREDENTIALS;
try {
  if (process.env.GOOGLE_DRIVE_CREDS_BASE64) {
    DRIVE_CREDENTIALS = JSON.parse(Buffer.from(process.env.GOOGLE_DRIVE_CREDS_BASE64, 'base64').toString());
  } else {
    DRIVE_CREDENTIALS = require('./liliwatt-drive-credentials.json');
  }
} catch(e) {
  console.warn('⚠️ Drive credentials non disponibles:', e.message);
  DRIVE_CREDENTIALS = null;
}
const VENDEURS_FOLDER_ID = '157Sol6u32W0loIEv8CmYT3uoDaGyZ7q6';

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: DRIVE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return google.drive({ version: 'v3', auth });
}

async function findOrCreateFolder(drive, name, parentId) {
  // Recherche insensible à la casse
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });
  // Chercher un dossier avec le même nom (insensible à la casse)
  const existing = res.data.files.find(f => f.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true
  });
  return folder.data.id;
}

// Route upload Drive
app.post('/api/drive/upload', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) {
    return res.status(503).json({ error: 'Google Drive non configuré' });
  }
  try {
    const { pdfBase64, fileName, clientName, docType, overrideDriveFolderId } = req.body;
    const drive = getDriveClient();

    // ✅ Utiliser overrideDriveFolderId si fourni (MEC reprise par admin), sinon drive_folder_id du JWT
    const vendeurFolderId = overrideDriveFolderId || req.user.drive_folder_id || null;
    if (overrideDriveFolderId) {
      console.log('📁 Upload avec override vers dossier vendeur:', overrideDriveFolderId);
    }

    let attenteId;
    if (vendeurFolderId) {
      attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', vendeurFolderId);
    } else {
      const vendeurEmail = req.user.email;
      const vendeurNom = vendeurEmail.split('@')[0].replace('.', ' ').split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const fallbackId = await findOrCreateFolder(drive, vendeurNom, VENDEURS_FOLDER_ID);
      attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', fallbackId);
    }

    // Chercher/créer dossier client
    const clientFolderId = await findOrCreateFolder(drive, clientName || 'Client inconnu', attenteId);

    // Upload PDF
    const buffer = Buffer.from(pdfBase64, 'base64');
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);

    // Upload directement dans le dossier partagé
    const file = await drive.files.create({
      requestBody: { 
        name: fileName,
        mimeType: 'application/pdf',
        parents: [clientFolderId]
      },
      media: { mimeType: 'application/pdf', body: stream },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    res.json({ success: true, fileId: file.data.id, link: file.data.webViewLink });
  } catch (err) {
    console.error('Drive upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour créer dossier client (lors de l'upload facture)
app.post('/api/drive/create-client-folder', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) {
    return res.status(503).json({ error: 'Google Drive non configuré' });
  }
  try {
    const { clientName } = req.body;
    const drive = getDriveClient();
    
    // Utiliser le dossier Drive du vendeur depuis son JWT
    const vendeurFolderId = req.user.drive_folder_id || null;
    
    let attenteId;
    if (vendeurFolderId) {
      // Dossier vendeur connu → chercher/créer "Clients en attente" dedans
      attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', vendeurFolderId);
    } else {
      // Fallback : créer dans le dossier VENDEURS principal
      const vendeurEmail = req.user.email;
      const vendeurNom = vendeurEmail.split('@')[0].replace('.', ' ').split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const fallbackId = await findOrCreateFolder(drive, vendeurNom, VENDEURS_FOLDER_ID);
      attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', fallbackId);
    }
    
    const clientFolderId = await findOrCreateFolder(drive, clientName, attenteId);
    res.json({ success: true, folderId: clientFolderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Route renommage dossier client Drive
app.post('/api/drive/rename-folder', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const { oldName, newName, vendeurDriveFolderId } = req.body;
    const drive = getDriveClient();
    
    const vendeurFolderId = vendeurDriveFolderId || req.user.drive_folder_id;
    if (!vendeurFolderId) return res.status(400).json({ error: 'Pas de dossier vendeur' });
    
    // Chercher le dossier "CLIENT EN ATTENTE"
    const attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', vendeurFolderId);
    
    // Chercher le dossier avec l'ancien nom
    const res2 = await drive.files.list({
      q: `'${attenteId}' in parents and name='${oldName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    
    if (res2.data.files.length === 0) {
      return res.json({ success: false, error: 'Dossier non trouvé' });
    }
    
    // Renommer le dossier
    const folderId = res2.data.files[0].id;
    await drive.files.update({
      fileId: folderId,
      requestBody: { name: newName },
      supportsAllDrives: true
    });
    
    res.json({ success: true, folderId, oldName, newName });
  } catch(err) {
    console.error('Rename error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route liste documents par vendeur
app.get('/api/drive/list-documents', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const drive = getDriveClient();
    const vendeurFolderId = req.user.drive_folder_id;
    if (!vendeurFolderId) return res.json({ success: true, attente: [], signe: [], perdu: [] });

    async function listFolder(parentId, folderName) {
      // Chercher le dossier
      const folderRes = await drive.files.list({
        q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      if (!folderRes.data.files.length) return [];
      const folderId = folderRes.data.files[0].id;

      // Lister les sous-dossiers clients
      const clientsRes = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      // Pour chaque client, lister ses fichiers
      const clients = await Promise.all(clientsRes.data.files.map(async (client) => {
        const filesRes = await drive.files.list({
          q: `'${client.id}' in parents and trashed=false`,
          fields: 'files(id, name, size, webViewLink, mimeType)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        return {
          id: client.id,
          name: client.name,
          files: filesRes.data.files.map(f => ({
            id: f.id,
            name: f.name,
            size: f.size ? Math.round(f.size/1024) + ' Ko' : '—',
            webViewLink: f.webViewLink
          }))
        };
      }));
      return clients;
    }

    const [attente, signe, perdu] = await Promise.all([
      listFolder(vendeurFolderId, 'CLIENT EN ATTENTE'),
      listFolder(vendeurFolderId, 'CLIENTS SIGNÉS'),
      listFolder(vendeurFolderId, 'CLIENTS PERDUS')
    ]);

    res.json({ success: true, attente, signe, perdu });
  } catch(err) {
    console.error('list-documents error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route upload dans un dossier spécifique
app.post('/api/drive/upload-to-folder', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const { pdfBase64, fileName, folderId } = req.body;
    const drive = getDriveClient();
    const buffer = Buffer.from(pdfBase64, 'base64');
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);
    const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    const file = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId], mimeType },
      media: { mimeType, body: stream },
      fields: 'id, webViewLink',
      supportsAllDrives: true
    });
    res.json({ success: true, fileId: file.data.id, link: file.data.webViewLink });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Route téléchargement fichier Drive via service account
app.get('/api/drive/download/:fileId', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const drive = getDriveClient();
    const fileId = req.params.fileId;
    
    // Récupérer les métadonnées
    const meta = await drive.files.get({
      fileId,
      fields: 'name, mimeType',
      supportsAllDrives: true
    });
    
    // Télécharger le contenu
    const fileRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );
    
    res.setHeader('Content-Disposition', `inline; filename="${meta.data.name}"`);
    res.setHeader('Content-Type', meta.data.mimeType || 'application/octet-stream');
    fileRes.data.pipe(res);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Route liste documents admin - pour un vendeur spécifique
app.get('/api/drive/list-documents-admin', verifyToken, isAdmin, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const { vendeurId, vendeurEmail } = req.query;
    let vendeurFolderId = null;
    
    if (vendeurEmail) {
      // Chercher dans Sheets
      const vendeurs = await getVendeursFromSheets();
      const vendeur = vendeurs.find(v => v.email === vendeurEmail);
      vendeurFolderId = vendeur?.drive_folder_id;
    } else if (vendeurId) {
      // Fallback: chercher dans users.json
      const data = await readJSON('users.json');
      const vendeur = data.users.find(u => u.id === vendeurId);
      vendeurFolderId = vendeur?.drive_folder_id;
    }
    
    if (!vendeurFolderId) {
      return res.json({ success: true, attente: [], signe: [], perdu: [], error: 'Pas de dossier Drive configuré' });
    }
    
    const drive = getDriveClient();

    async function listFolder(parentId, folderName) {
      const folderRes = await drive.files.list({
        q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      if (!folderRes.data.files.length) return [];
      const folderId = folderRes.data.files[0].id;
      const clientsRes = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      const clients = await Promise.all(clientsRes.data.files.map(async (client) => {
        const filesRes = await drive.files.list({
          q: `'${client.id}' in parents and trashed=false`,
          fields: 'files(id, name, size, webViewLink)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        return {
          id: client.id,
          name: client.name,
          files: filesRes.data.files.map(f => ({
            id: f.id,
            name: f.name,
            size: f.size ? Math.round(f.size/1024) + ' Ko' : '—',
            webViewLink: f.webViewLink
          }))
        };
      }));
      return clients;
    }

    const [attente, signe, perdu] = await Promise.all([
      listFolder(vendeurFolderId, 'CLIENT EN ATTENTE'),
      listFolder(vendeurFolderId, 'CLIENTS SIGNÉS'),
      listFolder(vendeurFolderId, 'CLIENTS PERDUS')
    ]);

    res.json({ success: true, attente, signe, perdu });
  } catch(err) {
    console.error('list-documents-admin error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route vendeurs depuis Google Sheets (pour Portefeuille admin)
app.get('/api/vendeurs', verifyToken, async (req, res) => {
  try {
    const vendeurs = await getVendeursFromSheets();
    res.json({ success: true, vendeurs });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

async function getVendeursFromSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: DRIVE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range: 'A:G'
  });
  const rows = res.data.values || [];
  return rows
    .filter(row => row[3] && row[3].includes('@'))
    .map(row => ({
      id: row[3],
      email: row[3],
      nom: row[1] + ' ' + row[0],
      drive_folder_id: row[5] || '',
      referent_email: row[6] || ''
    }));
}

// Route liste documents pour référent (ses vendeurs)
app.get('/api/drive/list-documents-referent', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const { vendeurEmail } = req.query;
    const mesVendeurs = req.user.mes_vendeurs || [];
    
    // Vérifier que le vendeur appartient au référent
    if (!mesVendeurs.includes(vendeurEmail)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const vendeurs = await getVendeursFromSheets();
    const vendeur = vendeurs.find(v => v.email === vendeurEmail);
    if (!vendeur?.drive_folder_id) {
      return res.json({ success: true, attente: [], signe: [], perdu: [] });
    }
    
    const drive = getDriveClient();
    const vendeurFolderId = vendeur.drive_folder_id;

    async function listFolder(parentId, folderName) {
      const folderRes = await drive.files.list({
        q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      if (!folderRes.data.files.length) return [];
      const folderId = folderRes.data.files[0].id;
      const clientsRes = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      const clients = await Promise.all(clientsRes.data.files.map(async (client) => {
        const filesRes = await drive.files.list({
          q: `'${client.id}' in parents and trashed=false`,
          fields: 'files(id, name, size, webViewLink)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        return {
          id: client.id,
          name: client.name,
          files: filesRes.data.files.map(f => ({
            id: f.id, name: f.name,
            size: f.size ? Math.round(f.size/1024) + ' Ko' : '—'
          }))
        };
      }));
      return clients;
    }

    const [attente, signe, perdu] = await Promise.all([
      listFolder(vendeurFolderId, 'CLIENT EN ATTENTE'),
      listFolder(vendeurFolderId, 'Clients signés'),
      listFolder(vendeurFolderId, 'Clients perdus')
    ]);

    res.json({ success: true, attente, signe, perdu });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Route déplacer dossier Drive (référent/admin)
app.post('/api/drive/move-folder', verifyToken, async (req, res) => {
  if (!DRIVE_CREDENTIALS) return res.status(503).json({ error: 'Drive non configuré' });
  try {
    const { folderId, vendeurFolderId, fromCategory, toCategory } = req.body;
    const drive = getDriveClient();
    
    // Trouver les IDs des dossiers source et destination
    const fromId = await findOrCreateFolder(drive, fromCategory, vendeurFolderId);
    const toId = await findOrCreateFolder(drive, toCategory, vendeurFolderId);
    
    await drive.files.update({
      fileId: folderId,
      addParents: toId,
      removeParents: fromId,
      supportsAllDrives: true,
      fields: 'id, parents'
    });
    
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Route validation MEC par référent
app.post('/api/notifications/:id/valider-referent', verifyToken, async (req, res) => {
  try {
    const { note } = req.body;
    const data = JSON.parse(require('fs').readFileSync('./data/notifications.json'));
    const notif = data.notifications.find(n => n.id === req.params.id);
    
    if (!notif) return res.status(404).json({ error: 'Notification non trouvée' });
    
    // Vérifier que c'est bien le référent du vendeur
    const mesVendeurs = req.user.mes_vendeurs || [];
    if (req.user.role !== 'admin' && !mesVendeurs.includes(notif.vendeur_email)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    // Mettre à jour le statut et l'historique
    notif.status = 'pending';
    notif.date_validation_referent = new Date().toISOString();
    notif.referent_validateur = req.user.email;
    notif.note_referent = note || '';
    notif.historique = notif.historique || [];
    notif.historique.push({
      role: 'referent',
      email: req.user.email,
      action: 'Validation et envoi à l\'admin',
      note: note || '',
      date: new Date().toISOString()
    });
    
    require('fs').writeFileSync('./data/notifications.json', JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Route notifications référent (pending_referent de ses vendeurs)
app.get('/api/notifications/referent', verifyToken, async (req, res) => {
  try {
    const mesVendeurs = req.user.mes_vendeurs || [];
    const data = JSON.parse(require('fs').readFileSync('./data/notifications.json'));
    const pending = data.notifications.filter(n => 
      n.status === 'pending_referent' && mesVendeurs.includes(n.vendeur_email)
    );
    const historique = data.notifications.filter(n => 
      n.status !== 'pending_referent' && 
      mesVendeurs.includes(n.vendeur_email) &&
      (n.referent_email === req.user.email || n.referent_validateur === req.user.email)
    );
    res.json({ success: true, notifications: pending, historique });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== FIN GOOGLE DRIVE =====
