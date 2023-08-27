Math.clamp = function(value, min, max) {
    return Math.max(min, Math.min(value, max));
};


class Point {
    constructor(x = 0, y = 0, userData = null) {
        this.x = x;
        this.y = y;
        this.userData = userData;
    }
}

class Circle {
    constructor(x = 0, y = 0, r = 0) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.rSquared = this.r * this.r;
    }

    boundaryContainsPoint(point) {
        let dx = this.x - point.x;
        let dy = this.y - point.y;
        let dSquared = dx * dx + dy * dy;
        return dSquared <= this.rSquared;
    }

    intersects(range) {
        // intersection of different sized circles
        let xDist = Math.abs(range.x - this.x);
        let yDist = Math.abs(range.y - this.y);

        // radius of the circle

        let r = this.r;

        let w = range.w;
        let h = range.h;

        let edges = Math.pow((xDist - w), 2) + Math.pow((yDist - h), 2);

        // no intersection

        if (xDist > (r + w) || yDist > (r + h))
            return false;

        // intersection within the circle

        if (xDist <= w || yDist <= h)

            return true;

        // intersection on the edge of the circle

        return edges <= this.rSquared;    
    }
}

class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w; // width
        this.h = h; // height
    }

    boundaryContainsPoint(point) {
        return point.x >= this.x - this.w &&
            point.x <= this.x + this.w &&
            point.y >= this.y - this.h &&
            point.y <= this.y + this.h;
    }

    intersects(range) {
        return !(range.x - range.w > this.x + this.w ||
            range.x + range.w < this.x - this.w ||
            range.y - range.h > this.y + this.h ||
            range.y + range.h < this.y - this.h);
    }

}

class QuadTree {
    constructor(boundary, capacity) {
        this.boundary = boundary;
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
    }
    

    subdivide() {
        let x = this.boundary.x;
        let y = this.boundary.y;
        let w = this.boundary.w / 2;
        let h = this.boundary.h / 2;

        let ne = new Rectangle(x + w, y - h, w, h);
        this.northeast = new QuadTree(ne, this.capacity);
        let nw = new Rectangle(x - w, y - h, w, h);
        this.northwest = new QuadTree(nw, this.capacity);
        let se = new Rectangle(x + w, y + h, w, h);
        this.southeast = new QuadTree(se, this.capacity);
        let sw = new Rectangle(x - w, y + h, w, h);
        this.southwest = new QuadTree(sw, this.capacity);
        this.divided = true;
    }

    insert(point) {
        if (!this.boundary.boundaryContainsPoint(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
            
        }

        return this.northeast.insert(point) || this.northwest.insert(point) || this.southeast.insert(point) || this.southwest.insert(point);
    }

    reset() {
        this.points.length = 0; // Clear the points array without re-allocating memory
        if (this.divided) {
            this.northeast.reset();
            this.northwest.reset();
            this.southeast.reset();
            this.southwest.reset();
            this.divided = false;
        }
    }

    clear() {
        this.reset();
    }
    
    totalCount() {
        let count = this.points.length;
        if (this.divided) {
            count += this.northeast.totalCount();
            count += this.northwest.totalCount();
            count += this.southeast.totalCount();
            count += this.southwest.totalCount();
        }
        return count;
    }

    remove(point) {
        if (!this.boundary.boundaryContainsPoint(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.splice(this.points.indexOf(point), 1);
            return true;
        }

        if (!this.divided) {
            return false;
        }

        return this.northeast.remove(point) || this.northwest.remove(point) || this.southeast.remove(point) || this.southwest.remove(point);
    }

    query(range, found) {
        if (!found) {
            found = [];
        }

        if (!range.intersects(this.boundary)) {
            return found;
        }

        for (let p of this.points) {
            if (range.boundaryContainsPoint(p)) {
                found.push(p);
            }
        }

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    }
    
    
}