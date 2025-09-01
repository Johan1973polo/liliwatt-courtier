const fs = require('fs');
const { createCanvas } = require('canvas');

// Créer le logo ALPIQ
const canvasAlpiq = createCanvas(200, 100);
const ctxAlpiq = canvasAlpiq.getContext('2d');

// Fond blanc
ctxAlpiq.fillStyle = 'white';
ctxAlpiq.fillRect(0, 0, 200, 100);

// Rectangle bleu
ctxAlpiq.fillStyle = '#0066CC';
ctxAlpiq.fillRect(10, 10, 180, 80);

// Texte
ctxAlpiq.fillStyle = 'white';
ctxAlpiq.font = 'bold 30px Arial';
ctxAlpiq.textAlign = 'center';
ctxAlpiq.textBaseline = 'middle';
ctxAlpiq.fillText('ALPIQ', 100, 50);

// Sauvegarder
const bufferAlpiq = canvasAlpiq.toBuffer('image/png');
fs.writeFileSync('logos/alpiq.png', bufferAlpiq);

// Créer le logo IBERDROLA
const canvasIberdrola = createCanvas(200, 100);
const ctxIberdrola = canvasIberdrola.getContext('2d');

// Fond blanc
ctxIberdrola.fillStyle = 'white';
ctxIberdrola.fillRect(0, 0, 200, 100);

// Rectangle vert
ctxIberdrola.fillStyle = '#7CB342';
ctxIberdrola.fillRect(10, 10, 180, 80);

// Texte
ctxIberdrola.fillStyle = 'white';
ctxIberdrola.font = 'bold 24px Arial';
ctxIberdrola.textAlign = 'center';
ctxIberdrola.textBaseline = 'middle';
ctxIberdrola.fillText('IBERDROLA', 100, 50);

// Sauvegarder
const bufferIberdrola = canvasIberdrola.toBuffer('image/png');
fs.writeFileSync('logos/iberdrola.png', bufferIberdrola);

console.log('✅ Logos Alpiq et Iberdrola créés avec succès!');