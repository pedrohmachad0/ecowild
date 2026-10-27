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
python scripts/recovery-check.py --output /tmp/ecowild-recovery
EVIDENCE_DIR=/tmp/ecowild-playthrough python scripts/playthrough-check.py
```

- `browser-check.py`: CDP com até cinco pontos touch, joystick/câmera/correr simultâneos, liberação independente, cancelamento, blur, viewports 667×375 / 812×375 / 844×390 / 390×844, botões ≥44 px, portrait dispensável, preferências após reload, menus, save/backup e falhas de transação.
- Usa fixtures explícitas para falhas IndexedDB, gamepad virtual e pet já domesticado na pausa. Essas fixtures não são alegadas como percurso de exploração. Verifica HTML escapado de nome personalizado, teclado rápido, alternância de câmera, ciclo de qualidade sem crescimento de meshes/materiais e perda/restauração via extensão WEBGL_lose_context.
- `playthrough-check.py`: lê a posição pelo probe de desenvolvimento para orientar **teclas reais**, sem editar a simulação. Percorre desde spawn, colhe, espera a Auryn móvel, observa, oferece, nomeia, comanda, grava/recarrega e confere diário. A fase de vínculo tem orçamento de 45 segundos da simulação e guarda de 240 segundos reais: o runtime limita delta por frame e o SwiftShader pode avançar lentamente. Registra ambos os tempos; em falha salva trace de distância/confiança/observação/medo, estado e captura. Requisitos de vínculo e asserts não são relaxados.
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

No título ou na pausa, abra **Progresso / backup**. Exporte progresso/backup para downloads locais; importação ainda não é oferecida. Cancelar a confirmação não altera dados. Restaurar exige backup válido e troca os slots atomicamente; o estado anterior (ou sessão pausada) fica no backup para desfazer. Schema desconhecido é exportável como JSON, mas não carregável. Não apagar banco para resolver cache/PWA.

`recovery-check.py` usa fixtures isoladas e IndexedDB real do Chromium: exportação raw de versão desconhecida; cancelar/restaurar/recarregar com Auryn, diário e comando; conflito entre duas sessões/abas; bloqueio persistente após inspeção/exportação; abort com rollback; backup inválido; restauração antes do primeiro autosave e desfazer; Escape preservando pausa; joystick + pinça com três dedos e transição 2→1; portrait e alvos de toque. Não simula percurso de exploração. `tests/touchInput.test.ts` verifica os listeners ativos, roda, multitouch, cancelamento, foco, resize e descarte; geometria/roteamento nativo são verificados no Chromium.

A versão anterior pode escrever sem coordenação, portanto feche abas antigas antes do teste entre abas atuais. O bloqueio entre sessões é observado na próxima tentativa de gravação, não por um aviso instantâneo de presença de outra aba.

Resultados da continuação após o PR #4: [FOLLOWUP_2026-10-26.md](FOLLOWUP_2026-10-26.md).

## Fauna articulada e câmera de observação

Com Vite dev em 4173, execute os roteiros separadamente dos benchmarks/build:

```bash
python scripts/fauna-check.py --ref 2cdacf7 --output /tmp/ecowild-fauna-before
python scripts/fauna-check.py --output /tmp/ecowild-fauna-after
EVIDENCE_DIR=/tmp/ecowild-encounter python scripts/encounter-check.py
```

`fauna-check.py` abre uma cena isolada no mesmo Babylon do Vite, usando os construtores reais. A opção `--ref` transpila em memória o módulo antigo autossuficiente para comparar a mesma câmera/luz/chão, sem checkout ou alteração do código. Captura perfil e três quartos das cinco espécies, poses de bebida/repouso e conjunto. Registra meshes, triângulos, bounds finitos e estabilidade de meshes/materiais/transforms após animações. A luz de estúdio é identificada nas imagens; não confundir com a mata.

`encounter-check.py` prepara explicitamente posições/descoberta/confiança via probe para isolar a UI/câmera: botão/Q, saída por movimento, pausa, primeira/terceira pessoa, nota sem vínculo automático e encurtamento diante de árvore real do mapa. Não é um percurso natural de descoberta. Testes unitários em `creatureRig.test.ts`, `gameCamera.test.ts` e `observation.test.ts` cobrem geometria/recursos, recuo/extensão, troca de pitch, alvo conhecido/bloqueado, limites e prioridade real de oferta/coleta.

Resultados, comparação e limites desta rodada: [FAUNA_2026-10-27.md](FAUNA_2026-10-27.md). Os arquivos de evidência são capturas e medições, não assets carregados pelo jogo.
