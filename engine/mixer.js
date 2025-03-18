/*const FREQ = [1, 2, 4, 8, 16, 32];
const AMP = [1, 1/2, 1/3, 1/4, 1/5, 1/6];
const AMP_SUM = AMP[0] + AMP[1] + AMP[2] + AMP[3] + AMP[4] + AMP[5];

const TIME_INC = 0.01;
const SIN_K = 2;
const EXP = 2;
const DIST = 0.4;
*/

const SourceType = {
    DUMMY: 'DUMMY',
    THREE_D: '3D',
    TWO_D: '2D',
    AUTOMA: 'AUTOMA'
  };

class Mixer {
    constructor() {
        this.sourceList = [];
        this.noiseMask = [];
        this.maxScale = 0;

        /* Noise generator parameters */
        this.noiseGen = new OpenSimplexNoise(Date.now());
        this.zOff = 0;
        this.dsx = 0;
        this.dsy = 0;

        this.sourceProb =  [
            {type: SourceType.THREE_D, prob:  5},
            {type: SourceType.TWO_D,   prob: 30},
            {type: SourceType.AUTOMA,  prob: 65}
        ];

        this.setRandomProp();
    }

    loadConf (confObj) {
        // Copy the data into variable
        let config = JSON.parse(JSON.stringify(confObj));

        // Get max number of random sources
        this.maxSrcNbr = config['GLOBAL']['MaxSources'];

        // clear the source default array
        this.sourceProb.length = 0;

        // Populate it from json file
        for (let source of config['GLOBAL']['Probability']) {
            this.sourceProb.push({type: source.type, prob: source.value});
        }

        // Nomralize the probability array
        let sum = 0;
        for (let item of this.sourceProb) {
            sum += item.prob;
        }

        for (let item of this.sourceProb) {
            item.prob = item.prob / sum;
        }


    }

    addSource(type, size) {
        let newSource;

        if (type === SourceType.DUMMY) {
            newSource = new DummySource();
        } else if (type === SourceType.AUTOMA) {            
            newSource = new SourceAutoma(4, 3, 0);  // TODO: remove magic, these are default values
            newSource.setRandomProperties(type);

            newSource.sampling = newSource.currentSize;
            newSource.startRandomRule();
        } else if (type === SourceType.THREE_D) {
            newSource = new Source3D();
            newSource.setRandomProperties(type);
        } else if (type === SourceType.TWO_D) {
            newSource = new Source2D();
            newSource.setRandomProperties(type);
        }

        this.sourceList.push(newSource);
    }

    addRandomSources() {
        let sourceNbr = round(random(1, this.maxSrcNbr));
        let sum;
        let currentP;
        let id;

        for (let i = 0; i < sourceNbr; i++) {
            sum = 0;
            currentP = random();

            // Find type (id) corresponding to the random probability value
            for (id = 0; id < this.sourceProb.length; id++) {
                sum += this.sourceProb[id].prob;
                if (currentP < sum) {
                    break;
                }
            }

            this.addSource(this.sourceProb[id].type);
        }
    }

    removeSource(id) {

    }

    setRandomProp() {
        let maskScale = random([5, 8, 10]);

        this.noiseScale = random(45, 100);
        this.persistance = 0.5;
        this.lacunarity = 2;
        this.octaves = round(random(3, 10));
        this.octaveOffsets = [];
        this.timeInc = random(0.008, 0.05);
        this.spaceInc = random(0.01, 0.05);
        this.noiseVel = createVector(random(-1,1), random(-1,1));
        this.maskWidth = floor(DEFAULT_W / maskScale);
        this.maskHeight = floor(DEFAULT_H/ maskScale);

        for (let i = 0; i < this.octaves; i++) {
            let xOffset = random(-100, 100);
            let yOffset = random(-100, 100);

            this.octaveOffsets.push(createVector(xOffset, yOffset));
        }
    }

    updateNoiseMask() {
        let minNoiseVal = 1000;
        let maxNoiseVal = -1000;
        let maxDeltaNoise = 0;

        // Clear the mask
        this.noiseMask.length = 0;

        // Compute the harmonic noise for each mask pixel coord
        for (let y = 0; y < this.maskHeight; y++) {
            this.noiseMask[y] = [];
            for (let x = 0; x < this.maskWidth; x++) {
				let amplitude = 1;
				let frequency = 1;
				let noiseHeight = 0;

                // Compute simplex noise per octave (freq and magnitude)
                for (let i = 0; i < this.octaves; i++) {
                    let sampleX = x / this.noiseScale * frequency + this.octaveOffsets[i].x + this.dsx;
                    let sampleY = y / this.noiseScale * frequency + this.octaveOffsets[i].y + this.dsy;

                    let noiseVal = this.noiseGen.noise3D(sampleX, sampleY, this.zOff) / 2 + 0.5;
                    noiseHeight += noiseVal * amplitude;

                    amplitude *= this.persistance;
                    frequency *= this.lacunarity;
                }

                // Store min and max value
                if (noiseHeight > maxNoiseVal) {
                    maxNoiseVal = noiseHeight;
                } else if (noiseHeight < minNoiseVal) {
                    minNoiseVal = noiseHeight;
                }

                this.noiseMask[y][x] = noiseHeight;
            }
        }

        // Normalise the noise Mask
        maxDeltaNoise = maxNoiseVal - minNoiseVal;
        for (let y = 0; y < this.maskHeight; y++) {
            for (let x = 0; x < this.maskWidth; x++) {
                this.noiseMask[y][x] = (this.noiseMask[y][x] - minNoiseVal) / maxDeltaNoise;
            }
        }

        // Increment the Z-axis variable (i.e. time)
        this.zOff += this.timeInc * abs(sin(frameCount * 0.5)) + random(0.01);
        let spaceInc = this.spaceInc * abs(sin(frameCount * 0.5) * 2);
        this.dsx +=  spaceInc * this.noiseVel.normalize().x;
        this.dsy +=  spaceInc * this.noiseVel.normalize().y;
    }



