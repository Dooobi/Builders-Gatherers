/* jslint node: true */

'use strict';

var root = {
	animations: {}
};

var lineLengthToCoords = function(line, someLength) {
	var percentage = someLength / line.length;

	var result = {
		x: Math.cos(line.rad) * someLength + line.start.x,
		y: Math.sin(line.rad) * someLength + line.start.y,
		rotation: (line.rotationEnd - line.rotationStart) * percentage + line.rotationStart
	};
	return result;
};

var curveLengthToCoords = function(curve, someLength) {
	var percentage = someLength / curve.length;
	var rad = (curve.endRad - curve.startRad) * percentage;
	rad += curve.startRad;
	//var rad = (someLength/curve.radius) + curve.startRad;

	var result = {
		x: Math.cos(rad) * curve.radius + curve.x,
		y: Math.sin(rad) * curve.radius + curve.y,
		rotation: (curve.rotationEnd - curve.rotationStart) * percentage + curve.rotationStart
	};
	return result;
};

var lineDurationToCoords = function(line, someDuration) {
	var percentage = someDuration / line.duration;

	var result = {
		x: Math.cos(line.rad) * line.length * (someDuration/line.duration) + line.start.x,
		y: Math.sin(line.rad) * line.length * (someDuration/line.duration) + line.start.y,
		rotation: (line.rotationEnd - line.rotationStart) * percentage + line.rotationStart
	};
	return result;
};

var curveDurationToCoords = function(curve, someDuration) {
	var percentage = someDuration / curve.duration;
	var rad = (curve.endRad - curve.startRad) * percentage;
	rad += curve.startRad;
	//var rad = (someLength/curve.radius) + curve.startRad;

	var result = {
		x: Math.cos(rad) * curve.radius + curve.x,
		y: Math.sin(rad) * curve.radius + curve.y,
		rotation: (curve.rotationEnd - curve.rotationStart) * percentage + curve.rotationStart
	};
	return result;
};

var getAnimationCoordsByDuration = function(oAnimation, someDuration) {
	var result = {x: 0, y: 0, rotation: 0};
	var shapes = oAnimation.shapes,
		shape = null;
	var totalDuration = 0,
		prevDuration = 0,
		currentDuration = 0,
		leftOverDuration = 0;
	var i = 0;

	if (!shapes) {
		return {x: 0, y: 0, rotation: 0};
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
		return {x: 0, y: 0, rotation: 0};
	}

	switch (shape.type) {
	case "line":
		result = lineDurationToCoords(shape, leftOverDuration);
		break;
	case "curve":
		result = curveDurationToCoords(shape, leftOverDuration);
		break;
	}

	return result;
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

exports.addLine = function(sPath, x1, y1, x2, y2, rotationStart, rotationEnd, duration) {
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
		rotationStart: rotationStart,
		rotationEnd: rotationEnd,
		duration: duration || 0
	};
	getAnimation(sPath).shapes.push(line);
};

exports.addCurve = function(sPath, x, y, radius, startAngle, endAngle, rotationStart, rotationEnd, duration) {
	var curve = {
		type: "curve",
		x: x,
		y: y,
		radius: radius,
		startRad: degToRad(startAngle),
		endRad: degToRad(endAngle),
		length: degToRad(endAngle - startAngle) * radius,
		rotationStart: rotationStart,
		rotationEnd: rotationEnd,
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
	var result = null;
	var leftOverLength = 0;

	if (!shapes) {
		return {x: 0, y: 0, rotation: 0};
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
		return {x: 0, y: 0, rotation: 0};
	}

	switch (shape.type) {
	case "line":
		result = lineLengthToCoords(shape, leftOverLength);
		break;
	case "curve":
		result = curveLengthToCoords(shape, leftOverLength);
		break;
	}

	return result;
};

exports.getPosByDuration = function(sPath, someDuration) {
	var oAnimation = getAnimation(sPath);

	var result = getAnimationCoordsByDuration(oAnimation, someDuration);

	return result;
};

var getAnimationNodeByDuration = function(oAnimation, someDuration, parentData) {
	var oResult = {
		data: {},
		animations: {}
	};
	var keys = Object.keys(oAnimation.animations);
	var key;
	var nextAnimation;
	var i = 0;

	oResult.data = getAnimationCoordsByDuration(oAnimation, someDuration);
	oResult.data.x += parentData.x;
	oResult.data.y += parentData.y;
	oResult.data.rotation += parentData.rotation;

	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		nextAnimation = oAnimation.animations[key];
		oResult.animations[key] = getAnimationNodeByDuration(nextAnimation, someDuration, oResult.data);
	}

	return oResult;
};

exports.getAnimationTreeByDuration = function(sPath, someDuration) {
	var rootAnimation = getAnimation(sPath);

	var tree = getAnimationNodeByDuration(rootAnimation, someDuration, {x: 0, y: 0, rotation: 0});

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
