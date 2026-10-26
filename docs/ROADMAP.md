# Roadmap e rastreabilidade

Verificação em 26/10/2026 sobre `main@2db4f8e` e branch `fix/mata-integrity-mobile-pwa`. O PR #2 está mesclado; `chatgpt`/PR #3 permanece preservado, sem merge. Seus requisitos de visão/PWA foram reconciliados manualmente com o runtime atual.

| Marco | Implementado | Validação / restante |
|---|---|---|
| M1 Fundação | Vite, TypeScript, Babylon, CI | Scripts locais passam; CI remoto depende do PR |
| M2 Controles | Teclado/mouse, ações, toque independente, câmera 1ª/3ª pessoa, pausa | Chromium desktop/toque; gamepad padrão básico sem teste físico; zoom touch futuro |
| M3 Mata | Relevo, lago, trilha, árvores/rochas, frutos, colisões circulares, limite visível | Navegação do MVP; câmera/colisão geométrica completa ainda parcial |
| M4 Fauna | 11 atores, cinco perfis, estados diferenciados, seed, decisão a ~8 Hz | Sem cone/linha de visão, memória ou LOD distante; caça abstrata |
| M5 Vínculo | Auryn, confiança, observação, oferta validada, FOLLOW/STAY/PROTECT/RETURN, recuperação | Regressões e percurso em navegador; proteção contextual simples |
| M6 Diário/bolsa | Campos graduais, pesquisa, coleta/consumo e guia textual | Sem filtros, fotografias, rastros ou minimapa gráfico |
| M7 Progresso | Save v1 validado, fila, backup no novo jogo, falhas visíveis, preferências separadas | Tela de restauração de backup e arbitragem entre abas pendentes |
| M8 PWA/mobile | Manifest/ícones, shell offline, atualização consentida, base relativa | Chromium emulado; instalação/standalone e desempenho físico pendentes |
| M9 Expansão | Visão documentada | Não implementado |

## Próximas tarefas pequenas

### P1 — validação para lançamento

- [ ] Safari iOS físico: duas mãos, safe areas, áudio/retorno, save, orientação, instalação manual e atualização.
- [ ] Chrome Android físico: mesmo roteiro, armazenamento/quota, segundo lançamento e offline.
- [ ] Medir frame time/FPS/memória/temperatura em PC e celular reais. O Chromium com SwiftShader não valida as metas de 30/60 FPS.
- [ ] Testar perda/restauração real de contexto WebGL em GPUs móveis e queda abrupta do processo.

### P2 — qualidade do MVP

- [ ] Isolar percepção/navegação de `game/sim/simulation.ts`, cachear consultas por tick e introduzir LOD apenas após profiling.
- [ ] Resolver rotas em torno do lago e obstáculos côncavos; reduzir reposicionamentos de presa/pet e melhorar leitura das transições.
- [ ] Aperfeiçoar câmera contra copas/rochas por geometria, zoom touch e fontes de feedback de ameaça.
- [ ] UI para recuperar/exportar backup e arbitragem de gravações entre abas.
- [ ] Reduzir bundle Babylon com importações seletivas verificadas, sem retirar funcionalidades; medir download e primeiro frame em rede móvel.
- [ ] Mais pontos de observação, filtros do diário, marcos e navegação visual. Line of sight antes de alegar observação visual rigorosa.
- [ ] Migrar/remover módulos de render antigos somente depois de mapear consumidores externos e preservar testes úteis.

### P3 — visão completa preservada

| Pilar | Recorte atual | Futuro |
|---|---|---|
| Biologia/geografia/relevos | Mata imaginária, lago, margens, fatos no diário | Biomas/climas/altitude/ecologia mais ricos |
| Fauna real e fantástica | Mamíferos, ave, Auryn; classificação separada | Répteis, anfíbios, peixes, invertebrados, aquático/subterrâneo/arborícola |
| Catálogo e colecionáveis | Avistamento por proximidade, habitat, observação e interação | Fotografia, rastros, desafios e coleções |
| Pets exóticos | Auryn elegível, nome, vínculo, energia e XP | Novas espécies e habilidades |
| Selvagens e defesa | Lobos ameaçam/atacam; Auryn próxima protege | Táticas e prioridades mais ricas |
| Domesticação assistida | Não disponível | Pet rastreia/acalma/ajuda a aproximar outra espécie |
| Ovos para certos pets | Não disponível | Apenas ovíparos; obtenção/incubação/nascimento coerentes |
| Exploração especial | Caminhar e natação superficial | Aquática, aérea, cavernas e subterrâneo |

Não marcar um pilar inteiro como concluído porque um tipo ou um texto existe. PWA é requisito de plataforma, não substitui a identidade do jogo. Multiplayer, genética, economia, construção e montarias ficam depois do MVP sólido.
