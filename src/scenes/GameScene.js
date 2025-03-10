import Phaser from "phaser";
import {
  generateDungeon,
  findBestSpawnPoint,
  isValidSpawnLocation,
} from "../systems/procedural/DungeonGenerator.js";
import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  ROOM_WIDTH,
  ROOM_HEIGHT,
} from "../utils/Constants.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.lightingMode = "perRoom";
    this.torches = null;
    this.torchLights = [];
    this.hallwayTorchPoints = [];
    this.enclosedSpaces = [];
    this.spawnMarkerLight = null;
    this.playerLight = null;
    this.visibleLights = new Set();
    this.spawnPoint = null;
    this.totalTorches = 0;
    this.maxTotalTorches = 25;
    this.roomDwellTimes = new Map();
    this.spaceDwellTimes = new Map();
    this.usePlaceholderSprite = false;
    this.usePlaceholderAssets = false;
  }

  preload() {
    try {
      this.load.image("player-front", "/assets/player-front.png");
      this.load.image("player-back", "/assets/player-back.png");
    } catch (error) {
      console.error("Failed to load player sprites:", error);
      this.usePlaceholderSprite = true;
    }

    try {
      this.load.spritesheet("game-assets", "/assets/spritesheet.png", {
        frameWidth: 16,
        frameHeight: 16,
      });
    } catch (error) {
      console.error("Failed to load spritesheet:", error);
      this.usePlaceholderAssets = true;
    }

    this.load.on('fileerror', (file) => {
      console.error(`Failed to load file: ${file.key}`, file);
      if (file.key === "player-front" || file.key === "player-back") {
        this.usePlaceholderSprite = true;
      }
      if (file.key === "game-assets") {
        this.usePlaceholderAssets = true;
      }
    });

    this.createPlaceholderGraphics();
  }

  createPlaceholderGraphics() {
    if (this.usePlaceholderAssets) {
      const floorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      floorGraphics.fillStyle(0x333333, 1);
      floorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE / 2);
      floorGraphics.generateTexture("floor-placeholder", TILE_SIZE, TILE_SIZE / 2);
      floorGraphics.destroy();

      const wallGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      wallGraphics.fillStyle(0x888888, 1);
      wallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE * 1.2);
      wallGraphics.fillStyle(0x777777, 1);
      wallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE * 0.3);
      wallGraphics.fillStyle(0x666666, 1);
      wallGraphics.fillRect(0, TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.9);
      wallGraphics.fillRect(TILE_SIZE * 0.8, TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.9);
      wallGraphics.lineStyle(1, 0x555555, 0.5);
      wallGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE * 1.2);
      wallGraphics.generateTexture("wall-placeholder", TILE_SIZE, TILE_SIZE * 1.2);
      wallGraphics.destroy();

      const doorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      doorGraphics.fillStyle(0x795548, 1);
      doorGraphics.fillRect(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.8);
      doorGraphics.fillStyle(0x5d4037, 1);
      doorGraphics.fillRect(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.1);
      doorGraphics.fillRect(0, 0, TILE_SIZE * 0.1, TILE_SIZE * 0.8);
      doorGraphics.fillRect(TILE_SIZE * 0.6, 0, TILE_SIZE * 0.1, TILE_SIZE * 0.8);
      doorGraphics.fillStyle(0xffd700, 1);
      doorGraphics.fillCircle(TILE_SIZE * 0.55, TILE_SIZE * 0.4, TILE_SIZE * 0.06);
      doorGraphics.lineStyle(1, 0x3e2723, 0.8);
      doorGraphics.strokeRect(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.8);
      doorGraphics.generateTexture("door-placeholder", TILE_SIZE * 0.7, TILE_SIZE * 0.8);
      doorGraphics.destroy();

      const torchGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      torchGraphics.fillStyle(0x8b4513, 1);
      torchGraphics.fillRect(12, 8, 4, 16);
      torchGraphics.fillStyle(0xff4500, 1);
      torchGraphics.fillTriangle(10, 8, 18, 8, 14, 0);
      torchGraphics.fillStyle(0xffff00, 1);
      torchGraphics.fillTriangle(12, 6, 16, 6, 14, 2);
      torchGraphics.lineStyle(1, 0x000000, 1);
      torchGraphics.strokeRect(12, 8, 4, 16);
      torchGraphics.strokeTriangle(10, 8, 18, 8, 14, 0);
      torchGraphics.generateTexture("torch-placeholder", 28, 24);
      torchGraphics.destroy();
    }

    if (this.usePlaceholderSprite) {
      const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      playerGraphics.fillStyle(0x3498db, 1);
      playerGraphics.fillRoundedRect(4, 10, 16, 16, 4);
      playerGraphics.fillStyle(0xecf0f1, 1);
      playerGraphics.fillCircle(12, 8, 6);
      playerGraphics.fillStyle(0x000000, 1);
      playerGraphics.fillCircle(10, 7, 1.5);
      playerGraphics.fillCircle(14, 7, 1.5);
      playerGraphics.fillStyle(0x3498db, 1);
      playerGraphics.fillRoundedRect(1, 12, 5, 4, 2);
      playerGraphics.fillRoundedRect(18, 12, 5, 4, 2);
      playerGraphics.fillStyle(0x2980b9, 1);
      playerGraphics.fillRoundedRect(7, 26, 5, 6, 2);
      playerGraphics.fillRoundedRect(12, 26, 5, 6, 2);
      playerGraphics.fillStyle(0x7f8c8d, 1);
      playerGraphics.fillRect(20, 15, 8, 3);
      playerGraphics.lineStyle(1, 0x2c3e50, 1);
      playerGraphics.strokeRoundedRect(4, 10, 16, 16, 4);
      playerGraphics.strokeCircle(12, 8, 6);
      playerGraphics.strokeRoundedRect(1, 12, 5, 4, 2);
      playerGraphics.strokeRoundedRect(18, 12, 5, 4, 2);
      playerGraphics.strokeRoundedRect(7, 26, 5, 6, 2);
      playerGraphics.strokeRoundedRect(12, 26, 5, 6, 2);
      playerGraphics.strokeRect(20, 15, 8, 3);
      playerGraphics.generateTexture("player-placeholder", 28, 32);
      playerGraphics.destroy();
    }
  }

  create() {
    this.lights.enable();

    const { dungeon, rooms, doors } = generateDungeon();
    this.dungeon = dungeon;
    this.rooms = rooms;
    this.floorTiles = this.add.group();
    this.wallTiles = this.physics.add.staticGroup();
    this.doorTiles = this.add.group();
    this.roomMarkers = this.add.group();
    this.torches = this.add.group();

    this.noclipMode = false;
    this.noclipText = this.add
      .text(10, 10, "Noclip: OFF", {
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(1001);

    this.currentRoom = rooms[0];
    this.rooms.forEach(room => {
      room.hasTorch = false;
    });

    this.renderRoom(this.currentRoom);

    if (doors && Array.isArray(doors)) {
      doors.forEach((door) => {
        if (typeof door.x === "undefined" || typeof door.y === "undefined") return;
        const posX = (door.x - door.y) * TILE_SIZE;
        const posY = (door.x + door.y) * (TILE_SIZE / 2);
        const doorSprite = this.doorTiles
          .create(posX, posY, this.usePlaceholderAssets ? "door-placeholder" : "game-assets", 272)
          .setDisplaySize(TILE_SIZE / 2, TILE_SIZE / 2)
          .setOrigin(0.5, 1)
          .setDepth(posY);
        doorSprite.roomId = door.roomId;
        doorSprite.setPipeline('Light2D');
      });
    }

    const spawnPoint = findBestSpawnPoint(this.dungeon, this.currentRoom);
    const playerX = (spawnPoint.x - spawnPoint.y) * TILE_SIZE;
    const playerY = (spawnPoint.x + spawnPoint.y) * (TILE_SIZE / 2);
    this.spawnPoint = { x: playerX, y: playerY };

    const initialSprite = this.usePlaceholderSprite ? "player-placeholder" : "player-front";
    this.player = this.physics.add
      .sprite(playerX, playerY - 10, initialSprite)
      .setOrigin(0.5, 0.8);
    this.player.body.setCollideWorldBounds(false);
    this.player.body.setSize(16, 12).setOffset(6, 16);
    this.player.setDepth(1000);
    this.player.setPipeline('Light2D');

    this.lights.setAmbientColor(0x333333);
    this.playerLight = this.lights.addLight(playerX, playerY, 50, 0xffff99, 0.9);
    this.spawnMarkerLight = this.lights.addLight(playerX, playerY, 100, 0xffffff, 0.8);

    this.setupHallwayTorchPoints();
    this.identifyEnclosedSpaces();

    this.playerShadow = this.add
      .ellipse(playerX, playerY + 5, 24, 12, 0x000000, 0.3)
      .setOrigin(0.5, 0.5)
      .setDepth(playerY - 1);
    this.playerShadow.setPipeline('Light2D');

    this.keys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      C: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
    };

    this.physics.add.collider(this.player, this.wallTiles);
    this.updateCameraBounds();
    this.physics.add.overlap(this.player, this.doorTiles, this.handleDoorTransition, null, this);

    this.add
      .text(10, 36, "Version 1.3: Room Lighting & Torches", {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  setupHallwayTorchPoints() {
    const hallwayTorchChance = 0.8;
    let hallwayTorchesPlaced = 0;
    const maxHallwayTorches = 10;
    const left = 0;
    const right = MAP_WIDTH - 1;
    const top = 0;
    const bottom = MAP_HEIGHT - 1;

    let hallwayFloorTiles = [];
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (this.dungeon[y] && this.dungeon[y][x] === 0) {
          let isInRoom = false;
          for (const r of this.rooms) {
            if (
              x >= r.getLeft() &&
              x <= r.getRight() &&
              y >= r.getTop() &&
              y <= r.getBottom()
            ) {
              isInRoom = true;
              break;
            }
          }
          if (!isInRoom) {
            const posX = (x - y) * TILE_SIZE;
            const posY = (x + y) * (TILE_SIZE / 2);
            hallwayFloorTiles.push({ x: posX, y: posY });
          }
        }
      }
    }

    hallwayFloorTiles.forEach((pos) => {
      if (hallwayTorchesPlaced >= maxHallwayTorches) return;
      if (Math.random() < hallwayTorchChance) {
        this.hallwayTorchPoints.push({ x: pos.x, y: pos.y, hasTorch: false });
        hallwayTorchesPlaced++;
      }
    });
  }

  identifyEnclosedSpaces() {
    const visited = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(false));
    const minSpaceSize = 10;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (visited[y][x] || !this.dungeon[y] || this.dungeon[y][x] !== 0) continue;

        let isInRoom = false;
        for (const room of this.rooms) {
          if (
            x >= room.getLeft() &&
            x <= room.getRight() &&
            y >= room.getTop() &&
            y <= room.getBottom()
          ) {
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

              if (
                nx >= 0 &&
                nx < MAP_WIDTH &&
                ny >= 0 &&
                ny < MAP_HEIGHT &&
                !visited[ny][nx] &&
                this.dungeon[ny] &&
                this.dungeon[ny][nx] === 0
              ) {
                let inRoom = false;
                for (const room of this.rooms) {
                  if (
                    nx >= room.getLeft() &&
                    nx <= room.getRight() &&
                    ny >= room.getTop() &&
                    ny <= room.getBottom()
                  ) {
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
            minX,
            maxX,
            minY,
            maxY,
            tiles: spaceTiles,
            hasTorch: false,
            visited: false,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            tileCount: spaceTiles.length,
          });
        }
      }
    }
  }

  spawnTorch(posX, posY, radius, intensity) {
    if (this.totalTorches >= this.maxTotalTorches) return null;
    const torch = this.torches.create(posX, posY - 10, this.usePlaceholderAssets ? "torch-placeholder" : "game-assets", 920)
      .setDisplaySize(16, 24)
      .setOrigin(0.5, 1)
      .setDepth(posY);
    torch.setPipeline('Light2D');
    const torchLight = this.lights.addLight(posX, posY - 10, radius, 0xffa500, intensity);
    this.torchLights.push(torchLight);
    this.visibleLights.add(torchLight);
    this.totalTorches++;
    return torchLight;
  }

  updateTorches(delta) {
    const roomTorchChance = 0.95;
    const enclosedSpaceTorchChance = 0.9;
    const largeSpaceThreshold = 100;
    const spawnCullDistance = 2000;
    const intensityCullDistance = 1000;
    const dwellTimeThreshold = 2000;

    const playerTilePos = this.getPlayerTilePosition();
    const worldX = playerTilePos.x;
    const worldY = playerTilePos.y;

    // Optimize by precomputing rooms within spawn distance
    const nearbyRooms = this.rooms.filter(room => {
      const roomCenterX = (room.getLeft() + room.getRight()) / 2;
      const roomCenterY = (room.getTop() + room.getBottom()) / 2;
      const roomCenterPosX = (roomCenterX - roomCenterY) * TILE_SIZE;
      const roomCenterPosY = (roomCenterX + roomCenterY) * (TILE_SIZE / 2);
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        roomCenterPosX,
        roomCenterPosY
      );
      return distance <= spawnCullDistance;
    });

    nearbyRooms.forEach((room) => {
      const roomCenterX = (room.getLeft() + room.getRight()) / 2;
      const roomCenterY = (room.getTop() + room.getBottom()) / 2;
      const roomCenterPosX = (roomCenterX - roomCenterY) * TILE_SIZE;
      const roomCenterPosY = (roomCenterX + roomCenterY) * (TILE_SIZE / 2);
      const isInRoomBounds =
        worldX >= room.getLeft() - 2 &&
        worldX <= room.getRight() + 2 &&
        worldY >= room.getTop() - 2 &&
        worldY <= room.getBottom() + 2;

      if (isInRoomBounds && !room.visited) {
        room.visited = true;
      }

      if (isInRoomBounds && !room.hasTorch) {
        room.hasTorch = true;
        if (Math.random() < roomTorchChance) {
          let floorTiles = [];
          for (let y = room.getTop(); y <= room.getBottom(); y++) {
            for (let x = room.getLeft(); x <= room.getRight(); x++) {
              if (this.dungeon[y]?.[x] === 0) {
                const posX = (x - y) * TILE_SIZE;
                const posY = (x + y) * (TILE_SIZE / 2);
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

    // Optimize enclosed spaces check
    const nearbySpaces = this.enclosedSpaces.filter((space) => {
      const spaceCenterPosX = (space.centerX - space.centerY) * TILE_SIZE;
      const spaceCenterPosY = (space.centerX + space.centerY) * (TILE_SIZE / 2);
      return Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        spaceCenterPosX,
        spaceCenterPosY
      ) <= spawnCullDistance;
    });

    nearbySpaces.forEach((space, index) => {
      const isInSpaceBounds =
        worldX >= space.minX - 2 &&
        worldX <= space.maxX + 2 &&
        worldY >= space.minY - 2 &&
        worldY <= space.maxY + 2;

      if (isInSpaceBounds && !space.visited) {
        space.visited = true;
      }

      if (isInSpaceBounds && !space.hasTorch) {
        space.hasTorch = true;
        const spawnChance = space.tileCount > largeSpaceThreshold ? 1.0 : enclosedSpaceTorchChance;
        if (Math.random() < spawnChance) {
          const pos = space.tiles[Math.floor(Math.random() * space.tiles.length)];
          const posX = (pos.x - pos.y) * TILE_SIZE;
          const posY = (pos.x + pos.y) * (TILE_SIZE / 2);
          this.spawnTorch(posX, posY, 150, 1.5);
        }
      }
    });

    // Optimize hallway torch points check
    this.hallwayTorchPoints.forEach((point, index) => {
      if (point.hasTorch) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y);
      if (distance > spawnCullDistance) return;
      if (distance < 400) {
        point.hasTorch = true;
        this.spawnTorch(point.x, point.y, 200, 1.8);
      }
    });

    // Optimize light intensity updates
    this.torchLights.forEach(light => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, light.x, light.y);
      light.setIntensity(distance > intensityCullDistance ? 0 : (light.radius === 150 ? 1.5 : 1.8));
    });

    // Clear dwell times to prevent memory buildup
    this.roomDwellTimes.clear();
    this.spaceDwellTimes.clear();
  }

  renderRoom(room) {
    if (!room) return;

    this.rooms.forEach(r => {
      if (r.minimapText) {
        r.minimapText.destroy();
        r.minimapText = null;
      }
    });

    this.floorTiles.clear(true, true);
    this.wallTiles.clear(true, true);
    this.doorTiles.clear(true, true);
    this.roomMarkers.clear(true, true);
    this.torches.clear(true, true);
    this.torchLights.forEach(light => this.lights.removeLight(light));
    this.torchLights = [];
    this.visibleLights.clear();

    const left = 0;
    const right = MAP_WIDTH - 1;
    const top = 0;
    const bottom = MAP_HEIGHT - 1;

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const posX = (x - y) * TILE_SIZE;
        const posY = (x + y) * (TILE_SIZE / 2);

        if (this.dungeon[y]?.[x] === 0) {
          const floorTile = this.add.sprite(posX, posY, this.usePlaceholderAssets ? "floor-placeholder" : "game-assets", 11)
            .setDisplaySize(TILE_SIZE, TILE_SIZE / 2)
            .setOrigin(0.5, 1)
            .setDepth(posY);
          floorTile.setPipeline('Light2D');
          this.floorTiles.add(floorTile);
        }
      }
    }

    this.rooms.forEach((r) => {
      if (r.hasTorch) {
        let floorTiles = [];
        for (let y = r.getTop(); y <= r.getBottom(); y++) {
          for (let x = r.getLeft(); x <= r.getRight(); x++) {
            if (this.dungeon[y]?.[x] === 0) {
              const posX = (x - y) * TILE_SIZE;
              const posY = (x + y) * (TILE_SIZE / 2);
              floorTiles.push({ x: posX, y: posY });
            }
          }
        }
        if (floorTiles.length > 0) {
          const pos = floorTiles[Math.floor(Math.random() * floorTiles.length)];
          this.spawnTorch(pos.x, pos.y, 150, 1.5);
        }
      }
    });

    this.enclosedSpaces.forEach((space) => {
      if (space.hasTorch) {
        const pos = space.tiles[Math.floor(Math.random() * space.tiles.length)];
        const posX = (pos.x - pos.y) * TILE_SIZE;
        const posY = (pos.x + pos.y) * (TILE_SIZE / 2);
        this.spawnTorch(posX, posY, 150, 1.5);
      }
    });

    this.hallwayTorchPoints.forEach((point) => {
      if (point.hasTorch) {
        this.spawnTorch(point.x, point.y, 200, 1.8);
      }
    });

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (this.dungeon[y]?.[x] === 1) {
          let adjacentToFloor = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (
                nx >= 0 &&
                nx < MAP_WIDTH &&
                ny >= 0 &&
                ny < MAP_HEIGHT &&
                this.dungeon[ny]?.[nx] === 0
              ) {
                adjacentToFloor = true;
                break;
              }
            }
            if (adjacentToFloor) break;
          }

          if (adjacentToFloor) {
            const posX = (x - y) * TILE_SIZE;
            const posY = (x + y) * (TILE_SIZE / 2);
            const wall = this.wallTiles.create(posX, posY - TILE_SIZE * 0.6, this.usePlaceholderAssets ? "wall-placeholder" : "game-assets", 168)
              .setDisplaySize(TILE_SIZE, TILE_SIZE * 1.2)
              .setOrigin(0.5, 1)
              .setDepth(posY + 1);
            wall.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.5).setOffset(TILE_SIZE * 0.1, TILE_SIZE * 0.8);
            wall.setPipeline('Light2D');
          }
        }
      }
    }

    this.wallTiles.refresh();
  }

  updateCameraBounds() {
    const room = this.currentRoom;
    const margin = Math.max(MAP_WIDTH, MAP_HEIGHT) / 2;
    const left = (room.getLeft() - room.getTop() - margin) * TILE_SIZE;
    const right = (room.getRight() - room.getBottom() + margin) * TILE_SIZE;
    const top = (room.getLeft() + room.getTop() - margin) * (TILE_SIZE / 2);
    const bottom = (room.getRight() + room.getBottom() + margin) * (TILE_SIZE / 2);

    this.cameras.main.setBounds(left, top, right - left, bottom - top);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.followOffset.y = -20;

    if (this.debugRoomText) {
      this.debugRoomText.destroy();
    }

    this.debugRoomText = this.add
      .text(10, 80, `Room ${room.id} (${room.width}x${room.height})`, {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  handleDoorTransition(player, door) {
    const nextRoomId = door.roomId;
    const nextRoom = this.rooms[nextRoomId];

    if (nextRoom !== this.currentRoom) {
      this.currentRoom = this.rooms[nextRoomId];

      const roomCenterX = (nextRoom.getLeft() + nextRoom.getRight()) / 2;
      const roomCenterY = (nextRoom.getTop() + nextRoom.getBottom()) / 2;
      const playerX = (roomCenterX - roomCenterY) * TILE_SIZE;
      const playerY = (roomCenterX + roomCenterY) * (TILE_SIZE / 2);
      this.player.setPosition(playerX, playerY);

      this.renderRoom(nextRoom);
      this.updateCameraBounds();
      this.cameras.main.fadeIn(250);
    }
  }

  movePlayerToSafePosition() {
    const playerPos = this.getPlayerTilePosition();
    const canvasBoundary = { minX: 0, maxX: MAP_WIDTH - 1, minY: 0, maxY: MAP_HEIGHT - 1 };

    let nearInnerWall = false;
    for (let dy = -1; dy <= 1 && !nearInnerWall; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = playerPos.x + dx;
        const ny = playerPos.y + dy;
        if (
          nx >= 0 &&
          nx < MAP_WIDTH &&
          ny >= 0 &&
          ny < MAP_HEIGHT &&
          this.dungeon[ny]?.[nx] === 1 &&
          nx !== canvasBoundary.minX &&
          nx !== canvasBoundary.maxX &&
          ny !== canvasBoundary.minY &&
          ny !== canvasBoundary.maxY
        ) {
          nearInnerWall = true;
          break;
        }
      }
    }

    if (!nearInnerWall) {
      for (let radius = 1; radius <= 5; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
            const tileX = playerPos.x + dx;
            const tileY = playerPos.y + dy;
            if (
              tileX >= 0 &&
              tileX < MAP_WIDTH &&
              tileY >= 0 &&
              tileY < MAP_HEIGHT &&
              this.dungeon[tileY]?.[tileX] === 0
            ) {
              const isoX = (tileX - tileY) * TILE_SIZE;
              const isoY = (tileX + tileY) * (TILE_SIZE / 2);
              this.player.setAlpha(0.5);
              this.player.setPosition(isoX, isoY - 10);
              this.tweens.add({
                targets: this.player,
                alpha: 1,
                duration: 300,
                ease: "Power2",
              });
              const teleportText = this.add
                .text(this.player.x, this.player.y - 30, "Unstuck!", {
                  fontSize: "14px",
                  color: "#ffffff",
                  stroke: "#000000",
                  strokeThickness: 3,
                })
                .setDepth(1001);
              this.tweens.add({
                targets: teleportText,
                alpha: 0,
                y: teleportText.y - 20,
                duration: 1000,
                onComplete: () => teleportText.destroy(),
              });
              return;
            }
          }
        }
      }
    }
  }

  getPlayerTilePosition() {
    const tileX = Math.floor((this.player.x / TILE_SIZE + this.player.y / (TILE_SIZE / 2)) / 2);
    const tileY = Math.floor((this.player.y / (TILE_SIZE / 2) - this.player.x / TILE_SIZE) / 2);
    return { x: tileX, y: tileY };
  }

  update(time, delta) {
    if (!this.player) return;

    const speed = 220;
    let velocityX = 0;
    let velocityY = 0;

    if (this.keys.W.isDown) velocityY -= speed;
    if (this.keys.S.isDown) velocityY += speed;
    if (this.keys.A.isDown) velocityX -= speed;
    if (this.keys.D.isDown) velocityX += speed;

    if (velocityX !== 0 && velocityY !== 0) {
      const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      velocityX = (velocityX / magnitude) * speed;
      velocityY = (velocityY / magnitude) * speed;
    }

    const isoVelocityX = (velocityX - velocityY) * 0.85;
    const isoVelocityY = (velocityX + velocityY) * 0.6;
    this.player.body.setVelocity(isoVelocityX, isoVelocityY);

    if (!this.usePlaceholderSprite) {
      if (velocityY > 0) {
        this.player.setTexture("player-front");
      } else if (velocityY < 0) {
        this.player.setTexture("player-back");
      }
    }

    if (this.spawnMarkerLight) {
      this.spawnMarkerLight.setPosition(this.player.x, this.player.y);
    }

    if (this.playerLight) {
      this.playerLight.setPosition(this.player.x, this.player.y);
    }

    this.updateTorches(delta);

    if (!this.noclipMode && this.player.body.blocked.none && this.player.body.velocity.lengthSq() < 10) {
      const worldX = Math.floor((this.player.x / TILE_SIZE + this.player.y / (TILE_SIZE / 2)) / 2);
      const worldY = Math.floor((this.player.y / (TILE_SIZE / 2) - this.player.x / TILE_SIZE) / 2);
      if (worldX >= 0 && worldX < MAP_WIDTH && worldY >= 0 && worldY < MAP_HEIGHT) {
        if (!isValidSpawnLocation(this.dungeon, worldX, worldY)) {
          this.movePlayerToSafePosition();
        }
      }
    }

    if (this.player.alpha < 1) this.player.alpha = 1;

    this.player.body.setDrag(velocityX === 0 && velocityY === 0 ? 500 : 100);
    if (velocityX < 0) this.player.flipX = true;
    else if (velocityX > 0) this.player.flipX = false;

    this.playerShadow.setPosition(this.player.x, this.player.y + 5);
    this.playerShadow.setDepth(this.player.y - 1);
    this.player.setDepth(this.player.y + 10);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      let dashX = isoVelocityX;
      let dashY = isoVelocityY;

      if (dashX === 0 && dashY === 0) {
        dashX = this.player.flipX ? -200 : 200;
      } else {
        const magnitude = Math.sqrt(dashX * dashX + dashY * dashY);
        dashX = (dashX / magnitude) * 400;
        dashY = (dashY / magnitude) * 400;
      }

      this.player.body.setVelocity(dashX, dashY);

      this.tweens.add({
        targets: this.player,
        alpha: 0.7,
        scale: 0.9,
        duration: 150,
        yoyo: true,
        onUpdate: () => this.playerShadow.setAlpha(0.1),
        onComplete: () => {
          this.playerShadow.setAlpha(0.3);
          this.player.alpha = 1;
        },
      });

      const particles = this.add.particles(this.player.x, this.player.y, this.usePlaceholderAssets ? "floor-placeholder" : "game-assets", 916, {
        speed: 50,
        scale: { start: 0.2, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 200,
        quantity: 5,
      });

      this.time.delayedCall(300, () => particles.destroy());
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.noclipMode = !this.noclipMode;
      this.noclipText.setText(`Noclip: ${this.noclipMode ? "ON" : "OFF"}`);
      this.physics.world.colliders.getActive().forEach((collider) => {
        if (collider.object1 === this.player || collider.object2 === this.player) {
          collider.active = !this.noclipMode;
        }
      });
    }
  }
}