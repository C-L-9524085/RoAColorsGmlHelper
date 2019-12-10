Colors.gml is a file used by Rivals of Aether's mods to tell the game how to recolor a custom character programatically. The official documentation is available here: https://www.rivalsofaether.com/workshop/colors-gml/

The file's tedious to hand-write because of the color picking, conversion and the little bit of maths needed. This tool aims to generate required code by using a relatively simple interface, and provides a preview of what the recolor will look like.

The general idea is that the game shifts the Hue, Saturation and Value of colors that match a "range" around a "main" color, with the difference between that range's "original" "main" color and the recolor's "main" color for the same slot.
