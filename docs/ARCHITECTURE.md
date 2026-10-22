# Arquitetura
Stack: Babylon.js + TypeScript + Vite, HTML/CSS para HUD, Vitest; glTF/GLB para modelos, Havok somente quando necessário, IndexedDB planejado.

Direção: dados puros (src/entities, src/data) não dependem de Babylon ou DOM; gameplay separado de renderização; input traduz touch/teclado/mouse para ações; câmera desacoplada; UI envia comandos. Estrutura inicial em src/controls, src/entities, src/data; expandir sob demanda para world, ai, pets, taming, catalog, persistence, performance, ui, audio, physics. Evitar diretórios vazios.

Entidades futuras: Species, CreatureInstance, BehaviorContext, PetBond, CatalogEntry, SaveData versionado. Não serializar objetos Babylon diretamente. Estado persistente separado de runtime.

Estado atual: cenário geométrico, personagem cápsula, câmera alternável experimental, input básico, espécies como dados. Ainda sem IA, pets, catálogo, salvamento, colisão robusta, câmera touch em primeira pessoa e assets finais.

## Contratos e dependências
Stack preferencial: Babylon.js, TypeScript estrito, Vite, HTML/CSS, glTF/GLB, Vitest; Playwright para E2E quando disponível; Havok somente se física avançada justificar. Dependências devem apontar de UI/engine para contratos puros, nunca o inverso. Separar `SpeciesDefinition`, `CreatureInstance`, `BehaviorContext`, `PetBond`, `CatalogEntry`, `SaveData` e `GameAction`; não exigir todos os tipos antes de seu primeiro uso real.
- `core/`: ciclo e serviços; `world/`, `biomes/`, `terrain/`, `environment/`: cenário; `entities/`, `animals/`, `creatures/`: instâncias; `ai/`, `behavior/`: estados e percepção; `pets/`, `taming/`: vínculo; `camera/`, `controls/`: entrada/câmera; `physics/`, `animation/`, `audio/`: infraestrutura; `ui/`, `catalog/`, `inventory/`, `progression/`: experiência; `persistence/`: dados; `performance/`: qualidade; `data/`, `utils/`: recursos compartilhados. Criar pastas **somente quando necessárias**.
- Ações semânticas MOVE, LOOK, JUMP, SPRINT, INTERACT, CAMERA_SWITCH, PET_COMMAND, OPEN_CATALOG, PAUSE, independentes de teclado/touch/gamepad. Controles touch devem suportar pointer IDs independentes, multitouch e cleanup de listeners.
- Simulação com delta-time limitado, ticks de IA em frequências apropriadas, colisão/navegação coerentes; Babylon renderiza o estado, não armazena regras de negócio. Assets carregados assincronamente e com licença verificada.
- Persistência IndexedDB com esquema versionado, migrações e validação; snapshots puros, nunca Babylon meshes.

## Arquitetura PWA e mobile landscape
- Camada PWA independente da engine: manifest, service worker, registro/atualização e interface de instalação. Avaliar `vite-plugin-pwa`/Workbox apenas se reduzir complexidade e manter configuração auditável; não introduzir dependência sem justificativa.
- Definir `base`/paths conforme deploy (domínio raiz ou subdiretório, ex. GitHub Pages). Testar `start_url`, `scope`, ícones e cache com essa base. Service worker apenas em origem segura, lifecycle e versionamento claros; evitar cache eterno de JS antigo, problemas de atualização e bundles/GLBs excessivos.
- Não presumir suporte universal a `beforeinstallprompt`, `screen.orientation.lock`, fullscreen ou background sync. iOS Safari usa fluxo de compartilhamento/adicionar à tela inicial quando disponível; exibir instruções e fallbacks.
- UI landscape-first com safe areas `env(safe-area-inset-*)`, prevenção seletiva de scroll/zoom sem prejudicar acessibilidade, tratamento de resize/orientation/visibility e touch-action adequado. Preservar desktop.
- Offline progressivo: shell e assets essenciais com políticas de cache e limites; saves ficam em IndexedDB. Testar atualização, reinstalação e falhas de armazenamento. Não prometer persistência eterna.
- Instrumentação: FPS, tempo de frame, draw calls, entidades ativas, memória quando disponível. Perfis LOW/MEDIUM/HIGH/AUTO baseados em medição e fallback. Otimizações sob demanda: instancing/thin instances, LOD, culling, resolução dinâmica, sombras, pooling e carregamento progressivo.

## Estratégia de testes
Vitest para funções puras (input, câmera, mapa, IA, confiança, save migrations); Playwright quando disponível para navegação, UI, orientação, installability e regressão. Testes emulados **não** substituem Safari iOS e Chrome Android em hardware. `npm run typecheck`, `npm test`, `npm run build` e verificação visual antes de PR. Não adicionar testes fictícios para recursos não implementados.
