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

ADR-011: **Save não é cache.** Manter schema v1, único formato de progresso publicado. Rejeitar versões desconhecidas; normalizar campos conhecidos. Remover timeout externo de 1,5 s que confundia leitura lenta com ausência de save. Storage tem falhas explícitas, timeout de operação, commit/abort e fechamento; escritores locais são serializados. Novo jogo confirmado copia o slot anterior para `backup` na mesma transação da primeira substituição. Não apagar progresso antes de gravar. Preferências são separadas, mantendo `settings` v1 para compatibilidade. Ainda sem coordenação entre abas.

ADR-012: **Vínculo não consome tentativas precoces.** Observação de três segundos + confiança ≥58 + distância <2,4 m + calma permitem um frutiluz concluir vínculo. Presença sozinha para em 68. Recusa mantém o fruto, evitando travar o único vínculo por esgotar recursos finitos. Comandos escolhidos em menus pausados aplicam-se diretamente; PROTECT exige proximidade real do pet ao lobo. Auxílio a novas domesticações não é anunciado como disponível.

ADR-013: **Pausa e input.** Todos os painéis pausam a simulação; blur/background abre pausa. Input limpa teclado, pulsos, stick, look, captura e corrida. Toque atribui ponteiro por região e usa Correr segurado. Pulsos de teclado e ações entre frames aguardam consumo, evitando perder toques rápidos ou eventos em telas acima de 60 Hz. Navegação de menus preserva Tab/Space; portrait permite dispensa do aviso.

ADR-014: **PWA local sem biblioteca adicional.** `build-sw.mjs` gera cache versionado por hash do conteúdo com lista explícita e teto de 8 MiB. Runtime de produção registra SW, shell é consistente com sua versão e atualização espera ação do usuário, gravação concluída e uma única aba do escopo. Duas versões de cache no máximo durante transição; IndexedDB nunca é limpo. Base relativa permite raiz/subdiretório; nenhum deploy foi acrescentado. Instalação, orientação e modo standalone dependem da plataforma.

ADR-015: **Representação e evidência.** Mata reúne fauna de regiões distintas e identifica essa licença do cenário. Corrigir fatos não sustentados e habilidades não implementadas. Ícones geométricos próprios e assets/áudio procedurais, sem terceiros. Métricas e probes ficam fora do HUD de produção; medições SwiftShader servem para regressão no ambiente, nunca comprovação das metas em PC/celular. Testes emulados e físicos são distintos.
