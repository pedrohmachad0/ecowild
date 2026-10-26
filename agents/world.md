# Agente world

Missão: Biomas, relevo, clima, vegetação, água e geração de regiões.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

Layout/terreno ativos estão em `game/world`; renderer em `game/render/forest.ts`. Teste altura, troncos/rochas, limite circular, disco de água e margem usada pela IA conjuntamente. Terreno abaixo da cota do lago fora do disco não é água. Referencie fonte/licença em ASSETS.md para qualquer novo asset.
