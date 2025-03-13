import Phaser from "phaser";
import { generateDungeon, findBestSpawnPoint, isValidSpawnLocation } from "../systems/procedural/DungeonGenerator.js";
import { WeaponManager } from "../systems/combat/WeaponManager.js";
import { EnemyManager } from "../systems/ai/EnemyManager.js";
import { EnvironmentManager } from "../systems/environment/EnvironmentManager.js";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "../utils/Constants.js";

// Main GameScene class
export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.lightingMode = "perRoom";
    this.spawnMarkerLight = null;
    this.playerLight = null;
    this.spawnPoint = null;

    // Asset flags
    this.usePlaceholderSprite = false;

    // Player and gameplay
    this.playerHealth = 100;
    this.items = [];
    this.weaponManager = null;
    this.noclipMode = false;
    this.lastShotTime = 0;
    this.shootCooldown = 200;

    // Managers
    this.enemyManager = null;
    this.environmentManager = null;

    // Constants
    this.TILE_SIZE = TILE_SIZE;
    this.hasLighting = false;
    this.maxLights = 50;
    this.lastEnemyUpdate = 0;
    this.enemyUpdateInterval = 100;
  }

  preload() {
    try {
      this.load.image("player-front", "/assets/player-front.png");
      this.load.image("player-back", "/assets/player-back.png");
      this.load.spritesheet("game-assets", "/assets/spritesheet.png", { frameWidth: 16, frameHeight: 16 });
      this.load.image("enemy-normal", "/assets/enemy-normal.png");
      this.load.image("enemy-fast", "/assets/enemy-fast.png");
      this.load.image("enemy-heavy", "/assets/enemy-heavy.png");
      this.load.image("enemy-marksman", "/assets/enemy-marksman.png");
    } catch (error) {
      console.error("Failed to load assets during initial attempt:", error);
      this.usePlaceholderSprite = true;
    }

    this.load.on("fileerror", (file) => {
      console.error(`Failed to load file: ${file.key}`, file);
      if (file.key.includes("player")) this.usePlaceholderSprite = true;
    });

    this.createPlaceholderGraphics();
  }

  createPlaceholderGraphics() {
    const enemyPlaceholderColors = {
      normal: 0x00ff00,   // Green
      fast: 0x0000ff,     // Blue
      heavy: 0xff0000,    // Red
      random: 0xffff00,   // Yellow
      marksman: 0xff00ff, // Magenta
    };

    Object.keys(enemyPlaceholderColors).forEach(type => {
      const enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      enemyGraphics.fillStyle(enemyPlaceholderColors[type], 1);
      enemyGraphics.fillRect(0, 0, 16, 16);
      enemyGraphics.lineStyle(1, 0x000000, 1);
      enemyGraphics.strokeRect(0, 0, 16, 16);
      enemyGraphics.generateTexture(`enemy-placeholder-${type}`, 16, 16);
      enemyGraphics.destroy();
    });

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

    const bulletGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    bulletGraphics.fillStyle(0xff0000, 1);
    bulletGraphics.fillRect(0, 0, 8, 8);
    bulletGraphics.lineStyle(1, 0x000000, 1);
    bulletGraphics.strokeRect(0, 0, 8, 8);
    bulletGraphics.generateTexture("bullet-placeholder", 8, 8);
    bulletGraphics.destroy();
  }

  create(data) {
    this.hasLighting = this.renderer && this.renderer.pipelines && !!this.renderer.pipelines.get('Light2D');
    console.log("Has Lighting:", this.hasLighting, "Pipelines:", this.renderer.pipelines);
    if (this.hasLighting) {
      this.lights.enable();
      this.lights.setAmbientColor(0x222222);
    } else {
      console.warn("Light2D pipeline not available or renderer not initialized. Disabling lighting.");
    }

    const seed = data?.seed || Math.floor(Math.random() * 1000000).toString();
    const { dungeon, rooms, doors, items, enemies } = generateDungeon(seed);
    this.dungeon = dungeon;
    this.rooms = Array.isArray(rooms) ? rooms : [];
    this.items = items;

    this.bullets = this.physics.add.group();
    this.enemyManager = new EnemyManager(this, MAP_WIDTH, MAP_HEIGHT);
    this.environmentManager = new EnvironmentManager(this);
    this.weaponManager = new WeaponManager(this);

    // Spawn enemies with increased population
    const firstRoom = this.rooms[0];
    const enemyTypes = ["normal", "fast", "heavy", "random", "marksman"];
    this.enemies = enemies.map(enemy => {
      const assignedType = enemy.type && enemyTypes.includes(enemy.type) ? enemy.type : enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const enemyRoom = this.rooms.find(room =>
        enemy.x >= room.getLeft() && enemy.x <= room.getRight() &&
        enemy.y >= room.getTop() && enemy.y <= room.getBottom()
      );
      if (enemyRoom === firstRoom) return null;
      const spawnedEnemy = this.enemyManager.spawnEnemy(enemy.x, enemy.y, assignedType);
      spawnedEnemy.setVisible(true);
      spawnedEnemy.setActive(true);
      return spawnedEnemy;
    }).filter(enemy => enemy !== null);

    // Ensure at least one enemy per room and increase population
    this.rooms.forEach(room => {
      if (room === firstRoom) return; // Skip starting room

      // Ensure at least one enemy per room
      let enemiesInRoom = this.enemies.filter(enemy => {
        const enemyTile = this.enemyManager.getEnemyTilePosition(enemy);
        return (
          enemyTile.x >= room.getLeft() && enemyTile.x <= room.getRight() &&
          enemyTile.y >= room.getTop() && enemyTile.y <= room.getBottom()
        );
      });

      if (enemiesInRoom.length === 0) {
        const x = Phaser.Math.Between(room.getLeft() + 1, room.getRight() - 1);
        const y = Phaser.Math.Between(room.getTop() + 1, room.getBottom() - 1);
        if (this.dungeon[y]?.[x] === 0) {
          const assignedType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
          const spawnedEnemy = this.enemyManager.spawnEnemy(x, y, assignedType);
          spawnedEnemy.setVisible(true);
          spawnedEnemy.setActive(true);
          this.enemies.push(spawnedEnemy);
        }
      }

      // Add extra enemies based on room size (increased population)
      const roomArea = (room.getRight() - room.getLeft()) * (room.getBottom() - room.getTop());
      const extraEnemies = Math.min(Math.floor(roomArea / 30), 4); // Increased from 2 to 4 max enemies
      for (let i = 0; i < extraEnemies; i++) {
        const x = Phaser.Math.Between(room.getLeft() + 1, room.getRight() - 1);
        const y = Phaser.Math.Between(room.getTop() + 1, room.getBottom() - 1);
        if (this.dungeon[y]?.[x] === 0) {
          const assignedType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
          const spawnedEnemy = this.enemyManager.spawnEnemy(x, y, assignedType);
          spawnedEnemy.setVisible(true);
          spawnedEnemy.setActive(true);
          this.enemies.push(spawnedEnemy);
        }
      }
    });

    this.floorTiles = this.add.group();
    this.wallTiles = this.physics.add.staticGroup();
    this.doorTiles = this.add.group();
    this.roomMarkers = this.add.group();

    this.currentRoom = this.rooms[0];
    (this.rooms || []).forEach(room => {
      room.hasTorch = false;
      room.visited = false;
    });

    this.renderRoom(this.currentRoom);

    (doors || []).forEach((door) => {
      if (typeof door.x === "undefined" || typeof door.y === "undefined") return;
      const posX = (door.x - door.y) * TILE_SIZE;
      const posY = (door.x + door.y) * (TILE_SIZE / 2);
      const doorSprite = this.doorTiles
        .create(posX, posY, "game-assets", 272)
        .setDisplaySize(TILE_SIZE / 2, TILE_SIZE / 2)
        .setOrigin(0.5, 1)
        .setDepth(posY);
      doorSprite.roomId = door.roomId;
      if (this.hasLighting) doorSprite.setPipeline('Light2D');
    });

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
    if (this.hasLighting) this.player.setPipeline('Light2D');

    if (this.hasLighting) {
      this.playerLight = this.lights.addLight(playerX, playerY, 50, 0xffff99, 0.9);
      this.spawnMarkerLight = this.lights.addLight(playerX, playerY, 100, 0xffffff, 0.8);
    }

    this.environmentManager.setupHallwayTorchPoints();
    this.environmentManager.identifyEnclosedSpaces();

    this.playerShadow = this.add
      .ellipse(playerX, playerY + 5, 24, 12, 0x000000, 0.3)
      .setOrigin(0.5, 0.5)
      .setDepth(playerY - 1);
    if (this.hasLighting) this.playerShadow.setPipeline('Light2D');

    this.keys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      C: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      F: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };

    this.input.on("pointerdown", (pointer) => {
      if (pointer.leftButtonDown()) {
        const currentTime = this.time.now;
        if (currentTime - this.lastShotTime < this.shootCooldown) return;
        this.weaponManager.fireBullet(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        this.lastShotTime = currentTime;
      }
    });

    this.physics.add.collider(this.player, this.wallTiles);
    this.physics.add.collider(this.enemyManager.getEnemies(), this.wallTiles);
    this.physics.add.collider(this.bullets, this.wallTiles, (bullet, wall) => {
      bullet.destroy();
    });
    this.physics.add.collider(this.enemyManager.getEnemies(), this.enemyManager.getEnemies());
    this.physics.add.overlap(this.player, this.doorTiles, this.handleDoorTransition, null, this);
    this.physics.add.overlap(this.bullets, this.enemyManager.getEnemies(), (bullet, enemy) => {
      this.enemyManager.handleBulletEnemyCollision(bullet, enemy);
    }, null, this);
    this.physics.add.overlap(this.player, this.enemyManager.getEnemies(), this.handlePlayerEnemyCollision, null, this);

    this.updateCameraBounds();

    this.scene.launch("HUDScene");
    this.registry.set('playerHealth', this.playerHealth);
    this.registry.set('noclipMode', this.noclipMode);
    this.registry.set('currentRoom', this.currentRoom);
    this.registry.set('hasLighting', this.hasLighting);
    this.registry.set('seed', seed);
  }

  handlePlayerEnemyCollision(player, enemy) {
    this.playerHealth -= 10 * this.game.loop.delta / 1000;
    this.playerHealth = Math.max(0, this.playerHealth);
    this.registry.set('playerHealth', this.playerHealth);
    this.registry.events.emit('updateHealth', this.playerHealth);
    if (this.playerHealth <= 0) {
      this.handlePlayerDeath();
    }
  }

  debugShoot() {
    const currentTime = this.time.now;
    if (currentTime - this.lastShotTime < this.shootCooldown) return;

    const pointer = this.input.activePointer;
    if (this.weaponManager && this.weaponManager.fireBullet) {
      this.weaponManager.fireBullet(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
      this.lastShotTime = currentTime;
    } else {
      console.error("WeaponManager or fireBullet is undefined!");
    }
  }

  renderRoom(room) {
    if (!room) return;

    (this.rooms || []).forEach(r => {
      if (r.minimapText) {
        r.minimapText.destroy();
        r.minimapText = null;
      }
    });

    this.floorTiles.clear(true, true);
    this.wallTiles.clear(true, true);
    this.doorTiles.clear(true, true);
    this.roomMarkers.clear(true, true);
    this.environmentManager.clearTorches();

    const left = 0, right = MAP_WIDTH - 1, top = 0, bottom = MAP_HEIGHT - 1;

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const posX = (x - y) * TILE_SIZE;
        const posY = (x + y) * (TILE_SIZE / 2);
        if (this.dungeon[y]?.[x] === 0) {
          const floorTile = this.add
            .sprite(posX, posY, "game-assets", 11)
            .setDisplaySize(TILE_SIZE, TILE_SIZE / 2)
            .setOrigin(0.5, 1)
            .setDepth(posY);
          if (this.hasLighting) floorTile.setPipeline('Light2D');
          this.floorTiles.add(floorTile);
        }
      }
    }

    (this.rooms || []).forEach((r) => {
      const centerX = (r.getLeft() + r.getRight()) / 2;
      const centerY = (r.getTop() + r.getBottom()) / 2;
      const markerPosX = (centerX - centerY) * TILE_SIZE;
      const markerPosY = (centerX + centerY) * (TILE_SIZE / 2);
      const marker = this.add.rectangle(markerPosX, markerPosY - 10, 10, 10, r.markerColor)
        .setOrigin(0.5, 0.5)
        .setDepth(markerPosY + 100);
      this.roomMarkers.add(marker);
    });

    (this.rooms || []).forEach((r) => this.environmentManager.spawnTorchesForRoom(r));
    this.environmentManager.spawnTorchesForEnclosedSpaces();
    this.environmentManager.spawnTorchesForHallways();

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (this.dungeon[y]?.[x] === 1) {
          let adjacentToFloor = false;
          for (let dy = -1; dy <= 1 && !adjacentToFloor; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && this.dungeon[ny]?.[nx] === 0) {
                adjacentToFloor = true;
                break;
              }
            }
            if (adjacentToFloor) break;
          }

          if (adjacentToFloor) {
            const posX = (x - y) * TILE_SIZE;
            const posY = (x + y) * (TILE_SIZE / 2);
            const wall = this.wallTiles
              .create(posX, posY - TILE_SIZE * 0.6, "game-assets", 168)
              .setDisplaySize(TILE_SIZE, TILE_SIZE * 1.2)
              .setOrigin(0.5, 1)
              .setDepth(posY + 1);
            wall.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.5).setOffset(TILE_SIZE * 0.1, TILE_SIZE * 0.8);
            if (this.hasLighting) wall.setPipeline('Light2D');
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

    this.registry.set('currentRoom', this.currentRoom);
    this.registry.events.emit('updateRoom', this.currentRoom);
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
          nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT &&
          this.dungeon[ny]?.[nx] === 1 && nx !== canvasBoundary.minX &&
          nx !== canvasBoundary.maxX && ny !== canvasBoundary.minY && ny !== canvasBoundary.maxY
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
            if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT && this.dungeon[tileY]?.[tileX] === 0) {
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
              const teleportText = this.add.text(this.player.x, this.player.y - 30, "Unstuck!", {
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
    let velocityX = 0, velocityY = 0;

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
      if (velocityY > 0) this.player.setTexture("player-front");
      else if (velocityY < 0) this.player.setTexture("player-back");
    }

    if (this.spawnMarkerLight) this.spawnMarkerLight.setPosition(this.player.x, this.player.y);
    if (this.playerLight) this.playerLight.setPosition(this.player.x, this.player.y);
    this.environmentManager.updateTorches(delta);

    if (time - this.lastEnemyUpdate >= this.enemyUpdateInterval) {
      this.enemyManager.updateEnemyAI(time);
      this.lastEnemyUpdate = time;
    }

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
      let dashX = isoVelocityX, dashY = isoVelocityY;
      if (dashX === 0 && dashY === 0) dashX = this.player.flipX ? -200 : 200;
      else {
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
      const particles = this.add.particles(this.player.x, this.player.y, "game-assets", 916, {
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
      this.registry.set('noclipMode', this.noclipMode);
      this.registry.events.emit('updateNoclip', this.noclipMode);
      this.physics.world.colliders.getActive().forEach((collider) => {
        if (collider.object1 === this.player || collider.object2 === this.player) {
          collider.active = !this.noclipMode;
        }
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
      this.debugShoot();
    }
  }

  handlePlayerDeath() {
    this.player.setVisible(false);
    this.player.body.setVelocity(0);
    this.scene.launch("GameOverScene", { x: this.player.x, y: this.player.y });
    this.scene.pause();
  }
}