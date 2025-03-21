const COLOR_PATH = './media/colors/';

/**
 * Automata evolution, scroll direction
 */
const AutomaDir = {
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3,
    DIR_NBR: 4
  };


/**
 * Single STRIP of cells, the full collection is the automata
 */
class CellStrip {
    constructor(size, depth, rule, palette, ctx, direction) {
        this.cellSize = size;
        this.colorDepth = depth;
        this.colorPalette = palette;
        this.cells = [];
        this.grCtx = ctx;

        // Compute the number of cells in canvas w.
        this.cellNbr = (direction < AutomaDir.LEFT) ? floor(DEFAULT_W / this.cellSize) : floor(DEFAULT_H / this.cellSize); // TODO: CHECK for the correct width to use, sampling?
        this.ruleSet = rule.toString(this.colorDepth).padStart(this.colorDepth * 3 - 2, "0");
    }

    init(randomProb) {
        // Init the cell list to 0
        for (let i = 0; i < this.cellNbr; i++) {
            this.cells[i] = (random(1) < randomProb) ? floor(random(1, this.colorDepth)) : 0;
        }

        // Set middle cell to a value different from 0
        this.cells[floor(this.cellNbr / 2)] = floor(random(1, this.colorDepth));
    }

    evolve(nextCells) {
        // Iterate over each cell to calculate its next state.
        let len = this.cells.length;

        for (let i = 0; i < len; i++) {
            // Calculate the states of neighboring cells
            let left = this.cells[(i - 1 + len) % len];
            let right = this.cells[(i + 1) % len];
            let state = this.cells[i];

            // Create a string representing the state of the cell and its neighbors.
            let sum = left + state + right;
            nextCells[i] = parseInt(this.ruleSet[sum], this.colorDepth);
        }
    }

    displayV(y, dir) {
        let x = 0;

        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] != 0) {
                this.grCtx.fill(this.colorPalette[this.cells[i]]);
                this.grCtx.square(x, y, this.cellSize);
            }
            x += this.cellSize;
        }

        // Move to the next row.
        return (y + dir * this.cellSize);
    }

    displayH(x, dir) {
        let y = 0;

        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] != 0) {
                this.grCtx.fill(this.colorPalette[this.cells[i]]);
                this.grCtx.square(x, y, this.cellSize);
            }
            y += this.cellSize;
        }

        // Move to the next row.
        return (x + dir * this.cellSize);
    }
}




class SourceAutoma extends Source {
    constructor(size, depth, rule) {
        super();
        this.graphCtx = createGraphics(DEFAULT_W, DEFAULT_H);

        this.stripes = [];
        this.currentSize = size;
        this.currentDepth = depth;
        this.currentRule = rule;
        this.maxCols = DEFAULT_H / size;  // TODO: CHECK for the correct width to use, sampling?
        this.coolDown = 0;
        this.direction = AutomaDir.DOWN;

        // Define here Color Palette, even more than really used
        this.fullPalette = [color(255, 255, 255),  // COLOR  0, by default WHITE
                            color(  0,   0, 255),  // COLOR  1
                            color(  0, 255,   0),  // COLOR  2
                            color(  0, 255, 255),  // COLOR  3
                            color(255,   0,   0),  // COLOR  4
                            color(255, 255,   0),  // COLOR  5
                            color(255,   0, 255),  // COLOR  6
                            color( 50,  50,  50),  // COLOR  7
                            color(100, 100, 100),  // COLOR  8
                            color(150, 150, 150)   // COLOR  9
                            ];

        this.isPaletteLoaded = true;
        shuffle(this.fullPalette);
    }

