# Arquitetura verificada

Stack: Babylon.js 7.54.3, TypeScript estrito, Vite 6, HTML/CSS e Vitest. Sem servidor de gameplay, tracking, assets remotos ou física externa.

## Fluxo ativo

1. `src/main.ts` compõe jogo, DOM, acessibilidade, menus, controles touch e PWA.
2. `game/input/InputManager.ts` transforma teclado/mouse/gamepad/toque em ações semânticas. `input/touch.ts` mantém um ponteiro por região e ciclo de vida com AbortController. Pulsos de ação ficam pendentes no orquestrador até o próximo tick, inclusive em displays acima de 60 Hz.
3. `game/EcoWildGame.ts` orquestra engine, cena, câmera, passos fixos de 1/60 s, painéis, áudio, qualidade e gravação. Delta limitado a 50 ms e até cinco passos por frame. Todos os painéis pausam; blur/aba oculta abre pausa. Volta exige ação do jogador.
4. `game/sim/simulation.ts` contém estado puro, movimento, IA, coleta, descoberta e vínculo. `sim/interaction.ts` escolhe o mesmo alvo para prompt e interação. `ai/brain.ts` decide prioridades; `taming/bond.ts` valida oferta e confiança; `catalog/discoveries.ts` produz fichas graduais.
5. `game/data/species.ts` é a fonte ativa dos perfis; `world/layout.ts` fornece spawns, recursos e obstáculos; `world/terrain.ts` fornece altura, trilha, água visível e margem.
6. `render/forest.ts` e `render/actors.ts` projetam esse estado em meshes. Nenhuma mesh é serializada. Atores são criados uma vez e sincronizados por ID. Árvores/rochas são mescladas; grama usa thin instances; materiais de atores são compartilhados por cor. Câmera tem encurtamento por círculos de obstáculos e piso pelo terreno, não raycast completo de copa/mesh.
7. `ui/panels.ts` apresenta diário, bolsa, guia e ajustes; nomes de pets são escapados antes de HTML. `audio/ambience.ts` sintetiza vento/pássaros localmente e libera os nós de chirp ao terminar.
8. `persistence/schema.ts` valida v1 e normaliza campos conhecidos; `save.ts` executa transações IndexedDB com timeout, abort/error, fechamento e fila de escrita. `preferences.ts` guarda apenas qualidade/sensibilidade/deadzone em localStorage com fallback de sessão.

O orquestrador ainda é grande, assim como a simulação. A extração de interação, schema, touch e painéis reduz responsabilidades; separar percepção/navegação é o próximo passo, sem substituir o motor atual.

## IA, terreno e vínculo

Há 11 indivíduos de cinco espécies. Seleção de estado ocorre aproximadamente a 8 Hz, com fases iniciais distintas; locomoção e necessidades usam delta time. Consultas simples de vizinhança ainda ocorrem por passo para esses 11 atores: não há LOD de IA nem particionamento espacial. Aleatoriedade de criaturas tem seed. Percepção/discovery são por distância, sem linha de visão/cone ou memória sofisticada.

Colisão é planar por círculos de troncos/rochas mais limite circular; terreno e natação superficial controlam Y. Água funda só existe dentro do disco visível. Navegação local tem repulsão de obstáculos, não navmesh. Pet distante pode recuperar posição em terra livre; STAY não recupera automaticamente. A caça é uma abstração leve, com fuga/reposicionamento da presa. Não simula ecologia completa.

Confiança cresce com presença calma até 68, cai com corrida/ameaça. Oferta só é consumida após observação de três segundos, confiança ≥58, distância <2,4 m e ausência de ameaça; um frutiluz conclui vínculo. Isso elimina spam e perda dos poucos frutos disponíveis. Comandos FOLLOW/STAY/PROTECT/RETURN são aplicados diretamente, inclusive com pausa aberta; proteção exige proximidade real. Domesticação assistida por outro pet permanece futura.

## Persistência e compatibilidade

Schema de progresso continua v1: foi o único formato de save publicado na main. Normalização de dados v1 é coberta por testes; versões futuras são recusadas. Não alegar migração de um formato anterior inexistente. Campos desconhecidos não entram na simulação. Apenas IDs do layout e espécies conhecidas são restaurados; só Auryn pode estar domesticada. Restauração corrige posições fora dos limites/obstáculos.

A fila captura snapshots independentes e aguarda commit, não apenas sucesso de `put`. A primeira gravação de um novo jogo confirmado copia `primary` para `backup` na mesma transação. Falha de leitura não significa slot vazio. Falhas de armazenamento não apagam progresso. Saves antigos ainda fornecem preferências como fallback; novas preferências ficam separadas. O campo `settings` v1 é mantido por compatibilidade. Escritas entre abas diferentes ainda não possuem arbitragem; usar uma aba por sessão.

## Duas fundações

A entrada ativa importa `src/game/`. `src/camera`, `src/player`, `src/controls/Input.ts` e `src/world/MataDaNascente.ts` pertencem à fundação do PR #2 e não inicializam uma segunda cena. Os utilitários e testes históricos continuam preservados. `src/data/species.ts` virou uma **projeção de compatibilidade** do catálogo ativo: mantém o ID histórico `lumifox` para consumidores antigos, com nome Auryn. Não há duas fontes de dados de espécie nem uma segunda criatura fantástica.

O PR #3/`chatgpt` foi lido e sua visão foi integrada manualmente na especificação/roadmap/decisões. Seu scaffolding antigo não foi mesclado. Nenhuma ref dessa branch foi alterada.

