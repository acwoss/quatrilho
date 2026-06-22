import { useEffect, useMemo, useState } from 'react';

const HUMAN_PLAYER = 0;

const SUITS = [
  { id: 'ouros', name: 'Ouros', short: 'O', className: 'gold' },
  { id: 'copas', name: 'Copas', short: 'C', className: 'cups' },
  { id: 'espadas', name: 'Espadas', short: 'E', className: 'swords' },
  { id: 'paus', name: 'Paus', short: 'P', className: 'clubs' },
];

const RANKS = [
  { value: 1, label: '1', name: 'As', strength: 14, points: 11 },
  { value: 2, label: '2', name: 'Dois', strength: 5, points: 0 },
  { value: 3, label: '3', name: 'Tres', strength: 13, points: 10 },
  { value: 4, label: '4', name: 'Quatro', strength: 4, points: 0 },
  { value: 5, label: '5', name: 'Cinco', strength: 6, points: 0 },
  { value: 6, label: '6', name: 'Seis', strength: 7, points: 0 },
  { value: 7, label: '7', name: 'Sete', strength: 8, points: 0 },
  { value: 10, label: 'S', name: 'Sota', strength: 9, points: 2 },
  { value: 11, label: 'C', name: 'Cavalo', strength: 10, points: 3 },
  { value: 12, label: 'R', name: 'Rei', strength: 11, points: 4 },
];

const PLAYERS = [
  { name: 'Voce', seat: 'Sul' },
  { name: 'Ana', seat: 'Oeste' },
  { name: 'Bruno', seat: 'Norte' },
  { name: 'Clara', seat: 'Leste' },
];

const DEALER_INDEX = 1;
const HAND_INDEX = 0;

