=> https://cl-9a.github.io/RoAColorsGmlHelper/ <=

Colors.gml is a file used by Rivals of Aether's mods to tell the game how to recolor a custom character programatically. The official documentation is available here: https://www.rivalsofaether.com/workshop/colors-gml/

The file is tedious to hand-write because of the color picking, conversion and the little bit of maths needed. This tool aims to generate the required code by using a relatively simple interface, and provides a preview of what the recolor will look like.

The general idea is that the game shifts the Hue, Saturation and Value of colors that match a "range" around a "main" color, with the difference between that range's "original" "main" color and the recolor's "main" color for the same slot.

![usage video](https://i.imgur.com/1NYuQ7d.gif)
More usage videos [here](https://streamable.com/i5h69) and [here](https://streamable.com/zkf5c)

This is still WIP (you can check progress in the issues). If something seems amiss, feel free to contact me and/or open an issue.

---

Here's the base characters' recolors:
![test](https://i.imgur.com/eGsVKdY.png)
(credits to waffles_ns for the picture)

---

Built with [vue.js](https://vuejs.org/), [tinycolor](http://bgrins.github.io/TinyColor/), and stackoverflow. The color picker is heavily based on https://vuejsexamples.com/vue-color-picker/. This repo's content is under the [Unlicense](https://unlicense.org/), save for snippets of code that weren't mine (sources are in comments), and the vue.js and tinycolor.js libraries which I committed because I don't know better.

I only found out after writting the recolor code, but a 2017-version of the in-game shader [can be found here](https://pastebin.com/kXsTD1Vu). It is apparently an extended version of [this script](https://gmc.yoyogames.com/index.php?showtopic=589348) from 2013 (with a 2015-[updated version here](https://www.gmlscripts.com/script/sprite_replace_color_blend)). Current-day (2019) in-game version has more code, mostly related to specific official characters' recolors.
