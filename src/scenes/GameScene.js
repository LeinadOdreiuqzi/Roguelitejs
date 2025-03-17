import Phaser from "phaser";
import { generateDungeon, findBestSpawnPoint, isValidSpawnLocation } from "../systems/procedural/DungeonGenerator.js";
import { WeaponManager } from "../systems/combat/WeaponManager.js";
import { EnemyManager } from "../systems/ai/EnemyManager.js";
import { EnvironmentManager } from "../systems/environment/EnvironmentManager.js";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "../utils/Constants.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.lightingMode = "perRoom";
    this.spawnMarkerLight = null;
    this.playerLight = null;
    this.spawnPoint = null;
    this.usePlaceholderSprite = false;
    this.playerHealth = 120;
    this.maxHealth = 120;
    this.playerSpeed = 200;
    this.playerLevel = 1;
    this.playerXP = 0;
    this.skillPoints = 0;
    this.items = [];
    this.hasEnchantedTotem = false;
    this.luck = 0;
    this.weaponManager = null;
    this.noclipMode = false;
    this.lastShotTime = 0;
    this.shootCooldown = 400;
    this.enemyManager = null;
    this.environmentManager = null;
    this.chests = null;
    this.droppedItems = null;
    this.TILE_SIZE = TILE_SIZE;
    this.hasLighting = false;
    this.maxLights = 50;
    this.lastEnemyUpdate = 0;
    this.enemyUpdateInterval = 100;
    this.chestPromptText = null;
    this.damageReduction = 0;
    this.deflectChance = 0;
    this.regenOnKill = 0;
    this.cloneChance = 0;
    this.invulnerable = false;
    this.blockNextHit = false;
    this.shockwaveOnDamage = null;
    this.shieldValue = 0;
    this.shieldOnKillDuration = 0;
    this.areaEffectRadius = 0;
    this.weaponManager = new WeaponManager(this, this.getShotStats());
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
      this.load.image("chest", "/assets/chest.png");
    } catch (error) {
      console.error("Asset loading error:", error);
      this.usePlaceholderSprite = true;
    }

    this.load.on("fileerror", (file) => {
      console.error("File loading failed:", file.key, file);
      if (file.key.includes("player") || file.key.includes("chest")) this.usePlaceholderSprite = true;
    });

    this.createPlaceholderGraphics();
    this.createItemIcons();
  }

  createPlaceholderGraphics() {
    const enemyPlaceholderColors = {
      normal: 0x00ff00,
      fast: 0x0000ff,
      heavy: 0xff0000,
      random: 0xffff00,
      marksman: 0xff00ff,
      boss: 0x800080,
    };

    Object.keys(enemyPlaceholderColors).forEach(type => {
      const enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      enemyGraphics.fillStyle(enemyPlaceholderColors[type], 1);
      const width = type === "boss" ? 48 : type === "heavy" ? 32 : 16;
      const height = type === "boss" ? 48 : type === "heavy" ? 32 : 16;
      enemyGraphics.fillRect(0, 0, width, height);
      enemyGraphics.lineStyle(1, 0x000000, 1);
      enemyGraphics.strokeRect(0, 0, width, height);
      enemyGraphics.generateTexture(`enemy-placeholder-${type}`, width, height);
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

    const chestGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    chestGraphics.fillStyle(0x8B4513, 1);
    chestGraphics.fillRect(4, 8, 24, 16);
    chestGraphics.lineStyle(2, 0x000000, 1);
    chestGraphics.strokeRect(4, 8, 24, 16);
    chestGraphics.fillStyle(0xFFD700, 1);
    chestGraphics.fillRect(6, 6, 20, 2);
    chestGraphics.strokeRect(6, 6, 20, 2);
    chestGraphics.fillStyle(0xA9A9A9, 1);
    chestGraphics.fillRect(14, 16, 4, 6);
    chestGraphics.strokeRect(14, 16, 4, 6);
    chestGraphics.generateTexture("chest-placeholder", 32, 32);
    chestGraphics.destroy();
  }

  createItemIcons() {
    const rapidFireGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    rapidFireGraphics.fillStyle(0x00BFFF, 1);
    rapidFireGraphics.fillRect(8, 8, 16, 16);
    rapidFireGraphics.lineStyle(2, 0x000000, 1);
    rapidFireGraphics.strokeRect(8, 8, 16, 16);
    rapidFireGraphics.fillStyle(0xff0000, 1);
    rapidFireGraphics.fillCircle(16, 16, 4);
    rapidFireGraphics.generateTexture("rapidFireIcon", 32, 32);
    rapidFireGraphics.destroy();

    const nimbleHandsGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    nimbleHandsGraphics.fillStyle(0x00BFFF, 1);
    nimbleHandsGraphics.fillCircle(16, 16, 12);
    nimbleHandsGraphics.lineStyle(2, 0x000000, 1);
    nimbleHandsGraphics.strokeCircle(16, 16, 12);
    nimbleHandsGraphics.generateTexture("nimbleHandsIcon", 32, 32);
    nimbleHandsGraphics.destroy();

    const bootsGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    bootsGraphics.fillStyle(0x00BFFF, 1);
    bootsGraphics.fillRect(8, 12, 8, 16);
    bootsGraphics.fillRect(16, 12, 8, 16);
    bootsGraphics.lineStyle(2, 0x000000, 1);
    bootsGraphics.strokeRect(8, 12, 8, 16);
    bootsGraphics.strokeRect(16, 12, 8, 16);
    bootsGraphics.generateTexture("bootsIcon", 32, 32);
    bootsGraphics.destroy();

    const spikesGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    spikesGraphics.fillStyle(0x00BFFF, 1);
    spikesGraphics.fillTriangle(8, 24, 16, 8, 24, 24);
    spikesGraphics.lineStyle(2, 0x000000, 1);
    spikesGraphics.strokeTriangle(8, 24, 16, 8, 24, 24);
    spikesGraphics.generateTexture("spikesIcon", 32, 32);
    spikesGraphics.destroy();
  }

  create(data) {
    this.hasLighting = this.renderer && this.renderer.pipelines && !!this.renderer.pipelines.get('Light2D');
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

    if (this.rooms.length < 2) {
      console.warn("Dungeon generated with less than 2 rooms. Forcing generation of at least 2 rooms.");
      const fallbackDungeon = generateDungeon(seed + "fallback");
      this.rooms = Array.isArray(fallbackDungeon.rooms) ? fallbackDungeon.rooms : [];
      this.dungeon = fallbackDungeon.dungeon;
      if (this.rooms.length < 2) {
        console.error("Unable to generate dungeon with at least 2 rooms. Boss spawn may fail.");
      }
    }

    this.items = items;

    this.bullets = this.physics.add.group();
    this.enemyManager = new EnemyManager(this, MAP_WIDTH, MAP_HEIGHT);
    this.environmentManager = new EnvironmentManager(this);
    this.weaponManager = new WeaponManager(this, this.getShotStats());
    this.chests = this.physics.add.group();
    this.droppedItems = this.physics.add.group();

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

    let largestRoom = null;
    let maxArea = 0;
    for (let i = 1; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const area = room.width * room.height;
      if (area > maxArea) {
        maxArea = area;
        largestRoom = room;
      }
    }
    if (!largestRoom) {
      console.warn("No suitable room found for boss spawn. Defaulting to second room if available.");
      largestRoom = this.rooms[1] || this.rooms[0];
    }
    const bossX = (largestRoom.getLeft() + largestRoom.getRight()) / 2;
    const bossY = (largestRoom.getTop() + largestRoom.getBottom()) / 2;
    const boss = this.enemyManager.spawnEnemy(bossX, bossY, "boss");
    boss.setVisible(true);
    boss.setActive(true);
    this.enemies.push(boss);

    console.log("Attempting to spawn debug chest in first room...");
    this.spawnChest(firstRoom, true);

    this.rooms.forEach(room => {
      if (room === firstRoom) return;

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

      const roomArea = (room.getRight() - room.getLeft()) * (room.getBottom() - room.getTop());
      const extraEnemies = Math.min(Math.floor(roomArea / 30), 4);
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

      console.log(`Rolling for chest spawn in room ${room.id}...`);
      if (Phaser.Math.Between(0, 99) < 50) {
        console.log(`Chest spawn triggered for room ${room.id}`);
        this.spawnChest(room);
      } else {
        console.log(`No chest spawned in room ${room.id}`);
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
      E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      O: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O),
      P: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P)
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
    this.physics.add.overlap(this.bullets, this.enemyManager.enemies, this.handleBulletEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.enemyManager.getEnemies(), this.handlePlayerEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.chests, this.handleChestInteraction, null, this);
    this.physics.add.overlap(this.player, this.droppedItems, this.handleDroppedItemPickup, null, this);

    this.events.on('update', (time, delta) => {
      this.chests.getChildren().forEach(chest => {
        const light = chest.getData("light");
        if (light) {
          light.setPosition(chest.x, chest.y);
        }
      });

      this.droppedItems.getChildren().forEach(item => {
        const light = item.getData("light");
        if (light) light.setPosition(item.x, item.y);
      });

      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        const playerTile = this.getPlayerTilePosition();
        const nearbyChest = this.chests.getChildren().find(chest => {
          const chestTile = this.getChestTilePosition(chest);
          return Math.abs(chestTile.x - playerTile.x) <= 1 && Math.abs(chestTile.y - playerTile.y) <= 1;
        });
        if (nearbyChest && !nearbyChest.getData("opened")) {
          if (this.scene.isActive()) {
            this.scene.launch("ChestScene", { chest: nearbyChest });
            this.scene.pause();
          }
        }
      }

      this.updateChestPrompt();
    });

    this.updateCameraBounds();

    this.scene.launch("HUDScene");
    this.registry.set('playerHealth', this.playerHealth);
    this.registry.set('maxHealth', this.maxHealth);
    this.registry.set('noclipMode', this.noclipMode);
    this.registry.set('currentRoom', this.currentRoom);
    this.registry.set('hasLighting', this.hasLighting);
    this.registry.set('seed', seed);
    this.registry.set('playerLevel', this.playerLevel);
    this.registry.set('playerXP', this.playerXP);
    this.registry.set('skillPoints', this.skillPoints);

    this.registry.events.on("applySkill", (skillData) => this.applySkill(skillData));

    this.scene.launch("SkillMenuScene", { isInitial: true });
  }

  findValidSpawnPosition(room) {
    const maxAttempts = 50;
    let attempts = 0;
    let x, y;

    while (attempts < maxAttempts) {
      x = Phaser.Math.Between(room.getLeft() + 1, room.getRight() - 1);
      y = Phaser.Math.Between(room.getTop() + 1, room.getBottom() - 1);
      if (this.dungeon[y]?.[x] === 0) {
        return { x, y };
      }
      attempts++;
    }

    for (let y = room.getTop(); y <= room.getBottom(); y++) {
      for (let x = room.getLeft(); x <= room.getRight(); x++) {
        if (this.dungeon[y]?.[x] === 0) {
          return { x, y };
        }
      }
    }

    console.error(`No valid spawn position found in room ${room.id}`);
    return null;
  }

  spawnChest(room, isDebug = false) {
    if (!room) {
      console.error("Cannot spawn chest: Room is undefined");
      return;
    }

    let x, y;
    if (isDebug) {
      x = Math.floor((room.getLeft() + room.getRight()) / 2);
      y = Math.floor((room.getTop() + room.getBottom()) / 2);
      if (this.dungeon[y]?.[x] !== 0) {
        console.warn(`Debug chest center position (${x}, ${y}) is invalid in room ${room.id}. Finding alternative...`);
        const pos = this.findValidSpawnPosition(room);
        if (!pos) return;
        x = pos.x;
        y = pos.y;
      }
    } else {
      const pos = this.findValidSpawnPosition(room);
      if (!pos) return;
      x = pos.x;
      y = pos.y;
    }

    const posX = (x - y) * TILE_SIZE;
    const posY = (x + y) * (TILE_SIZE / 2);
    const chestSpriteKey = this.usePlaceholderSprite ? "chest-placeholder" : "chest";
    const chest = this.chests.create(posX, posY, chestSpriteKey)
      .setInteractive()
      .setDepth(posY)
      .setOrigin(0.5, 0.5)
      .setVisible(true);

    const itemCount = Phaser.Math.Between(1, 3);
    chest.setData("itemCount", itemCount);
    console.log(`Chest spawned at (${posX}, ${posY}) in room ${room.id}, isDebug: ${isDebug}, using sprite: ${chestSpriteKey}, items: ${itemCount}`);

    if (this.hasLighting) {
      chest.setPipeline('Light2D');
      const chestLight = this.lights.addLight(posX, posY, 40, 0xffd700, 0.6);
      chest.setData("light", chestLight);
    }
    chest.setData("opened", false);
  }

  getChestTilePosition(chest) {
    const tileX = Math.floor((chest.x / TILE_SIZE + chest.y / (TILE_SIZE / 2)) / 2);
    const tileY = Math.floor((chest.y / (TILE_SIZE / 2) - chest.x / TILE_SIZE) / 2);
    return { x: tileX, y: tileY };
  }

  applySkill(skillData) {
    if (!skillData || typeof skillData.type !== "string") {
      console.warn("Invalid skill data provided:", skillData);
      return;
    }
    const weaponRelatedSkills = [
      "damage", "cooldown", "pierce", "projectileCount", "chainShot", "bounce", "explosion",
      "grenade", "mine", "largeProjectile", "missile", "shockwaveOnDamage", "chainExplosion",
      "skyExplosion", "fireTrail", "areaExplosion", "multiExplosion", "deflect", "explosionOnCritical",
      "laser", "energyExplosion", "meteorBarrage", "damageBoost", "explosiveProjectiles", "areaEffect", "randomEffect"
    ];
    if (weaponRelatedSkills.includes(skillData.type)) {
      this.weaponManager.applySkillEffect(skillData);
      return;
    }
    switch (skillData.type) {
      case "speed":
        this.playerSpeed *= (1 + skillData.value);
        console.log(`Applied skill: Speed increased to ${this.playerSpeed}`);
        break;
      case "health":
        this.maxHealth += skillData.value;
        this.playerHealth = this.maxHealth;
        this.registry.set('playerHealth', this.playerHealth);
        this.registry.set('maxHealth', this.maxHealth);
        this.registry.events.emit('updateHealth', this.playerHealth);
        console.log(`Applied skill: Health increased to ${this.maxHealth}`);
        break;
      case "dash":
        break;
      case "damageReduction":
        this.damageReduction = (this.damageReduction || 0) + skillData.value;
        console.log(`Applied skill: Damage reduction increased to ${this.damageReduction}`);
        break;
      case "shield":
        this.enableShield(skillData.interval, skillData.value);
        console.log(`Applied skill: Shield enabled with interval ${skillData.interval} and value ${skillData.value}`);
        break;
      case "regen":
        this.startRegeneration(skillData.value);
        console.log(`Applied skill: Regeneration enabled with value ${skillData.value}`);
        break;
      case "survive":
        this.hasEnchantedTotem = true;
        console.log(`Applied skill: Survive enabled`);
        break;
      case "deflect":
        this.deflectChance = (this.deflectChance || 0) + skillData.chance;
        console.log(`Applied skill: Deflect chance increased to ${this.deflectChance}`);
        break;
      case "shieldOnKill":
        this.enableShieldOnKill(skillData.duration);
        console.log(`Applied skill: Shield on kill enabled with duration ${skillData.duration}`);
        break;
      case "regenOnKill":
        this.regenOnKill = (this.regenOnKill || 0) + skillData.value;
        console.log(`Applied skill: Regen on kill increased to ${this.regenOnKill}`);
        break;
      case "blockNextHit":
        this.enableBlockNextHit(skillData.interval);
        console.log(`Applied skill: Block next hit enabled with interval ${skillData.interval}`);
        break;
      case "slowEnemies":
        this.enemyManager.slowEnemies(skillData.value);
        console.log(`Applied skill: Slow enemies by ${skillData.value}`);
        break;
      case "speedBoost":
        this.enableSpeedBoost(skillData.value, skillData.duration, skillData.interval);
        console.log(`Applied skill: Speed boost enabled with value ${skillData.value}, duration ${skillData.duration}, interval ${skillData.interval}`);
        break;
      case "teleport":
        this.enableTeleport(skillData.interval);
        console.log(`Applied skill: Teleport enabled with interval ${skillData.interval}`);
        break;
      case "clone":
        this.enableClone(skillData.chance);
        console.log(`Applied skill: Clone enabled with chance ${skillData.chance}`);
        break;
      case "invulnerability":
        this.enableInvulnerability(skillData.duration, skillData.interval);
        console.log(`Applied skill: Invulnerability enabled with duration ${skillData.duration}, interval ${skillData.interval}`);
        break;
      case "multiEffect":
        this.shootCooldown = Math.max(100, this.shootCooldown * (1 - skillData.shootCooldown));
        this.weaponManager.stats.shootCooldown = this.shootCooldown;
        this.hasEnchantedTotem = skillData.secondLife;
        console.log(`Applied skill: Multi-effect (cooldown ${this.shootCooldown}, second life ${skillData.secondLife})`);
        break;
      default:
        console.warn(`Unknown skill type: ${skillData.type}`);
    }
  }

  applyItemEffect(item) {
    if (!item || typeof item !== "object" || !item.id || typeof item.id !== "string") {
      console.warn("Invalid item provided (missing or invalid id):", item);
      return;
    }
    switch (item.id) {
      case "dumbBullets":
        this.weaponManager.enableDumbBullets();
        console.log("Applied Dumb Bullets: 10% chance to slow enemies on hit");
        break;
      case "rapidCharge":
      case "rapidFire":
        this.shootCooldown *= 0.8;
        this.weaponManager.stats.shootCooldown = this.shootCooldown;
        console.log(`Applied Rapid Charge/Fire: Shoot cooldown reduced to ${this.shootCooldown}`);
        break;
      case "nimbleHands":
        this.shootCooldown *= 0.9;
        this.weaponManager.stats.shootCooldown = this.shootCooldown;
        console.log(`Applied Nimble Hands: Shoot cooldown reduced to ${this.shootCooldown}`);
        break;
      case "boots":
        this.playerSpeed *= 1.1;
        console.log(`Applied Boots: Speed increased to ${this.playerSpeed}`);
        break;
      case "spikes":
        this.scene.physics.add.overlap(this.player, this.enemyManager.getEnemies(), (player, enemy) => {
          const enemyData = enemy.getData("enemyData");
          enemyData.health -= 5;
          if (enemyData.health <= 0) enemy.destroy();
        });
        console.log("Applied Spikes: Deal damage to enemies on contact");
        break;
      case "regeneration":
        this.startRegeneration(0.2);
        console.log("Applied Regeneration: +24 health over 8 seconds");
        break;
      case "vResistance":
        this.damageReduction = (this.damageReduction || 0) + 0.1;
        console.log("Applied V Resistance: Damage taken reduced by 10%");
        break;
      case "projectileTaming":
        this.weaponManager.enableProjectileTaming();
        console.log("Applied Projectile Taming: Bullets adjust toward enemies");
        break;
      default:
        if (item.effect && typeof item.effect === "object" && item.effect.type) {
          this.applySkill(item.effect);
        } else {
          console.warn(`Item ${item.id} has no valid effect:`, item.effect);
        }
    }
  }

  startRegeneration(value = 0.03) { // Default value adjusted to match skill system
    const totalHealth = value * this.maxHealth;
    const duration = 8000;
    const tickRate = 1000;
    const ticks = duration / tickRate;
    const healthPerTick = totalHealth / ticks;

    this.time.addEvent({
      delay: tickRate,
      repeat: ticks - 1,
      callback: () => {
        this.playerHealth = Math.min(this.maxHealth, this.playerHealth + healthPerTick);
        this.registry.set('playerHealth', this.playerHealth);
        this.registry.events.emit('updateHealth', this.playerHealth);
        console.log(`Regeneration tick: +${healthPerTick.toFixed(2)} HP, current health: ${this.playerHealth}`);
      },
    });
  }

  enableShockwaveOnDamage(radius) {
    this.shockwaveOnDamage = { radius };
    // Implement logic in handlePlayerEnemyCollision to emit a shockwave when damaged
  }

  enableShield(interval, value) {
    this.shieldValue = value;
    this.time.addEvent({
      delay: interval * 1000,
      loop: true,
      callback: () => {
        this.playerHealth = Math.min(this.maxHealth, this.playerHealth + this.shieldValue);
        this.registry.set('playerHealth', this.playerHealth);
        this.registry.events.emit('updateHealth', this.playerHealth);
      },
    });
  }

  enableShieldOnKill(duration) {
    this.shieldOnKillDuration = duration;
    // Implement logic in enemy death handling to apply shield
  }

  enableBlockNextHit(interval) {
    this.blockNextHit = true;
    this.time.addEvent({
      delay: interval * 1000,
      loop: true,
      callback: () => this.blockNextHit = true,
    });
    // Implement logic in handlePlayerEnemyCollision to block damage if this.blockNextHit is true
  }

  enableSpeedBoost(value, duration, interval) {
    const applyBoost = () => {
      this.playerSpeed *= (1 + value);
      this.time.delayedCall(duration * 1000, () => {
        this.playerSpeed /= (1 + value);
      });
    };
    applyBoost();
    this.time.addEvent({
      delay: interval * 1000,
      loop: true,
      callback: applyBoost,
    });
  }

  enableRandomEffect(interval) {
    const effects = ["damage", "speed", "cooldown"];
    this.time.addEvent({
      delay: interval * 1000,
      loop: true,
      callback: () => {
        const effect = Phaser.Utils.Array.GetRandom(effects);
        this.applySkill({ type: effect, value: 0.1 });
      },
    });
  }

  enableTeleport(interval) {
    this.time.addEvent({
      delay: interval * 1000,
      loop: true,
      callback: () => {
        const room = this.currentRoom;
        const pos = this.findValidSpawnPosition(room);
        if (pos) {
          const posX = (pos.x - pos.y) * TILE_SIZE;
          const posY = (pos.x + pos.y) * (TILE_SIZE / 2);
          this.player.setPosition(posX, posY - 10);
        }
      },
    });
  }

  enableClone(chance) {
    this.cloneChance = chance;
    // Implement logic in update to occasionally spawn a clone of the player
  }

  enableAreaEffect(radius) {
    this.areaEffectRadius = radius;
    // Implement logic in update to apply effects to enemies within radius
  }

  enableInvulnerability(duration, interval) {
    const applyInvulnerability = () => {
      this.invulnerable = true;
      this.time.delayedCall(duration * 1000, () => {
        this.invulnerable = false;
      });
    };
    applyInvulnerability();
    this.time.addEvent({
      delay: interval * 1000,
      loop: true,
      callback: applyInvulnerability,
    });
    // Use this.invulnerable in handlePlayerEnemyCollision to prevent damage
  }

  handlePlayerEnemyCollision(player, enemy) {
    if (this.invulnerable || this.blockNextHit) {
      this.blockNextHit = false;
      return;
    }

    const enemyData = enemy.getData("enemyData");
    if (!enemyData) {
      console.warn("Enemy missing enemyData:", enemy);
      return;
    }

    // Use enemy-specific damage instead of hardcoded baseDamage
    const baseDamage = (enemyData.hasRangedAttack ? 0 : enemyData.damage) * this.game.loop.delta / 1000;
    const damageReduction = this.damageReduction || 0;
    const reducedDamage = baseDamage * (1 - damageReduction);

    // Apply shield if active
    let remainingDamage = reducedDamage;
    if (this.shieldValue > 0) {
      const shieldAbsorbed = Math.min(this.shieldValue, remainingDamage);
      this.shieldValue -= shieldAbsorbed;
      remainingDamage -= shieldAbsorbed;
      console.log(`Shield absorbed ${shieldAbsorbed} damage. Remaining shield: ${this.shieldValue}`);
    }

    this.playerHealth -= remainingDamage;
    this.playerHealth = Math.max(0, this.playerHealth);
    this.registry.set('playerHealth', this.playerHealth);
    this.registry.events.emit('updateHealth', this.playerHealth);

    if (this.shockwaveOnDamage) {
      const explosion = this.add.circle(player.x, player.y, this.shockwaveOnDamage.radius, 0xff0000, 0.5)
        .setDepth(player.y);
      this.tweens.add({
        targets: explosion,
        alpha: 0,
        duration: 500,
        onComplete: () => explosion.destroy(),
      });
      this.physics.add.overlap(explosion, this.enemyManager.getEnemies(), (explosion, enemy) => {
        const enemyData = enemy.getData('enemyData');
        enemyData.health -= 10; // Example damage
        this.enemyManager.updateHealthBar(enemy);
        if (enemyData.health <= 0) {
          this.handleEnemyDeath(enemy);
        }
      });
      console.log(`Shockwave triggered with radius ${this.shockwaveOnDamage.radius}`);
    }

    if (this.playerHealth <= 0) {
      this.handlePlayerDeath();
    }
  }

  handleBulletEnemyCollision(bullet, enemySprite) {
    const enemyData = enemySprite.getData("enemyData");
    if (!enemyData) {
      bullet.destroy();
      return;
    }

    // Delegate damage calculation to WeaponManager
    this.weaponManager.handleBulletEnemyCollision(bullet, enemySprite);

    // Ensure health bar exists and is visible on damage
    if (!enemySprite.healthBar) {
      this.enemyManager.createHealthBar(enemySprite, enemyData.type); // Create health bar if missing
    }
    if (enemySprite.healthBar) {
      enemySprite.healthBar.setVisible(true); // Show on damage
      enemyData.lastDamageTime = this.time.now; // Update last damage time
      enemySprite.setData("enemyData", enemyData);
    }

    this.addXP(1);

    if (enemyData.health <= 0) {
      this.handleEnemyDeath(enemySprite);
      const isBoss = enemyData.type === "boss";
      if (isBoss || Phaser.Math.Between(0, 99) < 50) {
        const enemyTile = this.enemyManager.getEnemyTilePosition(enemySprite);
        const room = this.rooms.find(room =>
          enemyTile.x >= room.getLeft() && enemyTile.x <= room.getRight() &&
          enemyTile.y >= room.getTop() && enemyTile.y <= room.getBottom()
        );
        if (room && room !== this.rooms[0]) {
          console.log(`Enemy drop triggered chest spawn in room ${room.id}`);
          this.spawnChest(room);
        } else {
          console.warn(`Could not find valid room for enemy drop chest spawn at tile (${enemyTile.x}, ${enemyTile.y})`);
        }
      }
    }
  }

  handleEnemyDeath(enemy) {
    const enemyData = enemy.getData("enemyData");
    if (!enemyData) return;

    // Award XP
    this.playerXP += enemyData.xpValue;
    this.registry.set('playerXP', this.playerXP);
    console.log(`Player gained ${enemyData.xpValue} XP. Total XP: ${this.playerXP}`);

    // Check for level up
    const xpForNextLevel = this.playerLevel * 100; // Example XP threshold
    if (this.playerXP >= xpForNextLevel) {
      this.levelUp();
    }

    // Apply shield on kill
    if (this.shieldOnKillDuration > 0) {
      this.shieldValue = Math.max(this.shieldValue, 10); // Example shield value
      this.time.delayedCall(this.shieldOnKillDuration * 1000, () => {
        this.shieldValue = Math.max(0, this.shieldValue - 10);
      });
      console.log(`Shield on kill applied. Shield value: ${this.shieldValue}`);
    }

    // Apply regen on kill
    if (this.regenOnKill > 0) {
      this.playerHealth = Math.min(this.maxHealth, this.playerHealth + this.regenOnKill);
      this.registry.set('playerHealth', this.playerHealth);
      this.registry.events.emit('updateHealth', this.playerHealth);
      console.log(`Regen on kill: +${this.regenOnKill} HP. Current health: ${this.playerHealth}`);
    }

    // Chain kill tracking
    const currentTime = this.time.now;
    if (currentTime - this.lastKillTime < 2000) { // 2-second window for chain kill
      this.chainKillCount++;
    } else {
      this.chainKillCount = 1;
    }
    this.lastKillTime = currentTime;

    if (enemy.healthBar) enemy.healthBar.destroy();
    enemy.destroy();
    console.log("Enemy destroyed");
  }

  levelUp() {
    this.playerLevel += 1;
    this.maxHealth += 10;
    this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 10);
    this.playerSpeed += 5;
    this.weaponManager.stats.damage += 0.1;
    this.shootCooldown = Math.max(100, this.shootCooldown - 5);
    this.weaponManager.stats.shootCooldown = this.shootCooldown;
    this.weaponManager.stats.velocity += 5;

    this.registry.set('playerLevel', this.playerLevel);
    this.registry.set('playerHealth', this.playerHealth);
    this.registry.set('maxHealth', this.maxHealth);
    this.registry.set('playerXP', this.playerXP);
    this.registry.events.emit('levelChanged', this.playerLevel);
    this.registry.events.emit('updateHealth', this.playerHealth);

    if (this.playerLevel % 5 === 0) {
      this.scene.launch("SkillMenuScene", { level: this.playerLevel });
    }

    const newStats = this.getShotStats();
    this.weaponManager.updateShotStats(newStats);
  }

  debugShoot() {
    const currentTime = this.time.now;
    if (currentTime - this.lastShotTime < this.shootCooldown) return;

    const pointer = this.input.activePointer;
    if (this.weaponManager && this.weaponManager.fireBullet) {
      this.weaponManager.fireBullet(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
      this.lastShotTime = currentTime;
    }
  }

  renderRoom(room) {
    if (!room) return;

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

    this.rooms.forEach((r) => {
      const centerX = (r.getLeft() + r.getRight()) / 2;
      const centerY = (r.getTop() + r.getBottom()) / 2;
      const markerPosX = (centerX - centerY) * TILE_SIZE;
      const markerPosY = (centerX + centerY) * (TILE_SIZE / 2);
      const marker = this.add.rectangle(markerPosX, markerPosY - 10, 10, 10, r.markerColor)
        .setOrigin(0.5, 0.5)
        .setDepth(markerPosY + 100);
      this.roomMarkers.add(marker);
    });

    this.rooms.forEach((r) => this.environmentManager.spawnTorchesForRoom(r));
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
              }).setDepth(1001);
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

  getShotStats() {
    const velocity = 300 + (this.playerLevel - 1) * 20;
    const damage = 1 + (this.playerLevel - 1) * 0.2;
    this.shootCooldown = Math.max(100, 400 - (this.playerLevel - 1) * 20);
    return { velocity, damage, shootCooldown: this.shootCooldown };
  }

  getXPForNextLevel() {
    const baseXP = 50;
    const scalingFactor = 1.2;
    return Math.round(baseXP * Math.pow(scalingFactor, this.playerLevel - 1));
  }

  addXP(amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      return;
    }

    this.playerXP += amount;

    const xpText = this.add.text(this.player.x, this.player.y - 40, `+${amount} XP`, {
      fontSize: "14px",
      color: "#00ff00",
      stroke: "#000000",
      strokeThickness: 3,
    }).setDepth(1001);
    this.tweens.add({
      targets: xpText,
      alpha: 0,
      y: xpText.y - 20,
      duration: 1000,
      onComplete: () => xpText.destroy(),
    });

    this.registry.set('playerXP', this.playerXP);
    this.registry.events.emit('xpChanged', this.playerXP);

    let xpNeeded = this.getXPForNextLevel();
    while (this.playerXP >= xpNeeded && this.playerLevel < 10) {
      this.playerXP -= xpNeeded;
      this.levelUp();
      xpNeeded = this.getXPForNextLevel();
      this.registry.set('playerXP', this.playerXP);
      this.registry.events.emit('xpChanged', this.playerXP);
    }
  }

  update(time, delta) {
    if (!this.player) return;

    const speed = this.playerSpeed;
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

    // Update enemy health bars every frame for smooth tracking
    this.enemyManager.enemies.getChildren().forEach(enemySprite => {
      if (!enemySprite.active || !enemySprite.healthBar) return;

      const enemyData = enemySprite.getData("enemyData");
      if (!enemyData) return;

      // Update health bar position and visibility every frame
      this.enemyManager.updateHealthBar(enemySprite);

      // Manage visibility timeout (moved here for consistency)
      if (enemyData.lastDamageTime > 0) {
        const timeSinceDamage = time - enemyData.lastDamageTime;
        if (timeSinceDamage > this.enemyManager.healthBarHideTimeout && enemyData.type !== "boss") {
          enemySprite.healthBar.setVisible(false);
          enemyData.lastDamageTime = 0; // Reset timeout
          enemySprite.setData("enemyData", enemyData);
        }
      }

      // Ensure boss health bars remain visible
      if (enemyData.type === "boss") {
        enemySprite.healthBar.setVisible(true);
      }
    });

    if (Phaser.Input.Keyboard.JustDown(this.keys.P)) {
      if (!this.scene.isActive("DebugScene")) {
        this.scene.launch("DebugScene");
      }
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
        dashX = (dashX / magnitude) * (400 + (this.playerLevel * 10));
        dashY = (dashY / magnitude) * (400 + (this.playerLevel * 10));
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

    const stats = this.getShotStats();
    this.shootCooldown = stats.shootCooldown;
  }

  spawnDroppedItem(item, x, y) {
    const droppedItem = this.droppedItems.create(x, y, item.icon)
      .setDisplaySize(32, 32)
      .setDepth(y)
      .setInteractive();
    droppedItem.itemData = item;
    if (this.hasLighting) {
      droppedItem.setPipeline('Light2D');
      const itemLight = this.lights.addLight(x, y, 30, 0xffd700, 0.5);
      droppedItem.setData("light", itemLight);
    }
    console.log(`Dropped ${item.name} at (${x}, ${y})`);
  }

  handleDroppedItemPickup(player, droppedItem) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      const hudScene = this.scene.get("HUDScene");
      if (!hudScene) {
        console.error("HUDScene not found!");
        return;
      }

      if (hudScene.isInventoryFull()) {
        const fullText = this.add.text(
          droppedItem.x,
          droppedItem.y - 20,
          "Inventory Full!",
          {
            fontSize: "14px",
            color: "#ff0000",
            stroke: "#000000",
            strokeThickness: 3,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            padding: { x: 5, y: 2 },
          }
        ).setOrigin(0.5).setDepth(1001);

        this.tweens.add({
          targets: fullText,
          alpha: 0,
          duration: 1000,
          delay: 500,
          onComplete: () => fullText.destroy(),
        });
        console.log(`Cannot pick up ${droppedItem.itemData.name}: Inventory full`);
        return;
      }

      if (hudScene.addItemToInventory(droppedItem.itemData)) {
        // Remove applyItemEffect call here; HUDScene handles passives
        droppedItem.destroy();
        if (this.hasLighting) {
          const light = droppedItem.getData("light");
          if (light) this.lights.removeLight(light);
        }
        console.log(`Picked up ${droppedItem.itemData.name} from the ground`);
      }
    }
  }

  handleChestInteraction(player, chest) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) && !chest.getData("opened")) {
      if (this.scene.isActive()) {
        this.scene.launch("ChestScene", { chest });
        this.scene.pause();
      } else {
        console.warn("GameScene is not active, cannot launch ChestScene.");
      }
    }
  }

  updateChestPrompt() {
    const playerTile = this.getPlayerTilePosition();
    const nearbyChest = this.chests.getChildren().find(chest => {
      const chestTile = this.getChestTilePosition(chest);
      return Math.abs(chestTile.x - playerTile.x) <= 1 && Math.abs(chestTile.y - playerTile.y) <= 1 && !chest.getData("opened");
    });

    if (nearbyChest) {
      if (!this.chestPromptText) {
        this.chestPromptText = this.add.text(nearbyChest.x, nearbyChest.y - 40, "E to open chest", {
          fontSize: "14px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setDepth(1001);
      } else {
        this.chestPromptText.setPosition(nearbyChest.x, nearbyChest.y - 40);
        this.chestPromptText.setVisible(true);
      }
    } else if (this.chestPromptText) {
      this.chestPromptText.setVisible(false);
    }
  }
}