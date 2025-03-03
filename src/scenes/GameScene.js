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
  }

  preload() {
    this.createPlaceholderGraphics();
  }

  createPlaceholderGraphics() {
    const floorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    floorGraphics.fillStyle(0x333333, 1);
    floorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE / 2);
    floorGraphics.generateTexture(
      "floor-placeholder",
      TILE_SIZE,
      TILE_SIZE / 2,
    );
    floorGraphics.destroy();

    const wallGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    wallGraphics.fillStyle(0x888888, 1);
    wallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE * 1.2);
    wallGraphics.fillStyle(0x777777, 1);
    wallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE * 0.3);
    wallGraphics.fillStyle(0x666666, 1);
    wallGraphics.fillRect(0, TILE_SIZE * 0.3, TILE_SIZE * 0.2, TILE_SIZE * 0.9);
    wallGraphics.fillRect(
      TILE_SIZE * 0.8,
      TILE_SIZE * 0.3,
      TILE_SIZE * 0.2,
      TILE_SIZE * 0.9,
    );
    wallGraphics.lineStyle(1, 0x555555, 0.5);
    wallGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE * 1.2);
    wallGraphics.generateTexture(
      "wall-placeholder",
      TILE_SIZE,
      TILE_SIZE * 1.2,
    );
    wallGraphics.destroy();

    const doorGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    doorGraphics.fillStyle(0x795548, 1);
    doorGraphics.fillRect(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.8);
    doorGraphics.fillStyle(0x5d4037, 1);
    doorGraphics.fillRect(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.1);
    doorGraphics.fillRect(0, 0, TILE_SIZE * 0.1, TILE_SIZE * 0.8);
    doorGraphics.fillRect(TILE_SIZE * 0.6, 0, TILE_SIZE * 0.1, TILE_SIZE * 0.8);
    doorGraphics.fillStyle(0xffd700, 1);
    doorGraphics.fillCircle(
      TILE_SIZE * 0.55,
      TILE_SIZE * 0.4,
      TILE_SIZE * 0.06,
    );
    doorGraphics.lineStyle(1, 0x3e2723, 0.8);
    doorGraphics.strokeRect(0, 0, TILE_SIZE * 0.7, TILE_SIZE * 0.8);
    doorGraphics.generateTexture(
      "door-placeholder",
      TILE_SIZE * 0.7,
      TILE_SIZE * 0.8,
    );
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
  }

  create() {
    const { dungeon, rooms, doors } = generateDungeon();

    this.dungeon = dungeon;
    this.rooms = rooms;
    this.floorTiles = this.add.group();
    this.wallTiles = this.physics.add.staticGroup();
    this.doorTiles = this.add.group();

    this.minimap = this.add.graphics();
    this.minimap.setDepth(1001);

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

    this.minimapCamera = this.cameras.add(
      window.innerWidth - 150,
      10,
      140,
      140,
    );
    this.minimapCamera.setBackgroundColor(0x000000);
    this.minimapCamera.setZoom(0.1);
    this.minimapCamera.setRoundPixels(true);
    this.minimapCamera.ignore(this.noclipText);
    this.minimapCamera.setBounds(window.innerWidth - 150, 10, 140, 140);

    this.currentRoom = rooms[0];
    this.renderRoom(this.currentRoom);

    if (doors && Array.isArray(doors)) {
      doors.forEach((door) => {
        if (
          door &&
          typeof door.x !== "undefined" &&
          typeof door.y !== "undefined"
        ) {
          const posX = (door.x - door.y) * TILE_SIZE;
          const posY = (door.x + door.y) * (TILE_SIZE / 2);
          this.doorTiles
            .create(posX, posY, "door-placeholder")
            .setDisplaySize(TILE_SIZE / 2, TILE_SIZE / 2)
            .setOrigin(0.5, 1)
            .setDepth(posY).roomId = door.roomId;
        }
      });
    }

    const spawnPoint = findBestSpawnPoint(this.dungeon, this.currentRoom);
    const playerX = (spawnPoint.x - spawnPoint.y) * TILE_SIZE;
    const playerY = (spawnPoint.x + spawnPoint.y) * (TILE_SIZE / 2);

    this.player = this.physics.add
      .sprite(playerX, playerY - 10, "player-placeholder")
      .setOrigin(0.5, 0.8);
    this.player.body.setCollideWorldBounds(false);
    this.player.body.setSize(16, 12);
    this.player.body.setOffset(6, 16);
    this.player.setDepth(1000);

    // Configurar el seguimiento del minimapa después de crear al jugador
    this.minimapCamera.startFollow(this.player, true, 0.1, 0.1);

    this.playerShadow = this.add
      .ellipse(0, 0, 24, 12, 0x000000, 0.3)
      .setOrigin(0.5, 0.5)
      .setDepth(this.player.y - 1);

    this.light = this.add
      .circle(playerX, playerY - 40, 180, 0xffffff)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0.6)
      .setDepth(1000);

    this.playerGlow = this.add
      .circle(playerX, playerY, 40, 0x3498db)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.1)
      .setDepth(playerY - 2);

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
    this.physics.add.overlap(
      this.player,
      this.doorTiles,
      this.handleDoorTransition,
      null,
      this,
    );

    this.add
      .text(10, 36, "Version 1.1: Placeholder Graphics", {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  renderRoom(room) {
    this.floorTiles.clear(true, true);
    this.wallTiles.clear(true, true);

    const margin = Math.max(ROOM_WIDTH, ROOM_HEIGHT) + 8;
    const left = Math.max(0, 0);
    const right = Math.min(MAP_WIDTH - 1, MAP_WIDTH - 1);
    const top = Math.max(0, 0);
    const bottom = Math.min(MAP_HEIGHT - 1, MAP_HEIGHT - 1);

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const posX = (x - y) * TILE_SIZE;
        const posY = (x + y) * (TILE_SIZE / 2);

        if (this.dungeon[y] && this.dungeon[y][x] === 0) {
          let existingTile = false;
          this.floorTiles.getChildren().forEach((tile) => {
            if (tile.x === posX && tile.y === posY) {
              existingTile = true;
            }
          });

          if (!existingTile) {
            const floorTile = this.add.sprite(posX, posY, "floor-placeholder");
            floorTile
              .setDisplaySize(TILE_SIZE, TILE_SIZE / 2)
              .setOrigin(0.5, 1)
              .setDepth(posY);
            this.floorTiles.add(floorTile);
          }
        }
      }
    }

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
            const wall = this.wallTiles.create(
              posX,
              posY - TILE_SIZE * 0.6,
              "wall-placeholder",
            );
            wall
              .setDisplaySize(TILE_SIZE, TILE_SIZE * 1.2)
              .setOrigin(0.5, 1)
              .setDepth(posY + 1);
            wall.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.5);
            wall.body.setOffset(TILE_SIZE * 0.1, TILE_SIZE * 0.8);
          }
        }
      }
    }

    this.wallTiles.refresh();
    this.updateMinimap();
  }

  updateMinimap() {
    if (!this.minimap) return;

    this.minimap.clear();
    const scale = 2;

    this.rooms.forEach((room) => {
      // Check if room methods exist before using them
      if (typeof room.getLeft !== 'function' || typeof room.getTop !== 'function' || 
          typeof room.getRight !== 'function' || typeof room.getBottom !== 'function') {
        return; // Skip this room if any required method is missing
      }
      
      const left = (room.getLeft() - room.getTop()) * scale;
      const top = (room.getTop() + room.getLeft()) * scale;
      const width = (room.getRight() - room.getLeft() + 1) * scale;
      const height = (room.getBottom() - room.getTop() + 1) * scale;

      this.minimap.fillStyle(
        room === this.currentRoom ? 0x00ff00 : 0x555555,
        0.5,
      );
      this.minimap.fillRect(left, top, width, height);
      this.minimap.lineStyle(1, 0xffffff, 0.8);
      this.minimap.strokeRect(left, top, width, height);
    });

    if (this.doorTiles && this.doorTiles.getChildren) {
      this.doorTiles.getChildren().forEach((door) => {
        if (door && typeof door.x !== 'undefined' && typeof door.y !== 'undefined') {
          const posX = (door.x - door.y) * scale;
          const posY = (door.x + door.y) * scale;
          this.minimap.fillStyle(0xffff00, 1);
          this.minimap.fillRect(posX, posY, scale, scale);
        }
      });
    }

    if (this.player && typeof this.player.x !== 'undefined' && typeof this.player.y !== 'undefined') {
      const playerPosX = (this.player.x / TILE_SIZE) * scale;
      const playerPosY = (this.player.y / (TILE_SIZE / 2)) * scale;
      this.minimap.fillStyle(0xff0000, 1);
      this.minimap.fillRect(playerPosX, playerPosY, scale, scale);
    }
  }

  updateCameraBounds() {
    const room = this.currentRoom;
    const margin = Math.max(MAP_WIDTH, MAP_HEIGHT) / 2;
    const left = (room.getLeft() - room.getTop() - margin) * TILE_SIZE;
    const right = (room.getRight() - room.getBottom() + margin) * TILE_SIZE;
    const top = (room.getLeft() + room.getTop() - margin) * (TILE_SIZE / 2);
    const bottom =
      (room.getRight() + room.getBottom() + margin) * (TILE_SIZE / 2);

    this.cameras.main.setBounds(left, top, right - left, bottom - top);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.followOffset.y = -20;
    this.cameras.main.shake(200, 0.003);

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
      this.currentRoom = nextRoom;

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
    for (let radius = 1; radius <= 10; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
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
    const tileX = Math.floor(
      (this.player.x / TILE_SIZE + this.player.y / (TILE_SIZE / 2)) / 2,
    );
    const tileY = Math.floor(
      (this.player.y / (TILE_SIZE / 2) - this.player.x / TILE_SIZE) / 2,
    );
    return { x: tileX, y: tileY };
  }

  update() {
    if (!this.player) return;

    const speed = 220;
    let velocityX = 0;
    let velocityY = 0;

    if (this.keys.W.isDown) {
      velocityY -= speed;
    }
    if (this.keys.S.isDown) {
      velocityY += speed;
    }
    if (this.keys.A.isDown) {
      velocityX -= speed;
    }
    if (this.keys.D.isDown) {
      velocityX += speed;
    }

    if (velocityX !== 0 && velocityY !== 0) {
      const magnitude = Math.sqrt(
        velocityX * velocityX + velocityY * velocityY,
      );
      velocityX = (velocityX / magnitude) * speed;
      velocityY = (velocityY / magnitude) * speed;
    }

    let isoVelocityX = (velocityX - velocityY) * 0.85;
    let isoVelocityY = (velocityX + velocityY) * 0.6;

    this.player.body.setVelocity(isoVelocityX, isoVelocityY);

    if (
      !this.noclipMode &&
      this.player.body.blocked.none &&
      this.player.body.velocity.lengthSq() < 10
    ) {
      const worldX = Math.floor(
        (this.player.x / TILE_SIZE + this.player.y / (TILE_SIZE / 2)) / 2,
      );
      const worldY = Math.floor(
        (this.player.y / (TILE_SIZE / 2) - this.player.x / TILE_SIZE) / 2,
      );
      if (
        worldX >= 0 &&
        worldX < MAP_WIDTH &&
        worldY >= 0 &&
        worldY < MAP_HEIGHT
      ) {
        if (!isValidSpawnLocation(this.dungeon, worldX, worldY)) {
          this.movePlayerToSafePosition();
        }
      }
    }

    if (this.player.alpha < 1) {
      this.player.alpha = 1;
    }

    if (velocityX === 0 && velocityY === 0) {
      this.player.body.setDrag(500);
    } else {
      this.player.body.setDrag(100);
    }

    if (velocityX < 0) {
      this.player.flipX = true;
    } else if (velocityX > 0) {
      this.player.flipX = false;
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 5);
    this.playerShadow.setDepth(this.player.y - 1);

    this.player.setDepth(this.player.y + 10);

    this.light.setPosition(this.player.x, this.player.y - 40);

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
        onUpdate: () => {
          this.playerShadow.setAlpha(0.1);
        },
        onComplete: () => {
          this.playerShadow.setAlpha(0.3);
          this.player.alpha = 1;
        },
      });

      const particles = this.add.particles(
        this.player.x,
        this.player.y,
        "floor-placeholder",
        {
          speed: 50,
          scale: { start: 0.2, end: 0 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 200,
          quantity: 5,
        },
      );

      this.time.delayedCall(300, () => {
        particles.destroy();
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.noclipMode = !this.noclipMode;
      this.noclipText.setText(`Noclip: ${this.noclipMode ? "ON" : "OFF"}`);
      this.physics.world.colliders.getActive().forEach((collider) => {
        if (
          collider.object1 === this.player ||
          collider.object2 === this.player
        ) {
          collider.active = !this.noclipMode;
        }
      });
    }

    this.wallTiles.getChildren().forEach((wall) => {
      wall.setAlpha(1);
    });
  }
}
