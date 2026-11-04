# EcoWild

Jogo web 3D de exploração, biologia e fantasia de Pedro Henrique Machado dos Santos. O jogo tem duas regiões ligadas por trilha: a **Mata da Nascente** e a **Vereda do Cerrado**. São quatorze espécies (mamíferos, ave, réptil, anfíbio, peixe e duas criaturas fantásticas), 22 animais com IA, ciclo de dia e noite, coleta, diário com fotos e desafios científicos, vínculo com a **Auryn**, domesticação assistida do **musgarim**, ovos chocados no acampamento, vários companheiros e progresso local. Single-player, sem conta ou telemetria.

Os cinco animais agora têm modelos próprios mais detalhados, olhos, patas, caudas/penas e poses de comportamento. Veja [a comparação visual e a validação da fauna](docs/FAUNA_2026-10-27.md). **Observar** aproxima a câmera de um animal conhecido e mostra seu estado e o próximo passo para criar vínculo com Auryn.

## Executar e verificar

Node.js 20.19+ ou 22.12+.

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

O service worker só é registrado no build de produção, em HTTPS ou localhost. `vite.config.ts` usa base relativa, testada também em `/ecowild/`. O repositório possui CI de verificação, mas **não configura deploy de produção**.

## Jogar

Siga a trilha desde a clareira, ao sul, até o lago ao norte e depois ao bosque do orvalho, a noroeste do lago. Colha um frutiluz, aproxime-se andando e observe a Auryn sem se mover por pelo menos três segundos. Espere confiança **58** e tranquilidade; ofereça o fruto a menos de 2,4 metros. Ofertas prematuras são recusadas sem consumir o item. Apenas a Auryn é domesticável. “Lumirraposa” é o nome histórico dessa mesma ideia na fundação anterior, não uma sexta espécie.

| Ação | PC | Toque |
|---|---|---|
| Mover / correr | WASD ou setas / segurar Shift | Joystick / segurar Correr |
| Olhar / zoom | Arrastar mouse / roda | Arrastar região direita; pinça com dois dedos para zoom |
| Pular / interagir / câmera | Espaço / E / V | Botões correspondentes |
| Observar animal / voltar | Q, com animal conhecido próximo | Observar / Voltar no menu superior |
| Diário / bolsa / guia / pausa | C / Tab / M / Esc | Menu superior |
| Comer fruto | F ou bolsa | Bolsa |
| Seguir / esperar / proteger / voltar | 1 / 2 / 3 / 4 | Pausa → companheira |
| Farejar rastro / pulso calmo da Auryn | 5 / 6 | Pausa → companheiros |
| Fotografar (durante Observar) / afugentar lobos | P / G | Fotografar / Afugentar (botões contextuais) |

**Ciclo e fauna.** Um dia dura 10 minutos. Cada espécie tem horário: o tatu-galinha fica na toca de dia e sai à noite; o sapo-cururu caça à noite na margem; o teiú toma sol nas pedras de dia; a águia pousa à noite; os lambaris nadam em cardume no lago. O diário só registra o que você realmente vê: árvores e rochas bloqueiam a visão, e à noite ela é mais curta.

**Musgarim e ovos.** O musgarim, ao norte, é tímido demais: com a Auryn vinculada, use o pulso calmo perto dele, fique parado até a confiança chegar a 50 e ofereça um fruto da mata. Nos ninhos de musgo há ovos (regra de fantasia): leve um ao ninho aquecido do acampamento, ao sul, e ele choca em alguns minutos, mais rápido de dia. O filhote vira companheiro. Mamíferos reais não vêm de ovos.

**Vereda do Cerrado.** No extremo leste da Mata, uma trilha (E no poste com lanterna) leva ao Cerrado: tamanduás comendo em cupinzeiros, seriemas correndo, o lobo-guará visitando as lobeiras ao entardecer e o brasalume, criatura de fantasia que dorme nos cupinzeiros e só confia em você à noite, com um musgarim companheiro perto dele. Colha fruta-do-lobo para oferecer. Companheiros em Seguir viajam com você; os em Esperar ficam.

**Diário.** Abas Fichas e Desafios (16 desafios científicos, nenhum exige combate), filtros por pesquisa, grupo biológico e região, e fotos tiradas em Observar.

