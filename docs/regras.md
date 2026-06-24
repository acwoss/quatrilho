# Regras do Quatrilho — Variante documentada

> Documento vivo. Vamos preenchendo as seções conforme as regras são definidas.
> Status de cada item: ✅ definido · ⏳ a definir · ❓ em dúvida

## 1. Setup básico

- **Jogadores:** 4 ✅
- **Formação:** 2 duplas (2 vs 2), porém **dinâmicas e ocultas** — definidas a cada mão pela
  "chamada" do jogador mão (ver Seção 2). A posição na mesa **não** determina a dupla ✅
- **Baralho:** espanhol de 40 cartas, sem 8 e 9 ✅
  - Naipes: ouros, copas, espadas e paus (oros, copas, espadas, bastos) — todos com o mesmo peso ✅
  - Valores por naipe (10 cartas): Ás (1), 2, 3, 4, 5, 6, 7, Sota (10), Caballo/Cavalo (11), Rei (12)
- **Cartas por jogador:** 10 (distribui o baralho inteiro, sem monte de compra) ✅
- **Cartas na mesa / monte de compra:** não há ✅

## 2. Formação dinâmica das duplas (a "chamada")

- O jogador **mão** (à direita do dador) analisa suas cartas e **"chama" uma carta** ✅
- **Chamada pública:** o jogador mão **anuncia em voz alta** qual carta chama (ex.: "3 de
  copas"). **Todos ouvem** qual é a carta; apenas **não se sabe quem a possui** (só o portador) ✅
- O jogador que **possuir a carta chamada** torna-se o **parceiro** do jogador mão nesta mão;
  os outros dois formam a dupla adversária ✅
- A **identidade do parceiro fica oculta**: ele **não se identifica**; só é **revelado** no
  momento em que **joga a carta chamada** ✅
- Consequência estratégica: até a revelação, há espaço para **blefe e manipulação** (jogadores
  podem agir para enganar adversários sobre quem é o parceiro) ✅
- No jogo **com chamada**, o jogador mão deve chamar uma carta que **não possui** —
  portanto sempre forma dupla com outro jogador. (Há um modo separado de jogar sozinho:
  ver Seção 9 — Jogo solo.) ✅
- Como as 40 cartas são todas jogadas ao longo das 10 vazas, **o parceiro é sempre revelado**
  até o fim da mão ✅
- **Regra de qual carta pode ser chamada:** ✅
  - Em regra, o jogador mão **sempre chama um 3** (de um naipe cujo 3 ele não possui).
  - **Exceção:** se o jogador mão tiver os **quatro 3** na mão, pode chamar **outra carta**.
    - Carta da exceção: **chamada livre** — qualquer carta que ele não tenha ✅

## 3. Cartas e hierarquia

- **Trunfo / manilha:** não existe trunfo ✅
- **Ordem de força (mais forte → mais fraca):** ✅

  | Posição | Carta | Valor no baralho |
  |---|---|---|
  | 1 (mais forte) | 3 | 3 |
  | 2 | 2 | 2 |
  | 3 | Ás | 1 |
  | 4 | Rei | 12 |
  | 5 | Caballo / Cavalo | 11 |
  | 6 | Sota | 10 |
  | 7 | 7 | 7 |
  | 8 | 6 | 6 |
  | 9 | 5 | 5 |
  | 10 (mais fraca) | 4 | 4 |

  Resumo: `3 > 2 > Ás > Rei > Caballo > Sota > 7 > 6 > 5 > 4`
- **Peso dos naipes:** naipes têm o mesmo valor; importa apenas o número/figura ✅
- **Valor de pontos das cartas:** ver Seção 4 (Objetivo e pontuação)

## 4. Objetivo e pontuação

- **Como se pontua:** pelo valor das cartas capturadas nas vazas, mais um bônus pela última vaza ✅
- **Classificação das cartas para pontuação:**
  - **Figuras** (valem ponto): `3, 2, Ás, Rei, Caballo, Sota`
  - **Brancas** (valem 0): `7, 6, 5, 4`
- **Valor de pontos de cada carta (ao capturar):** ✅

  | Carta | Pontos |
  |---|---|
  | Ás | 3 |
  | 3 | 1 |
  | 2 | 1 |
  | Rei | 1 |
  | Caballo | 1 |
  | Sota | 1 |
  | 7, 6, 5, 4 | 0 |

- **Bônus de última vaza:** a dupla que vencer a **última vaza** ganha **+3 pontos** ✅
- **Total de pontos em jogo:** 8 por naipe × 4 = 32, + 3 da última vaza = **35** ✅
- **Pontos para vencer a mão:** **18 ou mais** (maioria; total ímpar ⇒ sem empate) ✅
- **Apuração:** somam-se os pontos das cartas capturadas por cada dupla (+ bônus da última vaza) para decidir a vencedora ✅

## 5. Aposta e pagamento (variante "prêmio e pagamento")

> Nesta variante não há leilão/declaração durante a mão. A "aposta" é um sistema de
> pagamento em moedas entre as duplas ao fim de cada mão.

- **Banca inicial por jogador:** 100 unidades de moeda, distribuídas como:
  - 20 moedas soltas (feijão, milho, fichas, etc.)
  - 4 palitos, cada palito = 20 moedas
  - Total: 20 + (4 × 20) = 100 ✅
- **Cálculo do prêmio (tentos):** ao definir a dupla vencedora da mão, calcula-se
  `tentos = floor(pontos_da_dupla_vencedora / 3)`.
  - Ex.: 30 pontos → `floor(30/3)` = **10 moedas**
  - Ex.: 25 pontos → `floor(25/3)` = **8 moedas** (25/3 = 8,333…)
- **Regra especial de pontuação máxima:** se a dupla vencedora fizer os **35 pontos**
  (máximo possível), o prêmio é **21 moedas** (valor fixo, não usa a divisão por 3) ✅
- **Pagamento (par a par):** cada jogador da dupla **perdedora** paga `tentos` moedas para
  **cada** jogador da dupla **vencedora** ✅
  - São 4 transferências por mão (2 perdedores × 2 vencedores), cada uma de `tentos` moedas.
  - **Cada vencedor recebe** `2 × tentos`; **cada perdedor paga** `2 × tentos`.
  - Os palitos (20 moedas) funcionam como cédulas para troco quando faltam moedas soltas
    (ex.: ao pagar 8, troca-se um palito por 20 moedas e devolve-se 12). Detalhe físico do
    jogo; na modelagem digital, basta tratar a banca como um **inteiro de moedas**.
- **Fim da partida:** termina quando um **jogador** chega a **0 moedas** ("quebra"). Como as
  duplas são dinâmicas, a quebra é avaliada **por jogador**, não por dupla ✅
  - Não se permite saldo **negativo** (não há dívida).
  - Se um jogador **não tem moedas suficientes** para cobrir o pagamento, paga **o que tem** e
    a **partida termina** nesse momento ✅
- **Lance/declaração durante a mão:** **não existe** (sem truco/leilão). A única "aposta"
  é este pagamento em moedas ao fim da mão ✅

## 6. Dinâmica da rodada

- **Dador (quem distribui):** o 1º dador da partida é **sorteado**; depois o papel de dador
  **roda a cada mão no sentido anti-horário** ✅
- **Distribuição:** 10 cartas para cada um dos 4 jogadores (baralho inteiro) ✅
- **Quem abre a mão:** o jogador à **direita** de quem distribuiu as cartas (= o "mão") ✅
- **Sentido do jogo:** anti-horário ✅
- **Saída do mão:** na primeira vaza o jogador mão pode sair com **qualquer carta** (não
  precisa ser o naipe que chamou) ✅
- **Quem puxa as vazas seguintes:** quem **vence** uma vaza inicia a próxima ✅
- **Obrigatório seguir o naipe?** sim, é obrigatório seguir o naipe da carta que abriu a vaza (se tiver) ✅
- **Se não tem o naipe:** joga qualquer carta de outro naipe. Como não há trunfo, essa carta não vence a vaza ✅
- **Obrigatório superar/"matar"?** não — ao seguir o naipe pode-se jogar qualquer carta dele, inclusive uma menor, conforme a estratégia ✅
- **Como se vence a vaza:** vence a **maior carta (na hierarquia) do naipe que abriu** a vaza ✅
- **Vazas por mão:** 10 (cada jogador tem 10 cartas) ✅

## 7. Comunicação entre parceiros (sinais)

Os sinais são dados pela **forma de jogar a carta** na mesa e podem ser usados em
**qualquer vaza** — inclusive ao descartar uma carta de outro naipe (aproveitando para
sinalizar sobre o naipe descartado). São permitidos e fazem parte do jogo.

> **Sinais são gestos públicos** (todos os 4 jogadores veem), mas têm como alvo o parceiro.
> **Podem ser usados para blefar** — ou seja, um jogador pode dar um sinal **falso** de
> propósito para enganar adversários (e, eventualmente, confundir sobre quem é o parceiro).
> Portanto, o significado abaixo é a **convenção esperada**, não uma garantia de verdade.
>
> **No jogo solo (3 contra 1):** os três adversários formam um time temporário e **usam sinais
> entre si**; o solista, sozinho, pode sinalizar apenas para **blefar**.

> Observação: "carta mais alta da rodada" = a maior carta ainda viva daquele naipe.
> Ex.: o 3 é a mais alta; se o 3 já saiu, o 2 passa a ser a mais alta, e assim por diante.

### Sinal 1 — Bater a carta na mesa
Tem dois significados, conforme a carta jogada:
- **(a) Carta é a mais alta viva do naipe:** o jogador pede para "**liberar o jogo**".
  - O **parceiro** tende a jogar suas cartas mais altas;
  - Os **adversários** tendem a jogar as mais baixas.
- **(b) Carta qualquer (não a mais alta):** indica que o jogador **possui cartas muito altas
  naquele naipe** (tem o 3, ou o 2 se o 3 já saiu, etc.).

### Sinal 2 — Arrastar a carta lateralmente
Indica que o jogador **tem mais cartas daquele naipe** na mão e pode ajudar o parceiro se
necessário ("tenho mais desse naipe, mas não necessariamente venço a vaza").

### Sinal 3 — Arremessar a carta em direção à mesa
Indica que o jogador **não tem mais cartas daquele naipe** ou que está com jogo muito ruim,
pedindo ao parceiro para **não retornar** naquele naipe.

## 8. Estratégias ao não ter o naipe da vaza

Quando o jogador não possui o naipe que abriu a vaza, há duas jogadas típicas:

1. **Descarte:** quando **não** quer dar pontos para aquela vaza (que provavelmente será
   vencida pelo adversário), joga uma carta **branca** (7, 6, 5, 4) de outro naipe.
2. **Carregar:** quando o **parceiro** vai vencer a vaza e o jogador quer **somar pontos**
   para a dupla, joga uma **figura** — principalmente o **Ás** (3 pontos) — na vaza do parceiro.

## 9. Jogo solo (1 vs 3)

Além do jogo normal (com chamada), um jogador pode declarar que jogará **sozinho contra os
outros três**. Existem dois tipos: **solo branco** (mão ruim) e **solo preto** (mão forte).

- **Momento da declaração:** logo após ver as cartas, **antes da chamada**. Se algum jogador
  declara solo, **não há chamada** do 3 (o modo solo substitui o jogo com duplas) ✅
- **Procedimento (passe):** cada jogador, na sua vez (sentido **anti-horário a partir do mão**),
  **declara solo ou passa**. Se **todos passarem**, o mão faz a **chamada normal** do 3 ✅
- **Prioridade entre solistas:** como a declaração segue a ordem anti-horária a partir do mão,
  o **primeiro** a declarar na ordem tem prioridade (vale para solo branco e preto) ✅
- **Quem puxa a primeira vaza:** continua sendo o **jogador mão** (à direita do dador), mesmo
  que o solista seja outro jogador ✅

### 9.1 Solo branco (mão ruim)

- **Situação:** jogador com mão muito ruim, apostando que **não vencerá nenhuma vaza**.
- **Condição de vitória:** vence se **não vencer nenhuma vaza**. **Perde se vencer ao menos
  uma vaza** — nesse momento a rodada pode ser **encerrada** ✅
- **Pagamento (fixo em 10 moedas):**
  - **Vence** (nenhuma vaza): recebe **10 de cada** um dos 3 jogadores (+30 no total) ✅
  - **Perde** (venceu ≥ 1 vaza): paga **10 a cada** um dos 3 jogadores (−30 no total) ✅

### 9.2 Solo preto (mão forte)

- **Situação:** jogador com mão muito boa, apostando que **vencerá a rodada**.
- **Condição de vitória:** fazer a **maior pontuação** (≥ 18 dos 35 pontos), igual ao jogo
  normal — **não** precisa vencer todas as vazas (total ímpar ⇒ nunca há empate) ✅
- **Pagamento:**
  - **Capote a favor** (vence **todas** as vazas): recebe **21 de cada** (+63) ✅
  - **Capote contra** (perde **todas** as vazas): paga **21 a cada** (−63) ✅
  - **Resultado intermediário** (vence/perde a rodada sem capote): `tentos = floor(pontos/3)`,
    pago por/para **cada** um dos 3 jogadores ✅
    - O `pontos` usado é **sempre o do lado vencedor**: se o solista vence, usa a pontuação
      **dele**; se o solista perde, usa a pontuação do **trio** vencedor (`35 − pontos do solista`).
- **Troca de carta (apenas quando o solista é o jogador mão):**
  - O solista pode **pedir uma carta que não tem** (estratégica), entregando **uma carta** à
    sua escolha em troca ✅
  - O adversário que tiver a carta pedida é **obrigado a trocar** ✅
  - **Bônus de compensação:** se esse adversário acabar levando **capote** (perder 21 para o
    solista), ele paga **apenas 10** (em vez de 21) ✅
    - O desconto vale **somente no capote**. Se o solo preto vencer **sem** capote, o adversário
      que trocou paga o **tento normal**, sem desconto ✅
