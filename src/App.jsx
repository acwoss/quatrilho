import { useEffect, useMemo, useState } from 'react';

const HUMAN_PLAYER = 0;
const DEALER_INDEX = 1;
const HAND_INDEX = 0;
const CARDS_PER_PLAYER = 10;
const TOTAL_CARDS = 40;

const SUITS = [
  { id: 'ouros', name: 'Ouros', short: 'O', className: 'gold' },
  { id: 'copas', name: 'Copas', short: 'C', className: 'cups' },
  { id: 'espadas', name: 'Espadas', short: 'E', className: 'swords' },
  { id: 'paus', name: 'Paus', short: 'P', className: 'clubs' },
];

const RANKS = [
  { value: 12, label: 'Rei', name: 'Rei', strength: 7, figurePoints: 1 },
  { value: 11, label: 'Cavalo', name: 'Cavalo', strength: 6, figurePoints: 1 },
  { value: 10, label: '10', name: 'Dez', strength: 5, figurePoints: 1 },
  { value: 7, label: '7', name: 'Sete', strength: 4, figurePoints: 0 },
  { value: 6, label: '6', name: 'Seis', strength: 3, figurePoints: 0 },
  { value: 5, label: '5', name: 'Cinco', strength: 2, figurePoints: 0 },
  { value: 4, label: '4', name: 'Quatro', strength: 1, figurePoints: 0 },
  { value: 3, label: '3', name: 'Tres', strength: 10, figurePoints: 1 },
  { value: 2, label: '2', name: 'Dois', strength: 9, figurePoints: 1 },
  { value: 1, label: '1', name: 'As', strength: 8, figurePoints: 3 },
];

const PLAYERS = [
  { name: 'Voce', seat: 'sul', seatLabel: 'Sul' },
  { name: 'Ana', seat: 'oeste', seatLabel: 'Oeste' },
  { name: 'Bruno', seat: 'norte', seatLabel: 'Norte' },
  { name: 'Clara', seat: 'leste', seatLabel: 'Leste' },
];

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
      figurePoints: rank.figurePoints,
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

function dealDeck(deck) {
  return PLAYERS.map((player, playerIndex) => ({
    ...player,
    hand: sortHand(deck.filter((_, cardIndex) => cardIndex % 4 === playerIndex)),
    capturedCards: [],
  }));
}

function createInitialGame() {
  const deck = shuffle(buildDeck());

  return {
    phase: 'dealing',
    dealProgress: 0,
    players: dealDeck(deck),
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
      `${PLAYERS[DEALER_INDEX].name} esta distribuindo as cartas. ${PLAYERS[HAND_INDEX].name} sera o mao.`,
    ],
  };
}

function cardName(card) {
  return `${card.rankName} de ${card.suitName}`;
}

function formatTentos(figurePoints) {
  const tentos = figurePoints / 3;

  return Number.isInteger(tentos) ? String(tentos) : tentos.toFixed(1);
}

function getVisibleDealCount(dealProgress, playerIndex) {
  let count = 0;

  for (let index = 0; index < dealProgress; index += 1) {
    if (index % PLAYERS.length === playerIndex) {
      count += 1;
    }
  }

  return Math.min(count, CARDS_PER_PLAYER);
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
    currentWinner &&
    isCallerTeam(game, currentWinner.playerIndex) === isCallerTeam(game, playerIndex);

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
      if (first.figurePoints !== second.figurePoints) {
        return first.figurePoints - second.figurePoints;
      }

      return first.strength - second.strength;
    })[0];
  }

  if (teammateWinning) {
    return [...validCards].sort((first, second) => {
      if (second.figurePoints !== first.figurePoints) {
        return second.figurePoints - first.figurePoints;
      }

      return second.strength - first.strength;
    })[0];
  }

  return [...validCards].sort((first, second) => {
    if (first.figurePoints !== second.figurePoints) {
      return first.figurePoints - second.figurePoints;
    }

    return first.strength - second.strength;
  })[0];
}

function getResult(game) {
  if (game.scores.callerTeam > game.scores.opponents) {
    return 'A dupla do mao venceu.';
  }

  if (game.scores.opponents > game.scores.callerTeam) {
    return 'A dupla adversaria venceu.';
  }

  return 'A partida terminou empatada em tentos.';
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
        `${player.name} jogou a carta chamada (${cardName(playedCard)}) e revelou a parceria.`,
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
  const trickPoints = trickCards.reduce(
    (total, play) => total + play.card.figurePoints,
    0,
  );
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
    figurePoints: trickPoints,
  };
  const isFinished = nextPlayers.every(
    (currentPlayer) => currentPlayer.hand.length === 0,
  );
  const completionLog = `Vaza ${completedTrick.number}: ${game.players[winner.playerIndex].name} venceu e levou ${trickPoints} figura(s).`;

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
      ...(isFinished ? ['Partida encerrada. Figuras convertidas em tentos.'] : []),
      completionLog,
      ...revealLog,
      playLog,
      ...game.log,
    ],
  };
}

