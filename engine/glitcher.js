const GlitchType = {
    SCANLINE: 0,
    SCRAMBLE: 1,
    WARP: 2,
    NOISE: 3,
    NEG: 4,
    RGBSHIFT: 5,
    EFFECT_NBR: 6
};

const GlitchSeqState = {
    IDLE: 'IDLE',
    ON: 'ON',
    WAIT: 'WAIT'
};

const SCAN_DIR = 0;
const SCAN_X = 1;
const SCAN_Y = 2;
const WARP_OFF = 0;
const BURN_R = 0;
const BURN_G = 1;
const BURN_B = 2;
const NOISE_LEVEL = 0;
const SHIFT_RX = 0;
const SHIFT_RY = 1;
const SHIFT_GX = 2;
const SHIFT_GY = 3;
const SHIFT_BX = 4;
const SHIFT_BY = 5;

const MIN_GL_FRAMES = 7;
const MAX_GL_FRAMES = 35;
const MAX_SEQ_LEN = 10;
const STEP_WAIT_TIME = 35;


class Glitcher {
    constructor() {
        this.isPreOn = false;
        this.dynamicGlitch = true;
        this.imageScale = 1;

        this.scanOptions = [0, 0, 0];
        this.scrambleOptions = []; // Glitch Holes
        this.warpOptions = [0];
        this.burnOptions = [0, 0, 0]; // TODO: Remove IT
        this.noiseOptions = [0];
        this.rgbShiftOptions = [0, 0, 0, 0, 0, 0];

        this.currentState = GlitchSeqState.IDLE;
        this.currentStep = 0;
        this.glitchEffects = [];
        this.sequence = [];
        this.frames = 0;
        this.nextFrames = 0;
        this.waitTime = 0;
        this.sequenceLoop = true;
    }

    setImagScale(value = 1){
        this.imageScale = value;
    }

    confGlitchOptions(glitchList) {
        let scale = (this.isPreOn) ? this.imageScale : 1;

        for (let i = 0; i < glitchList.length; i++) {
            if (glitchList[i] == GlitchType.SCANLINE) {
                this.scanOptions[SCAN_DIR] = random(1);
                this.scanOptions[SCAN_X] = floor(random(DEFAULT_W / scale));
                this.scanOptions[SCAN_Y] = floor(random(DEFAULT_H / scale));
            } else if (glitchList[i] == GlitchType.SCRAMBLE) {
                this.scrambleOptions.length = 0;
                let N = floor(random (10, 20)); //TODO: MAGIC NUMBER

                for (let i = 0; i < N; i++) {
                    let srcX = floor(random(DEFAULT_W / scale));
                    let srcY = floor(random(DEFAULT_H / scale));
                    let srcW = floor(random(DEFAULT_W / scale));
                    let srcH = floor(random(DEFAULT_H / scale));
                    
                    let dstX = floor(random(DEFAULT_W / scale));
                    let dstY = floor(random(DEFAULT_H / scale));
                    let dstW = floor(random(DEFAULT_W / scale));
                    let dstH = floor(random(DEFAULT_H / scale));
        
                    this.scrambleOptions.push({ sx: srcX, sy: srcY , sw: srcW, sh: srcH,
                                                dx: dstX, dy: dstY , dw: dstW, dh: dstH});
                }
            } else if (glitchList[i] == GlitchType.WARP) { 
                this.warpOptions[WARP_OFF] = floor(random(1, DEFAULT_W / 2 / scale));
            }  else if (glitchList[i] == GlitchType.NOISE) { 
                this.noiseOptions[NOISE_LEVEL] = random();
            } else if (glitchList[i] == GlitchType.RGBSHIFT) {
                this.rgbShiftOptions[SHIFT_RX] = floor(random(-50, 50));  // TODO: Remove MAGIC NUMBERs
                this.rgbShiftOptions[SHIFT_RY] = floor(random(-50, 50));
                this.rgbShiftOptions[SHIFT_GX] = floor(random(-50, 50));
                this.rgbShiftOptions[SHIFT_GY] = floor(random(-50, 50));
                this.rgbShiftOptions[SHIFT_BX] = floor(random(-50, 50));
                this.rgbShiftOptions[SHIFT_BY] = floor(random(-50, 50));
            }
        }
    
        // Set the number of glitched frames
        let glitchTime = parseInt(random(MIN_GL_FRAMES, MAX_GL_FRAMES));
        return glitchTime;
    }

