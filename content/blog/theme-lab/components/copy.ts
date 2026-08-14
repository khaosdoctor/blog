/**
 * O texto que todo espécime desta página renderiza. É português real, com toda a
 * acentuação da língua, porque a pergunta que interessa não é se a fonte é bonita
 * em uma linha solta: é se ela aguenta três mil palavras e se ela tem `ã`, `õ` e
 * `ç` desenhados no mesmo grid do resto.
 */

export const HEADING = 'Quando a abstração vaza'

export const DECK = 'Toda camada que esconde complexidade cobra o preço em algum outro lugar.'

export const PARAGRAPHS = [
  'Uma abstração existe para que você não precise pensar no que está embaixo dela. Enquanto o programa se comporta como o modelo mental que a abstração vendeu, tudo vai bem. O problema aparece no dia em que a camada de baixo se manifesta: a conexão cai no meio de uma transação, o disco enche, o relógio da máquina anda para trás. Nesse momento você precisa entender exatamente aquilo que a abstração prometeu que você nunca ia precisar entender.',
  'É por isso que ler o código de uma dependência é um exercício tão útil. Não para desconfiar dela, mas para saber onde ela desiste. Toda biblioteca tem uma fronteira, e a fronteira quase nunca está documentada. Ela aparece em um comentário de três linhas, em um `try/catch` que engole um erro específico, ou em uma opção com um nome estranho que só faz sentido depois que você já foi mordido pelo caso que ela resolve.',
  'A consequência prática é chata: não existe camada de infraestrutura que dispense conhecimento da camada seguinte. Existe camada que adia esse conhecimento, o que já é bastante coisa. Um bom ORM adia o SQL por anos. Um bom runtime adia a memória para sempre, até o dia em que o processo morre com um heap estourado e alguém precisa ler um dump.',
  'O que dá para fazer é escolher onde as fronteiras ficam, e deixá-las visíveis. Uma função que só falha de duas maneiras é mais fácil de segurar do que uma que falha de dezessete. Um erro que carrega a causa original economiza a tarde de quem for depurar. E uma decisão anotada em algum lugar, com o motivo junto, evita que ela seja revertida por engano seis meses depois, por alguém que não estava na sala.',
]

/** Todo diacrítico que o português usa, para ver se a fonte tem os glifos. */
export const DIACRITICS = 'ã õ á é í ó ú â ê ô à ç · ÃÕÁÉÍÓÚÂÊÔÀÇ'

/** O que uma fonte de código precisa distinguir, no tamanho em que ela vai viver. */
export const CODE_SAMPLE = 'const l1I0O = {} // 0O 1lI 5S 8B ~-= |¦ ({[<>]})'
