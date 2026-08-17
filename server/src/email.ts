import nodemailer from "nodemailer";
import { env } from "./env.js";

/** Liste de domaines jetables / jetables connus pour empêcher les fausses adresses. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "yopmail.com",
  "dispostable.com",
  "10minutemail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "throwawaymail.com",
]);

/**
 * Valide une adresse e-mail : format et rejet des domaines de mails jetables.
 */
export function validerAdresseEmail(email: string): { valide: boolean; raison?: string } {
  const propre = email.trim().toLowerCase();
  const formatValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre);
  if (!formatValide) {
    return { valide: false, raison: "Le format de l'adresse e-mail est invalide." };
  }

  const domaine = propre.split("@")[1];
  if (domaine && DISPOSABLE_DOMAINS.has(domaine)) {
    return {
      valide: false,
      raison: "Les adresses e-mail temporaires / jetables ne sont pas autorisées.",
    };
  }

  return { valide: true };
}

let transporteur: nodemailer.Transporter | null = null;

function obtenirTransporteur(): nodemailer.Transporter {
  if (!transporteur) {
    transporteur = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return transporteur;
}

/**
 * Envoie un e-mail de notification via SMTP.
 */
export async function envoyerEmail({
  destinataire,
  sujet,
  texte,
  html,
}: {
  destinataire: string;
  sujet: string;
  texte: string;
  html?: string;
}): Promise<boolean> {
  try {
    const transporter = obtenirTransporteur();
    await transporter.sendMail({
      from: `"VITA'NOW" <${env.smtpUser}>`,
      to: destinataire,
      subject: sujet,
      text: texte,
      html: html ?? texte.replace(/\n/g, "<br>"),
    });
    return true;
  } catch (erreur) {
    console.error("[SMTP Error] Échec d'envoi d'e-mail à", destinataire, erreur);
    return false;
  }
}

/**
 * Envoie un code de vérification à 6 chiffres par e-mail lors de l'inscription.
 */
export async function envoyerCodeVerificationEmail(
  email: string,
  code: string,
): Promise<boolean> {
  const sujet = "VITA'NOW — Code de vérification d'inscription";
  const texte = `Bonjour,\n\nVotre code de vérification pour finaliser votre inscription sur VITA'NOW est : ${code}\n\nCe code est valable 15 minutes.\n\nL'équipe VITA'NOW.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded-radius: 8px;">
      <h2 style="color: #4f46e5; margin-top: 0;">VITA'NOW</h2>
      <p>Bonjour,</p>
      <p>Voici votre code de vérification pour valider votre inscription :</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #6b7280; font-size: 14px;">Ce code expire dans 15 minutes.</p>
    </div>
  `;
  return envoyerEmail({ destinataire: email, sujet, texte, html });
}
