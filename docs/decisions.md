# Decisões abertas

O que ainda depende de você, e nada mais. Este arquivo é curto de propósito: quando um item é respondido ele sai daqui e
vira uma entrada em `docs/decisions-log.md`, que é o registro do que já foi decidido e do motivo.

Em português porque é anotação sua, diferente do resto de `docs/`. A direção visual em formato curto está em
`docs/design.md`, e o raciocínio longo em `docs/theming.md`.

Nada aqui impede o build. Tudo funciona hoje.

---

## 1. Escolher a fonte do corpo

A última pergunta de tipografia. Título (Departure Mono) e subtítulo (PxPlus IBM VGA8) estão decididos e aplicados no
site inteiro. O corpo continua na pilha serif genérica que era placeholder.

A seção 01 do `/theme-lab/` mostra cada candidata como texto corrido de verdade, em português, com vários parágrafos e no
tamanho real do corpo, porque a pergunta é se a fonte aguenta 3000 palavras e não se ela é bonita numa linha de amostra:

- **IBM Plex Mono**, com o risco que você mesmo apontou: num blog sobre código, uma fonte de corpo monoespaçada e o
  código inline deixam de ser distinguíveis.
- **Handjet a 22px com uns 0.03em de espaçamento extra**, que é o único tamanho em que ela funciona.
- **Inter, Roboto, Source Serif 4, Literata e Atkinson Hyperlegible**, as cinco não pixeladas vendorizadas para existir
  uma fonte de livro normal como comparação. Todas OFL ou Apache-2.0 e todas com os acentos do português conferidos no
  cmap, não só baixadas.

Escolher é trocar o valor de `--font-body` em `src/styles/theme.css` pela pilha da vencedora, que está em
`content/blog/theme-lab/components/faces.ts`.

## 2. Escolher uma capa

As três candidatas estão na seção 04 do `/theme-lab/`, construídas a partir das suas descrições: **janela DOS** (fundo
preto, borda dupla ANSI espaçada, cursor de bloco no fim do título), **sem moldura** (cartão inteiro numa cor da marca,
linha fina até 75% da largura) e **plasma** (campo gerado por semente, com sombra dura atrás das letras).

Cada uma é um SVG no tamanho real de 1200x630, então a escolhida entra no gerador sem ser redesenhada.

Escolher qualquer uma aposenta o `scripts/cover.ts` atual, que chama a Replicate para gerar fundo com IA e depende de um
serviço Deno externo. As três desenham localmente, só geometria e texto, então as capas passam a funcionar offline como
o resto do build.

## 3. Testar o fluxo de escrita no Obsidian

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
