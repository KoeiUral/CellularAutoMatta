// TODO: move it in the graphic lib
const DitherType = {
    NONE: 0,
    STEIN: 1,
    BAYER: 2
  };

class Source {
    constructor() {
        this.type = 0;
        this.glitchAlgo = DitherType.NONE;

        this.isBWOn = false;
        this.hueOffset = 0;
        this.hueInc = 0;
        this.hueFlash = 0;
        this.hueSaturation = 0;
        this.sampling = 1;

        this.ditherAlgo = 0;
        this.colDither = 4;
        this.dimDither = 2;

        this.isAsciiOn = false;
        this.isAsciiColor = false;

        this.glitcher = new Glitcher();

        this.graphCtx;
        this.img;
    }

    // Abstract function to update the graphic context and copy it into img
    update() {

    }

    // Abstract function to be implemented by inherited classes
    setSpecificProperties() {

    }

    setRandomProperties(type) {
        // Store the type
        this.type = type;

        // Call specific properties
        this.setSpecificProperties();

        let HueOffMax = configMap[type]['EffectsVal'].HueOff_max;
        let HueIncMax = configMap[type]['EffectsVal'].HueInc_max;
        let HueFlashMax = configMap[type]['EffectsVal'].HueFlash_max;
        let SampleMax = configMap[type]['EffectsVal'].Sample_max;

        // Set the common properties to each source
        this.isBWOn = (random() < configMap[type]['EffectsProb'].BW_p);
        this.hueOffset = floor(random(0, HueOffMax)) * (random() < configMap[type]['EffectsProb'].HueOff_p);
        this.hueInc = floor(random(0, HueIncMax)) * (random() < configMap[type]['EffectsProb'].HueInc_p);
        this.hueFlash = floor(random(0, HueFlashMax)) * (random() < configMap[type]['EffectsProb'].HueFlash_p);
        this.hueSaturation = floor(random()) * (random() < configMap[type]['EffectsProb'].HueSat_p);
        this.sampling = 1 + ceil(random(1, SampleMax)) * (random() < configMap[type]['EffectsProb'].Sample_p);
        
        let ditherProb = random();
        this.ditherAlgo = (ditherProb > configMap[type]['EffectsProb'].DitStain_p) ? DitherType.STEIN : 0;
        this.ditherAlgo = (ditherProb > configMap[type]['EffectsProb'].DitBay_p) ? DitherType.BAYER : this.ditherAlgo;
        this.colDither = configMap[type]['EffectsVal'].DitBayCol;
        this.dimDither = configMap[type]['EffectsVal'].DitBayDim;

        this.isAsciiOn = (random() < configMap[type]['EffectsProb'].Ascii_p);;
        this.isAsciiColor = (random() < configMap[type]['EffectsProb'].AsciiColor_p);
        this.sampling = ((this.isAsciiOn) && (this.sampling < 8)) ? 8 : this.sampling;

        // Glitcher
        this.glitcher.setImagScale(this.sampling);
        this.glitcher.isPreOn = (random() < configMap[type]['EffectsProb'].GlitchPre_p);
        this.dynamicGlitch = (random() < configMap[type]['EffectsProb'].GlitchDyn_p);

        if (random() < configMap[type]['EffectsProb'].Glitch_p) {
           this.glitcher.startSequence();
        }

        console.log("\tsampling: %d, glitchScale: %d, preGlitch: %d", this.sampling, this.glitcher.imageScale, this.glitcher.isPreOn);
        console.log("\tascii: %d, dither: %s", this.isAsciiOn, this.ditherAlgo);
        console.log("\thue offset: %d, hue inc: %d, hue flash: %d,  hue sat: %d", this.hueOffset, this.hueInc, this.hueFlash, this.hueSaturation);
    }

    // Applying enabled filters to the img
    render(mask, lowTh, highTh) {
        let retImage;

        if (this.img === undefined)
            return;

        // Sub sampling te image
        if (this.sampling > 1) {
            this.img.resize(DEFAULT_W / this.sampling, DEFAULT_H / this.sampling);
        }

        // Execute the glitch sequence
        this.glitcher.runSequence();

        // Apply glitches (if any) before processing
        if (this.glitcher.isPreOn === true) {
            this.glitcher.process(this.img);
        }

        // Apply color correction
        if (this.isBWOn) {
            this.img.filter(GRAY); 
        }  else if (((this.hueOffset % 360) != 0) || (this.hueInc != 0) || (this.hueFlash != 0) || (this.hueSaturation != 0)) {
            ShiftHue(this.img, (this.hueOffset + this.hueInc) % 360, this.hueFlash , this.hueSaturation);
        }

        // Apply dithering
        if (this.ditherAlgo == DitherType.STEIN) {
            ditherIt(this.img, this.isBWOn, COLOR_DEPTH); 
        } else if (this.ditherAlgo == DitherType.BAYER) {
            BayerDithering(this.img, this.colDither, this.dimDither);
        }

        // Add Alpha Ch as per mixer inputs
        addAlphaMask(this.img, this.sampling, mask, lowTh, highTh);

        // Apply ASCII convertion      
        if ((this.isAsciiOn) && (fontReady)) {
            retImage = asciifyIt(this.img, this.sampling, myFont, this.isAsciiColor);
        } else if (this.sampling > 1) { // Upscale back the image
            retImage = upScale(this.img, retImage, this.sampling);
        } else {
            retImage = this.img.get(); 
        }

        // Apply glitches (if any) after processing
        if (this.glitcher.isPreOn === false) {
            this.glitcher.process(retImage);
        }

        return retImage;
    }
}


class DummySource extends Source {
    constructor() {
        super();
        this.r = 0;
        this.g = 0;
        this.b = 0;

        this.graphCtx = createGraphics(DEFAULT_W, DEFAULT_H);
        this.setBg(floor(random(255)), floor(random(255)), floor(random(255)));
    }

    setBg(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    update() {
        this.graphCtx.background(this.r, this.g, this.b);
        this.img = this.graphCtx.get();
    }
}




