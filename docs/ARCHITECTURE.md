# Arquitetura
Stack: Babylon.js + TypeScript + Vite, HTML/CSS para HUD, Vitest; glTF/GLB para modelos, Havok somente quando necessário, IndexedDB planejado.

Direção: dados puros (src/entities, src/data, src/world/worldConfig e src/controls/movement) não dependem de Babylon ou DOM; gameplay separado de renderização; input traduz touch/teclado/mouse para ações; câmera desacoplada; UI envia comandos. A fundação atual separa src/camera, src/controls, src/entities, src/player, src/data e src/world. Expandir sob demanda para ai, pets, taming, catalog, persistence, performance, ui, audio e physics. Evitar diretórios vazios.

Entidades futuras: Species, CreatureInstance, BehaviorContext, PetBond, CatalogEntry, SaveData versionado. Não serializar objetos Babylon diretamente. Estado persistente separado de runtime.

Estado atual: cenário geométrico modular da Mata da Nascente com lago, trilhas, pedras, árvores, arbustos e limites, personagem cápsula, câmera alternável experimental, input básico e espécies como dados. Ainda sem IA, pets, catálogo, salvamento, colisão robusta, câmera touch em primeira pessoa e assets finais. A configuração do mundo e a normalização de movimento são dados/utilitários puros e já possuem testes unitários.
