// Create the canvas
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

var COLOR_DIFF = 5;

var pixels = [];
pixels[(canvas.height * canvas.width) - 1] = 0;

var timer;

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
	if (str.length < 6) {
		str = "0" + str;
	}
	return str;
}

function resetColors() {
	for (var i = 0; i < pixels.length; i++) {
		pixels[i] = -1;
	}
}

function drawNew() {
	// var pixelIndexes = [];
	for (var i = 0; i < pixels.length; i++) {
		// pixelIndexes[i] = i;
	// }
	//shuffle(pixelIndexes);
	// for (var idx = 0; idx < pixelIndexes.length; idx++) {
		// var i = pixelIndexes[idx];
		var color = 0;
		var refColor = -1;
		var neighborPixels = [
			i - canvas.width - 1, i - canvas.width, i - canvas.width + 1,
			i - 1, i + 1,
			i + canvas.width - 1, i + canvas.width, i + canvas.width + 1
		];
		shuffle(neighborPixels);
		for (var j = 0; j < neighborPixels.length; j++) {
			var neighbor = neighborPixels[j];
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
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for (var i = 0; i < pixels.length; i++) {
		ctx.fillStyle = "#" + formatHex(pixels[i]);
		ctx.fillRect((i % canvas.width), Math.floor(i / canvas.width), 1, 1);
	}
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

function onClickReset() {
	resetColors();
	document.getElementById("iter-span").innerText = "0";
	drawNew();
	var canvas = document.getElementById("origCanvas");
	var ctx = canvas.getContext("2d");
	for (var i = 0; i < pixels.length; i++) {
		ctx.fillStyle = "#" + formatHex(pixels[i]);
		ctx.fillRect((i % canvas.width), Math.floor(i / canvas.width), 1, 1);
	}
}

onClickReset();

