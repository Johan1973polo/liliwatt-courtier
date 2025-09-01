#!/bin/bash

echo "=== Push vers GitHub ==="
echo ""
echo "1. Allez sur https://github.com/settings/tokens"
echo "2. Cliquez sur 'Generate new token' > 'Generate new token (classic)'"
echo "3. Nom du token: ecogies-deploy"
echo "4. Cochez: ✅ repo (toutes les sous-options)"
echo "5. Cliquez sur 'Generate token'"
echo "6. COPIEZ LE TOKEN"
echo ""
read -p "Collez votre token GitHub ici: " TOKEN
echo ""
read -p "Votre nom d'utilisateur GitHub (johancitynov): " USERNAME
USERNAME=${USERNAME:-johancitynov}

# Configure git
git remote remove origin 2>/dev/null
git remote add origin https://$USERNAME:$TOKEN@github.com/$USERNAME/-ecogies-app.git

# Push
echo "Push en cours..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Code poussé avec succès sur GitHub!"
    echo "URL: https://github.com/$USERNAME/-ecogies-app"
else
    echo "❌ Erreur lors du push"
fi