const Game = require("./Game");

const RANDOM_STRING_LENGTH = 32;
function generateRandomString() {
    let str = "";
    let lookup = "01234567890abcdefghijklmnopqrstuvqxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < RANDOM_STRING_LENGTH; i++) {
        str += lookup[Math.floor(Math.random() * lookup.length)];
    }
    return str;
}

class Match {
    maxPlayers = 2;
    duration = 5 * 60 * 1000;

    players = {};
    randomSeed;
    room;
    startTimestamp = null;
    isStarted = false;
    isOver = false;
    onOver;

    get numPlayers() {
        return Object.keys(this.players).length;
    }

    get isFull() {
        return this.numPlayers >= this.maxPlayers;
    }

    get remainingTime() {
        if (this.startTimestamp)
            return this.duration - (Date.now() - this.startTimestamp);
        else
            return null;
    }

    get winners() {
        if(!this.isStarted) return null; // bruh we havent even started yet
        if (this.numPlayers == 1) {
            // everyone left, so last guy wins!
            this.isOver = true;
            return [Object.keys(this.players)[0]]; // can be multiple winners sometimes, so an array for consistency
        }

        let highestScorersIDs = []; // can be more than 1 who got the same (highest) score
        let alivePlayerIDs = []; // everyone whose game isn't over

        for (let player in this.players) {
            if (highestScorersIDs.length == 0) {
                highestScorersIDs = [this.players[player].id];
            }
            else if (this.players[player].game.score > this.players[highestScorersIDs[0]].game.score) {
                highestScorersIDs = [this.players[player].id];
            }
            else if (this.players[player].game.score === this.players[highestScorersIDs[0]].game.score) {
                highestScorersIDs.push(this.players[player].id);
            }
            if (!this.players[player].game.isOver) alivePlayerIDs.push(this.players[player].id);
        }

        if (this.remainingTime <= 0 || // times up, so find winner
            alivePlayerIDs.length == 0 || // everyone gameovered
            (alivePlayerIDs.length == 1 && highestScorersIDs.length == 1 && highestScorersIDs[0] === alivePlayerIDs[0]) // only one guy left, and he already has the highest score
        ) {
            this.isOver = true;
            return highestScorersIDs;
        }

        return null; // no winner yet - keep playing!
    }


    constructor(matchID, onOver) {
        this.randomSeed = generateRandomString(); // same for all players
        this.room = "match-" + matchID;
        this.onOver = onOver;
    }

    add(playerID, playerName) {
        if (this.isFull) {
            return false;
        } else {
            let player = new Player(playerID, playerName, this.randomSeed, this.onOver);
            this.players[playerID] = player;

            if (this.isFull) {
                this.startTimestamp = Date.now();
                this.isStarted = true;
                setTimeout(() => {
                    this.isOver = true;
                    this.onOver();
                }, this.duration)
            }

            return player;
        }
    }

    remove(playerID) {
        if (this.numPlayers == 0) return;
        let removed = this.players[playerID];
        removed.game.endGame();
        if (removed == undefined) return false;

        delete this.players[playerID];

        return removed;
    }

    getState() {

        let state = {
            started: this.isStarted,
            players: {},
            startTimestamp: this.startTimestamp,
            remainingTime: this.remainingTime,
            winnersIDs: this.winners,
            duration: this.duration
        };

        for (let player in this.players) {
            let playerState = this.players[player].getState();
            state.players[playerState.id] = playerState;
        }

        return state;
    }

    input(playerID, key) {
        if (!this.isStarted || this.isOver) return false;
        this.players[playerID].game.input(key);
        return true;
    }
}

class Player {
    id
    username;
    game;

    constructor(id, username, randomSeed, onOver) {
        this.id = id;
        this.username = username;
        this.game = new Game(randomSeed, onOver);
    }

    getState() {
        return {
            id: this.id,
            username: this.username,
            game: {
                tiles: this.game.tilesArray,
                numTiles: this.game.numTiles,
                score: this.game.score,
                latestMove: this.game.latestMove,
                isOver: this.game.isOver
            }
        };
    }
}

module.exports = Match;