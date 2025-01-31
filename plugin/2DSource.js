const IMAGE_PATH = './media/image/';
const VIDEO_PATH = './media/video/';

class Source2D extends Source {
    constructor() {
        super();
        this.graphCtx = createGraphics(DEFAULT_W, DEFAULT_H);
        this.isModelReady = false;
        this.isVideoModel = false;

        this.model;
    }

    setSpecificProperties() {
        // Set image
        let twoDPath;
        let videoFiles = getFiles(VIDEO_PATH);
        let imageFiles = getFiles(IMAGE_PATH);

        // Choose Video vs Image
        if ((random() < configMap['2D']['SpecificProb'].Video_p)) {
            let videoId = floor(random(videoFiles.length));
            twoDPath = videoFiles[videoId];
        } else {
            let imageId = floor(random(imageFiles.length));
            twoDPath = imageFiles[imageId];
        }

        this.loadModel(twoDPath);

        console.log("     2D - image/video path: %s", twoDPath);
    }

    loadModel(path, file) {
        let fileName = (typeof file !== "undefined") ? file.name : path;
        let fileExt = fileName.split('.').pop();
    
        this.isModelReady = false;

        if ((fileExt === 'jpg') || (fileExt === 'jpeg') || (fileExt === 'png') || (fileExt === 'gif')) {
            this.model = loadImage(IMAGE_PATH + fileName, this.onModelLoaded.bind(this));
            this.isVideoModel = false;
        } else if ((fileExt === 'mp4') || (fileExt === 'avi') || (fileExt === 'mov') || (fileExt === 'webm') || (fileExt === 'mkv')) {
            this.model = createVideo(VIDEO_PATH + fileName, this.onModelLoaded.bind(this));
            this.isVideoModel = true;    
        }
    }

    onModelLoaded() {
        this.isModelReady = true;

        if (this.isVideoModel) {
            this.model.hide();
            this.model.volume(0);
            this.model.loop();
        }
    }

    update(){
        if (this.isModelReady) {
            this.graphCtx.reset();
            this.graphCtx.image(this.model, 0, 0, DEFAULT_W, DEFAULT_H);
            this.img = this.graphCtx.get();
        }
    }
}