/*
 * badges.js — Hades' Star corp badge compositor (shared core)
 *
 * Works in TWO environments from one file:
 *
 *   Node backend (uses node-canvas):
 *     const Badges = require('./badges.js');
 *     const canvas = await Badges.generateBadge({
 *       symbolIdx: 4, borderIdx: 1, color1Idx: 0, color2Idx: 6,
 *       assetBase: __dirname + '/assets'   // folder holding the PNGs
 *     });
 *     require('fs').writeFileSync('badge.png', canvas.toBuffer('image/png'));
 *
 *   Browser (uses the built-in <canvas>):
 *     <script src="badges.js"></script>
 *     const canvas = await Badges.generateBadge({
 *       symbolIdx: 4, borderIdx: 1, color1Idx: 0, color2Idx: 6,
 *       assetBase: 'assets'               // URL prefix to the PNGs
 *     });
 *     document.querySelector('#stage').getContext('2d').drawImage(canvas, 0, 0);
 *
 * generateBadge() always returns a 300x300 canvas object for the current
 * environment. Indices match the original DB columns (SymbolIdx, BorderIdx,
 * Color1Idx, Color2Idx); out-of-range/wrong-layer values fall back to defaults.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();          // Node: require('./badges.js')
  } else {
    root.Badges = factory();             // Browser: window.Badges
  }
})(typeof self !== 'undefined' ? self : this, function () {

  var isNode = (typeof window === 'undefined');

  // --- Environment-specific canvas + image loader -------------------------
  var createCanvas, loadImage;
  if (isNode) {
    var nodeCanvas = require('canvas');
    createCanvas = nodeCanvas.createCanvas;
    loadImage = nodeCanvas.loadImage;
  } else {
    createCanvas = function (w, h) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      return c;
    };
    loadImage = function (src) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin = 'anonymous'; // lets getImageData read remote (CORS) assets
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('CORPBADGE_IMAGE_LOAD_FAILED: ' + src)); };
        img.src = src;
      });
    };
  }

  // Remote asset hosts (raw bytes, CORS-enabled), tried in order as fallbacks
  // so the module works with no local assets/ folder. REMOTE is the site's own
  // CDN-backed domain; REMOTE2 is a raw-GitHub backstop. Change 'main' to your
  // default branch if different.
  var REMOTE = 'https://badge.tsl.rocks/assets';
  var REMOTE2 = 'https://raw.githubusercontent.com/CapricanDRJ/corpbadge/main/assets';
  function joinBase(base, file) { return String(base).replace(/\/+$/, '') + '/' + file; }
  // Try primaryBase, then REMOTE, then REMOTE2. De-duped so a base isn't retried.
  function loadAsset(file, primaryBase) {
    var chain = [primaryBase, REMOTE, REMOTE2].filter(function (b, i, a) {
      return a.indexOf(b) === i;
    });
    var idx = 0;
    function attempt() {
      return loadImage(joinBase(chain[idx], file)).catch(function (err) {
        idx++;
        if (idx >= chain.length) throw err;
        return attempt();
      });
    }
    return attempt();
  }

  // --- Data (from genCorpIcons.js) ---------------------------------------
  var colorData = [
    { name: 'Blue',       r: 64,  g: 205, b: 254, layer: 0 },
    { name: 'Green',      r: 64,  g: 254, b: 203, layer: 0 },
    { name: 'Yellow',     r: 254, g: 227, b: 64,  layer: 0 },
    { name: 'Pink',       r: 246, g: 109, b: 143, layer: 0 },
    { name: 'Purple',     r: 140, g: 101, b: 254, layer: 0 },
    { name: 'White',      r: 255, g: 255, b: 255, layer: 0 },
    { name: 'DarkBlue',   r: 22,  g: 48,  b: 58,  layer: 1 },
    { name: 'DarkGreen',  r: 22,  g: 58,  b: 48,  layer: 1 },
    { name: 'DarkYellow', r: 58,  g: 53,  b: 22,  layer: 1 },
    { name: 'DarkRed',    r: 57,  g: 31,  b: 38,  layer: 1 },
    { name: 'DarkPurple', r: 37,  g: 30,  b: 59,  layer: 1 },
    { name: 'Black',      r: 0,   g: 0,   b: 0,   layer: 1 },
  ];

  var iconData = [
    { name: '1',  iconFile: 'badge_Symbol_1.png',  outlineFile: '', layer: 0 },
    { name: '2',  iconFile: 'badge_shape_1.png',   outlineFile: 'badge_shape_1_outline.png', layer: 1 },
    { name: '3',  iconFile: 'badge_Symbol_2.png',  outlineFile: '', layer: 0 },
    { name: '4',  iconFile: 'badge_Symbol_3.png',  outlineFile: '', layer: 0 },
    { name: '5',  iconFile: 'badge_Symbol_4.png',  outlineFile: '', layer: 0 },
    { name: '6',  iconFile: 'badge_shape_2.png',   outlineFile: 'badge_shape_2_outline.png', layer: 1 },
    { name: '7',  iconFile: 'badge_shape_3.png',   outlineFile: 'badge_shape_3_outline.png', layer: 1 },
    { name: '8',  iconFile: 'badge_shape_4.png',   outlineFile: 'badge_shape_4_outline.png', layer: 1 },
    { name: '9',  iconFile: 'badge_shape_5.png',   outlineFile: 'badge_shape_5_outline.png', layer: 1 },
    { name: '10', iconFile: 'badge_Symbol_5.png',  outlineFile: '', layer: 0 },
    { name: '11', iconFile: 'badge_Symbol_6.png',  outlineFile: '', layer: 0 },
    { name: '12', iconFile: 'badge_Symbol_7.png',  outlineFile: '', layer: 0 },
    { name: '13', iconFile: 'badge_Symbol_8.png',  outlineFile: '', layer: 0 },
    { name: '14', iconFile: 'badge_Symbol_9.png',  outlineFile: '', layer: 0 },
    { name: '15', iconFile: 'badge_Symbol_10.png', outlineFile: '', layer: 0 },
    { name: '16', iconFile: 'badge_Symbol_11.png', outlineFile: '', layer: 0 },
    { name: '17', iconFile: 'badge_shape_6.png',   outlineFile: 'badge_shape_6_outline.png', layer: 1 },
    { name: '18', iconFile: 'badge_shape_7.png',   outlineFile: 'badge_shape_7_outline.png', layer: 1 },
    { name: '19', iconFile: 'badge_Symbol_12.png', outlineFile: '', layer: 0 },
    { name: '20', iconFile: 'badge_Symbol_13.png', outlineFile: '', layer: 0 },
    { name: '21', iconFile: 'badge_Symbol_14.png', outlineFile: '', layer: 0 },
    { name: '22', iconFile: 'badge_Symbol_15.png', outlineFile: '', layer: 0 },
    { name: '23', iconFile: 'badge_Symbol_16.png', outlineFile: '', layer: 0 },
    { name: '24', iconFile: 'badge_Symbol_17.png', outlineFile: '', layer: 0 },
    { name: '25', iconFile: 'badge_Symbol_18.png', outlineFile: '', layer: 0 },
    { name: '26', iconFile: 'badge_Symbol_19.png', outlineFile: '', layer: 0 },
    { name: '27', iconFile: 'badge_Symbol_20.png', outlineFile: '', layer: 0 },
    { name: '28', iconFile: 'badge_Symbol_21.png', outlineFile: '', layer: 0 },
    { name: '29', iconFile: 'badge_Symbol_22.png', outlineFile: '', layer: 0 },
    { name: '30', iconFile: 'badge_Symbol_23.png', outlineFile: '', layer: 0 },
    { name: '31', iconFile: 'badge_Symbol_24.png', outlineFile: '', layer: 0 },
    { name: '32', iconFile: 'badge_Symbol_25.png', outlineFile: '', layer: 0 },
    { name: '33', iconFile: 'badge_Symbol_26.png', outlineFile: '', layer: 0 },
    { name: '34', iconFile: 'badge_Symbol_27.png', outlineFile: '', layer: 0 },
    { name: '35', iconFile: 'badge_Symbol_28.png', outlineFile: '', layer: 0 },
    { name: '36', iconFile: 'badge_Symbol_29.png', outlineFile: '', layer: 0 },
    { name: '37', iconFile: 'badge_Symbol_30.png', outlineFile: '', layer: 0 },
    { name: '38', iconFile: 'badge_Symbol_31.png', outlineFile: '', layer: 0 },
    { name: '39', iconFile: 'badge_Symbol_32.png', outlineFile: '', layer: 0 },
    { name: '40', iconFile: 'badge_Symbol_33.png', outlineFile: '', layer: 0 },
    { name: '41', iconFile: 'badge_Symbol_34.png', outlineFile: '', layer: 0 },
    { name: '42', iconFile: 'badge_Symbol_35.png', outlineFile: '', layer: 0 },
    { name: '43', iconFile: 'badge_Symbol_36.png', outlineFile: '', layer: 0 },
    { name: '44', iconFile: 'badge_Symbol_37.png', outlineFile: '', layer: 0 },
    { name: '45', iconFile: 'badge_Symbol_38.png', outlineFile: '', layer: 0 },
    { name: '46', iconFile: 'badge_Symbol_39.png', outlineFile: '', layer: 0 },
    { name: '47', iconFile: 'badge_Symbol_40.png', outlineFile: '', layer: 0 },
    { name: '48', iconFile: 'badge_shape_8.png',   outlineFile: 'badge_shape_8_outline.png',  layer: 1 },
    { name: '49', iconFile: 'badge_shape_9.png',   outlineFile: 'badge_shape_9_outline.png',  layer: 1 },
    { name: '50', iconFile: 'badge_shape_10.png',  outlineFile: 'badge_shape_10_outline.png', layer: 1 },
    { name: '51', iconFile: 'badge_shape_11.png',  outlineFile: 'badge_shape_11_outline.png', layer: 1 },
    { name: '52', iconFile: 'badge_shape_12.png',  outlineFile: 'badge_shape_12_outline.png', layer: 1 },
    { name: '53', iconFile: 'badge_shape_13.png',  outlineFile: 'badge_shape_13_outline.png', layer: 1 },
    { name: '54', iconFile: 'badge_shape_14.png',  outlineFile: 'badge_shape_14_outline.png', layer: 1 },
    { name: '55', iconFile: 'badge_shape_15.png',  outlineFile: 'badge_shape_15_outline.png', layer: 1 },
  ];

  // --- Recolor while preserving shading ----------------------------------
  function colorize(image, color) {
    var canvas = createCanvas(300, 300);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    var imgData = ctx.getImageData(0, 0, 300, 300);
    var d = imgData.data;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        var gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
        d[i]     = (gray / 255) * color.r;
        d[i + 1] = (gray / 255) * color.g;
        d[i + 2] = (gray / 255) * color.b;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // --- Compose a badge → returns a 300x300 canvas ------------------------
  function generateBadge(opts) {
    opts = opts || {};
    // Primary base: local 'assets' by default; each load falls back to REMOTE.
    var assetBase = (opts.assetBase || 'assets').replace(/\/+$/, '');

    // Fallback logic identical to the original generateFavicons()
    var symbol = (iconData[opts.symbolIdx] && iconData[opts.symbolIdx].layer === 0)
      ? iconData[opts.symbolIdx]
      : iconData.find(function (ic) { return ic.layer === 0; }) || iconData[0];
    var border = (iconData[opts.borderIdx] && iconData[opts.borderIdx].layer === 1)
      ? iconData[opts.borderIdx]
      : iconData.find(function (ic) { return ic.layer === 1; }) || iconData[0];
    var color1 = (colorData[opts.color1Idx] && colorData[opts.color1Idx].layer === 0)
      ? colorData[opts.color1Idx]
      : colorData.find(function (c) { return c.layer === 0; }) || colorData[0];
    var color2 = (colorData[opts.color2Idx] && colorData[opts.color2Idx].layer === 1)
      ? colorData[opts.color2Idx]
      : colorData.find(function (c) { return c.layer === 1; }) || colorData[0];

    return Promise.all([
      loadAsset(symbol.iconFile, assetBase),
      loadAsset(border.iconFile, assetBase),
      border.outlineFile
        ? loadAsset(border.outlineFile, assetBase).catch(function () { return null; })
        : Promise.resolve(null),
    ]).then(function (imgs) {
      var symbolIcon = imgs[0], borderIcon = imgs[1], outlineIcon = imgs[2];

      var canvas = createCanvas(300, 300);
      var ctx = canvas.getContext('2d');

      // 1. border fill (layer 1) with color2
      ctx.drawImage(colorize(borderIcon, color2), 0, 0);
      // 2. border outline with color1
      if (outlineIcon) ctx.drawImage(colorize(outlineIcon, color1), 0, 0);
      // 3. symbol (layer 0) with color1, resized/offset
      var shapeOffset = (border.name === '48' || border.name === '49') ? 0.612 : 0.5;
      var resizeFactor = 0.63;
      var nw = 300 * resizeFactor, nh = 300 * resizeFactor;
      var offsetX = (300 - nw) * 0.5;
      var offsetY = (300 - nh) * shapeOffset;
      ctx.drawImage(colorize(symbolIcon, color1), offsetX, offsetY, nw, nh);

      return canvas;
    });
  }

  return {
    colorData: colorData,
    iconData: iconData,
    colorize: colorize,
    generateBadge: generateBadge,
    REMOTE: REMOTE,
    REMOTE2: REMOTE2,
  };
});
