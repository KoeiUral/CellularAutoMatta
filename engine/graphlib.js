let DEFAULT_W = 600;
let DEFAULT_H = 600;

const FONT_SIZE = 26;
const COLOR_MAX = 255;
const COLOR_DEPTH = 4;

const FONT_PATH = './media/font/C64_Pro_Mono-STYLE.ttf';
let fontReady = false;
let myFont;

let configMap;
let M = [];  // BAYER DITHERING MATRIX


/**
 * This function up scale a source image without alliasing not blurring, pixel are replicated scaleFactor times
 * 
 * @param {*} srcImg Source image
 * @param {*} dstImg Result image
 * @param {*} scaleFactor Scale factor
 * @returns 
 */
function upScale(srcImg, dstImg, scaleFactor) {
    let sx, sy, dx, dy;
    let si, di;

    dstImg = createImage(srcImg.width * scaleFactor, srcImg.height * scaleFactor);

    srcImg.loadPixels();
    dstImg.loadPixels();

    // Iterate over the source image
    for (sy = 0; sy < srcImg.height; sy++) {
        for (sx = 0; sx < srcImg.width; sx++) {
            si = (sx + sy * srcImg.width) * COLOR_DEPTH;

            // Copy into the upscaled dest pixel
            for (dy = 0; dy < scaleFactor; dy++) {
                for (dx = 0; dx < scaleFactor; dx++) {
                    di = ((sx * scaleFactor + dx) + (sy * scaleFactor + dy) * dstImg.width) * COLOR_DEPTH

                    dstImg.pixels[di] = srcImg.pixels[si];
                    dstImg.pixels[di + 1] = srcImg.pixels[si + 1];
                    dstImg.pixels[di + 2] = srcImg.pixels[si + 2];
                    dstImg.pixels[di + 3] = srcImg.pixels[si + 3];
                }
            }
        }
    }

    dstImg.updatePixels(); 
    return dstImg;
}



/**
 * The function applies a Stainberg-Floyd dither filter on the image
 * 
 * @param {*} srcImg Source Image to be dithered
 */
