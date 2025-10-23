# Activer l'exécution des scripts pour cette session
Set-ExecutionPolicy Bypass -Scope Process -Force

# Exécuter le script de vérification des mots de passe
node -e "require('dotenv/config'); require('./scripts/check-passwords.js');"
