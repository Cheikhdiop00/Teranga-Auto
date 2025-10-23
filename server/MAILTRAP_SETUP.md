// Guide de configuration Mailtrap
console.log(`
🎯 CONFIGURATION MAILTRAP POUR LES EMAILS DE CONFIRMATION

Étape 1: Créer un compte Mailtrap
===========================================
1. Allez sur https://mailtrap.io
2. Cliquez sur "Sign Up Free"
3. Créez votre compte (gratuit pour 500 emails/mois)

Étape 2: Récupérer les identifiants SMTP
===========================================
1. Dans votre dashboard Mailtrap, allez dans "Email Testing" > "Inboxes"
2. Cliquez sur votre inbox (par défaut "My Inbox")
3. Dans l'onglet "SMTP Settings", copiez :
   - Username (EMAIL_USER)
   - Password (EMAIL_PASS)

Étape 3: Mettre à jour le fichier .env
===========================================
Remplacez dans c:\\Users\\simplon\\Desktop\\Nouveau dossier\\server\\.env :

EMAIL_USER=votre_username_mailtrap
EMAIL_PASS=votre_password_mailtrap

Étape 4: Redémarrer le serveur
===========================================
npm run dev

Étape 5: Tester l'inscription
===========================================
L'inscription enverra automatiquement un email de confirmation
que vous pourrez voir dans votre dashboard Mailtrap.

AVANTAGES DE MAILTRAP:
✅ Gratuit pour les tests (500 emails/mois)
✅ Interface web pour voir les emails envoyés
✅ Pas de configuration Gmail compliquée
✅ Emails sécurisés (n'arrivent pas dans la vraie boîte)

IDENTIFIANTS PAR DÉFAUT (À REMPLACER):
EMAIL_USER=9a5b4c3d2e1f0g
EMAIL_PASS=h1g2f3e4d5c6b7a
`);
