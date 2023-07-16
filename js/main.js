// Create the canvas
var canvas = document.getElementById("myCanvas");
var similarInput = document.getElementById("similar-input");
var drawRadio = document.querySelector('input[name=clickaction][value=draw]');
var drawCheck = document.getElementById("draw-check");
var randomCheck = document.getElementById("random-check");

var COLOR_DIFF = 5;
var MOVE_DIFF = 5;

var pixels = [];
pixels[(canvas.height * canvas.width) - 1] = 0; // sets pixels.length

var neighborVectors = [
	-canvas.width - 1, -canvas.width, -canvas.width + 1,
	-1, 1,
	canvas.width - 1, canvas.width, canvas.width + 1
];

var timer;
var colorCenter = [];
var similarCountTotal = 0;

var mouseDown = false;
var drawColor = 0;

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

function updatePixelRandomFade(i) {
	var similarCount = countSimilarColor(i);
	if (similarCount < 4) {
		updatePixelAverage(i);
	} else if (similarCount > 4) {
		updatePixelRandom(i);
		similarCountTotal++;
	}
}

function beforePixelUpdate() {
	if (randomCheck.checked) {
		shuffle(neighborVectors);
		for (var k = 0; k < 3; k++) {
			if (colorCenter[k]) {
				colorCenter[k][0] = randomIntInRange(Math.max(0, colorCenter[k][0] - MOVE_DIFF), Math.min(canvas.width - 1, colorCenter[k][0] + MOVE_DIFF));
				colorCenter[k][1] = randomIntInRange(Math.max(0, colorCenter[k][1] - MOVE_DIFF), Math.min(canvas.height - 1, colorCenter[k][1] + MOVE_DIFF));
			} else {
				colorCenter[k] = [randomIntInRange(0, canvas.width - 1), randomIntInRange(0, canvas.height - 1)];
			}
		}
	}
}

function transferToCenter(i, k, color) {
	if (colorCenter[k]) {
		if (color[k] == 0) {
			return false;
		}
		var pos = [i % canvas.width, Math.floor(i / canvas.width)];
		if (colorCenter[k][0] == pos[0] && colorCenter[k][1] == pos[1]) {
			return false;
		}
		var v = [colorCenter[k][0] - pos[0], colorCenter[k][1] - pos[1]];
		var dist = Math.sqrt(v[0]**2 + v[1]**2);
		v = [Math.round(v[0] / dist), Math.round(v[1] / dist)];
		var neighbor = (pos[1] + v[1])*canvas.width + (pos[0] + v[0]);
		var other = splitColor(pixels[neighbor]);
		var diff = Math.min(color[k], 255 - other[k]);
		if (diff > 0) {
			color[k] -= diff;
			pixels[i] = encodeColor(color);
			other[k] += diff;
			pixels[neighbor] = encodeColor(other);
			return true;
		}
	}
	return false;
}

function transferMaxColor(i, k, color) {
	var max = color[k] + parseInt(similarInput.value);
	var maxi = i;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			if (drawCheck.checked && pixels[neighbor] == drawColor) {
				continue;
			}
			var refColor = splitColor(pixels[neighbor]);
			if (refColor[k] > max) {
				max = refColor[k];
				maxi = neighbor;
			}
		}
	}
	if (maxi == i) {
		return;
	}
	var diff = Math.floor((max - color[k]) / 2);
	if (diff > 0) {
		color[k] += diff;
		pixels[i] = encodeColor(color);
		var other = splitColor(pixels[maxi]);
		other[k] -= diff;
		pixels[maxi] = encodeColor(other);
	}
}

