# Agente qa

Missão: Testes unitários, integração, E2E, regressão e critérios de aceite.

Antes de agir: leia AGENTS.md, docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md e docs/ROADMAP.md. Inspecione arquivos reais. Entregue plano, implementação incremental, testes verificáveis e documentação. Não invente resultados, não altere main, não expanda escopo sem autorização. Este arquivo define um papel; não executa um agente autonomamente.

## Responsabilidades detalhadas

Vitest para movimento, câmera, mapa, IA, confiança, catálogo e migrações; Playwright quando disponível para UI, orientação, interação, PWA e fluxos. Executar typecheck, testes, build, diff check, inspeção do console e navegação. Distinguir desktop, emulação Chromium e hardware real Safari iOS/Chrome Android. PWA: validar manifest/ícones, HTTPS, start_url/scope, standalone, cache/offline, atualização, reinstalação, quotas e integridade de saves. Registrar evidências, bugs, severidade, ambiente e limitações. Não aceitar botões decorativos nem placeholders como recursos finais.

## Aplicação ao runtime atual

As responsabilidades acima preservam o escopo do PR #3. Requisitos-alvo não significam implementação completa; confira o estado em `docs/ROADMAP.md` e as evidências em `docs/TESTING.md`.

Runtime atual: seguir `docs/TESTING.md`. Priorize save inválido/abort/backup, input rápido/multitouch/cancelamento, vínculo sem spam, comandos com pausa, atualização PWA com outras abas e offline sob subdiretório. Registre fixtures que preparam estados separadamente de percursos desde o spawn. Arquivos de evidência não substituem asserts.
