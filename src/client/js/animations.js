module.exports = {
    "idle/body": {
        shapes: [
            {
                type: "line",
                posStart: {x: 0, y: 5},
                posEnd: {x: 0, y: -2},
                rotDegStart: 0,
                rotDegEnd: 0,
                duration: 300
            },
            {
                type: "line",
                posStart: {x: 0, y: -2},
                posEnd: {x: 0, y: 5},
                rotDegStart: 0,
                rotDegEnd: 0,
                duration: 300
            }
        ],
        triggers: []
    },
    "idle/body/l_hand": {
        shapes: [
            {
                type: "curve",
                pos: {x: 0, y: 0},
                radius: 40,
                angleDegStart: 170,
                angleDegEnd: 175,
                rotDegStart: -5,
                rotDegEnd: 5,
                duration: 300
            },
            {
                type: "curve",
                pos: {x: 0, y: 0},
                radius: 40,
                angleDegStart: 175,
                angleDegEnd: 170,
                rotDegStart: 5,
                rotDegEnd: -5,
                duration: 300
            }
        ],
        triggers: []
    },
    "idle/body/r_hand": {
        shapes: [
            {
                type: "curve",
                pos: {x: 0, y: 0},
                radius: 40,
                angleDegStart: 10,
                angleDegEnd: 5,
                rotDegStart: 5,
                rotDegEnd: -5,
                duration: 300
            },
            {
                type: "curve",
                pos: {x: 0, y: 0},
                radius: 40,
                angleDegStart: 5,
                angleDegEnd: 10,
                rotDegStart: -5,
                rotDegEnd: 5,
                duration: 300
            }
        ],
        triggers: []
    }
};
