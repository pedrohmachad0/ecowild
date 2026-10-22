# EcoWild — Especificação mestra (fonte de verdade)

## Visão
Jogo de aventura, exploração, descoberta biológica, sobrevivência leve, coleção e domesticação em mundo 3D estilizado. Plataforma: navegadores mobile e PC; câmera alternável primeira/terceira pessoa, terceira por padrão; single-player no MVP. Fantasia explicitamente diferenciada de biologia real.

## Pilares
1. Mundo vivo: animais buscam água/comida, descansam, fogem, caçam, protegem território, reagem ao clima e ciclo dia/noite.
2. Geografia: relevo, altitude, clima, rios, lagos, cavernas, montanhas, planícies, planaltos, pântanos, oceanos, ilhas e biomas fantásticos.
3. Biomas: florestas tropical/temperada, savana, deserto, tundra, taiga, manguezal, recifes, cavernas e ambientes subterrâneos; cada um tem fauna, flora, clima, recursos e eventos.
4. Descoberta: enciclopédia de espécies e colecionáveis desbloqueados por avistamento, observação, fotografia, rastros e interação.
5. Vínculo: domesticação gradual por confiança, alimentação, temperamento, afinidade e contexto. Nem toda espécie é domesticável; animais reais seguem biologia conhecida.
6. Companheiros: nome, nível, energia, vínculo, personalidade, habilidades e comandos seguir, esperar, voltar, proteger, defender, rastrear, explorar e recuar. Pets ajudam a encontrar e conquistar confiança de outros.
7. Aventura: combate leve e contextual, fuga, defesa de pets, exploração aquática/voadora/subterrânea, equipamentos, inventário, progressão por pesquisa.
8. Reprodução: ovos/incubação só para ovíparos, outros métodos biologicamente coerentes; crescimento e genética no futuro.

## Classificações
Taxonomia: mamíferos, aves, répteis, anfíbios, peixes, insetos, aracnídeos, outros invertebrados, fantasia. Habitats sobrepostos: terrestre, aquático, semiaquático, aéreo, subterrâneo, arborícola. Cada espécie: ID, nomes, dieta, habitat, tamanho, velocidade, resistência, força, percepção, temperamento, raridade, ameaça, domesticabilidade, modelo, animações, sons e habilidades.

## IA
Estados idle/wander/seek-food/eat/drink/rest/flee/chase/defend/follow/protect/return. Percepção espacial, memória curta, grupos e migração futuramente. Atualizações escalonadas, simplificação à distância, testes de transições.

## Sistemas planejados
Mundo modular com streaming futuro, clima e ciclo dia/noite; controle PC WASD/mouse/Shift/E/Espaço/V/menus e touch joystick/câmera/botões; câmera alternável; catálogo; progressão; salvamento IndexedDB versionado; perfis gráficos low/medium/high/auto; eventual multiplayer somente após MVP.

## MVP — Mata da Nascente
Pequena floresta com lago, trilhas, árvores, rochas e limites. Jogador movimenta, corre, pula, interage e alterna câmera. Cinco espécies: capivara, coelho, lobo, águia e Lumirraposa (fantástica). IA básica diferente por espécie. Uma domesticação real com seguir/esperar/proteger/retornar. Catálogo com descobertas e persistência local. Testar desktop e mobile compatíveis.

## Fora do MVP
Multiplayer, mundo planetário, centenas de animais, genética avançada, economia, montarias e construção complexa.

## Critérios de aceitação
Cenário navegável, controles PC/mobile, câmera funcional, cinco espécies com IA, um pet domesticável e comandos, catálogo persistente, save/load e testes automatizados. Metas, não garantias: 30 FPS em celulares intermediários, 60 FPS em PCs adequados. Medir antes de afirmar.

## Identidade e plataformas
- Aventura/exploração 3D low-poly detalhada, vibrante e natural, com sobrevivência leve, observação, colecionáveis, progressão científica e fantasia original. Silhuetas, animações, água, iluminação e vegetação devem compor direção artística consistente; primitivas são apenas placeholders identificados.
- PC em navegadores modernos; Android em navegadores compatíveis; iPhone/iPad em Safari e navegadores compatíveis. **No celular, jogar em orientação horizontal (landscape)** com HUD e controles próprios. Single-player primeiro; não inviabilizar expansão multiplayer futura.
- **PWA obrigatório**: instalável onde houver suporte, ícones e manifest, `display: standalone` quando compatível, lançamento pela tela inicial, versão/cache controlados, aviso de atualização e estratégia offline progressiva. PWA não equivale a app nativo nem garante travamento de orientação no iOS.

## Mundo e ecossistemas
Biomas planejados: floresta tropical e temperada, savana, deserto, tundra, taiga, montanhas, pântanos, manguezais, planícies, rios, lagos, oceanos, cavernas, subterrâneo e regiões fantásticas. Cada região define clima, temperatura, umidade, relevo, flora, fauna, recursos, iluminação, sons e eventos. Preparar heightmaps/procedural, vegetação distribuída, pontos de interesse, cavernas, água, transições e streaming por regiões **sem implementar planeta inteiro no MVP**. Fauna real respeita conhecimento biológico; fantasia claramente identificada.

## Contrato de espécies e instâncias
Classificações independentes: biológica (mamífero, ave, réptil, anfíbio, peixe, inseto, aracnídeo, outro invertebrado, fantasia) e ecológica (terrestre, aquático, semiaquático, voador, subterrâneo, arborícola). Cada espécie deve poder descrever ID estável, nome, nome científico quando cabível, descrição, habitats, dieta, velocidade, força, defesa, resistência, percepção, temperamento, comportamento, raridade, habilidades, domesticabilidade, ciclo de atividade e referências licenciadas de modelo/animações/sons. Instâncias têm identidade e estado runtime separados dos dados da espécie. Acrescentar campos progressivamente sem quebrar registros antigos.

