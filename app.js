// ======================
// PIXI Initialization
// ======================
const app = new PIXI.Application({ width: 640, height: 360 });
document.body.appendChild(app.view);
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// ======================
// View and Renderer Setup
// ======================
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoResize = true;
app.renderer.resize(window.innerWidth, window.innerHeight);

// ======================
// Scene Variables
// ======================
let dragging = false;
let prevX, prevY;
let isMouseDown = false;
let mousePosition = { x: 0, y: 0 };

const MAX_PATH_LENGTH = 5;
const EFFECTIVE_RANGE = 500;
const PARTICLE_COUNT = 50000;
const G = 1;
const MAX_SPEED = 5;

// ======================
// Scene Setup: Background, Containers, Textures
// ======================
const graphics = new PIXI.Graphics();
graphics.beginFill(0xFFFFFF, 0.01);
graphics.drawRect(0, 0, app.view.width * 10, app.view.height * 10);
graphics.endFill();
app.stage.addChild(graphics);

const orbitsGraphics = new PIXI.Graphics();
app.stage.addChild(orbitsGraphics);

const particleContainer = new PIXI.ParticleContainer(PARTICLE_COUNT, {
    position: true,
    rotation: false,
    scale: true,
    uvs: false,
    alpha: false
});
app.stage.addChild(particleContainer);

const dotTexture = PIXI.Texture.from('dot.svg');

// ======================
// Scene Center and Scale
// ======================
const centerX = app.view.width * 5;
const centerY = app.view.height * 5;
const spread = 1000;

let scaleX = app.renderer.view.width / (app.view.width * 10);
let scaleY = app.renderer.view.height / (app.view.height * 10);
let scale = Math.min(scaleX, scaleY);

app.stage.position.set(
    (app.renderer.view.width - (app.view.width * 10) * scale) / 2,
    (app.renderer.view.height - (app.view.height * 10) * scale) / 2
);
app.stage.scale.set(scale, scale);

// ======================
// Event Listeners
// ======================


app.view.addEventListener('wheel', (e) => {
    const zoomFactor = 1.1;
    const direction = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

    // Get the current center of the view in global coordinates
    const centerX = (-app.stage.x + app.renderer.view.width / 2) / app.stage.scale.x;
    const centerY = (-app.stage.y + app.renderer.view.height / 2) / app.stage.scale.y;

    // Adjust the scale
    app.stage.scale.x *= direction;
    app.stage.scale.y *= direction;

    // Adjust the position to keep the center of the view at its current global position
    app.stage.x = -centerX * app.stage.scale.x + app.renderer.view.width / 2;
    app.stage.y = -centerY * app.stage.scale.y + app.renderer.view.height / 2;
});


// prevent right click context menu
app.view.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Dragging and Panning Events
app.stage.interactive = true;
app.stage.buttonMode = true;

app.stage.on('pointerdown', function(event){
    // Check for right mouse button
    if (event.data.button === 2) {
        dragging = true;
        prevX = event.data.global.x;
        prevY = event.data.global.y;
    }
});

app.stage.on('pointerup', function(event){
    // Check for right mouse button
    if (event.data.button === 2) {
        dragging = false;
    }
});

app.stage.on('pointerupoutside', function(event){
    // Check for right mouse button
    if (event.data.button === 2) {
        dragging = false;
    }
});

app.stage.on('pointermove', function(event){
    if(dragging){
        let newX = event.data.global.x;
        let newY = event.data.global.y;
        let dx = newX - prevX;
        let dy = newY - prevY;
        
        app.stage.x += dx;
        app.stage.y += dy;

        prevX = newX;
        prevY = newY;
    }
});

// Resize the renderer when the window size changes
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // You might also want to adjust any world parameters here, like re-populating the QuadTree with new boundaries
});

// ======================
// QuadTree Initialization
// ======================
const boundary = new Rectangle(0, 0, app.view.width * 10, app.view.height * 10);
const qtree = new QuadTree(boundary, 1);

// ======================
// Particle Initialization
// ======================

// Initialize particles and add them to the stage
const particles = [];
const particleSprites = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particleX = centerX + (Math.random() - 0.5) * spread;
    const particleY = centerY + (Math.random() - 0.5) * spread;

    const particle = new Particle(particleX, particleY, Math.random() * 250 + 150);
    particle.fixSize();
    particles.push(particle);
    qtree.insert(particle.toPoint());
    
    const sprite = new PIXI.Sprite(dotTexture);
    sprite.x = particle.position.x;
    sprite.y = particle.position.y;
    sprite.width = particle.r * 2;  // Assuming particle.r is the radius
    sprite.height = particle.r * 2;
    particleSprites.push(sprite);
    particleContainer.addChild(sprite);
}

// ======================
// Main Update Loop
// ======================
const forceRange = new Circle(0, 0, 25);
let elapsed = 0;

app.ticker.add((delta) => {
    elapsed += delta / 60;  // Convert to seconds
    if (elapsed > 1) {
        elapsed = 0;
        //console.log(app.ticker.FPS);
    }

    // Update the QuadTree
    qtree.clear();

    // Clear the orbits graphics context to redraw fresh orbits in every frame
    orbitsGraphics.clear();
    orbitsGraphics.lineStyle(1, 0xFFFFFF, 0.5); // Set line style (thickness, color, alpha)

    // Calculate the screen bounds
    let screenBounds = {
        left: -app.stage.x / app.stage.scale.x,
        right: (-app.stage.x + app.view.width) / app.stage.scale.x,
        top: -app.stage.y / app.stage.scale.y,
        bottom: (-app.stage.y + app.view.height) / app.stage.scale.y
    };

    // Combined loop for inserting particles into QuadTree, calculating forces, updating positions, and visibility checks
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        qtree.insert(particle.toPoint());

        // Calculate and apply forces for the particle
        forceRange.x = particle.position.x;
        forceRange.y = particle.position.y;
        
        const pointObjects = qtree.query(forceRange);
        for (let otherPoint of pointObjects) {
            if (!otherPoint.particle || particle === otherPoint.particle) continue;
            if (particle.distanceTo(otherPoint.particle) <= EFFECTIVE_RANGE) {
                const force = particle.attract(otherPoint.particle, G);
                particle.applyForce(force);
            }
        }

        // Update particle position
        particle.update(delta);

        // Update sprite position and check visibility
        let sprite = particleContainer.children[i];
        sprite.x = particle.position.x;
        sprite.y = particle.position.y;
        sprite.visible = !(sprite.x + sprite.width < screenBounds.left || 
                           sprite.x - sprite.width > screenBounds.right || 
                           sprite.y + sprite.height < screenBounds.top || 
                           sprite.y - sprite.height > screenBounds.bottom);
    }

    // Orbit drawing can be separate as it is a graphical representation and doesn't affect particle physics
    // (The commented orbit drawing code you provided)
});
