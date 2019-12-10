Colors.gml is a file used by Rivals of Aether's mods to tell the game how to recolor a custom character programatically. The official documentation is available here: https://www.rivalsofaether.com/workshop/colors-gml/

The file is tedious to hand-write because of the color picking, conversion and the little bit of maths needed. This tool aims to generate the required code by using a relatively simple interface, and provides a preview of what the recolor will look like.

The general idea is that the game shifts the Hue, Saturation and Value of colors that match a "range" around a "main" color, with the difference between that range's "original" "main" color and the recolor's "main" color for the same slot.

You can see a basic/bad usage video here: https://streamable.com/zkf5c
where I load a picture, pick some colors, define main colors, and switch between recolors.

This is still WIP (you can check progress in the issues). It has some quirks (most importantly, there's a bug where it doesn't recolor gray colors.) If something seems amiss, feel free to contact me and/or open an issue.

--

Built with [vue.js](https://vuejs.org/), [tinycolor](http://bgrins.github.io/TinyColor/), stackoverflow, color picker heavily based on https://vuejsexamples.com/vue-color-picker/. This repo's content is under the [Unlicense](https://unlicense.org/), save for snippets of code that weren't mine (sources are in comments), and the vue.js and tinycolor.js libraries which I committed because I don't know better.