function updatePixelTransfer(i) {
	if (drawCheck.checked && pixels[i] == drawColor) {
		return;
	}
	var color = splitColor(pixels[i]);
	for (var k = 0; k < 3; k++) {
		if (!transferToCenter(i, k, color)) {
			transferMaxColor(i, k, color);
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

function updatePixelWater(i) {
	var color = splitColor(pixels[i]);
	var refColor = -1;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			var diff = Math.floor((refColor[1] + refColor[2] - color[1] - color[2]) / 2);
			diff = Math.min(refColor[2], 255 - color[2], diff);
			if (diff > 0) {
				color[2] += diff;
				pixels[i] = encodeColor(color);
				refColor[2] -= diff;
				pixels[neighbor] = encodeColor(refColor);
			}
		}
	}
	if (color[0] <= similarInput.value) {
		color[2] += Math.min(similarInput.value, 255 - color[2]);
		pixels[i] = encodeColor(color);
	}
	if (color[0] >= 255 - similarInput.value) {
		color[2] -= Math.min(similarInput.value, color[2]);
		pixels[i] = encodeColor(color);
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

function updatePixelBurn(i) {
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
	if (color[0] > 0) {
		if (color[2] > 0) {
			color[0] = Math.max(color[0] - similarInput.value, 0);
			color[2] = Math.max(color[2] - similarInput.value, 0);
		} else if (color[1] > 0) {
			color[0] = Math.min(color[0] + parseInt(similarInput.value), 255);
			color[1] = Math.max(color[1] - similarInput.value, 0);
		} else {
			color[0] = Math.max(color[0] - similarInput.value, 0);
		}
		pixels[i] = encodeColor(color);
	}
}

function updatePixelEco(i) {
	var color = splitColor(pixels[i]);
	if (color[0] > 0) {
		var move = i;
		if (color[0] < 180) {
			for (var j = 0; j < neighborVectors.length; j++) {
				var neighbor = i + neighborVectors[j];
				if (0 <= neighbor && neighbor < pixels.length) {
					var other = splitColor(pixels[neighbor]);
					if (other[0] == 0) {
						move = neighbor;
						if (other[2] > 0) {
							var col = color[0] + other[2];
							if (col > 255) {
								other[0] = 255;
								color[0] = col - 255;
							} else {
								color[0] = col;
							}
							other[2] = 0;
							pixels[neighbor] = encodeColor(other);
							pixels[i] = encodeColor(color);
							return;
						}
					}
				}
			}
		}
		color[0] = Math.max(color[0] - 5, 0);
		pixels[i] = encodeColor(color);
		if (color[0] == 0) {
			return;
		}
		if (move != i) {
			var other = splitColor(pixels[move]);
			other[0] = color[0];
			pixels[move] = encodeColor(other);
			color[0] = 0;
			pixels[i] = encodeColor(color);
		}
	} else if (color[2] > 0) {
		var leave = 0;
		if (color[1] > 0) {
			var col = Math.min(color[1], similarInput.value);
			color[1] -= col;
			col = color[2] + col;
			if (col > 255) {
				color[2] = 255;
				leave = col - 255;
			} else {
				color[2] = col;
			}
		} else {
			leave = color[2];
			color[2] = 0;
		}
		if (leave > 0) {
			for (var j = 0; j < neighborVectors.length; j++) {
				var neighbor = i + neighborVectors[j];
				if (0 <= neighbor && neighbor < pixels.length) {
					var other = splitColor(pixels[neighbor]);
					if (other[0] == 0 && other[1] > 0 && other[2] == 0) {
						other[2] = leave;
						pixels[neighbor] = encodeColor(other);
						pixels[i] = encodeColor(color);
						return;
					}
				}
			}
			if (color[2] == 0) {
				color[2] = Math.max(leave - similarInput.value, 0);
			}
		}
		pixels[i] = encodeColor(color);
	} else {
		color[1] = Math.min(color[1] + 1, 150);
		pixels[i] = encodeColor(color);
	}
}

function updatePixelVege(i) {
	var color = splitColor(pixels[i]);
	if (color[2] > 0) {
		var refColor = -1;
		var maxb = color[2];
		var maxbi = i;
		for (var j = 0; j < neighborVectors.length; j++) {
			var neighbor = i + neighborVectors[j];
			if (0 <= neighbor && neighbor < pixels.length) {
				refColor = splitColor(pixels[neighbor]);
				if (refColor[2] > maxb) {
					maxb = refColor[2];
					maxbi = neighbor;
				}
			}
		}
		if (maxbi != i) {
			var diff = Math.floor((maxb - color[2]) / 2);
			if (diff > 0) {
				color[2] += diff;
				pixels[i] = encodeColor(color);
				var other = splitColor(pixels[maxbi]);
				other[2] -= diff;
				pixels[maxbi] = encodeColor(other);
			}
		}
		return;
	}
	var refColor = -1;
	var maxg = 0;
	var maxgi = i;
	var maxb = 0;
	var maxbi = i;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			if (refColor[1] > maxg) {
				maxg = refColor[1];
				maxgi = neighbor;
			}
			if (refColor[2] > maxb) {
				maxb = refColor[2];
				maxbi = neighbor;
			}
		}
	}
	if (maxb > 200) {
		var diff = Math.floor(maxb / 2);
		pixels[i] = encodeColor([0, 0, diff]);
		var other = splitColor(pixels[maxbi]);
		other[2] -= diff;
		pixels[maxbi] = encodeColor(other);
		return;
	}
	maxb = Math.max(maxb, maxg - 10);
	color[0] = Math.round((255 - maxb) / 3);
	color[1] = Math.max(maxb, 50);
	pixels[i] = encodeColor(color);
}

function getMaxColor(color) {
	if (color[0] > color[1] && color[0] > color[2]) {
		return 0;
	} else if (color[1] > color[0] && color[1] > color[2]) {
		return 1;
	} else if (color[2] > color[0] && color[2] > color[1]) {
		return 2;
	} else {
		return -1;
	}
}

function updatePixelFront(i) {
	var color = splitColor(pixels[i]);
	var k = getMaxColor(color);
	for (var c = 0; c < 3; c++) {
		if (c == k) continue;
		var refColor = -1;
		var max = color[c];
		var maxi = i;
		for (var j = 0; j < neighborVectors.length; j++) {
			var neighbor = i + neighborVectors[j];
			if (0 <= neighbor && neighbor < pixels.length) {
				refColor = splitColor(pixels[neighbor]);
				if (getMaxColor(refColor) != c && refColor[c] > max) {
					max = refColor[c];
					maxi = neighbor;
				}
			}
		}
		if (maxi != i) {
			var diff = Math.floor((max - color[c]) / 2);
			if (diff > 0) {
				color[c] += diff;
				pixels[i] = encodeColor(color);
				var other = splitColor(pixels[maxi]);
				other[c] -= diff;
				pixels[maxi] = encodeColor(other);
			}
		}
	}
	if (k == -1 || color[k] == 255) {
		return;
	}
	var refColor = -1;
	var max = color[k];
	var maxi = i;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			if (refColor[k] == 0) continue;
			if (getMaxColor(refColor) == k) {
				if (refColor[k] > max) {
					max = refColor[k];
					maxi = neighbor;
				}
			} else {
				var diff = Math.min(refColor[k], 255 - color[k]);
				color[k] += diff;
				pixels[i] = encodeColor(color);
				refColor[k] -= diff;
				pixels[neighbor] = encodeColor(refColor);
				if (color[k] == 255) {
					return;
				}
			}
		}
	}
	if (maxi != i) {
		var diff = Math.floor((max - color[k]) / 2);
		if (diff > 0) {
			color[k] += diff;
			pixels[i] = encodeColor(color);
			var other = splitColor(pixels[maxi]);
			other[k] -= diff;
			pixels[maxi] = encodeColor(other);
		}
	}
}

