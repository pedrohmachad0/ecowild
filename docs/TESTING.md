# Validação reproduzível

## Checks obrigatórios

```bash
npm ci
npm run typecheck
npm test
npm run build
git diff --check
```

O build gera `dist/sw.js`; `npm run dev` não registra SW. O aviso do Vite sobre bundle >500 kB é conhecido e não deve ser ocultado como se estivesse otimizado.

## Chromium emulado

Os scripts Python usam Playwright e um Chromium já instalado (`CHROMIUM` pode indicar o executável para browser/PWA). São dependências opcionais da máquina de QA; não entram no bundle nem no `npm test`. Nesta rodada foram usados Python 3.12, Playwright do ambiente e `/usr/bin/chromium` com SwiftShader. Não rodar dois benchmarks ao mesmo tempo nem editar módulos com HMR durante os roteiros.

Terminal 1:

```bash
npm run dev -- --port 4173
```

Terminal 2:

```bash
python scripts/browser-check.py --output /tmp/ecowild-mobile
EVIDENCE_DIR=/tmp/ecowild-playthrough python scripts/playthrough-check.py
```

- `browser-check.py`: CDP com até cinco pontos touch, joystick/câmera/correr simultâneos, liberação independente, cancelamento, blur, viewports 667×375 / 812×375 / 844×390 / 390×844, botões ≥44 px, portrait dispensável, preferências após reload, menus, save/backup e falhas de transação.
- Usa fixtures explícitas para falhas IndexedDB, gamepad virtual e pet já domesticado na pausa. Essas fixtures não são alegadas como percurso de exploração. Verifica HTML escapado de nome personalizado, teclado rápido, alternância de câmera, ciclo de qualidade sem crescimento de meshes/materiais e perda/restauração via extensão WEBGL_lose_context.
- `playthrough-check.py`: lê a posição pelo probe de desenvolvimento para orientar **teclas reais**, sem editar a simulação. Percorre desde spawn, colhe, espera a Auryn móvel, observa, oferece, nomeia, comanda, grava/recarrega e confere diário.
- `window.__controlsTest` só existe em Vite dev. Não é parte do produto de produção.

## PWA de produção

```bash
npm run build
EVIDENCE_DIR=/tmp/ecowild-pwa python scripts/pwa-check.py
```

O script copia dist para um diretório temporário, serve `/ecowild/` em localhost e usa perfil temporário Chromium. Verifica manifest/ícones, installability via CDP, ausência de probe em produção, offline com save v1 preparado, atualização esperando, guarda com segunda aba, recarga com save preservado e offline da nova versão. Simula um deploy removendo o JS antigo do servidor **temporário**; não publica nada. Guarda resultados JSON/screenshots fora do repositório por padrão.

Registro do SW e consulta de installability não comprovam instalação pela interface do sistema operacional nem lançamento standalone. Não há teste físico de iPhone/Android nesta rodada. Repetir explicitamente nesses aparelhos: fullscreen/safe areas, dois dedos + ação, perda de foco/captura, áudio após pausa, armazenamento restrito/quota, adicionar à tela inicial, segundo lançamento, offline, atualização e integridade do progresso.

## Regressões unitárias

`tests/integrity.test.ts` cobre movimento/diagonal/obstáculo, água/margem, fuga real do coelho, alcance de proteção, recuperação em terra e STAY, requisitos/recusa/consumo único do vínculo, fluxo de coleta a save, validação de v1/versão desconhecida, identidade/comando/XP, snapshot independente, campos bloqueados e escala de resolução. Testes históricos continuam executados, mas utilitários da fundação antiga não substituem teste do input ativo.

## Recuperação local de backup

Não há botão de restauração nesta versão. `slots/backup` guarda o payload anterior à última substituição confirmada por novo jogo. Diagnóstico no DevTools → Application → IndexedDB é uma operação manual de QA; exporte os dados antes de qualquer alteração. Não apagar banco para resolver problema de cache/PWA. Se uma versão desconhecida for encontrada, preserve o payload e use a versão correspondente do jogo.
