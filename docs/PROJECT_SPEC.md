# EcoWild — especificação de produto

Este documento integra os requisitos completos do [PR #3](https://github.com/pedrohmachad0/ecowild/pull/3), de `chatgpt@a41adc7`, incorporados pelo PR #4 e preservados nas continuações. Define visão e critérios; o estado implementado está no [roadmap](ROADMAP.md), na [auditoria](AUDIT_2026-10-26.md) e no [relatório da fauna/câmera](FAUNA_2026-10-27.md). Requisito escrito não significa recurso pronto.

## Visão fundadora — preservar em todas as expansões

Esta seção registra a **ideia inicial do criador, Pedro Henrique Machado dos Santos**, anterior ao recorte técnico do MVP, e deve orientar o design de longo prazo. EcoWild é um jogo sobre **biologia, geografia, biomas e relevos**, povoado por **animais reais e monstros/criaturas fantásticas**. O jogador explora ambientes e descobre espécies por meio de um **sistema de catálogo e colecionáveis**, podendo criar vínculos com determinados animais exóticos e criaturas para torná-los **pets**.

### Classificação multidimensional obrigatória

- **Locomoção/habitat:** aquáticos, voadores, subterrâneos e terrestres comuns. Uma criatura pode ocupar mais de uma categoria (ex.: semiaquático).
- **Grupos biológicos:** mamíferos, anfíbios, répteis, peixes e aves, extensíveis a invertebrados. Monstros/criaturas fantásticas têm classificação própria, sem atribuir-lhes taxonomia científica fictícia como fato.
- **Geografia:** cada espécie se relaciona com biomas, relevo, água, clima e habitat; não distribuir criaturas aleatoriamente sem justificativa ecológica ou fantástica.

### Ciclo central de jogo desejado

**Explorar biomas e relevos → descobrir animais e monstros → registrar no catálogo/coletar descobertas → compreender hábitos e riscos → conquistar pets elegíveis → usar companheiros para proteção e para ajudar a domar outros → obter determinados pets por ovos → explorar novas regiões.**

### Mecânicas fundadoras inegociáveis para a visão completa

1. **Fauna selvagem perigosa:** algumas criaturas selvagens podem atacar o jogador conforme ameaça, território e comportamento; outras fogem ou ignoram. Evitar agressividade universal.
2. **Proteção por pets:** companheiros respondem a ameaças e podem proteger o jogador; comandos, alcance, estados e prioridades reais, não apenas efeitos visuais.
3. **Domesticação assistida por pets:** companheiros existentes ajudam a localizar, aproximar, acalmar, proteger ou facilitar vínculo com novas espécies, conforme habilidades e compatibilidade. Não deve ser um bônus automático sem ação jogável.
4. **Pets exóticos domesticáveis:** apenas espécies elegíveis, com vínculo e progressão; nem todo animal ou monstro pode ser pet.
5. **Ovos como forma de obter alguns pets:** obtenção, inventário, incubação e nascimento com regras por espécie; animais reais seguem reprodução biologicamente correta e monstros podem ter regras próprias. Não transformar todas as espécies em ovíparas.
6. **Catálogo e colecionáveis:** espécies, habitats, comportamentos, raridades e descobertas persistentes; colecionar informações e criaturas não deve exigir combate.
7. **Geografia e ecossistemas como mecânicas:** biomas e relevos influenciam distribuição, locomoção, recursos, riscos e oportunidades de descoberta.

### Preservação e implementação incremental

Esta visão **não significa que todos os sistemas já existam**. O MVP da Mata da Nascente é um recorte para validar as fundações. Cada etapa deve preparar interfaces e dados que permitam proteção, domesticação assistida e ovos no futuro, sem fingir que estão prontos. Mudanças que eliminem algum pilar fundador exigem aprovação explícita do criador e registro em DECISIONS.md. PWA landscape-first é um requisito adicional de plataforma, não substitui a identidade original.

**Identidade atual:** Auryn é a criatura fantástica do protótipo. Lumirraposa era a denominação histórica da mesma proposta no PR #3. Não criar uma sexta espécie concorrente nem renomear IDs de saves. Single-player primeiro; multiplayer não é prioridade.

## Identidade e plataformas

- Aventura/exploração 3D low-poly detalhada, vibrante e natural, com sobrevivência leve, observação, colecionáveis, progressão científica e fantasia original. Silhuetas, animações, água, iluminação e vegetação devem compor direção artística consistente. Geometria procedural original é uma opção válida: distinguir modelos trabalhados de placeholders ainda simplificados.
- PC em navegadores modernos; Android em navegadores compatíveis; iPhone/iPad em Safari e navegadores compatíveis. **No celular, jogar em orientação horizontal (landscape)** com HUD e controles próprios. Single-player primeiro; não inviabilizar expansão multiplayer futura.
- **Infraestrutura PWA obrigatória, instalação opcional para o jogador**: instalável onde houver suporte, ícones e manifest, `display: standalone` quando compatível, lançamento pela tela inicial, versão/cache controlados, aviso de atualização e estratégia offline progressiva. PWA não equivale a app nativo nem garante travamento de orientação no iOS.

## Mundo e ecossistemas

Biomas e relevos da visão completa: florestas tropicais/temperadas, savanas, desertos, tundras, taigas, montanhas, planícies, planaltos, pântanos, manguezais, rios, lagos, oceanos, recifes, ilhas, cavernas, ambientes subterrâneos e regiões fantásticas. Cada região combina clima, altitude, recursos, flora e fauna. Não multiplicar regiões antes de consolidar a Mata da Nascente.

Cada região define clima, temperatura, umidade, relevo, flora, fauna, recursos, iluminação, sons e eventos. Preparar heightmaps/procedural, vegetação distribuída, pontos de interesse, cavernas, água, transições e streaming por regiões **sem implementar planeta inteiro no MVP**. Fauna real respeita conhecimento biológico; fantasia claramente identificada.

## Contrato de espécies e instâncias

Classificações independentes: biológica (mamífero, ave, réptil, anfíbio, peixe, inseto, aracnídeo, outro invertebrado, fantasia) e ecológica (terrestre, aquático, semiaquático, voador, subterrâneo, arborícola). Cada espécie deve poder descrever ID estável, nome, nome científico quando cabível, descrição, habitats, dieta, tamanho, ameaça, velocidade, força, defesa, resistência, percepção, temperamento, comportamento, raridade, habilidades, domesticabilidade, ciclo de atividade e referências licenciadas de modelo/animações/sons. Instâncias têm identidade e estado runtime separados dos dados da espécie. Acrescentar campos progressivamente sem quebrar registros antigos.

## Comportamento e ecologia

Estados-alvo: IDLE, WANDER, SEARCH_FOOD, EAT, DRINK, REST, FLEE, CHASE, DEFEND, FOLLOW_OWNER, PROTECT_OWNER, RETURN_HOME. Sensores: alcance e cone de visão, ameaça, alimento, água, aliados e memória temporária. Herbívoros forrageiam; predadores caçam; presas fogem; territoriais defendem; sociais podem formar grupos. Transições previsíveis e testáveis, com ticks escalonados e simplificação para entidades distantes; não calcular IA pesada a cada frame.

Esses são os estados/sensores-alvo. O MVP atual tem percepção por distância e IA simples; cone de visão, memória e LOD de fauna não estão implementados. Confira [ARCHITECTURE.md](ARCHITECTURE.md).

## Domesticação, pets e reprodução

Domesticação por observar → compreender preferências/habitat → aproximar sem ameaçar → interagir adequadamente → construir confiança → estabelecer vínculo, somente para espécies permitidas. Temperamento, dieta, ameaça, afinidade, experiência e ambiente influenciam a confiança; alimentar repetidamente não basta. Na visão completa, pets podem auxiliar rastreio, defesa, socialização, exploração aquática e aérea. Contrato-alvo de cada companheiro: ID, espécie, nome, experiência, nível, vínculo, energia, saúde, habilidades, personalidade, comportamento e comando. Comandos previstos: FOLLOW, STAY, RETURN, PROTECT, DEFEND, EXPLORE, TRACK, RETREAT, USE_ABILITY; navegação evita obstáculos e possui recuperação segura. Reprodução, ovos/incubação, filhotes e herança são **futuro**; ovos somente para espécies ovíparas.

O recorte atual oferece FOLLOW/STAY/PROTECT/RETURN para Auryn; rastreio, socialização, domesticação assistida, saúde própria do pet e outros comandos seguem planejados. Não apresentar campos ou contratos futuros como habilidades disponíveis.

Os mamíferos reais do MVP não obtêm filhotes por ovos. Criaturas fantásticas podem ter regras próprias, explicitamente identificadas como fantasia.

## Jogabilidade e progressão

Câmera em terceira pessoa padrão (rotação, zoom, suavização, obstáculos) e primeira pessoa opcional (mouse/touch, FOV, transição); adaptar futuramente para cavernas, mergulho, montarias e inspeção. PC: WASD, mouse, Shift correr, Espaço pular, E interagir, Tab inventário, M guia da mata (minimapa gráfico futuro), C catálogo, V câmera, Esc pausa; remapeamento de comandos de pets planejado; atalhos atuais no README. Mobile landscape: joystick analógico, câmera por arrasto independente, multitouch, correr, pular, interagir, câmera, pets, inventário, catálogo e pausa, respeitando notch/safe areas. Gamepad é extensão da camada de ações MOVE/LOOK/JUMP/SPRINT/INTERACT/CAMERA_SWITCH/PET_COMMAND/OPEN_CATALOG/PAUSE.
Combate/defesa leve e contextual: alcance, ataque/defesa, cooldown, reação, animação, ameaça, fuga e proteção por pets. Confronto nunca deve ser única solução. Sobrevivência planejada: vida, energia, fome, sede, temperatura, equipamentos, inventário e descanso; MVP implementa só o necessário para explorar.

## Catálogo e persistência

Enciclopédia-alvo com nome, visualização/imagem, taxonomia, habitat, dieta, comportamento, raridade, curiosidades e pesquisa. Desbloquear por avistamento, observação de comportamento, registro de habitat, interação e desafios científicos. Salvar posição, progresso, descobertas, pets, inventário e estado relevante do mundo em **IndexedDB versionado**, com validação, migração quando houver nova versão de schema publicada, recuperação de falhas e opção de reiniciar. Manter preferências separadas do progresso. Não serializar meshes/objetos Babylon.

No estado atual, fichas textuais graduais e save v1 já funcionam; imagens de ficha, desafios científicos e migração para um schema futuro não estão implementados. O MVP usa localStorage para preferências e mantém `settings` v1 por compatibilidade.

## MVP — Mata da Nascente

- Uma floresta pequena navegável, lago, trilhas, árvores, rochas, limites visíveis e locais de observação. Cena imaginária com fauna de diferentes regiões; não apresentar coexistência de lobo-cinzento, águia-real e capivara como ecossistema brasileiro real.
- Movimento responsivo, diagonal normalizada, corrida/energia, pulo, interação e colisões. Natação superficial já existe; mergulho e exploração aquática complexa são futuros.
- Terceira pessoa padrão, primeira pessoa alternável, rotação, zoom desktop/touch e recuo por volumes de troncos/copas/rochas e terreno. Q/Observar enquadra animal próximo já conhecido e mostra estado/requisitos do vínculo; mover encerra. Foco não pausa nem concede progresso. Câmera por geometria completa e percepção visual rigorosa ainda pendentes.
- Capivara, coelho-tapiti, lobo-cinzento, águia-real e Auryn, com silhuetas, anatomia estilizada, paletas e comportamentos distintos. Modelos procedurais articulados v2 presentes; poses de descanso, alimentação/água, medo, caminhada e voo usam o estado real. Sem animação esquelética/IK, texturas externas ou promessa de modelos finais.
- Loop: explorar → colher frutiluz → encontrar Auryn → observar parada → aproximar com calma → oferecer após confiança suficiente → vínculo → seguir/esperar/proteger/voltar → diário → salvar/continuar.
- Diário com campos bloqueados até descoberta, observação e interação; bolsa com recursos utilizáveis, quantidades limitadas e feedback de coleta/uso. Guia textual pode orientar até haver minimapa real.
- Save local versionado e validado, falhas visíveis, novo jogo confirmado e backup na substituição. Restauração confirmada, exportação JSON e proteção contra gravações de sessões desatualizadas. Importação de arquivos futura. Preferências separadas. Nenhuma conta ou serviço pago obrigatório.
- Touch independente para joystick/câmera/ações, limpeza por cancelamento/captura/foco/orientação, alvos de pelo menos 44 CSS px e safe areas. Portrait orienta girar, mas permite continuar. Menus acessíveis por teclado e todos com pausa consistente.
- Qualidade auto/baixa/média/alta com efeito real em resolução/vegetação/sombras. Metas de 30 FPS mobile intermediário e 60 FPS PC dependem de medição em hardware.

## PWA — critérios funcionais

1. Manifest com nome/short_name, ícones adequados incluindo maskable quando aplicável, start_url, scope, theme/background colors e display apropriado; garantir URLs relativas ao caminho de hospedagem.
2. Service worker com estratégia segura para app shell e assets estáticos versionados, cache limitado, atualização e limpeza de versões obsoletas; não armazenar dados pessoais/saves como substitutos do IndexedDB.
3. Funcionamento HTTPS (localhost em desenvolvimento), fallback de instalação quando prompt não existir e orientações específicas para “Adicionar à Tela de Início” no Safari iOS.
4. Em portrait touch, solicitar rotação; considerar orientation lock somente como melhoria opcional iniciada por gesto, quando suportado e permitido, sem bloquear a experiência se falhar. Landscape e multitouch reais são critérios de aceite.
5. Offline: inicialmente tela/erro amigável; depois garantir que a versão já carregada possa iniciar e explorar conteúdo essencial sem rede, com testes reais. Documentar limites de cache, quota, atualização e perda de dados pelo navegador.
6. Verificar installability, abertura standalone, retorno de segundo lançamento, atualização de versão, integridade do save e comportamento offline em Android e iOS separadamente; nunca alegar paridade não testada.

Manifest, ícones, SW, offline e atualização já estão implementados no PR #4. A matriz de evidência no roadmap mantém instalação pelo SO, standalone e aparelhos físicos como pendências.

## Aceitação verificável

1. Typecheck, testes de regras e regressões, build e diff check passam.
2. Percurso completo do vínculo tem consumo correto e restauração de identidade/comando/descobertas.
3. Emulação Chromium desktop, landscape e portrait verifica UI, multitouch e cancelamentos. Testes físicos Android/Chrome e iPhone/Safari são relatados separadamente, nunca inferidos.
4. Manifest, ícones, registro, shell offline, atualização e integridade do save são testados no build, incluindo subdiretório de hospedagem. Instalação pela tela inicial e standalone dependem do navegador e de validação específica.
5. Documentação distingue implementado, parcial, futuro e validado. Nenhum botão sem efeito ou afirmação científica inventada.
6. Sem merge na main, deploy, force push, descarte de branches ou assets sem licença durante rodadas de auditoria.

## Fora do MVP

Multiplayer, planeta completo, dezenas de biomas/espécies, economia, construção, montarias, genética, reprodução/ovos, fome/temperatura complexas, domesticação assistida e locomoção aérea/subterrânea do jogador. Permanecem na visão; não são recursos disponíveis.