## Comportamento e ecologia
Estados-alvo: IDLE, WANDER, SEARCH_FOOD, EAT, DRINK, REST, FLEE, CHASE, DEFEND, FOLLOW_OWNER, PROTECT_OWNER, RETURN_HOME. Sensores: alcance e cone de visão, ameaça, alimento, água, aliados e memória temporária. Herbívoros forrageiam; predadores caçam; presas fogem; territoriais defendem; sociais podem formar grupos. Transições previsíveis e testáveis, com ticks escalonados e simplificação para entidades distantes; não calcular IA pesada a cada frame.

## Domesticação, pets e reprodução
Domesticação por observar → compreender preferências/habitat → aproximar sem ameaçar → interagir adequadamente → construir confiança → estabelecer vínculo, somente para espécies permitidas. Temperamento, dieta, ameaça, afinidade, experiência e ambiente influenciam a confiança; alimentar repetidamente não basta. Pets podem auxiliar rastreio, defesa, socialização, exploração aquática e aérea. Cada companheiro: ID, espécie, nome, experiência, nível, vínculo, energia, saúde, habilidades, personalidade, comportamento e comando. Comandos previstos: FOLLOW, STAY, RETURN, PROTECT, DEFEND, EXPLORE, TRACK, RETREAT, USE_ABILITY; navegação evita obstáculos e possui recuperação segura. Reprodução, ovos/incubação, filhotes e herança são **futuro**; ovos somente para espécies ovíparas.

## Jogabilidade e progressão
Câmera em terceira pessoa padrão (rotação, zoom, suavização, obstáculos) e primeira pessoa opcional (mouse/touch, FOV, transição); adaptar futuramente para cavernas, natação, montarias e inspeção. PC: WASD, mouse, Shift correr, Espaço pular, E interagir, Tab inventário, M mapa, C catálogo, V câmera, Esc pausa; comandos de pets configuráveis. Mobile landscape: joystick analógico, câmera por arrasto independente, multitouch, correr, pular, interagir, câmera, pets, inventário, catálogo e pausa, respeitando notch/safe areas. Gamepad é extensão da camada de ações MOVE/LOOK/JUMP/SPRINT/INTERACT/CAMERA_SWITCH/PET_COMMAND/OPEN_CATALOG/PAUSE.
Combate/defesa leve e contextual: alcance, ataque/defesa, cooldown, reação, animação, ameaça, fuga e proteção por pets. Confronto nunca deve ser única solução. Sobrevivência planejada: vida, energia, fome, sede, temperatura, equipamentos, inventário e descanso; MVP implementa só o necessário para explorar.

## Catálogo e persistência
Enciclopédia com nome, visualização/imagem, taxonomia, habitat, dieta, comportamento, raridade, curiosidades e pesquisa. Desbloquear por avistamento, observação de comportamento, registro de habitat, interação e desafios científicos. Salvar configurações, posição, progresso, descobertas, pets, inventário e estado relevante do mundo em **IndexedDB versionado**, com validação, migração, recuperação de falhas e opção de reiniciar. Não serializar meshes/objetos Babylon.

## PWA — critérios funcionais
1. Manifest com nome/short_name, ícones adequados incluindo maskable quando aplicável, start_url, scope, theme/background colors e display apropriado; garantir URLs relativas ao caminho de hospedagem.
2. Service worker com estratégia segura para app shell e assets estáticos versionados, cache limitado, atualização e limpeza de versões obsoletas; não armazenar dados pessoais/saves como substitutos do IndexedDB.
3. Funcionamento HTTPS (localhost em desenvolvimento), fallback de instalação quando prompt não existir e orientações específicas para “Adicionar à Tela de Início” no Safari iOS.
4. Em portrait touch, solicitar rotação; tentar orientation lock apenas quando suportado e permitido, sem bloquear a experiência se falhar. Landscape e multitouch reais são critérios de aceite.
5. Offline: inicialmente tela/erro amigável; depois garantir que a versão já carregada possa iniciar e explorar conteúdo essencial sem rede, com testes reais. Documentar limites de cache, quota, atualização e perda de dados pelo navegador.
6. Verificar installability, abertura standalone, retorno de segundo lançamento, atualização de versão, integridade do save e comportamento offline em Android e iOS separadamente; nunca alegar paridade não testada.

## Vertical slice: Mata da Nascente
Pequena floresta navegável com lago, caminhos, rochas, árvores, arbustos, limites e colisões; movimentação, corrida, pulo, interação, câmera alternável e HUD PC/mobile landscape. Cinco espécies: capivara (pacífica semiaquática), coelho (herbívoro medroso), lobo (predador social/territorial), águia (predadora voadora) e Lumirraposa (fantasia original domesticável). Modelos/animacões e IA diferenciada, não somente entradas de dados. Lumirraposa: confiança e comandos FOLLOW/STAY/PROTECT/RETURN; catálogo com descoberta e save/load. Testar navegador desktop, emulação mobile e, separadamente, aparelhos físicos.

## Aceite e exclusões
Concluído somente com controles reais, câmeras funcionais, colisões adequadas, cinco criaturas visíveis e comportamentais, domesticação jogável, comandos, catálogo persistente, recuperação de save, PWA testado conforme suporte da plataforma e sem erros críticos conhecidos. Alvos de desempenho: ~30 FPS em celulares intermediários compatíveis e ~60 FPS em PCs adequados **medidos**, não garantidos. Fora do MVP: multiplayer, mundo planetário, centenas de espécies, genética complexa, montarias e construção avançada.
