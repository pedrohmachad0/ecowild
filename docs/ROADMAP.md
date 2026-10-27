# Roadmap e rastreabilidade

Continuação em 27/10/2026 sobre `main@2cdacf7`, após o merge do PR #5, na branch `feat/fauna-art-camera-bond`. Os PRs #2, #4 e #5 estão mesclados; `chatgpt`/PR #3 permanece aberto, não mergeável e preservado. Seus 13 documentos já foram incorporados manualmente no PR #4. Esta rodada prioriza modelos dos animais, câmera e clareza do vínculo; [relatório/evidências](FAUNA_2026-10-27.md).

| Marco | Implementado | Validação / restante |
|---|---|---|
| M1 Fundação | Vite, TypeScript, Babylon, CI | Scripts locais e CI do PR #4 passaram; validação da continuação registrada em TESTING |
| M2 Controles | Teclado/mouse, ações, toque independente, câmera 1ª/3ª pessoa, pausa, foco por Q/Observar | Chromium desktop/toque; gamepad padrão básico sem teste físico; zoom por pinça implementado |
| M3 Mata | Relevo, lago, trilha, árvores/rochas, frutos, colisões circulares, limite visível | Navegação do MVP; câmera/colisão geométrica completa ainda parcial |
| M4 Fauna | 11 atores, cinco modelos articulados v2, estados diferenciados, seed, decisão a ~8 Hz | Estúdio e cena real no Chromium; sem cone/linha de visão da IA, memória ou LOD distante; caça abstrata |
| M5 Vínculo | Auryn, confiança, observação, oferta validada, FOLLOW/STAY/PROTECT/RETURN, recuperação | Regressões e percurso em navegador; proteção contextual simples |
| M6 Diário/bolsa | Campos graduais, pesquisa, coleta/consumo e guia textual | Sem filtros, fotografias, rastros ou minimapa gráfico |
| M7 Progresso | Save v1 validado, fila, backup no novo jogo, falhas visíveis, preferências separadas | Restauração atômica, exportação e conflito entre abas implementados; importação de arquivos futura |
| M8 PWA/mobile | Manifest/ícones, shell offline, atualização consentida, base relativa | Chromium emulado; instalação/standalone e desempenho físico pendentes |
| M9 Expansão | Visão documentada | Não implementado |

## Marcos oficiais do Prompt Mestre

Definições incorporadas do PR #3; a tabela acima continua indicando o estado real de cada marco.

- **M1 Fundação**: build, engine, cena, documentação e CI.
- **M2 Personagem e controles**: movimento, corrida, pulo, colisões, câmera 1ª/3ª pessoa, input unificado, mobile landscape e multitouch.
- **M3 Primeiro bioma**: Mata da Nascente, água, caminhos, vegetação, relevo, limites, iluminação e colisões reais.
- **M4 Fauna**: cinco espécies renderizadas, animações, percepção, estados e comportamentos ecológicos.
- **M5 Domesticação e pets**: confiança, vínculo, Auryn (Lumirraposa na proposta original), comandos e navegação segura.
- **M6 Catálogo**: observação, descobertas, enciclopédia e progresso.
- **M7 Persistência**: IndexedDB, versionamento, migrações quando houver novo schema publicado, save/load.
- **M8 PWA, compatibilidade e otimização**: manifest/ícones, service worker, instalação, offline progressivo, testes em iPhone/Android, qualidade LOW/MEDIUM/HIGH/AUTO e benchmarks.
- **M9 Expansão**: biomas, espécies, sobrevivência, reprodução, ovos, exploração especial e outros sistemas avançados.

## Requisitos transversais e gates

A infraestrutura PWA é requisito de lançamento do vertical slice; a instalação continua opcional para o jogador; planejar desde a fundação, mas só marcar como implementado após código e testes. Landscape-first é obrigatório no mobile. Para cada marco, registrar separadamente: planejado / implementado / validado em navegador / validado em hardware. Não marcar M2/M3 completos sem colisões e interações. Antes de M4, validar navegação, controles e câmera em ambiente real; antes de M5, IA e navegação estáveis. Metas 30 FPS mobile e 60 FPS desktop exigem medição.

M4/M5 já têm implementações no PR #4. Esses gates orientam aceitação e expansão: não apagar os sistemas existentes nem confundir implementação em navegador com validação física pendente.

## Próximas tarefas pequenas

