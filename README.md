# Quatrilho

Aplicacao React que simula uma partida de quatrilho com baralho espanhol de
40 cartas.

## O que o jogo faz

- Cria quatro jogadores e distribui 10 cartas para cada um.
- Mostra a mesa em formato de jogo, com cada jogador em uma borda da tela.
- Mantem a interface ajustada ao viewport, sem depender de rolagem da pagina.
- Inicia a rodada com uma animacao de distribuicao das cartas saindo do centro
  para a mao de cada jogador.
- Exibe as cartas em arco, com destaque ao passar o mouse sobre uma carta.
- Usa os naipes do baralho espanhol: Ouros, Copas, Espadas e Paus.
- Revesa o `mao` a cada rodada em sentido anti-horario: comeca no jogador
  humano, passa para o jogador a direita e volta ao humano na quinta rodada.
- Antes da primeira vaza, o `mao` escolhe uma carta que nao possui para chamar
  seu parceiro. A chamada deve ser um `3`, exceto quando o `mao` tem os quatro
  `3`; nesse caso, outras cartas ficam liberadas.
- Mostra dicas de chamada conforme a mao do jogador, priorizando combinacoes
  como `As + 3`, `2 + 3` e volume no mesmo naipe.
- Quando o `mao` e controlado pelo app, ele analisa a propria mao e chama uma
  carta automaticamente sem revelar suas cartas ao jogador humano.
- Se a carta chamada estiver na mao do jogador humano, exibe um alerta avisando
  que ele ja sabe que e o parceiro.
- Mantem o parceiro oculto ate a carta chamada ser jogada na mesa.
- Exibe um alerta quando a carta chamada e jogada e a parceria e revelada.
- Permite escolher qual carta jogar quando for sua vez.
- Permite clicar na carta ou arrasta-la para a mesa para jogar.
- Segue a ordem anti-horaria, com o jogador a direita sendo o proximo.
- Indica quem abriu a vaza e quem esta vencendo enquanto as cartas estao na
  mesa.
- Destaca a melhor jogada sugerida e mostra helpers de decisao para o jogador.
- Obriga todos os jogadores a seguir o naipe iniciado na vaza quando possuem
  carta daquele naipe.
- Permite descartar ou carregar pontos com outro naipe quando o jogador nao
  consegue seguir o naipe iniciado.
- Exibe contador de cartas que ja sairam por naipe, ajudando a identificar
  cartas firmes.
- Marca como `Franca` a carta da mao que com certeza vence naquele naipe: todo
  `3` e franco, e outras cartas ficam francas quando todas as cartas maiores do
  mesmo naipe ja foram jogadas.
- Permite abrir o historico visual das vazas ja concluidas.
- Mantem a vaza concluida na mesa para revisao; o avanco automatico pode ser
  ligado, mas vem desligado por padrao.
- Cada jogador inicia com 100 moedas.
- Ao final da rodada, a dupla vencedora recebe da dupla perdedora a quantidade
  de moedas equivalente aos tentos feitos pela dupla vencedora.
- Exibe um modal informando se voce ganhou moedas ou deve pagar.
- Resolve cada vaza, soma as figuras capturadas e converte a pontuacao em
  tentos.
- Mostra as cartas com visual simplificado: valor ou icone de figura e simbolo
  do naipe.

## Regras implementadas

- Hierarquia da vaza: `3 > 2 > 1 > Rei > Cavalo > 10 > 7 > 6 > 5 > 4`.
- Figuras que contam pontos: `3`, `2`, `1`, `Rei`, `Cavalo` e `10`.
- O `1` (as) vale 3 figuras; cada uma das demais figuras vale 1.
- Ao final, a soma de figuras de cada dupla e dividida por 3 para formar os
  tentos. Vence a dupla com mais tentos.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Validacao

```bash
npm run lint
npm run build
```

## GitHub Pages

O workflow em `.github/workflows/deploy.yml` compila o projeto e publica o
conteudo de `dist` no GitHub Pages sempre que houver push na branch `main`.

No GitHub, habilite Pages em:

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source: GitHub Actions`

Durante o build no GitHub Actions, o Vite calcula automaticamente o `base` com o
nome do repositorio para que os assets funcionem em
`https://<usuario>.github.io/<repositorio>/`.
