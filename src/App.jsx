import { useEffect, useMemo, useState } from 'react';

const HUMAN_PLAYER = 0;
const DEALER_INDEX = 1;
const HAND_INDEX = 0;
const CARDS_PER_PLAYER = 10;
const TOTAL_CARDS = 40;
const CARDS_PER_SUIT = 10;

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
    partnerAlert: null,
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

function getPlayedCards(game) {
  return [
    ...game.tricks.flatMap((trick) => trick.cards.map((play) => play.card)),
    ...game.trickCards.map((play) => play.card),
  ];
}

function getSuitStats(game) {
  const playedCards = getPlayedCards(game);
  const playedIds = new Set(playedCards.map((card) => card.id));
  const allCards = buildDeck();

  return SUITS.map((suit) => {
    const playedInSuit = playedCards.filter((card) => card.suit === suit.id);
    const unplayedInSuit = allCards.filter(
      (card) => card.suit === suit.id && !playedIds.has(card.id),
    );
    const strongestUnplayed = [...unplayedInSuit].sort(
      (first, second) => second.strength - first.strength,
    )[0];

    return {
      ...suit,
      playedCount: playedInSuit.length,
      remainingCount: CARDS_PER_SUIT - playedInSuit.length,
      strongestUnplayed,
    };
  });
}

function getPlayerFigurePoints(player) {
  return player.capturedCards.reduce(
    (total, card) => total + card.figurePoints,
    0,
  );
}

function getPlayerScoreInfo(game, playerIndex) {
  if (!game.partnerRevealed || game.partnerIndex === null) {
    const figures = getPlayerFigurePoints(game.players[playerIndex]);

    return {
      label: 'Individual',
      figures,
      tentos: formatTentos(figures),
    };
  }

  const figures = isCallerTeam(game, playerIndex)
    ? game.scores.callerTeam
    : game.scores.opponents;

  return {
    label: isCallerTeam(game, playerIndex) ? 'Dupla do mao' : 'Dupla adversaria',
    figures,
    tentos: formatTentos(figures),
  };
}

function isCardFirm(game, card) {
  const playedIds = new Set(getPlayedCards(game).map((playedCard) => playedCard.id));

  return buildDeck()
    .filter((deckCard) => deckCard.suit === card.suit)
    .every(
      (deckCard) =>
        deckCard.id === card.id ||
        deckCard.strength < card.strength ||
        playedIds.has(deckCard.id),
    );
}

