let app = new PIXI.Application({ width: 640, height: 360 });
document.body.appendChild(app.view);

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


// Set initial size
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoResize = true;
app.renderer.resize(window.innerWidth, window.innerHeight);
const graphics = new PIXI.Graphics();
graphics.beginFill(0xFFFFFF, 0.01);  // Nearly transparent
graphics.drawRect(0, 0, app.view.width * 10, app.view.height * 10);
graphics.endFill();
app.stage.addChild(graphics);
const orbitsGraphics = new PIXI.Graphics();
app.stage.addChild(orbitsGraphics);
let isMouseDown = false;
let mousePosition = { x: 0, y: 0 };
graphics.eventMode = 'dynamic';
const MAX_PATH_LENGTH = 5;
const EFFECTIVE_RANGE = 500;  // or some other value
const dotTexture = PIXI.Texture.from('dot.svg');


let dragging = false;
let prevX, prevY;

app.stage.interactive = true;
app.stage.buttonMode = true;
// Center of the expanded boundary
const centerX = app.view.width * 5;
const centerY = app.view.height * 5;
const spread = 5000;

app.stage.position.set(-centerX + app.view.width / 2, -centerY + app.view.height / 2);

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

const particleContainer = new PIXI.ParticleContainer(10000, {
    position: true,
    rotation: false,
    scale: true,
    uvs: false,
    alpha: true
});
app.stage.addChild(particleContainer);


// Resize the renderer when the window size changes
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // You might also want to adjust any world parameters here, like re-populating the QuadTree with new boundaries
});

// initialize the quadtree
const boundary = new Rectangle(0, 0, app.view.width * 10, app.view.height * 10);
const qtree = new QuadTree(boundary, 1);

// Initialize particles and add them to the stage
const particles = [];
const particleSprites = [];
for (let i = 0; i < 10000; i++) {
    const particleX = centerX + (Math.random() - 0.5) * spread;
    const particleY = centerY + (Math.random() - 0.5) * spread;

    const particle = new Particle(particleX, particleY, Math.random() * 100 + 50);
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

const G = 1;  // Gravitational constant
const MAX_SPEED = 5;  // Maximum speed for a particle
const particlesToMerge = [];  // Array to store particles that need to be merged

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


    for (let i = 0; i < particles.length; i++) {
        qtree.insert(particles[i].toPoint());
        //console.log(`qtree has ${qtree.totalCount()} points`);
    }

    // Calculate and apply forces for each particle
for (let i = 0; i < particles.length; i++) {
    
    const particle = particles[i];
    const range = new Circle(particle.position.x, particle.position.y, 50);
    const pointObjects = qtree.query(range); // These are point objects, not particles
    //console.log(`1) Particle ${i} has ${pointObjects.length} points in its range`);
    for (let j = 0; j < pointObjects.length; j++) {
        
        const otherPoint = pointObjects[j]; // This is the Point object
        

        if (!otherPoint.particle) {
            //console.error(`Missing particle reference in Point for query index ${j}`);
            continue; // Skip this iteration if particle reference is missing
        }

        const otherParticle = otherPoint.particle; // This extracts the original particle from the Point
        //console.log(`2) Particle ${i} is at (${particle.position.x}, ${particle.position.y})`);
        if (particle !== otherParticle) { // Ensure they're not the same particle
            if (particle.distanceTo(otherParticle) > EFFECTIVE_RANGE) {
                continue;
            }
            const force = particle.attract(otherParticle, G); // Use the actual particle here
            particle.applyForce(force);
            //console.log(`3) Force on particle ${i} from particle ${j}: ${force.x}, ${force.y}`);
        }
    }
}



    // Update and render each particle's position
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.update(delta);
        particle.path.push({x: particle.position.x, y: particle.position.y});
        if (particle.path.length > MAX_PATH_LENGTH) {
            particle.path.shift();
        }

//         // Draw the orbit
// if (particle.path.length >= 2) {
//     let moveToNext = true;  // Flag to determine whether to move to the next point or draw a line
//     for (let j = 0; j < particle.path.length; j++) {
//         let point = particle.path[j];
//         if (point) {
//             let centerX = point.x + particle.r;  // Adjusting for the center
//             let centerY = point.y + particle.r;  // Adjusting for the center
//             if (moveToNext) {
//                 orbitsGraphics.moveTo(centerX, centerY);
//                 moveToNext = false;  // After moving, set the flag to false
//             } else {
//                 orbitsGraphics.lineTo(centerX, centerY);
//             }
//         } else {
//             moveToNext = true;  // If the point is null, set the flag to true to move to the next valid point
//         }
//     }
// }



        particleContainer.children[i].x = particle.position.x;
        particleContainer.children[i].y = particle.position.y;
    }

    // Calculate the screen bounds
let screenBounds = {
    left: -app.stage.x / app.stage.scale.x,
    right: (-app.stage.x + app.view.width) / app.stage.scale.x,
    top: -app.stage.y / app.stage.scale.y,
    bottom: (-app.stage.y + app.view.height) / app.stage.scale.y
};

// Update and render each particle's position
for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];

    // ... (rest of the update code for each particle)

    // Check if particle is within screen bounds
    let sprite = particleContainer.children[i];
    if (sprite.x + sprite.width < screenBounds.left || 
        sprite.x - sprite.width > screenBounds.right || 
        sprite.y + sprite.height < screenBounds.top || 
        sprite.y - sprite.height > screenBounds.bottom) {
        sprite.visible = false; // Hide if outside screen bounds
    } else {
        sprite.visible = true; // Show if inside screen bounds
    }
}
});