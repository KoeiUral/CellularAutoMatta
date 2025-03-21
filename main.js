let myMixer;
let myCanvas;
let recDuration = 100;
let webmCapturer;
let webmPeriod = -1;
let webmStarted = false;
let gifSlowRate = 1;
let confData;

const WIDGET_SIZE = 20;
const DEBUG = false;
const CONF_PATH = './media/conf/my_conf.json';

function preload() {
    myFont = loadFont(FONT_PATH);
    confData = loadJSON(CONF_PATH);
}


function updateGifPeriod() {
    let tempVal = parseInt(this.value());
    recDuration = (isNaN(tempVal)) ? 0 : tempVal;
}

function startSavingGIF() {
    saveGif('gifMatta', recDuration, {  units: 'frames', silent: false, notificationDuration: 1});
}

function startSavingWEBM() {
    webmPeriod = recDuration;

    if (webmStarted == false) {
        webmStarted = true;
        webmCapturer.start();
    }
}


function createGui() {
    /* Hook the canvas */
    myCanvas = createCanvas(DEFAULT_W, DEFAULT_H);
    myCanvas.parent('html_canvas');

    gifDurationInput =  createInput('100');
    gifDurationInput.size(WIDGET_SIZE);
    gifDurationInput.input(updateGifPeriod);

    gifBtn = createButton('SAVE GIF');
    gifBtn.mousePressed(startSavingGIF);

    webmBtn = createButton('SAVE WEBM');
    webmBtn.mousePressed(startSavingWEBM);

    /* Hook widget to html */
    gifDurationInput.parent('html_gifDurInput');
    gifBtn.parent('html_gifBtn');
    webmBtn.parent('html_webmBtn');
}



function setup() {
    // Init graphic lib
    initGraphLib(confData);

    myMixer = new Mixer();
    myMixer.loadConf(confData);
    myMixer.addRandomSources();
    //myMixer.setTestProp();

    // Read frame rate from json and create the webm capturer
    gifSlowRate = configMap['GLOBAL']['Gif_SlowRate'];
    let frameRate = configMap['GLOBAL']['WebM_FrameRate'];
    webmCapturer = new CCapture( { format: 'webm', display: true, framerate: frameRate} );

    createGui();
}

function draw() {
    /* Process the image only every GifSlowRate time */
    if ((frameCount % gifSlowRate) == 0) {
        background(0);
        myMixer.compose();
        myMixer.render();
    }

    if (DEBUG) {
        let fps = round(frameRate());
        text(fps, 50, 50);
    }

    /* Save the WEBM  */
    if (webmPeriod > 0) {
        webmCapturer.capture(document.getElementById('defaultCanvas0'));
        webmPeriod--;
    } else if (webmPeriod == 0) {
        webmCapturer.stop();
        webmCapturer.save();
        webmPeriod--;
    }
}