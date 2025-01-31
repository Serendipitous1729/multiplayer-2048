const express = require("express");
const SOCKETIO = require("socket.io");
const NODE_HTTP = require("node:http");
const NODE_PATH = require("node:path");
const SEEDRANDOM = require("seedrandom");
const Match = require("./Match");

function generateRandomString(len) {
    let str = "";
    let lookup = "01234567890abcdefghijklmnopqrstuvqxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < len; i++) {
        str += lookup[Math.floor(Math.random() * lookup.length)];
    }
    return str;
}
const serverRNG = new SEEDRANDOM(generateRandomString(16));


const app = express();
const server = NODE_HTTP.createServer(app);
const io = new SOCKETIO.Server(server);

app.use(express.static(NODE_PATH.join(__dirname, "public", "static")));
app.use("/match", express.static(NODE_PATH.join(__dirname, "public", "static")));
app.use("/match/private", express.static(NODE_PATH.join(__dirname, "public", "static")));

let lastPlayerID = 0;
let lastMatchID = 0;
let publicUnfullMatches = [];
let privateUnfullMatches = {};

app.get("/", (req, res) => {
    res.sendFile(NODE_PATH.join(__dirname, "public", "index.html"));
    console.log("test-1");
});

app.get("/create-private-match", (req, res) => {
    // creating a new private match
    lastMatchID += Math.floor(Math.random() * 20) + 1;
    let match = new Match(lastMatchID, () => {
        io.to(match.room).emit("game-state-update", match.getState());
    })
    privateUnfullMatches[match.room] = match;
    res.redirect("match/" + match.room);
});
app.get("/match/", (req, res) => {
    // joining a public lobby
    res.sendFile(NODE_PATH.join(__dirname, "public", "game.html"));
});
app.get("/match/:lobby", (req, res) => {
    // joining a private match (basically they have the lobby identifier in the url)
    res.sendFile(NODE_PATH.join(__dirname, "public", "game.html"));
});

io.on("connect", (socket) => {
    socket.on("join-lobby-updates", () => {
        socket.join("lobby-updates");
        socket.emit("lobby-update", getLobbyUpdateData());
    })
    socket.on("join-lobby", (username, lobby) => {
        // add player to a match and getting some stuff
        let match, player;
        if (lobby !== null) {
            // private lobby
            if(privateUnfullMatches[lobby] === undefined) {
                socket.emit("error", "The lobby you are trying to join either doesn't exist or is already full");
                return;
            } else {
                match = privateUnfullMatches[lobby];
                player = match.add(++lastPlayerID, username);
                if (match.isFull) {
                    delete privateUnfullMatches[lobby];
                }
            }
        } else {
            // public lobby

            if (publicUnfullMatches.length == 0) {
                // create new public match
                const newMatch = new Match(++lastMatchID, () => {
                    io.to(match.room).emit("game-state-update", match.getState());
                });
                publicUnfullMatches.push(newMatch);
            }
            
            match = publicUnfullMatches[0];
            player = match.add(++lastPlayerID, username);
            if (match.isFull) {
                publicUnfullMatches.shift();
            }
        }
        socket.join(match.room);
        io.to("lobby-updates").emit("lobby-update", getLobbyUpdateData());

        // respond to player input
        socket.on("input", (inputEvent) => {
            // process input
            if (match.input(player.id, inputEvent.key)) {
                io.to(match.room).emit("game-state-update", match.getState());
            }
        });

        // respond to player leaving
        socket.on("disconnect", () => {
            console.log("user disconnected");
            // remove player
            match.remove(player.id);
            io.to(match.room).emit("game-state-update", match.getState());
        });

        // ping
        socket.on("PING", () => {
            socket.emit("PONG", Date.now());
        });

        // ok client can setup now
        socket.emit("game-state-init", player.id, match.getState());
        io.to(match.room).emit("game-state-update", match.getState());
    });
});

function getLobbyUpdateData() {
    return {
        public: publicUnfullMatches.map((match) => match.getState())
    };
}

server.listen(3000, () => {
    console.log("server running at http://localhost:3000");
});