    computeSplitMask() {
        let maskWidth;
        let maskHeight;
        let delta;
        let maskValues = [];

        // Get the maximum scaleFactor and Init the mask values (from 0 to 1)
        this.maxScale = this.sourceList[0].sampling;
        for (let i = 1; i < this.sourceList.length; i++) {
            max(this.maxScale, this.sourceList[i].sampling);
        }

        // Cap the maximum scaling to 10
        this.maxScale = (this.maxScale > 10) ? 10 : this.maxScale;

        // Init the mask values (from 0 to 1)
        for (let i = 0; i < this.sourceList.length; i++) {
            maskValues.push(i / this.sourceList.length);
        }

        // Get the width and height of the noise mask
        maskWidth = floor(DEFAULT_W / this.maxScale);
        maskHeight = floor(DEFAULT_H / this.maxScale);
        delta = maskWidth / this.sourceList.length;

        for (let y = 0; y < maskHeight; y++) {
            this.noiseMask[y] = [];
            for (let x = 0; x < maskWidth; x++) {
                this.noiseMask[y][x] = maskValues[floor(y / delta)];
            }
        }
    }

    compose() {
        for (let src of this.sourceList) {
            src.update();
        }
    }

    render() {
        let minVal, maxVal;
        let delta = 1.0 / (this.sourceList.length);// + 2);
        let tempImg;

        // Compute noise mask for source mixing
        //this.computeNoiseMask();
        this.updateNoiseMask();

        // Iterate over all the sources
        for (let i = 0; i < this.sourceList.length; i++) {
            minVal = delta * (i + 0);
            maxVal = delta * (i + 1);

            // Generate image for current source
            tempImg = this.sourceList[i].render(this.noiseMask, minVal, maxVal);

            // Display temp image on canvas
            if (tempImg !== undefined)
                image(tempImg, 0, 0, DEFAULT_W, DEFAULT_H);
        }
    }

    setTestProp () {
        //this.addRandomSources();
        //this.addSource(SourceType.TWO_D);
        //this.addSource(SourceType.AUTOMA, 8);
        //this.addSource(SourceType.AUTOMA, 20);
        //this.addSource(SourceType.DUMMY);
        //this.addSource(SourceType.AUTOMA);
        //this.addSource(SourceType.AUTOMA);
        myMixer.addSource(SourceType.DUMMY);
        myMixer.addSource(SourceType.DUMMY);
        myMixer.addSource(SourceType.DUMMY);
        this.sourceList[0].setBg(255, 0, 0);
        this.sourceList[1].setBg(0, 255, 0);
        this.sourceList[2].setBg(0, 0, 255);
        
        //this.addSource(SourceType.THREE_D);
        //this.addSource(SourceType.THREE_D);
        //this.addSource(SourceType.TWO_D);

        //this.sourceList[0].yRot = 0.1;

        //this.sourceList[0].setBg(255, 0, 0);
        //this.sourceList[1].setBg(0, 255, 0);
        //this.sourceList[2].setBg(0, 0, 255);

        //this.sourceList[0].sampling = 5;
        //this.sourceList[1].sampling = 1;
        //this.sourceList[2].sampling = 1;

        //this.sourceList[0].setRandomProperties();
        //this.sourceList[1].setRandomProperties();

        //this.sourceList[0].hueFlash = 0;
        //this.sourceList[0].loadPalette('color5.json');
        //this.sourceList[0].addTransaltionTarget(400, 400, -500);
        //this.sourceList[0].addTransaltionTarget(10, 200, -500);
        //this.sourceList[0].addTransaltionTarget(10, 400, -500);
        //this.sourceList[0].ditherAlgo = DitherType.BAYER;
        //this.sourceList[0].ditherAlgo = DitherType.STEIN;
        //this.sourceList[0].isAsciiOn = false;
        //this.sourceList[0].isAsciiColor = false;

        //this.sourceList[0].glitcher.setImagScale(this.sourceList[0].sampling);
        //this.sourceList[1].glitcher.setImagScale(this.sourceList[1].sampling);
        //this.sourceList[2].glitcher.setImagScale(this.sourceList[2].sampling);

        //this.sourceList[0].glitcher.startSequence();
        //this.sourceList[2].glitcher.startSequence();
        //this.sourceList[0].glitcher.isPreOn = true;  /// TODO: INVESTIGATE why pre is not working, suspect scale problem
        //this.sourceList[0].glitcher.dynamicGlitch = false;
        //this.sourceList[0].glitcher.addEffect(1, 10000);
        //this.sourceList[0].glitcher.addEffect(5, 10000);
        //this.sourceList[0].glitcher.addEffect(3, 10000);


        //this.sourceList[0].loadPalette('color2.json');
        //this.computeSplitMask();

        //this.sourceList[2].isAsciiOn = true;
        //this.sourceList[3].hueSaturation = 100;
    }
}