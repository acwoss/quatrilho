import { useEffect, useMemo, useState } from 'react';

const HUMAN_PLAYER = 0;
const HAND_INDEX = 0;
const CARDS_PER_PLAYER = 10;
const TOTAL_CARDS = 40;
const CARDS_PER_SUIT = 10;
const INITIAL_COINS = 100;

const GESTURES = {
  beat: {
    label: 'Bater',
    description: 'Tenho uma mao muito boa neste naipe; jogue comigo.',
  },
  discard: {
    label: 'Jogar fora',
    description: 'Nao quero este naipe ou nao tenho mais cartas dele.',
  },
  support: {
    label: 'Posso ajudar',
    description: 'Tenho cartas boas neste naipe, mas nao garantidas.',
  },
};

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

function dealDeck(
  deck,
  coinBalances = PLAYERS.map(() => INITIAL_COINS),
  handIndex = HAND_INDEX,
) {
  return PLAYERS.map((player, playerIndex) => ({
    ...player,
    coins: coinBalances[playerIndex] ?? INITIAL_COINS,
    hand: sortHand(
      deck.filter(
        (_, cardIndex) => getDealTargetIndex(cardIndex, handIndex) === playerIndex,
      ),
    ),
    capturedCards: [],
  }));
}

function getNextPlayerIndex(playerIndex) {
  return (playerIndex + PLAYERS.length - 1) % PLAYERS.length;
}

function getDealerIndex(handIndex) {
  return (handIndex + 1) % PLAYERS.length;
}

function getDealTargetIndex(cardIndex, handIndex = HAND_INDEX) {
  let playerIndex = handIndex;

  for (let index = 0; index < cardIndex; index += 1) {
    playerIndex = getNextPlayerIndex(playerIndex);
  }

  return playerIndex;
}

