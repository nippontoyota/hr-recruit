/** Nippon Toyota branch offices — maps links for WhatsApp invite messages */

export interface BranchLocation {
  name: string;
  address: string;
  mapsUrl: string;
}

export const BRANCH_LOCATIONS: BranchLocation[] = [
  {
    name: 'Enchakkal',
    address: 'Nippon Toyota, Enchakkal, Thiruvananthapuram',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Enchakkal+Thiruvananthapuram',
  },
  {
    name: 'Kazhakootam',
    address: 'Nippon Toyota, Kazhakootam, Thiruvananthapuram',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Kazhakootam',
  },
  {
    name: 'Kochuveli',
    address: 'Nippon Toyota, Kochuveli, Thiruvananthapuram',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Kochuveli',
  },
  {
    name: 'Kalamassery',
    address: 'Nippon Toyota, Kalamassery, Kochi',
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Nippon+Toyota+Kalamassery&destination_place_id=ChIJY4b1sS0MCDsRJNItKoFWoFg',
  },
  {
    name: 'Kalamassery (Nippon Towers)',
    address: 'Nippon Towers, Kalamassery, Kochi',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Nippon+Towers+Kalamassery',
  },
  {
    name: 'Trivandrum',
    address: 'Nippon Toyota, Trivandrum',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Trivandrum',
  },
  {
    name: 'Kollam',
    address: 'Nippon Toyota, Kollam',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Kollam',
  },
  {
    name: 'Cochin',
    address: 'Nippon Toyota, Cochin',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Cochin',
  },
  {
    name: 'Thrissur',
    address: 'Nippon Toyota, Thrissur',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Thrissur',
  },
  {
    name: 'Kottayam',
    address: 'Nippon Toyota, Kottayam',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Kottayam',
  },
  {
    name: 'Nettoor',
    address: 'Nippon Toyota, Nettoor, Kochi',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Nettoor+Kochi',
  },
  {
    name: 'Muvattupuzha',
    address: 'Nippon Toyota, Muvattupuzha',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Muvattupuzha',
  },
  {
    name: 'Puzhakkal (Ayyanthole)',
    address: 'Nippon Toyota, Puzhakkal, Thrissur',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Puzhakkal+Thrissur',
  },
  {
    name: 'Nadathara',
    address: 'Nippon Toyota, Nadathara, Thrissur',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Nadathara',
  },
  {
    name: 'Vellangallur (Irinjalakuda)',
    address: 'Nippon Toyota, Vellangallur, Irinjalakuda',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Irinjalakuda',
  },
  {
    name: 'Nattakom',
    address: 'Nippon Toyota, Nattakom, Kottayam',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Nattakom+Kottayam',
  },
  {
    name: 'Thellakom',
    address: 'Nippon Toyota, Thellakom, Kottayam',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Thellakom',
  },
  {
    name: 'Pala',
    address: 'Nippon Toyota, Pala, Kottayam',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Pala',
  },
  {
    name: 'Kottiyam (Kollam)',
    address: 'Nippon Toyota, Kottiyam, Kollam',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Kottiyam+Kollam',
  },
  {
    name: 'Pathanamthitta',
    address: 'Nippon Toyota, Pathanamthitta',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Pathanamthitta',
  },
  {
    name: 'Thiruvalla',
    address: 'Nippon Toyota, Thiruvalla',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Thiruvalla',
  },
  {
    name: 'Kayamkulam',
    address: 'Nippon Toyota, Kayamkulam, Alappuzha',
    mapsUrl: 'https://maps.google.com/?q=Nippon+Toyota+Kayamkulam',
  },
];

export function findBranch(name?: string | null): BranchLocation | undefined {
  if (!name) return undefined;
  return BRANCH_LOCATIONS.find(
    (b) => b.name.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(b.name.toLowerCase().split(' ')[0])
  );
}

export function defaultBranchName(candidateBranch?: string | null): string {
  return findBranch(candidateBranch)?.name ?? candidateBranch ?? BRANCH_LOCATIONS[3].name;
}
