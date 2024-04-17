const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
var uniqid = require('uniqid');
const GameService = require('../app/services/game.service.js');

// ---------------------------------------------------
// -------- CONSTANTS AND GLOBAL VARIABLES -----------
// ---------------------------------------------------

let games = [];
let queue = [];

// ---------------------------------
// -------- GAME METHODS -----------
// ---------------------------------

const newPlayerInQueue = (socket) => {
  if (queue.includes(socket)) {
    socket.emit('queue.alreadyInQueue', GameService.send.forPlayer.viewQueueState());
    return;
  }
  queue.push(socket);
  // Queue management
  if (queue.length >= 2) {
    const player1Socket = queue.shift();
    const player2Socket = queue.shift();
    createGame(player1Socket, player2Socket);
  }
  else {
    socket.emit('queue.added', GameService.send.forPlayer.viewQueueState());
  }
};

const playerLeaveQueue = (socket) => {
  queue.splice(queue.indexOf(socket), 1);
  socket.emit('queue.left', GameService.send.forPlayer.viewQueueState());
};

const playerLeaveGame = (socket) => {
  const gameIndex = GameService.utils.findGameIndexBySocketId(games, socket.id);
  if (gameIndex !== -1) {
    games[gameIndex].player1Socket.emit('game.left', GameService.send.forPlayer.viewQueueState());
    games[gameIndex].player2Socket.emit('game.left', GameService.send.forPlayer.viewQueueState());
    games.splice(gameIndex, 1);
  }
}

const createGame = (player1Socket, player2Socket) => {

  // remove players from queue
  queue.splice(queue.indexOf(player1Socket), 1);
  queue.splice(queue.indexOf(player2Socket), 1);

  const newGame = GameService.init.gameState();
  newGame['idGame'] = uniqid();
  newGame['player1Socket'] = player1Socket;
  newGame['player2Socket'] = player2Socket;

  games.push(newGame);

  const gameIndex = GameService.utils.findGameIndexById(games, newGame.idGame);

  games[gameIndex].player1Socket.emit('game.start', GameService.send.forPlayer.viewGameState('player:1', games[gameIndex]));
  games[gameIndex].player2Socket.emit('game.start', GameService.send.forPlayer.viewGameState('player:2', games[gameIndex]));

  games[gameIndex].player1Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:1', games[gameIndex].gameState));
  games[gameIndex].player2Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:2', games[gameIndex].gameState));

  // On execute une fonction toutes les secondes (1000 ms)
  const gameInterval = setInterval(() => {
    games[gameIndex].gameState.timer--;

    // Si le timer tombe à zéro
    if (games[gameIndex].gameState.timer === 0) {

      // On change de tour en inversant le clé dans 'currentTurn'
      games[gameIndex].gameState.currentTurn = games[gameIndex].gameState.currentTurn === 'player:1' ? 'player:2' : 'player:1';

      // Méthode du service qui renvoie la constante 'TURN_DURATION'
      games[gameIndex].gameState.timer = GameService.timer.getTurnDuration();

      // Reset du deck
      const deckStateInit = GameService.init.deck();
      games[gameIndex].gameState.deck = deckStateInit;
      games[gameIndex].player1Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:1', games[gameIndex].gameState));
      games[gameIndex].player2Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:2', games[gameIndex].gameState));

    }

    // On notifie finalement les clients que les données sont mises à jour.
    games[gameIndex].player1Socket.emit('game.timer', GameService.send.forPlayer.gameTimer('player:1', games[gameIndex].gameState));
    games[gameIndex].player2Socket.emit('game.timer', GameService.send.forPlayer.gameTimer('player:2', games[gameIndex].gameState));

  }, 1000);

  // Gérer les sockets pour le deck
  const handleDiceRoll = (socket) => {
    const i = GameService.utils.findGameIndexBySocketId(games, socket.id);

    const rollsCounter = games[i].gameState.deck.rollsCounter;
    const rollsMaximum = games[i].gameState.deck.rollsMaximum;

    if (rollsCounter < rollsMaximum) {
      const rolledDices = GameService.dices.roll(games[i].gameState.deck.dices);
      games[i].gameState.deck.dices = rolledDices;
      games[i].gameState.deck.rollsCounter++;
    } else {
      const rolledDices = GameService.dices.roll(games[i].gameState.deck.dices);
      games[i].gameState.deck.dices = GameService.dices.lockEveryDice(rolledDices);
      games[i].gameState.deck.rollsCounter++;
      games[i].gameState.timer = 5;
    }

    games[i].player1Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:1', games[i].gameState));
    games[i].player2Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:2', games[i].gameState));

    games[i].player1Socket.emit('game.timer', GameService.send.forPlayer.gameTimer('player:1', games[i].gameState));
    games[i].player2Socket.emit('game.timer', GameService.send.forPlayer.gameTimer('player:2', games[i].gameState));
  }

  player1Socket.on('game.dices.roll', () => {
    handleDiceRoll(player1Socket);
  });
  player2Socket.on('game.dices.roll', () => {
    handleDiceRoll(player2Socket);
  });

  const handleLockDice = (socket, diceId) => {
    const i = GameService.utils.findGameIndexBySocketId(games, socket.id);
    const diceIndex = GameService.utils.findDiceIndexByDiceId(games[i].gameState.deck.dices, diceId);

    games[i].gameState.deck.dices[diceIndex].locked = !games[i].gameState.deck.dices[diceIndex].locked;
    games[gameIndex].player1Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:1', games[i].gameState));
    games[gameIndex].player2Socket.emit('game.deck.view-state', GameService.send.forPlayer.deckViewState('player:2', games[i].gameState));
  }

  player1Socket.on('game.dices.lock', (diceId) => {
    handleLockDice(player1Socket, diceId);
  })

  player2Socket.on('game.dices.lock', (diceId) => {
    handleLockDice(player2Socket, diceId);
  })

  // On prévoit de couper l'horloge
  // pour le moment uniquement quand le socket se déconnecte
  player1Socket.on('disconnect', () => {
    clearInterval(gameInterval);
  });

  player2Socket.on('disconnect', () => {
    clearInterval(gameInterval);
  });
};

// ---------------------------------------
// -------- SOCKETS MANAGEMENT -----------
// ---------------------------------------

io.on('connection', socket => {
  console.log(`[${socket.id}] socket connected`);
  socket.on('queue.join', () => {
    console.log(`[${socket.id}] new player in queue `)
    newPlayerInQueue(socket);
  });
  socket.on('disconnect', reason => {
    console.log(`[${socket.id}] socket disconnected - ${reason}`);
    if (GameService.utils.findGameIndexBySocketId(games, socket.id) !== -1) {
      console.log(`[${socket.id}] socket disconnected from a game`)
      playerLeaveGame(socket);
    } else {
      console.log(`[${socket.id}] socket disconnected from queue`)
      playerLeaveQueue(socket);
    }
  });
});


// -----------------------------------
// -------- SERVER METHODS -----------
// -----------------------------------

app.get('/', (req, res) => res.sendFile('index.html', { root: __dirname }));

http.listen(3000, function () {
  console.log('listening on *:3000');
});
