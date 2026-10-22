# Roadmap

[x] Base Vite/TypeScript/Babylon.js e HTML/CSS.
[x] Protótipo técnico de terreno, árvores, cápsula de jogador, movimentação, salto e câmera alternável experimental.
[x] Registro tipado de cinco espécies e testes unitários iniciais.
[x] AGENTS.md, especificação e agentes especializados.
[ ] Executar npm install, typecheck, testes e build; corrigir eventuais falhas.
[ ] Testar no Android/iOS e melhorar touch, câmera e controles.
[ ] Mapa Mata da Nascente com lago, pedras, trilhas, colisões e interação.
[ ] Renderizar cinco espécies com animações e IA de estados.
[ ] Implementar domesticação, vínculo e comandos de pet.
[ ] Criar catálogo e descobertas.
[ ] IndexedDB versionado e save/load.
[ ] Perfis gráficos, benchmarks e testes E2E.
[ ] Novos biomas, espécies, ovos e sistemas avançados.

Marcar como concluído apenas código realmente implementado. Testes em dispositivos dependem de validação.

## Marcos oficiais do Prompt Mestre
- **M1 Fundação**: build, engine, cena, documentação e CI.
- **M2 Personagem e controles**: movimento, corrida, pulo, colisões, câmera 1ª/3ª pessoa, input unificado, mobile landscape e multitouch.
- **M3 Primeiro bioma**: Mata da Nascente, água, caminhos, vegetação, relevo, limites, iluminação e colisões reais.
- **M4 Fauna**: cinco espécies renderizadas, animações, percepção, estados e comportamentos ecológicos.
- **M5 Domesticação e pets**: confiança, vínculo, Lumirraposa, comandos e navegação segura.
- **M6 Catálogo**: observação, descobertas, enciclopédia e progresso.
- **M7 Persistência**: IndexedDB, versionamento, migrações, save/load.
- **M8 PWA, compatibilidade e otimização**: manifest/ícones, service worker, instalação, offline progressivo, testes em iPhone/Android, qualidade LOW/MEDIUM/HIGH/AUTO e benchmarks.
- **M9 Expansão**: biomas, espécies, sobrevivência, reprodução, ovos, exploração especial e outros sistemas avançados.

## Requisitos transversais e gates
PWA é requisito de lançamento do vertical slice, não opcional; planejar desde a fundação, mas só marcar como implementado após código e testes. Landscape-first é obrigatório no mobile. Para cada marco, registrar separadamente: planejado / implementado / validado em navegador / validado em hardware. Não marcar M2/M3 completos sem colisões e interações. Antes de M4, validar navegação, controles e câmera em ambiente real; antes de M5, IA e navegação estáveis. Metas 30 FPS mobile e 60 FPS desktop exigem medição.

## Situação de branches (não confundir com main)
Esta branch `chatgpt` documenta a fundação original. Relatórios externos indicam trabalho adicional na branch `manus` (mundo modular e mobile landscape), **não integrado automaticamente** aqui; verificar GitHub e código antes de atualizar checkboxes. O CI inicial da fundação passou anteriormente, mas alterações futuras exigem novas execuções. Nenhuma implementação de PWA deve ser presumida apenas porque está especificada.
