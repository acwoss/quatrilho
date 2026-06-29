import { useEffect, useMemo, useRef, useState } from 'react';
import { clearSavedGame, loadSavedGame, saveGame } from './persistence.js';

const HUMAN_PLAYER = 0;
const HAND_INDEX = 0;
const CARDS_PER_PLAYER = 10;
const TOTAL_CARDS = 40;
const INITIAL_COINS = 100;
const LAST_TRICK_BONUS = 3;

const GESTURES = {
  beat: {
    label: 'Bater',
    description: 'Sinaliza ao parceiro que você tem cartas boas nessa naipe',
    angle: 0,
  },
  discard: {
    label: 'Arremessar',
    description:
      'Sinaliza ao parceiro que você não possui mais cartas dessa naipe ou as que tem não são boas',
    angle: -60,
  },
  support: {
    label: 'Arrastar',
    description:
      'Sinaliza ao parceiro que você possui outras cartas da naipe que podem ser úteis no jogo',
    angle: 60,
  },
};

// Setores angulares (em graus, 0 = direita, 90 = baixo) usados para detectar
// em qual ação o jogador soltou a carta. Formam um semicírculo em torno do
// centro, deixando a parte de baixo livre para o arraste vindo da mão.
const SIGNAL_SECTORS = [
  { id: 'discard', start: 180, end: 240 },
  { id: 'beat', start: 240, end: 300 },
  { id: 'support', start: 300, end: 360 },
];

