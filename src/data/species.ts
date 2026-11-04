import type { Habitat, Species } from '../entities/Species';
import { SPECIES } from '../game/data/species';

const HABITAT: Record<string, Habitat> = {
  Terrestre: 'terrestrial', Semiaquática: 'semi-aquatic', Semiaquático: 'semi-aquatic', Aquático: 'aquatic',
  Voadora: 'aerial', Subterrâneo: 'subterranean', Arborícola: 'arboreal',
};

/** Compatibility view for the original foundation; gameplay uses SPECIES directly.
 * lumifox was the historical ID of the creature now called Auryn, not another species.
 */
export const species: Species[] = SPECIES.map(profile => ({
  id: profile.id === 'auryn' ? 'lumifox' : profile.id,
  name: profile.name,
  scientificName: profile.scientific ?? undefined,
  taxon: profile.group,
  habitats: profile.ecological.map(e => HABITAT[e] ?? 'terrestrial'),
  diet: [profile.diet],
  temperament: ({ calm: 'peaceful', skittish: 'fearful', territorial: 'territorial', curious: 'curious', predatory: 'aggressive' } as const)[profile.temperament],
  tameable: profile.domesticable,
  fictional: profile.scientific === null,
}));
