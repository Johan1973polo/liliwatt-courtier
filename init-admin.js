const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

async function initAdmin() {
  // Mot de passe admin par défaut
  const adminPassword = 'Admin2024!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const adminUser = {
    id: 'admin_001',
    email: 'admin@ecogies.fr',
    password: hashedPassword,
    role: 'admin',
    created: new Date().toISOString()
  };
  
  const data = { users: [adminUser] };
  
  await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  await fs.writeFile(
    path.join(__dirname, 'data', 'users.json'),
    JSON.stringify(data, null, 2)
  );
  
  console.log('✅ Admin créé avec succès !');
  console.log('Email: admin@ecogies.fr');
  console.log('Mot de passe: Admin2024!');
  console.log('⚠️  Changez ce mot de passe après la première connexion !');
}

initAdmin().catch(console.error);