function GestureIcon({ type }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (type === 'play') {
    return (
      <svg {...common}>
        <path d="M12 3v6" />
        <path d="m9 6 3 3 3-3" />
        <rect x="4" y="12" width="16" height="8" rx="2" />
      </svg>
    );
  }

  if (type === 'beat') {
    return (
      <svg {...common}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }

  if (type === 'discard') {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

const SPEECH_LINES = [
  'Essa mesa está ficando quente.',
  'Vamos ver se segura essa.',
  'Não gostei desse naipe.',
  'Agora ficou interessante.',
  'Tem carta boa escondida por aí.',
  'Vou jogar com calma.',
  'Essa vaza pode decidir bastante.',
  'Alguém está carregando ponto.',
  'Não entrega de graça.',
  'Dá para trabalhar esse jogo.',
  'Estou de olho nesse naipe.',
  'Essa carta me ajuda.',
  'Tem coisa boa vindo.',
  'Vamos ver quem tem coragem.',
  'Essa rodada está comprida.',
  'Não era bem o que eu queria.',
  'O parceiro que entenda.',
  'Agora é contar as cartas.',
  'Esse naipe já falou bastante.',
  'Vou guardar o melhor para depois.',
  'Se passar, passou.',
  'Tem ponto demais na mesa.',
  'Essa jogada diz bastante.',
  'Não dá para confiar em ninguém.',
  'Vamos puxar esse jogo.',
  'Estou tentando ajudar.',
  'Essa vaza não pode escapar.',
  'Quem tiver, que mostre.',
  'Agora quero ver.',
  'A mesa está falando.',
];

const BOT_PERSONAS = [
  {
    id: 'mateus',
    name: 'Mateus',
    description: 'Vive citando "tico-tico" nas jogadas.',
    lines: [
      'Hum, eu tenho um tico-tico guardado.',
      'Se você jogou esse tico-tico, eu vou de outro.',
      'Esse tico-tico ainda vai dar trabalho.',
      'Calma que tico-tico bom não se mostra cedo.',
      'Olha o tico-tico saindo!',
      'Esse naipe está cheio de tico-tico.',
      'Deixa o tico-tico trabalhar.',
      'Tico-tico no fubá, carta na mesa.',
    ],
  },
  {
    id: 'heloise',
    name: 'Heloise',
    description: 'Empolgada, sempre grita "vai pai!".',
    lines: [
      'Vai, pai!',
      'Isso, vai pai, manda ver!',
      'Vai pai, essa é nossa!',
      'Segura essa, vai pai!',
      'Vai pai, não amarela!',
      'Bora, vai pai!',
      'Vai pai, confia!',
      'Essa vaza é minha, vai pai!',
    ],
  },
  {
    id: 'geno',
    name: 'Geno',
    description: 'Pensativo, solta uns "huuum!".',
    lines: [
      'Huuum... deixa eu pensar.',
      'Huuum, essa carta diz muita coisa.',
      'Huuum... interessante.',
      'Huuum, será que arrisco?',
      'Huuum, tem algo errado aqui.',
      'Huuum... vou esperar mais um pouco.',
      'Huuum, boa jogada essa.',
      'Huuum... complicado, complicado.',
    ],
  },
];

const DEFAULT_BOT_IDS = ['mateus', 'heloise', 'geno'];

function getDefaultBots() {
  return DEFAULT_BOT_IDS.map((id) =>
    BOT_PERSONAS.find((persona) => persona.id === id),
  );
}

const SUITS = [
  { id: 'ouros', name: 'Ouros', short: 'O', className: 'gold' },
  { id: 'copas', name: 'Copas', short: 'C', className: 'cups' },
  { id: 'espadas', name: 'Espadas', short: 'E', className: 'swords' },
  { id: 'paus', name: 'Paus', short: 'P', className: 'clubs' },
];

const RANKS = [
  { value: 12, label: 'Rei', corner: 'K', name: 'Rei', strength: 7, figurePoints: 1 },
  { value: 11, label: 'Cavalo', corner: 'J', name: 'Cavalo', strength: 6, figurePoints: 1 },
  { value: 10, label: '10', corner: '10', name: 'Dez', strength: 5, figurePoints: 1 },
  { value: 7, label: '7', corner: '7', name: 'Sete', strength: 4, figurePoints: 0 },
  { value: 6, label: '6', corner: '6', name: 'Seis', strength: 3, figurePoints: 0 },
  { value: 5, label: '5', corner: '5', name: 'Cinco', strength: 2, figurePoints: 0 },
  { value: 4, label: '4', corner: '4', name: 'Quatro', strength: 1, figurePoints: 0 },
  { value: 3, label: '3', corner: '3', name: 'Tres', strength: 10, figurePoints: 1 },
  { value: 2, label: '2', corner: '2', name: 'Dois', strength: 9, figurePoints: 1 },
  { value: 1, label: 'As', corner: 'A', name: 'As', strength: 8, figurePoints: 3 },
];

const PLAYERS = [
  { name: 'Você', seat: 'sul', seatLabel: 'Sul' },
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
      rankCorner: rank.corner,
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

function buildRoster(playerName, bots = getDefaultBots()) {
  return PLAYERS.map((player, index) => {
    if (index === HUMAN_PLAYER) {
      return { ...player, name: playerName || player.name, lines: [] };
    }

    const bot = bots[index - 1];

    return {
      ...player,
      name: bot?.name ?? player.name,
      lines: bot?.lines ?? SPEECH_LINES,
    };
  });
}

function dealDeck(
  deck,
  coinBalances = PLAYERS.map(() => INITIAL_COINS),
  handIndex = HAND_INDEX,
  roster = PLAYERS,
) {
  return roster.map((player, playerIndex) => ({
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

// Ordem de declaração do solo: começa no mão e segue anti-horário.
function getDeclarerIndex(game) {
  let playerIndex = game.handIndex;

  for (let step = 0; step < game.declarationStep; step += 1) {
    playerIndex = getNextPlayerIndex(playerIndex);
  }

  return playerIndex;
}

function createInitialGame(
  coinBalances,
  handIndex = HAND_INDEX,
  roundNumber = 1,
  playerName,
  bots = getDefaultBots(),
) {
  const deck = shuffle(buildDeck());
  const dealerIndex = getDealerIndex(handIndex);
  const roster = buildRoster(playerName, bots);
  const players = dealDeck(deck, coinBalances, handIndex, roster);

  return {
    phase: 'dealing',
    dealProgress: 0,
    players,
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
    declarationStep: 0,
    soloistIndex: null,
    soloType: null,
    soloTrade: null,
    signals: [],
    settlement: null,
    gameOver: null,
    scores: {
      callerTeam: 0,
      opponents: 0,
    },
    log: [
      `${players[dealerIndex].name} está distribuindo as cartas. ${players[handIndex].name} será o mão da rodada ${roundNumber}.`,
    ],
  };
}

function cardName(card) {
  return `${card.rankName} de ${card.suitName}`;
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

function getCurrentTrickNumber(game) {
  return game.tricks.length + 1;
}

function getPlayerSignal(game, playerIndex, trickNumber = null) {
  const signals = game.signals.filter(
    (signal) =>
      signal.playerIndex === playerIndex &&
      (trickNumber === null || signal.trickNumber === trickNumber),
  );

  return signals.at(-1) ?? null;
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

  const signal = [...game.signals]
    .reverse()
    .find(
      (candidate) =>
        candidate.playerIndex === partnerIndex && isSignalStillUseful(game, candidate),
    );

  if (!signal) {
    return null;
  }

  return signal;
}

function isSignalStillUseful(game, signal) {
  const signaler = game.players[signal.playerIndex];
  const hasSuitCards = signaler.hand.some((card) => card.suit === signal.suit);

  if (signal.type === 'discard') {
    return (
      !hasSuitCards ||
      (signal.cardRank === 1 && signal.trickNumber === getCurrentTrickNumber(game))
    );
  }

  return hasSuitCards;
}

function addSignalIfAllowed(game, playerIndex, card, signalType) {
  const trickNumber = getCurrentTrickNumber(game);

  if (!signalType || getPlayerSignal(game, playerIndex, trickNumber)) {
    return game.signals;
  }

  return [
    ...game.signals,
    {
      playerIndex,
      trickNumber,
      type: signalType,
      suit: card.suit,
      suitName: card.suitName,
      cardId: card.id,
      cardRank: card.rank,
      cardName: cardName(card),
      // "Bater" com a carta mais alta viva = pedido de "liberar o jogo".
      wasTopCard: signalType === 'beat' ? isCardFirm(game, card) : false,
    },
  ];
}

function getPlayedCards(game) {
  return [
    ...game.tricks.flatMap((trick) => trick.cards.map((play) => play.card)),
    ...game.trickCards.map((play) => play.card),
  ];
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
      '--fan-rotation': `${90 - rotation}deg`,
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

function getRandomSpeechLine(lines) {
  const source = lines && lines.length > 0 ? lines : SPEECH_LINES;

  return source[Math.floor(Math.random() * source.length)];
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
  if (game.soloistIndex !== null) {
    return playerIndex === game.soloistIndex;
  }

  return playerIndex === game.handIndex || playerIndex === game.partnerIndex;
}

function getTeamClass(game, playerIndex) {
  if (game.soloistIndex !== null) {
    return isCallerTeam(game, playerIndex) === isCallerTeam(game, HUMAN_PLAYER)
      ? 'team-ally'
      : 'team-rival';
  }

  if (game.partnerIndex === null) {
    return '';
  }

  const teamsKnownToHuman =
    game.partnerRevealed || game.partnerIndex === HUMAN_PLAYER;

  if (!teamsKnownToHuman) {
    return '';
  }

  return isCallerTeam(game, playerIndex) === isCallerTeam(game, HUMAN_PLAYER)
    ? 'team-ally'
    : 'team-rival';
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
    if (
      partnerSignal.type === 'discard' &&
      partnerSignal.cardRank === 1 &&
      partnerSignal.trickNumber === getCurrentTrickNumber(game) &&
      currentWinner
    ) {
      const forcedWinningCards = validCards
        .filter(
          (card) =>
            card.suit === currentWinner.card.suit &&
            card.strength > currentWinner.card.strength,
        )
        .sort((first, second) => first.strength - second.strength);

      if (forcedWinningCards.length > 0) {
        return forcedWinningCards[0];
      }
    }

    const signaledSuitCards = validCards.filter(
      (card) => card.suit === partnerSignal.suit,
    );

    // "Bater" com a carta mais alta viva = pedido de liberar o jogo: o parceiro
    // joga sua carta mais alta do naipe para somar pontos/garantir a vaza.
    if (
      partnerSignal.type === 'beat' &&
      partnerSignal.wasTopCard &&
      signaledSuitCards.length > 0
    ) {
      return [...signaledSuitCards].sort((first, second) => {
        if (second.figurePoints !== first.figurePoints) {
          return second.figurePoints - first.figurePoints;
        }

        return second.strength - first.strength;
      })[0];
    }

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
  if (getPlayerSignal(game, playerIndex, getCurrentTrickNumber(game))) {
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

function chooseAiSoloDecision(game, playerIndex) {
  const hand = game.players[playerIndex].hand;
  // Figuras = cartas que valem ponto (3, 2, Ás, Rei, Cavalo, Sota).
  const figureCount = hand.filter((card) => card.figurePoints > 0).length;
  // Cartas que vencem a vaza = altas o suficiente para ganhar (Rei ou mais
  // forte: Rei, Ás, 2, 3).
  const trickWinners = hand.filter((card) => card.strength >= 7).length;

  // Solo preto (mão forte): ao menos 6 cartas que vencem a vaza, 60% de chance.
  if (trickWinners >= 6 && Math.random() < 0.6) {
    return 'preto';
  }

  // Solo branco (mão fraca): quanto menos figuras, maior a chance.
  if (figureCount <= 2) {
    const chance = figureCount === 0 ? 0.9 : figureCount === 1 ? 0.7 : 0.5;

    if (Math.random() < chance) {
      return 'branco';
    }
  }

  return 'pass';
}

function getResult(game) {
  if (game.soloistIndex !== null) {
    const soloistName = game.players[game.soloistIndex].name;

    if (game.soloType === 'branco') {
      const wonTrick = game.tricks.some(
        (trick) => trick.winnerIndex === game.soloistIndex,
      );

      return wonTrick
        ? `${soloistName} venceu uma vaza e perdeu o solo branco.`
        : `${soloistName} não venceu nenhuma vaza e ganhou o solo branco.`;
    }

    return game.scores.callerTeam > game.scores.opponents
      ? `${soloistName} venceu o solo preto.`
      : `${soloistName} perdeu o solo preto.`;
  }

  if (game.scores.callerTeam > game.scores.opponents) {
    return 'A dupla do mão venceu.';
  }

  if (game.scores.opponents > game.scores.callerTeam) {
    return 'A dupla adversária venceu.';
  }

  return 'A partida terminou empatada em tentos.';
}

function buildPodium(players, excludedPlayerIndexes = []) {
  const excluded = new Set(excludedPlayerIndexes);

  return players
    .map((player, index) => ({ ...player, playerIndex: index }))
    .filter((player) => !excluded.has(player.playerIndex))
    .sort((first, second) => {
      if (second.coins !== first.coins) {
        return second.coins - first.coins;
      }

      return first.playerIndex - second.playerIndex;
    });
}

function buildGameOver(players, unableToPay, amount) {
  return {
    reason: `${unableToPay
      .map(({ player }) => player.name)
      .join(', ')} não têm moedas suficientes para pagar ${amount}.`,
    eliminatedPlayerIndexes: unableToPay.map(({ playerIndex }) => playerIndex),
    podium: buildPodium(
      players,
      unableToPay.map(({ playerIndex }) => playerIndex),
    ),
  };
}

// Aplica os deltas em moedas garantindo que ninguém fique negativo (paga o que
// tem) e sinaliza fim de partida se algum pagador não cobre o valor devido.
function finalizeSettlement(game, rawDeltas) {
  const unableToPay = game.players
    .map((player, playerIndex) => ({ player, playerIndex }))
    .filter(
      ({ player, playerIndex }) =>
        rawDeltas[playerIndex] < 0 &&
        player.coins < -rawDeltas[playerIndex],
    );
  const gameOver = unableToPay.length > 0;
  const players = game.players.map((player, playerIndex) => ({
    ...player,
    coins: Math.max(0, player.coins + rawDeltas[playerIndex]),
  }));
  const playerDeltas = players.map(
    (player, playerIndex) => player.coins - game.players[playerIndex].coins,
  );

  return { players, playerDeltas, unableToPay, gameOver };
}

function settleSolo(game) {
  const soloist = game.soloistIndex;
  const opponentIndexes = game.players
    .map((_, index) => index)
    .filter((index) => index !== soloist);
  const soloistTricks = game.tricks.filter(
    (trick) => trick.winnerIndex === soloist,
  ).length;
  const totalTricks = game.tricks.length;
  const soloistWonAnyTrick = soloistTricks > 0;

  let rawDeltas;
  let summary;

  if (game.soloType === 'branco') {
    const soloistWins = !soloistWonAnyTrick;
    const per = 10;
    rawDeltas = game.players.map((_, index) => {
      if (index === soloist) {
        return soloistWins ? per * opponentIndexes.length : -per * opponentIndexes.length;
      }

      return soloistWins ? -per : per;
    });
    summary = { soloType: 'branco', soloistWins, per, capote: false };
  } else {
    const soloistPoints = game.scores.callerTeam;
    const trioPoints = game.scores.opponents;
    const soloistWins = soloistPoints > trioPoints;
    const capoteFavor = soloistTricks === 10;
    const capoteContra = soloistTricks === 0 && totalTricks === 10;
    const capote = capoteFavor || capoteContra;

    let soloistSign;
    let opponentAmounts;

    if (capoteFavor) {
      soloistSign = 1;
      opponentAmounts = new Map(
        opponentIndexes.map((index) => {
          const isTrader =
            game.soloTrade && game.soloTrade.traderIndex === index;
          return [index, isTrader ? 10 : 21];
        }),
      );
    } else if (capoteContra) {
      soloistSign = -1;
      opponentAmounts = new Map(opponentIndexes.map((index) => [index, 21]));
    } else {
      soloistSign = soloistWins ? 1 : -1;
      const winnerPoints = soloistWins ? soloistPoints : trioPoints;
      const tentos = Math.floor(winnerPoints / 3);
      opponentAmounts = new Map(
        opponentIndexes.map((index) => [index, tentos]),
      );
    }

    const soloistTotal = opponentIndexes.reduce(
      (total, index) => total + opponentAmounts.get(index),
      0,
    );
    rawDeltas = game.players.map((_, index) => {
      if (index === soloist) {
        return soloistSign * soloistTotal;
      }

      return -soloistSign * opponentAmounts.get(index);
    });
    summary = {
      soloType: 'preto',
      soloistWins,
      capote,
      capoteFavor,
      capoteContra,
      per: capote
        ? 21
        : Math.floor((soloistWins ? soloistPoints : trioPoints) / 3),
    };
  }

  const { players, playerDeltas, unableToPay, gameOver } = finalizeSettlement(
    game,
    rawDeltas,
  );

  return {
    ...game,
    players,
    settlement: {
      mode: 'solo',
      soloistIndex: soloist,
      ...summary,
      amount: summary.per,
      humanDelta: playerDeltas[HUMAN_PLAYER],
      playerDeltas,
      unableToPay: unableToPay.map(({ playerIndex }) => playerIndex),
      gameOver,
    },
    gameOver: gameOver
      ? buildGameOver(players, unableToPay, summary.per)
      : null,
  };
}

function settleFinishedGame(game) {
  if (game.settlement) {
    return game;
  }

  if (game.soloistIndex !== null) {
    return settleSolo(game);
  }

  const teamInfo = getTeamInfo(game);

  if (teamInfo.winner === 'draw') {
    return {
      ...game,
      settlement: {
        mode: 'normal',
        winner: 'draw',
        amount: 0,
        humanDelta: 0,
        playerDeltas: PLAYERS.map(() => 0),
      },
    };
  }

  const tentos =
    teamInfo.winningFigures === 35
      ? 21
      : Math.floor(teamInfo.winningFigures / 3);
  const perPlayer = tentos * 2;
  const rawDeltas = game.players.map((_, playerIndex) =>
    getPlayerTeam(game, playerIndex) === teamInfo.winner
      ? perPlayer
      : -perPlayer,
  );
  const { players, playerDeltas, unableToPay, gameOver } = finalizeSettlement(
    game,
    rawDeltas,
  );

  return {
    ...game,
    players,
    settlement: {
      mode: 'normal',
      winner: teamInfo.winner,
      loser: teamInfo.loser,
      amount: perPlayer,
      tentos,
      humanDelta: playerDeltas[HUMAN_PLAYER],
      playerDeltas,
      unableToPay: unableToPay.map(({ playerIndex }) => playerIndex),
      gameOver,
    },
    gameOver: gameOver
      ? buildGameOver(players, unableToPay, perPlayer)
      : null,
  };
}

function declareSoloInGame(game, playerIndex, decision) {
  if (game.phase !== 'declaring') {
    return game;
  }

  if (decision === 'pass') {
    const nextStep = game.declarationStep + 1;

    if (nextStep >= PLAYERS.length) {
      return {
        ...game,
        phase: 'calling',
        declarationStep: nextStep,
        log: [
          `${game.players[playerIndex].name} passou. Todos passaram, o mão deve chamar uma carta.`,
          ...game.log,
        ],
      };
    }

    return {
      ...game,
      declarationStep: nextStep,
      log: [`${game.players[playerIndex].name} passou.`, ...game.log],
    };
  }

  const soloistIsHand = playerIndex === game.handIndex;
  // Solo preto do mão habilita a troca de carta (Seção 9.2); só pedimos a troca
  // ao humano. Os demais casos vão direto para o jogo.
  const goesToTrade =
    decision === 'preto' && soloistIsHand && playerIndex === HUMAN_PLAYER;

  return {
    ...game,
    phase: goesToTrade ? 'trading' : 'playing',
    soloistIndex: playerIndex,
    soloType: decision,
    partnerIndex: null,
    partnerRevealed: true,
    currentTurnIndex: game.handIndex,
    currentLeaderIndex: game.handIndex,
    log: [
      `${game.players[playerIndex].name} declarou solo ${decision}. Agora é 1 contra 3.${
        goesToTrade ? '' : ` ${game.players[game.handIndex].name} abre a primeira vaza.`
      }`,
      ...game.log,
    ],
  };
}

function performSoloTrade(game, giveCardId, requestCardId) {
  if (game.phase !== 'trading') {
    return game;
  }

  const soloist = game.soloistIndex;
  const holderIndex = game.players.findIndex((player) =>
    player.hand.some((card) => card.id === requestCardId),
  );

  if (holderIndex === -1 || holderIndex === soloist) {
    return game;
  }

  const giveCard = game.players[soloist].hand.find(
    (card) => card.id === giveCardId,
  );
  const requestCard = game.players[holderIndex].hand.find(
    (card) => card.id === requestCardId,
  );

  if (!giveCard || !requestCard) {
    return game;
  }

  const players = game.players.map((player, index) => {
    if (index === soloist) {
      return {
        ...player,
        hand: sortHand([
          ...player.hand.filter((card) => card.id !== giveCardId),
          requestCard,
        ]),
      };
    }

    if (index === holderIndex) {
      return {
        ...player,
        hand: sortHand([
          ...player.hand.filter((card) => card.id !== requestCardId),
          giveCard,
        ]),
      };
    }

    return player;
  });

  return {
    ...game,
    players,
    phase: 'playing',
    soloTrade: { traderIndex: holderIndex, requestCardId, giveCardId },
    currentTurnIndex: game.handIndex,
    currentLeaderIndex: game.handIndex,
    log: [
      `${game.players[soloist].name} trocou ${cardName(giveCard)} por ${cardName(
        requestCard,
      )} com ${game.players[holderIndex].name}. ${game.players[game.handIndex].name} abre a primeira vaza.`,
      ...game.log,
    ],
  };
}

function skipSoloTrade(game) {
  if (game.phase !== 'trading') {
    return game;
  }

  return {
    ...game,
    phase: 'playing',
    currentTurnIndex: game.handIndex,
    currentLeaderIndex: game.handIndex,
    log: [
      `${game.players[game.soloistIndex].name} não trocou nenhuma carta. ${game.players[game.handIndex].name} abre a primeira vaza.`,
      ...game.log,
    ],
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
        title: 'Você é o parceiro!',
        message: `${game.players[game.handIndex].name} chamou ${cardName(card)}, que está na sua mão. Você já sabe quem é seu parceiro.`,
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
  const partnerAlert =
    didRevealPartner && game.partnerIndex !== HUMAN_PLAYER
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
  const handsEmpty = players.every(
    (currentPlayer) => currentPlayer.hand.length === 0,
  );
  const soloBrancoBust = game.soloType === 'branco' && winnerIsCallerTeam;
  const isFinished = handsEmpty || soloBrancoBust;
  const lastTrickBonus = handsEmpty ? LAST_TRICK_BONUS : 0;
  const winnerTrickScore = trickPoints + lastTrickBonus;
  const nextScores = {
    callerTeam:
      game.scores.callerTeam + (winnerIsCallerTeam ? winnerTrickScore : 0),
    opponents:
      game.scores.opponents + (winnerIsCallerTeam ? 0 : winnerTrickScore),
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
    lastTrickBonus,
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
          ? ['Vaza final concluída. Avance para ver o resultado.']
          : ['Vaza concluída. Avance para limpar a mesa.']),
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
        : `${game.players[game.currentTurnIndex].name} abre a próxima vaza.`,
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

function Card({
  card,
  disabled = false,
  draggable = false,
  dragging = false,
  selected = false,
  compact = false,
  inspectable = false,
  teamClass = '',
  style,
  onDragStart,
  onPointerDown,
  onClick,
}) {
  const cornerLabel = card.rankCorner ?? card.rankLabel;

  return (
    <button
      className={`card ${card.suitClassName}${compact ? ' compact' : ''}${inspectable ? ' inspectable' : ''}${dragging ? ' is-dragging' : ''}${selected ? ' selected' : ''}${teamClass ? ` ${teamClass}` : ''}`}
      disabled={disabled}
      draggable={draggable && !disabled}
      onClick={onClick}
      onDragStart={onDragStart}
      onPointerDown={onPointerDown}
      style={style}
      type="button"
      title={cardName(card)}
    >
      <span className="card-corner card-corner-tl" aria-label={card.suitName}>
        <span className="corner-rank">{cornerLabel}</span>
        <span className="corner-suit">
          <SuitIcon suit={card.suit} />
        </span>
      </span>
      <span className="card-center-suit" aria-hidden="true">
        <SuitIcon suit={card.suit} />
      </span>
      <span className="card-corner card-corner-br" aria-hidden="true">
        <span className="corner-suit">
          <SuitIcon suit={card.suit} />
        </span>
        <span className="corner-rank">{cornerLabel}</span>
      </span>
    </button>
  );
}

function CardBack({ index = 0, teamClass = '', style }) {
  return (
    <span
      aria-label="Carta virada"
      className={`card-back${teamClass ? ` ${teamClass}` : ''}`}
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
  visibleDealCount,
  validHumanCardIds,
  draggingCardId,
  selectedCardId,
  onCardPointerDown,
}) {
  const visibleCards =
    game.phase === 'dealing' ? player.hand.slice(0, visibleDealCount) : player.hand;
  const hiddenCount = game.phase === 'dealing' ? visibleDealCount : player.hand.length;
  const teamClass = getTeamClass(game, playerIndex);

  return (
    <section className={`player-seat ${player.seat}${isCurrent ? ' active' : ''}`}>
      <div className="player-banner">
        <strong className="player-name">{player.name}</strong>
      </div>

      <div
        className={`seat-cards${isHuman ? ' human-cards' : ''}${
          isHuman && draggingCardId ? ' retracted' : ''
        }`}
      >
        {isHuman
          ? visibleCards.map((card, index) => {
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
                  dragging={draggingCardId === card.id}
                  selected={selectedCardId === card.id}
                  inspectable={game.phase !== 'playing'}
                  teamClass={teamClass}
                  style={cardStyle}
                  onPointerDown={(event) => onCardPointerDown(event, card)}
                />
              );
            })
          : Array.from({ length: hiddenCount }).map((_, index) => (
              <CardBack
                key={`${player.name}-${index}`}
                index={index}
                teamClass={teamClass}
                style={getFanCardStyle(index, hiddenCount, player.seat)}
              />
            ))}
      </div>
    </section>
  );
}

function TrickCard({
  play,
  player,
  teamClass,
  isWinning = false,
  isOffSuit = false,
}) {
  return (
    <div
      className={`trick-card ${player.seat}${isWinning ? ' winning' : ''}${
        isOffSuit ? ' off-suit' : ''
      }`}
    >
      <span>{player.name}</span>
      <div className="trick-card-frame">
        <Card card={play.card} disabled teamClass={teamClass} />
      </div>
    </div>
  );
}

function CallPanel({ callOptions, onCall }) {
  return (
    <>
      <div className="call-backdrop" aria-hidden="true" />
      <div className="call-overlay" role="dialog" aria-modal="true">
        <section className="call-modal">
          <p className="eyebrow">Chamada</p>
          <h2>É sua vez de chamar</h2>
          <p>
            Escolha a carta que deseja chamar. A chamada deve ser um 3 que não
            está na sua mão; se você tiver os quatro 3, pode chamar outra carta.
          </p>
          <div className="call-cards">
            {callOptions.map((option) => (
              <Card
                key={option.card.id}
                card={option.card}
                onClick={() => onCall(option.card)}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SoloDeclarePanel({ onDeclare, onCancel }) {
  return (
    <>
      <div className="call-backdrop solo-backdrop" aria-hidden="true" />
      <div className="call-overlay solo-overlay" role="dialog" aria-modal="true">
        <section className="call-modal">
          <p className="eyebrow">Declaração</p>
          <h2>Qual jogo solo?</h2>
          <p>
            No solo você joga 1 contra 3. Suas cartas seguem visíveis atrás
            desta janela.
          </p>
          <div className="solo-options">
            <button
              className="setup-option"
              onClick={() => onDeclare('preto')}
              type="button"
            >
              <strong>Solo preto</strong>
              <span>Mão forte: você aposta que vence a rodada.</span>
            </button>
            <button
              className="setup-option"
              onClick={() => onDeclare('branco')}
              type="button"
            >
              <strong>Solo branco</strong>
              <span>Mão fraca: você aposta que não vence nenhuma vaza.</span>
            </button>
            <button
              className="text-button"
              onClick={onCancel}
              type="button"
            >
              Voltar
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function SoloAnnounceModal({ name, type, onClose }) {
  return (
    <div className="ai-call-overlay" role="dialog" aria-modal="true">
      <section className="ai-call-modal">
        <p className="eyebrow">Jogo solo</p>
        <h2>{name} vai jogar sozinho</h2>
        <p>
          Declarou <strong>solo {type}</strong> — agora é 1 contra 3.
        </p>
        <button className="secondary-button" onClick={onClose} type="button">
          Ok
        </button>
      </section>
    </div>
  );
}

function TradePanel({ game, onTrade, onSkip }) {
  const soloist = game.soloistIndex;
  const hand = game.players[soloist].hand;
  const handIds = new Set(hand.map((card) => card.id));
  const requestable = useMemo(
    () => buildDeck().filter((card) => !handIds.has(card.id)),
    [game.players],
  );
  const [giveId, setGiveId] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const canTrade = Boolean(giveId && requestId);

  return (
    <>
      <div className="call-backdrop" aria-hidden="true" />
      <div className="call-overlay" role="dialog" aria-modal="true">
        <section className="call-modal trade-modal">
          <p className="eyebrow">Solo preto</p>
          <h2>Trocar uma carta?</h2>
          <p>
            Você é o mão. Pode pedir uma carta que não tem e entregar uma da sua
            mão em troca. Quem tiver a carta pedida é obrigado a trocar.
          </p>
          <h3>Carta que você quer pedir</h3>
          <div className="trade-grid">
            {requestable.map((card) => (
              <Card
                key={card.id}
                card={card}
                compact
                teamClass={requestId === card.id ? 'team-ally' : ''}
                onClick={() => setRequestId(card.id)}
              />
            ))}
          </div>
          <h3>Carta que você vai entregar</h3>
          <div className="trade-grid">
            {hand.map((card) => (
              <Card
                key={card.id}
                card={card}
                compact
                teamClass={giveId === card.id ? 'team-rival' : ''}
                onClick={() => setGiveId(card.id)}
              />
            ))}
          </div>
          <div className="settlement-actions">
            <button
              className="secondary-button"
              disabled={!canTrade}
              onClick={() => onTrade(giveId, requestId)}
              type="button"
            >
              Trocar
            </button>
            <button className="text-button" onClick={onSkip} type="button">
              Não trocar
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function GameOverCard({ gameOver, players, roundNumber }) {
  const eliminated = new Set(gameOver.eliminatedPlayerIndexes);
  const fallen = players
    .map((player, index) => ({ ...player, playerIndex: index }))
    .filter((player) => eliminated.has(player.playerIndex))
    .sort((first, second) => second.coins - first.coins);
  const ranking = [...gameOver.podium, ...fallen];
  const champion = ranking[0];
  const humanRank = ranking.findIndex(
    (player) => player.playerIndex === HUMAN_PLAYER,
  );
  const humanWon = champion?.playerIndex === HUMAN_PLAYER;
  const humanEliminated = eliminated.has(HUMAN_PLAYER);

  let verdict;
  if (humanWon) {
    verdict = {
      emoji: '🎉',
      title: 'Você é o grande campeão!',
      text: 'A família vai ouvir falar dessa vitória por semanas.',
    };
  } else if (humanEliminated) {
    verdict = {
      emoji: '💸',
      title: 'Você quebrou!',
      text: 'Ficou sem moedas, mas a honra fica pra revanche.',
    };
  } else {
    verdict = {
      emoji: '🤝',
      title: `Você terminou em ${humanRank + 1}º lugar`,
      text: 'Não levou a taça, mas brigou até o fim.',
    };
  }

  const playedDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="gameover">
      <div className="gameover-confetti" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, index) => (
          <span key={index} style={{ '--i': index }} />
        ))}
      </div>

      <p className="gameover-eyebrow">🃏 Quatrilho • Fim de jogo</p>

      <div className="gameover-champion">
        <span className="gameover-crown" aria-hidden="true">
          👑
        </span>
        <span className="gameover-avatar is-champ">
          {getInitials(champion.name)}
        </span>
        <h2>{champion.name}</h2>
        <p>Campeão com {formatCoins(champion.coins)} moedas</p>
      </div>

      <div className="gameover-verdict">
        <span className="gameover-verdict-emoji" aria-hidden="true">
          {verdict.emoji}
        </span>
        <strong>{verdict.title}</strong>
        <small>{verdict.text}</small>
      </div>

      <ol className="gameover-ranking">
        {ranking.map((player, index) => {
          const isEliminated = eliminated.has(player.playerIndex);
          const isHuman = player.playerIndex === HUMAN_PLAYER;
          return (
            <li
              key={player.name}
              className={`${index === 0 ? 'is-gold ' : ''}${
                isHuman ? 'is-me ' : ''
              }${isEliminated ? 'is-out' : ''}`}
            >
              <span className="gameover-pos">
                {RANK_MEDALS[index] ?? `${index + 1}º`}
              </span>
              <span className="gameover-avatar">{getInitials(player.name)}</span>
              <span className="gameover-name">
                {player.name}
                {isHuman && <em> (você)</em>}
                <small>
                  {player.seatLabel}
                  {isEliminated ? ' • quebrou' : ''}
                </small>
              </span>
              <span className="gameover-coins">
                {formatCoins(player.coins)} 🪙
              </span>
            </li>
          );
        })}
      </ol>

      <div className="gameover-details">
        <div>
          <strong>{roundNumber}</strong>
          <span>rodadas</span>
        </div>
        <div>
          <strong>{players.length}</strong>
          <span>jogadores</span>
        </div>
        <div>
          <strong>{playedDate}</strong>
          <span>data</span>
        </div>
      </div>

      <p className="gameover-footer">Tirou print? Manda no grupo da família! 📸</p>
    </div>
  );
}

function SettlementModal({
  gameOver,
  settlement,
  players,
  roundNumber,
  onNewRound,
  onPlayAgain,
}) {
  if (gameOver) {
    return (
      <div className="settlement-overlay" role="dialog" aria-modal="true">
        <section className="settlement-panel gameover-panel">
          <GameOverCard
            gameOver={gameOver}
            players={players}
            roundNumber={roundNumber}
          />
          <div className="settlement-actions">
            <button
              className="secondary-button"
              onClick={onPlayAgain}
              type="button"
            >
              Jogar novamente
            </button>
          </div>
        </section>
      </div>
    );
  }

  const humanDelta = settlement.humanDelta;
  const isSolo = settlement.mode === 'solo';
  let title = 'Rodada empatada';
  let description =
    'As duplas empataram em tentos, então nenhuma moeda foi transferida.';

  if (humanDelta > 0) {
    title = `Você ganhou ${formatCoins(humanDelta)} moeda(s)`;
    description = isSolo
      ? 'Você recebeu moedas pelo resultado do jogo solo.'
      : 'Sua dupla venceu a rodada e recebeu moedas da dupla perdedora.';
  } else if (humanDelta < 0) {
    title = `Pague ${formatCoins(Math.abs(humanDelta))} moeda(s)`;
    description = isSolo
      ? 'Você pagou moedas pelo resultado do jogo solo.'
      : 'Sua dupla perdeu a rodada e pagou moedas para a dupla vencedora.';
  }

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
          <button className="secondary-button" onClick={onNewRound} type="button">
            Nova rodada
          </button>
        </div>
      </section>
    </div>
  );
}

function AiCallModal({ name, card, onClose }) {
  return (
    <div className="ai-call-overlay" role="dialog" aria-modal="true">
      <section className="ai-call-modal">
        <p className="eyebrow">Chamada</p>
        <h2>Vez da {name} chamar</h2>
        {card ? (
          <div className="ai-call-result">
            <p>{name} chamou:</p>
            <Card card={card} compact disabled />
            <button className="secondary-button" onClick={onClose} type="button">
              Ok
            </button>
          </div>
        ) : (
          <div className="ai-call-loading">
            <span className="ai-call-spinner" aria-hidden="true" />
            <p>Escolhendo a carta...</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PartnerTile({ player, isHuman, isCaller, side }) {
  return (
    <article className={`partner-tile from-${side}`}>
      {isCaller && <span className="partner-badge">Mão</span>}
      <span className="partner-avatar">{getInitials(player.name)}</span>
      <strong>
        {player.name}
        {isHuman && <em> (você)</em>}
      </strong>
      <small>{player.seatLabel}</small>
    </article>
  );
}

function PartnerRevealModal({
  title,
  caller,
  partner,
  callerIsHuman,
  partnerIsHuman,
  calledCard,
  humanInDuo,
  onClose,
}) {
  return (
    <div
      className="partner-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <section
        className={`partner-modal${humanInDuo ? ' is-mine' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">🤝 Parceria revelada</p>
        <h2>{title}</h2>

        <div className="partner-duo">
          <PartnerTile
            player={caller}
            isHuman={callerIsHuman}
            isCaller
            side="left"
          />
          <span className="partner-link" aria-hidden="true">
            🤝
          </span>
          <PartnerTile
            player={partner}
            isHuman={partnerIsHuman}
            isCaller={false}
            side="right"
          />
        </div>

        {calledCard && (
          <div className="partner-card">
            <span>Carta da chamada</span>
            <Card card={calledCard} compact disabled />
          </div>
        )}

        <p className="partner-tagline">
          {humanInDuo
            ? 'Essa é a sua dupla — joguem juntos!'
            : 'Agora você conhece a dupla a ser batida.'}
        </p>

        <button className="secondary-button" onClick={onClose} type="button">
          Entendi
        </button>
      </section>
    </div>
  );
}

function GameScreen({ config, initialGame = null, onPlayAgain }) {
  const [game, setGame] = useState(
    () =>
      initialGame ??
      createInitialGame(
        Array(PLAYERS.length).fill(config.startingCoins),
        Math.floor(Math.random() * PLAYERS.length),
        1,
        config.name,
        config.bots,
      ),
  );
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [drag, setDrag] = useState(null);
  const [speechBubble, setSpeechBubble] = useState(null);
  const [lastSpeechTurnKey, setLastSpeechTurnKey] = useState(null);
  const [collectingTrick, setCollectingTrick] = useState(false);
  const [aiCall, setAiCall] = useState(null);
  const [soloNotice, setSoloNotice] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [hoverZone, setHoverZone] = useState(null);
  const [soloModalOpen, setSoloModalOpen] = useState(false);
  const dragInfoRef = useRef(null);
  const dropZoneRefs = useRef({});
  const handPlayer = game.players[game.handIndex];
  const validHumanCardIds = useMemo(
    () => new Set(getValidCards(game, HUMAN_PLAYER).map((card) => card.id)),
    [game],
  );
  const callOptions = useMemo(
    () => getCallCardOptions(handPlayer.hand),
    [handPlayer.hand],
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
                phase: 'declaring',
                log: [
                  'Cartas distribuídas. Cada jogador declara solo ou passa.',
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
    if (game.phase !== 'declaring') {
      return undefined;
    }

    if (getDeclarerIndex(game) === HUMAN_PLAYER) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => {
        if (
          currentGame.phase !== 'declaring' ||
          getDeclarerIndex(currentGame) === HUMAN_PLAYER
        ) {
          return currentGame;
        }

        const declarerIndex = getDeclarerIndex(currentGame);
        const decision = chooseAiSoloDecision(currentGame, declarerIndex);

        return declareSoloInGame(currentGame, declarerIndex, decision);
      });
    }, 1100);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, game.declarationStep]);

  useEffect(() => {
    if (game.soloistIndex === null || game.soloistIndex === HUMAN_PLAYER) {
      return;
    }

    setSoloNotice({
      name: game.players[game.soloistIndex].name,
      type: game.soloType,
    });
    // Dispara uma única vez quando o solista é definido na rodada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.soloistIndex]);

  useEffect(() => {
    if (game.phase !== 'calling' || game.handIndex === HUMAN_PLAYER) {
      return undefined;
    }

    const handName = game.players[game.handIndex].name;
    setAiCall({ name: handName, card: null });

    const timeoutId = window.setTimeout(() => {
      const [bestOption] = getCallCardOptions(game.players[game.handIndex].hand);

      if (!bestOption) {
        return;
      }

      setGame((currentGame) =>
        currentGame.phase === 'calling' && currentGame.handIndex !== HUMAN_PLAYER
          ? callPartnerCardInGame(currentGame, bestOption.card)
          : currentGame,
      );

      // Se o humano tem a carta chamada, ele é o parceiro e já recebe o modal
      // "Você é o parceiro!" (que mostra a carta). Evita a notificação repetida.
      const humanIsCalledPartner = game.players[HUMAN_PLAYER].hand.some(
        (handCard) => handCard.id === bestOption.card.id,
      );

      setAiCall(
        humanIsCalledPartner
          ? null
          : { name: handName, card: bestOption.card },
      );
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [game.handIndex, game.phase, game.players]);

  useEffect(() => {
    if (!aiCall || !aiCall.card) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAiCall(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [aiCall]);

  useEffect(() => {
    if (game.phase !== 'playing' || game.currentTurnIndex === HUMAN_PLAYER) {
      return undefined;
    }

    if (aiCall || speechBubble || soloNotice) {
      return undefined;
    }

    const speechTurnKey = [
      game.roundNumber,
      game.tricks.length,
      game.trickCards.length,
      game.currentTurnIndex,
    ].join('-');

    if (lastSpeechTurnKey !== speechTurnKey && Math.random() < 0.35) {
      setLastSpeechTurnKey(speechTurnKey);
      setSpeechBubble({
        playerIndex: game.currentTurnIndex,
        text: getRandomSpeechLine(game.players[game.currentTurnIndex].lines),
      });
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
          signalType,
        });
      });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [
    aiCall,
    game.currentTurnIndex,
    game.phase,
    game.roundNumber,
    game.trickCards.length,
    game.tricks.length,
    lastSpeechTurnKey,
    speechBubble,
    soloNotice,
  ]);

  useEffect(() => {
    if (!speechBubble) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSpeechBubble(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [speechBubble]);

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

  useEffect(() => {
    if (game.gameOver) {
      clearSavedGame();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      saveGame(config, game);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [config, game]);

  useEffect(() => {
    if (game.phase !== 'trickComplete' || !game.pendingTrick) {
      setCollectingTrick(false);
      return undefined;
    }

    setSpeechBubble(null);

    const collectTimeout = window.setTimeout(() => {
      setCollectingTrick(true);
    }, 3000);

    return () => window.clearTimeout(collectTimeout);
  }, [game.phase, game.pendingTrick]);

  useEffect(() => {
    if (!collectingTrick) {
      return undefined;
    }

    const advanceTimeout = window.setTimeout(() => {
      setCollectingTrick(false);
      setGame((currentGame) => advanceCompletedTrick(currentGame));
    }, 650);

    return () => window.clearTimeout(advanceTimeout);
  }, [collectingTrick]);

  useEffect(() => {
    if (!selectedCard) {
      return undefined;
    }

    const isHumanPlaying =
      game.phase === 'playing' && game.currentTurnIndex === HUMAN_PLAYER;

    if (!isHumanPlaying || !validHumanCardIds.has(selectedCard.id)) {
      setSelectedCard(null);
      return undefined;
    }

    function handleKeyDown(keyEvent) {
      if (keyEvent.key === 'Escape') {
        setSelectedCard(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard, game.phase, game.currentTurnIndex, validHumanCardIds]);

  useEffect(() => {
    if (game.phase !== 'declaring' && soloModalOpen) {
      setSoloModalOpen(false);
    }
  }, [game.phase, soloModalOpen]);

  function callPartnerCard(card) {
    setGame((currentGame) => callPartnerCardInGame(currentGame, card));
  }

  function declareSolo(decision) {
    setSoloModalOpen(false);
    setGame((currentGame) =>
      declareSoloInGame(currentGame, getDeclarerIndex(currentGame), decision),
    );
  }

  function handleSoloTrade(giveCardId, requestCardId) {
    setGame((currentGame) =>
      performSoloTrade(currentGame, giveCardId, requestCardId),
    );
  }

  function handleSkipTrade() {
    setGame((currentGame) => skipSoloTrade(currentGame));
  }

  function playHumanCard(card, signalType = null) {
    setSelectedCard(null);
    setHoverZone(null);
    setGame((currentGame) =>
      playCardInGame(currentGame, HUMAN_PLAYER, card.id, {
        signalType,
      }),
    );
  }

  function confirmSelectedCard(signalType = null) {
    if (!selectedCard) {
      return;
    }

    playHumanCard(selectedCard, signalType);
  }

  function getZoneAtPoint(x, y, allowSignals) {
    const playElement = dropZoneRefs.current.play;
    if (!playElement) {
      return null;
    }

    const rect = playElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const playRadius = rect.width / 2;
    const distance = Math.hypot(x - centerX, y - centerY);

    if (distance <= playRadius) {
      return 'play';
    }

    if (!allowSignals) {
      return null;
    }

    let angle = (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
    if (angle < 0) {
      angle += 360;
    }

    const sector = SIGNAL_SECTORS.find(
      (item) => angle >= item.start && angle < item.end,
    );

    return sector ? sector.id : null;
  }

  function handleCardPointerDown(event, card) {
    if (
      game.phase !== 'playing' ||
      game.currentTurnIndex !== HUMAN_PLAYER ||
      !validHumanCardIds.has(card.id)
    ) {
      return;
    }

    if (typeof event.button === 'number' && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const alreadySignaled = Boolean(
      getPlayerSignal(game, HUMAN_PLAYER, getCurrentTrickNumber(game)),
    );

    dragInfoRef.current = {
      card,
      startX: event.clientX,
      startY: event.clientY,
      allowSignals: !alreadySignaled,
      active: false,
    };

    function handleMove(moveEvent) {
      const info = dragInfoRef.current;
      if (!info) {
        return;
      }

      const dx = moveEvent.clientX - info.startX;
      const dy = moveEvent.clientY - info.startY;

      if (!info.active && Math.hypot(dx, dy) < 7) {
        return;
      }

      info.active = true;
      setSelectedCard(null);
      const zone = getZoneAtPoint(moveEvent.clientX, moveEvent.clientY, info.allowSignals);
      setDrag({
        card: info.card,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        zone,
      });
    }

    function handleUp(upEvent) {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);

      const info = dragInfoRef.current;
      dragInfoRef.current = null;
      setDrag(null);

      if (!info) {
        return;
      }

      if (!info.active) {
        setSelectedCard((current) =>
          current && current.id === info.card.id ? null : info.card,
        );
        return;
      }

      const zone = getZoneAtPoint(upEvent.clientX, upEvent.clientY, info.allowSignals);
      if (zone === 'play') {
        playHumanCard(info.card, null);
      } else if (zone) {
        playHumanCard(info.card, zone);
      }
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  }

  function restartGame() {
    if (game.gameOver) {
      return;
    }

    setIsSettlementOpen(false);
    setAiCall(null);
    setSoloNotice(null);
    setGame(
      createInitialGame(
        game.players.map((player) => player.coins),
        getNextPlayerIndex(game.handIndex),
        game.roundNumber + 1,
        config.name,
        config.bots,
      ),
    );
  }

  function finishDeal() {
    setGame((currentGame) =>
      currentGame.phase === 'dealing'
        ? {
            ...currentGame,
            phase: 'declaring',
            dealProgress: TOTAL_CARDS,
            log: [
              'Distribuição concluída. Cada jogador declara solo ou passa.',
              ...currentGame.log,
            ],
          }
        : currentGame,
    );
  }

  const dealingTargetIndex = getDealTargetIndex(
    Math.max(0, game.dealProgress - 1),
    game.handIndex,
  );
  const isHumanTurn = game.phase === 'playing' && game.currentTurnIndex === HUMAN_PLAYER;
  const isTrickComplete = game.phase === 'trickComplete';
  const humanAlreadySignaled =
    isHumanTurn &&
    Boolean(getPlayerSignal(game, HUMAN_PLAYER, getCurrentTrickNumber(game)));
  const isDragging = Boolean(drag);
  const activeSignalType = isDragging
    ? drag.zone && GESTURES[drag.zone]
      ? drag.zone
      : null
    : selectedCard && !humanAlreadySignaled
      ? hoverZone
      : null;
  const activeSignal = activeSignalType ? GESTURES[activeSignalType] : null;
  const isHumanCalling = game.phase === 'calling' && game.handIndex === HUMAN_PLAYER;
  const isHumanDeclaring =
    game.phase === 'declaring' && getDeclarerIndex(game) === HUMAN_PLAYER;
  const isSoloActive = game.soloistIndex !== null;
  const ledSuit = game.trickCards[0]?.card.suit;
  const trickWinnerPlay = getCurrentTrickWinner(game.trickCards);

  return (
    <main
      className={`game-shell${isHumanCalling ? ' calling-human' : ''}${
        isHumanDeclaring || soloModalOpen ? ' solo-modal-open' : ''
      }`}
    >
      {game.partnerAlert && game.partnerIndex !== null && (
        <PartnerRevealModal
          title={game.partnerAlert.title}
          caller={game.players[game.handIndex]}
          partner={game.players[game.partnerIndex]}
          callerIsHuman={game.handIndex === HUMAN_PLAYER}
          partnerIsHuman={game.partnerIndex === HUMAN_PLAYER}
          calledCard={game.calledCard}
          humanInDuo={
            game.handIndex === HUMAN_PLAYER ||
            game.partnerIndex === HUMAN_PLAYER
          }
          onClose={() =>
            setGame((currentGame) => ({ ...currentGame, partnerAlert: null }))
          }
        />
      )}

      {isSettlementOpen && game.settlement && (
        <SettlementModal
          gameOver={game.gameOver}
          onNewRound={restartGame}
          onPlayAgain={onPlayAgain}
          players={game.players}
          roundNumber={game.roundNumber}
          settlement={game.settlement}
        />
      )}

      {aiCall && (
        <AiCallModal
          card={aiCall.card}
          name={aiCall.name}
          onClose={() => setAiCall(null)}
        />
      )}

      {soloNotice && (
        <SoloAnnounceModal
          name={soloNotice.name}
          type={soloNotice.type}
          onClose={() => setSoloNotice(null)}
        />
      )}

      {isHumanDeclaring && !soloModalOpen && (
        <>
          <div className="call-backdrop solo-backdrop" aria-hidden="true" />
          <div
            className="call-overlay solo-overlay"
            role="dialog"
            aria-modal="true"
          >
            <section className="call-modal">
              <p className="eyebrow">Declaração</p>
              <h2>Jogar sozinho?</h2>
              <p>
                Você pode declarar um jogo solo (1 contra 3) ou passar para o
                jogo normal com duplas. Suas cartas seguem visíveis atrás desta
                janela.
              </p>
              <div className="solo-options">
                <button
                  className="secondary-button"
                  onClick={() => setSoloModalOpen(true)}
                  type="button"
                >
                  Jogar solo
                </button>
                <button
                  className="text-button"
                  onClick={() => declareSolo('pass')}
                  type="button"
                >
                  Passar
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {isHumanDeclaring && soloModalOpen && (
        <SoloDeclarePanel
          onDeclare={declareSolo}
          onCancel={() => setSoloModalOpen(false)}
        />
      )}

      {game.phase === 'trading' && game.soloistIndex === HUMAN_PLAYER && (
        <TradePanel
          game={game}
          onTrade={handleSoloTrade}
          onSkip={handleSkipTrade}
        />
      )}

      {game.phase === 'calling' && game.handIndex === HUMAN_PLAYER && (
        <CallPanel callOptions={callOptions} onCall={callPartnerCard} />
      )}

      {isSoloActive && (
        <div className={`solo-badge solo-badge-${game.soloType}`}>
          <span className="solo-badge-dot" aria-hidden="true" />
          Solo {game.soloType} · {game.players[game.soloistIndex].name}
        </div>
      )}

      {game.calledCard && (game.phase === 'playing' || game.phase === 'trickComplete') && (
        <div className="called-card-reminder">
          <span className="called-card-label">Chamada</span>
          <Card card={game.calledCard} compact disabled />
        </div>
      )}

      <section className="game-table" aria-label="Mesa de quatrilho">
        {speechBubble && (
          <div className={`speech-bubble ${game.players[speechBubble.playerIndex].seat}`}>
            {speechBubble.text}
          </div>
        )}

        {isTrickComplete && game.pendingTrick && (
          <div
            className={`speech-bubble shout ${
              game.players[game.pendingTrick.winnerIndex].seat
            }`}
          >
            Ganhei!
          </div>
        )}

        {game.players.map((player, playerIndex) => (
          <PlayerSeat
            key={player.name}
            player={player}
            playerIndex={playerIndex}
            game={game}
            isCurrent={game.phase === 'playing' && playerIndex === game.currentTurnIndex}
            isHuman={playerIndex === HUMAN_PLAYER}
            onCardPointerDown={handleCardPointerDown}
            draggingCardId={playerIndex === HUMAN_PLAYER && drag ? drag.card.id : null}
            selectedCardId={
              playerIndex === HUMAN_PLAYER && selectedCard
                ? selectedCard.id
                : null
            }
            validHumanCardIds={validHumanCardIds}
            visibleDealCount={getVisibleDealCount(
              game.dealProgress,
              playerIndex,
              game.handIndex,
            )}
          />
        ))}

        <section
          className={`center-table${isHumanTurn ? ' drop-ready' : ''}${
            isDragging ? ' dragging' : ''
          }`}
        >
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
                Pular distribuição
              </button>
            </div>
          )}

          {(game.phase === 'playing' ||
            game.phase === 'trickComplete' ||
            game.phase === 'finished') && (
            <div
              className={`trick-zone${
                collectingTrick && game.pendingTrick
                  ? ` collecting collect-${
                      game.players[game.pendingTrick.winnerIndex].seat
                    }`
                  : ''
              }`}
            >
              {game.trickCards.length === 0 ? (
                <p className="empty-trick">Mesa livre para a próxima vaza.</p>
              ) : (
                game.trickCards.map((play) => (
                  <TrickCard
                    key={`${play.playerIndex}-${play.card.id}`}
                    play={play}
                    player={game.players[play.playerIndex]}
                    teamClass={getTeamClass(game, play.playerIndex)}
                    isWinning={trickWinnerPlay?.card.id === play.card.id}
                    isOffSuit={Boolean(ledSuit) && play.card.suit !== ledSuit}
                  />
                ))
              )}
            </div>
          )}

          {game.phase === 'finished' && (
            <div className="result-panel">
              <h2>{getResult(game)}</h2>
              {game.soloistIndex !== null ? (
                <>
                  <p>
                    Pontos de {game.players[game.soloistIndex].name}:{' '}
                    {game.scores.callerTeam} de 35.
                  </p>
                  <p>Pontos do trio: {game.scores.opponents} de 35.</p>
                </>
              ) : (
                <>
                  <p>
                    Pontos da dupla do mão: {game.scores.callerTeam} de 35.
                  </p>
                  <p>
                    Pontos da dupla adversária: {game.scores.opponents} de 35.
                  </p>
                </>
              )}
            </div>
          )}

          {isHumanTurn && (
            <div
              className={`drop-zones${
                isDragging || selectedCard ? ' visible' : ''
              }${selectedCard && !isDragging ? ' selecting' : ''}`}
            >
              <div
                ref={(element) => {
                  dropZoneRefs.current.play = element;
                }}
                className={`drop-zone drop-zone-play${
                  drag?.zone === 'play' ? ' active' : ''
                }`}
                onClick={selectedCard ? () => confirmSelectedCard(null) : undefined}
              >
                <span className="play-icon">
                  <GestureIcon type="play" />
                </span>
                <strong>Jogar</strong>
              </div>

              <div className="signal-zones">
                {Object.entries(GESTURES).map(([gestureType, gesture]) => (
                  <div
                    key={gestureType}
                    ref={(element) => {
                      dropZoneRefs.current[gestureType] = element;
                    }}
                    className={`drop-zone drop-zone-signal${
                      drag?.zone === gestureType ? ' active' : ''
                    }${humanAlreadySignaled ? ' disabled' : ''}`}
                    style={{ '--angle': `${gesture.angle}deg` }}
                    onClick={
                      selectedCard && !humanAlreadySignaled
                        ? () => confirmSelectedCard(gestureType)
                        : undefined
                    }
                    onMouseEnter={
                      selectedCard && !humanAlreadySignaled
                        ? () => setHoverZone(gestureType)
                        : undefined
                    }
                    onMouseLeave={
                      selectedCard && !humanAlreadySignaled
                        ? () => setHoverZone((zone) =>
                            zone === gestureType ? null : zone,
                          )
                        : undefined
                    }
                  >
                    <div className="signal-label">
                      <span className="signal-icon">
                        <GestureIcon type={gestureType} />
                      </span>
                      <strong>{gesture.label}</strong>
                    </div>
                  </div>
                ))}
              </div>

              {activeSignal && (
                <div className="signal-hint" role="status">
                  <strong>{activeSignal.label}</strong>
                  <span>{activeSignal.description}</span>
                </div>
              )}
            </div>
          )}
        </section>

      </section>

      {drag && (
        <div
          className={`dragging-card${drag.zone ? ' over-zone' : ''}`}
          style={{ left: drag.x, top: drag.y }}
        >
          <Card card={drag.card} disabled />
        </div>
      )}
    </main>
  );
}

function SetupScreen({
  onStart,
  onContinue,
  hasSavedGame = false,
  savedName = '',
  initialName = '',
}) {
  const [stage, setStage] = useState(
    hasSavedGame ? 'resume' : initialName ? 'mode' : 'name',
  );
  const [name, setName] = useState(hasSavedGame ? savedName : initialName);
  const [customCoins, setCustomCoins] = useState('50');
  const [startingCoins, setStartingCoins] = useState(100);
  const [selectedBotIds, setSelectedBotIds] = useState(DEFAULT_BOT_IDS);
  const [customBots, setCustomBots] = useState([]);
  const [creatingBot, setCreatingBot] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotLines, setNewBotLines] = useState('');

  const playerName = name.trim() || 'Você';
  const parsedCoins = Number.parseInt(customCoins, 10);
  const isCustomValid = Number.isInteger(parsedCoins) && parsedCoins >= 5 && parsedCoins <= 9999;
  const availablePersonas = [...BOT_PERSONAS, ...customBots];
  const newBotLineCount = newBotLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;
  const canAddBot = newBotName.trim().length > 0 && newBotLineCount > 0;
  const canStart = selectedBotIds.length === 3;

  function handleNameSubmit(event) {
    event.preventDefault();
    setStage('mode');
  }

  function chooseCoins(coins) {
    setStartingCoins(coins);
    setStage('opponents');
  }

  function handleCustomSubmit(event) {
    event.preventDefault();

    if (isCustomValid) {
      chooseCoins(parsedCoins);
    }
  }

  function toggleBot(id) {
    setSelectedBotIds((current) => {
      if (current.includes(id)) {
        return current.filter((botId) => botId !== id);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, id];
    });
  }

  function handleAddBot(event) {
    event.preventDefault();

    const trimmedName = newBotName.trim();
    const lines = newBotLines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!trimmedName || lines.length === 0) {
      return;
    }

    const id = `custom-${Date.now()}`;
    setCustomBots((current) => [
      ...current,
      { id, name: trimmedName, description: 'Bot personalizado.', lines, custom: true },
    ]);
    setSelectedBotIds((current) =>
      current.length < 3 ? [...current, id] : current,
    );
    setNewBotName('');
    setNewBotLines('');
    setCreatingBot(false);
  }

  function handleStartGame() {
    const bots = selectedBotIds
      .map((id) => availablePersonas.find((persona) => persona.id === id))
      .filter(Boolean);

    if (bots.length !== 3) {
      return;
    }

    onStart({ name: playerName, startingCoins, bots });
  }

  return (
    <main className="setup-shell">
      <section
        className={`setup-panel${stage === 'opponents' ? ' setup-panel-wide' : ''}`}
      >
        <p className="eyebrow">Quatrilho</p>

        {stage === 'resume' && (
          <div className="setup-stage">
            <h1>Você possui uma partida em andamento</h1>
            <p>Quer continuar?</p>
            <div className="setup-options">
              <button
                className="secondary-button"
                onClick={onContinue}
                type="button"
              >
                Continuar
              </button>
              <button
                className="text-button"
                onClick={() => setStage('name')}
                type="button"
              >
                Iniciar uma nova partida
              </button>
            </div>
          </div>
        )}

        {stage === 'name' && (
          <form className="setup-stage" onSubmit={handleNameSubmit}>
            <h1>Como devemos te chamar?</h1>
            <p>Digite seu nome para começar a jogar.</p>
            {hasSavedGame && (
              <p className="setup-warning">
                Iniciar uma nova partida irá sobrepor a partida salva.
              </p>
            )}
            <input
              autoFocus
              className="setup-input"
              maxLength={20}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              type="text"
              value={name}
            />
            <button className="secondary-button" type="submit">
              Continuar
            </button>
            {hasSavedGame && (
              <button
                className="text-button"
                onClick={() => setStage('resume')}
                type="button"
              >
                Voltar
              </button>
            )}
          </form>
        )}

        {stage === 'mode' && (
          <div className="setup-stage">
            <h1>Olá, {playerName}!</h1>
            <p>Escolha como deseja jogar.</p>
            <div className="setup-options">
              <button className="setup-option" disabled type="button">
                <strong>Aprender a jogar</strong>
                <span className="setup-tag">Em breve</span>
              </button>
              <button
                className="setup-option"
                onClick={() => setStage('train')}
                type="button"
              >
                <strong>Quero treinar</strong>
                <span>Jogue uma partida completa contra a CPU.</span>
              </button>
            </div>
            <button
              className="text-button"
              onClick={() => setStage('name')}
              type="button"
            >
              Voltar
            </button>
          </div>
        )}

        {stage === 'train' && (
          <div className="setup-stage">
            <h1>Qual partida?</h1>
            <p>Defina com quantas moedas cada jogador começa.</p>
            <div className="setup-options">
              <button
                className="setup-option"
                onClick={() => chooseCoins(100)}
                type="button"
              >
                <strong>Partida normal</strong>
                <span>Todos começam com 100 moedas.</span>
              </button>
              <button
                className="setup-option"
                onClick={() => chooseCoins(20)}
                type="button"
              >
                <strong>Partida rápida</strong>
                <span>Todos começam com 20 moedas.</span>
              </button>
              <button
                className="setup-option"
                onClick={() => setStage('custom')}
                type="button"
              >
                <strong>Partida personalizada</strong>
                <span>Defina quantas moedas cada jogador terá.</span>
              </button>
            </div>
            <button
              className="text-button"
              onClick={() => setStage('mode')}
              type="button"
            >
              Voltar
            </button>
          </div>
        )}

        {stage === 'custom' && (
          <form className="setup-stage" onSubmit={handleCustomSubmit}>
            <h1>Partida personalizada</h1>
            <p>Quantas moedas cada jogador terá no início? (entre 5 e 9999)</p>
            <input
              autoFocus
              className="setup-input"
              inputMode="numeric"
              max={9999}
              min={5}
              onChange={(event) => setCustomCoins(event.target.value)}
              placeholder="Ex.: 50"
              type="number"
              value={customCoins}
            />
            <button
              className="secondary-button"
              disabled={!isCustomValid}
              type="submit"
            >
              Começar
            </button>
            <button
              className="text-button"
              onClick={() => setStage('train')}
              type="button"
            >
              Voltar
            </button>
          </form>
        )}

        {stage === 'opponents' && !creatingBot && (
          <div className="setup-stage">
            <h1>Escolha seus adversários</h1>
            <p>Selecione 3 adversários para a mesa. ({selectedBotIds.length}/3)</p>
            <div className="bot-grid">
              {availablePersonas.map((persona) => {
                const selected = selectedBotIds.includes(persona.id);
                const disabled = !selected && selectedBotIds.length >= 3;

                return (
                  <button
                    key={persona.id}
                    className={`bot-chip${selected ? ' selected' : ''}`}
                    disabled={disabled}
                    onClick={() => toggleBot(persona.id)}
                    type="button"
                  >
                    <strong>{persona.name}</strong>
                    <span>{persona.description}</span>
                    {persona.lines?.[0] && (
                      <em>&ldquo;{persona.lines[0]}&rdquo;</em>
                    )}
                  </button>
                );
              })}

              <button
                className="bot-chip bot-chip-create"
                onClick={() => setCreatingBot(true)}
                type="button"
              >
                <strong>+ Criar</strong>
                <span>Você pode personalizar as falas.</span>
                <em>&ldquo;Ex.: essa é minha vaza!&rdquo;</em>
              </button>
            </div>

            <button
              className="secondary-button"
              disabled={!canStart}
              onClick={handleStartGame}
              type="button"
            >
              Começar
            </button>
            <button
              className="text-button"
              onClick={() => setStage('train')}
              type="button"
            >
              Voltar
            </button>
          </div>
        )}

        {stage === 'opponents' && creatingBot && (
          <form className="setup-stage" onSubmit={handleAddBot}>
            <h1>Novo bot</h1>
            <p>Defina o nome e as falas do seu adversário.</p>
            <input
              autoFocus
              className="setup-input"
              maxLength={20}
              onChange={(event) => setNewBotName(event.target.value)}
              placeholder="Nome do bot"
              type="text"
              value={newBotName}
            />
            <textarea
              className="setup-input bot-lines"
              onChange={(event) => setNewBotLines(event.target.value)}
              placeholder={'Uma fala por linha. Ex.:\nVai, pai!\nEssa é nossa!'}
              rows={4}
              value={newBotLines}
            />
            <button
              className="secondary-button"
              disabled={!canAddBot}
              type="submit"
            >
              Ok ({newBotLineCount} fala{newBotLineCount === 1 ? '' : 's'})
            </button>
            <button
              className="text-button"
              onClick={() => setCreatingBot(false)}
              type="button"
            >
              Cancelar
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function App() {
  const [boot, setBoot] = useState('loading');
  const [savedGame, setSavedGame] = useState(null);
  const [config, setConfig] = useState(null);
  const [resumeGame, setResumeGame] = useState(null);
  const [returningName, setReturningName] = useState('');

  useEffect(() => {
    let active = true;

    loadSavedGame().then((record) => {
      if (!active) {
        return;
      }

      setSavedGame(record);
      setBoot('ready');
    });

    return () => {
      active = false;
    };
  }, []);

  function handleStart(newConfig) {
    setResumeGame(null);
    setConfig(newConfig);
  }

  function handleContinue() {
    if (!savedGame) {
      return;
    }

    setResumeGame(savedGame.game);
    setConfig(savedGame.config);
  }

  function handlePlayAgain() {
    clearSavedGame();
    setSavedGame(null);
    setResumeGame(null);
    setReturningName(config?.name ?? '');
    setConfig(null);
  }

  if (boot === 'loading') {
    return (
      <main className="setup-shell">
        <section className="setup-panel">
          <p className="eyebrow">Quatrilho</p>
          <p>Carregando...</p>
        </section>
      </main>
    );
  }

  if (!config) {
    return (
      <SetupScreen
        hasSavedGame={Boolean(savedGame)}
        savedName={savedGame?.config?.name ?? ''}
        initialName={returningName}
        onContinue={handleContinue}
        onStart={handleStart}
      />
    );
  }

  return (
    <GameScreen
      config={config}
      initialGame={resumeGame}
      onPlayAgain={handlePlayAgain}
    />
  );
}

export default App;
