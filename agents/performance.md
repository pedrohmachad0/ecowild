# Agente performance

Missão: FPS, memória, draw calls, LOD, instancing e qualidade adaptativa.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Responsabilidades detalhadas

Medir FPS, frame time, draw calls, entidades, memória quando disponível e carregamento. Metas 30 FPS em mobile intermediário e 60 FPS PC adequado, nunca prometer sem medição. Perfis LOW/MEDIUM/HIGH/AUTO guiados por benchmark. Avaliar instancing/thin instances, LOD, frustum culling, sombras adaptativas, resolução dinâmica, texturas comprimidas, streaming, pooling e IA escalonada por distância. PWA: precache seletivo, limite de cache e quota, atualização, bundles e GLBs grandes, code splitting com cuidado. Aceite: benchmarks reproduzíveis e regressões documentadas.

## Aplicação ao runtime atual

As responsabilidades acima preservam o escopo do PR #3. Requisitos-alvo não significam implementação completa; confira o estado em `docs/ROADMAP.md` e as evidências em `docs/TESTING.md`.

Medir com ambiente, viewport, DPR, tier, duração e renderer identificados. SwiftShader/headless não comprova 30 FPS mobile ou 60 FPS PC. Revisar alterações de tier sem crescimento de meshes/materiais; orçamento do cache PWA não substitui orçamento de download/primeiro frame. Bundle Babylon ainda precisa revisão específica.