function Card({ card, disabled = false, compact = false, onClick }) {
  return (
    <button
      className={`card ${card.suitClassName}${compact ? ' compact' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      title={`${cardName(card)} - ${card.figurePoints} figura(s)`}
    >
      <span className="card-rank">{card.rankLabel}</span>
      <span className="card-suit">{card.suitShort}</span>
      <span className="card-name">{card.rankName}</span>
      <span className="card-points">{card.figurePoints} fig</span>
    </button>
  );
}

function CardBack({ index = 0 }) {
  return (
    <span
      aria-label="Carta virada"
      className="card-back"
      style={{ '--card-offset': index }}
    />
  );
}

function PlayerSeat({
  player,
  playerIndex,
  game,
  isCurrent,
  isHuman,
  visibleDealCount,
  validHumanCardIds,
  onPlay,
}) {
  const visibleCards =
    game.phase === 'dealing' ? player.hand.slice(0, visibleDealCount) : player.hand;
  const isDealer = playerIndex === game.dealerIndex;
  const isHand = playerIndex === game.handIndex;
  const isPartner = playerIndex === game.partnerIndex && game.partnerRevealed;
  const hiddenCount = game.phase === 'dealing' ? visibleDealCount : player.hand.length;

  return (
    <section className={`player-seat ${player.seat}${isCurrent ? ' active' : ''}`}>
      <div className="player-banner">
        <div>
          <strong>{player.name}</strong>
          <span>{player.seatLabel}</span>
        </div>
        <div className="player-badges">
          {isDealer && <em>Dealer</em>}
          {isHand && <em>Mao</em>}
          {isPartner && <em>Parceiro</em>}
        </div>
      </div>

      <div className={`seat-cards${isHuman ? ' human-cards' : ''}`}>
        {isHuman
          ? visibleCards.map((card) => {
              const disabled =
                game.phase !== 'playing' ||
                game.currentTurnIndex !== HUMAN_PLAYER ||
                !validHumanCardIds.has(card.id);

              return (
                <Card
                  key={card.id}
                  card={card}
                  disabled={disabled}
                  onClick={() => onPlay(card)}
                />
              );
            })
          : Array.from({ length: hiddenCount }).map((_, index) => (
              <CardBack key={`${player.name}-${index}`} index={index} />
            ))}
      </div>
    </section>
  );
}

function TrickCard({ play, player }) {
  return (
    <div className={`trick-card ${player.seat}`}>
      <span>{player.name}</span>
      <Card card={play.card} compact disabled />
    </div>
  );
}

function CallPanel({ callableCards, onCall }) {
  return (
    <div className="action-panel call-panel">
      <p className="eyebrow">Carta chamada</p>
      <h2>Qual carta gostaria de chamar?</h2>
      <p>
        Escolha uma carta que nao esta na sua mao. A pessoa que tiver essa carta
        sera sua parceira, mas so sera revelada quando a carta aparecer na mesa.
      </p>
      <div className="callable-cards">
        {callableCards.map((card) => (
          <Card key={card.id} card={card} compact onClick={() => onCall(card)} />
        ))}
      </div>
    </div>
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
    if (game.phase !== 'dealing') {
      return undefined;
    }

    if (game.dealProgress >= TOTAL_CARDS) {
      const timeoutId = window.setTimeout(() => {
        setGame((currentGame) =>
          currentGame.phase === 'dealing'
            ? {
                ...currentGame,
                phase: 'calling',
                log: [
                  'Cartas distribuidas. O mao deve chamar uma carta.',
                  ...currentGame.log,
                ],
              }
            : currentGame,
        );
      }, 550);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) =>
        currentGame.phase === 'dealing'
          ? {
              ...currentGame,
              dealProgress: currentGame.dealProgress + 1,
            }
          : currentGame,
      );
    }, 85);

    return () => window.clearTimeout(timeoutId);
  }, [game.dealProgress, game.phase]);

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
    }, 900);

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
        `${currentGame.players[currentGame.handIndex].name} chamou ${cardName(card)}. A parceria segue oculta.`,
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

  function finishDeal() {
    setGame((currentGame) =>
      currentGame.phase === 'dealing'
        ? {
            ...currentGame,
            phase: 'calling',
            dealProgress: TOTAL_CARDS,
            log: [
              'Distribuicao concluida. O mao deve chamar uma carta.',
              ...currentGame.log,
            ],
          }
        : currentGame,
    );
  }

  const currentPlayer = game.players[game.currentTurnIndex];
  const ledSuit = game.trickCards[0]?.card.suitName;
  const partnerText =
    game.partnerRevealed && game.partnerIndex !== null
      ? game.players[game.partnerIndex].name
      : 'oculto';
  const callerTeamLabel =
    game.partnerRevealed && game.partnerIndex !== null
      ? `${game.players[game.handIndex].name} + ${game.players[game.partnerIndex].name}`
      : `${game.players[game.handIndex].name} + parceiro oculto`;
  const opponentTeamLabel =
    game.partnerRevealed && game.partnerIndex !== null
      ? game.players
          .filter((_, index) => index !== game.handIndex && index !== game.partnerIndex)
          .map((player) => player.name)
          .join(' + ')
      : 'Dupla adversaria';
  const dealingTargetIndex = Math.max(0, game.dealProgress - 1) % PLAYERS.length;
  const isHumanTurn = game.phase === 'playing' && game.currentTurnIndex === HUMAN_PLAYER;

  return (
    <main className="game-shell">
      <header className="game-hud">
        <div>
          <p className="eyebrow">Quatrilho</p>
          <h1>Baralho espanhol</h1>
        </div>
        <div className="hud-score">
          <article>
            <span>{callerTeamLabel}</span>
            <strong>{formatTentos(game.scores.callerTeam)}</strong>
            <small>{game.scores.callerTeam} figura(s)</small>
          </article>
          <article>
            <span>{opponentTeamLabel}</span>
            <strong>{formatTentos(game.scores.opponents)}</strong>
            <small>{game.scores.opponents} figura(s)</small>
          </article>
        </div>
        <button className="secondary-button" onClick={restartGame} type="button">
          Nova partida
        </button>
      </header>

      <section className="game-table" aria-label="Mesa de quatrilho">
        {game.players.map((player, playerIndex) => (
          <PlayerSeat
            key={player.name}
            player={player}
            playerIndex={playerIndex}
            game={game}
            isCurrent={game.phase === 'playing' && playerIndex === game.currentTurnIndex}
            isHuman={playerIndex === HUMAN_PLAYER}
            onPlay={playHumanCard}
            validHumanCardIds={validHumanCardIds}
            visibleDealCount={getVisibleDealCount(game.dealProgress, playerIndex)}
          />
        ))}

        <section className="center-table">
          <div className="status-card">
            <span>
              {game.phase === 'dealing'
                ? `Distribuindo ${game.dealProgress}/${TOTAL_CARDS}`
                : game.phase === 'calling'
                  ? 'Chamada do mao'
                  : game.phase === 'finished'
                    ? 'Fim da partida'
                    : `Vaza ${game.tricks.length + 1}`}
            </span>
            <strong>
              {game.phase === 'dealing'
                ? `Carta para ${PLAYERS[dealingTargetIndex].name}`
                : game.phase === 'calling'
                  ? 'Escolha a carta parceira'
                  : game.phase === 'finished'
                    ? getResult(game)
                    : isHumanTurn
                      ? 'Sua vez de jogar'
                      : `Vez de ${currentPlayer.name}`}
            </strong>
            <small>
              {ledSuit
                ? `Naipe iniciado: ${ledSuit}`
                : 'Quem abre a vaza define o naipe.'}
            </small>
          </div>

          {game.phase === 'dealing' && (
            <div className={`dealing-animation target-${PLAYERS[dealingTargetIndex].seat}`}>
              <div className="deck-stack">
                <CardBack />
                <CardBack />
                <CardBack />
              </div>
              <span className="flying-card" key={game.dealProgress}>
                <CardBack />
              </span>
              <button className="text-button" onClick={finishDeal} type="button">
                Pular distribuicao
              </button>
            </div>
          )}

          {game.phase === 'calling' && (
            <CallPanel callableCards={callableCards} onCall={callPartnerCard} />
          )}

          {(game.phase === 'playing' || game.phase === 'finished') && (
            <div className="trick-zone">
              {game.trickCards.length === 0 ? (
                <p className="empty-trick">Mesa livre para a proxima vaza.</p>
              ) : (
                game.trickCards.map((play) => (
                  <TrickCard
                    key={`${play.playerIndex}-${play.card.id}`}
                    play={play}
                    player={game.players[play.playerIndex]}
                  />
                ))
              )}
            </div>
          )}

          {game.phase === 'finished' && (
            <div className="result-panel">
              <h2>{getResult(game)}</h2>
              <p>
                Figuras da dupla do mao: {game.scores.callerTeam} / 3 ={' '}
                {formatTentos(game.scores.callerTeam)} tento(s).
              </p>
              <p>
                Figuras da dupla adversaria: {game.scores.opponents} / 3 ={' '}
                {formatTentos(game.scores.opponents)} tento(s).
              </p>
            </div>
          )}
        </section>

        <aside className="side-panel">
          <article>
            <span>Carta chamada</span>
            <strong>{game.calledCard ? cardName(game.calledCard) : 'Aguardando'}</strong>
            <small>Parceiro: {partnerText}</small>
          </article>
          <article>
            <span>Regra da vaza</span>
            <strong>3 &gt; 2 &gt; 1 &gt; Rei &gt; Cavalo &gt; 10</strong>
            <small>Depois: 7 &gt; 6 &gt; 5 &gt; 4.</small>
          </article>
          <article>
            <span>Ultimo lance</span>
            <ol>
              {game.log.slice(0, 4).map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ol>
          </article>
        </aside>
      </section>
    </main>
  );
}

export default App;
