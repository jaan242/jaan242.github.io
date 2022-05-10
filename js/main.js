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

var ZOOM_LEVEL = 8;
var zoomWidth = canvas.width / ZOOM_LEVEL;
var zoomHeight = canvas.height / ZOOM_LEVEL;
var zoomOffset = 0;

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

function drawZoomCanvas() {
	var canvas = document.getElementById("zoomCanvas");
	var ctx = canvas.getContext("2d");
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for (var j = 0; j < zoomHeight; j++) {
		for (var i = 0; i < zoomWidth; i++) {
			ctx.fillStyle = "#" + formatHex(pixels[zoomOffset + j*canvas.width + i]);
			ctx.fillRect(i*ZOOM_LEVEL, j*ZOOM_LEVEL, ZOOM_LEVEL, ZOOM_LEVEL);
		}
	}
}

function setZoomCenter(x, y) {
	x = Math.max(0, Math.min(x - (zoomWidth / 2), canvas.width - zoomWidth));
	y = Math.max(0, Math.min(y - (zoomHeight / 2), canvas.height - zoomHeight));
	zoomOffset = y*canvas.width + x;
	drawZoomCanvas();
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

function updatePixelTransfer2(i) {
	var color = splitColor(pixels[i]);
	var refColor = -1;
	var ming = color[1];
	var mingi = i;
	var maxg = color[1];
	var maxgi = i;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			if (refColor[1] < ming) {
				ming = refColor[1];
				mingi = neighbor;
			}
			if (refColor[1] > maxg) {
				maxg = refColor[1];
				maxgi = neighbor;
			}
		}
	}
	if (maxgi != i) {
		var diff = Math.floor((maxg - color[1]) / 2);
		if (diff > 0) {
			color[1] += diff;
			pixels[i] = encodeColor(color);
			var other = splitColor(pixels[maxgi]);
			other[1] -= diff;
			pixels[maxgi] = encodeColor(other);
		}
	}
	if (mingi != i) {
		refColor = splitColor(pixels[mingi]);
		var diff = Math.min(color[2], 255 - refColor[2]);
		if (diff > 0) {
			color[2] -= diff;
			pixels[i] = encodeColor(color);
			refColor[2] += diff;
			pixels[mingi] = encodeColor(refColor);
		}
	}
}

function updatePixelTransfer3(i) {
	var color = splitColor(pixels[i]);
	var refColor = -1;
	var maxg = color[1];
	var maxgi = i;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			if (refColor[1] > maxg) {
				maxg = refColor[1];
				maxgi = neighbor;
			}
			for (var k = 0; k < 3; k += 2) {
				if ((k == 0 && neighbor > i) || (k == 2 && neighbor < i)) {
					var diff = Math.min(color[k], 255 - refColor[k]);
					if (diff > 0) {
						color[k] -= diff;
						pixels[i] = encodeColor(color);
						refColor[k] += diff;
						pixels[neighbor] = encodeColor(refColor);
					}
				}
			}
		}
	}
	if (maxgi != i) {
		var diff = Math.floor((maxg - color[1]) / 2);
		if (diff > 0) {
			color[1] += diff;
			pixels[i] = encodeColor(color);
			var other = splitColor(pixels[maxgi]);
			other[1] -= diff;
			pixels[maxgi] = encodeColor(other);
		}
	}
}

function updatePixelTransfer4(i) {
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
		if (maxi[k] != i) {
			var max2 = color[k];
			var maxi2 = i;
			for (var j = 0; j < neighborVectors.length; j++) {
				var neighbor = i + neighborVectors[j];
				if (0 <= neighbor && neighbor < pixels.length) {
					refColor = splitColor(pixels[neighbor]);
					if (refColor[k] > max2 && neighbor != maxi[k]) {
						max2 = refColor[k];
						maxi2 = neighbor;
					}
				}
			}
			if (maxi2 != i) {
				var diff = Math.floor((max2 - color[k]) / 2);
				if (diff > 0) {
					color[k] += diff;
					pixels[i] = encodeColor(color);
					var other = splitColor(pixels[maxi2]);
					other[k] -= diff;
					pixels[maxi2] = encodeColor(other);
				}
			}
		}
	}
}

var directionVectors = [
	-canvas.width, -1, 1, canvas.width
];
var transferVectors = [
	-canvas.width - 1, canvas.width - 1, 
	-canvas.width + 1, canvas.width + 1
];

