export type Taxon='mammal'|'bird'|'reptile'|'amphibian'|'fish'|'invertebrate'|'fantasy';
export type Habitat='terrestrial'|'aquatic'|'semi-aquatic'|'aerial'|'subterranean'|'arboreal';
export interface Species {id:string;name:string;scientificName?:string;taxon:Taxon;habitats:Habitat[];diet:string[];temperament:'peaceful'|'fearful'|'territorial'|'curious'|'aggressive';tameable:boolean;fictional:boolean}
