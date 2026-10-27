# Decisões
ADR-001: Web 3D com Babylon.js, TypeScript e Vite; mobile/PC pelo navegador.
ADR-002: Single-player primeiro, arquitetura extensível.
ADR-003: Câmera terceira pessoa padrão, primeira pessoa opcional.
ADR-004: Animais reais biologicamente coerentes; fantasia explicitamente marcada.
ADR-005: Arquivos agents/ são instruções para IAs, não automações executadas.
ADR-006: Escopo incremental, PR e revisão antes de integrar na main.
ADR-007: A cena é orquestrada por main.ts, enquanto mundo, jogador, câmera e input vivem em módulos independentes; configurações e regras puras não dependem de Babylon ou DOM.
ADR-008: A experiência mobile prioriza landscape; joystick, câmera por arrasto e ações usam regiões e ponteiros independentes, com prompt portrait e bloqueio de gestos do navegador sem remover os controles desktop.

## Reconciliação de 26/10/2026

ADR-009: **Base atual e visão preservada.** Trabalho parte de `main@2db4f8e`, não do scaffolding antigo em `chatgpt@a41adc7`. Visão fundadora, classificações, domesticação assistida, ovos coerentes e PWA do PR #3 foram incorporados manualmente em PROJECT_SPEC/ROADMAP. Nenhum merge automático, descarte ou alteração da branch original. Numeração ADR-007/008 da main foi conservada; números conflitantes da branch documental não foram copiados.

ADR-010: **Runtime ativo em `src/game`.** Atualiza ADR-007: `main.ts` compõe DOM/PWA, `EcoWildGame` coordena engine/simulação/render/save. Fundação antiga continua isolada e não inicia outra cena. Catálogo antigo é adaptador derivado de `game/data/species.ts`. ID `lumifox` permanece somente na compatibilidade; nome público e save são Auryn/`auryn`.

ADR-011: **Save não é cache.** Manter schema v1, único formato de progresso publicado. Rejeitar versões desconhecidas; normalizar campos conhecidos. Remover timeout externo de 1,5 s que confundia leitura lenta com ausência de save. Storage tem falhas explícitas, timeout de operação, commit/abort e fechamento; escritores locais são serializados. Novo jogo confirmado copia o slot anterior para `backup` na mesma transação da primeira substituição. Não apagar progresso antes de gravar. Preferências são separadas, mantendo `settings` v1 para compatibilidade. Coordenação entre abas acrescentada posteriormente na ADR-023.

ADR-012: **Vínculo não consome tentativas precoces.** Observação de três segundos + confiança ≥58 + distância <2,4 m + calma permitem um frutiluz concluir vínculo. Presença sozinha para em 68. Recusa mantém o fruto, evitando travar o único vínculo por esgotar recursos finitos. Comandos escolhidos em menus pausados aplicam-se diretamente; PROTECT exige proximidade real do pet ao lobo. Auxílio a novas domesticações não é anunciado como disponível.

ADR-013: **Pausa e input.** Todos os painéis pausam a simulação; blur/background abre pausa. Input limpa teclado, pulsos, stick, look, captura e corrida. Toque atribui ponteiro por região e usa Correr segurado. Pulsos de teclado e ações entre frames aguardam consumo, evitando perder toques rápidos ou eventos em telas acima de 60 Hz. Navegação de menus preserva Tab/Space; portrait permite dispensa do aviso.

ADR-014: **PWA local sem biblioteca adicional.** `build-sw.mjs` gera cache versionado por hash do conteúdo com lista explícita e teto de 8 MiB. Runtime de produção registra SW, shell é consistente com sua versão e atualização espera ação do usuário, gravação concluída e uma única aba do escopo. Duas versões de cache no máximo durante transição; IndexedDB nunca é limpo. Base relativa permite raiz/subdiretório; nenhum deploy foi acrescentado. Instalação, orientação e modo standalone dependem da plataforma.

ADR-015: **Representação e evidência.** Mata reúne fauna de regiões distintas e identifica essa licença do cenário. Corrigir fatos não sustentados e habilidades não implementadas. Ícones geométricos próprios e assets/áudio procedurais, sem terceiros. Métricas e probes ficam fora do HUD de produção; medições SwiftShader servem para regressão no ambiente, nunca comprovação das metas em PC/celular. Testes emulados e físicos são distintos.

## Arquivos do PR #3 incorporados ao PR #4

Origem: `chatgpt@a41adc7ddb9c8bfa0d7d08aec8a734af3c496f12`. Foram integrados `AGENTS.md`, os oito arquivos `agents/*.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` e este `docs/DECISIONS.md`. Foram mantidas as responsabilidades detalhadas, os contratos de evolução, os critérios PWA, os marcos M1–M9 e a visão fundadora. Referências a estado implementado foram reconciliadas com o código atual; Lumirraposa continua como nome histórico da Auryn.

As decisões originais abaixo receberam IDs novos para não colidir com ADRs da main/PR #4. O número de origem é preservado entre parênteses. Não houve merge de código, alteração da main, fechamento do PR #3 ou reescrita de histórico.