function getOnlyColor(color) {
	if (color[1] == 0 && color[2] == 0 && color[0] > 0) {
		return 0;
	} else if (color[0] == 0 && color[2] == 0 && color[1] > 0) {
		return 1;
	} else if (color[0] == 0 && color[1] == 0 && color[2] > 0) {
		return 2;
	} else {
		return -1;
	}
}

function updatePixelArea(i) {
	var color = splitColor(pixels[i]);
	var k = getOnlyColor(color);
	if (k == -1) {
		return;
	}
	var refColor = -1;
	var max = color[k] + 1;
	var maxi = i;
	for (var j = 0; j < neighborVectors.length; j++) {
		var neighbor = i + neighborVectors[j];
		if (0 <= neighbor && neighbor < pixels.length) {
			refColor = splitColor(pixels[neighbor]);
			var kt = getOnlyColor(refColor);
			if (kt == -1) {
				var diff = Math.min(similarInput.value, Math.floor(color[k] / 2));
				if (diff > 0) {
					color[k] -= diff;
					pixels[i] = encodeColor(color);
					refColor[k] = diff;
					pixels[neighbor] = encodeColor(refColor);
				}
			} else if (kt == k) {
				if (refColor[k] > max) {
					max = refColor[k];
					maxi = neighbor;
				}
			} else {
				var diff = Math.min(similarInput.value, color[k], refColor[kt]);
				if (diff > 0) {
					color[k] -= diff;
					pixels[i] = encodeColor(color);
					refColor[kt] -= diff;
					pixels[neighbor] = encodeColor(refColor);
				}
			}
		}
	}
	if (maxi != i) {
		var diff = Math.floor((max - color[k]) / 2);
		if (diff > 0) {
			color[k] += diff;
			pixels[i] = encodeColor(color);
			var other = splitColor(pixels[maxi]);
			other[k] -= diff;
			pixels[maxi] = encodeColor(other);
		}
	} else {
		var diff = Math.min(similarInput.value, 255 - color[k]);
		if (diff > 0) {
			color[k] += diff;
			pixels[i] = encodeColor(color);
		}
	}
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

var beforePixelFunction = beforePixelUpdate;
var updatePixelFunction = updatePixelTransfer;

function drawNew() {
	similarCountTotal = 0;
	
	beforePixelFunction();
	for (var i = 0; i < pixels.length; i++) {
		updatePixelFunction(i);
	}
	
	drawCanvas(canvas);
	
	var iterSpan = document.getElementById("iter-span");
	iterSpan.innerText = parseInt(iterSpan.innerText) + 1;
	document.getElementById("similar-span").innerText = similarCountTotal;
	
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
}

function onChangeFunction(element) {
	switch (element.value) {
		case "center":
			updatePixelFunction = updatePixelTransfer;
			break;
		case "waterland":
			pixels = setColor(0, 0);
			updatePixelFunction = updatePixelTransfer2;
			break;
		case "water":
			updatePixelFunction = updatePixelWater;
			break;
		case "randomfade":
			updatePixelFunction = updatePixelRandomFade;
			break;
		case "burn":
			updatePixelFunction = updatePixelBurn;
			similarInput.value = 20;
			break;
		case "eco":
			updatePixelFunction = updatePixelEco;
			break;
		case "vege":
			pixels = setColor(0, 0);
			pixels = setColor(1, 0);
			updatePixelFunction = updatePixelVege;
			break;
		case "front":
			updatePixelFunction = updatePixelFront;
			break;
		case "area":
			var idx = [0, 1, 2];
			for (var i = 0; i < pixels.length; i++) {
				var color = splitColor(pixels[i]);
				idx.sort(function(a, b) { return color[a] - color[b] });
				color[idx[0]] = 0;
				color[idx[1]] = 0;
				pixels[i] = encodeColor(color);
			}
			updatePixelFunction = updatePixelArea;
			break;
	}
}

function onClickReset() {
	resetColors();
	document.getElementById("iter-span").innerText = "0";
	//drawNew();
	drawCanvas(document.getElementById("origCanvas"));
}

function onClickCanvas(event) {
	var checkedClickAction = document.querySelector('input[name=clickaction]:checked');
	if (!checkedClickAction || checkedClickAction.value == "zoom") {
		setZoomCenter(event.offsetX, event.offsetY);
	} else {
		colorCenter[checkedClickAction.value] = [event.offsetX, event.offsetY];
	}
}

function onClickZoomCanvas(event) {
	var x = Math.floor(event.offsetX / ZOOM_LEVEL);
	var y = Math.floor(event.offsetY / ZOOM_LEVEL);
	var color = splitColor(pixels[zoomOffset + y*canvas.width + x]);
	document.getElementById("col-div").innerText = "R: " + color[0] + " G: " + color[1] + " B: " + color[2];
}

function onMouseDownCanvas(event) {
	mouseDown = true;
}

function onMouseMoveCanvas(event) {
	if (mouseDown && drawRadio.checked) {
		pixels[event.offsetY*canvas.width + event.offsetX] = drawColor;
		var ctx = canvas.getContext("2d");
		ctx.fillStyle = "#" + formatHex(drawColor);
		ctx.fillRect(event.offsetX, event.offsetY, 1, 1);
	}
}

function onMouseUpCanvas(event) {
	mouseDown = false;
	if (drawRadio.checked) {
		drawZoomCanvas();
	}
}

function onResize(event) {
	if (window.fullScreen) {
		document.body.style.backgroundColor = "black";
		document.body.style.textAlign = "center";
		document.body.style.marginTop = "15%";
	} else {
		document.body.style.backgroundColor = "#ddd";
		document.body.style.textAlign = "";
		document.body.style.marginTop = "";
	}
	for (var i = 5; i < document.body.childNodes.length; i++) {
		document.body.childNodes[i].hidden = window.fullScreen;
	}
}
addEventListener("resize", onResize);

onClickReset();