function buildDeck() {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit.id}-${rank.value}`,
      suit: suit.id,
      suitName: suit.name,
      suitShort: suit.short,
      suitClassName: suit.className,
      rank: rank.value,
      rankLabel: rank.label,
      rankName: rank.name,
      strength: rank.strength,
      points: rank.points,
    })),
  );
}

function shuffle(cards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function sortHand(cards) {
  const suitOrder = new Map(SUITS.map((suit, index) => [suit.id, index]));

  return [...cards].sort((first, second) => {
    const suitDifference =
      suitOrder.get(first.suit) - suitOrder.get(second.suit);

    if (suitDifference !== 0) {
      return suitDifference;
    }

    return second.strength - first.strength;
  });
}

function createInitialGame() {
  const deck = shuffle(buildDeck());
  const players = PLAYERS.map((player, playerIndex) => ({
    ...player,
    hand: sortHand(deck.filter((_, cardIndex) => cardIndex % 4 === playerIndex)),
    capturedCards: [],
  }));

  return {
    phase: 'calling',
    players,
    dealerIndex: DEALER_INDEX,
    handIndex: HAND_INDEX,
    currentTurnIndex: HAND_INDEX,
    currentLeaderIndex: HAND_INDEX,
    trickCards: [],
    tricks: [],
    calledCardId: null,
    calledCard: null,
    partnerIndex: null,
    partnerRevealed: false,
    scores: {
      callerTeam: 0,
      opponents: 0,
    },
    log: [
      `${PLAYERS[DEALER_INDEX].name} deu as cartas. ${PLAYERS[HAND_INDEX].name} e o mao e deve chamar uma carta para formar parceria secreta.`,
    ],
  };
}

function cardName(card) {
  return `${card.rankName} de ${card.suitName}`;
}

function getValidCards(game, playerIndex) {
  const hand = game.players[playerIndex].hand;

  if (game.trickCards.length === 0) {
    return hand;
  }

  const ledSuit = game.trickCards[0].card.suit;
  const suitedCards = hand.filter((card) => card.suit === ledSuit);

  return suitedCards.length > 0 ? suitedCards : hand;
}

function canPlayCard(game, playerIndex, cardId) {
  return getValidCards(game, playerIndex).some((card) => card.id === cardId);
}

function getCurrentTrickWinner(trickCards) {
  if (trickCards.length === 0) {
    return null;
  }

  const ledSuit = trickCards[0].card.suit;

  return trickCards
    .filter((play) => play.card.suit === ledSuit)
    .reduce((winner, play) =>
      play.card.strength > winner.card.strength ? play : winner,
    );
}

function isCallerTeam(game, playerIndex) {
  return playerIndex === game.handIndex || playerIndex === game.partnerIndex;
}

function chooseAiCard(game, playerIndex) {
  const validCards = getValidCards(game, playerIndex);
  const ledSuit = game.trickCards[0]?.card.suit;
  const hasLedSuit = Boolean(ledSuit && validCards[0]?.suit === ledSuit);
  const currentWinner = getCurrentTrickWinner(game.trickCards);
  const teammateWinning =
    currentWinner && isCallerTeam(game, currentWinner.playerIndex) === isCallerTeam(game, playerIndex);

  if (hasLedSuit) {
    const winningCards = currentWinner
      ? validCards
          .filter(
            (card) =>
              card.suit === currentWinner.card.suit &&
              card.strength > currentWinner.card.strength,
          )
          .sort((first, second) => first.strength - second.strength)
      : [];

    if (!teammateWinning && winningCards.length > 0) {
      return winningCards[0];
    }

    return [...validCards].sort((first, second) => {
      if (first.points !== second.points) {
        return first.points - second.points;
      }

      return first.strength - second.strength;
    })[0];
  }

  if (teammateWinning) {
    return [...validCards].sort((first, second) => {
      if (second.points !== first.points) {
        return second.points - first.points;
      }

      return second.strength - first.strength;
    })[0];
  }

  return [...validCards].sort((first, second) => {
    if (first.points !== second.points) {
      return first.points - second.points;
    }

    return first.strength - second.strength;
  })[0];
}

function playCardInGame(game, playerIndex, cardId) {
  if (game.phase !== 'playing' || game.currentTurnIndex !== playerIndex) {
    return game;
  }

  if (!canPlayCard(game, playerIndex, cardId)) {
    return {
      ...game,
      log: [
        `${game.players[playerIndex].name} precisa seguir o naipe iniciado, se tiver carta dele.`,
        ...game.log,
      ],
    };
  }

  const player = game.players[playerIndex];
  const playedCard = player.hand.find((card) => card.id === cardId);
  const players = game.players.map((currentPlayer, currentIndex) =>
    currentIndex === playerIndex
      ? {
          ...currentPlayer,
          hand: currentPlayer.hand.filter((card) => card.id !== cardId),
        }
      : currentPlayer,
  );
  const trickCards = [...game.trickCards, { playerIndex, card: playedCard }];
  const didRevealPartner =
    playedCard.id === game.calledCardId && !game.partnerRevealed;
  const revealLog = didRevealPartner
    ? [
        `${player.name} jogou a carta chamada (${cardName(playedCard)}) e revelou a parceria com o mao.`,
      ]
    : [];
  const playLog = `${player.name} jogou ${cardName(playedCard)}.`;

  if (trickCards.length < PLAYERS.length) {
    return {
      ...game,
      players,
      trickCards,
      partnerRevealed: game.partnerRevealed || didRevealPartner,
      currentTurnIndex: (playerIndex + 1) % PLAYERS.length,
      log: [...revealLog, playLog, ...game.log],
    };
  }

  const winner = getCurrentTrickWinner(trickCards);
  const trickPoints = trickCards.reduce((total, play) => total + play.card.points, 0);
  const winnerIsCallerTeam = isCallerTeam(game, winner.playerIndex);
  const nextScores = {
    callerTeam: game.scores.callerTeam + (winnerIsCallerTeam ? trickPoints : 0),
    opponents: game.scores.opponents + (winnerIsCallerTeam ? 0 : trickPoints),
  };
  const nextPlayers = players.map((currentPlayer, currentIndex) =>
    currentIndex === winner.playerIndex
      ? {
          ...currentPlayer,
          capturedCards: [
            ...currentPlayer.capturedCards,
            ...trickCards.map((play) => play.card),
          ],
        }
      : currentPlayer,
  );
  const completedTrick = {
    number: game.tricks.length + 1,
    cards: trickCards,
    winnerIndex: winner.playerIndex,
    points: trickPoints,
  };
  const isFinished = nextPlayers.every((currentPlayer) => currentPlayer.hand.length === 0);
  const completionLog = `Vaza ${completedTrick.number}: ${game.players[winner.playerIndex].name} venceu e levou ${trickPoints} ponto(s).`;

  return {
    ...game,
    phase: isFinished ? 'finished' : 'playing',
    players: nextPlayers,
    trickCards: [],
    tricks: [completedTrick, ...game.tricks],
    partnerRevealed: game.partnerRevealed || didRevealPartner,
    currentLeaderIndex: winner.playerIndex,
    currentTurnIndex: winner.playerIndex,
    scores: nextScores,
    log: [
      ...(isFinished ? ['Partida encerrada. Confira o placar final.'] : []),
      completionLog,
      ...revealLog,
      playLog,
      ...game.log,
    ],
  };
}

function Card({ card, disabled = false, selected = false, onClick }) {
  return (
    <button
      className={`card ${card.suitClassName}${selected ? ' selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      title={`${cardName(card)} - ${card.points} ponto(s)`}
    >
      <span className="card-rank">{card.rankLabel}</span>
      <span className="card-suit">{card.suitShort}</span>
      <span className="card-name">{card.rankName}</span>
      <span className="card-points">{card.points} pts</span>
    </button>
  );
}