ADR-016 (PR #3, ADR-007): **EcoWild oferece infraestrutura PWA instalável** para experiência web semelhante a aplicativo. Manifest, ícones, service worker, atualização controlada e offline progressivo estão implementados no PR #4; manter HTTPS fora de localhost. A instalação é uma escolha do jogador quando o navegador suporta. PWA não substitui app nativo; compatibilidade varia.

ADR-017 (PR #3, ADR-008): **Mobile landscape-first**. HUD, joystick, câmera, multitouch e safe areas projetados para duas mãos; em portrait solicitar rotação; orientation lock apenas como melhoria opcional iniciada por gesto e com fallback; o runtime atual usa aviso dispensável sem exigir bloqueio.

ADR-018 (PR #3, ADR-009): **Offline e saves são responsabilidades diferentes**. Assets/app shell sob cache versionado; progresso em IndexedDB versionado, com tratamento de falhas e migrações testadas quando houver nova versão publicada. Testar quotas e atualizações.

ADR-019 (PR #3, ADR-010): **Branch e validação explícitas**. Conferir refs e código antes de declarar recursos integrados. `manus` já foi integrada à main pelo PR #2; esta rodada traz os arquivos documentais de `chatgpt` ao PR #4, preservando o runtime atual. Nenhum merge automático.

ADR-020 (PR #3, ADR-011): **Vertical slice antes de expansão**. Mata da Nascente com fauna, vínculo, catálogo e save/load precede biomas adicionais, multiplayer e reprodução complexa.

ADR-021 (PR #3, ADR-012): **Desempenho medido**. 30 FPS mobile/60 FPS PC são metas, não garantias; otimização guiada por profiling e teste em hardware.

ADR-022 (PR #3, ADR-013): **Visão fundadora preservada.** A identidade do EcoWild inclui biologia, geografia, biomas/relevos, animais e monstros por habitat (aquático, voador, subterrâneo, terrestre) e grupos biológicos (mamíferos, anfíbios, répteis, peixes, aves), catálogo/colecionáveis, pets exóticos domesticáveis, agressão contextual de selvagens, defesa por pets, domesticação assistida por pets e obtenção de certos pets via ovos. O MVP valida parte dessas mecânicas, mas não cancela as demais. Alterar/remover um pilar requer aprovação explícita e ADR. PWA é decisão de plataforma independente.


## Continuação após o merge do PR #4

ADR-023: **Concorrência otimista e recuperação atômica.** A rodada parte de `main@d6daa63` em `feat/progress-recovery-touch-zoom`; os documentos do PR #3 já estão na main via PR #4. `SaveSession` compara uma revisão auxiliar e o conteúdo de ambos os slots na transação IndexedDB. O primeiro escritor vence; uma sessão em conflito permanece jogável/exportável, mas precisa recarregar antes de gravar. Nenhuma mesclagem silenciosa de progresso. O conteúdo também detecta alterações de escritores antigos, mas não impede que uma aba de versão antiga grave sem validação: feche versões antigas. Save v1 permanece inalterado.

ADR-024: **Backup utilizável e exportação local.** Diálogo no título e pausa permite exportar JSON e restaurar backup válido após confirmação. Restauração troca os slots numa transação e preserva a sessão pausada, quando houver, permitindo desfazer. Não grava um novo jogo sobre o backup escolhido antes de restaurá-lo. Exportação preserva payload JSON desconhecido sem normalizá-lo; objetos não JSON são recusados sem exclusão. Importação de arquivos fica para uma etapa própria com prévia/validação. Nenhum arquivo é enviado a servidor.

ADR-025: **Pinça limitada à câmera.** Até dois ponteiros na região direita controlam zoom em unidades equivalentes à roda; durante a pinça não há rotação. Ao soltar um dedo, arrasto retoma da posição atual. Joystick e ações conservam seus próprios ponteiros. Menus mantêm gestos do navegador; captura, blur, resize e visibility limpam o estado. Validação emulada não comprova aparelho físico.

## Fauna e câmera — 27/10/2026

ADR-026: **Arte procedural articulada e modular.** Base `main@2cdacf7` após PR #5; documentos do PR #3 preservados. Substituir os cinco modelos primitivos por geometria original de silhueta e anatomia próprias em `render/creatures/`. Mesclar partes estáticas por articulação e compartilhar dois materiais com cores por vértice, sem texturas/downloads. Animações usam estado/medo/vínculo e poses locais; posição/IA continuam na simulação. Mais detalhe aumenta triângulos apesar de reduzir meshes/materiais; manter métricas e limite de regressão (<8.000 triângulos por espécie nesta etapa), sem alegar ganho de FPS. IDs, Auryn/Lumirraposa e SaveV1 permanecem compatíveis.

ADR-027: **Câmera por volumes conservadores.** Substituir a antiga aproximação planar por interseções do segmento com cilindros finitos/elipsoides e terreno, criados uma vez conforme a floresta. Recuar imediatamente e suavizar só a extensão sobre a órbita atual; interpolar posição no mundo podia atravessar troncos ao girar. Não é colisão de mesh completa; registrar limites de arbustos, pivô dentro de volume e fidelidade do proxy. Primeira pessoa e pinça preservadas.

ADR-028: **Observar apresenta o encontro, sem conceder progresso.** Q/botão contextual enquadra indivíduo conhecido a até 8 m e acompanha até 12 m, com bloqueio aproximado por cenário. Permite órbita/zoom; movimento, pulo, Q/V e perda do alvo restauram a câmera anterior. Simulação continua e ameaças permanecem; jogador oculto evita tapar a criatura. Nota lateral mostra comportamento e prontidão do vínculo usando limites compartilhados com simulação e prioridade real de coleta/oferta. Diário/confiança mantêm as regras existentes; foco não é salvo e não desbloqueia informações sozinho.
