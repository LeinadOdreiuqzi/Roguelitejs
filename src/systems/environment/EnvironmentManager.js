import { MAP_WIDTH, MAP_HEIGHT } from "../../utils/Constants.js";

export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.torches = this.scene.add.group();
    this.torchLights = [];
    this.hallwayTorchPoints = [];
    this.enclosedSpaces = [];
    this.totalTorches = 0;
    this.maxTotalTorches = 20; // Reduced from 25 for performance
    this.TILE_SIZE = scene.TILE_SIZE;
  }

  setupHallwayTorchPoints() {
    const hallwayTorchChance = 0.8;
    const maxHallwayTorches = 10;
    const left = 0, right = MAP_WIDTH - 1, top = 0, bottom = MAP_HEIGHT - 1;

    let hallwayFloorTiles = [];
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (this.scene.dungeon[y] && this.scene.dungeon[y][x] === 0) {
          let isInRoom = false;
          for (const r of this.scene.rooms) {
            if (x >= r.getLeft() && x <= r.getRight() && y >= r.getTop() && y <= r.getBottom()) {
              isInRoom = true;
              break;
            }
          }
          if (!isInRoom) {
            const posX = (x - y) * this.TILE_SIZE;
            const posY = (x + y) * (this.TILE_SIZE / 2);
            hallwayFloorTiles.push({ x: posX, y: posY });
          }
        }
      }
    }

    hallwayFloorTiles.forEach((pos) => {
      if (this.hallwayTorchPoints.length >= maxHallwayTorches) return;
      if (Math.random() < hallwayTorchChance) {
        this.hallwayTorchPoints.push({ x: pos.x, y: pos.y, hasTorch: false });
      }
    });
  }

  identifyEnclosedSpaces() {
    const visited = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(false));
    const minSpaceSize = 10;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (visited[y][x] || !this.scene.dungeon[y] || this.scene.dungeon[y][x] !== 0) continue;

        let isInRoom = false;
        for (const room of this.scene.rooms) {
          if (x >= room.getLeft() && x <= room.getRight() && y >= room.getTop() && y <= room.getBottom()) {
            isInRoom = true;
            break;
          }
        }
        if (isInRoom) {
          visited[y][x] = true;
          continue;
        }

        const spaceTiles = [];
        const queue = [{ x, y }];
        visited[y][x] = true;

        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();
          spaceTiles.push({ x: cx, y: cy });

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              const ny = cy + dy;

              if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && !visited[ny][nx] && this.scene.dungeon[ny] && this.scene.dungeon[ny][nx] === 0) {
                let inRoom = false;
                for (const room of this.scene.rooms) {
                  if (nx >= room.getLeft() && nx <= room.getRight() && ny >= room.getTop() && ny <= room.getBottom()) {
                    inRoom = true;
                    break;
                  }
                }
                if (!inRoom) {
                  visited[ny][nx] = true;
                  queue.push({ x: nx, y: ny });
                }
              }
            }
          }
        }

        if (spaceTiles.length >= minSpaceSize) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          spaceTiles.forEach(tile => {
            minX = Math.min(minX, tile.x);
            maxX = Math.max(maxX, tile.x);
            minY = Math.min(minY, tile.y);
            maxY = Math.max(maxY, tile.y);
          });
          this.enclosedSpaces.push({
            minX, maxX, minY, maxY, tiles: spaceTiles, hasTorch: false, visited: false,
            centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, tileCount: spaceTiles.length,
          });
        }
      }
    }
  }

  spawnTorch(posX, posY, radius, intensity) {
    if (this.totalTorches >= this.maxTotalTorches) return null;
    const torch = this.torches
      .create(posX, posY - 10, "game-assets", 920)
      .setDisplaySize(16, 24)
      .setOrigin(0.5, 1)
      .setDepth(posY);
    torch.setPipeline('Light2D');
    const torchLight = this.scene.lights.addLight(posX, posY - 10, radius, 0xffa500, intensity);
    this.torchLights.push(torchLight);
    this.totalTorches++;
    return torchLight;
  }

  updateTorches(delta) {
    const roomTorchChance = 0.95;
    const enclosedSpaceTorchChance = 0.9;
    const largeSpaceThreshold = 100;
    const spawnCullDistance = 2000;
    const intensityCullDistance = 1000;

    const playerX = this.scene.player.x;
    const playerY = this.scene.player.y;
    const playerTilePos = this.scene.getPlayerTilePosition();
    const worldX = playerTilePos.x;
    const worldY = playerTilePos.y;

    // Optimize room checks with bounding box pre-filter
    const nearbyRooms = this.scene.rooms.filter(room => {
      const minX = (room.getLeft() - room.getTop()) * this.TILE_SIZE;
      const maxX = (room.getRight() - room.getBottom()) * this.TILE_SIZE;
      const minY = (room.getLeft() + room.getTop()) * (this.TILE_SIZE / 2);
      const maxY = (room.getRight() + room.getBottom()) * (this.TILE_SIZE / 2);
      return playerX >= minX - spawnCullDistance && playerX <= maxX + spawnCullDistance &&
             playerY >= minY - spawnCullDistance && playerY <= maxY + spawnCullDistance;
    });

    nearbyRooms.forEach((room) => {
      const roomCenterX = (room.getLeft() + room.getRight()) / 2;
      const roomCenterY = (room.getTop() + room.getBottom()) / 2;
      const roomCenterPosX = (roomCenterX - roomCenterY) * this.TILE_SIZE;
      const roomCenterPosY = (roomCenterX + roomCenterY) * (this.TILE_SIZE / 2);
      const isInRoomBounds = worldX >= room.getLeft() - 2 && worldX <= room.getRight() + 2 &&
                             worldY >= room.getTop() - 2 && worldY <= room.getBottom() + 2;

      if (isInRoomBounds && !room.visited) {
        room.visited = true;
        this.scene.currentRoom = room;
        console.log(`Entered room ${room.id}`);
      }

      if (isInRoomBounds && !room.hasTorch) {
        room.hasTorch = true;
        if (Math.random() < roomTorchChance) {
          let floorTiles = [];
          for (let y = room.getTop(); y <= room.getBottom(); y++) {
            for (let x = room.getLeft(); x <= room.getRight(); x++) {
              if (this.scene.dungeon[y]?.[x] === 0) {
                const posX = (x - y) * this.TILE_SIZE;
                const posY = (x + y) * (this.TILE_SIZE / 2);
                floorTiles.push({ x: posX, y: posY });
              }
            }
          }
          if (floorTiles.length > 0) {
            const pos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
            this.spawnTorch(pos.x, pos.y, 150, 1.5);
          }
        }
      }
    });

    // Optimize space checks with bounding box pre-filter
    const nearbySpaces = this.enclosedSpaces.filter(space => {
      const minX = (space.minX - space.minY) * this.TILE_SIZE;
      const maxX = (space.maxX - space.maxY) * this.TILE_SIZE;
      const minY = (space.minX + space.minY) * (this.TILE_SIZE / 2);
      const maxY = (space.maxX + space.maxY) * (this.TILE_SIZE / 2);
      return playerX >= minX - spawnCullDistance && playerX <= maxX + spawnCullDistance &&
             playerY >= minY - spawnCullDistance && playerY <= maxY + spawnCullDistance;
    });

    nearbySpaces.forEach((space) => {
      const isInSpaceBounds = worldX >= space.minX - 2 && worldX <= space.maxX + 2 &&
                              worldY >= space.minY - 2 && worldY <= space.maxY + 2;
      if (isInSpaceBounds && !space.visited) space.visited = true;
      if (isInSpaceBounds && !space.hasTorch) {
        space.hasTorch = true;
        const spawnChance = space.tileCount > largeSpaceThreshold ? 1.0 : enclosedSpaceTorchChance;
        if (Math.random() < spawnChance) {
          const pos = space.tiles[Math.floor(Math.random() * space.tiles.length)];
          const posX = (pos.x - pos.y) * this.TILE_SIZE;
          const posY = (pos.x + pos.y) * (this.TILE_SIZE / 2);
          this.spawnTorch(posX, posY, 150, 1.5);
        }
      }
    });

    this.hallwayTorchPoints.forEach((point) => {
      if (point.hasTorch) return;
      const distance = Phaser.Math.Distance.Between(playerX, playerY, point.x, point.y);
      if (distance > spawnCullDistance) return;
      if (distance < 400) {
        point.hasTorch = true;
        this.spawnTorch(point.x, point.y, 200, 1.8);
      }
    });

    // Optimize light intensity updates
    this.torchLights.forEach(light => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, light.x, light.y);
      light.setIntensity(distance > intensityCullDistance ? 0 : (light.radius === 150 ? 1.5 : 1.8));
    });

    // Cleanup inactive lights to prevent memory leaks
    this.torchLights = this.torchLights.filter(light => light.intensity > 0);
    this.totalTorches = this.torchLights.length;
  }

  spawnTorchesForRoom(room) {
    if (room.hasTorch) {
      let floorTiles = [];
      for (let y = room.getTop(); y <= room.getBottom(); y++) {
        for (let x = room.getLeft(); x <= room.getRight(); x++) {
          if (this.scene.dungeon[y]?.[x] === 0) {
            const posX = (x - y) * this.TILE_SIZE;
            const posY = (x + y) * (this.TILE_SIZE / 2);
            floorTiles.push({ x: posX, y: posY });
          }
        }
      }
      if (floorTiles.length > 0) {
        const pos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
        this.spawnTorch(pos.x, pos.y, 150, 1.5);
      }
    }
  }

  spawnTorchesForEnclosedSpaces() {
    this.enclosedSpaces.forEach((space) => {
      if (space.hasTorch) {
        const pos = space.tiles[Math.floor(Math.random() * space.tiles.length)];
        const posX = (pos.x - pos.y) * this.TILE_SIZE;
        const posY = (pos.x + pos.y) * (this.TILE_SIZE / 2);
        this.spawnTorch(posX, posY, 150, 1.5);
      }
    });
  }

  spawnTorchesForHallways() {
    this.hallwayTorchPoints.forEach((point) => {
      if (point.hasTorch) this.spawnTorch(point.x, point.y, 200, 1.8);
    });
  }

  clearTorches() {
    this.torches.clear(true, true);
    this.torchLights.forEach(light => this.scene.lights.removeLight(light));
    this.torchLights = [];
  }
}