Todos os painéis pausam a simulação. Comandos escolhidos na pausa são registrados imediatamente e executados ao retornar. Proteção afasta lobos próximos da companheira; não funciona à distância. Voltar faz a Auryn correr até você e depois seguir. Com a Auryn a menos de 6 m, **Farejar** marca no guia a espécie com pesquisa pendente mais próxima e **Pulso calmo** acalma animais a 9 m por 8 s (presas não fogem, lobos perdem o foco); elas ajudam a aproximar, não domesticam outras espécies. O guia (M) tem um mapa gráfico com lago, trilha, território dos lobos, frutos e animais já registrados; não há minimapa fixo no HUD. Lobos que defendem o território perto de você acendem o aviso “Lobo rosnando”. Há natação superficial simplificada no lago, sem mergulho. Qualidade, sensibilidade e zona morta estão em Pausa e persistem separadas do progresso. Gamepad padrão possui mapeamento básico; não há validação física de controle.

A câmera de observação permite girar e aproximar, mas a simulação continua: animais fogem e lobos ainda podem atacar. Mover, pular, apertar Q/Voltar ou trocar a câmera encerra o enquadramento. O foco exige animal já avistado, próximo e sem bloqueio pelos volumes de árvores/rochas/terreno; ele não concede descobertas ou confiança. O diário ainda registra por proximidade e calma, sem percepção visual rigorosa. A câmera recua diante de troncos, copas, rochas e solo por volumes aproximados.

## Progresso e instalação

- IndexedDB `ecowild`, store `slots`, save **v3** (saves v1 e v2 são migrados ao carregar e regravados no formato atual na próxima gravação). Autosave a cada oito segundos de simulação, gravação manual e tentativa ao ocultar a aba. Falhas aparecem na interface; é possível continuar a sessão.
- Novo jogo pede confirmação quando existe progresso ou quando a leitura falhou. A primeira substituição guarda o slot anterior em `backup`, atomicamente. Em **Progresso / backup**, no título ou na pausa, exporte JSON e restaure com confirmação. A restauração troca os slots atomicamente e permite desfazer: durante uma partida, preserva a sessão pausada no backup. Formatos incompatíveis podem ser exportados, mas não restaurados. Também é possível importar um JSON exportado: o jogo valida o arquivo e mostra uma prévia antes de confirmar; o progresso substituído fica no backup. Não limpe os dados do navegador se quiser preservar o progresso.
- Duas abas não podem sobrescrever silenciosamente o progresso uma da outra: a primeira gravação vence e a sessão desatualizada precisa ser exportada, se desejado, antes de recarregar. A comparação ocorre na transação IndexedDB; exportar e consultar o backup não liberam uma sessão em conflito. Abas com versões antigas do app não aplicam essa proteção: feche-as antes de jogar.
- Versões desconhecidas e saves estruturalmente inválidos são preservados, sem carregamento nem conversão destrutiva. O schema v1 é o único publicado; não havia um formato anterior de progresso na fundação histórica.
- PWA opcional: “Instalar / ajuda” usa o prompt quando disponível; no Safari iOS, orienta Compartilhar → Adicionar à Tela de Início. Instalação e orientação variam por navegador.
- Após a preparação offline, o shell e todo o conteúdo local deste MVP ficam em cache (limite de 8 MiB por versão). Atualização é voluntária, salva antes de recarregar e pede que outras abas sejam fechadas. Cache não substitui save. O navegador pode remover armazenamento.

## Evidências e limites

Para criar regiões e espécies novas, siga [EXPANDIR](docs/EXPANDIR.md). Veja [expansão: dia/noite, novas espécies, ovos e desafios](docs/EXPANSAO_2026-11-04.md), [revisão de interface e habilidades da companheira](docs/UI_2026-11-04.md), [continuação e testes de recuperação/zoom](docs/FOLLOWUP_2026-10-26.md), [auditoria e validação](docs/AUDIT_2026-10-26.md), [arquitetura](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md) e [roteiros reproduzíveis](docs/TESTING.md). Emulação Chromium é separada de teste físico: **iPhone/Safari, Android/Chrome e instalação pelo sistema operacional ainda precisam de validação real**. 30 FPS mobile e 60 FPS PC são metas, não garantias.

A mata é um ambiente imaginário que reúne fauna de regiões diferentes. Auryn e frutiluz são fantasia explícita; lobos-cinzentos e águias-reais não são nativos do Brasil. Os animais usam geometria estilizada original e animações por articulações, ainda sem rig esquelético/IK ou LOD. Mundo, jogador e sons continuam procedurais; fontes das informações e origem dos assets estão em [ASSETS.md](docs/ASSETS.md).

Comece contribuições por [AGENTS.md](AGENTS.md). Os arquivos `agents/*.md` são instruções, não processos automáticos.
