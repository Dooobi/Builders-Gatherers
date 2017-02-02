var io = require('socket.io-client');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');
var animator = require('./animator');
var kd = require('./keydrown');
var weapons = require('./weapons');

var playerNameInput = document.getElementById('playerNameInput');
var socket;
var reason;
var startTime;
var prevTime = 0;
var dt;

var debug = function(args) {
    if (console && console.log) {
        console.log(args);
    }
};

if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
    global.mobile = true;
}

function setupAnimations() {
    // Idle
    animator.createAnimation("idle/body");
    animator.addLine("idle/body", 0, 5, 0, -2, 0, 0, 300);
    animator.addLine("idle/body", 0, -2, 0, 5, 0, 0, 300);
    animator.createAnimation("idle/body/l_hand");
    animator.addCurve("idle/body/l_hand", 0, 0, 40, 170, 175, -5, 5, 300);
    animator.addCurve("idle/body/l_hand", 0, 0, 40, 175, 170, 5, -5, 300);
    animator.createAnimation("idle/body/r_hand");
    animator.addCurve("idle/body/r_hand", 0, 0, 40, 10, 5, 5, -5, 300);
    animator.addCurve("idle/body/r_hand", 0, 0, 40, 5, 10, -5, 5, 300);
    // Moving
    animator.createAnimation("moving/body");
    animator.addLine("moving/body", 0, 5, 0, -5, 0, 0, 250);
    animator.addLine("moving/body", 0, -5, 0, 5, 0, 0, 250);
    animator.createAnimation("moving/body/l_hand");
    animator.addLine("moving/body/l_hand", -38, 5, -40, -5, -5, 5, 250);
    animator.addLine("moving/body/l_hand", -40, -5, -38, 5, 5, -5, 250);
//    animator.addCurve("moving/body/l_hand", 0, 0, 40, 160, 190, 250);
//    animator.addCurve("moving/body/l_hand", 0, 0, 40, 190, 160, 250);
    animator.createAnimation("moving/body/r_hand");
    animator.addLine("moving/body/r_hand", 38, 5, 40, -5, 5, -5, 250);
    animator.addLine("moving/body/r_hand", 40, -5, 38, 5, -5, 5, 250);
//    animator.addCurve("moving/body/r_hand", 0, 0, 40, 20, -10, 250);
//    animator.addCurve("moving/body/r_hand", 0, 0, 40, -10, 20, 250);
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

    Math.degToRad = function(deg) {
    	return deg * (Math.PI/180);
    };
    Math.radToDeg = function(rad) {
    	return rad * (180/Math.PI);
    };
    Math.cartesianToPolar = function(x, y) {
        return {
            radius: Math.sqrt(x*x + y*y),
            alpha: Math.atan2(y, x)
        };
    };
    Math.polarToCartesian = function(radius, alpha) {
        return {
            x: radius * Math.cos(alpha),
            y: radius * Math.sin(alpha)
        };
    };
    Math.applyRotationRad = function(x, y, rotationRad) {
        var polar = Math.cartesianToPolar(x, y);
        polar.alpha += rotationRad;
        return Math.polarToCartesian(polar.radius, polar.alpha);
    };
    Math.applyRotationDeg = function(x, y, rotationDeg) {
        var polar = Math.cartesianToPolar(x, y);
        polar.alpha += Math.degToRad(rotationDeg);
        return Math.polarToCartesian(polar.radius, polar.alpha);
    };
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

    setupAnimations();
};

// TODO: Break out into GameControls.

var foodConfig = {
    border: 0,
};

