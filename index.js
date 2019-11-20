const jsonPaletteHeaderStart = "=== BEGIN JSON PALETTE ===";
const jsonPaletteHeaderEnd = "=== END JSON PALETTE ===";
const alternateColorsHeader = "// ALTERNATE COLORS";

const MIN_ALT_PALETTES = 6;
const MAX_ALT_PALETTES = 16;
const MAX_SHADE_ROWS = 8;

const vm = new Vue({
	el: '#app',
	data: {
		rows: [],
		calcFromFurthestHue: false,
		//mainColor: null
		previewImg: null,
		colorProfilesMainColors: [],
		ranges: [],
		selectedColorProfile: 0,
	},
	watch: {
		selectedColorProfile: function() {
			this.renderPreview();
		},
		rows: {
			//not sure if I should have this or just call a function on color-picker's update:r instead of using .sync
			deep: true,
			handler: 'updateInput'
		}
	},
	methods: {
		parseInputGml: function() {
			console.log("parseInputGml")
			const txt = document.getElementById("gmlDisplay").value;

			const paletteDataStart = txt.lastIndexOf(jsonPaletteHeaderStart);
			if (paletteDataStart > -1) {
				const paletteDataTxt = txt.substring(paletteDataStart + jsonPaletteHeaderStart.length, txt.lastIndexOf(jsonPaletteHeaderEnd));
				try {
					const paletteDataJSON = JSON.parse(paletteDataTxt);

					//todo something with paletteDataJSON.formatversion to upgrade data if I ever change the data format

					this.parseJSONInputToPalette(paletteDataJSON.data)
				} catch(e) {
					console.error("parseInputGml: unable to parse json palette", e)
				}
			}

			this.parseGMLCodeToColorProfiles(txt)

		},
		parseGMLCodeToColorProfiles: function(originalTxt) {
			console.log("parseGMLCodeToColorProfiles()")
			const txt = originalTxt
				.replace(/\/\/.*/g, '') //remove single-line comments
				.replace(/\/\*[\S\s]*\*\\/g, '') //remove multi-line comments
				.replace(/[ \t]/g, ''); //remove spaces
			console.log(txt);

			//'(?:' means a non-capturing group
			const reg = /set_color_profile_slot\(((?:\d{1,3},){4}\d{1,3})\);/g
			var result;
			while ((result = reg.exec(txt)) !== null) {
				const [colorProfileSlot, shadeSlot, r, g, b] = result[1].split(',');
				const rgb = {r, g, b};

				if (!this.colorProfilesMainColors[colorProfileSlot])
					this.colorProfilesMainColors[colorProfileSlot] = {shades: []};

				console.log("adding shade", colorProfileSlot, shadeSlot, rgb)

				this.colorProfilesMainColors[colorProfileSlot].shades[shadeSlot] = {
					rgb,
					hsv: rgbToHsv(rgb.r, rgb.g, rgb.b),
					accurateHSV: rgbToHsv_noRounding(rgb.r, rgb.g, rgb.b)
				};
			}

			const regComment = /^\/\/[ \t]*(.*)/g
			var i = 1;
			var reachedAltcolors = false;
			originalTxt.split('\n').forEach(line => {
				if (line.trim().startsWith('//')) { //keep only comments
					if (!line.includes("set_color_profile_slot(") && !line.includes("set_color_profile_slot_range(")) {

						//lazy fix to not include comments before // ALTERNATE COLORS segment (like palette row names)
						if (line.includes(alternateColorsHeader)) {
							reachedAltcolors = true;
							return;
						}

						if (reachedAltcolors) {
							console.log("name:", line)
							if (this.colorProfilesMainColors[i])
								this.colorProfilesMainColors[i].name = line.trim().replace(/^\/\//, '').trim();

							i++;
						}
					}
				}
			})

			this.$forceUpdate();
			this.generateGmlCode();
			console.log("parseGMLCodeToColorProfiles", this.colorProfilesMainColors)
		},
		parseJSONInputToPalette: function(json) {
			console.log("parseJSONInputToPalette()")
			this.rows = [];

			try {
				this.rows = json.splice(0, MAX_SHADE_ROWS);

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

			this.$forceUpdate();
			this.updateInput();
		},
		addColorProfileRow: function() {
			this.colorProfilesMainColors.push({name: this.colorProfilesMainColors.length.toString(), colors: []});
			this.updateInput();
		},
		clickOnColor: function(event, colorSlot, row) {
			console.log("clickOnColor", arguments)

			if (event.ctrlKey) {
				this.setMainColor(colorSlot, row);
			}
		},
		setMainColor: function(colorSlot, row) {
			console.log("setMainColor", colorSlot, row)

			if (colorSlot.main) {
				delete colorSlot.main;
			} else {
				row.colors.forEach(color => delete color.main);
				colorSlot.main = true;
				//this.mainColor = colorSlot;
			}

			this.$forceUpdate();
			this.updateDisplays();
		},
		deleteColor: function(colorSlotIndex, row) {
			console.log("deleteColor()");
			row.colors.splice(colorSlotIndex, 1);

			this.$forceUpdate();
			this.updateDisplays();
		},
		changeRowName: function(event, row) {
			event.target.innerText = event.target.innerText.replace(/\n/g, "");
			row.name = event.target.innerText;

			this.generateGmlCode();
			this.updateInput();
		},
		deleteRow: function(iRow) {
			this.rows.splice(iRow, 1);

			this.updateDisplays();
		},
		changeSlotName: function(event, slot) {
			event.target.innerText = event.target.innerText.replace(/\n/g, "");
			slot.name = event.target.innerText;

			this.generateGmlCode();
			this.updateInput();
		},
		updateDisplays: function() {
			this.generateGmlCode();
			this.updateInput();
			this.renderPreview();
		},
		generateGmlCode: function() {
			console.log("generateGmlCode()")
			this.colorProfilesMainColors[0] = {name: "default", shades: []};
			this.ranges = [];
			var str = "// DEFAULT COLOR";

			this.rows.forEach((row, iRow) => {
				const HSVs = [];
				var HSVMain = null;

				row.colors.forEach((color, iCol) => {
					const HSV = rgbToHsv(color.r, color.g, color.b);
					HSVs.push(HSV);

					if (color.main) {
						this.colorProfilesMainColors[0].shades[iRow] = {
							hsv: HSV,
							accurateHSV: rgbToHsv_noRounding(color.r, color.g, color.b),
							rgb: {r: color.r, g: color.g, b: color.b}
						};
						HSVMain = HSV;
						str += `\n\n// ${row.name}\nset_color_profile_slot( 0, ${iRow}, ${color.r}, ${color.g}, ${color.b} );`;
					}
				})


				if (HSVMain) {
					console.info("calculating range for", row.name, iRow);
					const highest = this.calcHSVRange(HSVs, HSVMain);

					str += `\nset_color_profile_slot_range( ${iRow}, ${highest.h + 1}, ${highest.s + 1}, ${highest.v + 1} );`;
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
					this.colorProfilesMainColors[0].shades[iRow] = null;
				}
			})

			str += "\n\n\n" + alternateColorsHeader;
			str += "\nset_num_palettes( " + clamp(MIN_ALT_PALETTES, this.colorProfilesMainColors.length, MAX_ALT_PALETTES) + " );";

			for (let i = 1; i < this.colorProfilesMainColors.length; i++) {
				const colorSlot = this.colorProfilesMainColors[i];

				str += `\n\n// ${colorSlot.name || i}`;
				colorSlot.shades.forEach((shade, shadeIndex) => {
					str += `\nset_color_profile_slot( ${i}, ${shadeIndex}, ${shade.rgb.r}, ${shade.rgb.g}, ${shade.rgb.b} );`;
					if (this.rows[shadeIndex])
						str += ` //${this.rows[shadeIndex].name}`;
				})
			}

			str += "\n\n\n/* This is used by that one RoA colors.gml generator tool to store palette data\n"
				+ jsonPaletteHeaderStart + "\n"
				+ JSON.stringify({formatversion: 1, data: this.rows})
				+ "\n" + jsonPaletteHeaderEnd + "\n*/\n"

			document.getElementById('gmlDisplay').value = str;
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
			//todo just edit json, don't regenerate gml if unchanged
			this.generateGmlCode()
		},
		loadFilePreview: function(event) {
			const pix = event.target.files[0];
			const r = new FileReader();

			r.onload = () => {
				if (this.previewImg)
					this.clearCanvas();

				this.previewImg = new Image();
				this.previewImg.onload = this.renderPreview;

				this.previewImg.src = r.result;
			};

			r.readAsDataURL(pix);
		},
		clearCanvas: function(ctx) {
			if (!ctx) {
				const canvas = document.getElementById("preview");
				ctx = canvas.getContext('2d');
			}
			
			ctx.clearRect(0, 0, this.previewImg.width, this.previewImg.height);
		},
		renderPreview: function() {
			if (!this.previewImg) {
				console.info("no previewImg to render");
				return;
			}

			console.log("rendering.....");
			const canvas = document.getElementById("preview");
			const ctx = canvas.getContext('2d');

			this.clearCanvas(ctx);

			const width = canvas.width = this.previewImg.width;
			const height = canvas.height = this.previewImg.height;

			ctx.drawImage(this.previewImg, 0, 0)//, width, height);
				
			if (this.selectedColorProfile != 0) {
				const imageData = ctx.getImageData(0, 0, width, height);
				const dataArray = imageData.data;

				const cachedColorTransforms = new Map();

				for (var i = 0; i < dataArray.length; i += 4) { //this is so ghetto I'm game
					//console.log('px', i)
					const r = dataArray[i],
						g = dataArray[i+1],
						b = dataArray[i+2],
						hsv = rgbToHsv(r, g, b);

					const cachedColor = cachedColorTransforms.get(`${r},${g},${b}`);
					if (cachedColor) {
						dataArray[i] = cachedColor.r;
						dataArray[i+1] = cachedColor.g;
						dataArray[i+2] = cachedColor.b;

						continue ;
					}

					this.ranges.some((rangeDef, shadeIndex) => {
						//console.log("px", i, "on shade", shadeIndex);
						if(hsv.h >= rangeDef.hL && hsv.h <= rangeDef.hH
						&& hsv.s >= rangeDef.sL && hsv.s <= rangeDef.sH
						&& hsv.v >= rangeDef.vL && hsv.v <= rangeDef.vH
						) {
							const mainColorForShade = this.colorProfilesMainColors[this.selectedColorProfile].shades[shadeIndex];

							//don't shade shift if current color is same as main color
							if (r === mainColorForShade.rgb.r && g === mainColorForShade.rgb.g && b === mainColorForShade.rgb.b)
								return true;

							const defaultColorForShade = this.colorProfilesMainColors[0].shades[shadeIndex];

							//don't shade shift if main color is same as default color
							if(defaultColorForShade.rgb.r === mainColorForShade.rgb.r
							&& defaultColorForShade.rgb.g === mainColorForShade.rgb.g
							&& defaultColorForShade.rgb.b === mainColorForShade.rgb.b)
								return true;


							const accurateHSV = rgbToHsv_noRounding(r, g, b);

							const stepHue = defaultColorForShade.accurateHSV.h - accurateHSV.h;
							accurateHSV.h = mainColorForShade.accurateHSV.h - stepHue;
							if (accurateHSV.h < 0 || accurateHSV.h > 1)
								accurateHSV.h = wrap(1, accurateHSV.h);

							const stepSat = defaultColorForShade.accurateHSV.s - accurateHSV.s;
							accurateHSV.s = Math.max(0, Math.min(1, mainColorForShade.accurateHSV.s - stepSat));

							const stepVal = defaultColorForShade.accurateHSV.v - accurateHSV.v;
							accurateHSV.v = Math.max(0, Math.min(1, mainColorForShade.accurateHSV.v - stepVal));

							const shiftedRgb = hsvToRgb_noRounding(accurateHSV.h, accurateHSV.s, accurateHSV.v);
							dataArray[i] = shiftedRgb.r;
							dataArray[i+1] = shiftedRgb.g;
							dataArray[i+2] = shiftedRgb.b;

							cachedColorTransforms.set(`${r},${g},${b}`, shiftedRgb);

							//console.log("px", i, "fitting rangeDef", hsv, mainColorForShade.hsv, step, shiftedRgb)
							return true;
						}
					})
				}

				console.log("drawing recolored image");
				ctx.putImageData(imageData, 0, 0);
			}
		},
		previewClick: function(ev) {
			const canvas = document.getElementById("preview");

			const relX = ev.x + window.scrollX - canvas.offsetLeft;
			const relY = ev.y + window.scrollY - canvas.offsetTop;

			const ctx = canvas.getContext('2d');

			const imageData = ctx.getImageData(relX, relY, 1, 1);
			const [r, g, b, a] = imageData.data;

			document.getElementById("colorPickDisplay").innerText = `${r}, ${g}, ${b}, ${a}`;
		}
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

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 * https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv_noRounding(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {h, s, v};
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 * https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb_noRounding(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {r: r * 255, g: g * 255, b: b * 255};
}

function clamp(min, nb, max) {
	return Math.max(Math.min(max, nb), min);
}


Vue.component("color-picker", {
	template: "#color-picker-template",
	props: ["change", "r", "g", "b"],
	data: function() {
		return {
			isVisible: false,
		}
	},
	computed: {
		color: function() { return `rgb(${this.r}, ${this.g}, ${this.b})` }
	},
	methods: {
		show: function() { this.isVisible = true; },
		hide: function() { this.isVisible = false; },
		toggle: function() { this.isVisible = !this.isVisible; },
		validateAndSendRgbColorUpdate: function(event, color) {
			event.target.value = parseInt(event.target.value.toString().replace(/[^\d]/g, "") || 0);
			event.target.value = Math.min(255, event.target.value);
			this.$emit("update:" + color, parseInt(event.target.value));
		},
		validateAndUpdateHex: function(event) {
			console.log("todo")
		}
	}
})
