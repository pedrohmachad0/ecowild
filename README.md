# EcoWild

Jogo web 3D de exploração, biologia e fantasia de Pedro Henrique Machado dos Santos. A **Mata da Nascente** é um protótipo jogável: cinco espécies, 11 animais com IA simples, coleta, diário gradual, vínculo com a **Auryn**, comandos de companheira e progresso local. Single-player, sem conta ou telemetria.

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

Siga a trilha desde a clareira até o bosque do orvalho, a sudoeste do lago. Colha um frutiluz, aproxime-se andando e observe a Auryn sem se mover por pelo menos três segundos. Espere confiança **58** e tranquilidade; ofereça o fruto a menos de 2,4 metros. Ofertas prematuras são recusadas sem consumir o item. Apenas a Auryn é domesticável. “Lumirraposa” é o nome histórico dessa mesma ideia na fundação anterior, não uma sexta espécie.

| Ação | PC | Toque |
|---|---|---|
| Mover / correr | WASD ou setas / segurar Shift | Joystick / segurar Correr |
| Olhar / zoom | Arrastar mouse / roda | Arrastar região direita; pinça com dois dedos para zoom |
| Pular / interagir / câmera | Espaço / E / V | Botões correspondentes |
| Diário / bolsa / guia / pausa | C / Tab / M / Esc | Menu superior |
| Comer fruto | F ou bolsa | Bolsa |
| Seguir / esperar / proteger / voltar | 1 / 2 / 3 / 4 | Pausa → companheira |

Todos os painéis pausam a simulação. Comandos escolhidos na pausa são registrados imediatamente e executados ao retornar. Proteção afasta lobos próximos da companheira; não funciona à distância. O guia descreve marcos, não é um minimapa. Há natação superficial simplificada no lago, sem mergulho. Qualidade, sensibilidade e zona morta estão em Pausa e persistem separadas do progresso. Gamepad padrão possui mapeamento básico; não há validação física de controle.

## Progresso e instalação

- IndexedDB `ecowild`, store `slots`, save v1. Autosave a cada oito segundos de simulação, gravação manual e tentativa ao ocultar a aba. Falhas aparecem na interface; é possível continuar a sessão.
- Novo jogo pede confirmação quando existe progresso ou quando a leitura falhou. A primeira substituição guarda o slot anterior em `backup`, atomicamente. Em **Progresso / backup**, no título ou na pausa, exporte JSON e restaure com confirmação. A restauração troca os slots atomicamente e permite desfazer: durante uma partida, preserva a sessão pausada no backup. Formatos incompatíveis podem ser exportados, mas não restaurados. Importação de arquivos ainda não está disponível. Não limpe os dados do navegador se quiser preservar o progresso.
- Duas abas não podem sobrescrever silenciosamente o progresso uma da outra: a primeira gravação vence e a sessão desatualizada precisa ser exportada, se desejado, antes de recarregar. A comparação ocorre na transação IndexedDB; exportar e consultar o backup não liberam uma sessão em conflito. Abas com versões antigas do app não aplicam essa proteção: feche-as antes de jogar.
- Versões desconhecidas e saves estruturalmente inválidos são preservados, sem carregamento nem conversão destrutiva. O schema v1 é o único publicado; não havia um formato anterior de progresso na fundação histórica.
- PWA opcional: “Instalar / ajuda” usa o prompt quando disponível; no Safari iOS, orienta Compartilhar → Adicionar à Tela de Início. Instalação e orientação variam por navegador.
- Após a preparação offline, o shell e todo o conteúdo local deste MVP ficam em cache (limite de 8 MiB por versão). Atualização é voluntária, salva antes de recarregar e pede que outras abas sejam fechadas. Cache não substitui save. O navegador pode remover armazenamento.

## Evidências e limites

Veja [continuação e testes de recuperação/zoom](docs/FOLLOWUP_2026-10-26.md), [auditoria e validação](docs/AUDIT_2026-10-26.md), [arquitetura](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md) e [roteiros reproduzíveis](docs/TESTING.md). Emulação Chromium é separada de teste físico: **iPhone/Safari, Android/Chrome e instalação pelo sistema operacional ainda precisam de validação real**. 30 FPS mobile e 60 FPS PC são metas, não garantias.

A mata é um ambiente imaginário que reúne fauna de regiões diferentes. Auryn e frutiluz são fantasia explícita; lobos-cinzentos e águias-reais não são nativos do Brasil. Modelos e sons são procedurais e provisórios; fontes das informações e origem dos ícones estão em [ASSETS.md](docs/ASSETS.md).

Comece contribuições por [AGENTS.md](AGENTS.md). Os arquivos `agents/*.md` são instruções, não processos automáticos.