    setSpecificProperties() {
        let colorFiles = getFiles(COLOR_PATH);
        let colorId = floor(random(colorFiles.length));

        // Set random direction
        this.direction = floor(random(AutomaDir.DIR_NBR));

        // Set the size and min/max depth
        this.minDepth = configMap['AUTOMA']['SpecificVal'].Depth_min;
        this.maxDepth = configMap['AUTOMA']['SpecificVal'].Depth_max;
        this.currentSize = random(configMap['AUTOMA']['SpecificVal'].Size_list);

        // Compute number of stripes in the canvas according to direction (assuming not square canvas)
        this.maxCols = (this.direction < AutomaDir.LEFT) ? round(DEFAULT_H / this.currentSize) : round(DEFAULT_W / this.currentSize) ;

        // Set depth and rule
        this.currentDepth = floor(random(this.minDepth, this.maxDepth ));
        this.currentRule = floor(random(pow(this.currentDepth , this.currentDepth * 3 - 2)));

        // Set colore pallette
        this.loadPalette(colorFiles[colorId]);

        console.log("AUTOMATA - size:%d, depth:%d, cols:%f, color:%s", this.currentSize, this.currentDepth, this.maxCols, colorFiles[colorId]);
    }

    loadPalette(path, file) {
        let fileName = (typeof file !== "undefined") ? file.name : path;

        this.isPaletteLoaded = false;
        loadJSON(COLOR_PATH + fileName, this.onJsonLoaded.bind(this));
    }

    onJsonLoaded(jData) {
        for (let i = 0; i < this.maxDepth; i++) {
            this.fullPalette[i] = color(jData[i].levels[0], jData[i].levels[1], jData[i].levels[2]);
        }
 
        this.isPaletteLoaded = true;
    }

    startRandomRule() {
        // Generate new random depth and rule
        this.currentDepth = floor(random(this.minDepth, this.maxDepth ));
        this.currentRule = floor(random(pow(this.currentDepth , this.currentDepth * 3 - 2)));

        // Add a new line of cells accordingly
        this.stripes.push(new CellStrip(this.currentSize, this.currentDepth, this.currentRule, this.fullPalette, this.graphCtx, this.direction));
        this.stripes[(this.stripes.length - 1)].init(configMap['AUTOMA']['SpecificProb'].Init_p);
    }

    evolve() {
        let newStripe = new CellStrip(this.currentSize, this.currentDepth, this.currentRule, this.fullPalette, this.graphCtx, this.direction);
        let prevStripe = this.stripes[(this.stripes.length - 1)];

        prevStripe.evolve(newStripe.cells);
        this.stripes.push(newStripe);
    }

    display() {
        if (this.isPaletteLoaded === true) {
            let y = (this.direction == AutomaDir.DOWN) ? 0 : DEFAULT_H - this.currentSize;
            let x = (this.direction == AutomaDir.RIGHT) ? 0 : DEFAULT_W - this.currentSize;

            for (let stripe of this.stripes) {
                if (this.direction == AutomaDir.DOWN) {
                    y = stripe.displayV(y, 1);
                } else if (this.direction == AutomaDir.UP) {
                    y = stripe.displayV(y, -1);
                } else if (this.direction == AutomaDir.RIGHT) {
                    x = stripe.displayH(x, 1);
                } else if (this.direction == AutomaDir.LEFT) {
                    x = stripe.displayH(x, -1);
                }
            }
        }
    }

    runScroll() {
        let maxSpeed = configMap['AUTOMA']['SpecificVal'].Speed_max;
        let breakValue = configMap['AUTOMA']['SpecificVal'].Speed_break;
        let iterations = round(maxSpeed * noise(frameCount * 0.1)) - breakValue;

        for (let i = 0; i < iterations; i++) {
            if ((this.coolDown <= 0) && (random() < configMap['AUTOMA']['SpecificProb'].ChangeRule_p)) {
                this.startRandomRule();
                this.coolDown = 5;
            }
            else { 
                this.evolve();
            }

            // If we reaches canvas bottom
            if (this.stripes.length > this.maxCols + 1) {
                // Remove the first stripe - scroll
                this.stripes.splice(0, 1);  
            }

            this.coolDown--;
        }

        // Display all stripes
        this.display();
    }

    update() {
        this.graphCtx.background(0);
        this.runScroll();
        this.img = this.graphCtx.get();
    }
}