    startSequence() {
        let stepNbr = floor(random(2, MAX_SEQ_LEN));

        /* Clear the list of selected glitches */
        this.sequence.length = 0;
        this.currentStep = 0;

        /* Create a list of random effects for each step of the sequence */
        for (let i = 0; i < stepNbr; i++) {
            /* Create the list of possible values [1,2,3,4] */
            let effectValues = [];
            for (let i = 0; i < GlitchType.EFFECT_NBR; i++) {
                effectValues.push(i); 
            }

            let glitchEffectNbr = round(random(1, GlitchType.EFFECT_NBR));
            let randomSeq = [];

            /* Get the array of unique glitchEffectNbr numbers with value between 1 and MAX_GLITCH 
            * e.g. glitchNumber = 3 -> sequence is [1, 3, 4]
            * algo taken from: https://dev.to/sagdish/generate-unique-non-repeating-random-numbers-g6g
            */
            for (let j = 1; j <= glitchEffectNbr; j++) {
                const randomId = Math.floor(Math.random() * (GlitchType.EFFECT_NBR - j));
                randomSeq.push(effectValues[randomId]);

                effectValues[randomId] = effectValues[GlitchType.EFFECT_NBR - j];
            }

            this.sequence.push(randomSeq);
        }

        /* Start the glitch state machine */
        //console.log(this.sequence);
        this.currentState = GlitchSeqState.ON;
    }

    addEffect(id, frames) {
        if (id < GlitchType.EFFECT_NBR) {
            this.glitchEffects.push(id);
            this.frames = this.confGlitchOptions(this.glitchEffects);
            this.frames = frames;
        }
    }

    runSequence() {
        if ((this.currentState === GlitchSeqState.ON) && (this.frames === 0)) {
            // Get next step in the sequence
            if (this.currentStep < this.sequence.length) {
                // Set new effect and store glitchframes somewhere:
                this.glitchEffects.length = 0;
                this.glitchEffects = this.sequence[this.currentStep].slice();
                this.nextFrames = this.confGlitchOptions(this.glitchEffects);
                this.waitTime = (this.currentStep === 0) ? 0 : STEP_WAIT_TIME;
                this.currentState = GlitchSeqState.WAIT;
                this.currentStep++;
            } else { // if end of seq
                this.currentStep = 0;
                if (this.sequenceLoop) {
                    // Restart from step 0 of the sequence
                    this.glitchEffects.length = 0;
                    this.glitchEffects = this.sequence[this.currentStep].slice();
                    this.nextFrames = this.confGlitchOptions(this.glitchEffects);
                    this.waitTime = STEP_WAIT_TIME;
                    this.currentState  = GlitchSeqState.WAIT;
                } else {
                    // Reset all and set SeqState to IDLE
                    this.frames = 0;
                    this.nextFrames = 0;
                    this.waitTime = 0;
                    this.currentState = GlitchSeqState.IDLE;
                    this.sequence.length = 0;
                }
            }  
        } // else glitch is running
        
        if (this.currentState === GlitchSeqState.WAIT) {
            if (this.waitTime > 0) {
                this.waitTime--;
            } else {
                this.currentState = GlitchSeqState.ON;
                this.frames = this.nextFrames;
            }
        }
    }

