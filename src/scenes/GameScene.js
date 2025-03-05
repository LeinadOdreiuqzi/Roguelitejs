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
    this.roomLights = new Map(); // Map of room ID to single light
    this.torches = null;
    this.torchLights = [];
    this.spawnMarkerLight = null;
    this.playerLight = null;
    this.visibleLights = new Set();
    this.spawnPoint = null;
    this.fogOfWar = null;
    this.fogOfWarEnabled = false;
  }

  preload() {
    this.createPlaceholderGraphics();
  }

  createPlaceholderGraphics() {
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
    this.currentRoom.visited = true;
    console.log(`Initial room (ID: ${this.currentRoom.id}) visited: ${this.currentRoom.visited}`);

    // Mark rooms 0 to 3 as visited for testing
    for (let i = 0; i <= 3 && i < rooms.length; i++) {
      rooms[i].visited = true;
      console.log(`Room ${i} manually set to visited: ${rooms[i].visited}`);
    }

    this.renderRoom(this.currentRoom);

    if (doors && Array.isArray(doors)) {
      doors.forEach((door) => {
        if (typeof door.x === "undefined" || typeof door.y === "undefined") return;
        const posX = (door.x - door.y) * TILE_SIZE;
        const posY = (door.x + door.y) * (TILE_SIZE / 2);
        const doorSprite = this.doorTiles
          .create(posX, posY, "door-placeholder")
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

    this.player = this.physics.add
      .sprite(playerX, playerY - 10, "player-placeholder")
      .setOrigin(0.5, 0.8);
    this.player.body.setCollideWorldBounds(false);
    this.player.body.setSize(16, 12).setOffset(6, 16);
    this.player.setDepth(1000);
    this.player.setPipeline('Light2D');

    this.playerLight = this.lights.addLight(playerX, playerY, 50, 0xffff99, 0.9);
    this.spawnMarkerLight = this.lights.addLight(playerX, playerY, 100, 0xffffff, 0.8);

    this.fogOfWar = this.add.graphics();
    this.fogOfWar.setDepth(900);

    if (this.lightingMode === "perRoom") {
      this.lights.setAmbientColor(0x333333);
      this.setupPerRoomLighting();
      this.updateRoomLighting(this.currentRoom);
    }

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

  setupPerRoomLighting() {
    this.rooms.forEach((room) => {
      const centerX = (room.getLeft() + room.getRight()) / 2;
      const centerY = (room.getTop() + room.getBottom()) / 2;
      const posX = (centerX - centerY) * TILE_SIZE;
      const posY = (centerX + centerY) * (TILE_SIZE / 2);

      // Offset the light position like the debug light (100 pixels to the right)
      const lightX = posX + 100;
      const lightY = posY;

      const light = this.lights.addLight(lightX, lightY, 200, 0xffffff, 0);
      this.roomLights.set(room.id, light);
      console.log(`Light created for room ID ${room.id} at (${lightX}, ${lightY}) with radius 200`);
    });
  }

  updateRoomLighting(currentRoom) {
    this.rooms.forEach((room) => {
      const light = this.roomLights.get(room.id);
      if (!light) {
        console.warn(`No light found for room ID ${room.id}`);
        return;
      }

      const targetIntensity = room.visited ? 3.0 : 0; // Reduced intensity to 3.0
      const previousIntensity = light.intensity;
      light.setIntensity(targetIntensity);

      console.log(`Room ${room.id} visited: ${room.visited}, light intensity: ${light.intensity} (was ${previousIntensity})`);

      // Log light position to confirm it’s correct
      console.log(`Room ${room.id} light position: (${light.x}, ${light.y})`);
    });
  }

  updateFogOfWar() {
    this.fogOfWar.clear();

    if (!this.fogOfWarEnabled) return;

    const margin = Math.max(ROOM_WIDTH, ROOM_HEIGHT) + 8;
    const left = 0;
    const right = MAP_WIDTH - 1;
    const top = 0;
    const bottom = MAP_HEIGHT - 1;

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const posX = (x - y) * TILE_SIZE;
        const posY = (x + y) * (TILE_SIZE / 2);

        let isInVisitedRoom = false;
        for (const room of this.rooms) {
          if (
            x >= room.getLeft() &&
            x <= room.getRight() &&
            y >= room.getTop() &&
            y <= room.getBottom() &&
            room.visited
          ) {
            isInVisitedRoom = true;
            console.log(`Tile at (${x}, ${y}) is in visited room ${room.id}`);
            break;
          }
        }

        if (!isInVisitedRoom && this.dungeon[y] && this.dungeon[y][x] === 0) {
          this.fogOfWar.fillStyle(0x000000, 0.9);
          this.fogOfWar.fillRect(posX - TILE_SIZE / 2, posY - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE / 2);
          console.log(`Fog of war applied at (${x}, ${y})`);
        }
      }
    }
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

    const margin = Math.max(ROOM_WIDTH, ROOM_HEIGHT) + 8;
    const left = 0;
    const right = MAP_WIDTH - 1;
    const top = 0;
    const bottom = MAP_HEIGHT - 1;

    let roomFloorTiles = [];
    let hallwayFloorTiles = [];
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const posX = (x - y) * TILE_SIZE;
        const posY = (x + y) * (TILE_SIZE / 2);

        if (this.dungeon[y] && this.dungeon[y][x] === 0) {
          const floorTile = this.add.sprite(posX, posY, "floor-placeholder")
            .setDisplaySize(TILE_SIZE, TILE_SIZE / 2)
            .setOrigin(0.5, 1)
            .setDepth(posY);
          floorTile.setPipeline('Light2D');
          this.floorTiles.add(floorTile);

          let isInRoom = false;
          for (const r of this.rooms) {
            if (
              x >= r.getLeft() &&
              x <= r.getRight() &&
              y >= r.getTop() &&
              y <= r.getBottom()
            ) {
              isInRoom = true;
              roomFloorTiles.push({ x: posX, y: posY, roomId: r.id });
              break;
            }
          }
          if (!isInRoom) {
            hallwayFloorTiles.push({ x: posX, y: posY });
          }
        }
      }
    }

    const roomTorchChance = 0.53;
    const roomsWithTorches = new Set();
    roomFloorTiles.forEach((pos) => {
      const roomId = pos.roomId;
      if (!roomsWithTorches.has(roomId) && Math.random() < roomTorchChance) {
        const torch = this.torches.create(pos.x, pos.y - 10, "torch-placeholder")
          .setDisplaySize(16, 24)
          .setOrigin(0.5, 1)
          .setDepth(pos.y);
        torch.setPipeline('Light2D');
        const torchLight = this.lights.addLight(pos.x, pos.y - 10, 75, 0xffa500, 1.0);
        this.torchLights.push(torchLight);
        this.visibleLights.add(torchLight);
        roomsWithTorches.add(roomId);
      }
    });

    const hallwayTorchChance = 0.3;
    let hallwayTorchesPlaced = 0;
    const maxHallwayTorches = 3;
    hallwayFloorTiles.forEach((pos) => {
      if (hallwayTorchesPlaced >= maxHallwayTorches) return;
      if (Math.random() < hallwayTorchChance) {
        const torch = this.torches.create(pos.x, pos.y - 10, "torch-placeholder")
          .setDisplaySize(16, 24)
          .setOrigin(0.5, 1)
          .setDepth(pos.y);
        torch.setPipeline('Light2D');
        const torchLight = this.lights.addLight(pos.x, pos.y - 10, 100, 0xffa500, 1.2);
        this.torchLights.push(torchLight);
        this.visibleLights.add(torchLight);
        hallwayTorchesPlaced++;
      }
    });

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (this.dungeon[y] && this.dungeon[y][x] === 1) {
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
                this.dungeon[ny] &&
                this.dungeon[ny][nx] === 0
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
            const wall = this.wallTiles.create(posX, posY - TILE_SIZE * 0.6, "wall-placeholder")
              .setDisplaySize(TILE_SIZE, TILE_SIZE * 1.2)
              .setOrigin(0.5, 1)
              .setDepth(posY + 1);
            wall.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.5).setOffset(TILE_SIZE * 0.1, TILE_SIZE * 0.8);
            wall.setPipeline('Light2D');
          }
        }
      }
    }

    this.rooms.forEach((room) => {
      if (
        typeof room.getLeft !== "function" ||
        typeof room.getTop !== "function" ||
        typeof room.getRight !== "function" ||
        typeof room.getBottom !== "function"
      ) return;

      const centerX = Math.floor((room.getLeft() + room.getRight()) / 2);
      const centerY = Math.floor((room.getTop() + room.getBottom()) / 2);
      const posX = (centerX - centerY) * TILE_SIZE;
      const posY = (centerX + centerY) * (TILE_SIZE / 2);
      const marker = this.add.circle(posX, posY, 5, 0xff0000)
        .setOrigin(0.5, 0.5)
        .setDepth(posY + 10);
      marker.setPipeline('Light2D');
      this.roomMarkers.add(marker);
    });

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
      console.log(`Transitioning from room ${this.currentRoom.id} to room ${nextRoom.id}`);
      if (this.rooms[nextRoomId]) {
        this.rooms[nextRoomId].visited = true;
        this.currentRoom = this.rooms[nextRoomId];
        console.log(`Room ${nextRoomId} visited status: ${this.rooms[nextRoomId].visited}`);
      } else {
        console.warn(`Room with ID ${nextRoomId} not found in this.rooms`);
      }

      const roomCenterX = (nextRoom.getLeft() + nextRoom.getRight()) / 2;
      const roomCenterY = (nextRoom.getTop() + nextRoom.getBottom()) / 2;
      const playerX = (roomCenterX - roomCenterY) * TILE_SIZE;
      const playerY = (roomCenterX + roomCenterY) * (TILE_SIZE / 2);
      this.player.setPosition(playerX, playerY);

      this.renderRoom(nextRoom);
      this.updateCameraBounds();
      this.cameras.main.fadeIn(250);

      if (this.lightingMode === "perRoom") {
        this.updateRoomLighting(nextRoom);
      }
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
          this.dungeon[ny][nx] === 1 &&
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
              this.dungeon[tileY][tileX] === 0
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

  update() {
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

    if (this.spawnMarkerLight) {
      this.spawnMarkerLight.setPosition(this.player.x, this.player.y);
    }

    if (this.lightingMode === "perRoom") {
      this.updateRoomLighting(this.currentRoom);
    }

    this.updateFogOfWar();

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

      const particles = this.add.particles(this.player.x, this.player.y, "floor-placeholder", {
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