const { on } = require("events");
const SEEDRANDOM = require("seedrandom");

class Game {
    tilesArray;
    prng;
    fourTileProbability = 0.1;
    numTiles = 0;
    score = 0;
    isOver = false;
    onOver;
    latestMove;

    constructor(randomSeed, onOver) {
        this.tilesArray = this.empty4x4Array();
        this.prng = new SEEDRANDOM(randomSeed);
        this.onOver = onOver;

        this.latestMove = {
            newTile: this.addRandomTile(),
            shifted: this.empty4x4Array(),
            merged: this.empty4x4Array(),
            score: 0,
            gameOver: false
        };
    }

    empty4x4Array() {
        let arr = [];
        for (let i = 0; i < 4; i++) {
            arr[i] = [0, 0, 0, 0];
        }
        return arr;
    }

    getTileInRow(dir, row, index, arr = this.tilesArray) {
        if (index < 0 || index > 3) return -1;

        let iStartIndex = dir.y == 0 ? row : (dir.y == -1 ? 3 : 0);
        let jStartIndex = dir.x == 0 ? row : (dir.x == -1 ? 3 : 0);

        return arr[iStartIndex + dir.y * index][jStartIndex + dir.x * index];
    }
    setTileInRow(dir, row, index, value, arr = this.tilesArray) {
        if (index > 3 || index < 0) return false;

        let iStartIndex = dir.y == 0 ? row : (dir.y == -1 ? 3 : 0);
        let jStartIndex = dir.x == 0 ? row : (dir.x == -1 ? 3 : 0);
        arr[iStartIndex + dir.y * index][jStartIndex + dir.x * index] = value;

        return true;
    }

    slideTiles(dir) {
        // slide stuff around
        // and return the shifted tiles - by how much each tile moved
        let shiftedTiles = this.empty4x4Array();
        // also the tiles that merged
        let mergedTiles = this.empty4x4Array();

        for (let row = 0; row < 4; row++) {
            let earliestOccupiedIndex = 4; // not even in the array, so it should return undefined
            // anyways, earliestOccupiedIndex-1 is the index a tile would normally slide to
            // or it would slide to earliestOccupiedIndex and double, if theyre equal
            for (let i = 3; i >= 0; i--) {
                if (this.getTileInRow(dir, row, i) !== 0) {
                    let currentTileValue = this.getTileInRow(dir, row, i);
                    let nextTileValue = this.getTileInRow(dir, row, earliestOccupiedIndex);
                    this.setTileInRow(dir, row, i, 0);// make the current space the tile occupies empty
                    if (currentTileValue == nextTileValue) {
                        this.setTileInRow(dir, row, earliestOccupiedIndex, currentTileValue + nextTileValue); // smash it into the other tile! (it doubles)
                        this.score += currentTileValue + nextTileValue;
                        this.numTiles--;

                        this.setTileInRow(dir, row, i, earliestOccupiedIndex - i, shiftedTiles); // at the corresponding location in shiftedTiles, set how much the tile moved
                        this.setTileInRow(dir, row, i, 1, mergedTiles); // also the tiles that merged
                        this.setTileInRow(dir, row, earliestOccupiedIndex, 1, mergedTiles);
                    } else {
                        this.setTileInRow(dir, row, earliestOccupiedIndex - 1, currentTileValue); // slide it over to the last slot in which you can push a tile

                        earliestOccupiedIndex--; // update the location of the last slot in which you can push a tile
                        this.setTileInRow(dir, row, i, earliestOccupiedIndex - i, shiftedTiles); // at the corresponding location in shiftedTiles, set how much the tile moved
                    }
                }
            }
        }

        return { shifted: shiftedTiles, merged: mergedTiles };
    }

    testIfMoveable(dir) {
        let tilesCopy = JSON.parse(JSON.stringify(this.tilesArray));
        let tilesCopyStr = tilesCopy.join("_");
        for (let row = 0; row < 4; row++) {
            let earliestOccupiedIndex = 4;
            for (let i = 3; i >= 0; i--) {
                if (this.getTileInRow(dir, row, i) !== 0) {
                    let currentTileValue = this.getTileInRow(dir, row, i, tilesCopy);
                    let nextTileValue = this.getTileInRow(dir, row, earliestOccupiedIndex, tilesCopy);
                    this.setTileInRow(dir, row, i, 0, tilesCopy);// make the current space the tile occupies empty
                    if (currentTileValue == nextTileValue) {
                        this.setTileInRow(dir, row, earliestOccupiedIndex, currentTileValue + nextTileValue, tilesCopy); // smash it into the other tile! (it doubles)
                    } else {
                        this.setTileInRow(dir, row, earliestOccupiedIndex - 1, currentTileValue, tilesCopy); // slide it over to the last slot in which you can push a tile
                        earliestOccupiedIndex--; // update the location of the last slot in which you can push a tile
                    }
                }
            }
        }
        return !(tilesCopyStr === tilesCopy.join("_"));
    }

    addRandomTile() {
        if (this.numTiles >= 16) {
            return { canAdd: false };
        }

        let tileIndex = Math.floor(this.prng() * (16 - this.numTiles));
        let addFourTile = Math.floor(this.prng() / this.fourTileProbability) == 0;

        let newTileValue = addFourTile ? 4 : 2;
        let newTilePos;

        let tileCounter = 0;
        for (let i = 0; i < 4; i++) {
            let breakLoop = false;
            for (let j = 0; j < 4; j++) {
                if (this.tilesArray[i][j] == 0) {
                    if (tileCounter == tileIndex) {
                        newTilePos = { x: j, y: i };
                        breakLoop = true;
                        break;
                    }
                    tileCounter++;
                }
            }
            if (breakLoop) break;
        }

        this.tilesArray[newTilePos.y][newTilePos.x] = newTileValue;
        this.numTiles++;

        return { canAdd: true, pos: newTilePos, value: newTileValue };
    }

    checkIfBoardClogged() {
        if (this.numTiles >= 16) {
            // is the board clogged?
            let dirI = { x: 0, y: 1 }, dirJ = { x: 1, y: 0 }, dirNI = { x: 0, y: -1 }, dirNJ = { x: -1, y: 0 };
            return !this.testIfMoveable(dirI) && !this.testIfMoveable(dirJ) && !this.testIfMoveable(dirNI) && !this.testIfMoveable(dirNJ);
        } else {
            return false;
        }
    }

    endGame() {
        this.isOver = true;
        this.onOver();
        return false;
    }

    input(key) {
        if (this.isOver) return false; // game is already over

        let mapKeyToNum = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];
        let keyNum = mapKeyToNum.indexOf(key) % 4;
        if (keyNum == -1) return false; // invalid input
        let mapKeyNumToDir = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }]
        let dir = mapKeyNumToDir[keyNum];

        if (!this.testIfMoveable(dir)) return false; // input isn't going to do anything

        let slideResult = this.slideTiles(dir);
        let addResult = this.addRandomTile();

        if (this.checkIfBoardClogged()) { // the last move of the game
            this.endGame();
            this.latestMove = {
                dir: dir,
                newTile: addResult,
                shiftedTiles: slideResult.shifted,
                mergedTiles: slideResult.merged,
                score: this.score,
                gameOver: true
            }
        } else { // just any move of the game
            this.latestMove = {
                dir: dir,
                newTile: addResult,
                shiftedTiles: slideResult.shifted,
                mergedTiles: slideResult.merged,
                score: this.score,
                gameOver: false
            }
        }

        return true;
    }
}

module.exports = Game;