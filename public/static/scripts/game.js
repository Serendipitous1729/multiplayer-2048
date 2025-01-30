function throwError(msg) {
    document.body.innerHTML = `
    <p>ERROR: ${msg}</p>
    <a href="/">Go back to home</a>
    `;
}

const tileColors = { 2: "#EEE4DA", 4: "#EDE0C8", 8: "#F2B179", 16: "#F59563", 32: "#F67C5F", 64: "#F65E3B", 128: "#EDCF72", 256: "#EDCC61", 512: "#EDC850", 1024: "#EDC53F", 2048: "#EDC22E" };

const board = document.getElementById("player-board");
const opponentBoard = document.getElementById("opponent-board");
initializeBoard(board);
initializeBoard(opponentBoard);

const score = document.getElementById("player-score");
const opponentScore = document.getElementById("opponent-score");

const timerElem = document.getElementById("timer-container");

const socket = io({
    autoConnect: false
});

let username = localStorage.getItem("username");
function isUsernameInvalid(username) { 
    return (username === null || username.trim() === "" || username.trim() !== username || username.length > 20);
}
while(isUsernameInvalid(username)) {
    username = prompt("Your username is invalid, please set one!")
}

socket.on("error", (msg) => {
    throwError(msg);
});

let lobby, gameState, selfID, opponentName, pScore = 0;

// private or public lobby? if private, which lobby?
const currentAddress = location.pathname.split("/");
if(currentAddress[0] === "" && currentAddress[1] === "match"){
    lobby = currentAddress[2] === "" ? null : currentAddress[2];
} else {
    throwError("This looks like an invalid url.");
}

socket.connect();
socket.emit("join-lobby", username, lobby);

socket.on("game-state-init", (id, game) => {
    gameState = game;
    selfID = id*1; // make sure its integer

    socket.on("game-state-update", (newGameState) => { // only after initialize listen to updates
        gameState = newGameState;
        update();
    });


    updateTimer();
});

function update() {
    for (let playerID in gameState.players) {
        if (gameState && gameState.players && gameState.players[playerID] && gameState.players[playerID].game) {
            const player = gameState.players[playerID];
            if (player.id === selfID) { // im guessing playerID is a string, thats why we have to use the player.id property
                // animateTiles(board, player.game.tiles, player.game.latestMove);
                putTilesInBoard(board, player.game.tiles, player.game.latestMove);
                console.log(player.game.latestMove);
                addScoreAnimation();
            } else {
                if(opponentName === undefined) {
                    opponentName = player.username;
                    document.getElementById("opponent-name").innerText = opponentName;
                }
                putTilesInBoard(opponentBoard, player.game.tiles);
                setScore(opponentScore, "Opponent score: ", "opponent-score-value", player.game.score);
            }
        }
    }
}

function setScore(scoreElem, scorePrefix, scoreValueElemID, scoreValue) {
    let scoreValueElem = document.getElementById(scoreValueElemID);
    if (scoreValueElem) {
        scoreValueElem.innerText = scoreValue;
    } else {
        scoreValueElem = document.createElement("span");
        scoreValueElem.classList.add("score-value");
        scoreValueElem.id = scoreValueElemID;
        scoreValueElem.innerText = scoreValue;
        scoreElem.innerText = scorePrefix;
        scoreElem.append(scoreValueElem);
    }
}

function initializeBoard(boardElem) {
    for (let i = 0; i < 16; i++) {
        let cell = document.createElement("div");
        cell.id = `${boardElem.id}-${Math.floor(i / 4)}-${Math.floor(i % 4)}`;
        cell.classList.add("cell-2048")
        boardElem.appendChild(cell);
    }
}

