class Particle {
    constructor(x, y, mass = 100) {
        this.position = { x: x, y: y}
        this.velocity = {x: (Math.random() * 2 - 1) * 2, y:(Math.random() * 2 - 1) * 2}
        this.r = Math.sqrt(mass) * 0.125;
        this.color = "white";
        this.mass = mass;
        this.acceleration = {x: 0, y: 0}
        this.maxSize = 5;
        this.path = new Array(MAX_PATH_LENGTH).fill(null);
        this.pathIndex = 0;  // To keep track of where to insert
        this._tempForce = null;
    }

    updatePath(newPosition) {
        this.path[this.pathIndex] = newPosition;
        this.pathIndex = (this.pathIndex + 1) % MAX_PATH_LENGTH;  // Wrap around to the start
    }

    

    fixSize() {
        this.r = Math.sqrt(this.mass) * 0.125;
        if (this.maxSize && this.r > this.maxSize) {
            this.r = this.maxSize;
        }
    }

    showOrbit() {
        if (this.path.length < 2) {
            return; // Not enough points to draw a line
        }

        // Draw the path
    
        let firstPoint = true;
        for (let i = 0; i < this.path.length; i++) {
            let point = this.path[i];
            if (point === null) { // This is a break in the path
                firstPoint = true;
                continue;
            }
    
            if (firstPoint) {
                // Start a new line
                firstPoint = false;
            } else {
                // Continue previous line
            }
        }
    }
    

    applyForce(force) {
        if (!force || !force.x || !force.y) return;
        if (!this._tempForce) this._tempForce = {x: 0, y: 0}
    
        this._tempForce = {x: force.x, y: force.y};
        this._tempForce.x /= this.mass;
        this._tempForce.y /= this.mass;
        this.acceleration.x += this._tempForce.x;
        this.acceleration.y += this._tempForce.y;
    }

    attract(other, G) {
        const force = {x: 0, y: 0};
        const dx = other.position.x - this.position.x;
        const dy = other.position.y - this.position.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 10);  // 10 is a threshold to prevent extreme forces
        const forceMagnitude = (G * this.mass * other.mass) / (distance * distance);
        force.x = dx / distance * forceMagnitude;
        force.y = dy / distance * forceMagnitude;
        return force;
    }

    toPoint() {
        const point = new Point(this.position.x, this.position.y);
        point.particle = this;  // Explicitly set the particle reference
        return point;
    }

    fromPoint(point) {
        this.position.x = point.x;
        this.position.y = point.y;
    }

    distanceTo(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }


    update(deltaTime) {
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
    
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
if (speed > MAX_SPEED) {
    this.velocity.x = (this.velocity.x / speed) * MAX_SPEED;
    this.velocity.y = (this.velocity.y / speed) * MAX_SPEED;
}
    
        let didWarp = false;

        // Check for collisions with the edges of the screen
        if (this.position.x < 0) {
            this.position.x = app.view.width * 10;
            didWarp = true;
        }
        if (this.position.x > app.view.width * 10) {
            this.position.x = 0;
            didWarp = true;
        }
        if (this.position.y < 0) {
            this.position.y = app.view.height * 10;
            didWarp = true;
        }
        if (this.position.y > app.view.height * 10) {
            this.position.y = 0;
            didWarp = true;
        }            

    
        if (didWarp) {
            // Add a break in the path
            this.path.push(null);
        }
    
        // Store the current position into the path
        this.path.push({x: this.position.x, y: this.position.y});
    
        // Limit the path length
        while (this.path.length > MAX_PATH_LENGTH) {
            this.path.shift(); // Removes the oldest point from the path
        }

        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }
    

    intersects(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.r + other.r;
    }
    
    draw() {
        // Draw the particle
    }

    setColor(value) {
        this.color = value;
      }
}