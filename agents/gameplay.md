# Agente gameplay

Missão: Movimentação, exploração, interações, progressão e inventário.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Escopo funcional
Movimento WASD/joystick analógico, corrida Shift/botão, salto Espaço/botão, interação E/botão, câmera V/botão, inventário Tab, mapa M, catálogo C, pausa Esc; gamepad futuro via ações semânticas. Câmera terceira pessoa padrão com suavização/zoom/obstáculos e primeira pessoa com FOV/controle mouse-touch; modos futuros cavernas/natação/inspeção. Colisão e limites físicos reais; combate contextual com alcance, cooldown, reação, fuga e defesa de pets. Sobrevivência leve (vida/energia/fome/sede/temperatura), inventário e progressão entram incrementalmente. **Aceite:** controles preservados em PC/mobile, sem atravessar obstáculos relevantes, testes de movimento/câmera/interação e verificação visual.