    process(image) {
        if (this.frames > 0) {
            for (let i = 0; i <  this.glitchEffects.length; i++) {
                if (this.glitchEffects[i] == GlitchType.SCANLINE) {
                    this.scanner(image, this.scanOptions[SCAN_DIR], this.scanOptions[SCAN_X], this.scanOptions[SCAN_Y], this.dynamicGlitch);
                
                } else if (this.glitchEffects[i] == GlitchType.SCRAMBLE) {
                    let factor = (this.dynamicGlitch) ? (0.2 * noise(0.1 * frameCount) + 0.9) : 1;
                    this.scramble(image, this.scrambleOptions, factor);
                
                } else if (this.glitchEffects[i] == GlitchType.WARP) {
                    let factor = (this.dynamicGlitch) ? round(this.warpOptions[WARP_OFF] * noise(0.4 * frameCount)) : this.warpOptions[WARP_OFF];
                    this.warp(image, factor);
                 } else if (this.glitchEffects[i] == GlitchType.NOISE) {
                    this.addNoise(image, this.noiseOptions[NOISE_LEVEL]);
                } else if (this.glitchEffects[i] == GlitchType.NEG) {
                    this.pixelNegative(image);
                } else if (this.glitchEffects[i] == GlitchType.RGBSHIFT) {
                    let rx, ry, gx, gy, bx, by;
                    let factor = (this.dynamicGlitch) ? round(noise(0.4 * frameCount)) : 1;
                    rx = round(factor * this.rgbShiftOptions[SHIFT_RX]);
                    ry = round(factor * this.rgbShiftOptions[SHIFT_RY]);
                    gx = round(factor * this.rgbShiftOptions[SHIFT_GX]);
                    gy = round(factor * this.rgbShiftOptions[SHIFT_GY]);
                    bx = round(factor * this.rgbShiftOptions[SHIFT_BX]);
                    by = round(factor * this.rgbShiftOptions[SHIFT_BY]);
                    this.rgbTranslate(image, rx, ry, gx, gy, bx, by);
                }
            }

            this.frames--;
        }
    }

    // ------------------------------GLITCH EFFECT FUNCTIONS------------------------------ //

    scanner(srcImg, direction, startX, startY, isdynamic) {
        let maxOffset = srcImg.width / 3;
    
        if (direction <= 0.5) {
            //horizontal: random - x
            if (isdynamic) {
                for (let y = 0; y < srcImg.height; y++) {
                    let offset = floor(maxOffset * noise(y / (srcImg.height * 0.08)));
                    srcImg.copy(srcImg, startX + offset, y, 1, 1, 
                                        startX + offset, y, srcImg.width - startX - offset, 1);
                }
            } else {
                srcImg.copy(srcImg, startX, 0, 1, srcImg.height, 
                                    startX, 0, srcImg.width - startX, srcImg.height);
            }
        } else {
            //vertical: random  -y
            if (isdynamic) {
                for (let x = 0; x < srcImg.width; x++) {
                    let offset = floor(maxOffset * noise(x / (srcImg.width * 0.08)));
                    srcImg.copy(srcImg, x, startY + offset, 1, 1,
                                        x, startY + offset, 1, srcImg.height - startY - offset);
                }
            } else {
                srcImg.copy(srcImg, 0, startY, srcImg.width, 1,
                                    0, startY, srcImg.width, srcImg.height - startY);
            }
        }
    }

    scramble(srcImg, holes, factor) {
        for (let  i = 0; i < holes.length; i++) {	
            srcImg.copy(srcImg, round(holes[i].sx * factor), round(holes[i].sy * factor), round(holes[i].sw * factor), round(holes[i].sh * factor),
                                round(holes[i].dx * factor), round(holes[i].dy * factor), round(holes[i].dw * factor), round(holes[i].dh * factor));
        }
    }
    
    
    warp(srcImg, maxOffset) {
        srcImg.loadPixels();
    
        if (maxOffset > 0) {
            for (let x = 0; x < srcImg.width; x++) {
                for (let y = 0; y < srcImg.height; y++) {
                    let i = (x + y * srcImg.width) * COLOR_DEPTH;
                    let offset = floor(maxOffset * noise( x / (srcImg.width*0.1), y / (srcImg.height * 0.1)));
    
                    srcImg.pixels[i] = srcImg.pixels[i + COLOR_DEPTH * offset];
                    srcImg.pixels[i + 1] = srcImg.pixels[i + (COLOR_DEPTH * offset + 1)];
                    srcImg.pixels[i + 2] = srcImg.pixels[i + (COLOR_DEPTH * offset + 2)];
                }
            }
        } else {
            for (let x = srcImg.width - 1; x >= 0; x--) {
                for (let y = 0; y < srcImg.height; y++) {
                    let i = (x + y * srcImg.width) * COLOR_DEPTH;
                    let offset = floor(maxOffset * noise( x / (srcImg.width*0.1), y / (srcImg.height * 0.1)));
    
                    srcImg.pixels[i] = srcImg.pixels[i + COLOR_DEPTH * offset];
                    srcImg.pixels[i + 1] = srcImg.pixels[i + (COLOR_DEPTH * offset + 1)];
                    srcImg.pixels[i + 2] = srcImg.pixels[i + (COLOR_DEPTH * offset + 2)];
                }
            }
        }
    
        srcImg.updatePixels();
    }

