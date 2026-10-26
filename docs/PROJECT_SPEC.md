# EcoWild — especificação de produto

Este documento define visão e critérios. O estado implementado está na [auditoria](AUDIT_2026-10-26.md) e no [roadmap](ROADMAP.md); requisito escrito não significa recurso pronto.

## Visão fundadora preservada

EcoWild, de Pedro Henrique Machado dos Santos, é uma aventura 3D estilizada de **biologia, geografia, biomas e relevos**, animais reais e criaturas fantásticas. Explorar, descobrir e colecionar conhecimentos permite compreender hábitos, conquistar companheiros elegíveis, obter proteção e futuramente usar pets para conquistar outros e obter algumas espécies por ovos. Não reduzir essa visão a caminhada, nem implementar tudo de uma vez.

Pilares:

1. Mundo vivo: fauna procura alimento/água, descansa, foge, caça e defende território. Clima e ciclo diário podem influenciar expansões. Simulação legível, com simplificação à distância antes de aumentar população.
2. Geografia e exploração: relevo, caminhos, água, vegetação, marcos e habitats influenciam encontros e navegação. Descoberta recompensa observar, não apenas combater.
3. Conhecimento gradual: catálogo de taxonomia, habitat, dieta e comportamento, com fatos curtos em português. Fantasia identificada como fantasia. Fotografia, rastros e desafios científicos são futuros.
4. Vínculo contextual: confiança, alimentação, temperamento e observação. Nem toda espécie é domesticável. Pet possui identidade e comandos úteis, não apenas uma barra de progresso.
5. Defesa e companhia: selvagens podem ameaçar/atacar conforme contexto; companheiros podem proteger. Rastrear, explorar, acalmar e auxiliar a domesticação de outras espécies são expansões preservadas.
6. Fantasia própria: **Auryn** é a criatura fantástica do protótipo; **Lumirraposa** era a denominação histórica da mesma proposta, presente somente no registro antigo. Não criar espécie concorrente nem renomear saves.
7. Single-player primeiro; arquitetura organizada para crescer. Multiplayer não é prioridade.
8. Web/PWA, mobile landscape-first: navegador PC e celular, instalação opcional onde suportada, offline progressivo, atualização informada e saves locais sem conta.

## Mundo e classificações futuras

Biomas e relevos da visão completa: florestas tropicais/temperadas, savanas, desertos, tundras, taigas, montanhas, planícies, planaltos, pântanos, manguezais, rios, lagos, oceanos, recifes, ilhas, cavernas, ambientes subterrâneos e regiões fantásticas. Cada região combina clima, altitude, recursos, flora e fauna. Não multiplicar regiões antes de consolidar a Mata da Nascente.

Classificação biológica independente de habitat: mamíferos, aves, répteis, anfíbios, peixes, insetos, aracnídeos e outros invertebrados; fantasia separada. Habitats podem se sobrepor: terrestre, aquático, semiaquático, aéreo, subterrâneo e arborícola. Definição de espécie deve separar ID/nome/taxonomia/habitat/dieta/temperamento/capacidades da instância viva e do asset. Adicionar sentidos, tamanho, memória, grupos e referências licenciadas quando houver uso concreto.

Ovos/incubação/nascimento são futuros, somente para espécies ovíparas. Mamíferos não ganham ovos para simplificar o sistema; criaturas fantásticas podem ter regras próprias explicitadas. Crescimento e genética não entram neste MVP.

## MVP — Mata da Nascente

- Uma floresta pequena navegável, lago, trilhas, árvores, rochas, limites visíveis e locais de observação. Cena imaginária com fauna de diferentes regiões; não apresentar coexistência de lobo-cinzento, águia-real e capivara como ecossistema brasileiro real.
- Movimento responsivo, diagonal normalizada, corrida/energia, pulo, interação e colisões. Natação superficial já existe; mergulho e exploração aquática complexa são futuros.
- Terceira pessoa padrão, primeira pessoa alternável, rotação, zoom desktop e prevenção aproximada de obstrução da câmera. Zoom touch e câmera por geometria completa ainda pendentes.
- Capivara, coelho-tapiti, lobo-cinzento, águia-real e Auryn, com silhuetas e comportamentos distintos. Assets procedurais provisórios são aceitáveis, sem prometer modelos finais.
- Loop: explorar → colher frutiluz → encontrar Auryn → observar parada → aproximar com calma → oferecer após confiança suficiente → vínculo → seguir/esperar/proteger/voltar → diário → salvar/continuar.
- Diário com campos bloqueados até descoberta, observação e interação; bolsa com recursos utilizáveis, quantidades limitadas e feedback de coleta/uso. Guia textual pode orientar até haver minimapa real.
- Save local versionado e validado, falhas visíveis, novo jogo confirmado e backup na substituição. Preferências separadas. Nenhuma conta ou serviço pago obrigatório.
- Touch independente para joystick/câmera/ações, limpeza por cancelamento/captura/foco/orientação, alvos de pelo menos 44 CSS px e safe areas. Portrait orienta girar, mas permite continuar. Menus acessíveis por teclado e todos com pausa consistente.
- Qualidade auto/baixa/média/alta com efeito real em resolução/vegetação/sombras. Metas de 30 FPS mobile intermediário e 60 FPS PC dependem de medição em hardware.

## Aceitação verificável

1. Typecheck, testes de regras e regressões, build e diff check passam.
2. Percurso completo do vínculo tem consumo correto e restauração de identidade/comando/descobertas.
3. Emulação Chromium desktop, landscape e portrait verifica UI, multitouch e cancelamentos. Testes físicos Android/Chrome e iPhone/Safari são relatados separadamente, nunca inferidos.
4. Manifest, ícones, registro, shell offline, atualização e integridade do save são testados no build, incluindo subdiretório de hospedagem. Instalação pela tela inicial e standalone dependem do navegador e de validação específica.
5. Documentação distingue implementado, parcial, futuro e validado. Nenhum botão sem efeito ou afirmação científica inventada.
6. Sem merge na main, deploy, force push, descarte de branches ou assets sem licença durante rodadas de auditoria.

## Fora do MVP

Multiplayer, planeta completo, dezenas de biomas/espécies, economia, construção, montarias, genética, reprodução/ovos, fome/temperatura complexas, domesticação assistida e locomoção aérea/subterrânea do jogador. Permanecem na visão; não são recursos disponíveis.