function getFanCardStyle(index, total, seat) {
  if (total <= 0) {
    return {};
  }

  const center = (total - 1) / 2;
  const position = index - center;
  const spread = total > 1 ? Math.min(9, 50 / (total - 1)) : 0;
  const rotation = position * spread;
  const distance = Math.min(24, Math.max(14, 210 / Math.max(total, 1)));
  const lift = Math.abs(position) * 4;

  if (seat === 'norte') {
    return {
      '--card-offset': index,
      '--fan-x': `${position * distance}px`,
      '--fan-y': `${lift}px`,
      '--fan-rotation': `${-rotation}deg`,
      '--hover-x': `${position * distance}px`,
      '--hover-y': '14px',
      '--hover-rotation': `${-rotation * 0.25}deg`,
    };
  }

  if (seat === 'oeste') {
    return {
      '--card-offset': index,
      '--fan-x': `${lift * -0.6}px`,
      '--fan-y': `${position * distance}px`,
      '--fan-rotation': `${-90 + rotation}deg`,
      '--hover-x': '12px',
      '--hover-y': `${position * distance}px`,
      '--hover-rotation': '-82deg',
    };
  }

  if (seat === 'leste') {
    return {
      '--card-offset': index,
      '--fan-x': `${lift * 0.6}px`,
      '--fan-y': `${position * distance}px`,
      '--fan-rotation': `${90 + rotation}deg`,
      '--hover-x': '-12px',
      '--hover-y': `${position * distance}px`,
      '--hover-rotation': '82deg',
    };
  }

  return {
    '--card-offset': index,
    '--fan-x': `${position * distance}px`,
    '--fan-y': `${-lift}px`,
    '--fan-rotation': `${rotation}deg`,
    '--hover-x': `${position * distance}px`,
    '--hover-y': '-28px',
    '--hover-rotation': `${rotation * 0.25}deg`,
  };
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

function buildPlayHelpers(game, playerIndex, suitStats) {
  if (game.phase !== 'playing' || game.currentTurnIndex !== playerIndex) {
    return {
      bestCardId: null,
      tips: [
        game.phase === 'calling'
          ? 'Chame uma carta forte que nao esta na sua mao para tentar formar uma dupla competitiva.'
          : 'Aguarde sua vez para ver as melhores opcoes de jogada.',
      ],
      byCardId: new Map(),
    };
  }

  const validCards = getValidCards(game, playerIndex);
  const currentWinner = getCurrentTrickWinner(game.trickCards);
  const ledSuit = game.trickCards[0]?.card.suit;
  const teammateWinning =
    currentWinner &&
    isCallerTeam(game, currentWinner.playerIndex) === isCallerTeam(game, playerIndex);
  const byCardId = new Map();

  const rankedCards = validCards
    .map((card) => {
      const suitInfo = suitStats.find((suit) => suit.id === card.suit);
      const firmCard = isCardFirm(game, card);
      const onlyCardLeftInSuit = suitInfo?.remainingCount === 1;
      const canBeatCurrent =
        currentWinner &&
        card.suit === currentWinner.card.suit &&
        card.strength > currentWinner.card.strength;
      let score;
      let reason;

      if (!ledSuit) {
        score = firmCard ? 85 + card.figurePoints * 7 : 35 + card.strength;
        reason = firmCard
          ? `${cardName(card)} esta firme: nao ha carta mais forte de ${card.suitName} por sair.`
          : `${cardName(card)} abre o naipe de ${card.suitName}; ainda podem existir cartas mais fortes.`;
      } else if (card.suit === ledSuit) {
        if (canBeatCurrent) {
          score = 80 - card.strength + card.figurePoints * 2;
          reason = `${cardName(card)} vence a vaza atual seguindo ${card.suitName}.`;
        } else {
          score = 35 - card.figurePoints * 6 - card.strength;
          reason = `${cardName(card)} segue o naipe e economiza figuras nesta vaza.`;
        }
      } else if (teammateWinning) {
        score = 65 + card.figurePoints * 12 + card.strength;
        reason = `${cardName(card)} carrega figuras porque sua dupla esta vencendo a vaza.`;
      } else {
        score = 40 - card.figurePoints * 8 - card.strength;
        reason = `${cardName(card)} e descarte; prefira perder poucas figuras.`;
      }

      if (onlyCardLeftInSuit) {
        score += 25;
        reason = `${cardName(card)} e a ultima carta de ${card.suitName} ainda em jogo; se abrir esse naipe, vence.`;
      } else if (firmCard) {
        score += 15;
      }

      return { card, score, reason };
    })
    .sort((first, second) => second.score - first.score);

  rankedCards.forEach((entry, index) => {
    byCardId.set(entry.card.id, {
      reason: entry.reason,
      recommended: index === 0,
    });
  });

  return {
    bestCardId: rankedCards[0]?.card.id ?? null,
    tips: rankedCards.slice(0, 3).map((entry, index) => {
      const prefix = index === 0 ? 'Melhor agora' : `Opcao ${index + 1}`;

      return `${prefix}: ${entry.reason}`;
    }),
    byCardId,
  };
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
  const partnerAlert = didRevealPartner
    ? {
        title: 'Parceiro revelado!',
        message: `${player.name} era o parceiro e jogou ${cardName(playedCard)}.`,
      }
    : game.partnerAlert;
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
      partnerAlert,
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
    partnerAlert,
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

function SuitIcon({ suit }) {
  if (suit === 'ouros') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 4 58 32 32 60 6 32Z" />
      </svg>
    );
  }

  if (suit === 'copas') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 57C20 45 8 35 8 22 8 13 14 8 22 8c5 0 9 3 10 7 1-4 5-7 10-7 8 0 14 5 14 14 0 13-12 23-24 35Z" />
      </svg>
    );
  }

  if (suit === 'espadas') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 5C20 18 9 28 9 40c0 8 5 14 13 14 4 0 7-1 9-4-1 5-4 8-8 10h18c-4-2-7-5-8-10 2 3 5 4 9 4 8 0 13-6 13-14C55 28 44 18 32 5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M26 58c4-2 6-6 6-11-3 4-8 6-13 6C10 53 5 47 5 40c0-8 6-14 14-14h1c-2-2-3-5-3-8 0-8 6-14 15-14s15 6 15 14c0 3-1 6-3 8h1c8 0 14 6 14 14 0 7-5 13-14 13-5 0-10-2-13-6 0 5 2 9 6 11H26Z" />
    </svg>
  );
}

