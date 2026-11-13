import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Politique de confidentialité — DevisBTP CI" };

export default function Page() {
  return (
    <LegalPage surtitre="Données personnelles" titre="Politique de confidentialité">
      <h2>Données collectées</h2>
      <ul>
        <li>Compte : nom d'entreprise, dirigeant, e-mail, téléphone, adresse.</li>
        <li>Activité : devis, clients finaux, fournitures, factures, dépenses, referentiels de prix.</li>
        <li>Paiement : offre choisie, moyen (Wave / Orange Money), référence de transaction, numéro de téléphone.</li>
      </ul>
      <h2>Finalités</h2>
      <p>Fourniture du service, génération des documents, gestion des crédits, support et prévention de la fraude.</p>
      <h2>Sécurité</h2>
      <ul>
        <li>Mots de passe stockés <strong>hachés</strong> (scrypt + sel) : ils ne sont jamais lisibles.</li>
        <li>Sessions signées, expirant après 30 jours, révocables immédiatement.</li>
        <li>Chaque compte n'accède qu'à ses propres données (contrôle serveur systématique).</li>
        <li>Les mots de passe et jetons de session ne sont <strong>jamais</strong> transmis lors des synchronisations.</li>
      </ul>
      <h2>Conservation</h2>
      <p>Les données sont conservées pendant la durée d'utilisation du compte, puis archivées ou supprimées sur demande.</p>
      <h2>Vos droits</h2>
      <p>Vous pouvez demander l'accès, la rectification, l'export ou la suppression de vos données via le support WhatsApp de l'éditeur. Les devis peuvent être supprimés à tout moment depuis l'application.</p>
      <h2>Sous-traitants</h2>
      <p>Hébergement applicatif et base PostgreSQL ; synchronisation optionnelle vers Supabase (comptes et documents métier uniquement).</p>
    </LegalPage>
  );
}
