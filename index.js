const vm = new Vue({
	el: '#app',
	data: {
		rows: [],
		highestColorSlot: 0,
		highestshadeSlot: 0,
		targetColor: null,
		targetRow: null,
		calcFromFurthestHue: false,
		//mainColor: null
		previewImg: null,
		colorProfilesMainColors: [[]],
		ranges: [],
		selectedColorProfile: 0,
	},
	methods: {
		parseGMLCodeToColorProfiles: function() {
			console.log("parseGMLCodeToColorProfiles()")
			const txt = document.getElementById('txtinputGML').value.replace(/\s/g, '');

			//'(?:' means a non-capturing group
			const reg = /set_color_profile_slot\(((?:\d{1,3},){4}\d{1,3})\);/g
			var result;
			while ((result = reg.exec(txt)) !== null) {
				const [colorProfileSlot, shadeSlot, r, g, b] = result[1].split(',');
				const rgb = {r, g, b};

				if (!this.colorProfilesMainColors[colorProfileSlot])
					this.colorProfilesMainColors[colorProfileSlot] = [];

				console.log("adding shade", colorProfileSlot, shadeSlot, rgb)

				this.colorProfilesMainColors[colorProfileSlot][shadeSlot] = {rgb, hsv: rgbToHsv(rgb.r, rgb.g, rgb.b)};
			}

			this.$forceUpdate();
			this.generateGmlCode();
			console.log("parseGMLCodeToColorProfiles", this.colorProfilesMainColors)
		},
		parseJSONInputToPalette: function() {
			console.log("parseJSONInputToPalette()")
			const txt = document.getElementById('txtinputJSON').value;
			this.rows = [];

			try {
				this.rows = JSON.parse(txt);

				console.log("checking", this.rows.length, "rows")
				for (let i = 0; i < this.rows.length; i++) {
					if (this.rows[i] == null)
						this.rows[i] = {name: "unnamed color row", colors: []}
					else {
						const row = this.rows[i];
						console.log("checking", row.colors.length, "colors")
						for (let i2 = 0; i2 < row.colors.length; i2++) {
							console.log("beep", i2, row.colors.length, i2 <= row.colors.length)
							if (row.colors[i2] == null)
								row.colors[i2] = {r: 0, g: 0, b: 0};
							else if (row.colors[i2].isTarget)
								this.setTargetColor(row.colors[i2], row);
						}
					}
				}

				console.log("done parsing");
			} catch(e) {
				console.error("unable to parse input", e)
				this.rows = [];
			}

			this.generateGmlCode();
		},
		addRow: function() {
			this.rows.push({name: "unnamed color row", colors: []})
			this.updateInput();
		},
		addSlot: function(inRow) {
			const len = inRow.colors.push({r: 0, g: 0, b: 0});
			this.setTargetColor(inRow.colors[len - 1], inRow);

			this.$forceUpdate();
			this.updateInput();
		},
		clickOnColor: function(event, colorSlot, row) {
			console.log("clickOnColor", arguments)

			if (event.ctrlKey)
				this.setMainColor(colorSlot, row);
			else
				this.setTargetColor(colorSlot, row);
		},
		setMainColor: function(colorSlot, row) {
			console.log("setMainColor", colorSlot, row)

			if (colorSlot.main) {
				colorSlot.main = false;
			} else {
				row.colors.forEach(color => color.main = false);
				colorSlot.main = true;
				//this.mainColor = colorSlot;
			}

			this.$forceUpdate();
			this.generateGmlCode();
			this.updateInput();
		},
		setTargetColor: function(colorSlot, row) {
			console.log("setTargetColor", colorSlot, row)
			document.getElementById('colorInputR').value = colorSlot.r || 0;
			document.getElementById('colorInputG').value = colorSlot.g || 0;
			document.getElementById('colorInputB').value = colorSlot.b || 0;
			
			if (this.targetColor)
				this.targetColor.isTarget = false;

			colorSlot.isTarget = true;

			this.targetColor = colorSlot;
			this.targetRow = row;

			this.setHSVDisplay(colorSlot);
			this.updateInput();
		},
		setHSVDisplay: function(color) {
			const hsv = rgbToHsv(color.r, color.g, color.b);
			document.getElementById('hsv').innerText = `hsv(${hsv.h}°, ${hsv.s}%, ${hsv.v}%)`;

			/*const mainColor = this.rows
			if (this.mainColor) {
				const hsvMain = rgbToHsv(this.mainColor.r, this.mainColor.g, this.mainColor.b);
				document.getElementById('range').innerText = `range(${getRange(hsv.h, hsvMain.h)}, ${getRange(hsv.h, hsvMain.h)}, ${getRange(hsv.h, hsvMain.h)})`;
				
			}*/
		},
		inputColorChange: function() {
			console.log("inputColorChange()", this.targetColor);
			if (this.targetColor) {
				//ghetto yolo
				const ciR = document.getElementById('colorInputR')
				const ciG = document.getElementById('colorInputG')
				const ciB = document.getElementById('colorInputB')

				ciR.value = parseInt(ciR.value.replace(/[^\d]/g, "") || 0);
				ciG.value = parseInt(ciG.value.replace(/[^\d]/g, "") || 0);
				ciB.value = parseInt(ciB.value.replace(/[^\d]/g, "") || 0);

				this.targetColor.r = Math.min(255, ciR.value);
				this.targetColor.g = Math.min(255, ciG.value);
				this.targetColor.b = Math.min(255, ciB.value);

				this.setHSVDisplay(this.targetColor);
				this.$forceUpdate();
				this.generateGmlCode();
				this.updateInput();
			} else {
				console.warn("color input but no target color set")
			}
		},
		deleteColor: function() {
			console.log("deleteColor()");

			if (this.targetColor) {
				if (this.targetRow) {
					console.log("target row:", this.targetRow.colors)
					const colorIndex = this.targetRow.colors.indexOf(this.targetColor);

					if (colorIndex >= 0) {
						this.targetRow.colors.splice(colorIndex, 1);

						this.$forceUpdate();
						this.generateGmlCode();
						this.updateInput();
					}
					else
						console.warn("deleteColor() couldn't find color in row");
				}
				else
					console.warn("deleteColor() called but targetRow not set");
			} else
				console.warn("deleteColor() called but targetColor not set");
		},
		changeRowName: function(event, row) {
			event.target.innerText = event.target.innerText.replace(/\n/g, "");
			row.name = event.target.innerText;

			this.generateGmlCode();
			this.updateInput();
		},
		deleteRow: function(iRow) {
			this.rows.splice(iRow, 1);

			this.generateGmlCode();
			this.updateInput();
		},
		generateGmlCode: function() {
			console.log("generateGmlCode()")
			this.colorProfilesMainColors[0] = [];
			this.ranges = [];
			var str = "// DEFAULT COLOR";

			this.rows.forEach((row, iRow) => {
				const HSVs = [];
				var HSVMain = null;

				row.colors.forEach((color, iCol) => {
					const HSV = rgbToHsv(color.r, color.g, color.b);
					HSVs.push(HSV);

					if (color.main) {
						this.colorProfilesMainColors[0][iRow] = { hsv: HSV, rgb: {r: color.r, g: color.g, b: color.b} };
						HSVMain = HSV;
						str += `\n\n// ${row.name}\nset_color_profile_slot( 0, ${iRow}, ${color.r}, ${color.g}, ${color.b} );`;
					}
				})


				if (HSVMain) {
					console.info("calculating range for", row.name, iRow);
					const highest = this.calcHSVRange(HSVs, HSVMain);

					str += `\nset_color_profile_slot_range( ${iRow}, ${highest.h + 1}, ${highest.s + 1}, ${highest.v + 1} );`;
					this.colorProfilesMainColors[0][iRow].hsv = HSVMain;
					this.ranges[iRow] = {
						hL: wrap(360, HSVMain.h - highest.h - 1),
						hH: wrap(360, HSVMain.h + highest.h + 1),
						sL: Math.max(0, HSVMain.s - highest.s - 1),
						sH: Math.min(100, HSVMain.s + highest.s + 1),
						vL: Math.max(0, HSVMain.v - highest.v - 1),
						vH: Math.min(100, HSVMain.v + highest.v + 1),
					}
				} else {
					str += `\n\n// ${row.name}\n// (no main color selected)`;
					this.colorProfilesMainColors[0][iRow] = null;
				}

				
			})

			document.getElementById('txtoutput').value = str;
		},
		calcHSVRange: function(HSVArray, HSVMain) {
			var highestRanges = {h: 0, s: 0, v: 0};
			var furthestHSV = HSVMain;

			HSVArray.forEach(HSV => {
				const hueDistance = getHueDistance(HSVMain.h, HSV.h) || 0; //brok on blak
				console.info("hsv", HSV, HSVArray.length, "distance from main:", hueDistance)
	
				if (this.calcFromFurthestHue) {
					if (hueDistance > highestRanges.h) {
						highestRanges.h = hueDistance;
						highestRanges.s = getRange(HSV.s, HSVMain.s);
						highestRanges.v = getRange(HSV.v, HSVMain.v);
					}
				} else {
					highestRanges.h = Math.max(hueDistance, highestRanges.h);
					highestRanges.s = Math.max(getRange(HSV.s, HSVMain.s), highestRanges.s);
					highestRanges.v = Math.max(getRange(HSV.v, HSVMain.v), highestRanges.v);
				}
			});

			return highestRanges;
		},
		updateInput: function() {
			console.log("updateInput()")
			document.getElementById('txtinputJSON').value = JSON.stringify(this.rows, null, 4);
		},
		loadFilePreview: function(event) {
			const pix = event.target.files[0];
			const r = new FileReader();

			r.onload = () => {
				if (!this.previewImg) {
					this.previewImg = new Image();
					this.previewImg.onload = this.renderPreview;
				}
				this.previewImg.src = r.result;
			};

			r.readAsDataURL(pix);
		},
		renderPreview: function() {
			console.log("rendering.....");
			const canvas = document.getElementById("preview");
			const ctx = canvas.getContext('2d');

			const width = this.previewImg.width;
			const height = this.previewImg.height;

			ctx.clearRect(0, 0, width, height);
			ctx.drawImage(this.previewImg, 0, 0)//, width, height);

			
			if (this.selectedColorProfile != 0) {
				const imageData = ctx.getImageData(0, 0, width, height);
				const dataArray = imageData.data;
				console.log(imageData, "going to loop", dataArray.length / 4);

				for (var i = 0; i < dataArray.length; i += 4) { //this is so ghetto I'm game
					//console.log('px', i)
					const hsv = rgbToHsv(dataArray[i], dataArray[i+1], dataArray[i+2]);

					this.ranges.some((rangeDef, shadeIndex) => {
						//console.log("px", i, "on shade", shadeIndex);
						if(hsv.h >= rangeDef.hL && hsv.h <= rangeDef.hH
						&& hsv.s >= rangeDef.sL && hsv.s <= rangeDef.sH
						&& hsv.v >= rangeDef.vL && hsv.v <= rangeDef.vH
						) {
							const defaultColorForShade = this.colorProfilesMainColors[0][shadeIndex];
							const mainColorForShade = this.colorProfilesMainColors[this.selectedColorProfile][shadeIndex];

							const stepHue = getHueDistance(hsv.h, defaultColorForShade.hsv.h); //todo need to handle direction????
							const steppedHue = hsv.h > mainColorForShade.hsv.h ? mainColorForShade.hsv.h - stepHue : mainColorForShade.hsv.h + stepHue;
							hsv.h = wrap(360, steppedHue);

							const stepSat = hsv.s - defaultColorForShade.hsv.s;
							hsv.s = Math.max(0, Math.min(100, mainColorForShade.hsv.s + stepSat));

							const stepVal = hsv.v - defaultColorForShade.hsv.v;
							hsv.v = Math.max(0, Math.min(100, mainColorForShade.hsv.v + stepVal));

							const shiftedRgb = HSVtoRGB(hsv.h / 360, hsv.s / 100, hsv.v / 100);
							dataArray[i] = shiftedRgb.r;
							dataArray[i+1] = shiftedRgb.g;
							dataArray[i+2] = shiftedRgb.b;

							//console.log("px", i, "fitting rangeDef", hsv, mainColorForShade.hsv, step, shiftedRgb)
							return true;
						}
					})
				}

				console.log("drawing recolored image");
	    		ctx.putImageData(imageData, 0, 0);
	    	}
		},
	}
});

