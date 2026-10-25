import { SPECIES_BY_ID } from "../data/species.ts";
import type { DiscoveryFlags, SpeciesId } from "../types.ts";
import { emptyDiscovery } from "../persistence/save.ts";

export function noteSight(flags: DiscoveryFlags): DiscoveryFlags {
  if (flags.seen && flags.habitat) return flags;
  return { ...flags, seen: true, habitat: true };
}

export function noteBehavior(flags: DiscoveryFlags): DiscoveryFlags {
  if (!flags.seen || flags.behavior) return flags;
  return { ...flags, behavior: true };
}

export function noteInteraction(flags: DiscoveryFlags): DiscoveryFlags {
  return { ...flags, seen: true, habitat: true, interacted: true };
}

export function researchProgress(flags: DiscoveryFlags): number {
  return (flags.seen ? 25 : 0) + (flags.habitat ? 25 : 0) + (flags.behavior ? 25 : 0) + (flags.interacted ? 25 : 0);
}

export type CatalogEntry = {
  id: SpeciesId;
  known: boolean;
  name: string;
  scientific: string | null;
  summary: string;
  biological: string;
  ecological: string;
  habitat: string;
  dietLabel: string;
  temperamentLabel: string;
  rarityLabel: string;
  activity: string;
  curiosity: string;
  abilities: readonly string[];
  domesticable: boolean;
  progress: number;
  flags: DiscoveryFlags;
};

export function catalogView(book: Partial<Record<SpeciesId, DiscoveryFlags>>): CatalogEntry[] {
  return (Object.keys(SPECIES_BY_ID) as SpeciesId[]).map((id) => {
    const species = SPECIES_BY_ID[id];
    const flags = book[id] ?? emptyDiscovery();
    const known = flags.seen;
    return {
      id,
      known,
      name: known ? species.name : "Espécie não registrada",
      scientific: known ? species.scientific : null,
      summary: known ? species.summary : "Aproxime-se o bastante para o diário guardar um rastro.",
      biological: known ? species.biological : "—",
      ecological: known ? species.ecological.join(" · ") : "—",
      habitat: flags.habitat ? species.habitat : "Habitat ainda não anotado",
      dietLabel: known ? species.dietLabel : "—",
      temperamentLabel: flags.behavior ? species.temperamentLabel : "Comportamento não observado",
      rarityLabel: known ? species.rarityLabel : "—",
      activity: known ? species.activity : "—",
      curiosity: flags.behavior ? species.curiosity : "Fique perto, sem correr, até o diário completar a observação.",
      abilities: flags.interacted ? species.abilities : [],
      domesticable: known ? species.domesticable : false,
      progress: researchProgress(flags),
      flags,
    };
  });
}
