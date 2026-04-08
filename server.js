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
const multer = require('multer');
const axios = require('axios');
const { Readable } = require('stream');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

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
      
      // Nettoyer le JSON GPT-4
      cleanedResponse = cleanedResponse
        .trim()
        .replace(/(\d+)\s*\*\s*(\d+)/g, (m, a, b) => String(parseInt(a) * parseInt(b))) // Évaluer 1279*1000 → 1279000
        .replace(/\*\*/g, '')   // Retirer ** markdown bold
        .replace(/`/g, '');     // Retirer backticks orphelins

      result = JSON.parse(cleanedResponse);
      console.log('🎯 JSON parsé avec succès:', result);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      console.error('📝 Texte reçu:', responseText);
      return res.status(200).json({
        success: false,
        gpt_error: true,
        error: 'extraction_failed',
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
        ...req.body,
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
        }]
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
      notif.historique = notif.historique || [];
      notif.historique.push({
        role: 'admin',
        email: req.user.email,
        action: 'MEC finalisée et traitée',
        date: new Date().toISOString()
      });
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
app.get('/api/drive/list-documents-admin', verifyToken, async (req, res) => {
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
    range: 'A:H'
  });
  const rows = res.data.values || [];
  return rows
    .filter(row => row[3] && row[3].includes('@'))
    .map(row => ({
      id: row[3],
      email: row[3],
      nom: row[1] + ' ' + row[0],
      drive_folder_id: row[5] || '',
      referent_email: row[6] || '',
      token_rgpd: row[7] || ''
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
      listFolder(vendeurFolderId, 'CLIENTS SIGNÉS'),
      listFolder(vendeurFolderId, 'CLIENTS PERDUS')
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
    const { note, extractedData } = req.body;
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
    // Sauvegarder les données modifiées par le référent
    if (extractedData) {
      notif.extractedData = extractedData;
      console.log('💾 Données référent sauvegardées pour:', notif.client_name);
    }
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


// ===== ROUTES GESTION DOSSIERS DRIVE =====

// Changer statut client (déplacer entre attente/signé/perdu)
app.post('/api/drive/changer-statut', verifyToken, async (req, res) => {
  try {
    const { vendeurEmail, clientId, clientName, statutActuel, nouveauStatut } = req.body;
    const drive = getDriveClient();
    
    // Récupérer drive_folder_id du vendeur
    const vendeurs = await getVendeursFromSheets();
    const vendeur = vendeurs.find(v => v.email === vendeurEmail);
    if (!vendeur?.drive_folder_id) return res.status(404).json({ error: 'Vendeur sans dossier Drive' });
    
    const nomsStatuts = {
      'attente': 'CLIENT EN ATTENTE',
      'signe': 'CLIENTS SIGNÉS',
      'perdu': 'CLIENTS PERDUS'
    };
    
    // Trouver le dossier source
    const sourceFolderId = await findOrCreateFolder(drive, nomsStatuts[statutActuel], vendeur.drive_folder_id);
    const destFolderId = await findOrCreateFolder(drive, nomsStatuts[nouveauStatut], vendeur.drive_folder_id);
    
    // Déplacer le dossier client
    await drive.files.update({
      fileId: clientId,
      addParents: destFolderId,
      removeParents: sourceFolderId,
      supportsAllDrives: true,
      fields: 'id, parents'
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Changer statut error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Déplacer client vers un autre vendeur
app.post('/api/drive/deplacer-client', verifyToken, isAdmin, async (req, res) => {
  try {
    const { vendeurEmailSource, vendeurEmailDest, clientId, clientName, statut } = req.body;
    const drive = getDriveClient();
    const vendeurs = await getVendeursFromSheets();
    const vendeurSrc = vendeurs.find(v => v.email === vendeurEmailSource);
    const vendeurDst = vendeurs.find(v => v.email === vendeurEmailDest);
    
    if (!vendeurSrc?.drive_folder_id || !vendeurDst?.drive_folder_id) {
      return res.status(404).json({ error: 'Dossier Drive manquant pour un des vendeurs' });
    }
    
    const nomsStatuts = { 'attente': 'CLIENT EN ATTENTE', 'signe': 'CLIENTS SIGNÉS', 'perdu': 'CLIENTS PERDUS' };
    const nomStatut = nomsStatuts[statut] || 'CLIENT EN ATTENTE';
    
    const sourceFolderId = await findOrCreateFolder(drive, nomStatut, vendeurSrc.drive_folder_id);
    const destFolderId = await findOrCreateFolder(drive, nomStatut, vendeurDst.drive_folder_id);
    
    await drive.files.update({
      fileId: clientId,
      addParents: destFolderId,
      removeParents: sourceFolderId,
      supportsAllDrives: true,
      fields: 'id, parents'
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Déplacer client error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer dossier client
app.post('/api/drive/supprimer-client', verifyToken, isAdmin, async (req, res) => {
  try {
    const { clientId } = req.body;
    const drive = getDriveClient();
    
    // Mettre à la corbeille plutôt que supprimer définitivement
    await drive.files.update({
      fileId: clientId,
      supportsAllDrives: true,
      requestBody: { trashed: true }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Supprimer client error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un fichier (pas un dossier)
app.post('/api/drive/supprimer-fichier', verifyToken, isAdmin, async (req, res) => {
  try {
    const { fileId } = req.body;
    const drive = getDriveClient();
    await drive.files.update({
      fileId,
      supportsAllDrives: true,
      requestBody: { trashed: true }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== FIN ROUTES GESTION DOSSIERS DRIVE =====

// ===== RGPD FORMULAIRE CLIENT =====

const rgpdUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Helper : récupérer un vendeur par token RGPD (cherche dans colonne H de Google Sheets)
async function findVendeurByRgpdToken(token) {
  const vendeurs = await getVendeursFromSheets();
  return vendeurs.find(v => v.token_rgpd && v.token_rgpd === token) || null;
}

// Helper Zoho Mail : obtenir un access token
async function getZohoMailToken() {
  const res = await axios.post('https://accounts.zoho.eu/oauth/v2/token', null, {
    params: {
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    },
    timeout: 15000
  });
  return res.data.access_token;
}

// Helper : envoyer un email via Zoho Mail avec pièce jointe base64
async function sendZohoMail({ to, subject, htmlBody }) {
  const token = await getZohoMailToken();
  const accountId = process.env.ZOHO_ACCOUNT_ID;
  if (!accountId) throw new Error('ZOHO_ACCOUNT_ID non configuré');
  const url = `https://mail.zoho.eu/api/accounts/${accountId}/messages`;
  console.log(`📧 Zoho Mail → ${to} | URL: ${url}`);
  const payload = {
    fromAddress: 'bo@liliwatt.fr',
    toAddress: to,
    subject,
    content: htmlBody,
    mailFormat: 'html'
  };
  try {
    const r = await axios.post(url, payload, {
      headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    console.log(`✅ Zoho Mail envoyé à ${to} — status: ${r.status}`);
    return r.data;
  } catch (err) {
    console.error(`❌ Zoho Mail erreur vers ${to} — status: ${err.response?.status} — data:`, JSON.stringify(err.response?.data || err.message));
    throw err;
  }
}

// GET /rgpd/:token — formulaire HTML statique
app.get('/rgpd/:token', async (req, res) => {
  const vendeur = await findVendeurByRgpdToken(req.params.token);
  if (!vendeur) return res.status(404).send('Vendeur introuvable.');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LILIWATT — Transmission de factures</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f3ff;min-height:100vh}
.header{background:linear-gradient(135deg,#1e1b4b,#7c3aed);padding:32px 24px;text-align:center}
.header h1{color:#fff;font-size:28px;font-weight:800;letter-spacing:3px}
.header p{color:rgba(255,255,255,.8);font-size:13px;margin-top:6px;text-transform:uppercase;letter-spacing:1px}
.container{max-width:720px;margin:0 auto;padding:24px 16px 60px}
.card{background:#fff;border-radius:12px;padding:28px;margin-bottom:20px;box-shadow:0 2px 12px rgba(124,58,237,.08)}
.card h2{color:#1e1b4b;font-size:18px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #ede9fe}
label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;margin-top:14px}
input[type=text],input[type=email],input[type=tel],select{width:100%;padding:10px 14px;border:1.5px solid #e9d5ff;border-radius:8px;font-size:14px;transition:border .2s}
input:focus,select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.1)}
.radio-group{display:flex;gap:12px;margin-top:6px}
.radio-group label{display:flex;align-items:center;gap:6px;font-weight:500;cursor:pointer;padding:8px 16px;border:1.5px solid #e9d5ff;border-radius:8px;transition:all .2s}
.radio-group input:checked+span{color:#7c3aed;font-weight:700}
.radio-group label:has(input:checked){border-color:#7c3aed;background:#f5f3ff}
.file-input{margin-top:6px}
.file-input input[type=file]{width:100%;padding:8px;border:1.5px dashed #d8b4fe;border-radius:8px;background:#faf5ff;cursor:pointer}
.site-block{border:1.5px solid #ede9fe;border-radius:10px;padding:16px;margin-top:12px;position:relative}
.site-block .site-num{position:absolute;top:-10px;left:14px;background:#7c3aed;color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px}
.btn{display:inline-block;padding:12px 28px;border:none;border-radius:50px;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,#7c3aed,#d946ef);color:#fff;width:100%}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.3)}
.btn-secondary{background:#ede9fe;color:#7c3aed;font-size:13px;margin-top:10px}
.btn-secondary:hover{background:#ddd6fe}
.checkbox-row{display:flex;align-items:flex-start;gap:10px;margin-top:16px}
.checkbox-row input[type=checkbox]{margin-top:3px;accent-color:#7c3aed;width:18px;height:18px}
.checkbox-row span{font-size:13px;color:#374151;line-height:1.5}
.vendeur-badge{display:inline-block;background:#ede9fe;color:#5b21b6;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-top:8px}
#energy-elec,#energy-gaz{display:none}
.hidden{display:none!important}
.search-wrap{position:relative}
.search-wrap input{padding-left:36px}
.search-wrap .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;font-size:15px}
.suggestions{position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid #e9d5ff;border-top:none;border-radius:0 0 10px 10px;max-height:240px;overflow-y:auto;z-index:50;box-shadow:0 8px 24px rgba(124,58,237,.12);display:none}
.suggestions.open{display:block}
.sug-item{padding:12px 16px;cursor:pointer;border-bottom:1px solid #f5f3ff;transition:background .15s}
.sug-item:hover,.sug-item.active{background:#f5f3ff}
.sug-name{font-weight:600;color:#1e1b4b;font-size:14px}
.sug-detail{font-size:12px;color:#6b7280;margin-top:2px}
.sug-siret{font-family:monospace;color:#7c3aed;font-size:11px}
.search-spinner{display:none;position:absolute;right:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;border:2px solid #e9d5ff;border-top-color:#7c3aed;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:translateY(-50%) rotate(360deg)}}
</style>
</head>
<body>
<div class="header">
  <h1>LILIWATT</h1>
  <p>Transmission de factures</p>
</div>
<div class="container">
<form id="rgpdForm" enctype="multipart/form-data" method="POST" action="/rgpd/${req.params.token}/submit">
  <div class="card">
    <h2>Vos coordonnées</h2>
    <div class="vendeur-badge">Votre conseiller : ${vendeur.nom}</div>
    <label>Rechercher votre entreprise</label>
    <div class="search-wrap">
      <span class="search-icon">\uD83D\uDD0D</span>
      <input type="text" id="entrepriseSearch" placeholder="Tapez le nom de votre entreprise..." autocomplete="off">
      <div class="search-spinner" id="searchSpinner"></div>
      <div class="suggestions" id="suggestions"></div>
    </div>
    <label>Raison sociale *</label>
    <input type="text" name="raison_sociale" id="raison_sociale" required>
    <label>Qualité du signataire *</label>
    <input type="text" name="qualite_signataire" required placeholder="Gérant, Directeur général, PDG...">
    <label>SIRET</label>
    <input type="text" name="siret" id="siret" placeholder="14 chiffres" pattern="[0-9]{14}" title="Le SIRET doit contenir 14 chiffres">
    <label>Adresse du siège social</label>
    <input type="text" name="adresse_siege" id="adresse_siege" placeholder="12 rue des Fleurs, 75001 Paris">
    <div style="display:flex;gap:12px">
      <div style="flex:1"><label>Nom *</label><input type="text" name="nom" required></div>
      <div style="flex:1"><label>Prénom *</label><input type="text" name="prenom" required></div>
    </div>
    <label>Téléphone *</label>
    <input type="tel" name="telephone" required>
    <label>Email *</label>
    <input type="email" name="email" required>
  </div>

  <div class="card">
    <h2>Type d'énergie</h2>
    <div class="radio-group">
      <label><input type="radio" name="energie" value="electricite" required><span>Électricité</span></label>
      <label><input type="radio" name="energie" value="gaz"><span>Gaz</span></label>
      <label><input type="radio" name="energie" value="les_deux"><span>Les deux</span></label>
    </div>
  </div>

  <div class="card" id="sites-card">
    <h2>Sites &amp; factures</h2>
    <p style="font-size:13px;color:#6b7280;margin-bottom:8px">Ajoutez un ou plusieurs sites. Pour chaque site, joignez les factures demandées.</p>
    <div id="sites-container"></div>
    <button type="button" class="btn btn-secondary" onclick="addSite()">+ Ajouter un site</button>
  </div>

  <div class="card">
    <h2>Consentement RGPD</h2>
    <div class="checkbox-row">
      <input type="checkbox" id="rgpd" name="rgpd" required>
      <span>J'accepte que mes données personnelles et mes factures soient transmises à LILIWATT (LILISTRAT STRATÉGIE SAS) dans le cadre de l'étude de mon dossier de courtage en énergie. Conformément au RGPD, je dispose d'un droit d'accès, de rectification et de suppression de mes données en contactant <a href="mailto:bo@liliwatt.fr" style="color:#7c3aed">bo@liliwatt.fr</a>.</span>
    </div>
  </div>

  <button type="submit" class="btn btn-primary" id="submitBtn">Envoyer mes factures</button>
</form>
</div>

<script>
// === Recherche entreprise API Gouv ===
(function(){
  const input=document.getElementById('entrepriseSearch');
  const sugBox=document.getElementById('suggestions');
  const spinner=document.getElementById('searchSpinner');
  let debounce=null, activeIdx=-1, results=[];

  input.addEventListener('input',function(){
    const q=this.value.trim();
    clearTimeout(debounce);
    if(q.length<3){sugBox.classList.remove('open');sugBox.innerHTML='';results=[];return;}
    debounce=setTimeout(()=>searchEntreprise(q),300);
  });

  input.addEventListener('keydown',function(e){
    if(!sugBox.classList.contains('open'))return;
    if(e.key==='ArrowDown'){e.preventDefault();activeIdx=Math.min(activeIdx+1,results.length-1);highlight();}
    else if(e.key==='ArrowUp'){e.preventDefault();activeIdx=Math.max(activeIdx-1,0);highlight();}
    else if(e.key==='Enter'&&activeIdx>=0){e.preventDefault();selectResult(results[activeIdx]);}
    else if(e.key==='Escape'){sugBox.classList.remove('open');}
  });

  document.addEventListener('click',function(e){if(!e.target.closest('.search-wrap'))sugBox.classList.remove('open');});

  async function searchEntreprise(q){
    spinner.style.display='block';
    try{
      const r=await fetch('https://recherche-entreprises.api.gouv.fr/search?q='+encodeURIComponent(q)+'&page=1&per_page=5');
      const data=await r.json();
      results=(data.results||[]).map(e=>{
        const s=e.siege||{};
        const siret=(e.siren||'')+(s.siret?s.siret.slice(9):'00000');
        const addr=[s.numero_voie,s.type_voie,s.libelle_voie].filter(Boolean).join(' ');
        const full=addr?(addr+', '+( s.code_postal||'')+' '+(s.libelle_commune||'')):'';
        return{nom:e.nom_complet||e.nom_raison_sociale||'',ville:s.libelle_commune||'',cp:s.code_postal||'',siret:siret.slice(0,14),adresse:full};
      });
      renderSuggestions();
    }catch(err){console.error(err);results=[];sugBox.classList.remove('open');}
    spinner.style.display='none';
  }

  function renderSuggestions(){
    if(!results.length){sugBox.innerHTML='<div style="padding:14px;color:#9ca3af;font-size:13px;text-align:center">Aucun résultat</div>';sugBox.classList.add('open');return;}
    activeIdx=-1;
    sugBox.innerHTML=results.map((r,i)=>'<div class="sug-item" data-idx="'+i+'"><div class="sug-name">'+esc(r.nom)+'</div><div class="sug-detail">'+esc(r.ville+(r.cp?' ('+r.cp+')':''))+'  <span class="sug-siret">SIRET '+esc(r.siret)+'</span></div></div>').join('');
    sugBox.classList.add('open');
    sugBox.querySelectorAll('.sug-item').forEach(el=>el.addEventListener('click',()=>selectResult(results[+el.dataset.idx])));
  }

  function highlight(){
    sugBox.querySelectorAll('.sug-item').forEach((el,i)=>el.classList.toggle('active',i===activeIdx));
  }

  function selectResult(r){
    document.getElementById('raison_sociale').value=r.nom;
    document.getElementById('siret').value=r.siret;
    document.getElementById('adresse_siege').value=r.adresse;
    input.value=r.nom;
    sugBox.classList.remove('open');
  }

  function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
})();

// === Formulaire ===
let siteCount=0;
const energyRadios=document.querySelectorAll('input[name=energie]');
energyRadios.forEach(r=>r.addEventListener('change',updateSites));

function updateSites(){
  // reset
  document.querySelectorAll('.site-block').forEach(b=>updateSiteFields(b));
}

function getEnergie(){
  const v=document.querySelector('input[name=energie]:checked');
  return v?v.value:'';
}

function addSite(){
  siteCount++;
  const div=document.createElement('div');
  div.className='site-block';
  div.innerHTML='<span class="site-num">Site '+siteCount+'</span>'+
    '<label>Nom / adresse du site</label>'+
    '<input type="text" name="site_'+siteCount+'_nom" placeholder="Ex: Siège social, Entrepôt Lyon...">'+
    '<label>PDL / PCE <span style="font-weight:400;color:#9ca3af">(optionnel)</span></label>'+
    '<input type="text" name="site_'+siteCount+'_pdl" placeholder="14 chiffres" pattern="[0-9]{14}" title="Le numéro PDL/PCE contient 14 chiffres">'+
    '<p style="font-size:11px;color:#9ca3af;margin:4px 0 10px 2px">\uD83D\uDCA1 Numéro de 14 chiffres sur votre facture sous R\u00e9f\u00e9rence du point de livraison</p>'+
    '<div class="elec-fields">'+
    '<label>Facture électricité — Hiver (oct-mars)</label>'+
    '<div class="file-input"><input type="file" name="site_'+siteCount+'_elec_hiver" accept=".pdf,.jpg,.jpeg,.png"></div>'+
    '<label>Facture électricité — Été (avr-sept)</label>'+
    '<div class="file-input"><input type="file" name="site_'+siteCount+'_elec_ete" accept=".pdf,.jpg,.jpeg,.png"></div>'+
    '</div>'+
    '<div class="gaz-fields">'+
    '<label>Facture gaz</label>'+
    '<div class="file-input"><input type="file" name="site_'+siteCount+'_gaz" accept=".pdf,.jpg,.jpeg,.png"></div>'+
    '</div>';
  document.getElementById('sites-container').appendChild(div);
  updateSiteFields(div);
}

function updateSiteFields(block){
  const e=getEnergie();
  const elec=block.querySelector('.elec-fields');
  const gaz=block.querySelector('.gaz-fields');
  if(!elec||!gaz)return;
  elec.style.display=(e==='electricite'||e==='les_deux')?'block':'none';
  gaz.style.display=(e==='gaz'||e==='les_deux')?'block':'none';
}

// Ajouter le premier site par défaut
addSite();

document.getElementById('rgpdForm').addEventListener('submit',function(ev){
  const btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='Envoi en cours...';
});
</script>
</body>
</html>`;
  res.send(html);
});

// POST /rgpd/:token/submit — traitement du formulaire
app.post('/rgpd/:token/submit', rgpdUpload.any(), async (req, res) => {
  try {
    const vendeur = await findVendeurByRgpdToken(req.params.token);
    if (!vendeur) return res.status(404).send('Vendeur introuvable.');

    const { nom, prenom, raison_sociale, qualite_signataire, siret, adresse_siege, telephone, email, energie, rgpd } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.ip || 'IP inconnue';
    const userAgent = req.headers['user-agent'] || 'UA inconnu';
    const horodatage = new Date().toISOString();

    // 1. Créer le dossier Drive : CLIENT EN ATTENTE / [Raison Sociale]
    const drive = getDriveClient();
    let attenteId;
    if (vendeur.drive_folder_id) {
      attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', vendeur.drive_folder_id);
    } else {
      const vendeurNom = vendeur.nom || vendeurEmail.split('@')[0].replace('.', ' ');
      const fallbackId = await findOrCreateFolder(drive, vendeurNom, VENDEURS_FOLDER_ID);
      attenteId = await findOrCreateFolder(drive, 'CLIENT EN ATTENTE', fallbackId);
    }
    const clientFolderId = await findOrCreateFolder(drive, raison_sociale || `${prenom} ${nom}`, attenteId);

    // 2. Upload de toutes les factures dans le dossier
    const uploadedFiles = [];
    for (const file of (req.files || [])) {
      const stream = Readable.from(file.buffer);
      const driveFile = await drive.files.create({
        requestBody: {
          name: file.originalname,
          mimeType: file.mimetype,
          parents: [clientFolderId]
        },
        media: { mimeType: file.mimetype, body: stream },
        fields: 'id, name, webViewLink',
        supportsAllDrives: true
      });
      uploadedFiles.push({ name: driveFile.data.name, link: driveFile.data.webViewLink, field: file.fieldname });
    }

    // 3. Générer le PDF récapitulatif RGPD via Puppeteer
    const energieLabel = { electricite: 'Électricité', gaz: 'Gaz', les_deux: 'Électricité + Gaz' }[energie] || energie;
    const refNumber = 'RGPD-' + Date.now().toString(36).toUpperCase();
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Collecter les PDL par site depuis req.body (site_1_pdl, site_2_pdl, ...)
    const sitePdls = {};
    for (const key of Object.keys(req.body)) {
      const m = key.match(/^site_(\d+)_pdl$/);
      if (m) sitePdls[m[1]] = req.body[key] || '';
    }

    const sitesRows = uploadedFiles.map(f => {
      const parts = f.field.split('_');
      const siteNum = parts[1] || '?';
      const type = parts.slice(2).join(' ') || '\u2014';
      const pdl = sitePdls[siteNum] || 'Voir facture jointe';
      return '<tr><td>Site ' + siteNum + '</td><td>' + pdl + '</td><td>' + type + '</td><td>' + f.name + '</td></tr>';
    }).join('');

    const pdfHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;color:#1e1b4b;background:#fff;padding:0;font-size:13px;line-height:1.6}

/* EN-TÊTE */
.header{background:linear-gradient(135deg,#1e1b4b 0%,#7c3aed 100%);padding:40px 50px;display:flex;justify-content:space-between;align-items:center}
.header-left h1{color:#fff;font-size:32px;font-weight:800;letter-spacing:4px;margin:0}
.header-left p{color:rgba(255,255,255,.7);font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-top:4px}
.header-right{text-align:right;color:rgba(255,255,255,.85);font-size:11px;line-height:1.8}
.header-right .ref{font-weight:700;font-size:12px;color:#fff}

/* SECTIONS */
.content{padding:40px 50px 30px}
.section{margin-bottom:32px}
.section-title{font-size:15px;font-weight:700;color:#7c3aed;border-bottom:2px solid #ede9fe;padding-bottom:8px;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px}

/* BLOC LÉGAL */
.legal-block{background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:24px 28px;margin-bottom:32px;font-size:12px;color:#374151;line-height:1.7}
.legal-block strong{color:#1e1b4b}

/* INFO GRID */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;margin-bottom:8px}
.info-row{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #f3f0ff}
.info-label{font-weight:600;color:#6b7280;min-width:140px;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
.info-value{font-weight:600;color:#1e1b4b;font-size:13px}

/* MENTION PDL */
.pdl-notice{background:#f5f3ff;border-left:4px solid #7c3aed;padding:14px 20px;margin:20px 0 28px;font-size:12px;color:#5b21b6;border-radius:0 8px 8px 0;font-style:italic}

/* TABLEAU */
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}
thead{background:#7c3aed}
thead th{color:#fff;padding:10px 14px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
tbody tr{border-bottom:1px solid #ede9fe}
tbody tr:nth-child(even){background:#faf5ff}
tbody td{padding:10px 14px;color:#374151}

/* CONSENTEMENT VERT */
.consent-box{background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:22px 28px;margin-bottom:32px;display:flex;gap:16px;align-items:flex-start}
.consent-check{width:28px;height:28px;background:#22c55e;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.consent-check svg{width:16px;height:16px}
.consent-text h3{color:#166534;font-size:14px;font-weight:700;margin-bottom:6px}
.consent-text p{color:#374151;font-size:12px;line-height:1.6}

/* BANDEAU SIGNATURE */
.signature-band{background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:10px;padding:24px 28px;margin-bottom:32px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sig-item{display:flex;flex-direction:column;gap:2px}
.sig-item .sig-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.5);font-weight:600}
.sig-item .sig-value{font-size:12px;color:#fff;font-weight:500;word-break:break-all}
.sig-full{grid-column:1/3}

/* PIED DE PAGE */
.footer{background:#f5f3ff;border-top:2px solid #ede9fe;padding:20px 50px;text-align:center;font-size:10px;color:#9ca3af;line-height:1.8}
.footer strong{color:#7c3aed}
</style></head><body>

<div class="header">
  <div class="header-left">
    <h1>LILIWATT</h1>
    <p>Mandat de courtage en \u00e9nergie &mdash; Consentement RGPD</p>
  </div>
  <div class="header-right">
    <div class="ref">${refNumber}</div>
    <div>${dateStr}</div>
  </div>
</div>

<div class="content">

  <div class="legal-block">
    <strong>${prenom} ${nom}</strong>, en qualit\u00e9 de <strong>${qualite_signataire || 'repr\u00e9sentant(e)'}</strong> pour le compte de <strong>${raison_sociale}</strong>${siret ? ' (SIRET ' + siret + ')' : ''}${adresse_siege ? ', dont le si\u00e8ge social est situ\u00e9 au ' + adresse_siege : ''},
    autorise la soci\u00e9t\u00e9 <strong>LILISTRAT STRAT\u00c9GIE SAS</strong> (nom commercial : LILIWATT), SIRET 93227498500016,
    si\u00e8ge social 59 rue de Ponthieu, Bureau 326 \u2014 75008 Paris, \u00e0 effectuer les d\u00e9marches n\u00e9cessaires aupr\u00e8s
    des fournisseurs d\u2019\u00e9nergie pour l\u2019obtention de propositions commerciales.
  </div>

  <div class="section">
    <div class="section-title">Informations client</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Raison sociale</span><span class="info-value">${raison_sociale}</span></div>
      <div class="info-row"><span class="info-label">Qualit\u00e9</span><span class="info-value">${qualite_signataire || '\u2014'}</span></div>
      <div class="info-row"><span class="info-label">SIRET</span><span class="info-value">${siret || '\u2014'}</span></div>
      <div class="info-row"><span class="info-label">Adresse si\u00e8ge</span><span class="info-value">${adresse_siege || '\u2014'}</span></div>
      <div class="info-row"><span class="info-label">\u00c9nergie</span><span class="info-value">${energieLabel}</span></div>
      <div class="info-row"><span class="info-label">Nom</span><span class="info-value">${nom}</span></div>
      <div class="info-row"><span class="info-label">Pr\u00e9nom</span><span class="info-value">${prenom}</span></div>
      <div class="info-row"><span class="info-label">T\u00e9l\u00e9phone</span><span class="info-value">${telephone}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${email}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Conseiller LILIWATT</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Nom</span><span class="info-value">${vendeur.nom}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${vendeur.email}</span></div>
    </div>
  </div>

  <div class="pdl-notice">
    Les points de livraison (PDL/PCE) concern\u00e9s par ce mandat sont ceux pr\u00e9sents sur les factures jointes au pr\u00e9sent document.
  </div>

  <div class="section">
    <div class="section-title">Sites &amp; factures transmises</div>
    <table>
      <thead><tr><th>Site</th><th>PDL / PCE</th><th>Type</th><th>Fichier</th></tr></thead>
      <tbody>${sitesRows || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:16px">Aucun fichier transmis</td></tr>'}</tbody>
    </table>
  </div>

  <div class="consent-box">
    <div class="consent-check"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
    <div class="consent-text">
      <h3>Consentement RGPD donn\u00e9</h3>
      <p>Le client a accept\u00e9 que ses donn\u00e9es personnelles et ses factures soient transmises \u00e0 LILIWATT
      (LILISTRAT STRAT\u00c9GIE SAS) dans le cadre de l\u2019\u00e9tude de son dossier de courtage en \u00e9nergie.
      Conform\u00e9ment au RGPD, il dispose d\u2019un droit d\u2019acc\u00e8s, de rectification et de suppression
      de ses donn\u00e9es en contactant bo@liliwatt.fr.</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Signature \u00e9lectronique</div>
    <div class="signature-band">
      <div class="sig-item"><span class="sig-label">Adresse IP</span><span class="sig-value">${clientIp}</span></div>
      <div class="sig-item"><span class="sig-label">Horodatage</span><span class="sig-value">${horodatage}</span></div>
      <div class="sig-item sig-full"><span class="sig-label">User Agent</span><span class="sig-value">${userAgent}</span></div>
      <div class="sig-item"><span class="sig-label">Validit\u00e9</span><span class="sig-value">12 mois \u00e0 compter de la date de signature</span></div>
      <div class="sig-item"><span class="sig-label">R\u00e9f\u00e9rence</span><span class="sig-value">${refNumber}</span></div>
    </div>
  </div>

</div>

<div class="footer">
  <strong>LILIWATT</strong> &mdash; LILISTRAT STRAT\u00c9GIE SAS &mdash; SIRET 93227498500016<br>
  59 rue de Ponthieu, Bureau 326 &mdash; 75008 Paris &mdash; bo@liliwatt.fr &mdash; www.liliwatt.fr
</div>

</body></html>`;

    let pdfBase64 = null;
    try {
      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      });
      const pdfPage = await browser.newPage();
      await pdfPage.setContent(pdfHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await pdfPage.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
      await browser.close();
      pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
      console.log('✅ PDF RGPD généré via Puppeteer');
    } catch (pdfErr) {
      console.error('⚠️ Erreur génération PDF RGPD:', pdfErr.message);
    }

    // 4. Déposer le PDF RGPD dans le dossier Drive
    if (pdfBase64) {
      const pdfStream = Readable.from(Buffer.from(pdfBase64, 'base64'));
      await drive.files.create({
        requestBody: {
          name: `RGPD_${raison_sociale || nom}_${new Date().toISOString().slice(0,10)}.pdf`,
          mimeType: 'application/pdf',
          parents: [clientFolderId]
        },
        media: { mimeType: 'application/pdf', body: pdfStream },
        fields: 'id',
        supportsAllDrives: true
      });
    }

    // 5. Envoyer les mails — try/catch séparés
    // 5a. Mail vendeur (simple)
    const vendeurSubject = `${prenom} ${nom} a transmis ses factures — ${raison_sociale}`;
    const drivePath = `CLIENT EN ATTENTE / ${raison_sociale || prenom + ' ' + nom}`;
    const vendeurHtml = `<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
<div style="background:linear-gradient(135deg,#1e1b4b,#7c3aed);padding:24px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="color:#fff;font-size:24px;letter-spacing:3px;margin:0">LILIWATT</h1>
<p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">Nouvelle transmission de factures</p>
</div>
<div style="background:#f5f3ff;padding:28px;border-radius:0 0 12px 12px">
<p style="font-size:15px;color:#1e1b4b"><strong>${prenom} ${nom}</strong> (${raison_sociale}) vous a transmis ses factures.</p>
<div style="background:#fff;border-radius:10px;padding:20px;margin:16px 0;border-left:4px solid #7c3aed">
<table style="width:100%;font-size:13px;border-collapse:collapse">
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700;width:120px">Énergie</td><td style="color:#1e1b4b">${energieLabel}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Téléphone</td><td style="color:#1e1b4b">${telephone}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Email</td><td style="color:#1e1b4b">${email}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Fichiers</td><td style="color:#1e1b4b">${uploadedFiles.length} facture(s) uploadée(s)</td></tr>
</table>
</div>
<p style="font-size:12px;color:#6b7280">Le PDF RGPD est disponible dans votre dossier Drive : <strong>${drivePath}</strong></p>
</div></div>`;

    try {
      await sendZohoMail({ to: vendeur.email, subject: vendeurSubject, htmlBody: vendeurHtml });
    } catch (mailErr) {
      console.error(`⚠️ Erreur mail vendeur (${vendeur.email}):`, mailErr.message);
    }

    // 5b. Mail bo@liliwatt.fr (enrichi)
    const boSubject = `${prenom} ${nom} — ${raison_sociale} via ${vendeur.nom}`;
    const pdlRows = Object.entries(sitePdls).filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">PDL Site ${k}</td><td style="color:#1e1b4b">${v}</td></tr>`).join('');
    const boHtml = `<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:0 auto">
<div style="background:linear-gradient(135deg,#1e1b4b,#7c3aed);padding:24px;border-radius:12px 12px 0 0;text-align:center">
<h1 style="color:#fff;font-size:24px;letter-spacing:3px;margin:0">LILIWATT</h1>
<p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">Nouvelle transmission de factures</p>
</div>
<div style="background:#f5f3ff;padding:28px;border-radius:0 0 12px 12px">
<p style="font-size:15px;color:#1e1b4b"><strong>${prenom} ${nom}</strong> (${raison_sociale}) a transmis ses factures via <strong>${vendeur.nom}</strong>.</p>
<div style="background:#fff;border-radius:10px;padding:20px;margin:16px 0;border-left:4px solid #7c3aed">
<table style="width:100%;font-size:13px;border-collapse:collapse">
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700;width:140px">Qualité</td><td style="color:#1e1b4b">${qualite_signataire || '—'}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">SIRET</td><td style="color:#1e1b4b">${siret || '—'}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Adresse siège</td><td style="color:#1e1b4b">${adresse_siege || '—'}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Énergie</td><td style="color:#1e1b4b">${energieLabel}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Téléphone</td><td style="color:#1e1b4b">${telephone}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Email</td><td style="color:#1e1b4b">${email}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Fichiers</td><td style="color:#1e1b4b">${uploadedFiles.length} facture(s)</td></tr>
${pdlRows}
<tr><td style="padding:6px 0;color:#6b7280;font-weight:700">Vendeur</td><td style="color:#1e1b4b">${vendeur.nom} (${vendeur.email})</td></tr>
</table>
</div>
<p style="font-size:12px;color:#6b7280">Le PDF RGPD est disponible dans le dossier Drive de <strong>${vendeur.nom}</strong> : <strong>${drivePath}</strong></p>
</div></div>`;

    try {
      await sendZohoMail({ to: 'bo@liliwatt.fr', subject: boSubject, htmlBody: boHtml });
    } catch (mailErr) {
      console.error(`⚠️ Erreur mail bo@liliwatt.fr:`, mailErr.message);
    }

    // 6. Page de confirmation avec redirection
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LILIWATT — Envoi confirmé</title>
<meta http-equiv="refresh" content="5;url=https://liliwatt.fr">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f3ff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
.box{background:#fff;border-radius:16px;padding:48px;text-align:center;max-width:520px;box-shadow:0 4px 24px rgba(124,58,237,.1)}
.check{width:68px;height:68px;background:linear-gradient(135deg,#7c3aed,#d946ef);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px}
.check svg{width:34px;height:34px;fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
h1{color:#1e1b4b;font-size:26px;margin-bottom:8px}
.subtitle{color:#374151;font-size:15px;line-height:1.6;margin-bottom:24px}
.redirect{color:#9ca3af;font-size:13px;margin-bottom:12px}
.progress-bar{width:100%;height:6px;background:#ede9fe;border-radius:3px;overflow:hidden}
.progress-fill{height:100%;width:0;background:linear-gradient(90deg,#7c3aed,#d946ef);border-radius:3px;animation:fill 5s linear forwards}
@keyframes fill{to{width:100%}}
</style></head><body>
<div class="box">
<div class="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
<h1>Merci ${prenom} !</h1>
<p class="subtitle">Vos documents ont bien été transmis à votre conseiller <strong>${vendeur.nom}</strong>.</p>
<p class="redirect">Vous allez être redirigé vers liliwatt.fr dans <span id="countdown">5</span> secondes...</p>
<div class="progress-bar"><div class="progress-fill"></div></div>
</div>
<script>let s=5;const c=document.getElementById('countdown');const t=setInterval(()=>{s--;c.textContent=s;if(s<=0){clearInterval(t);window.location.href='https://liliwatt.fr';}},1000);</script>
</body></html>`);

  } catch (err) {
    console.error('❌ Erreur RGPD submit:', err);
    res.status(500).send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LILIWATT — Erreur</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#fef2f2;min-height:100vh;display:flex;align-items:center;justify-content:center}
.box{background:#fff;border-radius:16px;padding:48px;text-align:center;max-width:500px;box-shadow:0 4px 24px rgba(239,68,68,.1)}
h1{color:#dc2626;font-size:20px;margin-bottom:12px}p{color:#6b7280;font-size:14px;line-height:1.6}
</style></head><body><div class="box"><h1>Une erreur est survenue</h1><p>Veuillez réessayer ou contacter <a href="mailto:bo@liliwatt.fr" style="color:#7c3aed">bo@liliwatt.fr</a>.</p></div></body></html>`);
  }
});

// ===== FIN RGPD =====

// ===== FIN GOOGLE DRIVE =====