## PWA

`public/manifest.webmanifest` e ícones locais usam URLs relativas. `vite.config.ts` usa `base: './'`, pois nenhum destino de deploy está configurado. `scripts/build-sw.mjs` calcula hash dos arquivos do build, aplica orçamento de 8 MiB e gera `dist/sw.js` a partir de `scripts/sw-template.js`.

Instalação faz precache somente da lista explícita de HTML/JS/CSS/ícones/manifest locais. Não há cache oportunista de respostas externas. Navegações do shell usam HTML da versão ativa, coerente com os chunks cacheados. Uma versão nova espera; `src/pwa.ts` oferece atualizar após salvar, com bloqueio se outra aba do escopo estiver aberta. Ativação conserva a versão anterior durante a recarga e limita retenção a duas versões. Cache é isolado pelo caminho de hospedagem. IndexedDB nunca é limpo pelo SW.

Em desenvolvimento não há registro; testes de offline/update usam build/preview e servidor temporário sob `/ecowild/`. Registro/instalação não equivale a teste físico ou à instalação na tela inicial.

## Contratos e dependências

Diretrizes de evolução incorporadas do PR #3. Os nomes abaixo são responsabilidades e contratos-alvo, não uma segunda árvore a criar ao lado de `src/game/`. O fluxo ativo descrito acima continua sendo a base de implementação.

Stack preferencial: Babylon.js, TypeScript estrito, Vite, HTML/CSS, glTF/GLB, Vitest; Playwright para E2E quando disponível; Havok somente se física avançada justificar. Dependências devem apontar de UI/engine para contratos puros, nunca o inverso. Separar conceitualmente `SpeciesDefinition`, `CreatureInstance`, `BehaviorContext`, `PetBond`, `CatalogEntry`, `SaveData` e `GameAction`; não exigir todos os tipos antes de seu primeiro uso real.

- `core/`: ciclo e serviços; `world/`, `biomes/`, `terrain/`, `environment/`: cenário; `entities/`, `animals/`, `creatures/`: instâncias; `ai/`, `behavior/`: estados e percepção; `pets/`, `taming/`: vínculo; `camera/`, `controls/`: entrada/câmera; `physics/`, `animation/`, `audio/`: infraestrutura; `ui/`, `catalog/`, `inventory/`, `progression/`: experiência; `persistence/`: dados; `performance/`: qualidade; `data/`, `utils/`: recursos compartilhados. Criar pastas **somente quando necessárias**, evoluindo os módulos ativos antes de introduzir equivalentes.
- Ações semânticas MOVE, LOOK, JUMP, SPRINT, INTERACT, CAMERA_SWITCH, PET_COMMAND, OPEN_CATALOG, PAUSE, independentes de teclado/touch/gamepad. Controles touch devem suportar pointer IDs independentes, multitouch e cleanup de listeners.
- Simulação com delta-time limitado, ticks de IA em frequências apropriadas, colisão/navegação coerentes; Babylon renderiza o estado, não armazena regras de negócio. Quando forem adicionados arquivos de assets, carregá-los assincronamente e verificar sua licença; o MVP atual usa assets procedurais.
- Persistência IndexedDB com esquema versionado, migrações testadas quando houver nova versão publicada e validação; snapshots puros, nunca Babylon meshes.

## Diretrizes PWA e mobile landscape do PR #3

- Camada PWA independente da engine: manifest, service worker, registro/atualização e interface de instalação. Avaliar `vite-plugin-pwa`/Workbox apenas se reduzir complexidade e manter configuração auditável; não introduzir dependência sem justificativa.
- Definir `base`/paths conforme deploy (domínio raiz ou subdiretório, ex. GitHub Pages). Testar `start_url`, `scope`, ícones e cache com essa base. Service worker apenas em origem segura, lifecycle e versionamento claros; evitar cache eterno de JS antigo, problemas de atualização e bundles/GLBs excessivos.
- Não presumir suporte universal a `beforeinstallprompt`, `screen.orientation.lock`, fullscreen ou background sync. iOS Safari usa fluxo de compartilhamento/adicionar à tela inicial quando disponível; exibir instruções e fallbacks.
- UI landscape-first com safe areas `env(safe-area-inset-*)`, prevenção seletiva de scroll/zoom sem prejudicar acessibilidade, tratamento de resize/orientation/visibility e touch-action adequado. Preservar desktop.
- Offline progressivo: shell e assets essenciais com políticas de cache e limites; saves ficam em IndexedDB. Testar atualização, reinstalação e falhas de armazenamento. Não prometer persistência eterna.
- Instrumentação: FPS, tempo de frame, draw calls, entidades ativas, memória quando disponível. Perfis LOW/MEDIUM/HIGH/AUTO baseados em medição e fallback. Otimizações sob demanda: instancing/thin instances, LOD, culling, resolução dinâmica, sombras, pooling e carregamento progressivo.

## Estratégia de testes

Vitest para funções puras (input, câmera, mapa, IA, confiança, save migrations); Playwright quando disponível para navegação, UI, orientação, installability e regressão. Testes emulados **não** substituem Safari iOS e Chrome Android em hardware. `npm run typecheck`, `npm test`, `npm run build`, `git diff --check` e verificação visual quando aplicável antes de PR. Roteiros ativos: [TESTING.md](TESTING.md). Não adicionar testes fictícios para recursos não implementados.
