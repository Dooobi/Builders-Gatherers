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
	var rad = (curve.endRad - curve.startRad) * (someLength / curve.length);
	rad += curve.startRad;
	//var rad = (someLength/curve.radius) + curve.startRad;

	var coords = {
		x: Math.cos(rad) * curve.radius + curve.x,
		y: Math.sin(rad) * curve.radius + curve.y
	};
	return coords;
};

var lineDurationToCoords = function(line, someDuration) {
	var coords = {
		x: Math.cos(line.rad) * line.length * (someDuration/line.duration) + line.start.x,
		y: Math.sin(line.rad) * line.length * (someDuration/line.duration) + line.start.y
	};
	return coords;
};

var curveDurationToCoords = function(curve, someDuration) {
	var rad = (curve.endRad - curve.startRad) * (someDuration / curve.duration);
	rad += curve.startRad;
	//var rad = (someLength/curve.radius) + curve.startRad;

	var coords = {
		x: Math.cos(rad) * curve.radius + curve.x,
		y: Math.sin(rad) * curve.radius + curve.y
	};
	return coords;
};

var getAnimationCoordsByDuration = function(oAnimation, someDuration) {
	var coords = {x: 0, y: 0};
	var shapes = oAnimation.shapes,
		shape = null;
	var totalDuration = 0,
		prevDuration = 0,
		currentDuration = 0,
		leftOverDuration = 0;
	var i = 0;

	if (!shapes) {
		return {x: 0, y: 0};
	}

	for (i = 0; i < shapes.length; i++) {
		totalDuration += shapes[i].duration;
	}
	someDuration = someDuration % totalDuration;

	for (i = 0; i < shapes.length; i++) {
		prevDuration = currentDuration;
		currentDuration += shapes[i].duration;
		if (currentDuration >= someDuration) {
			leftOverDuration = someDuration - prevDuration;
			shape = shapes[i];
			break;
		}
	}

	if (!shape) {
		return {x: 0, y: 0};
	}

	switch (shape.type) {
	case "line":
		coords = lineDurationToCoords(shape, leftOverDuration);
		break;
	case "curve":
		coords = curveDurationToCoords(shape, leftOverDuration);
		break;
	}

	return coords;
};

var lazyLoadAnimation = function(sName, oParent) {
	if (!oParent.animations[sName]) {
		var animation = {
			animations: {},
			shapes: [],
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

exports.addLine = function(sPath, x1, y1, x2, y2, duration) {
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
		length: Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2)),
		duration: duration || 0
	};
	getAnimation(sPath).shapes.push(line);
};

exports.addCurve = function(sPath, x, y, radius, startAngle, endAngle, duration) {
	var curve = {
		type: "curve",
		x: x,
		y: y,
		radius: radius,
		startRad: degToRad(startAngle),
		endRad: degToRad(endAngle),
		length: degToRad(endAngle - startAngle) * radius,
		duration: duration || 0
	};
	if (curve.length < 0) {
		curve.length *= -1;
	}
	getAnimation(sPath).shapes.push(curve);
};

exports.getPosByLength = function(sPath, someLength) {
	var i = 0;
	var prevLength = 0;
	var currentLength = 0;
	var shapes = getAnimation(sPath).shapes;
	var shape = null;
	var coords = null;
	var pPart = null;
	var leftOverLength = 0;

	if (!shapes) {
		return {x: 0, y: 0};
	}

	for (i = 0; i < shapes.length; i++) {
		prevLength = currentLength;
		currentLength += shapes[i].length;
		if (currentLength >= someLength) {
			leftOverLength = someLength - prevLength;
			shape = shapes[i];
			break;
		}
	}

	if (!shape) {
		return {x: 0, y: 0};
	}

	switch (shape.type) {
	case "line":
		coords = lineLengthToCoords(shape, leftOverLength);
		break;
	case "curve":
		coords = curveLengthToCoords(shape, leftOverLength);
		break;
	}

	return coords;
};

exports.getPosByDuration = function(sPath, someDuration) {
	var oAnimation = getAnimation(sPath);

	var coords = getAnimationCoordsByDuration(oAnimation, someDuration);

	return coords;
};

var getAnimationNodeByDuration = function(oAnimation, someDuration, parentCoords) {
	var oResult = {
		coords: {},
		animations: {}
	};
	var keys = Object.keys(oAnimation.animations);
	var key;
	var nextAnimation;
	var i = 0;

	oResult.coords = getAnimationCoordsByDuration(oAnimation, someDuration);
	oResult.coords.x += parentCoords.x;
	oResult.coords.y += parentCoords.y;

	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		nextAnimation = oAnimation.animations[key];
		oResult.animations[key] = getAnimationNodeByDuration(nextAnimation, someDuration, oResult.coords);
	}

	return oResult;
};

exports.getAnimationTreeByDuration = function(sPath, someDuration) {
	var rootAnimation = getAnimation(sPath);

	var tree = getAnimationNodeByDuration(rootAnimation, someDuration, {x: 0, y: 0})

	return tree;
};

exports.getPosByLengthPercent = function(sPath, somePercent) {
	var i = 0;
	var totalLength = 0;
	var someLength = 0;
	var shapes = getAnimation(sPath).shapes;

	if (!shapes) {
		return {x: 0, y: 0};
	}

	for (i = 0; i < shapes.length; i++) {
		totalLength += shapes[i].length;
	}
	someLength = totalLength * somePercent;

	return exports.getPosByLength(sPath, someLength);
};

exports.getPosByDurationPercent = function(sPath, somePercent) {
	var i = 0;
	var totalDuration = 0;
	var someDuration = 0;
	var shapes = getAnimation(sPath).shapes;

	if (!shapes) {
		return {x: 0, y: 0};
	}

	for (i = 0; i < shapes.length; i++) {
		totalDuration += shapes[i].duration;
	}
	someDuration = totalDuration * somePercent;

	return exports.getPosByDuration(sPath, someDuration);
};