function Card({
  card,
  disabled = false,
  compact = false,
  helper,
  recommended = false,
  style,
  onClick,
}) {
  return (
    <button
      className={`card ${card.suitClassName}${compact ? ' compact' : ''}${recommended ? ' recommended' : ''}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
      type="button"
      title={helper ?? `${cardName(card)} - ${card.figurePoints} figura(s)`}
    >
      <span className="card-rank">{card.rankLabel}</span>
      <span className="card-suit" aria-label={card.suitName}>
        <SuitIcon suit={card.suit} />
      </span>
      <span className="card-name">{card.rankName}</span>
      <span className="card-points">{card.figurePoints} fig</span>
      {recommended && <span className="recommendation-mark">Melhor</span>}
    </button>
  );
}

function CardBack({ index = 0, style }) {
  return (
    <span
      aria-label="Carta virada"
      className="card-back"
      style={{ '--card-offset': index, ...style }}
    />
  );
}

function PlayerSeat({
  player,
  playerIndex,
  game,
  isCurrent,
  isHuman,
  scoreInfo,
  cardHelpers,
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
        <div className="player-score">
          <span>{scoreInfo.label}</span>
          <strong>{scoreInfo.tentos}</strong>
          <small>{scoreInfo.figures} fig</small>
        </div>
        <div className="player-badges">
          {isDealer && <em>Dealer</em>}
          {isHand && <em>Mao</em>}
          {isPartner && <em>Parceiro</em>}
        </div>
      </div>

      <div className={`seat-cards${isHuman ? ' human-cards' : ''}`}>
        {isHuman
          ? visibleCards.map((card, index) => {
              const helper = cardHelpers?.get(card.id);
              const cardStyle = getFanCardStyle(
                index,
                visibleCards.length,
                player.seat,
              );
              const disabled =
                game.phase !== 'playing' ||
                game.currentTurnIndex !== HUMAN_PLAYER ||
                !validHumanCardIds.has(card.id);

              return (
                <Card
                  key={card.id}
                  card={card}
                  disabled={disabled}
                  helper={helper?.reason}
                  recommended={Boolean(helper?.recommended)}
                  style={cardStyle}
                  onClick={() => onPlay(card)}
                />
              );
            })
          : Array.from({ length: hiddenCount }).map((_, index) => (
              <CardBack
                key={`${player.name}-${index}`}
                index={index}
                style={getFanCardStyle(index, hiddenCount, player.seat)}
              />
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

function HelperPanel({ tips, isHumanTurn }) {
  return (
    <article className="helper-panel">
      <span>Helper de jogada</span>
      <strong>{isHumanTurn ? 'Sugestoes para sua vez' : 'Aguardando sua vez'}</strong>
      <ol>
        {tips.map((tip, index) => (
          <li key={`${tip}-${index}`}>{tip}</li>
        ))}
      </ol>
    </article>
  );
}

function SuitCounter({ suitStats }) {
  return (
    <article className="suit-counter">
      <span>Cartas por naipe</span>
      <strong>Cartas que ja sairam</strong>
      <div className="suit-counter-grid">
        {suitStats.map((suit) => (
          <div className="suit-counter-row" key={suit.id}>
            <span className={`mini-suit ${suit.className}`}>
              <SuitIcon suit={suit.id} />
            </span>
            <div>
              <strong>{suit.playedCount}/{CARDS_PER_SUIT}</strong>
              <small>
                {suit.remainingCount === 0
                  ? 'Naipe esgotado'
                  : suit.remainingCount === 1
                  ? `Resta ${cardName(suit.strongestUnplayed)}`
                  : `${suit.remainingCount} por sair`}
              </small>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TrickHistory({ tricks, players, onClose }) {
  return (
    <div className="history-overlay" role="dialog" aria-modal="true">
      <section className="history-panel">
        <header>
          <div>
            <p className="eyebrow">Historico</p>
            <h2>Vazas jogadas</h2>
          </div>
          <button className="text-button" onClick={onClose} type="button">
            Fechar
          </button>
        </header>

        {tricks.length === 0 ? (
          <p className="history-empty">Nenhuma vaza foi concluida ainda.</p>
        ) : (
          <ol className="history-list">
            {[...tricks].reverse().map((trick) => (
              <li key={trick.number}>
                <div className="history-summary">
                  <strong>Vaza {trick.number}</strong>
                  <span>
                    {players[trick.winnerIndex].name} venceu com{' '}
                    {trick.figurePoints} figura(s)
                  </span>
                </div>
                <div className="history-cards">
                  {trick.cards.map((play) => (
                    <div key={`${trick.number}-${play.playerIndex}-${play.card.id}`}>
                      <span>{players[play.playerIndex].name}</span>
                      <Card card={play.card} compact disabled />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function App() {
  const [game, setGame] = useState(createInitialGame);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const humanHand = game.players[HUMAN_PLAYER].hand;
  const validHumanCardIds = useMemo(
    () => new Set(getValidCards(game, HUMAN_PLAYER).map((card) => card.id)),
    [game],
  );
  const callableCards = useMemo(() => {
    const humanCardIds = new Set(humanHand.map((card) => card.id));

    return sortHand(buildDeck().filter((card) => !humanCardIds.has(card.id)));
  }, [humanHand]);
  const suitStats = useMemo(() => getSuitStats(game), [game]);
  const playHelpers = useMemo(
    () => buildPlayHelpers(game, HUMAN_PLAYER, suitStats),
    [game, suitStats],
  );

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
    }, 135);

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

  useEffect(() => {
    if (!game.partnerAlert) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => ({
        ...currentGame,
        partnerAlert: null,
      }));
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [game.partnerAlert]);

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
      {game.partnerAlert && (
        <div className="partner-alert" role="status" aria-live="polite">
          <strong>{game.partnerAlert.title}</strong>
          <span>{game.partnerAlert.message}</span>
        </div>
      )}

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
        <div className="hud-actions">
          <button
            className="text-button history-button"
            onClick={() => setIsHistoryOpen(true)}
            type="button"
          >
            Historico
          </button>
          <button className="secondary-button" onClick={restartGame} type="button">
            Nova partida
          </button>
        </div>
      </header>

      {isHistoryOpen && (
        <TrickHistory
          onClose={() => setIsHistoryOpen(false)}
          players={game.players}
          tricks={game.tricks}
        />
      )}

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
            cardHelpers={playerIndex === HUMAN_PLAYER ? playHelpers.byCardId : undefined}
            scoreInfo={getPlayerScoreInfo(game, playerIndex)}
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
          <HelperPanel tips={playHelpers.tips} isHumanTurn={isHumanTurn} />
          <SuitCounter suitStats={suitStats} />
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
