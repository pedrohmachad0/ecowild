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

## Runtime e evidências atuais

- Entrada ativa: `src/main.ts` → `src/game/EcoWildGame.ts`. Leia `docs/ARCHITECTURE.md` antes de alterar módulos da fundação antiga; não iniciar uma segunda cena nem duplicar espécies.
- `game/data/species.ts` é a fonte dos perfis. Auryn corresponde à antiga proposta Lumirraposa; o adaptador legado conserva `lumifox` apenas por compatibilidade.
- Não aceitar versão desconhecida de save, tratar leitura falha como slot vazio nem substituir progresso sem confirmação na interface. Cache PWA nunca limpa IndexedDB.
- Verifique o percurso completo e leia `docs/TESTING.md`: scripts de emulação são opcionais, suas dependências devem estar disponíveis. Não editar módulos durante roteiro Vite em andamento, pois HMR invalida a execução.
- Preserve a visão fundadora de PROJECT_SPEC e sua matriz no ROADMAP. Sistemas futuros não viram botões decorativos. Decisões comuns de implementação seguem o escopo autorizado; conflitos com risco de perda de dados devem ser isolados e relatados.
