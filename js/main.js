// Create the canvas
var canvas = document.getElementById("myCanvas");
var similarInput = document.getElementById("similar-input");

var COLOR_DIFF = 5;

var pixels = [];
pixels[(canvas.height * canvas.width) - 1] = 0;

var neighborVectors = [
	-canvas.width - 1, -canvas.width, -canvas.width + 1,
	-1, 1,
	canvas.width - 1, canvas.width, canvas.width + 1
];

var timer;
var colorCenter = [];
var randomBlur = false;

function randomIntInRange(min, max) {
	return Math.floor((Math.random() * (max - min + 1)) + min); 
}

function shuffle(array) {
	var j, temp;
	for (var i = 0; i < array.length; i++) {
		j = randomIntInRange(0, array.length - 1);
		temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

function formatHex(value) {
	var str = value.toString(16);
	while (str.length < 6) {
		str = "0" + str;
	}
	return str;
}

function drawCanvas(canvas) {
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for (var i = 0; i < pixels.length; i++) {
		ctx.fillStyle = "#" + formatHex(pixels[i]);
		ctx.fillRect((i % canvas.width), Math.floor(i / canvas.width), 1, 1);
	}
}

function splitColor(color) {
	return [color >> 16, color >> 8 & 0xFF, color & 0xFF];
}

function encodeColor(color) {
	return color[0] << 16 | color[1] << 8 | color[2];
}

function isSimilarColor(color, other) {
	var a = splitColor(color);
	var b = splitColor(other);
	for (var i = 0; i < 3; i++) {
		if (Math.abs(a[i] - b[i]) >= similarInput.value) {
			return false;
		}
	}
	return true;
}

function countSimilarColor(i) {
	var count = 0;
	var color = pixels[i];
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (neighbor >= 0 && neighbor < pixels.length && pixels[neighbor] != -1
		 && isSimilarColor(color, pixels[neighbor])) {
			count++;
		}
	}
	return count;
}

function updatePixelRandom(i) {
	var color = 0;
	var refColor = -1;
	shuffle(neighborVectors);
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (neighbor >= 0 && neighbor < pixels.length && pixels[neighbor] != -1) {
			refColor = pixels[neighbor];
			break;
		}
	}
	if (refColor != -1) {
		var refR = refColor >> 16;
		var refG = refColor >> 8 & 0xFF;
		var refB = refColor & 0xFF;
		var colorR = randomIntInRange(Math.max(0, refR - COLOR_DIFF), Math.min(255, refR + COLOR_DIFF));
		var colorG = randomIntInRange(Math.max(0, refG - COLOR_DIFF), Math.min(255, refG + COLOR_DIFF));
		var colorB = randomIntInRange(Math.max(0, refB - COLOR_DIFF), Math.min(255, refB + COLOR_DIFF));
		color = colorR << 16 | colorG << 8 | colorB;
	} else {
		color = randomIntInRange(0, 0xFFFFFF);
	}
	pixels[i] = color;
}

function updatePixelAverage(i) {
	var color = 0;
	var refColor = -1;
	var sumR = 0;
	var sumG = 0;
	var sumB = 0;
	var sumCount = 0;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (neighbor >= 0 && neighbor < pixels.length && pixels[neighbor] != -1) {
			refColor = pixels[neighbor];
			sumR += refColor >> 16;
			sumG += refColor >> 8 & 0xFF;
			sumB += refColor & 0xFF;
			sumCount++;
		}
	}
	var colorR = sumR / sumCount;
	var colorG = sumG / sumCount;
	var colorB = sumB / sumCount;
	color = colorR << 16 | colorG << 8 | colorB;
	pixels[i] = color;
}

function updatePixelTransfer(i) {
	var color = splitColor(pixels[i]);
	var refColor = -1;
	var max = [];
	var maxi = [];
	for (var k = 0; k < 3; k++) {
		max[k] = color[k];
		maxi[k] = i;
	}
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			for (var k = 0; k < 3; k++) {
				if (refColor[k] > max[k]) {
					max[k] = refColor[k];
					maxi[k] = neighbor;
				}
			}
		}
	}
	for (var k = 0; k < 3; k++) {
		if (colorCenter[k]) {
			if (color[k] == 0) {
				continue;
			}
			var pos = [i % canvas.width, Math.floor(i / canvas.width)];
			if (colorCenter[k][0] == pos[0] && colorCenter[k][1] == pos[1]) {
				continue;
			}
			var v = [colorCenter[k][0] - pos[0], colorCenter[k][1] - pos[1]];
			var dist = Math.sqrt(v[0]**2 + v[1]**2);
			v = [Math.round(v[0] / dist), Math.round(v[1] / dist)];
			var neighbor = (pos[1] + v[1])*canvas.width + (pos[0] + v[0]);
			refColor = splitColor(pixels[neighbor]);
			var diff = Math.min(color[k], 255 - refColor[k]);
			if (diff > 0) {
				color[k] -= diff;
				pixels[i] = encodeColor(color);
				refColor[k] += diff;
				pixels[neighbor] = encodeColor(refColor);
			}
		} else if (maxi[k] != i) {
			var diff = Math.floor((max[k] - color[k]) / 2);
			if (diff > 0) {
				color[k] += diff;
				pixels[i] = encodeColor(color);
				var other = splitColor(pixels[maxi[k]]);
				other[k] -= diff;
				pixels[maxi[k]] = encodeColor(other);
			}
		}
	}
}

function resetColors() {
	for (var i = 0; i < pixels.length; i++) {
		pixels[i] = -1;
	}
	for (var i = 0; i < pixels.length; i++) {
		updatePixelRandom(i);
	}
	drawCanvas(canvas);
}

function drawNew() {
	if (randomBlur) {
		var similarCountTotal = 0;
		for (var i = 0; i < pixels.length; i++) {
			var similarCount = countSimilarColor(i);
			// if (70000 < i && i < 90000) {
			if (similarCount < 4) {
				updatePixelAverage(i);
			} else if (similarCount > 4) {
				updatePixelRandom(i);
				similarCountTotal++;
			}
		}
		document.getElementById("similar-span").innerText = similarCountTotal;
	} else {
		for (var i = 0; i < pixels.length; i++) {
			updatePixelTransfer(i);
		}
	}
	drawCanvas(canvas);
	var iterSpan = document.getElementById("iter-span");
	iterSpan.innerText = parseInt(iterSpan.innerText) + 1;
}

function startTimer(element) {
	element.disabled = true;
	timer = setInterval(drawNew, 1000);
	document.getElementById("stop-btn").disabled = false;
}

function stopTimer(element) {
	element.disabled = true;
	clearInterval(timer);
	document.getElementById("start-btn").disabled = false;
}

function updateSimilarInput(element) {
	document.getElementById("similar-input-span").innerText = element.value;
	randomBlur = true;
}

function onClickReset() {
	resetColors();
	document.getElementById("iter-span").innerText = "0";
	//drawNew();
	drawCanvas(document.getElementById("origCanvas"));
}

function onClickCanvas(event) {
	colorCenter[document.querySelector('input[name=center]:checked').value] = [event.offsetX, event.offsetY];
	randomBlur = false;
}

onClickReset();

