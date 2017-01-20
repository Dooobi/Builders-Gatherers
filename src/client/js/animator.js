/* jslint node: true */

'use strict';

var animations = [];

var line = {
	x1: 1,
	x2: 2,
	y1: 3,
	y2: 4
};

var curve = {
	x: 2,
	y: 2,
	r: 2,
	startAngle: 40.5,
	endAngle: 91.2
};

var lineLengthToCoords = function(line, someLength) {
	var coords = {
		x: Math.cos(line.rad) * someLength + line.start.x,
		y: Math.sin(line.rad) * someLength + line.start.y
	};
	return coords;
};

var curveLengthToCoords = function(curve, someLength) {
	var rad = (someLength/curve.radius) + curve.startRad;
	var coords = {
		x: Math.cos(rad) * curve.radius + curve.x,
		y: Math.sin(rad) * curve.radius + curve.y
	};
	return coords;
};

var vectorToDegrees = function(x1, y1, x2, y2) {
	return Math.atan2(y2-y1, x2-x1);
};

var degToRad = function(deg) {
	return deg * (Math.PI/180);
};

var radToDeg = function(rad) {
	return rad * (180/Math.PI);
};

exports.createAnimation = function(uniqueName) {
	var animation = {
		parts: [],
		triggers: []
	};
    animations[uniqueName] = animation;
	var anims = animations;
};

exports.addLine = function(uniqueName, x1, y1, x2, y2) {
	var anims = animations;
	var line = {
		type: "line",
		start: {
			x: x1,
			y: y1
		},
		end: {
			x: x2,
			y: y2
		},
		rad: vectorToDegrees(x1, y1, x2, y2),
		length: Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2))
	};
	animations[uniqueName].parts.push(line);
};

exports.addCurve = function(uniqueName, x, y, radius, startAngle, endAngle) {
	var anims = animations;
	var curve = {
		type: "curve",
		x: x,
		y: y,
		radius: radius,
		startRad: degToRad(startAngle),
		endRad: degToRad(endAngle),
		length: degToRad(endAngle - startAngle) * radius
	};
	animations[uniqueName].parts.push(curve);
};

exports.getPosByLength = function(uniqueName, someLength) {
	var i = 0;
	var prevLength = 0;
	var currentLength = 0;
	var parts = animations[uniqueName].parts;
	var part = null;
	var coords = null;
	var pPart = null;
	var leftOverLength = 0;
	
	for (i = 0; i < parts.length; i++) {
		prevLength = currentLength;
		currentLength += parts[i].length;
		if (currentLength >= someLength) {
			leftOverLength = someLength - prevLength;
			part = parts[i];
			break;
		}
	}

	if (!part) {
		return null;
	}
	
	switch (part.type) {
	case "line":
		coords = lineLengthToCoords(part, leftOverLength);
		break;
	case "curve":
		coords = curveLengthToCoords(part, leftOverLength);
		break;
	}
	
	return coords;
};

exports.getPosByPercent = function(uniqueName, somePercent) {
	var i = 0;
	var totalLength = 0;
	var someLength = 0;
	var anims = animations;
	var parts = animations[uniqueName].parts;
	
	for (i = 0; i < parts.length; i++) {
		totalLength += parts[i].length;
	}
	someLength = totalLength * somePercent;
	
	return exports.getPosByLength(uniqueName, someLength);
};