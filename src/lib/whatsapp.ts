/**
 * WhatsApp « click to chat » : https://wa.me/<numéro international>?text=<message>.
 * En Côte d'Ivoire, le numéro national compte 10 chiffres : le 0 de 01, 05
 * ou 07 fait partie du numéro et doit être conservé après l'indicatif +225.
 */

export type NumeroWhatsApp =
  | { valide: true; numero: string; vide: boolean }
  | { valide: false; erreur: string };

/** Normalise un numéro ivoirien ou international sans inventer de chiffres. */
export function normaliserNumeroWhatsApp(telephone: string): NumeroWhatsApp {
  const saisie = (telephone || "").trim().replace(/^tel:\s*/i, "");
  if (!saisie) return { valide: true, numero: "", vide: true };

  // Accepte uniquement les signes usuels de présentation téléphonique.
  if (!/^\+?[\d\s().\-]+$/.test(saisie)) {
    return { valide: false, erreur: "Utilisez uniquement des chiffres, des espaces et éventuellement le signe +." };
  }

  let chiffres = saisie.replace(/\D/g, "");
  const international = saisie.startsWith("+") || chiffres.startsWith("00");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);

  // Un indicatif +225 déjà saisi ne doit pas être ajouté une seconde fois.
  if (chiffres.startsWith("225") && (international || chiffres.length > 10)) {
    if (chiffres.length !== 13) {
      return { valide: false, erreur: "Après +225, indiquez les 10 chiffres complets du numéro ivoirien, par exemple 07 07 12 34 56." };
    }
    return { valide: true, numero: chiffres, vide: false };
  }

  // Les contacts étrangers explicites conservent leur indicatif international.
  if (international) {
    if (!/^[1-9]\d{7,14}$/.test(chiffres)) {
      return { valide: false, erreur: "Vérifiez le numéro international et son indicatif, par exemple +225 07 07 12 34 56." };
    }
    return { valide: true, numero: chiffres, vide: false };
  }

  if (chiffres.length !== 10) {
    return { valide: false, erreur: "Le numéro ivoirien doit contenir 10 chiffres, par exemple 07 07 12 34 56." };
  }

  return { valide: true, numero: `225${chiffres}`, vide: false };
}

/** Retourne le lien officiel WhatsApp, ou null si le numéro est invalide. */
export function creerLienWhatsApp(telephone: string, texte: string): string | null {
  const resultat = normaliserNumeroWhatsApp(telephone);
  if (!resultat.valide) return null;
  const message = encodeURIComponent(texte);
  return resultat.vide
    ? `https://wa.me/?text=${message}`
    : `https://wa.me/${resultat.numero}?text=${message}`;
}
