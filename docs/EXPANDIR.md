# Como expandir o EcoWild

O jogo foi preparado para crescer por **dados**: uma região nova ou uma espécie nova não exigem mudanças espalhadas pela simulação. Este guia é o caminho padrão. Leia também [ARCHITECTURE](ARCHITECTURE.md) e a visão fundadora em [PROJECT_SPEC](PROJECT_SPEC.md).

## Adicionar uma região (bioma)

1. **Crie `src/game/world/regions/<id>.ts`** exportando um `RegionDef` (tipo em `world/region.ts`). Ele descreve tudo da região:
   - `heightAt(x, z)`: relevo puro e determinístico, incluindo a bacia de água;
   - `water`: centro, raio visual (`disc`) e `swimRadius` dos peixes;
   - `trail`, `trees` (com `kind`), `rocks` e `mounds`;
   - `props` (frutos, ovos, lobeiras…) e `creatures` (spawns com fome e sede iniciais);
   - `spawn`, `camp` (com ou sem `tent`/`incubator`), `territory`, `perch`, `nests`, `burrows` e `eagleCircuit`;
   - `exits`, com o ponto de chegada em outra região, e sempre uma saída de volta;
   - `sign`, `palette` (solo, céu, folhas, tronco, capim, água), `labels`, `highlights` e `guide` (texto do Guia).
2. **Registre** em `world/regions/index.ts` com `registerRegion(...)`.
3. **Ligue** a região adicionando uma saída numa região existente.
4. **Acrescente o ID** ao tipo `RegionId` em `world/region.ts`.
5. **Rode `npm test`**. `tests/regions.test.ts` aplica o *contrato de região* a toda região registrada:
   - spawns, props e saídas dentro do mundo, fora de água funda e de obstáculos;
   - saídas com chegada válida e caminho de volta;
   - espécies que declaram a região;
   - IDs únicos entre regiões.

Use IDs com prefixo da região para props e criaturas (ex.: `v-wolfapple-0`). O save guarda o estado de todas as regiões pelo ID, e `schema.ts` lê a lista de IDs válidos do registro automaticamente.

Novos tipos de árvore entram em `world/treeShapes.ts`; renderizador e câmera usam a mesma tabela.

## Adicionar uma espécie

1. **Acrescente o ID** a `SpeciesId` em `types.ts`.
2. **Crie a ficha** em `data/species.ts`. Os campos que mudam o comportamento são dados:
   - `group`, `ecological` e `regions`;
   - `activeAt` (`day`/`night`/`twilight`/`any`) e `temperament`;
   - `diet` e `feeds` (`berry`, `wolfapple`, `mound`…);
   - `predators` (quem a assusta);
   - `traits`: `glows`, `burrows`, `basks`, `aquatic`, `swims`, `flies` e `portrait`;
   - `reproduction`. Ovos só para ovíparos reais; `fantasy-egg` só para fantasia identificada;
   - `tameMethod` (`none`, `bond` ou `assisted`), `offering` e `assist` (`{ by, kind: "calm" | "glow" }`) para domesticação assistida.
3. **Crie o modelo** com `Sculpt` em `render/creatures/` e registre-o em `render/actors.ts`. O teste de rigs exige pés no chão (exceto voadores e aquáticos), menos de 8.000 triângulos e materiais compartilhados.
4. **Coloque spawns** na região (`creatures`) e escreva fatos verificáveis no diário, com a referência em [ASSETS](ASSETS.md). Fantasia sempre rotulada.
5. Um desafio novo, se fizer sentido, entra em `progression/challenges.ts`.

Se a espécie precisar de uma locomoção realmente nova (planar, escavar túneis, mergulhar), crie um traço novo e trate-o em `updateCreature`. Não use `if (speciesId === …)`.

## Itens e save

Item novo de bolsa:

- campo em `inventory` (`types.ts` e `sim/simulation.ts`);
- limite em `persistence/schema.ts`;
- `PropKind` em `world/region.ts`;
- modelo em `render/forest.ts`;
- texto na bolsa (`ui/panels.ts`) e no minimapa.

Mudança de formato do save → **nova versão do schema**:

- `SaveV<n>` em `types.ts`;
- `migrateSave` aceitando todas as anteriores;
- teste de migração.

Nunca reescrever um save sem migração nem descartar versões desconhecidas.

## Desempenho

Só uma região fica carregada por vez: viajar descarta a cena antiga e constrói a nova (`EcoWildGame.rebuildWorld`). Criaturas de outras regiões ficam congeladas na simulação (`sim.away`) e não custam CPU. Ao crescer o número de espécies por região, meça antes de otimizar (LOD de modelos, instancing).
