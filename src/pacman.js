const MAZE = [
  "#################",
  "#.......#.......#",
  "#.##.##.#.##.##.#",
  "#o...#.....#...o#",
  "###.#.#.###.#.###",
  "#...#...#...#...#",
  "#.#####.#.#####.#",
  "#.......G.......#",
  "#.#####.#.#####.#",
  "#o....P...#....o#",
  "#################",
];
const DIRECTIONS = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] };

export class Pacman {
  constructor(canvas, status) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.status = status;
    this.reset();
  }
  reset() {
    this.grid = MAZE.map((row) => row.split(""));
    this.score = 0;
    this.lives = 3;
    this.direction = [0, 0];
    this.queued = [0, 0];
    this.tick = 0;
    this.ended = false;
    this.placeActors();
    this.draw();
  }
  placeActors() {
    this.player = { x: 6, y: 9 };
    this.ghost = { x: 8, y: 7 };
    this.direction = [0, 0];
    this.queued = [0, 0];
  }
  input(key) {
    const direction = DIRECTIONS[key.toLowerCase()];
    if (!direction) return false;
    this.queued = direction;
    return true;
  }
  free(x, y) { return this.grid[y]?.[x] != null && this.grid[y][x] !== "#"; }
  update() {
    if (this.ended) return;
    if (this.free(this.player.x + this.queued[0], this.player.y + this.queued[1]))
      this.direction = this.queued;
    if (this.free(this.player.x + this.direction[0], this.player.y + this.direction[1])) {
      this.player.x += this.direction[0];
      this.player.y += this.direction[1];
    }
    const tile = this.grid[this.player.y][this.player.x];
    if (tile === "." || tile === "o") {
      this.score += tile === "o" ? 50 : 10;
      this.grid[this.player.y][this.player.x] = " ";
    }
    if (this.tick++ % 2 === 0) {
      const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => this.free(this.ghost.x + dx, this.ghost.y + dy));
      options.sort((a, b) =>
        Math.abs(this.ghost.x + a[0] - this.player.x) + Math.abs(this.ghost.y + a[1] - this.player.y) -
        Math.abs(this.ghost.x + b[0] - this.player.x) - Math.abs(this.ghost.y + b[1] - this.player.y));
      const next = options[0];
      if (next) { this.ghost.x += next[0]; this.ghost.y += next[1]; }
    }
    if (this.player.x === this.ghost.x && this.player.y === this.ghost.y) {
      this.lives--;
      this.placeActors();
    }
    if (this.lives <= 0) {
      this.ended = true;
      this.draw();
      return;
    }
    if (!this.grid.some((row) => row.includes(".") || row.includes("o"))) {
      this.ended = true;
      this.draw();
      return;
    }
    this.draw();
  }
  draw() {
    const ctx = this.ctx, size = 22;
    ctx.fillStyle = "#071015";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < this.grid.length; y++) for (let x = 0; x < this.grid[y].length; x++) {
      const tile = this.grid[y][x];
      if (tile === "#") {
        ctx.fillStyle = "#2857bb";
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      } else if (tile === "." || tile === "o") {
        ctx.fillStyle = "#f7dbad";
        ctx.beginPath();
        ctx.arc(x * size + size / 2, y * size + size / 2, tile === "o" ? 5 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#ffdc55";
    ctx.beginPath();
    ctx.arc((this.player.x + .5) * size, (this.player.y + .5) * size, 9, .2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo((this.player.x + .5) * size, (this.player.y + .5) * size);
    ctx.fill();
    ctx.fillStyle = "#ff777a";
    ctx.beginPath();
    ctx.arc((this.ghost.x + .5) * size, (this.ghost.y + .5) * size, 9, Math.PI, 0);
    ctx.lineTo((this.ghost.x + .5) * size + 9, (this.ghost.y + .5) * size + 9);
    ctx.lineTo((this.ghost.x + .5) * size - 9, (this.ghost.y + .5) * size + 9);
    ctx.fill();
    this.status.textContent = this.ended
      ? `${this.lives <= 0 ? "GAME OVER" : "MAZE CLEARED"} · ${this.score} POINTS · RESTART TO TRY AGAIN`
      : `SCORE ${this.score} · LIVES ${this.lives}`;
  }
}
