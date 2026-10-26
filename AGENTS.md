# Instruções para qualquer IA no EcoWild

1. Antes de agir, leia docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md, docs/ROADMAP.md e docs/DECISIONS.md.
2. Inspecione o código e identifique o que existe de verdade. Documentação não significa implementação.
3. Escolha especialidade em agents/*.md; siga as responsabilidades e limites.
4. Planeje pequenas mudanças, implemente, execute testes disponíveis e registre resultados reais.
5. Não declarar suporte mobile testado sem teste real; não inventar execução ou desempenho.
6. Trabalhar em branch e PR; não modificar main diretamente.
7. Não incluir segredos, assets sem licença, código monolítico nem funcionalidades falsas.
8. Atualize roadmap e decisões quando alterar escopo/arquitetura.
9. Priorize TypeScript estrito, separação dados/renderização, acessibilidade e desempenho.
10. Agentes são arquivos de instruções, não processos que rodam sozinhos.
11. Para mobile, tratar landscape como experiência primária: separar joystick, câmera e ações por regiões touch e suportar ponteiros simultâneos.
12. Validar emulação por viewport/orientação separadamente de testes em aparelhos físicos; nunca declarar Safari iOS ou Chrome Android físico sem evidência real.
13. Listeners touch devem ter ciclo de vida controlado, `touch-action` explícito e não bloquear os controles desktop.

**Fluxo:** ler -> planejar -> implementar -> testar -> documentar -> revisar.

## Hierarquia e missão do projeto

EcoWild é um jogo 3D estilizado real, modular e executável de exploração, ecossistemas vivos, descoberta científica, criaturas fantásticas, domesticação e companheiros. Não produzir apenas ideias, telas fictícias ou pseudocódigo quando a tarefa pedir implementação. Fonte de requisitos: `docs/PROJECT_SPEC.md`; arquitetura: `docs/ARCHITECTURE.md`; estado e prioridades: `docs/ROADMAP.md`; justificativas: `docs/DECISIONS.md`. Em conflitos de requisito que não possam ser resolvidos pelo escopo já autorizado, sinalize e solicite decisão; nunca presuma que um requisito planejado já funciona.

## Contrato obrigatório de execução

1. Inspecione a branch e o código antes de propor mudanças; verifique commits/PRs concorrentes, inclusive as branches `main`, `chatgpt` e `manus`. Nunca sobrescreva trabalho de outra IA nem mescle branches silenciosamente.
2. Selecione os perfis `agents/*.md` adequados. Cada perfil é uma responsabilidade, não um agente autônomo ativo.
3. Para cada tarefa: objetivo e dependências → escopo pequeno → implementação funcional → typecheck/test/build → testes visuais quando aplicável → documentação → relatório com evidências, pendências e instruções de teste.
4. Use Babylon.js + TypeScript + Vite; mantenha compatibilidade PC e mobile; preserve controles existentes. Separe dados, simulação, input, renderização, UI e persistência.
5. O jogo mobile é **landscape-first**. PWA instalável é requisito de produto, mas instalação, orientação, fullscreen e offline variam conforme plataforma/navegador; implemente fallbacks e teste em aparelhos reais.
6. Não invente resultados, dispositivos testados, FPS, integração PWA ou suporte offline. Um service worker registrado não significa que todos os assets e saves funcionem offline.
7. Não crie botões sem função, assets sem licença, diretórios vazios, abstrações prematuras, código monolítico ou multiplayer no MVP.
8. Não remova recursos existentes sem justificativa e aprovação; não faça merge automático; prefira branches isoladas e PRs revisáveis.
9. Atualize apenas checkboxes verificadamente concluídos. Documente riscos, limitações e decisões de arquitetura.
10. Antes de expandir biomas ou espécies, assegure o vertical slice da Mata da Nascente com exploração, fauna, vínculo, catálogo, save/load e experiência mobile utilizável.

## Regra de preservação da ideia fundadora

Antes de planejar features, leia a seção **“Visão fundadora”** em `docs/PROJECT_SPEC.md` e a matriz de rastreabilidade em `docs/ROADMAP.md`. EcoWild nasceu da combinação de biologia + geografia + biomas/relevos + animais/monstros classificados por habitat e taxonomia + catálogo/colecionáveis + pets exóticos + selvagens que atacam + pets que protegem + domesticação de novos pets auxiliada por companheiros + ovos para alguns pets. **Não reduzir o jogo a um simulador de caminhada, nem excluir silenciosamente esses sistemas por estarem fora do MVP.** Tratar cada requisito como planejado, implementado ou validado; nunca confundir as três condições. PWA mobile landscape é requisito complementar.

## Runtime e evidências atuais

- Entrada ativa: `src/main.ts` → `src/game/EcoWildGame.ts`. Leia `docs/ARCHITECTURE.md` antes de alterar módulos da fundação antiga; não iniciar uma segunda cena nem duplicar espécies.
- `game/data/species.ts` é a fonte dos perfis. Auryn corresponde à antiga proposta Lumirraposa; o adaptador legado conserva `lumifox` apenas por compatibilidade.
- Não aceitar versão desconhecida de save, tratar leitura falha como slot vazio nem substituir progresso sem confirmação na interface. Cache PWA nunca limpa IndexedDB.
- Verifique o percurso completo e leia `docs/TESTING.md`: scripts de emulação são opcionais, suas dependências devem estar disponíveis. Não editar módulos durante roteiro Vite em andamento, pois HMR invalida a execução.
- Preserve a visão fundadora de PROJECT_SPEC e sua matriz no ROADMAP. Sistemas futuros não viram botões decorativos. Decisões comuns de implementação seguem o escopo autorizado; conflitos com risco de perda de dados devem ser isolados e relatados.