    burn(srcImg, thresholdColor) {
        srcImg.loadPixels();
    
        for (let x = 0; x < srcImg.width; x++) {
            for (let y = 0; y < srcImg.height; y++) {
                let i = (x + y * srcImg.width) * COLOR_DEPTH;
    
                srcImg.pixels[i]     = (srcImg.pixels[i]     > thresholdColor[0]) ? srcImg.pixels[i] : 255;
                srcImg.pixels[i + 1] = (srcImg.pixels[i + 1] > thresholdColor[1]) ? srcImg.pixels[i + 1] : 255;
                srcImg.pixels[i + 2] = (srcImg.pixels[i + 2] > thresholdColor[2]) ? srcImg.pixels[i + 2] : 255;
            }
        }
        srcImg.updatePixels();
    }
    
    pixelNegative(srcImg) {
        srcImg.loadPixels();
    
        for (let x = 0; x < srcImg.width; x++) {
            for (let y = 0; y < srcImg.height; y++) {
                let i = (x + y * srcImg.width) * COLOR_DEPTH;
    
                srcImg.pixels[i]     = 255 - srcImg.pixels[i];
                srcImg.pixels[i + 1] = 255 - srcImg.pixels[i + 1];
                srcImg.pixels[i + 2] = 255 - srcImg.pixels[i + 2];
            }
        }
        srcImg.updatePixels();
    }

    addNoise(srcImg, quantity = 0.5) {
        srcImg.loadPixels();
    
        for (let i = 0; i < srcImg.pixels.length; i += 4) {
            srcImg.pixels[i] += round(quantity * 255 * (random() - 0.5));
            srcImg.pixels[i + 1] += round(quantity * 255 * (random() - 0.5));
            srcImg.pixels[i + 2] += round(quantity * 255 * (random() - 0.5));
        }
    
        srcImg.updatePixels();
    }

    rgbTranslate(srcImg, rx = 0, ry = 0, gx = 0, gy = 0, bx = 0, by = 0) {
        let w = srcImg.width;
        let h = srcImg.height;
        let imgOut = createImage(w, h);
        let rxOut, ryOut, gxOut, gyOut, bxOut, byOut;
        let ir, ig, ib, i;
    
        srcImg.loadPixels();
        imgOut.loadPixels();
    
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            rxOut = (x + rx) % w;
            ryOut = (y + ry) % h;
            gxOut = (x + gx) % w;
            gyOut = (y + gy) % h;
            bxOut = (x + bx) % w;
            byOut = (y + by) % h;
    
            ir = 4 * (rxOut + ryOut * w);
            ig = 4 * (gxOut + gyOut * w) + 1;
            ib = 4 * (bxOut + byOut * w) + 2;
            i = 4 * (x + y * w);
    
            imgOut.pixels[ir] = srcImg.pixels[i];
            imgOut.pixels[ig] = srcImg.pixels[i + 1];
            imgOut.pixels[ib] = srcImg.pixels[i + 2];
          }
        }
    
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                i = 4 * (x + y * w);
                if ((imgOut.pixels[i] === 0) && (imgOut.pixels[i+1] === 0) && (imgOut.pixels[i+2] === 0)) {
                    imgOut.pixels[i + 3] = 0;
                } else {
                    imgOut.pixels[i + 3] = 255; 
                }
            }
        }
    
        imgOut.updatePixels();
        srcImg.copy(imgOut, 0, 0, w, h, 0, 0, w, h);
      }

}