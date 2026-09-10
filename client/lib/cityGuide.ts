export type City = {
  name: string;
  lat: number;
  lng: number;
  region: string;
  description: string;
  toSee: string[];
  tips: string[];
  travelTime: string; // depuis Douala
};

export const CITIES: City[] = [
  {
    name: "Douala",
    lat: 4.0511, lng: 9.7679,
    region: "Littoral",
    description: "Capitale économique du Cameroun, port principal et centre des affaires.",
    toSee: ["Port autonome", "Marché Central", "Quartier Bonanjo", "Musée de Douala"],
    tips: ["Évitez les heures de pointe 7h-9h et 17h-19h", "Le quartier Akwa est animé la nuit"],
    travelTime: "—",
  },
  {
    name: "Yaoundé",
    lat: 3.8667, lng: 11.5167,
    region: "Centre",
    description: "Capitale politique du Cameroun, ville des collines et siège des institutions.",
    toSee: ["Palais de l'Unité", "Musée National", "Cathédrale Notre-Dame", "Marché Mokolo"],
    tips: ["Prendre un taxi collectif depuis Mvan", "La ville est fraîche le soir"],
    travelTime: "~3h depuis Douala",
  },
  {
    name: "Bafoussam",
    lat: 5.4761, lng: 10.4175,
    region: "Ouest",
    description: "Capitale de la région de l'Ouest, cœur du pays Bamiléké.",
    toSee: ["Chefferie Bafoussam", "Marché artisanal", "Lac Baleng", "Musée des Grassfields"],
    tips: ["Célèbre pour ses sculptures sur bois", "Spécialité locale : le ndolé et le taro"],
    travelTime: "~5h depuis Douala",
  },
  {
    name: "Bamenda",
    lat: 5.9631, lng: 10.1591,
    region: "Nord-Ouest",
    description: "Capitale de la région du Nord-Ouest, porte d'entrée des hautes terres anglophones.",
    toSee: ["Ring Road", "Lac Awing", "Chefferie Bafut", "Commercial Avenue"],
    tips: ["Ville anglophone, avoir quelques mots d'anglais aide", "Temps frais en altitude"],
    travelTime: "~6h depuis Douala",
  },
  {
    name: "Garoua",
    lat: 9.3006, lng: 13.3978,
    region: "Nord",
    description: "Capitale de la région du Nord, ville du Bénoué et grande plaine.",
    toSee: ["Fleuve Bénoué", "Parc national de la Bénoué", "Grande Mosquée", "Marché de Garoua"],
    tips: ["Chaleur intense : partir tôt le matin", "Spécialité : viande de brousse et mil"],
    travelTime: "~12h depuis Douala",
  },
  {
    name: "Ngaoundéré",
    lat: 7.3228, lng: 13.5836,
    region: "Adamaoua",
    description: "Terminus du train de nuit depuis Yaoundé, ville peule sur le plateau de l'Adamaoua.",
    toSee: ["Lamidat de Ngaoundéré", "Lac Tison", "Grand marché", "Cathédrale Saint-Jacques"],
    tips: ["Le train de Yaoundé est confortable et ponctuel", "Altitude 1100m : nuits fraîches"],
    travelTime: "~8h depuis Yaoundé en train",
  },
  {
    name: "Bertoua",
    lat: 4.5784, lng: 13.6861,
    region: "Est",
    description: "Capitale de la région de l'Est, porte d'accès à la forêt équatoriale.",
    toSee: ["Forêt du Dja (UNESCO)", "Réserve de faune du Dja", "Parc national de Lobéké"],
    tips: ["Région riche en pygmées Baka", "Bien se couvrir contre les moustiques"],
    travelTime: "~5h depuis Yaoundé",
  },
  {
    name: "Kribi",
    lat: 2.9391, lng: 9.9095,
    region: "Sud",
    description: "Perle du Cameroun, station balnéaire aux plages de sable blanc.",
    toSee: ["Plage de Kribi", "Chutes de la Lobé", "Port en eau profonde", "Pêche artisanale"],
    tips: ["Meilleure saison : décembre à février", "Spécialité : poisson braisé sur la plage"],
    travelTime: "~3h depuis Douala",
  },
  {
    name: "Limbé",
    lat: 4.0229, lng: 9.2128,
    region: "Sud-Ouest",
    description: "Ancienne capitale coloniale au pied du Mont Cameroun, plages de sable volcanique.",
    toSee: ["Jardins botaniques", "Zoo de Limbé", "Down Beach", "Mont Cameroun"],
    tips: ["Ville anglophone", "Idéal pour les randonnées sur le volcan"],
    travelTime: "~1h depuis Douala",
  },
  {
    name: "Maroua",
    lat: 10.5921, lng: 14.3163,
    region: "Extrême-Nord",
    description: "Capitale de l'Extrême-Nord, porte du désert et de la culture kanuri.",
    toSee: ["Marché artisanal", "Parc de Waza", "Monts Mandara", "Rhumsiki"],
    tips: ["Chaleur extrême en saison sèche (>40°C)", "Porter des vêtements couvrants"],
    travelTime: "~16h depuis Douala",
  },
];

export const getCityByName = (name: string) =>
  CITIES.find(c => c.name.toLowerCase() === name.toLowerCase());

const toRad = (v: number) => (v * Math.PI) / 180;
const EARTH_RADIUS_KM = 6371;

/** Angle central (radians) entre deux points GPS — formule de haversine. */
function haversineAngle(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Distance réelle en kilomètres entre deux points GPS. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineAngle(a, b) * EARTH_RADIUS_KM;
}

/** Ville connue la plus proche des coordonnées GPS données. */
export function findNearestCity(lat: number, lng: number): City {
  let nearest = CITIES[0];
  let smallestAngle = Infinity;

  for (const city of CITIES) {
    const angle = haversineAngle({ lat, lng }, { lat: city.lat, lng: city.lng });
    if (angle < smallestAngle) {
      smallestAngle = angle;
      nearest = city;
    }
  }

  return nearest;
}