function updatePixelTransfer5(i) {
	var color = splitColor(pixels[i]);
	var refColor = -1;
	for (var k = 0; k < 3; k++) {
		if (color[k] == 255) {
			for (var j = 0; j < directionVectors.length; j++) {
				var neighbor = i + directionVectors[j];
				if (0 <= neighbor && neighbor < pixels.length) {
					refColor = splitColor(pixels[neighbor]);
					if (refColor[k] < 150) {
						var ti = i + transferVectors[j];
						if (0 <= ti && ti < pixels.length) {
							var source = splitColor(pixels[ti]);
							if (source[k] > 0) {
								var diff = Math.min(source[k], 150 - refColor[k]);
								source[k] -= diff;
								pixels[ti] = encodeColor(source);
								refColor[k] += diff;
								pixels[neighbor] = encodeColor(refColor);
							}
						}
					}
				}
			}
		} else if (color[k] >= 150) {
			var si = i;
			var di = i;
			for (var j = 0; j < directionVectors.length; j++) {
				var neighbor = i + directionVectors[j];
				var oi = i - directionVectors[j];
				if (0 <= neighbor && neighbor < pixels.length && 0 <= oi && oi < pixels.length) {
					refColor = splitColor(pixels[oi]);
					if (refColor[k] > color[k]) {
						si = oi;
						di = neighbor;
						break;
					}
				}
			}
			if (di != i) {
				var max = color[k] - 1;
				refColor = splitColor(pixels[di]);
				if (refColor[k] < max) {
					for (var j = 0; j < neighborVectors.length && refColor[k] < max; j++) {
						var neighbor = i + neighborVectors[j];
						if (0 <= neighbor && neighbor < pixels.length 
							&& neighbor != si && neighbor != di) {
							var source = splitColor(pixels[neighbor]);
							if (source[k] > 0) {
								var diff = Math.min(source[k], max - refColor[k]);
								source[k] -= diff;
								pixels[neighbor] = encodeColor(source);
								refColor[k] += diff;
								pixels[di] = encodeColor(refColor);
							}
						}
					}
					if ((color[k] - refColor[k]) > 2) {
						var sum = color[k] + refColor[k];
						var avg = sum / 2;
						avg = sum % 2 == 1 ? Math.floor(avg) : (avg - 1);
						var diff = Math.min(color[k] - 150, avg - refColor[k]);
						color[k] -= diff;
						pixels[i] = encodeColor(color);
						refColor[k] += diff;
						pixels[di] = encodeColor(refColor);
					}
				}
			}
		}
	}
}

function updatePixelTransfer61(i, k) {
	var color = splitColor(pixels[i]);
	var refColor = -1;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			var kv = (neighbor % canvas.width) % 3;
			var kh = Math.floor(neighbor / canvas.width) % 3;
			var diff = Math.min(255 - color[k], (k == kv || k == kh) ? Math.floor((refColor[k] - color[k]) / 2) : refColor[k]);
			if (diff > 0) {
				color[k] += diff;
				pixels[i] = encodeColor(color);
				refColor[k] -= diff;
				pixels[neighbor] = encodeColor(refColor);
				break;
			}
		}
	}
}

function updatePixelTransfer6(i) {
	updatePixelTransfer61(i, (i % canvas.width) % 3);
	updatePixelTransfer61(i, Math.floor(i / canvas.width) % 3);
}

function setColor(col, val) {
	var result = [];
	result[pixels.length-1] = 0;
	for (var i = 0; i < pixels.length; i++) {
		var color = splitColor(pixels[i]);
		color[col] = val;
		result[i] = encodeColor(color);
	}
	return result;
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

var updatePixelFunction = updatePixelTransfer;

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
			updatePixelFunction(i);
		}
	}
	drawCanvas(canvas);
	var iterSpan = document.getElementById("iter-span");
	iterSpan.innerText = parseInt(iterSpan.innerText) + 1;
	drawZoomCanvas();
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
	var checkedCenter = document.querySelector('input[name=center]:checked');
	if (checkedCenter) {
		colorCenter[checkedCenter.value] = [event.offsetX, event.offsetY];
		randomBlur = false;
	} else {
		setZoomCenter(event.offsetX, event.offsetY);
	}
}

function onClickZoomCanvas(event) {
	var x = Math.floor(event.offsetX / ZOOM_LEVEL);
	var y = Math.floor(event.offsetY / ZOOM_LEVEL);
	var color = splitColor(pixels[zoomOffset + y*canvas.width + x]);
	document.getElementById("col-div").innerText = "R: " + color[0] + " G: " + color[1] + " B: " + color[2];
}

onClickReset();

