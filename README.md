# Quatrilho

Aplicacao React que simula uma partida de quatrilho com baralho espanhol de
40 cartas.

## O que o jogo faz

- Cria quatro jogadores e distribui 10 cartas para cada um.
- Usa os naipes do baralho espanhol: Ouros, Copas, Espadas e Paus.
- Coloca o jogador humano como `mao`, a pessoa a direita de quem deu as cartas.
- Antes da primeira vaza, o `mao` escolhe uma carta que nao possui para chamar
  seu parceiro.
- Mantem o parceiro oculto ate a carta chamada ser jogada na mesa.
- Permite escolher qual carta jogar quando for sua vez.
- Obriga todos os jogadores a seguir o naipe iniciado na vaza quando possuem
  carta daquele naipe.
- Permite descartar ou carregar pontos com outro naipe quando o jogador nao
  consegue seguir o naipe iniciado.
- Resolve cada vaza, soma os pontos capturados e exibe um registro da partida.

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
