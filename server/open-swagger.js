// Script pour ouvrir automatiquement la documentation Swagger
const { exec } = require('child_process');
const os = require('os');

const SWAGGER_URL = 'http://localhost:4000/docs';

function openBrowser(url) {
  const platform = os.platform();

  let command;
  switch (platform) {
    case 'win32':
      command = `start ${url}`;
      break;
    case 'darwin': // macOS
      command = `open ${url}`;
      break;
    case 'linux':
      command = `xdg-open ${url}`;
      break;
    default:
      console.log(`Platforme ${platform} non supportée. Ouvrez manuellement: ${url}`);
      return;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Erreur lors de l'ouverture du navigateur: ${error.message}`);
      console.log(`Ouvrez manuellement: ${url}`);
    } else {
      console.log(`📖 Documentation Swagger ouverte: ${url}`);
    }
  });
}

console.log('🚀 Ouverture de la documentation Swagger...');
console.log(`📖 URL: ${SWAGGER_URL}`);
console.log('');
console.log('Instructions:');
console.log('1. Cherchez la section "Messages" dans le menu de gauche');
console.log('2. Cliquez sur "Authorize" et entrez votre token JWT');
console.log('3. Testez les différents endpoints de messagerie');
console.log('');

openBrowser(SWAGGER_URL);