function createInitialGame(coinBalances, handIndex = HAND_INDEX, roundNumber = 1) {
  const deck = shuffle(buildDeck());
  const dealerIndex = getDealerIndex(handIndex);

  return {
    phase: 'dealing',
    dealProgress: 0,
    players: dealDeck(deck, coinBalances, handIndex),
    dealerIndex,
    handIndex,
    roundNumber,
    currentTurnIndex: handIndex,
    currentLeaderIndex: handIndex,
    trickCards: [],
    pendingTrick: null,
    tricks: [],
    calledCardId: null,
    calledCard: null,
    partnerIndex: null,
    partnerRevealed: false,
    partnerAlert: null,
    signals: [],
    settlement: null,
    scores: {
      callerTeam: 0,
      opponents: 0,
    },
    log: [
      `${PLAYERS[dealerIndex].name} esta distribuindo as cartas. ${PLAYERS[handIndex].name} sera o mao da rodada ${roundNumber}.`,
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

function formatCoins(coins) {
  return Number.isInteger(coins) ? String(coins) : coins.toFixed(1);
}

function getTeamInfo(game) {
  if (game.scores.callerTeam > game.scores.opponents) {
    return {
      winner: 'callerTeam',
      loser: 'opponents',
      winningFigures: game.scores.callerTeam,
    };
  }

  if (game.scores.opponents > game.scores.callerTeam) {
    return {
      winner: 'opponents',
      loser: 'callerTeam',
      winningFigures: game.scores.opponents,
    };
  }

  return {
    winner: 'draw',
    loser: null,
    winningFigures: 0,
  };
}

function getPlayerTeam(game, playerIndex) {
  return isCallerTeam(game, playerIndex) ? 'callerTeam' : 'opponents';
}

function getSuitName(suitId) {
  return SUITS.find((suit) => suit.id === suitId)?.name ?? suitId;
}

function getPlayerSignal(game, playerIndex) {
  return game.signals.find((signal) => signal.playerIndex === playerIndex) ?? null;
}

function getPartnerSignal(game, playerIndex) {
  if (!game.partnerRevealed || game.partnerIndex === null) {
    return null;
  }

  const partnerIndex = isCallerTeam(game, playerIndex)
    ? playerIndex === game.handIndex
      ? game.partnerIndex
      : game.handIndex
    : game.players.findIndex(
        (_, index) =>
          index !== playerIndex &&
          index !== game.handIndex &&
          index !== game.partnerIndex,
      );

  if (partnerIndex === playerIndex) {
    return null;
  }

  const signal = getPlayerSignal(game, partnerIndex);

  if (!signal || !isSignalStillUseful(game, signal)) {
    return null;
  }

  return signal;
}

function isSignalStillUseful(game, signal) {
  const signaler = game.players[signal.playerIndex];
  const hasSuitCards = signaler.hand.some((card) => card.suit === signal.suit);

  if (signal.type === 'discard') {
    return !hasSuitCards;
  }

  return hasSuitCards;
}

function addSignalIfAllowed(game, playerIndex, card, signalType) {
  if (!signalType || getPlayerSignal(game, playerIndex)) {
    return game.signals;
  }

  return [
    ...game.signals,
    {
      playerIndex,
      type: signalType,
      suit: card.suit,
      suitName: card.suitName,
    },
  ];
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

function getCallCardOptions(hand) {
  const handIds = new Set(hand.map((card) => card.id));
  const threesInHand = hand.filter((card) => card.rank === 3);
  const canCallAnyCard = threesInHand.length === SUITS.length;
  const candidateCards = buildDeck().filter((card) => {
    if (handIds.has(card.id)) {
      return false;
    }

    return canCallAnyCard || card.rank === 3;
  });
  const scoredOptions = candidateCards.map((card) => {
    const sameSuitCards = hand.filter((handCard) => handCard.suit === card.suit);
    const hasAce = sameSuitCards.some((handCard) => handCard.rank === 1);
    const hasTwo = sameSuitCards.some((handCard) => handCard.rank === 2);
    const hasKingOrHorse = sameSuitCards.some(
      (handCard) => handCard.rank === 12 || handCard.rank === 11,
    );
    const figureSupport = sameSuitCards.reduce(
      (total, handCard) => total + handCard.figurePoints,
      0,
    );
    let score = card.strength * 2 + figureSupport + sameSuitCards.length;
    let hint = `${cardName(card)} busca parceria forte em ${card.suitName}.`;

    if (card.rank === 3) {
      score += 40;

      if (hasAce && hasTwo) {
        score += 28;
        hint = `Excelente chamada: voce tem 2 e As de ${card.suitName}; o 3 completa o topo do naipe e protege 5 figuras.`;
      } else if (hasAce) {
        score += 18;
        hint = `Boa chamada: seu As de ${card.suitName} vale 3 figuras; o 3 chamado ajuda a proteger 4 figuras no naipe.`;
      } else if (hasTwo) {
        score += 14;
        hint = `Boa chamada: com o 2 de ${card.suitName}, chamar o 3 completa a carta acima do seu jogo.`;
      } else if (hasKingOrHorse) {
        score += 8;
        hint = `Chamar o 3 de ${card.suitName} protege suas figuras medias nesse naipe.`;
      } else if (sameSuitCards.length >= 3) {
        score += 6;
        hint = `Chamar o 3 de ${card.suitName} reforca um naipe em que voce ja tem volume.`;
      }
    } else if (canCallAnyCard) {
      if (card.rank === 2 || card.rank === 1) {
        score += 28;
        hint = `Como voce tem os quatro 3, chamar ${cardName(card)} adiciona outra carta alta ao seu time.`;
      } else if (card.figurePoints > 0) {
        score += 12;
        hint = `Alternativa de figura: ${cardName(card)} pode trazer pontos para sua dupla.`;
      } else {
        hint = `Chamada defensiva: ${cardName(card)} e baixa, mas pode revelar parceiro sem entregar muitas figuras.`;
      }
    }

    return {
      card,
      hint,
      score,
    };
  });

  return scoredOptions
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return second.card.strength - first.card.strength;
    })
    .map((option, index) => ({
      ...option,
      recommended: index === 0,
    }));
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

function isCardFranca(game, card) {
  if (card.rank === 3) {
    return true;
  }

  return isCardFirm(game, card);
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

function getVisibleDealCount(dealProgress, playerIndex, handIndex = HAND_INDEX) {
  let count = 0;

  for (let index = 0; index < dealProgress; index += 1) {
    if (getDealTargetIndex(index, handIndex) === playerIndex) {
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
  let validCards = getValidCards(game, playerIndex);
  const ledSuit = game.trickCards[0]?.card.suit;
  const partnerSignal = getPartnerSignal(game, playerIndex);
  const currentWinner = getCurrentTrickWinner(game.trickCards);
  const teammateWinning =
    currentWinner &&
    isCallerTeam(game, currentWinner.playerIndex) === isCallerTeam(game, playerIndex);

  if (partnerSignal) {
    const signaledSuitCards = validCards.filter(
      (card) => card.suit === partnerSignal.suit,
    );

    if (
      (partnerSignal.type === 'beat' || partnerSignal.type === 'support') &&
      signaledSuitCards.length > 0
    ) {
      return [...signaledSuitCards].sort((first, second) => {
        if (first.figurePoints !== second.figurePoints) {
          return first.figurePoints - second.figurePoints;
        }

        return partnerSignal.type === 'beat'
          ? first.strength - second.strength
          : second.strength - first.strength;
      })[0];
    }

    if (partnerSignal.type === 'discard') {
      const safeDiscardSuitCards = signaledSuitCards.filter(
        (card) =>
          isCardFranca(game, card) ||
          (currentWinner &&
            card.suit === currentWinner.card.suit &&
            card.strength > currentWinner.card.strength),
      );
      const nonDiscardSuitCards = validCards.filter(
        (card) => card.suit !== partnerSignal.suit,
      );

      if (safeDiscardSuitCards.length > 0) {
        return safeDiscardSuitCards.sort(
          (first, second) => first.strength - second.strength,
        )[0];
      }

      if (nonDiscardSuitCards.length > 0) {
        validCards = nonDiscardSuitCards;
      }
    }
  }

  const hasLedSuit = Boolean(ledSuit && validCards[0]?.suit === ledSuit);

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

function chooseAiSignal(game, playerIndex, card) {
  if (getPlayerSignal(game, playerIndex)) {
    return null;
  }

  const remainingSuitCards = game.players[playerIndex].hand.filter(
    (handCard) => handCard.suit === card.suit && handCard.id !== card.id,
  );
  const strongRemainingCards = remainingSuitCards.filter(
    (handCard) =>
      isCardFranca(game, handCard) ||
      handCard.rank === 2 ||
      handCard.rank === 1 ||
      handCard.figurePoints > 0,
  );

  if (remainingSuitCards.length === 0) {
    return 'discard';
  }

  if (
    strongRemainingCards.filter((handCard) => handCard.strength >= 8).length >= 2 ||
    remainingSuitCards.filter((handCard) => isCardFranca(game, handCard)).length >= 1
  ) {
    return 'beat';
  }

  if (strongRemainingCards.length >= 1 || remainingSuitCards.length >= 3) {
    return 'support';
  }

  return null;
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
  const partnerSignal = getPartnerSignal(game, playerIndex);
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
          ? `${cardName(card)} com certeza ganhara a vaza: nao ha carta mais forte de ${card.suitName} por sair.`
          : `${cardName(card)} abre o naipe de ${card.suitName}; ainda podem existir cartas mais fortes.`;
      } else if (card.suit === ledSuit) {
        if (canBeatCurrent) {
          score = 80 - card.strength + card.figurePoints * 2;
          reason = `${cardName(card)} e a menor carta que vence a vaza atual seguindo ${card.suitName}.`;
        } else {
          score = 35 - card.figurePoints * 6 - card.strength;
          reason = `${cardName(card)} segue o naipe e economiza figuras porque outra dupla esta ganhando.`;
        }
      } else if (teammateWinning) {
        score = 65 + card.figurePoints * 12 + card.strength;
        reason = `${cardName(card)} carrega figuras: parceiro/sua dupla ira vencer, entao de ponto.`;
      } else {
        score = 40 - card.figurePoints * 8 - card.strength;
        reason = `${cardName(card)} e descarte: outra dupla esta ganhando, entao carta branca nao dara ponto.`;
      }

      if (partnerSignal?.suit === card.suit) {
        if (partnerSignal.type === 'beat') {
          score += 35;
          reason = `${cardName(card)} segue o sinal de batida do parceiro em ${card.suitName}; jogue nesse naipe para trabalhar com ele.`;
        } else if (partnerSignal.type === 'support') {
          score += 18;
          reason = `${cardName(card)} aproveita o sinal "posso ajudar" do parceiro em ${card.suitName}.`;
        } else if (
          partnerSignal.type === 'discard' &&
          !isCardFranca(game, card) &&
          !canBeatCurrent
        ) {
          score -= 30;
          reason = `${cardName(card)} evita o naipe que o parceiro mandou jogar fora, a menos que garanta a vaza.`;
        }
      }

      if (onlyCardLeftInSuit) {
        score += 25;
        reason = `${cardName(card)} com certeza ganhara: e a ultima carta de ${card.suitName} ainda em jogo.`;
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

function settleFinishedGame(game) {
  if (game.settlement) {
    return game;
  }

  const teamInfo = getTeamInfo(game);

  if (teamInfo.winner === 'draw') {
    return {
      ...game,
      settlement: {
        winner: 'draw',
        amount: 0,
        humanDelta: 0,
        playerDeltas: PLAYERS.map(() => 0),
      },
    };
  }

  const amount = teamInfo.winningFigures / 3;
  const playerDeltas = game.players.map((_, playerIndex) =>
    getPlayerTeam(game, playerIndex) === teamInfo.winner ? amount : -amount,
  );

  return {
    ...game,
    players: game.players.map((player, playerIndex) => ({
      ...player,
      coins: player.coins + playerDeltas[playerIndex],
    })),
    settlement: {
      winner: teamInfo.winner,
      loser: teamInfo.loser,
      amount,
      humanDelta: playerDeltas[HUMAN_PLAYER],
      playerDeltas,
    },
  };
}

function callPartnerCardInGame(game, card) {
  const validCardIds = new Set(
    getCallCardOptions(game.players[game.handIndex].hand).map(
      (option) => option.card.id,
    ),
  );

  if (!validCardIds.has(card.id)) {
    return game;
  }

  const partnerIndex = game.players.findIndex((player) =>
    player.hand.some((handCard) => handCard.id === card.id),
  );
  const humanIsPartner = partnerIndex === HUMAN_PLAYER;
  const partnerAlert = humanIsPartner
    ? {
        title: 'Voce e o parceiro!',
        message: `${game.players[game.handIndex].name} chamou ${cardName(card)}, que esta na sua mao. Voce ja sabe quem e seu parceiro.`,
      }
    : game.partnerAlert;

  return {
    ...game,
    phase: 'playing',
    calledCardId: card.id,
    calledCard: card,
    partnerIndex,
    partnerAlert,
    log: [
      `${game.players[game.handIndex].name} chamou ${cardName(card)}. A parceria segue oculta.`,
      ...game.log,
    ],
  };
}

function playCardInGame(game, playerIndex, cardId, options = {}) {
  const { autoAdvanceTricks = false, signalType = null } = options;

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
  const signals = addSignalIfAllowed(game, playerIndex, playedCard, signalType);
  const didSignal = signals.length > game.signals.length;
  const signalLog = didSignal
    ? [
        `${player.name} sinalizou ${GESTURES[signalType].label} em ${playedCard.suitName}.`,
      ]
    : [];
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
      signals,
      partnerRevealed: game.partnerRevealed || didRevealPartner,
      partnerAlert,
      currentTurnIndex: getNextPlayerIndex(playerIndex),
      log: [...signalLog, ...revealLog, playLog, ...game.log],
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
  const isFinished = nextPlayers.every(
    (currentPlayer) => currentPlayer.hand.length === 0,
  );
  const completedTrick = {
    number: game.tricks.length + 1,
    cards: trickCards,
    winnerIndex: winner.playerIndex,
    figurePoints: trickPoints,
    endsGame: isFinished,
  };
  const completionLog = `Vaza ${completedTrick.number}: ${game.players[winner.playerIndex].name} venceu e levou ${trickPoints} figura(s).`;

  if (!autoAdvanceTricks) {
    return {
      ...game,
      phase: 'trickComplete',
      players: nextPlayers,
      trickCards,
      signals,
      pendingTrick: completedTrick,
      partnerRevealed: game.partnerRevealed || didRevealPartner,
      partnerAlert,
      currentLeaderIndex: winner.playerIndex,
      currentTurnIndex: winner.playerIndex,
      scores: nextScores,
      log: [
        ...(isFinished
          ? ['Vaza final concluida. Avance para ver o resultado.']
          : ['Vaza concluida. Avance para limpar a mesa.']),
        completionLog,
        ...signalLog,
        ...revealLog,
        playLog,
        ...game.log,
      ],
    };
  }

  const nextGame = {
    ...game,
    phase: isFinished ? 'finished' : 'playing',
    players: nextPlayers,
    trickCards: [],
    signals,
    pendingTrick: null,
    tricks: [completedTrick, ...game.tricks],
    partnerRevealed: game.partnerRevealed || didRevealPartner,
    partnerAlert,
    currentLeaderIndex: winner.playerIndex,
    currentTurnIndex: winner.playerIndex,
    scores: nextScores,
    log: [
      ...(isFinished ? ['Partida encerrada. Figuras convertidas em tentos.'] : []),
      completionLog,
      ...signalLog,
      ...revealLog,
      playLog,
      ...game.log,
    ],
  };

  return isFinished ? settleFinishedGame(nextGame) : nextGame;
}

function advanceCompletedTrick(game) {
  if (game.phase !== 'trickComplete' || !game.pendingTrick) {
    return game;
  }

  const nextGame = {
    ...game,
    phase: game.pendingTrick.endsGame ? 'finished' : 'playing',
    trickCards: [],
    tricks: [game.pendingTrick, ...game.tricks],
    pendingTrick: null,
    log: [
      game.pendingTrick.endsGame
        ? 'Partida encerrada. Figuras convertidas em tentos.'
        : `${game.players[game.currentTurnIndex].name} abre a proxima vaza.`,
      ...game.log,
    ],
  };

  return game.pendingTrick.endsGame ? settleFinishedGame(nextGame) : nextGame;
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

function RankMark({ card }) {
  if (card.rank === 12) {
    return (
      <svg className="rank-icon" viewBox="0 0 64 64" aria-label="Rei">
        <path d="M10 52h44l4-34-14 12L32 8 20 30 6 18l4 34Zm6-8-2-14 10 8 8-15 8 15 10-8-2 14H16Z" />
      </svg>
    );
  }

  if (card.rank === 11) {
    return (
      <svg className="rank-icon" viewBox="0 0 64 64" aria-label="Cavalo">
        <path d="M18 58c1-12 5-22 14-28-5-5-7-11-5-18 7 4 13 4 20 1l8 9-5 8 4 9c-7 2-13 1-20-3-5 5-8 12-9 22h-7Z" />
        <path d="M37 16c3 5 7 8 12 9l-3 4c-5-2-9-5-12-10l3-3Z" />
        <circle cx="43" cy="22" r="2.2" />
      </svg>
    );
  }

  return <span>{card.rankLabel}</span>;
}

function Card({
  card,
  disabled = false,
  draggable = false,
  franca = false,
  compact = false,
  helper,
  recommended = false,
  style,
  onDragStart,
  onClick,
}) {
  return (
    <button
      className={`card ${card.suitClassName}${compact ? ' compact' : ''}${recommended ? ' recommended' : ''}`}
      disabled={disabled}
      draggable={draggable && !disabled}
      onClick={onClick}
      onDragStart={onDragStart}
      style={style}
      type="button"
      title={
        helper ??
        `${cardName(card)} - ${card.figurePoints} figura(s)${
          franca ? ' - Carta franca' : ''
        }`
      }
    >
      <span className="card-rank">
        <RankMark card={card} />
      </span>
      <span className="card-suit" aria-label={card.suitName}>
        <SuitIcon suit={card.suit} />
      </span>
      {franca && <span className="franca-mark">Franca</span>}
      {recommended && <span className="recommendation-mark">Melhor</span>}
      {recommended && helper && <span className="best-card-help">{helper}</span>}
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
  onCardDragStart,
  onPlay,
}) {
  const visibleCards =
    game.phase === 'dealing' ? player.hand.slice(0, visibleDealCount) : player.hand;
  const isDealer = playerIndex === game.dealerIndex;
  const isHand = playerIndex === game.handIndex;
  const isPartner = playerIndex === game.partnerIndex && game.partnerRevealed;
  const hiddenCount = game.phase === 'dealing' ? visibleDealCount : player.hand.length;
  const signal = getPlayerSignal(game, playerIndex);
  const signalIsActive = signal ? isSignalStillUseful(game, signal) : false;

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
        <div className="player-wallet">
          <span>Moedas</span>
          <strong>{formatCoins(player.coins)}</strong>
        </div>
        <div className="player-badges">
          {isDealer && <em>Dealer</em>}
          {isHand && <em>Mao</em>}
          {isPartner && <em>Parceiro</em>}
        </div>
      </div>
      {signal && (
        <div className={`player-signal${signalIsActive ? '' : ' inactive'}`}>
          <strong>{GESTURES[signal.type].label}</strong>
          <span>{signal.suitName}</span>
        </div>
      )}

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
                  draggable
                  franca={isCardFranca(game, card)}
                  helper={helper?.reason}
                  recommended={Boolean(helper?.recommended)}
                  style={cardStyle}
                  onDragStart={(event) => onCardDragStart(event, card)}
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

function CallPanel({ callOptions, onCall }) {
  const recommendedOption = callOptions[0];

  return (
    <div className="action-panel call-panel">
      <p className="eyebrow">Carta chamada</p>
      <h2>Qual carta gostaria de chamar?</h2>
      <p>
        A chamada deve ser um 3 que nao esta na sua mao. Se voce tiver os quatro
        3, pode chamar outra carta.
      </p>
      {recommendedOption && (
        <div className="call-hint">
          <strong>Melhor chamada: {cardName(recommendedOption.card)}</strong>
          <span>{recommendedOption.hint}</span>
        </div>
      )}
      <div className="callable-cards">
        {callOptions.map((option) => (
          <Card
            key={option.card.id}
            card={option.card}
            compact
            helper={option.hint}
            recommended={option.recommended}
            onClick={() => onCall(option.card)}
          />
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

function SettlementModal({ settlement, players, onClose, onNewRound }) {
  const humanDelta = settlement.humanDelta;
  const title =
    humanDelta > 0
      ? `Voce ganhou ${formatCoins(humanDelta)} moeda(s)`
      : humanDelta < 0
        ? `Pague ${formatCoins(Math.abs(humanDelta))} moeda(s)`
        : 'Rodada empatada';
  const description =
    humanDelta > 0
      ? 'Sua dupla venceu a rodada e recebeu moedas da dupla perdedora.'
      : humanDelta < 0
        ? 'Sua dupla perdeu a rodada e pagou moedas para a dupla vencedora.'
        : 'As duplas empataram em tentos, entao nenhuma moeda foi transferida.';

  return (
    <div className="settlement-overlay" role="dialog" aria-modal="true">
      <section className="settlement-panel">
        <p className="eyebrow">Fim da rodada</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <strong className="settlement-amount">
          {settlement.amount > 0
            ? `${formatCoins(settlement.amount)} moeda(s) por jogador`
            : 'Sem pagamento'}
        </strong>
        <div className="settlement-wallets">
          {players.map((player, playerIndex) => (
            <div key={player.name}>
              <span>{player.name}</span>
              <strong>{formatCoins(player.coins)} moedas</strong>
              <small>
                {settlement.playerDeltas[playerIndex] > 0 ? '+' : ''}
                {formatCoins(settlement.playerDeltas[playerIndex])}
              </small>
            </div>
          ))}
        </div>
        <div className="settlement-actions">
          <button className="text-button" onClick={onClose} type="button">
            Ver mesa
          </button>
          <button className="secondary-button" onClick={onNewRound} type="button">
            Nova rodada
          </button>
        </div>
      </section>
    </div>
  );
}

function GestureModal({ card, alreadySignaled, onCancel, onChoose }) {
  return (
    <div className="gesture-overlay" role="dialog" aria-modal="true">
      <section className="gesture-panel">
        <p className="eyebrow">Jogar carta</p>
        <h2>{cardName(card)}</h2>
        <p>
          Voce pode apenas jogar ou sinalizar algo ao parceiro sobre{' '}
          {card.suitName}.
        </p>
        <div className="gesture-card-preview">
          <Card card={card} compact disabled />
        </div>
        <button className="secondary-button" onClick={() => onChoose(null)} type="button">
          Apenas jogar
        </button>
        {alreadySignaled ? (
          <small className="gesture-note">
            Voce ja sinalizou nesta rodada; cada jogador pode sinalizar no maximo uma vez.
          </small>
        ) : (
          <div className="gesture-options">
            {Object.entries(GESTURES).map(([gestureType, gesture]) => (
              <button
                className="text-button gesture-option"
                key={gestureType}
                onClick={() => onChoose(gestureType)}
                type="button"
              >
                <strong>{gesture.label}</strong>
                <span>{gesture.description}</span>
              </button>
            ))}
          </div>
        )}
        <button className="text-button" onClick={onCancel} type="button">
          Cancelar
        </button>
      </section>
    </div>
  );
}

function App() {
  const [game, setGame] = useState(createInitialGame);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [autoAdvanceTricks, setAutoAdvanceTricks] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [pendingHumanPlay, setPendingHumanPlay] = useState(null);
  const handPlayer = game.players[game.handIndex];
  const validHumanCardIds = useMemo(
    () => new Set(getValidCards(game, HUMAN_PLAYER).map((card) => card.id)),
    [game],
  );
  const callOptions = useMemo(
    () => getCallCardOptions(handPlayer.hand),
    [handPlayer.hand],
  );
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
    if (game.phase !== 'calling' || game.handIndex === HUMAN_PLAYER) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => {
        if (currentGame.phase !== 'calling' || currentGame.handIndex === HUMAN_PLAYER) {
          return currentGame;
        }

        const [bestOption] = getCallCardOptions(
          currentGame.players[currentGame.handIndex].hand,
        );

        return bestOption
          ? callPartnerCardInGame(currentGame, bestOption.card)
          : currentGame;
      });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [game.handIndex, game.phase]);

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
        const signalType = chooseAiSignal(
          currentGame,
          currentGame.currentTurnIndex,
          card,
        );
        return playCardInGame(currentGame, currentGame.currentTurnIndex, card.id, {
          autoAdvanceTricks,
          signalType,
        });
      });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [autoAdvanceTricks, game.currentTurnIndex, game.phase, game.trickCards.length]);

  useEffect(() => {
    if (!autoAdvanceTricks || game.phase !== 'trickComplete') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => advanceCompletedTrick(currentGame));
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [autoAdvanceTricks, game.phase, game.pendingTrick]);

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

  useEffect(() => {
    if (game.settlement) {
      setIsSettlementOpen(true);
    }
  }, [game.settlement]);

  function callPartnerCard(card) {
    setGame((currentGame) => callPartnerCardInGame(currentGame, card));
  }

  function playHumanCard(card, signalType = null) {
    setGame((currentGame) =>
      playCardInGame(currentGame, HUMAN_PLAYER, card.id, {
        autoAdvanceTricks,
        signalType,
      }),
    );
  }

  function playHumanCardById(cardId) {
    const card = game.players[HUMAN_PLAYER].hand.find(
      (handCard) => handCard.id === cardId,
    );

    if (card) {
      setPendingHumanPlay(card);
    }
  }

  function requestHumanPlay(card) {
    setPendingHumanPlay(card);
  }

  function confirmHumanPlay(signalType) {
    if (pendingHumanPlay) {
      playHumanCard(pendingHumanPlay, signalType);
      setPendingHumanPlay(null);
    }
  }

  function handleCardDragStart(event, card) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.id);
  }

  function handleTableDragOver(event) {
    if (isHumanTurn) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleTableDrop(event) {
    if (!isHumanTurn) {
      return;
    }

    event.preventDefault();
    playHumanCardById(event.dataTransfer.getData('text/plain'));
  }

  function advanceTrick() {
    setGame((currentGame) => advanceCompletedTrick(currentGame));
  }

  function restartGame() {
    setIsSettlementOpen(false);
    setGame(
      createInitialGame(
        game.players.map((player) => player.coins),
        getNextPlayerIndex(game.handIndex),
        game.roundNumber + 1,
      ),
    );
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
  const dealingTargetIndex = getDealTargetIndex(
    Math.max(0, game.dealProgress - 1),
    game.handIndex,
  );
  const isHumanTurn = game.phase === 'playing' && game.currentTurnIndex === HUMAN_PLAYER;
  const isTrickComplete = game.phase === 'trickComplete';
  const currentTrickOpener = game.trickCards[0]?.playerIndex ?? null;
  const currentTrickWinner = getCurrentTrickWinner(game.trickCards);

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
          <h1>Rodada {game.roundNumber}</h1>
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
          <label className="auto-advance-toggle">
            <input
              checked={autoAdvanceTricks}
              onChange={(event) => setAutoAdvanceTricks(event.target.checked)}
              type="checkbox"
            />
            Avanco auto
          </label>
          <button
            className="text-button history-button"
            onClick={() => setIsHistoryOpen(true)}
            type="button"
          >
            Historico
          </button>
          <button className="secondary-button" onClick={restartGame} type="button">
            Nova rodada
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

      {isSettlementOpen && game.settlement && (
        <SettlementModal
          onClose={() => setIsSettlementOpen(false)}
          onNewRound={restartGame}
          players={game.players}
          settlement={game.settlement}
        />
      )}

      {pendingHumanPlay && (
        <GestureModal
          alreadySignaled={Boolean(getPlayerSignal(game, HUMAN_PLAYER))}
          card={pendingHumanPlay}
          onCancel={() => setPendingHumanPlay(null)}
          onChoose={confirmHumanPlay}
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
            onCardDragStart={handleCardDragStart}
            onPlay={requestHumanPlay}
            cardHelpers={playerIndex === HUMAN_PLAYER ? playHelpers.byCardId : undefined}
            scoreInfo={getPlayerScoreInfo(game, playerIndex)}
            validHumanCardIds={validHumanCardIds}
            visibleDealCount={getVisibleDealCount(
              game.dealProgress,
              playerIndex,
              game.handIndex,
            )}
          />
        ))}

        <section
          className={`center-table${isHumanTurn ? ' drop-ready' : ''}`}
          onDragOver={handleTableDragOver}
          onDrop={handleTableDrop}
        >
          <div className="status-card">
            <span>
              {game.phase === 'dealing'
                ? `Distribuindo ${game.dealProgress}/${TOTAL_CARDS}`
                : game.phase === 'calling'
                  ? 'Chamada do mao'
                  : game.phase === 'trickComplete'
                    ? `Vaza ${game.pendingTrick?.number ?? game.tricks.length + 1} concluida`
                  : game.phase === 'finished'
                    ? 'Fim da partida'
                    : `Vaza ${game.tricks.length + 1}`}
            </span>
            <strong>
              {game.phase === 'dealing'
                ? `Carta para ${PLAYERS[dealingTargetIndex].name}`
                : game.phase === 'calling'
                  ? game.handIndex === HUMAN_PLAYER
                    ? 'Escolha a carta parceira'
                    : `${game.players[game.handIndex].name} esta chamando`
                  : game.phase === 'trickComplete'
                    ? `${currentPlayer.name} venceu a vaza`
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
            game.handIndex === HUMAN_PLAYER ? (
              <CallPanel callOptions={callOptions} onCall={callPartnerCard} />
            ) : (
              <div className="action-panel ai-call-panel">
                <p className="eyebrow">Chamada automatica</p>
                <h2>{game.players[game.handIndex].name} esta escolhendo a carta</h2>
                <p>
                  A mao deste jogador segue oculta. Assim que a carta for chamada,
                  somente a carta escolhida sera exibida.
                </p>
              </div>
            )
          )}

          {(game.phase === 'playing' ||
            game.phase === 'trickComplete' ||
            game.phase === 'finished') && (
            <div className="trick-zone">
              {currentTrickOpener !== null && currentTrickWinner && (
                <div className="trick-info-banner">
                  <span>Abriu: {game.players[currentTrickOpener].name}</span>
                  <strong>Vencendo: {game.players[currentTrickWinner.playerIndex].name}</strong>
                </div>
              )}
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

          {isTrickComplete && (
            <div className="trick-review-panel">
              <strong>
                {game.pendingTrick?.endsGame
                  ? 'Vaza final concluida'
                  : 'Vaza concluida'}
              </strong>
              <span>
                {game.pendingTrick?.figurePoints ?? 0} figura(s). Revise as cartas
                na mesa antes de seguir.
              </span>
              <button className="secondary-button" onClick={advanceTrick} type="button">
                {game.pendingTrick?.endsGame ? 'Ver resultado' : 'Proxima vaza'}
              </button>
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
