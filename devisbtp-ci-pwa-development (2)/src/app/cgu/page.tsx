import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Conditions générales d'utilisation — DevisBTP CI" };

export default function Page() {
  return (
    <LegalPage surtitre="Contractuel" titre="Conditions générales d'utilisation">
      <h2>1. Objet</h2>
      <p>DevisBTP CI permet aux entrepreneurs du bâtiment de produire des Devis Quantitatifs Estimatifs (DQE), avenants et factures d'acompte, de les exporter en PDF et de les partager.</p>
      <h2>2. Compte utilisateur</h2>
      <ul>
        <li>Chaque utilisateur crée un compte personnel protégé par un mot de passe.</li>
        <li>Les devis, prix et informations d'entreprise sont strictement rattachés au compte : aucun autre utilisateur n'y a accès.</li>
        <li>L'utilisateur est responsable de la confidentialité de ses identifiants et de l'exactitude des informations saisies.</li>
      </ul>
      <h2>3. Crédits et offres</h2>
      <ul>
        <li>Un devis offert est attribué à l'inscription.</li>
        <li>Offres : Devis Unique 4 900 FCFA, Pack Pro 9 900 FCFA (5 devis), Illimité + Plan IA 24 900 FCFA / 30 jours.</li>
        <li>Les crédits sont consommés à chaque génération réussie et ne sont pas remboursables une fois utilisés.</li>
      </ul>
      <h2>4. Exactitude des chiffrages</h2>
      <p>Les quantités sont calculées selon des ratios de construction usuels en Côte d'Ivoire (13 agglos/m², béton dosé 350 kg/m³, acier 90/50 kg/m³, carrelage +10 % de pertes…). Les prix sont des moyennes de marché, modifiables par l'utilisateur. <strong>L'utilisateur doit vérifier les quantités, prix et plannings avant tout engagement auprès de son client.</strong></p>
      <h2>5. Signature électronique client</h2>
      <p>Le lien de signature permet au client final de consulter et signer un devis. La signature est horodatée et conservée. L'entrepreneur reste responsable de la valeur contractuelle de l'accord obtenu.</p>
      <h2>6. Usage loyal</h2>
      <p>Il est interdit de tenter de contourner le système de crédits, d'extraire massivement les données, ou d'utiliser le service à des fins illicites. Un compte peut être suspendu en cas d'usage abusif ou de paiement non vérifié.</p>
      <h2>7. Disponibilité</h2>
      <p>Le service est fourni « en l'état », avec un objectif de disponibilité continue. Des interruptions de maintenance peuvent survenir.</p>
      <h2>8. Résiliation</h2>
      <p>L'utilisateur peut cesser son utilisation à tout moment. La suspension d'un compte est possible en cas de manquement aux présentes conditions.</p>
    </LegalPage>
  );
}
