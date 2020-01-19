const jsonPaletteHeaderStart = "=== BEGIN JSON PALETTE ===";
const jsonPaletteHeaderEnd = "=== END JSON PALETTE ===";
const alternateColorsHeader = "// ALTERNATE COLORS";

const MIN_ALT_PALETTES = 6;
const MAX_ALT_PALETTES = 16;
const MAX_SHADE_ROWS = 8;
const PIC_PIXELS_TRESHOLD_FOR_WARNING = 100000;
const PIC_RECOLOR_PIXELS_TRESHOLD_FOR_WARNING = 1000000;
const PIC_COLORS_TRESHOLD_FOR_WARNING = 100;
const PIC_COLORS_ACTUAL_TRESHOLD = PIC_COLORS_TRESHOLD_FOR_WARNING + PIC_COLORS_TRESHOLD_FOR_WARNING / 2;


/* 
	this is a mess of synchronization
	_r, _g, _b are sync'd with the actual palette/shade rgb, when they change r, g, b are updated to match
	r, g, b are proxies used to generate the color_chip's color (and shown in the r, g, b inputs), because you can't (/shouldn't) set prop values
	when h, s, v change(as in 'input' is triggered from sliding the controls) it changes r, g, b and doesn't actually update the palette, but updates the r,g,b inputs and the color chip
	when h, s, v are set (as in 'change' is triggered by mouseUp on the controls), it updates _r, _g, _b which syncs the palette and redraws render and syncs r, g, b which updates the chip
	so the sliders are kind of inaccurate because of all the conversions but they're sliders anyway
	hex is updated the same way as HSV
*/
Vue.component("color-picker", {
	template: "#color-picker-template",
	props: ["change", "_r", "_g", "_b", "readonly", "showpalettecontrols"],
	data: function() {
		return {
			isVisible: false,

			r: 0,
			g: 0,
			b: 0,

			h: 0,
			s: 0,
			v: 0,
			hex: "000"
		}
	},
	directives: {
		focus: { inserted: function(el) { el.focus(); } }
	},
	computed: {
		color: function() { return `rgb(${this.r}, ${this.g}, ${this.b})` },
		rgb: function() { return {r: this.r, g: this.g, b: this.b} },
		hsv: function() { return {h: this.h, s: this.s, v: this.v} },
		hslStr: function() { return tinycolor({r: this.r, g: this.g, b: this.b}).toHslString()},
		hsvStr: function() { return tinycolor({r: this.r, g: this.g, b: this.b}).toHsvString()},
		percentS: function() { return this.s * 100 },
		percentV: function() { return this.v * 100 },
		gradientH: function() {
			var stops = [];
			for (var i = 0; i < 7; i++) {
				var h = i * 60;
				
				var hsl = hsb2hsl(parseFloat(h / 360), this.s, this.v)
				
				var c = hsl.h + ", " + hsl.s + "%, " + hsl.l + "%"
				stops.push("hsl(" + c + ")")
			}

			return {
				backgroundImage: "linear-gradient(to right, " + stops.join(', ') + ")"
			}
		},
		gradientS: function() {
			var stops = [];
			var c;
			var hsl = hsb2hsl(parseFloat(this.h / 360), 0, this.v)
			c = hsl.h + ", " + hsl.s + "%, " + hsl.l + "%"
			stops.push("hsl(" + c + ")")

			var hsl = hsb2hsl(parseFloat(this.h / 360), 1, this.v)
			c = hsl.h + ", " + hsl.s + "%, " + hsl.l + "%"
			stops.push("hsl(" + c + ")")

			return {
				backgroundImage: "linear-gradient(to right, " + stops.join(', ') + ")"
			}
		},
		gradientV: function() {
			var stops = [];
			var c;

			var hsl = hsb2hsl(parseFloat(this.h / 360), 0, 0)
			c = hsl.h + ", " + hsl.s + "%, " + hsl.l + "%"
			stops.push("hsl(" + c + ")")

			var hsl = hsb2hsl(parseFloat(this.h / 360), this.s, 1)
			stops.push(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`)

			return {
				backgroundImage: "linear-gradient(to right, " + stops.join(', ') + ")"

			}
		}
	},
	watch: {
		'_r': function() { this.r = this._r; this.updateColorDisplays(); },
		'_g': function() { this.g = this._g; this.updateColorDisplays(); },
		'_b': function() { this.b = this._b; this.updateColorDisplays(); },
	},
	mounted: function() {
		this.r = this._r;
		this.g = this._g;
		this.b = this._b;

		this.updateColorDisplays();
	},
	methods: {
		askRerender: function() {
			this.updateAll(this.rgb);
			this.$emit("rerender");
		},
		show: function() { this.isVisible = true; },
		hide: function() { this.isVisible = false; },
		toggle: function() { this.isVisible = !this.isVisible; },
		validateAndSendRgbColorUpdate: function(event, color) {
			event.target.value = parseInt(event.target.value.toString().replace(/[^\d]/g, "") || 0);
			event.target.value = Math.min(255, event.target.value);
			this.$emit("update:_" + color, parseInt(event.target.value));
			this.$emit("color-update");
		},
		updateFromHsv: function() {
			//const color = tinycolor(`hsl(${this.h}, ${this.percentS}%, ${this.percentL}%)`);
			//const color = tinycolor(this.hsl);
			// ?? either my sliders are messed up or there's a bug in tinycolor (updateColorDisplays too if you fix this)
			const color = tinycolor({h: this.h, s: this.s, v: this.v});

			const rgb = color.toRgb();
			this.r = rgb.r;
			this.g = rgb.g;
			this.b = rgb.b;

			this.hex = color.toHexString();
		},
		updateFromHex: function() {
			const color = tinycolor(this.hex);

			const rgb = color.toRgb();
			this.r = rgb.r;
			this.g = rgb.g;
			this.b = rgb.b;

			const hsv = color.toHsv();
			this.h = hsv.h;
			this.s = hsv.s;
			this.v = hsv.v;
		},
		updateAll: function(rgb) {
			console.log("updateAll", rgb)
			this.$emit("update:_r", rgb.r);
			this.$emit("update:_g", rgb.g);
			this.$emit("update:_b", rgb.b);
			this.$emit("color-update");
		},
		updateColorDisplays: function() {
			console.log("updateColorDisplays()")
			const color = tinycolor(this.rgb)

			// ?? either my sliders are messed up or there's a bug in tinycolor
			const hsv = color.toHsv();
			this.h = hsv.h;
			this.s = hsv.s;
			this.v = hsv.v;

			this.hex = color.toHexString();
		},
		handlePaste: function(event) {
			const pasted = (event.clipboardData || window.clipboardData).getData('text');
			console.log("handlePaste, current color:", this.color, "pasted:", pasted, "event:", event);

			/*
			if (this.readonly) {
				event.target.value = this.color;
			} else {

				if (pasted != this.color) { // don't do anything if we pasted the same color
					const color = tinycolor(pasted);

					if (color.isValid()) {
						this.updateAll(color.toRgb());
						this.$emit("rerender");
					}
					else
						event.target.value = color;
				}
			}
			*/
		},
		handleInput: function(event) {
			console.log("handleInput", event.target.value, this.color)
			const newColor = event.target.value;
			const oldColor = this.color;

			if (this.readonly) {
				event.target.value = oldColor;
			} else {
				if (newColor != oldColor) { // don't do anything if we pasted the same color
					const color = tinycolor(newColor);

					if (color.isValid()) {
						this.updateAll(color.toRgb());
						this.$emit("rerender");
					}
					else
						event.target.value = oldColor;
				}
			}
		},
		copyColor: function(event) {
			console.log("copyColor()", event)
			this.$refs.colorCopyPasteInput.select();
			this.$refs.colorCopyPasteInput.setSelectionRange(0, 99999);
			document.execCommand("copy");
		}
	}
})

function hsb2hsl(h, s, b) {
  var hsl = {
    h: h
  };
  hsl.l = (2 - s) * b;
  hsl.s = s * b;

  if (hsl.l <= 1 && hsl.l > 0) {
    hsl.s /= hsl.l;
  } else {
    hsl.s /= 2 - hsl.l;
  }

  hsl.l /= 2;

  if (hsl.s > 1) {
    hsl.s = 1;
  }
  
  if (!hsl.s > 0) hsl.s = 0


  hsl.h *= 360;
  hsl.s *= 100;
  hsl.l *= 100;

  return hsl;
}

const vm = new Vue({
	el: '#app',
	data: {
		rows: [],
		pickedColor: { r: 0, g: 0, b: 0, a: 0, x: 0, y: 0 },
		//mainColor: null
		previewImg: null,
		colorsInImg: [],
		colorProfilesMainColors: [{name: "default", shades: []}],
		ranges: [],
		selectedColorProfile: 0,
		drawingCanvas: document.createElement("canvas"),
		zoomFactor: 1,
		colorspelling: "color",
		skipConfirmRecolor: false,
		autoMoveShades: true,
		codeOutputGml: "",
		codeOutputJSON: "",
	},
	computed: {
		colorsNotInPalette: function() {
			const colors = [];
			this.colorsInImg.forEach(colorInImg => {
				if (!this.rows.some(row => row.colors.some(color => color.r === colorInImg.r && color.g === colorInImg.g && color.b === colorInImg.b)))
					colors.push(colorInImg)
			});

			return colors;
		},
		colorsByRangeMatch: function() {
			const matchedColors = [];
			const unmatchedColors = [];
			this.colorsInImg.forEach(color => {
				if (this.ranges.some(rangeDef => isWrappingValueWithinRange(color.hsv.h, 0, 360, rangeDef.hL, rangeDef.hH) && color.hsv.s >= rangeDef.sL && color.hsv.s <= rangeDef.sH && color.hsv.v >= rangeDef.vL && color.hsv.v <= rangeDef.vH))
					matchedColors.push(color);
				else
					unmatchedColors.push(color);
			})

			return {matchedColors, unmatchedColors};
		},
		codeOutput: function() {
			return this.codeOutputGml + this.codeOutputJSON;
		}
	},
	beforeMount: function() { //i suppose this is the right place for this?
		while (this.colorProfilesMainColors.length < MIN_ALT_PALETTES) {
			this.addColorProfileRow()
		}
	},
	watch: {
		selectedColorProfile: function() {
			this.renderPreview();
		},
		rows: {
			//not sure if I should have this or just call a function on color-picker's update:r instead of using .sync
			deep: true,
			handler: function() {
				this.updateHandler({type: "VUE_NOTICED_COLOR_PALETTE_UPDATE"});
			}
		},
		zoomFactor: 'renderPreview'
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

			this.parseGMLCodeToColorProfiles(txt);
			this.updateHandler({type: "CODE_INPUT_PARSED", forceUpdate: true});
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

				this.colorProfilesMainColors[colorProfileSlot].shades[shadeSlot] = { rgb };
				this.calcShadesHSV(this.colorProfilesMainColors[colorProfileSlot].shades[shadeSlot]);
			}

			if (this.rows.length == 0) {
				console.log("filling palette with base colors")
				this.colorProfilesMainColors[0].shades.forEach(shade => {
					console.log("adding row and slot for", shade)
					const newRow = this.addRow();
					const newSlot = this.addSlot(newRow, {r, g, b} = shade.rgb);
					this.setMainColor(newSlot, newRow);
				})
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

			//only keep 16 color profiles
			if (this.colorProfilesMainColors.length > MAX_ALT_PALETTES)
				this.colorProfilesMainColors.splice(15, this.colorProfilesMainColors.length - 1)

			this.colorProfilesMainColors.forEach(this.fillShadeSlotsUpToAmountOfRows)

			while (this.colorProfilesMainColors.length < MIN_ALT_PALETTES) {
				this.addColorProfileRow()
			}

			console.log("parseGMLCodeToColorProfiles", this.colorProfilesMainColors)
		},
		calcShadesHSV: function(shade) {
			shade.hsv = rgbToHsv(shade.rgb.r, shade.rgb.g, shade.rgb.b);
			shade.accurateHSV = rgbToHsv_noRounding(shade.rgb.r, shade.rgb.g, shade.rgb.b);
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
								row.colors[i2] = {r: 0, g: 255, b: 0};
						}
					}
				}

				console.log("done parsing");
			} catch(e) {
				console.error("unable to parse input", e)
				this.rows = [];
			}
		},
		addColorPaletteRow: function(name = "unnamed color row") {
			const newRow = {name, colors: []}
			this.rows.push(newRow)
			this.colorProfilesMainColors.forEach(this.fillShadeSlotsUpToAmountOfRows)

			this.updateHandler({type: "COLOR_PALETTE_ADD_ROW", jsonOnly: false, doRerender: false, recalcRanges: false});
			return newRow;
		},
		addColorPaletteSlot: function(inRow, color = {r: 0, g: 255, b: 0}) {
			const len = inRow.colors.push(color);

			this.updateHandler({type: "COLOR_PALETTE_ADD_SLOT", jsonOnly: true, doRerender: false, recalcRanges:false, forceUpdate: true});
			return color;
		},
		addColorProfileRow: function() {
			const colorProfile = {
				name: "unnamed alt palette",
				shades: []
			}

			//not sure if I should take the main color's colors but I guess it's more explicit that this is a placeholder?
			this.fillShadeSlotsUpToAmountOfRows(colorProfile);


			this.colorProfilesMainColors.push(colorProfile);
			this.updateHandler({type: "ALT_PALETTE_ROW_ADD", jsonOnly: false, doRerender: false, recalcRanges: false});
		},
		deleteAltPaletteRow: function(rowIndex) {
			this.colorProfilesMainColors.splice(rowIndex, 1);

			//todo reset selection to 0 if rowIndex == currently selected row
			this.updateHandler({type: "ALT_PALETTE_ROW_DELETE", recalcRanges: false});
		},
		moveAltPaletteUp: function(rowIndex) {
			const row = this.colorProfilesMainColors.splice(rowIndex, 1)[0];
			console.log("moving shade", rowIndex, "up", row)
			this.colorProfilesMainColors.splice(rowIndex - 1, 0, row);

			this.updateHandler({type: "ALT_PALETTE_ROW_MOVE_UP"});
		},
		moveAltPaletteDown: function(rowIndex) {
			const row = this.colorProfilesMainColors.splice(rowIndex, 1)[0];
			console.log("moving shade", rowIndex, "down", row)
			this.colorProfilesMainColors.splice(rowIndex + 1, 0, row);

			this.updateHandler({type: "ALT_PALETTE_ROW_MOVE_DOWN"});
		},
		fillShadeSlotsUpToAmountOfRows: function(colorProfile) {
			while (colorProfile.shades.length < this.rows.length) {
				colorProfile.shades.push({
					rgb: {r: 0, g: 255, b: 0},
					hsv: rgbToHsv(0, 255, 0),
					accurateHSV: rgbToHsv_noRounding(0, 255, 0)
				});
			};

			//return colorProfile;
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

			//should only rerender if the range changes?
			this.updateHandler({type: "COLOR_SET_MAIN", jsonOnly: false, doRerender: true, forceUpdate: true});
		},
		deleteColor: function(colorSlotIndex, row) {
			console.log("deleteColor()");
			row.colors.splice(colorSlotIndex, 1);

			//should only rerender if the range changes?
			this.updateHandler({type: "COLOR_DELETE", jsonOnly: false, doRerender: true, forceUpdate: true});
		},
		renameColorPaletteRow: function(event, row) {
			event.target.innerText = event.target.innerText.replace(/\n/g, "");
			row.name = event.target.innerText;

			this.updateHandler({type: "COLOR_PALETTE_ROW_RENAME", jsonOnly: false, doRerender: false, recalcRanges: false});
		},
		deleteColorPaletteRow: function(iRow) {
			this.rows.splice(iRow, 1);

			this.colorProfilesMainColors.forEach(colorProfile => {
				colorProfile.shades.splice(iRow, 1);
			})

			this.updateHandler({type: "COLOR_PALETTE_ROW_DELETE"});
		},
		moveColorPaletteRowUp: function(rowIndex) {
			const row = this.rows.splice(rowIndex, 1)[0];
			console.log("moving", rowIndex, "up", row)
			this.rows.splice(rowIndex - 1, 0, row);

			if (this.autoMoveShades)
				this.colorProfilesMainColors.forEach(profile => {
					const shade = profile.shades.splice(rowIndex, 1)[0];
					profile.shades.splice(rowIndex - 1, 0, shade);
				})

			this.updateHandler({type: "COLOR_PALETTE_ROW_MOVE_UP"});
		},
		moveColorPaletteRowDown: function(rowIndex) {
			const row = this.rows.splice(rowIndex, 1)[0];
			console.log("moving", rowIndex, "down", row)
			this.rows.splice(rowIndex + 1, 0, row);

			if (this.autoMoveShades)
				this.colorProfilesMainColors.forEach(profile => {
					const shade = profile.shades.splice(rowIndex, 1)[0];
					profile.shades.splice(rowIndex + 1, 0, shade);
				})

			this.updateHandler({type: "COLOR_PALETTE_ROW_MOVE_DOWN"});
		},
		renameAltPaletteRow: function(event, row) {
			event.target.innerText = event.target.innerText.replace(/\n/g, ""); //todo remove this?
			row.name = event.target.innerText;

			this.updateHandler({type: "ALT_PALETTE_ROW_RENAME", doRerender: false, recalcRanges: false});
		},
		updateHandler: function({ type = "unspecified", jsonOnly = false, doRerender = true, forceUpdate = false, recalcRanges = true }) {
			console.log("update", new Date().toISOString(), ":", type, "only regenerating JSON:", jsonOnly, "re-rendering:", doRerender)
			if (jsonOnly == false)
				this.generateGmlCode(recalcRanges);

			//TODO: store updateType along with regenerated code
			//TODO: recalcRanges switch for generateGmlCode
			//TODO: rerenderIfRangesChange option

			if (forceUpdate)
				this.$forceUpdate();

			if (doRerender)
				this.renderPreview();

		},
		generateGmlCode: function(recalcRanges = true) {
			console.log("generateGmlCode()")
			//this.colorProfilesMainColors[0] = {name: "default", shades: []};
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

				if (recalcRanges) {
					console.log("recalculating ranges")
					if (HSVMain) {
						console.info("calculating range for", row.name, iRow);
						const highest = this.calcHSVRange(HSVs, HSVMain);

						str += `\nset_color_profile_slot_range( ${iRow}, ${highest.h + 1}, ${highest.s + 1}, ${highest.v + 1} );`;
						this.ranges[iRow] = {
							highest: highest,
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
				} else {
					console.log("not recalculating ranges")
					const highest = this.ranges[iRow].highest;
					str += `\nset_color_profile_slot_range( ${iRow}, ${highest.h + 1}, ${highest.s + 1}, ${highest.v + 1} );`;
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

			this.codeOutputGml = str;
			//document.getElementById('gmlDisplay').value = str;
		},
		generateJSONCode: function() {
			this.codeOutputJSON = "\n\n\n/* This is used by that one RoA colors.gml generator tool to store palette data\n"
				+ jsonPaletteHeaderStart + "\n"
				+ JSON.stringify({formatversion: 1, data: this.rows})
				+ "\n" + jsonPaletteHeaderEnd + "\n*/\n"
		},
		calcHSVRange: function(HSVArray, HSVMain) {
			var highestRanges = {h: 0, s: 0, v: 0};
			var furthestHSV = HSVMain;

			HSVArray.forEach(HSV => {
				const hueDistance = getHueDistance(HSVMain.h, HSV.h) || 0; //brok on blak
				console.info("hsv", HSV, HSVArray.length, "distance from main:", hueDistance)
	
				highestRanges.h = Math.max(hueDistance, highestRanges.h);
				highestRanges.s = Math.max(getRange(HSV.s, HSVMain.s), highestRanges.s);
				highestRanges.v = Math.max(getRange(HSV.v, HSVMain.v), highestRanges.v);
			});

			return highestRanges;
		},
		loadFilePreview: function(event) {
			const pix = event.target.files[0];
			const r = new FileReader();

			r.onload = () => {
				this.previewImg = new Image();
				this.previewImg.onload = () => {
					//if (this.checkPicture()) {
						this.getNiceZoomFactor();
						this.renderPreview();
						this.getColorsInImg();
					//}
				}

				this.previewImg.src = r.result;
			};

			r.readAsDataURL(pix);
		},
		getNiceZoomFactor: function() {
			this.zoomFactor = 1;
			const width = this.previewImg.width;

			if (width > 0 && window.innerWidth > 0) {
				while ( window.innerWidth / (width * this.zoomFactor) > 5) { //lazy
					console.log("getNiceZoomFactor", this.zoomFactor, (width * this.zoomFactor) / window.innerWidth > 5)
					this.zoomFactor++;
				}
			}
		},
		checkPicture: function() {
			const pixels = this.previewImg.width * this.previewImg.height;
			console.log("pixels in pic:", pixels)
			if (pixels > PIC_PIXELS_TRESHOLD_FOR_WARNING)
				return window.confirm("This image is pretty large - the browser might freeze while processing it. Are you sure you wanna continue?");
			return true;
		},
		clearCanvas: function(canvas, ctx) {
			if (!canvas) {
				const canvas = document.getElementById("preview");
			}
			if (!ctx)
				ctx = canvas.getContext('2d');
			
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		},
		renderPreview: function() {
			if (!this.previewImg) {
				console.info("no previewImg to render");
				return;
			}

			console.log("rendering.....");
			//drawingcanvas is just used for recoloring and isn't shown
			const canvas = this.drawingCanvas;
			const width = canvas.width = this.previewImg.width;
			const height = canvas.height = this.previewImg.height;
			const ctx = canvas.getContext('2d');

			const realCanvas = document.getElementById("preview");
			realCanvas.width = width * this.zoomFactor;
			realCanvas.height = height * this.zoomFactor;
			const realCtx = realCanvas.getContext('2d');

			this.clearCanvas(canvas, ctx);

			ctx.drawImage(this.previewImg, 0, 0)//, width, height);
			const imageData = ctx.getImageData(0, 0, width, height);
			const imageDataArray = imageData.data;

			if (this.selectedColorProfile != 0) {
				console.log("recoloring...")

				const cachedColorTransforms = new Map();

				var confirmedContinue = this.skipConfirmRecolor;
				for (var i = 0; i < imageDataArray.length; i += 4) {
					if (i > PIC_RECOLOR_PIXELS_TRESHOLD_FOR_WARNING && !confirmedContinue) {
						if (confirm("This picture looks pretty large - the browser might freeze while recoloring. Continue?"))
							confirmedContinue = true;
						else
							break;
					}

					if (imageDataArray[i+3] == 0) //skip transparent (/alpha 0) pixels
						continue;

					const r = imageDataArray[i],
						g = imageDataArray[i+1],
						b = imageDataArray[i+2];

					//skip gray outlines that the game ignores
					if (r < 26 && g < 26 && b < 26)
						continue;

					const hsv = rgbToHsv(r, g, b);

					if (this.selectedColorProfile != 0) {
						const cachedColor = cachedColorTransforms.get(`${r},${g},${b}`);
						if (cachedColor) {
							imageDataArray[i] = cachedColor.r;
							imageDataArray[i+1] = cachedColor.g;
							imageDataArray[i+2] = cachedColor.b;
						}
						else {
							let matched = false;
							this.ranges.forEach((rangeDef, shadeIndex) => {
								//console.log("px", i, "on shade", shadeIndex, "with range", rangeDef, "hsv:", hsv);
								/*console.log("h", isWrappingValueWithinRange(hsv.h, 0, 360, rangeDef.hL, rangeDef.hH),
									"hL", hsv.h >= rangeDef.hL,
									"hH", hsv.h <= rangeDef.hH,
									"sL", hsv.s >= rangeDef.sL,
									"sH", hsv.s <= rangeDef.sH,
									"vL", hsv.v >= rangeDef.vL,
									"vH", hsv.v <= rangeDef.vH
								)*/

								//those ranges are precalculated in generateGmlCode so that we don't have to math them here
								if(isWrappingValueWithinRange(hsv.h, 0, 360, rangeDef.hL, rangeDef.hH)
								&& hsv.s >= rangeDef.sL && hsv.s <= rangeDef.sH
								&& hsv.v >= rangeDef.vL && hsv.v <= rangeDef.vH
								) {
									const mainColorForShade = this.colorProfilesMainColors[this.selectedColorProfile].shades[shadeIndex];
									matched = true;

									//don't shade shift if current color is same as main color
									if (r === mainColorForShade.rgb.r && g === mainColorForShade.rgb.g && b === mainColorForShade.rgb.b) {
										cachedColorTransforms.set(`${r},${g},${b}`, {r, g, b});
										return;
									}

									const defaultColorForShade = this.colorProfilesMainColors[0].shades[shadeIndex];

									//don't shade shift if main color is same as default color
									if(defaultColorForShade.rgb.r === mainColorForShade.rgb.r
									&& defaultColorForShade.rgb.g === mainColorForShade.rgb.g
									&& defaultColorForShade.rgb.b === mainColorForShade.rgb.b) {
										cachedColorTransforms.set(`${r},${g},${b}`, {r, g, b});
										return;
									}


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
									imageDataArray[i] = shiftedRgb.r;
									imageDataArray[i+1] = shiftedRgb.g;
									imageDataArray[i+2] = shiftedRgb.b;

									cachedColorTransforms.set(`${r},${g},${b}`, shiftedRgb);

									//console.log("px", i, "fitting rangeDef", hsv, mainColorForShade.hsv, step, shiftedRgb)
								}
							})
							if (!matched) {
								//reaching here means the color wasn't fitting in any range
								//console.log("unmatched color", r, g, b);
								cachedColorTransforms.set(`${r},${g},${b}`, {r, g, b});
							}
						}
					}
				}
			}

			console.log("drawing recolored image");

			if (this.zoomFactor == 1) { //draw image directly
				realCtx.putImageData(imageData, 0, 0);
				console.log("done")
			} else { //.scale() doewn't work with raw .putImageData() so we put it in an image that we then draw, which is scaled
				ctx.putImageData(imageData, 0, 0);

				const img = new Image();
				img.onload = () => {
					//this.clearCanvas(realCanvas, realCtx);

					realCtx.save(); //save/restoring because otherwise it'd scale over the previous scaling

					realCtx.scale(this.zoomFactor, this.zoomFactor);
					realCtx.imageSmoothingEnabled=false;

					realCtx.drawImage(img, 0, 0);

					realCtx.restore();

					console.log("done");
				}
				img.src = canvas.toDataURL();
			}
		},
		getColorsInImg: function() {
			console.log("getColorsInImg()");
			const knownColors = new Map();

			const canvas = this.drawingCanvas;
			const width = this.previewImg.width;
			const height = this.previewImg.height;
			const ctx = canvas.getContext('2d');
			ctx.drawImage(this.previewImg, 0, 0)//, width, height);
			const imageData = ctx.getImageData(0, 0, width, height);
			const imageDataArray = imageData.data;

			var confirmedContinue = false;

			for (var i = 0; i < imageDataArray.length; i += 4) {
				if (knownColors.size > PIC_COLORS_ACTUAL_TRESHOLD && !confirmedContinue) {
					if (confirm("There is more than " + PIC_COLORS_TRESHOLD_FOR_WARNING + " colors in this picture.\nLoading them all might freeze the browser while it processes. Continue?\n(Recoloring will still work if you skip this, but it'll probably be slow too.)"))
						confirmedContinue = true;
					else
						break;
				}

				if (imageDataArray[i+3] == 0) //skip transparent (/alpha 0) pixels
					continue;

				const r = imageDataArray[i],
					g = imageDataArray[i+1],
					b = imageDataArray[i+2],
					hsv = rgbToHsv(r, g, b);

				if (!knownColors.has(`${r},${g},${b}`))
					knownColors.set(`${r},${g},${b}`, {r, g, b, hsv});
			}

			//filter out gray outlines that the game ignores
			this.colorsInImg = Array.from(knownColors.values())
				.filter(c => !(c.r < 26 && c.g < 26 && c.b < 26)); // weird inversion here to match renderPreview()'s filter
		},
		previewClick: function(ev) {
			const canvas = document.getElementById("preview");

			const relX = ev.x + window.scrollX - canvas.offsetLeft;
			const relY = ev.y + window.scrollY - canvas.offsetTop;

			const ctx = canvas.getContext('2d');

			const imageData = ctx.getImageData(relX, relY, 1, 1);
			const [r, g, b, a] = imageData.data;

			this.pickedColor = {r, g, b, a, x:relX, y:relY};
		},
	}
});

// https://github.com/semibran/wrap-around im idiot
function wrap(m, n) {
  return n >= 0 ? n % m : (n % m + m) % m
}

function isWrappingValueWithinRange(value, wrappingStart, wrappingEnd, rangeStart, rangeEnd) {
	if (rangeStart <= rangeEnd) {
		return value >= rangeStart && value <= rangeEnd;
	} else {
		return (value >= rangeStart && value <= wrappingEnd)
			|| (value <= rangeEnd   && value >= wrappingStart);
	}
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
