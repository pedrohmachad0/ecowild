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
