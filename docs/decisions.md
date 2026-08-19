# Decisões abertas

O que ainda depende de você, e nada mais. Este arquivo é curto de propósito: quando um item é respondido ele sai daqui e
vira uma entrada em `docs/decisions-log.md`, que é o registro do que já foi decidido e do motivo.

Em português porque é anotação sua, diferente do resto de `docs/`. A direção visual em formato curto está em
`docs/design.md`, e o raciocínio longo em `docs/theming.md`.

Nada aqui impede o build. Tudo funciona hoje.

---

## 1. Testar o fluxo de escrita no Obsidian

Sua, não minha: escrever um post no vault, publicar e confirmar que ele aparece. É a única parte do sistema que ninguém
verificou de ponta a ponta.

---

## Em andamento do meu lado

Não são perguntas, são coisas em construção ou dívida conhecida. Ficam aqui para você não descobrir de surpresa.

- **Índice fixo na margem esquerda.** Já no ar em todo post (`src/components/PostToc.astro`): moldura dupla ANSI,
  indentação por nível, indicadores de dobra, a linha da seção atual pintada invertida de ponta a ponta, e um botão no
  canto abaixo de 78rem. Falta uma decisão sua: se ele começa dobrado nos níveis h3 em post longo, e se entra como
  chave no menu de preferências junto com as prévias de link.
- **Menu de preferências na navbar.** Em construção: esquema de cor, animações, tamanho e face do corpo, alto contraste,
  tema fósforo e âmbar, prévias de link, posição das notas de rodapé e tema de código, todos num só lugar. Absorve o
  seletor de tema de código que hoje mora em cada bloco e o botão de prévias fixadas que não tinha casa.
- **Migração do pipeline de markdown.** Dívida desbloqueada: o motivo de não migrar dos arrays depreciados para o
  processador novo caiu quando o `astro-mermaid` passou a suportar os dois. Detalhes e a receita de verificação em
  `docs/decisions-log.md`.
- **Duas imagens irrecuperáveis** em `.migration/unreachable-media.md` (uma do memegenerator, uma do
  `lh3.googleusercontent.com`). Talvez respondam a um navegador, já que recusaram um script. Até lá, o cartão de imagem
  ausente cobre as duas.
