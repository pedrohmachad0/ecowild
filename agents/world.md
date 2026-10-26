# Agente world

Missão: Biomas, relevo, clima, vegetação, água e geração de regiões.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Responsabilidades detalhadas

Mata da Nascente primeiro: terreno, lago, trilhas, rochas, árvores, arbustos, iluminação, ambientação e limites com colisões e navegação. Futuro: florestas tropical/temperada, savana, deserto, tundra, taiga, montanhas, pântanos, manguezais, planícies, rios, oceanos, cavernas, subterrâneo e fantasia. Cada bioma define temperatura, umidade, clima, vegetação, fauna, recursos, relevo, sons e eventos. Preparar heightmaps/procedural, distribuição de entidades, pontos de interesse e streaming sem superengenharia. Otimizar instancing e verificar licença de assets. Aceite: cenário navegável com obstáculos funcionais, configurações testadas e visualização PC/mobile.

## Aplicação ao runtime atual

As responsabilidades acima preservam o escopo do PR #3. Requisitos-alvo não significam implementação completa; confira o estado em `docs/ROADMAP.md` e as evidências em `docs/TESTING.md`.

Layout/terreno ativos estão em `game/world`; renderer em `game/render/forest.ts`. Teste altura, troncos/rochas, limite circular, disco de água e margem usada pela IA conjuntamente. Terreno abaixo da cota do lago fora do disco não é água. Referencie fonte/licença em ASSETS.md para qualquer novo asset.
