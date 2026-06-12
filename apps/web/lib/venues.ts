export interface Venue {
  stadium: string;
  city: string;
  country: string;
}

const VENUES: Record<string, Venue> = {
  // Group A
  "G-A-1-MEXRSA": { stadium: "Estadio Azteca", city: "Mexico City", country: "México" },
  "G-A-1-KORCZE": { stadium: "Estadio Akron", city: "Guadalajara", country: "México" },
  "G-A-2-CZERSA": { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  "G-A-2-MEXKOR": { stadium: "Estadio Akron", city: "Guadalajara", country: "México" },
  "G-A-3-CZEMEX": { stadium: "Estadio Azteca", city: "Mexico City", country: "México" },
  "G-A-3-RSAKOR": { stadium: "Estadio BBVA", city: "Monterrey", country: "México" },
  // Group B
  "G-B-1-CANBIH": { stadium: "BMO Field", city: "Toronto", country: "Canadá" },
  "G-B-1-QATSUI": { stadium: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  "G-B-2-SUIBIH": { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "G-B-2-CANQAT": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  "G-B-3-SUICAN": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  "G-B-3-BIHQAT": { stadium: "Lumen Field", city: "Seattle", country: "EUA" },
  // Group C
  "G-C-1-BRAMAR": { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  "G-C-1-HAISCO": { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "G-C-2-SCOMAR": { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "G-C-2-BRAHAI": { stadium: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  "G-C-3-SCOBRA": { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "G-C-3-MARHAI": { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  // Group D
  "G-D-1-USAPAR": { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "G-D-1-AUSTUR": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  "G-D-2-USAAUS": { stadium: "Lumen Field", city: "Seattle", country: "EUA" },
  "G-D-2-TURPAR": { stadium: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  "G-D-3-TURUSA": { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "G-D-3-PARAUS": { stadium: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  // Group E
  "G-E-1-GERCUW": { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "G-E-1-CIVECU": { stadium: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  "G-E-2-GERCIV": { stadium: "BMO Field", city: "Toronto", country: "Canadá" },
  "G-E-2-ECUCUW": { stadium: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  "G-E-3-CUWCIV": { stadium: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  "G-E-3-ECUGER": { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  // Group F
  "G-F-1-NEDJPN": { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "G-F-1-SWETUN": { stadium: "Estadio BBVA", city: "Monterrey", country: "México" },
  "G-F-2-NEDSWE": { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "G-F-2-TUNJPN": { stadium: "Estadio BBVA", city: "Monterrey", country: "México" },
  "G-F-3-JPNSWE": { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "G-F-3-TUNNED": { stadium: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  // Group G
  "G-G-1-BELEGY": { stadium: "Lumen Field", city: "Seattle", country: "EUA" },
  "G-G-1-IRNNZL": { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "G-G-2-BELIRN": { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "G-G-2-NZLEGY": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  "G-G-3-EGYIRN": { stadium: "Lumen Field", city: "Seattle", country: "EUA" },
  "G-G-3-NZLBEL": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  // Group H
  "G-H-1-ESPCPV": { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  "G-H-1-KSAURU": { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "G-H-2-ESPKSA": { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  "G-H-2-URUCPV": { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "G-H-3-CPVKSA": { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "G-H-3-URUESP": { stadium: "Estadio Akron", city: "Guadalajara", country: "México" },
  // Group I
  "G-I-1-FRASEN": { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  "G-I-1-IRQNOR": { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "G-I-2-FRAIRQ": { stadium: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  "G-I-2-NORSEN": { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  "G-I-3-NORFRA": { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "G-I-3-SENIRQ": { stadium: "BMO Field", city: "Toronto", country: "Canadá" },
  // Group J
  "G-J-1-ARGALG": { stadium: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  "G-J-1-AUTJOR": { stadium: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  "G-J-2-ARGAUT": { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "G-J-2-JORALG": { stadium: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  "G-J-3-ALGAUT": { stadium: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  "G-J-3-JORARG": { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  // Group K
  "G-K-1-PORCOD": { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "G-K-1-UZBCOL": { stadium: "Estadio Azteca", city: "Mexico City", country: "México" },
  "G-K-2-PORUZB": { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "G-K-2-COLCOD": { stadium: "Estadio Akron", city: "Guadalajara", country: "México" },
  "G-K-3-COLPOR": { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "G-K-3-CODUZB": { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  // Group L
  "G-L-1-ENGCRO": { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "G-L-1-GHAPAN": { stadium: "BMO Field", city: "Toronto", country: "Canadá" },
  "G-L-2-ENGGHA": { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "G-L-2-PANCRO": { stadium: "BMO Field", city: "Toronto", country: "Canadá" },
  "G-L-3-PANENG": { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  "G-L-3-CROGHA": { stadium: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  // Round of 32
  "R32-1":  { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "R32-2":  { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "R32-3":  { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "R32-4":  { stadium: "Estadio BBVA", city: "Monterrey", country: "México" },
  "R32-5":  { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "R32-6":  { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  "R32-7":  { stadium: "Estadio Azteca", city: "Mexico City", country: "México" },
  "R32-8":  { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  "R32-9":  { stadium: "Lumen Field", city: "Seattle", country: "EUA" },
  "R32-10": { stadium: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  "R32-11": { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "R32-12": { stadium: "BMO Field", city: "Toronto", country: "Canadá" },
  "R32-13": { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  "R32-14": { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "R32-15": { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "R32-16": { stadium: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  // Round of 16
  "R16-1":  { stadium: "NRG Stadium", city: "Houston", country: "EUA" },
  "R16-2":  { stadium: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  "R16-3":  { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
  "R16-4":  { stadium: "Estadio Azteca", city: "Mexico City", country: "México" },
  "R16-5":  { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "R16-6":  { stadium: "Lumen Field", city: "Seattle", country: "EUA" },
  "R16-7":  { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  "R16-8":  { stadium: "BC Place", city: "Vancouver", country: "Canadá" },
  // Quarter-Finals
  "QF-1":   { stadium: "Gillette Stadium", city: "Boston", country: "EUA" },
  "QF-2":   { stadium: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  "QF-3":   { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "QF-4":   { stadium: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  // Semi-Finals
  "SF-1":   { stadium: "AT&T Stadium", city: "Dallas", country: "EUA" },
  "SF-2":   { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  // Third Place & Final
  "THIRD-1": { stadium: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  "FINAL-1": { stadium: "MetLife Stadium", city: "New York/NJ", country: "EUA" },
};

export function venue(key: string): Venue | undefined {
  return VENUES[key];
}
