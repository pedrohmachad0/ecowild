# Assets e conteúdo

## Origem dos assets

- Mundo/personagem: primitivas e geometria procedural locais em `src/game/render/`, ainda simplificadas. Nenhum modelo/textura de terceiros foi baixado.
- Fauna v2 (27/10/2026): geometria original construída no código em `render/creatures/{sculpt,herbivores,canids,eagle}.ts`. Seções esculpidas, esferas reduzidas e peças mescladas por articulação, cores por vértice e luminosidade própria da Auryn. Capivara com focinho largo/orelhas altas; tapiti marrom com orelhas curtas; lobo cinzento com juba e cauda; águia-real marrom com nuca dourada, bico curvo e penas; Auryn verde-petróleo, creme e dourado com orelhas foliares/cauda luminosa. Não são modelos baixados, imagens geradas ou assets extraídos de outro jogo. Incorporados como código próprio do EcoWild, sem licença de terceiro adicional. Não houve mudança no licenciamento geral do repositório.
- Capturas em `docs/evidence/2026-10-27-fauna/` foram produzidas no Chromium a partir do Babylon real. O estúdio tem luz e chão próprios para comparação; não representa a iluminação da mata. A captura landscape mostra a interface real. Não são concept arts nem renders de ferramenta externa.
- Fauna da expansão (04/11/2026): tatu-galinha, sapo-cururu, lambari, teiú e musgarim em `render/creatures/smallfauna.ts`, geometria original com o mesmo `Sculpt`, sem downloads. Acampamento, ninhos, tocas e vaga-lumes são primitivas locais em `render/forest.ts`. Fotos do diário são capturas do próprio canvas do jogo no navegador do jogador.
- Expansão Vereda do Cerrado: tamanduá-bandeira, seriema, lobo-guará e brasalume em `render/creatures/cerrado.ts`; buritis, árvores tortas, cupinzeiros e lobeiras em `render/forest.ts`. Tudo geometria original, sem downloads.
- Expansão Baía do Pantanal: jacaré e tuiuiú em `render/creatures/pantanal.ts`; carandá em `world/treeShapes.ts`. Geometria original, sem downloads.
- Solo/placa: Canvas 2D/DynamicTexture gerados em `render/forest.ts`; fontes genéricas locais do sistema.
- Áudio: vento sintetizado e osciladores em `audio/ambience.ts`, sem arquivos externos.
- `public/icons/*.png`: marca geométrica original desta rodada, árvore verde com ponto dourado sobre fundo verde escuro; desenhada localmente com Pillow, sem fonte, imagem ou marca de terceiros. Tamanhos 192/512 e Apple 180; conteúdo central dentro da área segura do ícone maskable. Incorporada como asset próprio do projeto, sem restrição de terceiro.
- Babylon/Vite/Vitest/TypeScript continuam sujeitos às licenças de suas dependências. Esta rodada não acrescentou dependências de runtime/teste via npm nem introduziu um novo licenciamento geral para o repositório.

## Conteúdo educativo

As espécies do mapa não compartilham necessariamente a mesma distribuição natural. Referências para revisão editorial das fichas, sem downloads ou requests do jogo:

- Capivara (*Hydrochoerus hydrochaeris*): [Animal Diversity Web](https://animaldiversity.org/accounts/Hydrochoerus_hydrochaeris/) — semiaquática, olhos/orelhas/narinas no alto da cabeça.
- Tapiti (*Sylvilagus brasiliensis*): [Animal Diversity Web](https://animaldiversity.org/accounts/Sylvilagus_brasiliensis/) — herbívoro sul-americano; o grupo possui revisões taxonômicas. O protótipo usa identificação simplificada, não uma chave de identificação de campo.
- Lobo-cinzento (*Canis lupus*): [Animal Diversity Web](https://animaldiversity.org/accounts/Canis_lupus/) — grupos familiares e distribuição no hemisfério norte.
- Tatu-galinha (*Dasypus novemcinctus*): [Animal Diversity Web](https://animaldiversity.org/accounts/Dasypus_novemcinctus/) — noturno, cava tocas, visão fraca, poliembrionia (quatro filhotes idênticos).
- Sapo-cururu (*Rhinella diptycha*): anfíbio sul-americano com glândulas paratoides tóxicas; desova em cordões na água. Nome científico segundo a taxonomia atual do grupo *Rhinella*; revisar com fonte herpetológica antes de material didático.
- Lambari (*Astyanax* sp.): nome popular de muitas espécies do gênero; o diário registra só o gênero de propósito.
- Teiú (*Salvator merianae*): [Animal Diversity Web](https://animaldiversity.org/accounts/Salvator_merianae/) — onívoro, diurno, termorregula ao sol, brumação no frio, ovos às vezes em cupinzeiros.
- Tamanduá-bandeira (*Myrmecophaga tridactyla*): [Animal Diversity Web](https://animaldiversity.org/accounts/Myrmecophaga_tridactyla/) — língua longa, visão fraca e olfato apurado, come pouco de cada colônia, filhote carregado nas costas.
- Seriema (*Cariama cristata*): [Animal Diversity Web](https://animaldiversity.org/accounts/Cariama_cristata/) — corre mais do que voa, canto alto, golpeia presas no chão.
- Lobo-guará (*Chrysocyon brachyurus*): [Animal Diversity Web](https://animaldiversity.org/accounts/Chrysocyon_brachyurus/) — gênero próprio, onívoro com grande parte de frutos (lobeira, *Solanum lycocarpum*), dispersor de sementes, tímido.
- Jacaré-do-pantanal (*Caiman yacare*): [Animal Diversity Web](https://animaldiversity.org/accounts/Caiman_yacare/) — termorregulação ao sol, determinação do sexo pela temperatura do ninho, cuidado parental.
- Tuiuiú (*Jabiru mycteria*): [Animal Diversity Web](https://animaldiversity.org/accounts/Jabiru_mycteria/) — grande cegonha das Américas, ave-símbolo do Pantanal, ninhos no alto de árvores.
- Águia-real (*Aquila chrysaetos*): [Animal Diversity Web](https://animaldiversity.org/accounts/Aquila_chrysaetos/) — hemisfério norte e predação de pequenos mamíferos.

Estas são referências editoriais, não fontes de assets. Não apresentamos as frases como citações literais. Auryn, musgarim, brasalume, frutiluz, ovos de musgarim e pulso calmo são fantasia original. O ato de beber no lago é uma abstração de jogo, não uma recomendação de beber água sem tratamento na natureza.
