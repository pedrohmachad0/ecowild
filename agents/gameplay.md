# Agente gameplay

Missão: Movimentação, exploração, interações, progressão e inventário.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Escopo funcional

Movimento WASD/joystick analógico, corrida Shift/botão, salto Espaço/botão, interação E/botão, câmera V/botão, inventário Tab, guia da mata M (minimapa gráfico futuro), catálogo C, pausa Esc; gamepad padrão básico já existe via ações semânticas; validar e ampliar o mapeamento sem anunciar suporte físico não testado. Câmera terceira pessoa padrão com suavização/zoom/obstáculos e primeira pessoa com FOV/controle mouse-touch; modos futuros cavernas/mergulho/inspeção; natação superficial já existe. Colisão e limites físicos reais; combate contextual com alcance, cooldown, reação, fuga e defesa de pets. Sobrevivência leve (vida/energia/fome/sede/temperatura), inventário e progressão entram incrementalmente. **Aceite:** controles preservados em PC/mobile, sem atravessar obstáculos relevantes, testes de movimento/câmera/interação e verificação visual.

## Aplicação ao runtime atual

As responsabilidades acima preservam o escopo do PR #3. Requisitos-alvo não significam implementação completa; confira o estado em `docs/ROADMAP.md` e as evidências em `docs/TESTING.md`.

Prompts e interações devem usar `sim/interaction.ts`, evitando alvos distintos. Percurso de aceite: spawn → coleta → observação → oferta → vínculo → comando → save/reload. Não expandir conteúdo antes de estabilizar esse percurso; menus pausam e devem deixar o progresso intacto.
