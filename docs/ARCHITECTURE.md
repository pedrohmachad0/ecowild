# Arquitetura
Stack: Babylon.js + TypeScript + Vite, HTML/CSS para HUD, Vitest; glTF/GLB para modelos, Havok somente quando necessário, IndexedDB planejado.

Direção: dados puros (src/entities, src/data) não dependem de Babylon ou DOM; gameplay separado de renderização; input traduz touch/teclado/mouse para ações; câmera desacoplada; UI envia comandos. Estrutura inicial em src/controls, src/entities, src/data; expandir sob demanda para world, ai, pets, taming, catalog, persistence, performance, ui, audio, physics. Evitar diretórios vazios.

Entidades futuras: Species, CreatureInstance, BehaviorContext, PetBond, CatalogEntry, SaveData versionado. Não serializar objetos Babylon diretamente. Estado persistente separado de runtime.

Estado atual: cenário geométrico, personagem cápsula, câmera alternável experimental, input básico, espécies como dados. Ainda sem IA, pets, catálogo, salvamento, colisão robusta, câmera touch em primeira pessoa e assets finais.