// TODO: IMPLEMENT ANIMATED TILES!!!
function putTilesInBoard(boardElem, tiles, animate) { // animate should be the move data if you want animation
    for (let i = 0; i < tiles.length; i++) {
        for (let j = 0; j < tiles[i].length; j++) {
            const cell = document.getElementById(`${boardElem.id}-${i}-${j}`);
            //const originalPos = {x: cell.offsetLeft, y: cell.offsetHeight};
            const cellChild = cell.lastElementChild;
            if (cellChild) {
                cell.removeChild(cellChild);
            }

            const value = tiles[i][j];
            const toAnimate = !(animate === undefined);
            if (value !== 0) {
                const tile = document.createElement("div");
                tile.classList.add("tile");
                tile.id = `${boardElem.id}-tile-${i}-${j}`;
                tile.style.color = value >= 8 ? "white" : "black";
                tile.style.backgroundColor = tileColors[Math.min(value, 2048)];
                tile.innerHTML = `<span class="number">${value}</span>`;
                // tile.animate([
                //     {display: "none"},
                //     {display: "flex"}
                // ],
                // {
                //     duration: 100
                // });
                cell.append(tile);

                // if(toAnimate && animate.newTile && animate.newTile.pos && 
                //     j === animate.newTile.pos.x && i === animate.newTile.pos.y) {
                //     tile.animate([
                //         {transform: "scale(1)"},
                //         {transform: "scale(1.5)"},
                //         {transform: "scale(1)"}
                //     ], {duration: 200});
                // }
            }
            
            // cellChild.style.position = "absolute";
            // cellChild.style.left = originalPos.x;
            // cellChild.style.top = originalPos.y;
        }
    }
}

// let boardStateQueue = {};
// let canEmptyBoardStateQueueBeCalled = {};
// function putTilesInBoardAnimation(boardElem, tiles, latestMove) {
//     if (boardStateQueue[boardElem.id] === undefined) {
//         boardStateQueue[boardElem.id] = [];
//     }
//     boardStateQueue[boardElem.id].push(
//         { move: latestMove, stateAfterMove: tiles }
//     );
//     if (canEmptyBoardStateQueueBeCalled[boardElem.id] === undefined) {
//         canEmptyBoardStateQueueBeCalled[boardElem.id] = true;
//     }
//     if (canEmptyBoardStateQueueBeCalled[boardElem.id] === true) {
//         console.log("hehe");
//         emptyBoardStateQueue(boardElem, "other function");
//     } else {
//         console.log("wow!");
//     }
// }
// function emptyBoardStateQueue(boardElem, caler) {
//     console.log(caler);
//     canEmptyBoardStateQueueBeCalled[boardElem.id] = false;
//     let queue = boardStateQueue[boardElem.id];
//     const { dir, shiftedTiles } = queue[0].move;
//     if (dir) {
//         for (let i = 0; i < shiftedTiles.length; i++) {
//             for (let j = 0; j < shiftedTiles[i].length; j++) {
//                 if (shiftedTiles[i][j] !== 0) {
//                     const shiftAmt = shiftedTiles[i][j];
//                     const currentTile = document.getElementById(`${boardElem.id}-tile-${i}-${j}`)
//                     const destinationCell = document.getElementById(`${boardElem.id}-${i + dir.y * shiftAmt}-${j + dir.x * shiftAmt}`);
//                     let offset;
//                     try {
//                     offset = {
//                         x: destinationCell.offsetLeft - currentTile.offsetLeft,
//                         y: destinationCell.offsetTop - currentTile.offsetTop
//                     } } catch(e) {
//                         console.log(shiftedTiles);
//                         console.log(queue[0].stateAfterMove);
//                         console.log(dir);
//                         console.log(`i: ${i}, j: ${j}`);
//                         console.error(e);
//                     }

//                     currentTile.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
//                 }
//             }
//         }
//     }
//     window.setTimeout(() => {
//         putTilesInBoard(boardElem, queue[0].stateAfterMove);
//         queue.shift();
//         if(queue.length > 0) {
//             emptyBoardStateQueue(boardElem, "recursion");
//         } else {
//             canEmptyBoardStateQueueBeCalled[boardElem.id] = true;
//         }
//     }, 200);
// }

