# Decisões
ADR-001: Web 3D com Babylon.js, TypeScript e Vite; mobile/PC pelo navegador.
ADR-002: Single-player primeiro, arquitetura extensível.
ADR-003: Câmera terceira pessoa padrão, primeira pessoa opcional.
ADR-004: Animais reais biologicamente coerentes; fantasia explicitamente marcada.
ADR-005: Arquivos agents/ são instruções para IAs, não automações executadas.
ADR-006: Escopo incremental, PR e revisão antes de integrar na main.

ADR-007: **EcoWild será PWA instalável** para experiência web semelhante a aplicativo. Implementar manifest, ícones, service worker, HTTPS, atualização controlada e offline progressivo. PWA não substitui app nativo; compatibilidade varia.
ADR-008: **Mobile landscape-first**. HUD, joystick, câmera, multitouch e safe areas projetados para duas mãos; em portrait solicitar rotação; orientation lock apenas como melhoria opcional e com fallback.
ADR-009: **Offline e saves são responsabilidades diferentes**. Assets/app shell sob cache versionado; progresso em IndexedDB versionado, com migrações e tratamento de falhas. Testar quotas e atualizações.
ADR-010: **Branch e validação explícitas**. A branch `manus` pode conter funcionalidades mais recentes que `chatgpt`; não declarar recursos integrados na `main` sem conferir. Nenhum merge automático.
ADR-011: **Vertical slice antes de expansão**. Mata da Nascente com fauna, vínculo, catálogo e save/load precede biomas adicionais, multiplayer e reprodução complexa.
ADR-012: **Desempenho medido**. 30 FPS mobile/60 FPS PC são metas, não garantias; otimização guiada por profiling e teste em hardware.

ADR-013: **Visão fundadora preservada.** A identidade do EcoWild inclui biologia, geografia, biomas/relevos, animais e monstros por habitat (aquático, voador, subterrâneo, terrestre) e grupos biológicos (mamíferos, anfíbios, répteis, peixes, aves), catálogo/colecionáveis, pets exóticos domesticáveis, agressão contextual de selvagens, defesa por pets, domesticação assistida por pets e obtenção de certos pets via ovos. O MVP valida parte dessas mecânicas, mas não cancela as demais. Alterar/remover um pilar requer aprovação explícita e ADR. PWA é decisão de plataforma independente.
