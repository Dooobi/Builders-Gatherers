/*jslint bitwise: true, node: true */
'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var SAT = require('sat');

// Import game settings.
var c = require('../../config.json');

// Import utilities.
var util = require('./lib/util');

// Import quadtree.
var quadtree = require('simple-quadtree');

var tree = quadtree(0, 0, c.gameWidth, c.gameHeight);

var currentId = 0;
var aPlayers = [];
var aSockets = [];

var V = SAT.Vector;
var C = SAT.Circle;

app.use(express.static(__dirname + '/../client'));
app.listen(3000); 

function moveCharacter(character) {
	character.x += (Math.random() - 0.5) * 2;
	character.y += (Math.random() - 0.5) * 2;
}

io.on('connection', function (socket) {
    console.log('A user connected!');

    var name = socket.handshake.query.name;
	console.log("Users name is: " + name);
	
    var position = {
		x: c.gameWidth / 2,
		y: c.gameHeight / 2
	};
	
	var oCurrentPlayer = {
		id: aPlayers.length,
		name: name,
		camX: position.x,
		camY: position.y,
		playerType: 'player',
		character: {
			x: position.x,
			y: position.y,
			angle: 0,
			health: 100,
			animation: {
				id: "idle",
				progress: 0
			}
		},
		screenWidth: 1,
		screenHeight: 1,
		lastHeartbeat: new Date().getTime()
	};
	currentId += 1;		// TODO: change id generation
	
	socket.on('requestStart', function () {
		console.log("requestStart");
		console.log("Socket: " + socket.id);
		
		if (util.findIndex(aPlayers, oCurrentPlayer.id) > -1) {
            console.log('[INFO] Player ID is already connected, kicking.');
            socket.disconnect();
        } else if (!util.validNick(oCurrentPlayer.name)) {
            socket.emit('kick', 'Invalid username.');
            socket.disconnect();
        } else {
            console.log('[INFO] Player ' + oCurrentPlayer.name + ' connected!');
			
            oCurrentPlayer.lastHeartbeat = new Date().getTime();
			console.log("oCurrentPlayer.id: " + oCurrentPlayer.id);
            aPlayers[oCurrentPlayer.id] = oCurrentPlayer;
			aSockets[oCurrentPlayer.id] = socket;

            // io.emit('oCurrentPlayerJoin', { name: oCurrentPlayer.name });

            socket.emit('startGame', {
                gameWidth: c.gameWidth,
                gameHeight: c.gameHeight
            },
			oCurrentPlayer);
			
            console.log('Total aPlayers: ' + aPlayers.length);
        }
	});

    socket.on('windowResized', function (data) {
		console.log("windowResized");
        oCurrentPlayer.screenWidth = data.screenWidth;
        oCurrentPlayer.screenHeight = data.screenHeight;
    });

    socket.on('respawn', function () {
		console.log("respawn");
        if (util.findIndex(aPlayers, oCurrentPlayer.id) > -1)
            aPlayers.splice(util.findIndex(aPlayers, oCurrentPlayer.id), 1);
        socket.emit('welcome', oCurrentPlayer);
        console.log('[INFO] User ' + oCurrentPlayer.name + ' respawned!');
    });

    socket.on('disconnect', function () {
		console.log("disconnect");
        if (util.findIndex(aPlayers, oCurrentPlayer.id) > -1)
            aPlayers.splice(util.findIndex(aPlayers, oCurrentPlayer.id), 1);
        console.log('[INFO] User ' + oCurrentPlayer.name + ' disconnected!');

        socket.broadcast.emit('playerDisconnect', { name: oCurrentPlayer.name });
    });

    // Heartbeat function, update everytime.
    socket.on('0', function(target) {
        oCurrentPlayer.lastHeartbeat = new Date().getTime();
    });

});