function addScoreAnimation() {
    const scoreValueElem = document.getElementById("player-score-value");
    if (!scoreValueElem) {
        setScore(score, "Your score: ", "player-score-value", 0);
    }
    if (gameState.players[selfID].game.score > pScore) {
        let deltaScore = gameState.players[selfID].game.score - pScore;
        pScore = gameState.players[selfID].game.score;

        let floatingNumber = document.createElement("span");
        floatingNumber.innerText = `+${deltaScore}`;
        floatingNumber.classList.add("increased-score");
        floatingNumber.style.left = scoreValueElem.offsetLeft + "px";
        floatingNumber.style.top = scoreValueElem.offsetTop + "px";

        let scoreSpawnAngle = -Math.PI / 2;
        const scoreSpawnRadius = 50;
        floatingNumber.style.transform = `translate(${scoreSpawnRadius * Math.cos(scoreSpawnAngle)}px, ${scoreSpawnRadius * Math.sin(scoreSpawnAngle)}px)`;
        window.requestAnimationFrame(() => floatingNumber.style.transform = `translate(0px, 0px)`);
        document.body.append(floatingNumber);
        window.setTimeout(() => {
            document.body.removeChild(floatingNumber);
            scoreValueElem.style.transitionDuration = "0ms";
            scoreValueElem.style.transform = `scale(1.5)`;
            setScore(score, "Your score: ", "player-score-value", pScore);
            window.requestAnimationFrame(() => {
                scoreValueElem.style.transitionDuration = "100ms";
                scoreValueElem.style.transform = `scale(1)`;
            });
        }, 200);
    }
}

function setTimerInnerHTML(timerElem, gameState) {
    if (!gameState.started) {
        let ellipsis = new Array(new Date().getSeconds() % 3);
        ellipsis.fill(".");
        timerElem.innerHTML = `Waiting for players.${ellipsis.join("")}`;
        return true;
    }

    if (gameState.winnersIDs === null) {
        let timeRemaining = gameState.duration + gameState.startTimestamp - Date.now();

        timerElem.innerHTML = `
        <div id="timer">
        ${Math.floor(timeRemaining / 60000) % 60} : ${(Math.floor(timeRemaining / 1000) % 60).toString().padStart(2, "0")} . ${(timeRemaining % 1000).toString().padEnd(3, "0")}
        </div>
        `;
        return true;
    }

    if (gameState.winnersIDs.length > 0) {
        if (gameState.winnersIDs.length > 1) {
            let winners = gameState.winnersIDs.map(id => gameState.players[id].username);
            timerElem.innerText = `It's a tie! Between ${winners.join(",")}`;
            return false;
        } else {
            let winnerID = gameState.winnersIDs[0] * 1; // make sure its integer
            if (winnerID === selfID) {
                timerElem.innerText = `YOU WIN!!!`;
                return false;
            } else {
                timerElem.innerText = `Game over - ${gameState.players[winnerID].username} won!`;
                return false;
            }
        }
    }

    timerElem.innerHTML = `uhh something went very wrong sorry`;
    return false;
}

function updateTimer() {
    if (setTimerInnerHTML(timerElem, gameState)) window.requestAnimationFrame(updateTimer);
}

// send input events
function emitKeyboardEvent(e) {
    if (!e.ctrlKey) e.preventDefault();
    let inputChangeObject = {
        type: e.type,
        key: e.key.toLowerCase()
    };
    socket.emit("input", inputChangeObject);
}
document.addEventListener("keydown", emitKeyboardEvent);

// measuring ping
let pingStart;
window.ping = function () {
    pingStart = Date.now();
    socket.emit("PING");
}
socket.on("PONG", function (serverTime) {
    console.log(Date.now() - pingStart + " milliseconds for a 2-way trip");
    console.log(Date.now() - serverTime + " ms for server-to-client");
});