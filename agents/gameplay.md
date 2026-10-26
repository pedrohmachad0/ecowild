# Agente gameplay

Missão: Movimentação, exploração, interações, progressão e inventário.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

Prompts e interações devem usar `sim/interaction.ts`, evitando alvos distintos. Percurso de aceite: spawn → coleta → observação → oferta → vínculo → comando → save/reload. Não expandir conteúdo antes de estabilizar esse percurso; menus pausam e devem deixar o progresso intacto.
