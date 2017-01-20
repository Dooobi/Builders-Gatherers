var io = require('socket.io-client');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');
var animator = require('./animator');

var playerNameInput = document.getElementById('playerNameInput');
var socket;
var reason;
var startTime;
var time;
var dt;

var debug = function(args) {
    if (console && console.log) {
        console.log(args);
    }
};

if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
    global.mobile = true;
}

function requestStart(name) {
	global.playerType = 'player';
	if (!socket) {
        socket = io({query:"name=" + name});
        setupSocket(socket);
    }
    socket.emit('requestStart');
}

function startGame(playerData) {
	player = playerData;
    global.player = playerData;

    global.screenWidth = window.innerWidth;
    global.screenHeight = window.innerHeight;

    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;

	global.gameRunning = true;
    if (!global.animLoopHandle) {
		startTime = new Date().getTime();
        animloop();
	}
//    socket.emit('respawn');
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick(name) {
    var regex = /^\w*$/;
    debug('Regex Test', regex.exec(name));
    return regex.exec(name) !== null;
}

window.onload = function() {

    var btn = document.getElementById('startButton'),
        nickErrorText = document.querySelector('#startMenu .input-error');

    btn.onclick = function () {
		var name = playerNameInput.value;
		
        // Checks if the nick is valid.
        if (validNick(name)) {
            nickErrorText.style.opacity = 0;
            requestStart(name);
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    var settingsMenu = document.getElementById('settingsButton');
    var settings = document.getElementById('settings');
    var instructions = document.getElementById('instructions');

    settingsMenu.onclick = function () {
        if (settings.style.maxHeight == '300px') {
            settings.style.maxHeight = '0px';
        } else {
            settings.style.maxHeight = '300px';
        }
    };

    playerNameInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;
		var name = playerNameInput.value;
		
        if (key === global.KEY_ENTER) {
            if (validNick(name)) {
                nickErrorText.style.opacity = 0;
                requestStart(name);
            } else {
                nickErrorText.style.opacity = 1;
            }
        }
    });
	
	animator.createAnimation("1");
	animator.addLine("1", 25, 50, -25, 50);
//	animator.addCurve("1", 1, 2, 2, 180, 270);
	animator.addLine("1", -25, 50, -25, -50);
	animator.addLine("1", -25, -50, 25, 50);
};

// TODO: Break out into GameControls.

var foodConfig = {
    border: 0,
};

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screenWidth / 2,
    y: global.screenHeight / 2,
    screenWidth: global.screenWidth,
    screenHeight: global.screenHeight,
    target: {x: global.screenWidth / 2, y: global.screenHeight / 2}
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var aPlayers = [];
var leaderboard = [];
var target = {x: player.x, y: player.y};
global.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

var visibleBorderSetting = document.getElementById('visBord');
visibleBorderSetting.onchange = settings.toggleBorder;

var showMassSetting = document.getElementById('showMass');
showMassSetting.onchange = settings.toggleMass;

var continuitySetting = document.getElementById('continuity');
continuitySetting.onchange = settings.toggleContinuity;

var roundFoodSetting = document.getElementById('roundFood');
roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.cv;
var graph = c.getContext('2d');

$( "#feed" ).click(function() {
    socket.emit('1');
    window.canvas.reenviar = false;
});

$( "#split" ).click(function() {
    socket.emit('2');
    window.canvas.reenviar = false;
});

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on('pongcheck', function () {
		console.log("pongcheck");
        var latency = Date.now() - global.startPingTime;
        debug('Latency: ' + latency + 'ms');
        window.chat.addSystemLine('Ping: ' + latency + 'ms');
    });

    // Handle error.
    socket.on('connect_failed', function () {
		console.log("connect_failed");
        socket.close();
        global.disconnected = true;
    });

    socket.on('disconnect', function () {
		console.log("disconnect");
        socket.close();
        global.disconnected = true;
    });

    // Handle connection.
    socket.on('welcome', function (playerSettings) {
		console.log("welcome");
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screenWidth;
        player.screenHeight = global.screenHeight;
        player.target = window.canvas.target;
        global.player = player;
        window.chat.player = player;
        socket.emit('gotit', player);
        global.gameRunning = true;
        debug('Game started at: ' + global.gameRunning);
        window.chat.addSystemLine('Connected to the game!');
        window.chat.addSystemLine('Type <b>-help</b> for a list of commands.');
        if (global.mobile) {
            document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
        }
		c.focus();
    });

    socket.on('startGame', function(gameData, playerData) {
		console.log("socket.on('startGame')");
		
        global.gameWidth = gameData.gameWidth;
        global.gameHeight = gameData.gameHeight;
        resize();
		startGame(playerData);
    });

    socket.on('playerDied', function (data) {
		console.log("playerDied");
        window.chat.addSystemLine('{GAME} - <b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> was eaten.');
    });

    socket.on('playerDisconnect', function (data) {
		console.log("playerDisconnect");
        window.chat.addSystemLine('{GAME} - <b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> disconnected.');
    });

    socket.on('playerJoin', function (data) {
		console.log("playerJoin");
        window.chat.addSystemLine('{GAME} - <b>' + (data.name.length < 1 ? 'An unnamed cell' : data.name) + '</b> joined.');
    });

    socket.on('leaderboard', function (data) {
		console.log("leaderboard");
        leaderboard = data.leaderboard;
        var status = '<span class="title">Leaderboard</span>';
        for (var i = 0; i < leaderboard.length; i++) {
            status += '<br />';
            if (leaderboard[i].id == player.id){
                if(leaderboard[i].name.length !== 0)
                    status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
                else
                    status += '<span class="me">' + (i + 1) + ". An unnamed cell</span>";
            } else {
                if(leaderboard[i].name.length !== 0)
                    status += (i + 1) + '. ' + leaderboard[i].name;
                else
                    status += (i + 1) + '. An unnamed cell';
            }
        }
        //status += '<br />Players: ' + data.players;
        document.getElementById('status').innerHTML = status;
    });

    socket.on('serverMSG', function (data) {
		console.log("serverMSG");
        window.chat.addSystemLine(data);
    });

    // Chat.
    socket.on('serverSendPlayerChat', function (data) {
		console.log("serverSendPlayerChat");
        window.chat.addChatLine(data.sender, data.message, false);
    });

    // Handle movement.
    socket.on('serverTellPlayerMove', function (myPlayer, aPlayerData) {
		console.log("serverTellPlayerMove");
		
        if(global.playerType == 'player') {
            var xoffset = player.character.x - myPlayer.character.x;
            var yoffset = player.character.y - myPlayer.character.y;

            player.character.x = myPlayer.character.x;
            player.character.y = myPlayer.character.y;
            player.character.xoffset = isNaN(xoffset) ? 0 : xoffset;
            player.character.yoffset = isNaN(yoffset) ? 0 : yoffset;
        }
        aPlayers = aPlayerData;
    });

    // Death.
    socket.on('RIP', function () {
		console.log("RIP");
        global.gameRunning = false;
        global.died = true;
        window.setTimeout(function() {
            document.getElementById('gameAreaWrapper').style.opacity = 0;
            document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            global.died = false;
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
    });

    socket.on('kick', function (data) {
		console.log("kick");
        global.gameRunning = false;
        reason = data;
        global.kicked = true;
        socket.close();
    });

}

function drawCircle(centerX, centerY, radius, sides) {
    var theta = 0;
    var x = 0;
    var y = 0;

    graph.beginPath();

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        graph.lineTo(x, y);
    }

    graph.closePath();
    graph.stroke();
    graph.fill();
}

function drawFood(food) {
    graph.strokeStyle = 'hsl(' + food.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + food.hue + ', 100%, 50%)';
    graph.lineWidth = foodConfig.border;
    drawCircle(food.x - player.x + global.screenWidth / 2,
               food.y - player.y + global.screenHeight / 2,
               food.radius, global.foodSides);
}

function drawVirus(virus) {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth;
    drawCircle(virus.x - player.x + global.screenWidth / 2,
               virus.y - player.y + global.screenHeight / 2,
               virus.radius, global.virusSides);
}

function drawFireFood(mass) {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = playerConfig.border+10;
    drawCircle(mass.x - player.x + global.screenWidth / 2,
               mass.y - player.y + global.screenHeight / 2,
               mass.radius-5, 18 + (~~(mass.masa/5)));
}

function drawPlayer(oPlayer) {
	var oCharacter = oPlayer.character;
	var start = {
        x: oPlayer.x - (global.screenWidth / 2),
        y: oPlayer.y - (global.screenHeight / 2)
    };
	var x = oCharacter.x - start.x,
		y = oCharacter.y - start.y,
		animHeight = 10,
		animCycleTime = 1000,
		radius = 23,
		sides = 20,
		eyeDist = 3,
		handDist = 10,
		handHeight = 5,
		handRadius = 5;

	y += animHeight * Math.sin(2*Math.PI * (time/animCycleTime));
		
	// Body
	graph.strokeStyle = 'hsl(80%, 100%, 45%)';
	graph.fillStyle = 'hsl(80%, 100%, 50%)';
	graph.lineWidth = playerConfig.border;
	drawCircle(x, y, radius, sides);

	// Eyes
	graph.strokeStyle = 'hsl(30%, 50%, 100%)';
	graph.fillStyle = 'hsl(80%, 100%, 50%)';
	graph.lineWidth = 4;
	// Left Eye
	graph.beginPath();
	graph.moveTo(x - eyeDist, y);
	graph.lineTo(x - 10 - eyeDist, y - 1);
	graph.lineTo(x - 10 - eyeDist, y - 8);
	graph.lineTo(x - 1 - eyeDist, y - 1);
	graph.closePath();
	graph.stroke();
	graph.fill();
	// Right Eye
	graph.beginPath();
	graph.moveTo(x + eyeDist, y);
	graph.lineTo(x + 10 + eyeDist, y - 1);
	graph.lineTo(x + 10 + eyeDist, y - 8);
	graph.lineTo(x + 1 + eyeDist, y - 1);
	graph.closePath();
	graph.stroke();
	graph.fill();
	
	// Hands
	graph.strokeStyle = 'hsl(30%, 50%, 100%)';
	graph.fillStyle = 'hsl(80%, 100%, 50%)';
	graph.lineWidth = 4;
	// Left Hand
	drawCircle(x - radius - handDist, y - handHeight, handRadius, sides);
	// Right Hand
	drawCircle(x + radius + handDist, y - handHeight, handRadius, sides);
}

function drawPlayers(order) {
	var px = player.x;
	var py = player.y;
	var scrw = global.screenWidth;
	var scrh = global.screenHeight;
    var start = {
        x: player.x - (global.screenWidth / 2),
        y: player.y - (global.screenHeight / 2)
    };

    for(var z=0; z<order.length; z++)
    {
        var userCurrent = aPlayers[order[z].nCell];
        var cellCurrent = aPlayers[order[z].nCell].cells[order[z].nDiv];

        var x=0;
        var y=0;

        var points = 30 + ~~(cellCurrent.mass/5);
        var increase = Math.PI * 2 / points;

        graph.strokeStyle = 'hsl(' + userCurrent.hue + ', 100%, 45%)';
        graph.fillStyle = 'hsl(' + userCurrent.hue + ', 100%, 50%)';
        graph.lineWidth = playerConfig.border;

        var xstore = [];
        var ystore = [];

        global.spin += 0.0;

        var circle = {
            x: cellCurrent.x - start.x,
            y: cellCurrent.y - start.y
        };

        for (var i = 0; i < points; i++) {

            x = cellCurrent.radius * Math.cos(global.spin) + circle.x;
            y = cellCurrent.radius * Math.sin(global.spin) + circle.y;
            if(typeof(userCurrent.id) == "undefined") {
                x = valueInRange(-userCurrent.x + global.screenWidth / 2,
                                 global.gameWidth - userCurrent.x + global.screenWidth / 2, x);
                y = valueInRange(-userCurrent.y + global.screenHeight / 2,
                                 global.gameHeight - userCurrent.y + global.screenHeight / 2, y);
            } else {
                x = valueInRange(-cellCurrent.x - player.x + global.screenWidth / 2 + (cellCurrent.radius/3),
                                 global.gameWidth - cellCurrent.x + global.gameWidth - player.x + global.screenWidth / 2 - (cellCurrent.radius/3), x);
                y = valueInRange(-cellCurrent.y - player.y + global.screenHeight / 2 + (cellCurrent.radius/3),
                                 global.gameHeight - cellCurrent.y + global.gameHeight - player.y + global.screenHeight / 2 - (cellCurrent.radius/3) , y);
            }
            global.spin += increase;
            xstore[i] = x;
            ystore[i] = y;
        }
        /*if (wiggle >= player.radius/ 3) inc = -1;
        *if (wiggle <= player.radius / -3) inc = +1;
        *wiggle += inc;
        */
        for (i = 0; i < points; ++i) {
            if (i === 0) {
                graph.beginPath();
                graph.moveTo(xstore[i], ystore[i]);
            } else if (i > 0 && i < points - 1) {
                graph.lineTo(xstore[i], ystore[i]);
            } else {
                graph.lineTo(xstore[i], ystore[i]);
                graph.lineTo(xstore[0], ystore[0]);
            }

        }
        graph.lineJoin = 'round';
        graph.lineCap = 'round';
        graph.fill();
        graph.stroke();
        var nameCell = "";
        if(typeof(userCurrent.id) == "undefined")
            nameCell = player.name;
        else
            nameCell = userCurrent.name;

        var fontSize = Math.max(cellCurrent.radius / 3, 12);
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + fontSize + 'px sans-serif';

        if (global.toggleMassState === 0) {
            graph.strokeText(nameCell, circle.x, circle.y);
            graph.fillText(nameCell, circle.x, circle.y);
        } else {
            graph.strokeText(nameCell, circle.x, circle.y);
            graph.fillText(nameCell, circle.x, circle.y);
            graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
            if(nameCell.length === 0) fontSize = 0;
            graph.strokeText(Math.round(cellCurrent.mass), circle.x, circle.y+fontSize);
            graph.fillText(Math.round(cellCurrent.mass), circle.x, circle.y+fontSize);
        }
    }
}

function valueInRange(min, max, value) {
    return Math.min(max, Math.max(min, value));
}

function drawgrid() {
     graph.lineWidth = 1;
     graph.strokeStyle = global.lineColor;
     graph.globalAlpha = 0.15;
     graph.beginPath();

    for (var x = global.xoffset - player.x; x < global.screenWidth; x += global.screenHeight / 18) {
        graph.moveTo(x, 0);
        graph.lineTo(x, global.screenHeight);
    }

    for (var y = global.yoffset - player.y ; y < global.screenHeight; y += global.screenHeight / 18) {
        graph.moveTo(0, y);
        graph.lineTo(global.screenWidth, y);
    }

    graph.stroke();
    graph.globalAlpha = 1;
}

function drawborder() {
    graph.lineWidth = 1;
    graph.strokeStyle = playerConfig.borderColor;

    // Left-vertical.
    if (player.x <= global.screenWidth/2) {
        graph.beginPath();
        graph.moveTo(global.screenWidth/2 - player.x, 0 ? player.y > global.screenHeight/2 : global.screenHeight/2 - player.y);
        graph.lineTo(global.screenWidth/2 - player.x, global.gameHeight + global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Top-horizontal.
    if (player.y <= global.screenHeight/2) {
        graph.beginPath();
        graph.moveTo(0 ? player.x > global.screenWidth/2 : global.screenWidth/2 - player.x, global.screenHeight/2 - player.y);
        graph.lineTo(global.gameWidth + global.screenWidth/2 - player.x, global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Right-vertical.
    if (global.gameWidth - player.x <= global.screenWidth/2) {
        graph.beginPath();
        graph.moveTo(global.gameWidth + global.screenWidth/2 - player.x,
                     global.screenHeight/2 - player.y);
        graph.lineTo(global.gameWidth + global.screenWidth/2 - player.x,
                     global.gameHeight + global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }

    // Bottom-horizontal.
    if (global.gameHeight - player.y <= global.screenHeight/2) {
        graph.beginPath();
        graph.moveTo(global.gameWidth + global.screenWidth/2 - player.x,
                     global.gameHeight + global.screenHeight/2 - player.y);
        graph.lineTo(global.screenWidth/2 - player.x,
                     global.gameHeight + global.screenHeight/2 - player.y);
        graph.strokeStyle = global.lineColor;
        graph.stroke();
    }
}

window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.msRequestAnimationFrame     ||
            function( callback ) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

window.cancelAnimFrame = (function(handle) {
    return  window.cancelAnimationFrame     ||
            window.mozCancelAnimationFrame;
})();

function drawAnimationTest() {
	var diff = 0.01;
	var coords = {};
	var scale = 1;
	var xOffset = global.screenWidth/2;
	var yOffset = 200;
	
	graph.lineWidth = 1;
	graph.strokeStyle = '#00FF00';
	graph.globalAlpha = 1;
	graph.beginPath();
	
	for (var i = 0; i <= 1; i += diff) {
		coords = animator.getPosByPercent("1", i);
		coords.x *= scale;
		coords.y *= scale;
		coords.x += xOffset;
		coords.y += yOffset;
		graph.fillRect(coords.x, coords.y, 2, 2);
		//graph.lineTo(coords.x, coords.y);
	}
	
	graph.stroke();
    graph.globalAlpha = 1;
}

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
	
	var now = new Date().getTime(),
        dt = now - (time || now);
 
    time = now - startTime;
	
    gameLoop();
}

function gameLoop() {
    if (global.died) {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        graph.fillText('You died!', global.screenWidth / 2, global.screenHeight / 2);
    }
    else if (!global.disconnected) {
        if (global.gameRunning) {
            graph.fillStyle = global.backgroundColor;
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            drawgrid();
            aPlayers.forEach(drawPlayer);

            if (global.borderDraw) {
                drawborder();
            }

			//drawPlayer(orderMass[0]);
			drawAnimationTest();
			
//            drawPlayers(orderMass);
            socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".

        } else {
            graph.fillStyle = '#333333';
            graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

            graph.textAlign = 'center';
            graph.fillStyle = '#FFFFFF';
            graph.font = 'bold 30px sans-serif';
            graph.fillText('Game Over!', global.screenWidth / 2, global.screenHeight / 2);
        }
    } else {
        graph.fillStyle = '#333333';
        graph.fillRect(0, 0, global.screenWidth, global.screenHeight);

        graph.textAlign = 'center';
        graph.fillStyle = '#FFFFFF';
        graph.font = 'bold 30px sans-serif';
        if (global.kicked) {
            if (reason !== '') {
                graph.fillText('You were kicked for:', global.screenWidth / 2, global.screenHeight / 2 - 20);
                graph.fillText(reason, global.screenWidth / 2, global.screenHeight / 2 + 20);
            }
            else {
                graph.fillText('You were kicked!', global.screenWidth / 2, global.screenHeight / 2);
            }
        }
        else {
              graph.fillText('Disconnected!', global.screenWidth / 2, global.screenHeight / 2);
        }
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    player.screenWidth = c.width = global.screenWidth = global.playerType == 'player' ? window.innerWidth : global.gameWidth;
    player.screenHeight = c.height = global.screenHeight = global.playerType == 'player' ? window.innerHeight : global.gameHeight;

    if (global.playerType == 'spectate') {
        player.x = global.gameWidth / 2;
        player.y = global.gameHeight / 2;
    }

    socket.emit('windowResized', { screenWidth: global.screenWidth, screenHeight: global.screenHeight });
}
