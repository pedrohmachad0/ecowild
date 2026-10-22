# Arquitetura
Stack: Babylon.js + TypeScript + Vite, HTML/CSS para HUD, Vitest; glTF/GLB para modelos, Havok somente quando necessário, IndexedDB planejado.

Direção: dados puros (src/entities, src/data, src/world/worldConfig, src/controls/movement, src/controls/touchState e src/controls/orientation) não dependem de Babylon ou DOM; gameplay separado de renderização; input traduz touch/teclado/mouse para ações; câmera desacoplada; UI envia comandos. A fundação atual separa src/camera, src/controls, src/entities, src/player, src/data e src/world. No mobile, `Input` mantém ponteiros independentes para joystick e câmera, enquanto a HUD organiza ações em uma camada touch landscape com safe areas. Expandir sob demanda para ai, pets, taming, catalog, persistence, performance, ui, audio e physics. Evitar diretórios vazios.

Entidades futuras: Species, CreatureInstance, BehaviorContext, PetBond, CatalogEntry, SaveData versionado. Não serializar objetos Babylon diretamente. Estado persistente separado de runtime.

Estado atual: cenário geométrico modular da Mata da Nascente com lago, trilhas, pedras, árvores, arbustos e limites, personagem cápsula, câmera alternável, input desktop e controles mobile com joystick analógico, câmera por arrasto, ações e prompt portrait. Ainda sem IA, pets, catálogo, salvamento, colisão robusta, assets finais e validação em aparelho físico. A configuração do mundo, a normalização de movimento, o estado multitouch e a orientação são dados/utilitários puros com testes unitários.
