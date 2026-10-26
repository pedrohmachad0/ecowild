# Agente fauna_ai

Missão: Espécies, percepção, estados, ecologia, predador/presa e testes.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

Perfis vêm de `game/data/species.ts`; indivíduos ficam na simulação. Distinga reação real do seletor de estado: FLEE precisa escolher ameaça e alvo corretos. Evite processamento caro por frame ao aumentar população. A mata é fictícia, com espécies de regiões diferentes; não atribuir a ela biogeografia brasileira literal.
