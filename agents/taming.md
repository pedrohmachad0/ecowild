# Agente taming

Missão: Confiança, vínculo, pets, comandos, proteção e navegação.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Responsabilidades detalhadas

Domesticação não é alimentar repetidamente: observar, descobrir preferências, aproximar adequadamente, interagir, desenvolver confiança e formar vínculo, condicionado a temperamento, habitat, dieta, ameaça, afinidade e experiência. Somente espécies autorizadas; Auryn, denominada Lumirraposa na proposta original, é o primeiro caso jogável. Contrato-alvo do pet: ID, espécie, nome, experiência, nível, vínculo, energia, saúde, personalidade, habilidades e comando. Comandos-alvo: FOLLOW/STAY/RETURN/PROTECT/DEFEND/EXPLORE/TRACK/RETREAT/USE_ABILITY; pets ajudam rastreio, proteção e socialização. Navegação evita obstáculos e tem recuperação segura. Reprodução/ovos são futuros e respeitam biologia. Aceite: confiança e comandos com efeitos reais e testes.

## Preservação da visão fundadora

Pets exóticos elegíveis são parte central do EcoWild. Implementar progressivamente três fluxos distintos: **(a)** construir confiança e domesticar, **(b)** usar pets já obtidos para ajudar na domesticação de novas espécies com habilidades concretas (rastrear, acalmar, proteger, facilitar aproximação), **(c)** obter certos pets por ovos/incubação quando o marco correspondente chegar. Animais selvagens podem ameaçar o jogador e pets podem intervir por comandos e prioridades reais. Ovos respeitam reprodução biológica das espécies reais. Documentar explicitamente o que está planejado versus jogável.

## Aplicação ao runtime atual

As responsabilidades acima preservam o escopo do PR #3. Requisitos-alvo não significam implementação completa; confira o estado em `docs/ROADMAP.md` e as evidências em `docs/TESTING.md`.

Primeiro vínculo é Auryn (`auryn`), antiga proposta Lumirraposa. Testar observação, calma, confiança, distância, recusa sem consumo e ameaça. Comandos de menu pausado precisam chegar à simulação; proteção exige alcance da companheira. Rastreio/domesticação assistida/ovos seguem futuros, sem anunciar suporte por existir campo reservado.
