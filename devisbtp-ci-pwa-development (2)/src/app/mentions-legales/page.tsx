import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Mentions légales — DevisBTP CI" };

export default function Page() {
  return (
    <LegalPage surtitre="Informations légales" titre="Mentions légales">
      <p><strong>DevisBTP CI</strong> est un service d'édition de devis de travaux assisté par intelligence artificielle destiné aux entrepreneurs du bâtiment en Côte d'Ivoire.</p>
      <h2>Éditeur du service</h2>
      <p>Nom commercial : DevisBTP CI<br />Contact : <strong>+225 07 09 21 92 2</strong> (WhatsApp)<br />Adresse : Abidjan, Côte d'Ivoire</p>
      <h2>Hébergement</h2>
      <p>Application hébergée sur infrastructure cloud sécurisée (HTTPS). Base de données relationnelle PostgreSQL ; synchronisation optionnelle vers Supabase.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Les modèles de documents, la base de prix, les ratios de construction et le logiciel sont la propriété de l'éditeur. Toute reproduction non autorisée est interdite.</p>
      <h2>Nature des prestations</h2>
      <p>Les montants, quantités et plannings générés sont des <strong>estimations indicatives</strong> établies à partir des prix moyens du marché ivoirien. Ils ne constituent ni une expertise technique, ni un engagement contractuel de l'éditeur : l'entrepreneur reste seul responsable du chiffrage final, du respect des normes de construction et de l'exécution des travaux.</p>
      <h2>Prix et paiement</h2>
      <p>Les offres sont exprimées en francs CFA (FCFA). Le paiement s'effectue par Wave ou Orange Money. Les crédits sont activés après enregistrement de la référence de transaction ; l'éditeur se réserve le droit de vérifier chaque paiement et d'annuler une activation en cas d'irrégularité.</p>
      <h2>Droit applicable</h2>
      <p>Le présent service est soumis au droit ivoirien. Tout litige relève des juridictions compétentes d'Abidjan.</p>
    </LegalPage>
  );
}
