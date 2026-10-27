import type { Diet, SpeciesId, Temperament } from "../types.ts";

export type SpeciesProfile = {
  id: SpeciesId;
  name: string;
  scientific: string | null;
  summary: string;
  biological: string;
  ecological: readonly string[];
  habitat: string;
  diet: Diet;
  dietLabel: string;
  speed: number;
  strength: number;
  defense: number;
  stamina: number;
  perception: number;
  temperament: Temperament;
  temperamentLabel: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  rarityLabel: string;
  domesticable: boolean;
  activity: string;
  abilities: readonly string[];
  curiosity: string;
  fleeRadius: number;
  sight: number;
  /** Original articulated, vertex-coloured geometry; no external model download. */
  representation: "procedural-stylized-v2";
};

export const SPECIES: readonly SpeciesProfile[] = [
  {
    id: "capybara",
    name: "Capivara",
    scientific: "Hydrochoerus hydrochaeris",
    summary: "O maior roedor do mundo. Na mata, fica à beira d'água e quase não se importa com quem passa devagar.",
    biological: "Mamífero",
    ecological: ["Terrestre", "Semiaquática"],
    habitat: "Margens de lago e capinzais úmidos",
    diet: "herbivore",
    dietLabel: "Herbívora",
    speed: 2.4,
    strength: 3,
    defense: 4,
    stamina: 5,
    perception: 3,
    temperament: "calm",
    temperamentLabel: "Pacífica",
    rarity: "common",
    rarityLabel: "Comum",
    domesticable: false,
    activity: "Crepuscular",
    abilities: ["Flutua", "Descansa em grupo"],
    curiosity: "Capivaras têm os olhos, as orelhas e as narinas no alto da cabeça, o que ajuda a observar e respirar com o corpo na água.",
    fleeRadius: 4.2,
    sight: 16,
    representation: "procedural-stylized-v2",
  },
  {
    id: "rabbit",
    name: "Coelho-tapiti",
    scientific: "Sylvilagus brasiliensis",
    summary: "Pequeno, atento e pronto para sumir. Ouve um passo apressado antes de ver quem chegou.",
    biological: "Mamífero",
    ecological: ["Terrestre"],
    habitat: "Clareiras e beira de trilha",
    diet: "herbivore",
    dietLabel: "Herbívoro",
    speed: 6.4,
    strength: 1,
    defense: 1,
    stamina: 3,
    perception: 5,
    temperament: "skittish",
    temperamentLabel: "Arisco",
    rarity: "common",
    rarityLabel: "Comum",
    domesticable: false,
    activity: "Crepuscular",
    abilities: ["Fuga de ameaças", "Audição ampla"],
    curiosity: "Não cava tocas fundas como o coelho europeu. Descansa em formas rasas no chão, escondidas na grama.",
    fleeRadius: 7.5,
    sight: 15,
    representation: "procedural-stylized-v2",
  },
  {
    id: "wolf",
    name: "Lobo-cinzento",
    scientific: "Canis lupus",
    summary: "Predador de matilha. Nesta mata estilizada defende um território pequeno e caça coelhos quando a fome aperta.",
    biological: "Mamífero",
    ecological: ["Terrestre"],
    habitat: "Bosque fechado a oeste",
    diet: "carnivore",
    dietLabel: "Carnívoro",
    speed: 5.6,
    strength: 6,
    defense: 4,
    stamina: 6,
    perception: 6,
    temperament: "territorial",
    temperamentLabel: "Territorial",
    rarity: "uncommon",
    rarityLabel: "Incomum",
    domesticable: false,
    activity: "Atividade variável",
    abilities: ["Perseguição", "Investida curta"],
    curiosity: "Alcateias costumam ser grupos familiares. O lobo-cinzento não é nativo do Brasil: sua presença nesta mata faz parte do cenário imaginário.",
    fleeRadius: 5,
    sight: 18,
    representation: "procedural-stylized-v2",
  },
  {
    id: "eagle",
    name: "Águia-real",
    scientific: "Aquila chrysaetos",
    summary: "Patrulha o céu da clareira. Mergulha sobre presas pequenas e ignora quem fica no chão sem alvoroço.",
    biological: "Ave",
    ecological: ["Voadora"],
    habitat: "Céu aberto sobre o lago",
    diet: "carnivore",
    dietLabel: "Carnívora",
    speed: 9,
    strength: 5,
    defense: 3,
    stamina: 7,
    perception: 9,
    temperament: "predatory",
    temperamentLabel: "Predadora",
    rarity: "uncommon",
    rarityLabel: "Incomum",
    domesticable: false,
    activity: "Diurna",
    abilities: ["Voo planado", "Mergulho"],
    curiosity: "A águia-real ocorre no hemisfério norte e caça principalmente pequenos mamíferos. Esta mata reúne faunas de regiões diferentes; não representa um ecossistema brasileiro real.",
    fleeRadius: 0,
    sight: 32,
    representation: "procedural-stylized-v2",
  },
  {
    id: "auryn",
    name: "Auryn",
    scientific: null,
    summary: "Criatura original da mata. Come frutiluz, evita pressa e só acompanha quem ficou tempo bastante sem assustá-la.",
    biological: "Criatura fantástica",
    ecological: ["Terrestre"],
    habitat: "Bosque do orvalho, a sudoeste",
    diet: "frugivore",
    dietLabel: "Frugívora",
    speed: 5.1,
    strength: 3,
    defense: 3,
    stamina: 5,
    perception: 7,
    temperament: "curious",
    temperamentLabel: "Curiosa",
    rarity: "legendary",
    rarityLabel: "Rara",
    domesticable: true,
    activity: "Diurna",
    abilities: ["Pulso calmo", "Vínculo"],
    curiosity: "O pulso calmo não é um ataque. Ele faz predadores perderem o foco por um instante — o bastante para a presa sair do alcance.",
    fleeRadius: 6,
    sight: 18,
    representation: "procedural-stylized-v2",
  },
];

export const SPECIES_BY_ID: Record<SpeciesId, SpeciesProfile> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
) as Record<SpeciesId, SpeciesProfile>;