// https://github.com/semibran/wrap-around im idiot
function wrap(m, n) {
  return n >= 0 ? n % m : (n % m + m) % m
}

function getRange(n1, n2) {
	return n1 > n2 ? n1 - n2 : n2 - n1;
}

// https://stackoverflow.com/questions/35113979/calculate-distance-between-colors-in-hsv-space/35114586#35114586
function getHueDistance(h0, h1) {
	return Math.min( Math.abs(h1 - h0), 360 - Math.abs(h1 - h0) )
}

// based on https://stackoverflow.com/questions/2348597/why-doesnt-this-javascript-rgb-to-hsl-code-work/2348659#2348659
function rgbToHsv(r, g, b) {
	const min = Math.min(r, g, b);
	const max = Math.max(r, g, b);
	const delta = max - min;
	var h = s = v = 0;

	if (max == 0) // black
		return {h, s, v};

	v = Math.round(max / 255 * 100);
	s = Math.round(delta / max * 100);

	if (delta == 0)
		h = 0;
	else if (r == max)
		h = (g - b) / delta;		 // between yellow & magenta
	else if (g == max)
		h = 2 + (b - r) / delta;	 // between cyan & yellow
	else
		h = 4 + (r - g) / delta;	 // between magenta & cyan

	h = Math.round(h * 60);			// degrees
	if (h < 0) h += 360;

	return {h, s, v};
}

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
*/
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}