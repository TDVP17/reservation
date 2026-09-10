// Contenu structuré du centre d'aide (FAQ) — un fichier dédié plutôt que des
// clés i18n unitaires, car chaque réponse est longue et contient des liens
// internes [label](/chemin) que le composant FaqAccordion transforme en
// vrais <Link> Next.js.

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
    id: "reservations",
    label: { fr: "Réservations", en: "Bookings" },
    items: [
      {
        q: {
          fr: "Comment rechercher un trajet ?",
          en: "How do I search for a trip?",
        },
        a: {
          fr: "Rendez-vous sur la [Page des trajets](/voyages) : indiquez votre ville de départ, votre destination et la date souhaitée. La liste des voyages disponibles s'affiche instantanément, avec les horaires, les places restantes et le prix de chaque agence.",
          en: "Go to the [Trips page](/voyages): enter your departure city, destination and desired date. Available trips appear instantly, with schedules, remaining seats and price for each agency.",
        },
      },
      {
        q: {
          fr: "Comment réserver un billet, étape par étape ?",
          en: "How do I book a ticket, step by step?",
        },
        a: {
          fr: "1) Trouvez votre trajet sur la [Page des trajets](/voyages). 2) Ouvrez la fiche du voyage pour voir les détails (agence, horaire, tarif). 3) Cliquez sur « Réserver », renseignez le nombre de places et les informations passager. 4) Choisissez votre moyen de paiement (portefeuille, mobile money ou carte) et confirmez. Votre billet apparaît ensuite dans [Mes Réservations](/reservations).",
          en: "1) Find your trip on the [Trips page](/voyages). 2) Open the trip's detail page to see agency, schedule and price. 3) Click \"Book\", enter the number of seats and passenger details. 4) Choose your payment method (wallet, mobile money or card) and confirm. Your ticket then appears in [My Bookings](/reservations).",
        },
      },
      {
        q: {
          fr: "Comment annuler ou modifier une réservation ?",
          en: "How do I cancel or change a booking?",
        },
        a: {
          fr: "Ouvrez [Mes Réservations](/reservations), sélectionnez le billet concerné et utilisez l'option d'annulation. Les annulations sont possibles jusqu'à 24h avant le départ ; passé ce délai, contactez directement l'agence.",
          en: "Open [My Bookings](/reservations), select the ticket and use the cancel option. Cancellations are possible up to 24h before departure; after that, contact the agency directly.",
        },
      },
      {
        q: {
          fr: "Comment savoir si mon trajet a un changement d'horaire ou de quai ?",
          en: "How do I know if my trip has a schedule or platform change?",
        },
        a: {
          fr: "Dès qu'une agence modifie un départ (retard, changement de quai, annulation), vous recevez une alerte en temps réel via la cloche de notifications en haut de l'application, ainsi qu'un email si votre compte en dispose. Retrouvez le détail du voyage concerné dans [Mes Réservations](/reservations).",
          en: "As soon as an agency updates a departure (delay, platform change, cancellation), you receive a real-time alert via the notification bell at the top of the app, plus an email if available on your account. Find the affected trip's details in [My Bookings](/reservations).",
        },
      },
    ],
  },
  {
    id: "colis",
    label: { fr: "Colis & OTP", en: "Parcels & OTP" },
    items: [
      {
        q: {
          fr: "Comment envoyer un colis ?",
          en: "How do I send a parcel?",
        },
        a: {
          fr: "Rendez-vous sur la [Page d'expédition](/expedition), renseignez la ville de départ/destination, le contenu et la valeur du colis, ainsi que les coordonnées de l'expéditeur et du destinataire. Un devis est calculé automatiquement (paiement direct ou via portefeuille) ; après paiement, un code client (codeClient) vous est remis — conservez-le, il sert de référence pour tout l'acheminement.",
          en: "Go to the [Shipping page](/expedition), enter the departure/destination city, the parcel's content and value, plus sender and recipient contact details. A quote is calculated automatically (direct payment or via wallet); after payment, you receive a client code (codeClient) — keep it, it's your reference for the whole delivery.",
        },
      },
      {
        q: {
          fr: "Comment suivre l'état de mon colis ?",
          en: "How do I track my parcel's status?",
        },
        a: {
          fr: "Ouvrez [Mes Réservations](/reservations) puis l'onglet « Colis » : chaque envoi affiche son statut en temps réel (en attente, en transit, arrivé en agence de destination, collecté). Vous recevez aussi une notification/email à chaque changement important.",
          en: "Open [My Bookings](/reservations) then the \"Parcels\" tab: each shipment shows its real-time status (pending, in transit, arrived at destination agency, collected). You also get a notification/email at each key change.",
        },
      },
      {
        q: {
          fr: "Qu'est-ce que le code OTP de retrait et comment l'utiliser ?",
          en: "What is the pickup OTP code and how do I use it?",
        },
        a: {
          fr: "Quand le colis arrive à l'agence de destination, le destinataire reçoit par email un code à 4 chiffres (valable 7 jours). Ce code doit être présenté en personne au comptoir de l'agence de destination : c'est l'agent qui le saisit dans son propre système pour valider le retrait — vous n'avez rien à saisir dans l'application. Sans ce code, le colis ne peut pas être remis.",
          en: "When the parcel arrives at the destination agency, the recipient receives a 4-digit code by email (valid for 7 days). This code must be shown in person at the destination agency counter — agency staff enter it on their own system to validate the pickup; you don't enter anything in the app yourself. Without this code, the parcel cannot be handed over.",
        },
      },
      {
        q: {
          fr: "Je n'ai pas reçu mon code OTP, que faire ?",
          en: "I haven't received my OTP code, what should I do?",
        },
        a: {
          fr: "Vérifiez d'abord le statut de l'envoi dans [Mes Réservations](/reservations) — le code n'est généré qu'une fois le colis « Arrivé en agence de destination ». Vérifiez aussi vos courriers indésirables. Si le statut est correct mais que rien n'est arrivé, contactez l'agence de destination ou notre support à easyticket@gmail.com.",
          en: "First check the shipment's status in [My Bookings](/reservations) — the code is only generated once the parcel is \"Arrived at destination agency\". Also check your spam folder. If the status is correct but nothing arrived, contact the destination agency or our support at easyticket@gmail.com.",
        },
      },
    ],
  },
  {
    id: "paiements",
    label: { fr: "Paiements", en: "Payments" },
    items: [
      {
        q: {
          fr: "Comment recharger mon portefeuille (wallet) ?",
          en: "How do I top up my wallet?",
        },
        a: {
          fr: "Ouvrez [Mon Portefeuille](/wallet) et cliquez sur « Recharger ». Choisissez mobile money ou carte bancaire, indiquez le montant et validez. Le solde est crédité automatiquement dès la confirmation du paiement.",
          en: "Open [My Wallet](/wallet) and click \"Top up\". Choose mobile money or card, enter the amount and confirm. Your balance is credited automatically as soon as payment is confirmed.",
        },
      },
      {
        q: {
          fr: "Quels moyens de paiement sont acceptés ?",
          en: "What payment methods are accepted?",
        },
        a: {
          fr: "Vous pouvez payer vos billets et colis via votre solde [Portefeuille](/wallet), par mobile money, ou par carte bancaire. Le portefeuille est le moyen le plus rapide car le débit est instantané et interne à la plateforme.",
          en: "You can pay for tickets and parcels using your [Wallet](/wallet) balance, mobile money, or card. The wallet is the fastest option since the debit is instant and internal to the platform.",
        },
      },
      {
        q: {
          fr: "Mon paiement mobile money/carte a échoué ou reste bloqué, que faire ?",
          en: "My mobile money/card payment failed or is stuck, what should I do?",
        },
        a: {
          fr: "Si un message indique que le paiement automatique est en cours d'intégration, c'est une limitation temporaire connue — réessayez plus tard ou utilisez votre [Portefeuille](/wallet). Si le montant a été débité chez votre opérateur sans confirmation sur la plateforme, contactez easyticket@gmail.com avec la référence affichée.",
          en: "If a message says automatic payment is currently being integrated, that's a known temporary limitation — try again later or use your [Wallet](/wallet). If the amount was debited by your operator without confirmation on the platform, contact easyticket@gmail.com with the reference shown.",
        },
      },
      {
        q: {
          fr: "Comment consulter l'historique de mes paiements ?",
          en: "How do I check my payment history?",
        },
        a: {
          fr: "L'historique des recharges et débits est visible directement sur la page [Mon Portefeuille](/wallet).",
          en: "Your top-up and debit history is visible directly on the [My Wallet](/wallet) page.",
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
          fr: "Comment modifier mes informations personnelles ?",
          en: "How do I update my personal information?",
        },
        a: {
          fr: "Rendez-vous sur votre [Profil](/profile) pour modifier votre nom, votre numéro de téléphone, votre photo et votre langue préférée.",
          en: "Go to your [Profile](/profile) to update your name, phone number, photo and preferred language.",
        },
      },
      {
        q: {
          fr: "J'ai oublié mon mot de passe, comment le réinitialiser ?",
          en: "I forgot my password, how do I reset it?",
        },
        a: {
          fr: "Sur l'écran de connexion, cliquez sur « Mot de passe oublié » puis suivez les instructions envoyées par email pour définir un nouveau mot de passe.",
          en: "On the login screen, click \"Forgot password\" and follow the instructions sent by email to set a new password.",
        },
      },
      {
        q: {
          fr: "Mon solde ou mes réservations ne s'affichent pas, que faire ?",
          en: "My balance or bookings aren't showing, what should I do?",
        },
        a: {
          fr: "Déconnectez-vous puis reconnectez-vous pour rafraîchir votre session. Si le problème persiste sur [Mes Réservations](/reservations) ou [Mon Portefeuille](/wallet), contactez easyticket@gmail.com.",
          en: "Log out and back in to refresh your session. If the issue persists on [My Bookings](/reservations) or [My Wallet](/wallet), contact easyticket@gmail.com.",
        },
      },
      {
        q: {
          fr: "Mon compte est-il sécurisé ?",
          en: "Is my account secure?",
        },
        a: {
          fr: "Votre mot de passe est chiffré et jamais visible, même par notre équipe. Ne partagez jamais vos codes de retrait de colis (OTP) ni votre mot de passe avec qui que ce soit — l'équipe EasyTicket ne vous les demandera jamais par téléphone ou message.",
          en: "Your password is encrypted and never visible, even to our team. Never share your parcel pickup codes (OTP) or your password with anyone — the EasyTicket team will never ask for them by phone or message.",
        },
      },
    ],
  },
];
