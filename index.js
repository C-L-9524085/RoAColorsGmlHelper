const jsonPaletteHeaderStart = "=== BEGIN JSON PALETTE ===";
const jsonPaletteHeaderEnd = "=== END JSON PALETTE ===";
const alternateColorsHeader = "// ALTERNATE COLORS";

const PIC_PIXELS_TRESHOLD_FOR_WARNING = (300 * 20) * 500; //(one sprite's width * amount of sprites in a strip) * sprite's height
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
	props: ["change", "_r", "_g", "_b", "_shd_val", "readonly", "showpalettecontrols", "showshadecontrol", "c_per_slot_shading"],
	data: function() {
		return {
			isVisible: false,

			r: 0,
			g: 0,
			b: 0,

			h: 0,
			s: 0,
			v: 0,
			hex: "000",

			shd_val: 1
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
		'_shd_val': function() { this.shd_val = this._shd_val; this.updateColorDisplays(); },
	},
	mounted: function() {
		this.r = this._r;
		this.g = this._g;
		this.b = this._b;
		this.shd_val = this._shd_val;

		this.updateColorDisplays();
	},
	methods: {
		askRerender: function() {
			this.updateAll(this.rgb, this.shd_val);
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
		updateFromShdVal: function() {
			//const color = tinycolor(`hsl(${this.h}, ${this.percentS}%, ${this.percentL}%)`);
			//const color = tinycolor(this.hsl);
			// ?? either my sliders are messed up or there's a bug in tinycolor (updateColorDisplays too if you fix this)
			console.log(this.shd_val)
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
		updateAll: function(rgb, shd_val = 1) {
			console.log("updateAll", rgb)
			this.$emit("update:_r", rgb.r);
			this.$emit("update:_g", rgb.g);
			this.$emit("update:_b", rgb.b);
			this.$emit("update:_shd_val", shd_val);
			this.$emit("color-update");
		},
		updateColorDisplays: function() {
			//console.log("updateColorDisplays()")
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

Vue.component("tips-div", {
	template: "#tips-div-template",
	data: function() {
		return {
			visible: false,
		}
	},
	computed: {
		hasTitle: function() {
			return this.$slots && this.$slots.title
		}
	},
	methods: {
		toggle: function() {
			this.visible = !this.visible;
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
		inputShadingValue: 1,
		colorspelling: "color",
		skipConfirmRecolor: false,
		autoMoveShades: true,
		totalRenderTime: 0,
		displayTips: false,
		MIN_ALT_PALETTES: 6,
		MAX_ALT_PALETTES: 32,
		MAX_SHADE_ROWS: 8,
		PER_SLOT_SHADING: false,
		userHasEditedThings: false,
		customOutline: { r: 0, g: 0, b: 0 },
	},
	computed: {
		maxLineWidth: function() {
			const imgSize = this.drawingCanvas.width * this.zoomFactor;

			return Math.max(imgSize, 300) + "px";
		},
		colorspellingCap: function() {
			return this.colorspelling[0].toUpperCase() + this.colorspelling.substring(1);
		},
		shadingValue: function() {
			return parseFloat(this.inputShadingValue) || 0;
		},
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
		}
	},
	beforeMount: function() { //i suppose this is the right place for this?
		while (this.colorProfilesMainColors.length < this.MIN_ALT_PALETTES) {
			this.addColorProfileRow()
		}

		window.onbeforeunload = () => {
			if (this.userHasEditedThings) {
				return "";
			}
		};
	},
	watch: {
		selectedColorProfile: function() {
			this.renderPreview();
		},
		customOutline: { deep: true, handler: 'renderPreview' },
		rows: {
			//not sure if I should have this or just call a function on color-picker's update:r instead of using .sync
			deep: true,
			handler: 'updateInput'
		},
		shadingValue: 'renderPreview',
		zoomFactor: 'renderPreview'
	},
	methods: {
		copyImage: async function() {
			try {
				const realCanvas = document.getElementById("preview");
				const blob = await new Promise((res, rej) => realCanvas.toBlob(res));
				await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
			} catch(e) {
				alert("error copying")
			}
		},
		downloadImage: async function() {
			try {
				const realCanvas = document.getElementById("preview");
				const a = document.createElement('a');
				const blob = await new Promise((res, rej) => realCanvas.toBlob(res));
				a.href = URL.createObjectURL(blob);
				a.download = "download";

				const clickHandler = () => {
					URL.revokeObjectURL(url);
					a.removeEventListener('click', clickHandler);
				}

				a.click();
			} catch(e) {
				alert("error downloading")
			}
		},
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
				this.colorProfilesMainColors[colorProfileSlot].shades[shadeSlot] = { rgb, shd_val:1 };
				
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
							//this is a monster and i don't know how i would do it better
							if (line.includes("//shading data: [")) {
								console.log("matched shading data on l", line)
								const len = this.colorProfilesMainColors[i-1].shades.length
								var shading_regex_str = "\\/\\/shading data: \\["; 
								this.colorProfilesMainColors[i-1].shades.forEach(function() {
									shading_regex_str += "([-\\d.]+)(?:[,\\]]\\s*)";
								});

								var regex = new RegExp(shading_regex_str,"g");
								var matches = regex.exec(line)
								this.colorProfilesMainColors[i-1].shades.forEach((shade, shade_index) => {
									shade.shd_val = Number(matches[shade_index+1]);
								});
								return;
							}
							console.log("name:", line)
							if (this.colorProfilesMainColors[i])
								this.colorProfilesMainColors[i].name = line.trim().replace(/^\/\//, '').trim();

							i++;
						}
					}
				}
			})

			if (this.colorProfilesMainColors.length > this.MAX_ALT_PALETTES)
				this.MAX_ALT_PALETTES = this.colorProfilesMainColors.length;

			this.colorProfilesMainColors.forEach(this.fillShadeSlotsUpToAmountOfRows)

			while (this.colorProfilesMainColors.length < this.MIN_ALT_PALETTES) {
				this.addColorProfileRow()
			}

			this.$forceUpdate();
			this.generateGmlCode();
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
				this.rows = json;
				this.MAX_SHADE_ROWS = Math.max(8,this.rows.length);

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
								row.colors[i2] = {r: 0, g: 255, b: 0, shd_val: 1};
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
		addRow: function(name = "unnamed color row") {
			const newRow = {name, colors: []}
			this.rows.push(newRow)
			this.colorProfilesMainColors.forEach(this.fillShadeSlotsUpToAmountOfRows)

			this.updateInput();
			return newRow;
		},
		addSlot: function(inRow, color = {r: 0, g: 255, b: 0, shd_val:1}) {
			color.shd_val = 1;
			const len = inRow.colors.push(color);

			this.$forceUpdate();
			this.updateInput();
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
			this.updateInput();
		},
		deleteColorSlotRow: function(colorSlotIndex) {
			const slotName = this.colorProfilesMainColors[colorSlotIndex].name;
			if (!confirm(`Are you sure you want to delete alt '${slotName}'?`))
				return;

			this.colorProfilesMainColors.splice(colorSlotIndex, 1);

			this.updateDisplays();
		},
		changeSlotRowIndex: function(colorSlotIndex) {
			const maxIndex = this.colorProfilesMainColors.length;
			const newIndex_str = prompt(`What is the new index? ([1, ${maxIndex}])`);

			if (!newIndex_str) {
				return;
			}

			if (!newIndex_str.match(/[0-9]*/)) {
				alert("That doesn't seem to be a valid integer");
				return;
			}

			const newIndex = clamp(1, Number(newIndex_str), maxIndex);

			const profiles = [...this.colorProfilesMainColors];
			const [targetElement] = profiles.splice(colorSlotIndex, 1);
			profiles.splice(newIndex, 0, targetElement);
			this.colorProfilesMainColors = profiles;

			if (this.selectedColorProfile == colorSlotIndex)
				this.selectedColorProfile = newIndex;

			this.updateDisplays();
		},
		moveShadeUp: function(colorSlotIndex) {
			const row = this.colorProfilesMainColors.splice(colorSlotIndex, 1)[0];
			console.log("moving shade", colorSlotIndex, "up", row)
			this.colorProfilesMainColors.splice(colorSlotIndex - 1, 0, row);

			this.updateDisplays();
		},
		moveShadeDown: function(colorSlotIndex) {
			const row = this.colorProfilesMainColors.splice(colorSlotIndex, 1)[0];
			console.log("moving shade", colorSlotIndex, "down", row)
			this.colorProfilesMainColors.splice(colorSlotIndex + 1, 0, row);

			this.updateDisplays();
		},
		fillShadeSlotsUpToAmountOfRows: function(colorProfile) {
			while (colorProfile.shades.length < this.rows.length) {
				colorProfile.shades.push({
					rgb: {r: 0, g: 255, b: 0},
					hsv: rgbToHsv(0, 255, 0),
					accurateHSV: rgbToHsv_noRounding(0, 255, 0),
					shd_val: 1
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

			this.colorProfilesMainColors.forEach(colorProfile => {
				colorProfile.shades.splice(iRow, 1);
			})

			this.updateDisplays();
		},
		moveRowUp: function(iRow) {
			const row = this.rows.splice(iRow, 1)[0];
			console.log("moving", iRow, "up", row)
			this.rows.splice(iRow - 1, 0, row);

			if (this.autoMoveShades)
				this.colorProfilesMainColors.forEach(profile => {
					const shade = profile.shades.splice(iRow, 1)[0];
					profile.shades.splice(iRow - 1, 0, shade);
				})

			this.updateDisplays();
		},
		moveRowDown: function(iRow) {
			const row = this.rows.splice(iRow, 1)[0];
			console.log("moving", iRow, "down", row)
			this.rows.splice(iRow + 1, 0, row);

			if (this.autoMoveShades)
				this.colorProfilesMainColors.forEach(profile => {
					const shade = profile.shades.splice(iRow, 1)[0];
					profile.shades.splice(iRow + 1, 0, shade);
				})

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
			//this.updateInput();
			this.renderPreview();
		},
		generateGmlCode: function() {
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
							rgb: {r: color.r, g: color.g, b: color.b},
							shd_val: 1
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
			str += "\nset_num_palettes( " + clamp(this.MIN_ALT_PALETTES, this.colorProfilesMainColors.length, this.MAX_ALT_PALETTES) + " );";

			for (let i = 1; i < this.colorProfilesMainColors.length; i++) {
				const colorSlot = this.colorProfilesMainColors[i];

				str += `\n\n// ${colorSlot.name || i}`;
				colorSlot.shades.forEach((shade, shadeIndex) => {
					str += `\nset_color_profile_slot( ${i}, ${shadeIndex}, ${shade.rgb.r}, ${shade.rgb.g}, ${shade.rgb.b} );`;
					if (this.rows[shadeIndex])
						str += ` //${this.rows[shadeIndex].name}`;
				})
				str += "\n//shading data: ["
				colorSlot.shades.forEach((shade, shadeIndex) => {
					str += shade.shd_val + (shadeIndex < colorSlot.shades.length-1 ? ", ":"]")
				})
			}
			

			str += "\n\n\n/* This is a comment used by that one RoA colors.gml generator tool to store palette data. You can safely keep it in your colors.gml if you plan to re-use the tool later, or safely remove it if you don't.\n"
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
	
				highestRanges.h = Math.max(hueDistance, highestRanges.h);
				highestRanges.s = Math.max(getRange(HSV.s, HSVMain.s), highestRanges.s);
				highestRanges.v = Math.max(getRange(HSV.v, HSVMain.v), highestRanges.v);
			});

			return highestRanges;
		},
		updateInput: function() {
			console.log("updateInput()")
			this.userHasEditedThings = true;
			//todo just edit json, don't regenerate gml if unchanged
			this.generateGmlCode()
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
			const renderTimeStart = Date.now();

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


			var confirmedContinue = this.skipConfirmRecolor;
			if (
				imageDataArray.length < PIC_PIXELS_TRESHOLD_FOR_WARNING * 4 
				|| confirmedContinue
				|| confirm("This picture looks pretty large - the browser might freeze while recoloring. Continue?")
				)
					confirmedContinue = true;

			if (confirmedContinue) {
				console.log("recoloring...")

				const cachedColorTransforms = new Map();

				for (var i = 0; i < imageDataArray.length; i += 4) {

					if (imageDataArray[i+3] == 0) //skip transparent (/alpha 0) pixels
						continue;

					const r = imageDataArray[i],
						g = imageDataArray[i+1],
						b = imageDataArray[i+2];

					//skip gray outlines that the game ignores
					if (r < 26 && g < 26 && b < 26) {
						imageDataArray[i] = this.customOutline.r;
						imageDataArray[i+1] = this.customOutline.g;
						imageDataArray[i+2] = this.customOutline.b;

						continue;
					}

					//if (this.selectedColorProfile != 0 || this.shadingValue != 1) {
						const cachedColor = cachedColorTransforms.get(`${r},${g},${b}`);
						if (cachedColor) {
							//console.log("color was cached")
							imageDataArray[i] = cachedColor.r;
							imageDataArray[i+1] = cachedColor.g;
							imageDataArray[i+2] = cachedColor.b;
						}
						else {
							let matched = false;
							//don't need to optimize this much since it's only reached once for every color in the picture
							//which is (usually) way less than the number of pixels in the picture
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
								if (shadeIndex >= 8)
									return; //prevent coloring anything past shade slot 7, as the game would not do. 
											//would've used break instead but forEach doesn't support that!
								const hsv = rgbToHsv(r, g, b);

								//those ranges are precalculated in generateGmlCode so that we don't have to math them here
								if(isWrappingValueWithinRange(hsv.h, 0, 360, rangeDef.hL, rangeDef.hH)
								&& hsv.s >= rangeDef.sL && hsv.s <= rangeDef.sH
								&& hsv.v >= rangeDef.vL && hsv.v <= rangeDef.vH
								) {
									const mainColorForShade = this.colorProfilesMainColors[this.selectedColorProfile].shades[shadeIndex];
									matched = true;
									const defaultColorForShade = this.colorProfilesMainColors[0].shades[shadeIndex];

									const shd_val = mainColorForShade.shd_val;
									
									const accurateHSV = rgbToHsv_noRounding(r, g, b);

									const defaultToCurrentDeltaHSV = getHSVDelta(defaultColorForShade.accurateHSV, accurateHSV);
									const shiftedHSV = applyDeltaToHSV(mainColorForShade.accurateHSV, defaultToCurrentDeltaHSV);

									const shiftedRgb = hsvToRgb_noRounding(shiftedHSV.h, shiftedHSV.s, shiftedHSV.v);
									const mainToShiftedDeltaRGB = getRGBDelta(mainColorForShade.rgb, shiftedRgb);
									const shiftedRgb2 = applyDeltaToRGB({...shiftedRgb}, {
										r: mainToShiftedDeltaRGB.r * (shd_val - 1),
										g: mainToShiftedDeltaRGB.g * (shd_val - 1),
										b: mainToShiftedDeltaRGB.b * (shd_val - 1)
									});
									//console.log(shd_val);


									imageDataArray[i] = shiftedRgb2.r;
									imageDataArray[i+1] = shiftedRgb2.g;
									imageDataArray[i+2] = shiftedRgb2.b;

									cachedColorTransforms.set(`${r},${g},${b}`, shiftedRgb2);

									//console.log("px", i, "fitting rangeDef", hsv, mainColorForShade.hsv, defaultToCurrentDeltaHSV, shiftedRgb)
								}
							})

							if (!matched) {
								//reaching here means the color wasn't fitting in any range
								//console.log("unmatched color", r, g, b);
								cachedColorTransforms.set(`${r},${g},${b}`, {r, g, b});
							}
						}
					//}
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

			this.totalRenderTime = Date.now() - renderTimeStart;
			console.log("total render time:", this.totalRenderTime);
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

			const boundingCRect = canvas.getBoundingClientRect();

			const relX = ev.x - boundingCRect.left;
			const relY = ev.y - boundingCRect.top;

			const ctx = canvas.getContext('2d');

			const imageData = ctx.getImageData(relX, relY, 1, 1);
			const [r, g, b, a] = imageData.data;

			this.pickedColor = {r, g, b, a, x:relX, y:relY};
		},
	}
});

function getHSVDelta(hsv1, hsv2) {
	return {
		h: hsv1.h - hsv2.h,
		s: hsv1.s - hsv2.s,
		v: hsv1.v - hsv2.v,
	}
}

function applyDeltaToHSV(hsv, hsvDelta) {
	const hsvCopy = { ...hsv };

	hsvCopy.h = hsv.h - hsvDelta.h;
	if (hsvCopy.h < 0 || hsvCopy.h > 1)
		hsvCopy.h = wrap(1, hsvCopy.h);

	hsvCopy.s = clamp(0, hsvCopy.s - hsvDelta.s, 1);
	hsvCopy.v = clamp(0, hsvCopy.v - hsvDelta.v, 1);

	return hsvCopy;
}

function getRGBDelta(col1, col2) {
	return {
		r: parseFloat(col1.r) - parseFloat(col2.r),
		g: parseFloat(col1.g) - parseFloat(col2.g),
		b: parseFloat(col1.b) - parseFloat(col2.b),
	}
}

function applyDeltaToRGB(color, delta) {
	const copy = { ...color };

	copy.r = clamp(0, copy.r - delta.r, 255);
	copy.g = clamp(0, copy.g - delta.g, 255);
	copy.b = clamp(0, copy.b - delta.b, 255);

	return copy;
}

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
