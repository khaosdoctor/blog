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

## 2. Conteúdo da página `/about/`

O link existe na navegação e hoje dá 404. Nenhum agente inventou a bio, de propósito: o texto é seu.

## 3. Os três tons abaixo de 4.5:1

Verde claro 3.29, amarelo claro 3.23 e roxo escuro 4.22 continuam abaixo do piso, escolha sua feita com os números na
tela. Agora que existe o seletor de destaque (o leitor pode fixar uma cor), vale decidir se algum deles sai do sorteio
automático como o roxo já saiu, ou se ficam como estão.

## 4. Qual face de corpo vence

Literata é o padrão e Atkinson Hyperlegible é a alternativa no menu. A decisão de qual das duas é *a* fonte do site
segue aberta.

---

## Em andamento do meu lado

Não são perguntas, são coisas em construção ou dívida conhecida. Ficam aqui para você não descobrir de surpresa.

- **Índice fixo na margem esquerda.** No ar em todo post, nos dois idiomas, com revelação do título completo no hover.
  Falta uma decisão sua: se ele começa dobrado nos níveis h3 em post longo.
- **Navegador agora existe.** O que antes era raciocinado a partir do CSS passou a ser medido: `tests/e2e/` roda
  Chrome contra o site construído e cobre a régua mobile (todo tipo de página em seis larguras, mais o piso de área
  de toque), as cores dos blocos de código, a etiqueta de linguagem, a fonte dos labs e a barra de leitura. O que
  ainda ninguém olhou de fato é o conteúdo: se os posts publicados leem bem com a tipografia e os quadros decididos.
- **Migração do pipeline de markdown.** Dívida desbloqueada: o motivo de não migrar dos arrays depreciados para o
  processador novo caiu quando o `astro-mermaid` passou a suportar os dois. Detalhes e a receita de verificação em
  `docs/decisions-log.md`.
- **Duas imagens irrecuperáveis** em `.migration/unreachable-media.md` (uma do memegenerator, uma do
  `lh3.googleusercontent.com`). Talvez respondam a um navegador, já que recusaram um script. Até lá, o cartão de imagem
  ausente cobre as duas.