function ditherIt(srcImg, greyScale, depthOffset) {
    const xOffset = [1, -1, 0, 1];
    const yOffset = [0, 1, 1, 1];
    const weigth = [7, 3, 5, 1];
    const COLOR_CH_NBR = 1; //COLOR_CH_NBR^3 colors, with 2 => 8 colors

    let r, g, b, newR, newG, newB, errR, errG, errB, grey;
    let i, iNext;
    let colorScale = round (255 / (pow(2, COLOR_CH_NBR) - 1));
    let colorDepth = depthOffset;
    
    srcImg.loadPixels();
    
    // Iterate over each pixel 
    for (let y = 0; y < srcImg.height - 1; y++) {
        for (let x = 1; x < srcImg.width - 1; x++) { 
          i = (x + y * srcImg.width) * colorDepth; //COLOR_DEPTH;
  
          r = srcImg.pixels[i + 0];
          g = srcImg.pixels[i + 1];
          b = srcImg.pixels[i + 2];

          if(greyScale) {
            grey = round((r + g + b) / 3);
            r = grey;
            g = grey;
            b = grey;
          }

          newR =  (r >> (8 - COLOR_CH_NBR)) * colorScale;
          newG =  (g >> (8 - COLOR_CH_NBR)) * colorScale;
          newB =  (b >> (8 - COLOR_CH_NBR)) * colorScale;

          errR = r - newR;
          errG = g - newG;
          errB = b - newB;
          
          srcImg.pixels[i + 0] = newR;
          srcImg.pixels[i + 1] = newG;
          srcImg.pixels[i + 2] = newB;

          for (let j = 0; j < 4; j++) {
            iNext = ((x + xOffset[j]) + (y + yOffset[j]) * srcImg.width) * colorDepth;
            r = srcImg.pixels[iNext + 0];
            g = srcImg.pixels[iNext + 1];
            b = srcImg.pixels[iNext + 2];
            r = r + errR * weigth[j]/16;
            g = g + errG * weigth[j]/16;
            b = b + errB * weigth[j]/16;
            srcImg.pixels[iNext + 0] = r;
            srcImg.pixels[iNext + 1] = g;
            srcImg.pixels[iNext + 2] = b;          
          }

        }
    }
    
    srcImg.updatePixels();
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function initBayerMatrix() {
    //initilize constants
    const DIM = 8;
    const DIM_2 = DIM * DIM;

    //define threshold map
    M = [[0,32,8,40,2,34,10,42],
         [48,16,56,24,50,18,58,26],
         [12,44,4,36,14,46,6,38],
         [60,28,52,20,62,30,54,22],
         [3,35,11,43,1,33,9,41],
         [51,19,59,27,49,17,57,25],
         [15,47,7,39,13,45,5,37],
         [63,31,55,23,61,29,53,21]];

    for(let i = 0; i < DIM; i++) {
        for(let j = 0; j < DIM; j++) {
            M[i][j] = M[i][j] / (DIM_2); 
        }
    }
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function BayerDithering(srcImg, colors, dim) {
    const f = (colors - 1) / 255;
    const c_ = (colors - 1);
    let i, T;

    srcImg.loadPixels();

    for (let y = 0; y < srcImg.height - 1; y++) {
        for (let x = 1; x < srcImg.width - 1; x++) { 
            i = (x + y * srcImg.width) * COLOR_DEPTH;
            T = M[x % dim][y % dim];

            srcImg.pixels[i    ] = 255 * Math.floor(T + srcImg.pixels[i    ] * f) / c_;
            srcImg.pixels[i + 1] = 255 * Math.floor(T + srcImg.pixels[i + 1] * f) / c_;
            srcImg.pixels[i + 2] = 255 * Math.floor(T + srcImg.pixels[i + 2] * f) / c_;
            //srcImg.pixels[i+3] = 255;
        }  
    }

    srcImg.updatePixels();
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function initGraphLib(confObj) {
    // Copy the data into variable
    configMap = JSON.parse(JSON.stringify(confObj));

    // Set width and height per json file
    DEFAULT_W = configMap['GLOBAL']['Canvas'].w;
    DEFAULT_H = configMap['GLOBAL']['Canvas'].h;

    pixelDensity(1);
    initBayerMatrix();
    fontReady = true;
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function addAlphaMask(srcImg, imgScale, mask, lowTh, highTh) {
    let maskScale = DEFAULT_H / mask.length;
    let mx, my, i;

    srcImg.loadPixels();

    for (let y = 0; y < srcImg.height; y++) {
        for (let x = 0; x < srcImg.width; x++) {
            mx = floor (x * imgScale / maskScale);
            my = floor (y * imgScale / maskScale);
            i = (x + y * srcImg.width) * 4;

            /* If the mask value for pixel x,y is contained in the range, then solid else transparent */
            if ((mask[my][mx] >= lowTh) && (mask[my][mx] <= highTh)) {
                srcImg.pixels[i + 3] = 255;
            } else {
                srcImg.pixels[i + 3] = 0;
            }
        }
    }

    srcImg.updatePixels(); 
}


const grayRamp = ' _.,-=+:;cba!?0123456789$W#@Ñ';
const grayRampColor = " ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■";
const rampLength = grayRamp.length;
const rampLengthColor = grayRampColor.length;
const toGrayScale = (r, g, b) => 0.21 * r + 0.72 * g + 0.07 * b;
const getCharacterForGrayScale = grayScale => grayRamp[Math.ceil(((rampLength - 1) * grayScale) / 255)];
const getCharacterForColor = grayScale => grayRampColor[Math.ceil(((rampLengthColor - 1) * grayScale) / 255)];

/**
 * The function ....
 * 
 * @param {*} ....
 */
function asciifyIt(srcImg, scale, font, colorFlag) {
    let x, y;
    let grayLevel;
    let pixelChar;
    let grphCtx = createGraphics(srcImg.width * scale, srcImg.height * scale);

    srcImg.loadPixels();
    noStroke();

    grphCtx.textFont(font);

    // Iterate over each pixel 
    for (y = 0; y < srcImg.height; y++) {
        for (x = 0; x < srcImg.width; x++) { 
            i = (x + y * srcImg.width) * COLOR_DEPTH;

            grayLevel = toGrayScale(srcImg.pixels[i], srcImg.pixels[i + 1], srcImg.pixels[i + 2]);

            if (srcImg.pixels[i+3]===255) {
                pixelChar = (colorFlag) ? getCharacterForColor (grayLevel) : 
                                          getCharacterForGrayScale(grayLevel);
            
                grphCtx.fill(0);
                grphCtx.rect(x * scale, y * scale, scale, scale);

                if (colorFlag) {
                    grphCtx.fill(srcImg.pixels[i], srcImg.pixels[i + 1], srcImg.pixels[i + 2]);
                } else {
                    grphCtx.fill(255);
                }

                grphCtx.textSize(scale);
                grphCtx.textAlign(CENTER, CENTER);
                grphCtx.text(pixelChar, x * scale + scale * 0.5, y * scale + scale * 0.5);  
            }
        }
    }

    return grphCtx.get();
}


/** -------------------------------------------------------------------------------------------------------------
 *                                     HELPER functions to convert from RGB to HSV
 *  ------------------------------------------------------------------------------------------------------------- */

/**
 * The function ....
 * 
 * @param {*} ....
 */
 function rgb2hsv(r, g, b) {
    r = r / COLOR_MAX;
    g = g / COLOR_MAX;
    b = b / COLOR_MAX;

    let cMax = Math.max(r, g, b);
    let cMin = Math.min(r, g, b);
    let delta = cMax - cMin;
    let h, s, v;

    if (delta == 0) {
        h = 0;
    } else if (cMax == r) {
        h = 60 * (((g - b) / delta) % 6);
    } else if (cMax == g) {
        h = 60 * ((b - r) / delta + 2);
    } else {
        h = 60 * ((r - g) / delta + 4);
    }

    if (cMax == 0) {
        s = 0;
    } else {
        s = delta / cMax;
    }

    v = cMax;

    return [h, s, v];
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function hsv2rgb(h, s, v) {
    if (s == 0.0) {
        v *= COLOR_MAX;
        return [v, v, v];
    } 
    
    let i = Math.round(h / 360 * 6.0);
    let f = (h / 360 * 6.0) - i;

    let [p, q, t] = [Math.round(COLOR_MAX*(v*(1.0-s))), Math.round(COLOR_MAX*(v*(1.0-s*f))), Math.round(COLOR_MAX*(v*(1.0-s*(1.0-f))))];

    v*=COLOR_MAX; 
    i = i % 6;

    if (i == 0) {
        return [v, t, p];
    } else if (i == 1) {
        return [q, v, p];
    } else if (i == 2) {
        return [p, v, t];
    } else if (i == 3) {
        return [p, q, v];
    } else if (i == 4) {
        return [t, p, v];
    } else if (i == 5) {
        return [v, p, q];
    } else {
        return [0, 0, 0];
    }
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function ShiftHue(srcImg, offset, flashRange, satValue) {
    // Load the pixel arrays
    srcImg.loadPixels();

    offset += random(flashRange);

    // Iterate over each pixel 
    for (let i = 0; i < COLOR_DEPTH * (srcImg.width * srcImg.height); i += COLOR_DEPTH) {
        // Process the pixel if it is not trasparent, i.e. alpha ch != 0
        if (srcImg.pixels[i + 3] == COLOR_MAX) {
            // Get the HSV coords.
            let [h,s,v] = rgb2hsv(srcImg.pixels[i], srcImg.pixels[i + 1], srcImg.pixels[i + 2]);

            // Add an offset to the h, rember the wrap around 2PI
            h += offset;

            if (h < 0) {
                h = 360 + h;
            } else if (h > 360) {
                h = h - 360;
            }

            if (satValue != 0) {
                s = s + (satValue)*(1-s);
            }

            // Set back to RGB
            [srcImg.pixels[i], srcImg.pixels[i + 1], srcImg.pixels[i + 2]] = hsv2rgb(h, s, v);
        }
    }

    srcImg.updatePixels();
}

/**
 * The function ....
 * 
 * @param {*} ....
 */
function getFiles(path) {
    let files = [];
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', path, false); // false for synchronous request
    xmlHttp.send(null);

    let ret = xmlHttp.responseText;
    let contentList = ret.split('\n');
    let rx;

    // build up the regex according to browser
    if (navigator.userAgent.indexOf("Firefox") != -1) {
        rx = /title=\"(.*)\"><span/;
    } else if (navigator.userAgent.indexOf("Chrome") != -1) {
        rx = /href=\"(.+)\?/;
    }

    for (let i = 0; i < contentList.length; i++) {
        let found = rx.exec(contentList[i]);

        if ((found !== null) && (found[1].indexOf("..") == -1)){
            files.push(found[1]);
        }
    }

    return files;
}