### P1 — validação para lançamento

- [ ] Safari iOS físico: duas mãos, safe areas, áudio/retorno, save, orientação, instalação manual e atualização.
- [ ] Chrome Android físico: mesmo roteiro, armazenamento/quota, segundo lançamento e offline.
- [ ] Medir frame time/FPS/memória/temperatura em PC e celular reais. O Chromium com SwiftShader não valida as metas de 30/60 FPS.
- [ ] Testar perda/restauração real de contexto WebGL em GPUs móveis e queda abrupta do processo.

### P2 — qualidade do MVP

- [ ] Isolar percepção/navegação de `game/sim/simulation.ts`, cachear consultas por tick e introduzir LOD apenas após profiling.
- [ ] Resolver rotas em torno do lago e obstáculos côncavos; reduzir reposicionamentos de presa/pet e melhorar leitura das transições.
- [x] Recuo de câmera contra volumes 3D de troncos/copas/rochas/terreno e extensão suavizada sem cortar obstáculos; regressões geométricas e Chromium.
- [x] Cinco modelos originais com olhos, focinhos/bico, patas/garras, caudas/penas e poses por estado; comparação com a base e orçamento de meshes/triângulos.
- [x] Q/Observar em PC/toque para enquadrar encontro e explicar alcance, calma, confiança e oferta real da Auryn.
- [ ] Refinar contato das patas com o terreno, transições de repouso e LOD de modelos após profiling; câmera ainda usa volumes aproximados.
- [ ] Melhorar sinais de ameaça e percepção visual da IA/diário sem confundir o foco da câmera com pesquisa automática.
- [x] UI para recuperar/exportar backup e arbitragem de gravações entre abas desta versão.
- [x] Zoom por pinça independente do joystick, retomada de arrasto e limpeza dos ponteiros.
- [ ] Importação JSON com prévia/validação e confirmação, sem descartar slots existentes.
- [ ] Reduzir bundle Babylon com importações seletivas verificadas, sem retirar funcionalidades; medir download e primeiro frame em rede móvel.
- [ ] Mais pontos de observação, filtros do diário, marcos e navegação visual. Line of sight antes de alegar observação visual rigorosa.
- [ ] Migrar/remover módulos de render antigos somente depois de mapear consumidores externos e preservar testes úteis.

### P3 — visão completa preservada

| Pilar | Primeiro marco verificável | Recorte atual | Futuro |
|---|---|---|---|
| Biologia/geografia/relevos | M3 | Mata imaginária, lago, margens, fatos no diário | Biomas/climas/altitude/ecologia mais ricos |
| Fauna real e fantástica | M4 | Mamíferos, ave, Auryn; classificação separada | Répteis, anfíbios, peixes, invertebrados, aquático/subterrâneo/arborícola |
| Catálogo e colecionáveis | M6 | Avistamento por proximidade, habitat, observação e interação | Fotografia, rastros, desafios e coleções |
| Pets exóticos | M5 | Auryn elegível, nome, vínculo, energia e XP | Novas espécies e habilidades |
| Selvagens e defesa | M5 | Lobos ameaçam/atacam; Auryn próxima protege | Táticas e prioridades mais ricas |
| Domesticação assistida | M5: contratos; efeito jogável em expansão | Não disponível | Pet rastreia/acalma/ajuda a aproximar outra espécie |
| Ovos para certos pets | M9 | Não disponível | Apenas ovíparos; obtenção/incubação/nascimento coerentes |
| Exploração especial | M3: navegação; expansão posterior | Caminhar e natação superficial | Aquática, aérea, cavernas e subterrâneo |

Não marcar um pilar inteiro como concluído porque um tipo ou um texto existe. PWA é requisito de plataforma, não substitui a identidade do jogo. Multiplayer, genética, economia, construção e montarias ficam depois do MVP sólido.

## Situação de branches e incorporação do PR #3

Os 13 arquivos documentais do PR #3 (`chatgpt@a41adc7`) foram incorporados nos mesmos caminhos do PR #4, com resolução manual das divergências. O estado antigo “sem IA/save/catálogo” e as pendências já implementadas não substituem a auditoria atual. `manus` já está integrado na main pelo PR #2. Nenhum código de `src/`, configuração, asset ou teste foi trazido da fundação antiga nesta integração; `chatgpt` e o PR #3 permanecem preservados.
