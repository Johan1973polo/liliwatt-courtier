const bcrypt = require('bcryptjs');
const fs = require('fs');

async function createAdmin() {
  const adminUser = {
    id: Date.now().toString(),
    email: 'admin@ecogies.fr',
    password: await bcrypt.hash('Ecogies2024!', 10),
    role: 'admin',
    name: 'Admin',
    createdAt: new Date().toISOString()
  };

  const userData = {
    users: [adminUser]
  };

  fs.writeFileSync('data/users.json', JSON.stringify(userData, null, 2));
  
  console.log('✅ Admin créé avec succès !');
  console.log('📧 Email: admin@ecogies.fr');
  console.log('🔑 Mot de passe: Ecogies2024!');
  console.log('');
  console.log('IMPORTANT: Changez ce mot de passe après la première connexion !');
}

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

createAdmin();