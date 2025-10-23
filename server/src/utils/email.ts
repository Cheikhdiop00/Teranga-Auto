import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };

  return await transporter.sendMail(mailOptions);
};

export const sendActivationEmail = async (email: string, token: string) => {
  const activationUrl = `${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:4000'}/api/auth/activate/${token}`;
  const html = `
    <h1>Activation de votre compte TerangaAuto</h1>
    <p>Bonjour,</p>
    <p>Pour activer votre compte, cliquez sur le lien suivant :</p>
    <a href="${activationUrl}">Activer mon compte</a>
    <p>Si le lien ne fonctionne pas, copiez et collez cette URL dans votre navigateur :</p>
    <p>${activationUrl}</p>
    <p>Cordialement,<br>L'équipe TerangaAuto</p>
  `;

  return await sendEmail(email, 'Activation de votre compte TerangaAuto', html);
};

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:4000'}/api/auth/reset-password/${token}`;
  const html = `
    <h1>Réinitialisation de votre mot de passe TerangaAuto</h1>
    <p>Bonjour,</p>
    <p>Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :</p>
    <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
    <p>Si le lien ne fonctionne pas, copiez et collez cette URL dans votre navigateur :</p>
    <p>${resetUrl}</p>
    <p>Cordialement,<br>L'équipe TerangaAuto</p>
  `;

  return await sendEmail(email, 'Réinitialisation de votre mot de passe TerangaAuto', html);
};
