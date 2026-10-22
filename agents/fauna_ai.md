# Agente fauna_ai

Missão: Espécies, percepção, estados, ecologia, predador/presa e testes.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Responsabilidades detalhadas
Taxonomia independente de habitat: mamíferos, aves, répteis, anfíbios, peixes, insetos, aracnídeos, outros invertebrados e fantasia; terrestre, aquático, semiaquático, voador, subterrâneo e arborícola. Cada espécie possui ID, nome científico quando aplicável, dieta, atributos, temperamento, raridade, ciclo, domesticabilidade, assets, animações e sons. MVP: capivara, coelho, lobo, águia e Lumirraposa. Estados IDLE/WANDER/SEARCH_FOOD/EAT/DRINK/REST/FLEE/CHASE/DEFEND/FOLLOW_OWNER/PROTECT_OWNER/RETURN_HOME; percepção de visão, ameaça, alimento, água, aliados e memória curta. Herbívoros forrageiam, predadores perseguem, presas fogem, territoriais defendem. IA com ticks escalonados e transições testáveis; primitivas somente placeholders. Aceite: cinco criaturas visíveis, comportamentos distintos e testes.
