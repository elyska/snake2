const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const {createGameState, gameLoop, getUpdatedVelocity, initGame} = require('./game');
const {FRAME_RATE} = require('./constants');
const {makeid} = require('./utils');

const state = {};
const clientRooms = {};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

/*
io.on('connection', (socket) => {
    console.log('a user connected');
});
*/

io.on('connection', client => {
    client.on('keydown', handleKeydown);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);

    function handleJoinGame(roomName){
        console.log(roomName);
        const room = io.sockets.adapter.rooms.get(roomName);
        console.log(io.sockets.adapter.rooms);
        //console.log(room.size);
        /*
        let allUsers;
        if (room) {
            allUsers = room.sockets;
            console.log(allUsers);
        }*/
        let numClients = 0;
        if (room) {
            numClients = room.size;

        }
        console.log(numClients);
/*
        let numClients = 0;
        if (allUsers) {
            numClients = Object.keys(allUsers).length;
            console.log(numClients);
        }
*/
        if (numClients === 0) {
            client.emit('unknownCode');
            return;
        } else if (numClients > 1) {
            client.emit('tooManyPlayers');
            return;
        }


        clientRooms[client.id] = roomName;

        client.join(roomName);
        client.number = 2;
        client.emit('init', 2);

        startGameInterval(roomName);
    }

    function handleNewGame(){
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame();

        client.join(roomName);
        client.number = 1;
        client.emit('init', 1);
    }

    function handleKeydown(keyCode){
        const roomName = clientRooms[client.id];

        if(!roomName){
            return;
        }

        try{
            keyCode = parseInt(keyCode);
        }
        catch (e){
            console.error(e);
            return;
        }

        const vel = getUpdatedVelocity(keyCode);

        if(vel){
            state[roomName].players[client.number-1].vel = vel;
        }
    }

});



function startGameInterval(roomName){
    const intervalId = setInterval(() => {
        const winner = gameLoop(state[roomName]);

        if(!winner){
            emitGameState(roomName, state[roomName]);
        }
        else{
            emitGameOver(roomName, winner);
            state[roomName] = null;
            clearInterval(intervalId);
        }
    }, 1000/FRAME_RATE);
}

function emitGameOver(roomName, winner){
    io.sockets.in(roomName).emit('gameOver', JSON.stringify({winner}));
}

function emitGameState(roomName, state){
    io.sockets.in(roomName).emit('gameState', JSON.stringify(state));
}


server.listen(3000, () => {
    console.log('listening on *:3000');
});
