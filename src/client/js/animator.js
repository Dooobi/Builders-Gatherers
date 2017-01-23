/* jslint node: true */

'use strict';

var root = {
	animations: {}
};

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

var lazyLoadAnimation = function(sName, oParent) {
	if (!oParent.animations[sName]) {
		var animation = {
			animations: {},
			parts: [],
			triggers: []
		};
		oParent.animations[sName] = animation;
	}
	return oParent.animations[sName];
};

var getAnimation = function(sPath) {
	var aParts = sPath.split("/");
	var i;
	var current = root;
	
	for (i = 0; i < aParts.length; i++) {
		current = lazyLoadAnimation(aParts[i], current);
	}
	return current;
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

/**
 * It's possible to create animation in a folder-like structure e.g.:
 * 	createAnimation("character/idle/left_hand")
 * 
 */
exports.createAnimation = function(sPath) {
	getAnimation(sPath);
};

exports.addLine = function(sPath, x1, y1, x2, y2) {
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
	getAnimation(sPath).parts.push(line);
};

exports.addCurve = function(sPath, x, y, radius, startAngle, endAngle) {
	var curve = {
		type: "curve",
		x: x,
		y: y,
		radius: radius,
		startRad: degToRad(startAngle),
		endRad: degToRad(endAngle),
		length: degToRad(endAngle - startAngle) * radius
	};
	getAnimation(sPath).parts.push(curve);
};

exports.getPosByLength = function(sPath, someLength) {
	var keys = Object.keys(root.animations);
	var i = 0;
	var prevLength = 0;
	var currentLength = 0;
	var parts = getAnimation(sPath).parts;
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

exports.getPosByPercent = function(sPath, somePercent) {
	var i = 0;
	var totalLength = 0;
	var someLength = 0;
	var parts = getAnimation(sPath).parts;
	
	for (i = 0; i < parts.length; i++) {
		totalLength += parts[i].length;
	}
	someLength = totalLength * somePercent;
	
	return exports.getPosByLength(sPath, someLength);
};