function PlayerPanel({ player, isDealer, isHand, isCurrent, isPartner, revealed }) {
  return (
    <article className={`player-panel${isCurrent ? ' current' : ''}`}>
      <div>
        <h3>{player.name}</h3>
        <p>{player.seat}</p>
      </div>
      <div className="player-tags">
        {isDealer && <span>Dealer</span>}
        {isHand && <span>Mao</span>}
        {isPartner && revealed && <span>Parceiro</span>}
      </div>
      <strong>{player.hand.length} carta(s)</strong>
    </article>
  );
}

function App() {
  const [game, setGame] = useState(createInitialGame);
  const humanHand = game.players[HUMAN_PLAYER].hand;
  const validHumanCardIds = useMemo(
    () => new Set(getValidCards(game, HUMAN_PLAYER).map((card) => card.id)),
    [game],
  );
  const callableCards = useMemo(() => {
    const humanCardIds = new Set(humanHand.map((card) => card.id));

    return sortHand(buildDeck().filter((card) => !humanCardIds.has(card.id)));
  }, [humanHand]);

  useEffect(() => {
    if (game.phase !== 'playing' || game.currentTurnIndex === HUMAN_PLAYER) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => {
        if (
          currentGame.phase !== 'playing' ||
          currentGame.currentTurnIndex === HUMAN_PLAYER
        ) {
          return currentGame;
        }

        const card = chooseAiCard(currentGame, currentGame.currentTurnIndex);
        return playCardInGame(currentGame, currentGame.currentTurnIndex, card.id);
      });
    }, 850);

    return () => window.clearTimeout(timeoutId);
  }, [game.currentTurnIndex, game.phase, game.trickCards.length]);

  function callPartnerCard(card) {
    const partnerIndex = game.players.findIndex((player) =>
      player.hand.some((handCard) => handCard.id === card.id),
    );

    setGame((currentGame) => ({
      ...currentGame,
      phase: 'playing',
      calledCardId: card.id,
      calledCard: card,
      partnerIndex,
      log: [
        `${currentGame.players[currentGame.handIndex].name} chamou ${cardName(card)}. O parceiro fica oculto ate essa carta aparecer na mesa.`,
        ...currentGame.log,
      ],
    }));
  }

  function playHumanCard(card) {
    setGame((currentGame) => playCardInGame(currentGame, HUMAN_PLAYER, card.id));
  }

  function restartGame() {
    setGame(createInitialGame());
  }

  const currentPlayer = game.players[game.currentTurnIndex];
  const ledSuit = game.trickCards[0]?.card.suitName;
  const partnerText =
    game.partnerRevealed && game.partnerIndex !== null
      ? game.players[game.partnerIndex].name
      : 'oculto';
  const callerTeamLabel =
    game.partnerRevealed && game.partnerIndex !== null
      ? `${game.players[game.handIndex].name} e ${game.players[game.partnerIndex].name}`
      : `${game.players[game.handIndex].name} e parceiro oculto`;

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Baralho espanhol de 40 cartas</p>
          <h1>Quatrilho</h1>
          <p>
            Simule uma partida com quatro jogadores, chamada secreta de parceiro
            e vazas em que todos devem seguir o naipe iniciado quando possivel.
          </p>
        </div>
        <button className="secondary-button" onClick={restartGame} type="button">
          Nova partida
        </button>
      </header>

      <section className="scoreboard" aria-label="Placar da partida">
        <article>
          <span>Time do mao</span>
          <strong>{game.scores.callerTeam}</strong>
          <small>{callerTeamLabel}</small>
        </article>
        <article>
          <span>Adversarios</span>
          <strong>{game.scores.opponents}</strong>
          <small>Jogadores restantes</small>
        </article>
        <article>
          <span>Carta chamada</span>
          <strong>{game.calledCard ? cardName(game.calledCard) : 'Aguardando'}</strong>
          <small>Parceiro: {partnerText}</small>
        </article>
      </section>

      {game.phase === 'calling' && (
        <section className="calling-panel">
          <div>
            <p className="eyebrow">Antes da primeira vaza</p>
            <h2>Escolha a carta chamada</h2>
            <p>
              Voce e o mao porque esta a direita de quem deu as cartas. Chame uma
              carta que nao esta na sua mao; quem tiver essa carta sera seu
              parceiro, mas isso so sera revelado quando ela for jogada.
            </p>
          </div>
          <div className="callable-grid">
            {callableCards.map((card) => (
              <Card key={card.id} card={card} onClick={() => callPartnerCard(card)} />
            ))}
          </div>
        </section>
      )}

      <section className="table-section">
        <div className="players-grid">
          {game.players.map((player, index) => (
            <PlayerPanel
              key={player.name}
              player={player}
              isCurrent={index === game.currentTurnIndex && game.phase === 'playing'}
              isDealer={index === game.dealerIndex}
              isHand={index === game.handIndex}
              isPartner={index === game.partnerIndex}
              revealed={game.partnerRevealed}
            />
          ))}
        </div>

        <div className="table">
          <div className="table-status">
            <span>Vaza {game.tricks.length + (game.phase === 'finished' ? 0 : 1)}</span>
            <strong>
              {game.phase === 'finished'
                ? 'Partida finalizada'
                : game.phase === 'calling'
                  ? 'Aguardando chamada'
                  : `Vez de ${currentPlayer.name}`}
            </strong>
            <small>
              {ledSuit
                ? `Naipe iniciado: ${ledSuit}`
                : 'Quem abre a vaza escolhe o naipe.'}
            </small>
          </div>

          <div className="played-cards">
            {game.trickCards.length === 0 ? (
              <p>Nenhuma carta na mesa.</p>
            ) : (
              game.trickCards.map((play) => (
                <div className="played-card" key={`${play.playerIndex}-${play.card.id}`}>
                  <span>{game.players[play.playerIndex].name}</span>
                  <Card card={play.card} disabled />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="hand-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sua mao</p>
            <h2>Escolha qual carta jogar</h2>
          </div>
          <p>
            {game.phase === 'playing' && game.currentTurnIndex === HUMAN_PLAYER
              ? 'Cartas indisponiveis ficam bloqueadas quando voce precisa seguir o naipe.'
              : 'Aguarde sua vez para jogar.'}
          </p>
        </div>
        <div className="hand-grid">
          {humanHand.map((card) => {
            const disabled =
              game.phase !== 'playing' ||
              game.currentTurnIndex !== HUMAN_PLAYER ||
              !validHumanCardIds.has(card.id);

            return (
              <Card
                key={card.id}
                card={card}
                disabled={disabled}
                onClick={() => playHumanCard(card)}
              />
            );
          })}
        </div>
      </section>

      <section className="details-grid">
        <article>
          <h2>Ultimas vazas</h2>
          {game.tricks.length === 0 ? (
            <p>Nenhuma vaza encerrada ainda.</p>
          ) : (
            <ol className="trick-list">
              {game.tricks.slice(0, 5).map((trick) => (
                <li key={trick.number}>
                  <strong>Vaza {trick.number}</strong>
                  <span>
                    {game.players[trick.winnerIndex].name} venceu com{' '}
                    {trick.points} ponto(s).
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article>
          <h2>Registro da partida</h2>
          <ol className="log-list">
            {game.log.slice(0, 8).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  );
}

export default App;