function tickPlayer(oCurrentPlayer) {
    if(oCurrentPlayer.lastHeartbeat < new Date().getTime() - c.maxHeartbeatInterval) {
        aSockets[oCurrentPlayer.id].emit('kick', 'Last heartbeat received over ' + c.maxHeartbeatInterval + ' ago.');
        aSockets[oCurrentPlayer.id].disconnect();
    }
	var playerCircle = new C(new V(oCurrentPlayer.character.x, oCurrentPlayer.character.y), oCurrentPlayer.character.radius);
	
    moveCharacter(oCurrentPlayer.character);

    function check(oPlayer) {
		if(oPlayer.id !== oCurrentPlayer.id) {
			var response = new SAT.Response();
			var collided = SAT.testCircleCircle(playerCircle,
				new C(new V(oPlayer.character.x, oPlayer.character.y), oPlayer.character.radius),
				response);
			if (collided) {
				response.aUser = oCurrentPlayer.character;
				response.bUser = {
					id: oPlayer.id,
					name: oPlayer.name,
					x: oPlayer.character.x,
					y: oPlayer.character.y,
//					num: i
				};
				playerCollisions.push(response);
			}
		}
        return true;
    }

    function collisionCheck(collision) {
		/*
        if (collision.aUser.mass > collision.bUser.mass * 1.1  && collision.aUser.radius > Math.sqrt(Math.pow(collision.aUser.x - collision.bUser.x, 2) + Math.pow(collision.aUser.y - collision.bUser.y, 2))*1.75) {
            console.log('[DEBUG] Killing user: ' + collision.bUser.id);
            console.log('[DEBUG] Collision info:');
            console.log(collision);

            var numUser = util.findIndex(aPlayers, collision.bUser.id);
            if (numUser > -1) {
                if(aPlayers[numUser].cells.length > 1) {
                    aPlayers[numUser].massTotal -= collision.bUser.mass;
                    aPlayers[numUser].cells.splice(collision.bUser.num, 1);
                } else {
                    aPlayers.splice(numUser, 1);
                    io.emit('playerDied', { name: collision.bUser.name });
                    aSockets[collision.bUser.id].emit('RIP');
                }
            }
            oCurrentPlayer.massTotal += collision.bUser.mass;
            collision.aUser.mass += collision.bUser.mass;
        }
		*/
    }

    
	tree.clear();
	aPlayers.forEach(tree.put);
	var playerCollisions = [];

	var otherPlayers = tree.get(oCurrentPlayer, check);

	playerCollisions.forEach(collisionCheck);
}

function moveloop() {
    for (var i = 0; i < aPlayers.length; i++) {
        tickPlayer(aPlayers[i]);
    }
}

function gameloop() {
    if (aPlayers.length > 0) {
        // aPlayers.sort( function(a, b) { return b.massTotal - a.massTotal; });

		/* LOSE MASS
        for (i = 0; i < aPlayers.length; i++) {
            for(var z=0; z < aPlayers[i].cells.length; z++) {
                if (aPlayers[i].cells[z].mass * (1 - (c.massLossRate / 1000)) > c.defaultPlayerMass && aPlayers[i].massTotal > c.minMassLoss) {
                    var massLoss = aPlayers[i].cells[z].mass * (1 - (c.massLossRate / 1000));
                    aPlayers[i].massTotal -= aPlayers[i].cells[z].mass - massLoss;
                    aPlayers[i].cells[z].mass = massLoss;
                }
            }
        }
		*/
    }
}

function sendUpdates() {
	var visiblePlayers = [];
    aPlayers.forEach( function(u) {
        // center the view if x/y is undefined, this will happen for spectators
        u.x = u.x || c.gameWidth / 2;
        u.y = u.y || c.gameHeight / 2;

		var visiblePlayers = aPlayers.map(function(player) {
			return player;
		});
		
		/*
        var visibleCells = aPlayers
            .map(function(f) {
                for(var z=0; z<f.cells.length; z++)
                {
                    if ( f.cells[z].x+f.cells[z].radius > u.x - u.screenWidth/2 - 20 &&
                        f.cells[z].x-f.cells[z].radius < u.x + u.screenWidth/2 + 20 &&
                        f.cells[z].y+f.cells[z].radius > u.y - u.screenHeight/2 - 20 &&
                        f.cells[z].y-f.cells[z].radius < u.y + u.screenHeight/2 + 20) {
                        z = f.cells.lenth;
                        if(f.id !== u.id) {
                            return {
                                id: f.id,
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                                name: f.name
                            };
                        } else {
                            //console.log("Nombre: " + f.name + " Es Usuario");
                            return {
                                x: f.x,
                                y: f.y,
                                cells: f.cells,
                                massTotal: Math.round(f.massTotal),
                                hue: f.hue,
                            };
                        }
                    }
                }
            })
            .filter(function(f) { return f; });
		*/
		
        aSockets[u.id].emit('serverTellPlayerMove', aPlayers[0], visiblePlayers);
    });
}

setInterval(moveloop, 1000 / 60);
setInterval(gameloop, 1000);
setInterval(sendUpdates, 1000 / c.networkUpdateFactor);

// Don't touch, IP configurations.
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '127.0.0.1';
var serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || c.port;
if (process.env.OPENSHIFT_NODEJS_IP !== undefined) {
    http.listen( serverport, ipaddress, function() {
        console.log('[DEBUG] Listening on localhost:' + serverport);
    });
} else {
    http.listen( serverport, function() {
        console.log('[DEBUG] Listening on 127.0.0.1:' + c.port);
    });
}
