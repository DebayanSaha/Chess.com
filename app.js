const express  = require('express');
const socket = require('socket.io');
const http = require('http');
const {Chess} = require('chess.js');
const path = require('path');

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players ={};
let currentPlayer = "w";

app.set('view engine','ejs');
app.use(express.static(path.join(__dirname,'public')));

app.get('/',(req,res)=>{
    res.render('index',{title:"Chessopedia"})
})

io.on("connection",function(uniqueSocket){
    console.log("Connected");

    if(!players.white){
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w")
    }else if (!players.black){
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b")
    }else{
        uniqueSocket.emit("Spectate")
    }

    //When one player or any player quits or disconnects, this code runs.
    uniqueSocket.on("disconnect",function(){
        if(uniqueSocket.id === players.white){
            delete players.white;
        }else if(uniqueSocket.id === players.black){
            delete players.black
        }
    })

    //When that client tries to make a chess move, this code runs.
    uniqueSocket.on("move",(move)=>{
        try {
            //Prevent random users from making moves they aren’t allowed to.
            if(chess.turn()==="W" && uniqueSocket.id!== players.white) return;
            if(chess.turn()==="B" && uniqueSocket.id!== players.black) return;

            const result = chess.move(move);

            if(result){
                currentPlayer = chess.turn(); //Update whose turn it is.
                io.emit("move",move);         //Send the move to all players.
                io.emit("boardState", chess.fen()) //Send the new board state (FEN) to all players.
            }
            //Send only that user an "invalidMove" event so they know their move was wrong.
            else{
                console.log("Invalid Move: ",move);
                uniqueSocket.emit("invalidMove",move);
            }
        }
        //If some unexpected error happens, same response — tell the user their move is invalid.
        catch (err) {
            console.log("Invalid Move: ",move);
            uniqueSocket.emit("Invalid Move: ",move);
        }
    })
})

server.listen(3000,()=>{console.log("Server is running on port: 3000")})