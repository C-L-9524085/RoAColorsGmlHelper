/*document.getElementById('txtinput').addEventListener("input", (e) => {
	console.log("input input:", e.target.value);
	parseInput();
})*/

//parseInput();

function emptyArray(arr) {
	for (let i in arr)
		arr.pop();
}

const wm = new Vue({
	el: '#app',
	data: {
		rows: [],
		highestColorSlot: 0,
		highestshadeSlot: 0,
		targetColor: null,
		//mainColor: null
	},
	methods: {
		parseInput: function() {
			console.log("parseInput()")
			const txt = document.getElementById('txtinput').value;
			this.rows = [];

			try {
				this.rows = JSON.parse(txt);

				console.log("checking", this.rows.length, "rows")
				for (let i = 0; i < this.rows.length; i++) {
					if (this.rows[i] == null)
						this.rows[i] = {name: "unamed color row", colors: []}
					else {
						const row = this.rows[i];
						console.log("checking", row.colors.length, "colors")
						for (let i2 = 0; i2 < row.colors.length; i2++) {
							console.log("beep", i2, row.colors.length, i2 <= row.colors.length)
							if (row.colors[i2] == null)
								row.colors[i2] = {set: false}
						}
					}
				}

				console.log("done parsing");
			} catch(e) {
				console.error("unable to parse input", e)
				this.rows = [];
			}

			this.generateGmlCode()
		},
		addRow: function() {
			this.rows.push({name: "unamed color row", colors: []})
			this.updateInput();
		},
		addSlot: function(inRow) {
			inRow.colors.push({set: false, r: 0, g: 0, b: 0})
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

				this.targetColor.set = true;

				this.setHSVDisplay(this.targetColor);
				this.$forceUpdate();
				this.generateGmlCode();
				this.updateInput();
			} else {
				console.warn("color input but no target color set")
			}
		},
		unsetColor: function() {
			console.log("unsetColor()");

			if (this.targetColor) {
				if (this.targetColor.set) {
					this.targetColor.set = false;
					this.targetColor.main = false;
				}
				else
					this.targetColor.set = true;

				this.$forceUpdate();
				this.generateGmlCode();
				this.updateInput();
			} else {
				console.warn("color unset but no target color")
			}
		},
		changeRowName: function(event, row) {
			event.target.innerText = event.target.innerText.replace(/\n/g, "");
			row.name = event.target.innerText;
			this.generateGmlCode();
			this.updateInput();
		},
		generateGmlCode: function() {
			console.log("generateGmlCode()")
			var mainColorsStr = "// DEFAULT COLOR";
			var rangesStr = "\n\n// Ranges";

			this.rows.forEach((row, iRow) => {
				const HSVs = [];
				var HSVMain = null;

				row.colors.forEach((color, iCol) => {
					if (color.set) {
						const HSV = rgbToHsv(color.r, color.g, color.b);
						HSVs.push(HSV);
						if (color.main) {
							HSVMain = HSV;
							mainColorsStr += `\nset_color_profile_slot( 0, ${iRow}, ${color.r}, ${color.g}, ${color.b} ); // ${row.name}`;
						}
					}
				})


				if (HSVMain) {
					var highestHueDistance = 0;
					var furthestHSV = HSVMain;

					HSVs.forEach(HSV => {
						const hueDistance = getHueDistance(HSVMain.h, HSV.h) || 0; //brok on blak
						console.log(row.name, iRow, "hsv", HSV, HSVs.length, "distance from main:", hueDistance)
						if (hueDistance > highestHueDistance) {
							highestHueDistance = hueDistance;
							furthestHSV = HSV;
						}
					});

					rangesStr += `\nset_color_profile_slot_range( ${iRow}, ${getRange(furthestHSV.h,HSVMain.h) + 1}, ${getRange(furthestHSV.s, HSVMain.s) + 1}, ${getRange(HSVMain.v, furthestHSV.v) + 1} );`;
				}

				
			})

			document.getElementById('txtoutput').value = mainColorsStr + rangesStr;
		},
		updateInput: function() {
			console.log("updateInput()")
			document.getElementById('txtinput').value = JSON.stringify(this.rows, null, 4);
		}
	}
});

function getRange(n1, n2) {
	return n1 > n2 ? n1 - n2 : n2 - n1;
}

function getHueDistance(h0, h1) {
	return Math.min(Math.abs(h1-h0), 360-Math.abs(h1-h0))
}

// https://stackoverflow.com/questions/2348597/why-doesnt-this-javascript-rgb-to-hsl-code-work/2348659#2348659 slightly edited
function rgbToHsv(r, g, b) {
    var
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        delta = max - min,
        h, s, v = max;

    v = Math.round(max / 255 * 100);
    if ( max != 0 )
        s = Math.round(delta / max * 100);
    else {
        // black
        return [0, 0, 0];
    }

    if( r == max )
        h = ( g - b ) / delta;         // between yellow & magenta
    else if( g == max )
        h = 2 + ( b - r ) / delta;     // between cyan & yellow
    else
        h = 4 + ( r - g ) / delta;     // between magenta & cyan

    h = Math.round(h * 60);            // degrees
    if( h < 0 ) h += 360;

    return {h, s, v};
}
