# Agente ui_mobile

Missão: HUD, acessibilidade, controles touch/teclado, safe areas e câmeras.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Responsabilidades detalhadas
Mobile landscape-first: joystick analógico à esquerda, câmera independente à direita, botões pular/correr/interagir/câmera/pets e menus inventário/catálogo/pausa. Suportar múltiplos ponteiros, diagonais, safe areas/notch, aspect ratios, resize e cleanup de listeners. Portrait solicita girar; screen.orientation.lock apenas opcional com fallback (Safari iOS). Desktop mantém WASD/mouse. HUD não cobre visão central. PWA: instalação quando suportada, instrução Adicionar à Tela de Início no iOS, standalone e avisos de offline/atualização; coordenar manifest e service worker com arquitetura. Aceite: testes emulados e físicos diferenciados, multitouch real, sem gestos conflitantes.
