// Contenu structuré du centre d'aide (FAQ) de l'espace Agence — fichier
// dédié (plutôt que des clés i18n unitaires) car chaque réponse est longue
// et contient des liens internes [label](/chemin) que FaqAccordion
// transforme en vrais <Link> Next.js.

export type Lang = "fr" | "en";

export interface FaqItem {
  q: Record<Lang, string>;
  a: Record<Lang, string>;
}

export interface FaqCategory {
  id: string;
  label: Record<Lang, string>;
  items: FaqItem[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: "voyages",
    label: { fr: "Trajets & Réservations", en: "Trips & Bookings" },
    items: [
      {
        q: {
          fr: "Comment créer et publier un nouveau trajet ?",
          en: "How do I create and publish a new trip?",
        },
        a: {
          fr: "Rendez-vous sur [Nouveau Trajet](/voyages/new), renseignez la ville de départ, la destination, l'horaire, le nombre de places et le tarif, puis validez. Le trajet apparaît immédiatement dans votre [Liste des Trajets](/voyages) et devient réservable par les clients.",
          en: "Go to [New Trip](/voyages/new), enter the departure city, destination, schedule, seat count and price, then submit. The trip immediately appears in your [Trips List](/voyages) and becomes bookable by clients.",
        },
      },
      {
        q: {
          fr: "Comment modifier un trajet déjà publié ?",
          en: "How do I edit an already published trip?",
        },
        a: {
          fr: "Depuis [votre liste de trajets](/voyages), ouvrez le trajet concerné pour accéder à sa page d'édition et ajuster l'horaire, le tarif ou le nombre de places restantes.",
          en: "From [your trips list](/voyages), open the relevant trip to reach its edit page and adjust the schedule, price or remaining seats.",
        },
      },
      {
        q: {
          fr: "Comment enregistrer une réservation payée en espèces au comptoir ?",
          en: "How do I record a cash booking made at the counter?",
        },
        a: {
          fr: "Sur [la liste des trajets](/voyages), utilisez le bouton « Réservation sur place » du trajet concerné. Renseignez les informations du passager et le nombre de places : la réservation est enregistrée instantanément et les places sont décomptées, sans passer par un paiement en ligne.",
          en: "On [the trips list](/voyages), use the \"On-site booking\" button for the relevant trip. Enter the passenger's details and seat count: the booking is recorded instantly and seats are deducted, without going through an online payment.",
        },
      },
    ],
  },
  {
    id: "manifestes",
    label: { fr: "Manifestes & Alertes", en: "Manifests & Alerts" },
    items: [
      {
        q: {
          fr: "Où consulter la liste des passagers d'un trajet (manifeste) ?",
          en: "Where can I see the passenger list for a trip (manifest)?",
        },
        a: {
          fr: "Ouvrez [Passagers](/passagers) : les réservations confirmées y sont regroupées par trajet, avec le nom et le contact de chaque passager, pratique pour l'embarquement.",
          en: "Open [Passengers](/passagers): confirmed bookings are grouped by trip there, with each passenger's name and contact — handy for boarding.",
        },
      },
      {
        q: {
          fr: "Comment envoyer une alerte de départ (retard, changement de quai...) ?",
          en: "How do I send a departure alert (delay, platform change...)?",
        },
        a: {
          fr: "Depuis [Passagers](/passagers), ouvrez le trajet concerné et utilisez la fonction de notification : choisissez un modèle prêt à l'emploi (retard, changement de quai, changement d'horaire) ou rédigez votre propre message. Tous les passagers ayant un compte reçoivent l'alerte instantanément.",
          en: "From [Passengers](/passagers), open the relevant trip and use the notify function: pick a ready-made template (delay, platform change, schedule change) or write your own message. All passengers with an account receive the alert instantly.",
        },
      },
    ],
  },
  {
    id: "finances",
    label: { fr: "Finances & Retraits", en: "Finance & Payouts" },
    items: [
      {
        q: {
          fr: "Comment accéder aux rapports financiers protégés par code PIN ?",
          en: "How do I access PIN-protected financial reports?",
        },
        a: {
          fr: "Ouvrez [Rapports](/rapport) : un code PIN à 4 chiffres vous est demandé pour protéger vos données financières. Si vous n'en avez pas encore défini, ou si vous l'avez oublié, un lien « PIN oublié ? » sur cette même page permet de le réinitialiser par vérification email.",
          en: "Open [Reports](/rapport): a 4-digit PIN is required to protect your financial data. If you haven't set one yet, or forgot it, a \"Forgot PIN?\" link on that same page lets you reset it via email verification.",
        },
      },
      {
        q: {
          fr: "Comment demander un retrait de mes fonds ?",
          en: "How do I request a payout of my funds?",
        },
        a: {
          fr: "Une fois dans [Rapports](/rapport) (après déverrouillage par code PIN), utilisez le bouton de retrait : indiquez le montant, le numéro et le nom du bénéficiaire. La demande est enregistrée et déduite de votre solde disponible.",
          en: "Once inside [Reports](/rapport) (after unlocking with your PIN), use the withdrawal button: enter the amount, phone number and beneficiary name. The request is recorded and deducted from your available balance.",
        },
      },
      {
        q: {
          fr: "Quelle est la différence entre le revenu affiché à l'agence et celui de la plateforme ?",
          en: "What's the difference between the revenue shown to my agency and the platform's?",
        },
        a: {
          fr: "Le chiffre affiché dans [Rapports](/rapport) correspond à votre revenu propre (prix des billets et colis, hors commission de service). La commission EasyTicket reste strictement interne à la plateforme et n'apparaît jamais dans votre solde.",
          en: "The figure shown in [Reports](/rapport) is your own revenue (ticket and parcel prices, excluding the service commission). The EasyTicket commission stays strictly internal to the platform and never appears in your balance.",
        },
      },
    ],
  },
  {
    id: "compte",
    label: { fr: "Compte & Sécurité", en: "Account & Security" },
    items: [
      {
        q: {
          fr: "Comment modifier les informations de mon agence ?",
          en: "How do I update my agency's information?",
        },
        a: {
          fr: "Rendez-vous sur [Paramètres](/setting) pour modifier le nom, le téléphone, l'adresse et les documents justificatifs de votre agence.",
          en: "Go to [Settings](/setting) to update your agency's name, phone number, address and supporting documents.",
        },
      },
      {
        q: {
          fr: "J'ai oublié mon mot de passe de connexion, comment le réinitialiser ?",
          en: "I forgot my login password, how do I reset it?",
        },
        a: {
          fr: "Sur l'écran de connexion, cliquez sur « Mot de passe oublié » et suivez les instructions envoyées par email pour définir un nouveau mot de passe.",
          en: "On the login screen, click \"Forgot password\" and follow the instructions sent by email to set a new password.",
        },
      },
      {
        q: {
          fr: "Quelle est la différence entre le mot de passe du compte et le code PIN financier ?",
          en: "What's the difference between my account password and the financial PIN?",
        },
        a: {
          fr: "Le mot de passe protège la connexion à votre espace agence ; le code PIN protège uniquement l'accès aux [Rapports](/rapport) financiers et aux retraits. Ne partagez ni l'un ni l'autre : l'équipe EasyTicket ne vous les demandera jamais par téléphone ou message.",
          en: "The password protects login to your agency space; the PIN protects only access to [financial Reports](/rapport) and payouts. Never share either one: the EasyTicket team will never ask for them by phone or message.",
        },
      },
    ],
  },
];
