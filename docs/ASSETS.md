# Assets e conteúdo

## Origem dos assets

- Mundo/personagem: primitivas e geometria procedural locais em `src/game/render/`, ainda simplificadas. Nenhum modelo/textura de terceiros foi baixado.
- Fauna v2 (27/10/2026): geometria original construída no código em `render/creatures/{sculpt,herbivores,canids,eagle}.ts`. Seções esculpidas, esferas reduzidas e peças mescladas por articulação, cores por vértice e luminosidade própria da Auryn. Capivara com focinho largo/orelhas altas; tapiti marrom com orelhas curtas; lobo cinzento com juba e cauda; águia-real marrom com nuca dourada, bico curvo e penas; Auryn verde-petróleo, creme e dourado com orelhas foliares/cauda luminosa. Não são modelos baixados, imagens geradas ou assets extraídos de outro jogo. Incorporados como código próprio do EcoWild, sem licença de terceiro adicional. Não houve mudança no licenciamento geral do repositório.
- Capturas em `docs/evidence/2026-10-27-fauna/` foram produzidas no Chromium a partir do Babylon real. O estúdio tem luz e chão próprios para comparação; não representa a iluminação da mata. A captura landscape mostra a interface real. Não são concept arts nem renders de ferramenta externa.
- Solo/placa: Canvas 2D/DynamicTexture gerados em `render/forest.ts`; fontes genéricas locais do sistema.
- Áudio: vento sintetizado e osciladores em `audio/ambience.ts`, sem arquivos externos.
- `public/icons/*.png`: marca geométrica original desta rodada, árvore verde com ponto dourado sobre fundo verde escuro; desenhada localmente com Pillow, sem fonte, imagem ou marca de terceiros. Tamanhos 192/512 e Apple 180; conteúdo central dentro da área segura do ícone maskable. Incorporada como asset próprio do projeto, sem restrição de terceiro.
- Babylon/Vite/Vitest/TypeScript continuam sujeitos às licenças de suas dependências. Esta rodada não acrescentou dependências de runtime/teste via npm nem introduziu um novo licenciamento geral para o repositório.

## Conteúdo educativo

As espécies do mapa não compartilham necessariamente a mesma distribuição natural. Referências para revisão editorial das fichas, sem downloads ou requests do jogo:

- Capivara (*Hydrochoerus hydrochaeris*): [Animal Diversity Web](https://animaldiversity.org/accounts/Hydrochoerus_hydrochaeris/) — semiaquática, olhos/orelhas/narinas no alto da cabeça.
- Tapiti (*Sylvilagus brasiliensis*): [Animal Diversity Web](https://animaldiversity.org/accounts/Sylvilagus_brasiliensis/) — herbívoro sul-americano; o grupo possui revisões taxonômicas. O protótipo usa identificação simplificada, não uma chave de identificação de campo.
- Lobo-cinzento (*Canis lupus*): [Animal Diversity Web](https://animaldiversity.org/accounts/Canis_lupus/) — grupos familiares e distribuição no hemisfério norte.
- Águia-real (*Aquila chrysaetos*): [Animal Diversity Web](https://animaldiversity.org/accounts/Aquila_chrysaetos/) — hemisfério norte e predação de pequenos mamíferos.

Estas são referências editoriais, não fontes de assets. Não apresentamos as frases como citações literais. Auryn, frutiluz e pulso de proteção são fantasia original. O ato de beber no lago é uma abstração de jogo, não uma recomendação de beber água sem tratamento na natureza.