var playerConfig = {
    border: 4,
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

kd.A.down(function() {
	console.log('LEFT');
	global.targetVector.x = -1;
});

kd.D.down(function() {
	console.log('RIGHT');
	global.targetVector.x = 1;
});

kd.W.down(function() {
	console.log('UP');
	global.targetVector.y = -1;
});

kd.S.down(function() {
	console.log('DOWN');
	global.targetVector.y = 1;
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
    socket.on('update', function (myPlayer, aPlayerData) {
		console.log("update");

        if(global.playerType == 'player') {

            var xoffset = player.character.x - myPlayer.character.x;
            var yoffset = player.character.y - myPlayer.character.y;

			player = myPlayer;
			player.camX = myPlayer.character.x;
			player.camY = myPlayer.character.y;
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
        x: player.camX - (global.screenWidth / 2),
        y: player.camY - (global.screenHeight / 2)
    };
	var x = oCharacter.x - start.x,
		y = oCharacter.y - start.y,
        rotated,
        animPos = {},
        animName = oCharacter.animation.name,
        animDuration = oCharacter.animation.duration,
        animTree,
		radius = 30,
		sides = 20,
		eyeDist = 5,
        eyeWidth = 17,
        eyeHeight = 1,
        eyeTallness = 7,
		handDist = 10,
		handHeight = 5,
		handRadius = 6;

    animTree = animator.getAnimationTreeByDuration(animName, animDuration);

	// Body
    graph.lineWidth = playerConfig.border;
	graph.strokeStyle = 'hsl(80%, 100%, 45%)';
	graph.fillStyle = "#FF0000";
    animPos = animTree.animations.body.data;
	drawCircle(x + animPos.x, y + animPos.y, radius, sides);

	// Eyes
    graph.lineWidth = playerConfig.border - 2;
	graph.strokeStyle = 'hsl(30%, 50%, 100%)';
	graph.fillStyle = 'hsl(80%, 100%, 50%)';
	// Left Eye
	graph.beginPath();
	graph.moveTo(x - eyeDist + animPos.x, y - eyeHeight + animPos.y);
	graph.lineTo(x - eyeWidth + 0.5 - eyeDist + animPos.x, y - eyeHeight + 2 + animPos.y);
	graph.lineTo(x - eyeWidth + 1 - eyeDist + animPos.x, y - eyeHeight - eyeTallness + animPos.y);
//	graph.lineTo(x - 1 - eyeDist + animPos.x, y - 1 + animPos.y);
	graph.closePath();
	graph.stroke();
	graph.fill();
	// Right Eye
	graph.beginPath();
	graph.moveTo(x + eyeDist + animPos.x, y - eyeHeight + animPos.y);
	graph.lineTo(x + eyeWidth - 0.5 + eyeDist + animPos.x, y - eyeHeight + 2 + animPos.y);
	graph.lineTo(x + eyeWidth - 1 + eyeDist + animPos.x, y - eyeHeight - eyeTallness + animPos.y);
//	graph.lineTo(x + 1 + eyeDist + animPos.x, y - 1 + animPos.y);
	graph.closePath();
	graph.stroke();
	graph.fill();

	// Hands
    graph.lineWidth = playerConfig.border;
	graph.strokeStyle = 'hsl(30%, 50%, 100%)';
	graph.fillStyle = 'hsl(80%, 100%, 50%)';
	// Left Hand
    animPos = animTree.animations.body.animations.l_hand.data;
	drawCircle(x + animPos.x, y + animPos.y, handRadius, sides);
    drawWeapon(x + animPos.x, y + animPos.y, animPos.rotation, oCharacter);
    // Right Hand
    animPos = animTree.animations.body.animations.r_hand.data;
    drawCircle(x + animPos.x, y + animPos.y, handRadius, sides);
}

function drawWeapon(originX, originY, rotation, oCharacter) {
    var weapon = weapons[oCharacter.sWeapon];
    var shapes = weapon.shapes;
    var vertices;
    var x, y, rotated;
    var i = 0, j = 0;

    for (i = 0; i < shapes.length; i++) {
        vertices = shapes[i].vertices;
        graph.beginPath();
        for (j = 0; j < vertices.length; j++) {
            rotated = Math.applyRotationDeg(vertices[j].x, vertices[j].y, rotation);
            x = originX + rotated.x;
            y = originY + rotated.y;
            if (j === 0) {
                graph.moveTo(x, y);
            } else {
                graph.lineTo(x, y);
            }
        }
        graph.closePath();
        graph.stroke();
        graph.fill();
    }
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
	var cellSizeX = global.screenWidth / global.countLinesGrid;
	var cellSizeY = global.screenHeight / global.countLinesGrid;
	var restX = player.camX % cellSizeX;
	var restY = player.camY % cellSizeY;
	graph.lineWidth = 1;
	graph.strokeStyle = global.lineColor;
	graph.globalAlpha = 0.15;
	graph.beginPath();

	for (var x = global.xoffset + global.screenWidth - restX; x > 0; x -= cellSizeY) {
		graph.moveTo(x, 0);
        graph.lineTo(x, global.screenHeight);
	}

	for (var y = global.yoffset + global.screenHeight - restY; y > 0; y -= cellSizeY) {
		graph.moveTo(0, y);
        graph.lineTo(global.screenWidth, y);
	}
/*
    for (var x = global.xoffset - player.camX; x < global.screenWidth; x += global.screenHeight / 18) {
        graph.moveTo(x, 0);
        graph.lineTo(x, global.screenHeight);
    }

    for (var y = global.yoffset - player.camY ; y < global.screenHeight; y += global.screenHeight / 18) {
        graph.moveTo(0, y);
        graph.lineTo(global.screenWidth, y);
    }
*/
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

function handleInput() {
	global.targetVector = {
		x: 0,
		y: 0
	};

	kd.tick();
	socket.emit('updateMove', global.targetVector);
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
    graph.strokeStyle = '#E00000';
    graph.globalAlpha = 0.15;
    graph.beginPath();

	for (var i = 0; i <= 1; i += diff) {
		coords = animator.getPosByLengthPercent("moving/l_hand", i);
		coords.x *= scale;
		coords.y *= scale;
		coords.x += xOffset;
		coords.y += yOffset;
		graph.lineTo(coords.x, coords.y);
	}

	graph.stroke();
    graph.globalAlpha = 1;
}

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);

	var now = new Date().getTime();

    dt = now - prevTime;
    prevTime = now;

    gameLoop();

    graph.fillStyle = 'black';
    graph.font = '35px serif';
    graph.fillText("" + (1000/dt), 10, 30);
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
			handleInput();
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
