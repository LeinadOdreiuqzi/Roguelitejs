import * as ROT from "rot-js";
import { TILE_SIZE } from "../../utils/Constants.js";
import Phaser from "phaser";

export class EnemyManager {
  constructor(scene, mapWidth, mapHeight) {
    this.scene = scene;
    this.enemies = this.scene.physics.add.group();
    this.TILE_SIZE = TILE_SIZE;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.lastPathUpdate = 0;
    this.pathUpdateInterval = 300;
    this.enemyBullets = this.scene.physics.add.group();
    this.scene.physics.add.collider(this.enemies, this.enemies, (enemy1, enemy2) => {
      enemy1.body.setVelocity(0, 0);
      enemy2.body.setVelocity(0, 0);
    });
    this.healthBarHideTimeout = 3000; // 3 seconds timeout before hiding health bar
  }

  getEnemyStats(type) {
    const statsMap = {
      normal: { health: 20, speed: 100, attackRange: 30, attackCooldown: 1000, damage: 5, hasRangedAttack: false, xpValue: 20 },
      fast: { health: 15, speed: 200, attackRange: 25, attackCooldown: 800, damage: 3, hasRangedAttack: false, xpValue: 15 },
      heavy: { health: 40, speed: 70, attackRange: 35, attackCooldown: 1200, damage: 10, hasRangedAttack: false, xpValue: 30 },
      random: { health: 25, speed: 120, attackRange: 30, attackCooldown: 1000, damage: 8, hasRangedAttack: Math.random() > 0.5, xpValue: 25 },
      marksman: { health: 15, speed: 90, attackRange: 200, attackCooldown: 1500, damage: 8, hasRangedAttack: true, xpValue: 25 },
      boss: { health: 150, speed: 80, attackRange: 50, attackCooldown: 800, damage: 15, hasRangedAttack: true, xpValue: 100 },
    };
    const stats = statsMap[type] || statsMap.normal;
    console.log(`Enemy stats for type ${type}:`, stats);
    return { ...stats };
  }

  spawnEnemy(x, y, type = "normal") {
    const posX = (x - y) * this.TILE_SIZE;
    const posY = (x + y) * (this.TILE_SIZE / 2);
    const spriteKey = `enemy-placeholder-${type}`;
    const enemySprite = this.enemies.create(posX, posY, spriteKey)
      .setOrigin(0.5, 0.8)
      .setDepth(posY)
      .setPipeline('Light2D');

    const stats = this.getEnemyStats(type);
    if (!stats || typeof stats.health !== "number") {
      console.error(`Invalid stats for enemy type ${type}:`, stats);
      enemySprite.destroy();
      return null;
    }

    console.log(`Spawning enemy of type ${type} at (${x}, ${y}) with initial health: ${stats.health}, XP value: ${stats.xpValue}`);

    const personalities = ["aggressive", "cautious", "reckless"];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    const enemyData = {
      health: stats.health,
      maxHealth: stats.health,
      type,
      speed: stats.speed * (personality === "reckless" ? 1.2 : personality === "cautious" ? 0.8 : 1),
      attackRange: stats.attackRange * (personality === "aggressive" ? 1.2 : personality === "cautious" ? 0.8 : 1),
      attackCooldown: stats.attackCooldown * (personality === "reckless" ? 0.8 : personality === "cautious" ? 1.2 : 1),
      damage: stats.damage * (personality === "aggressive" ? 1.2 : personality === "reckless" ? 0.8 : 1),
      lastAttackTime: 0,
      personality,
      lastFlankTime: 0,
      lastRandomMove: 0,
      hasRangedAttack: stats.hasRangedAttack,
      fovRange: 400,
      fovAngle: Phaser.Math.DegToRad(120),
      lastMoveTime: 0,
      idleTimeout: 5000,
      moveOffset: Phaser.Math.Between(0, 1000),
      lastSleepParticleTime: 0,
      xpValue: stats.xpValue,
      lastDamageTime: 0, // New field to track last damage time
    };

    if (!enemySprite.setData) {
      console.error("Sprite does not support setData:", enemySprite);
      enemySprite.destroy();
      return null;
    }
    enemySprite.setData("enemyData", enemyData);
    console.log(`Attached enemyData to sprite, health: ${enemyData.health}`);

    const width = type === "boss" ? 48 : type === "heavy" ? 32 : 16;
    const height = type === "boss" ? 48 : type === "heavy" ? 32 : 16;
    enemySprite.body.setSize(width, height).setOffset((width - 16) / 2, height - 8);
    enemySprite.state = "PATROL";

    // Create health bar (initially hidden)
    const healthBarWidth = type === "boss" ? 60 : type === "heavy" ? 40 : 20;
    const healthBarHeight = type === "boss" ? 6 : 4;
    const healthBar = this.scene.add.graphics();
    healthBar.setVisible(false); // Hidden by default
    enemySprite.healthBar = healthBar;
    enemySprite.healthBarWidth = healthBarWidth;
    enemySprite.healthBarHeight = healthBarHeight;
    this.updateHealthBar(enemySprite);

    return enemySprite;
  }

  updateHealthBar(enemySprite) {
    const enemyData = enemySprite.getData("enemyData");
    if (!enemyData || !enemySprite.healthBar) return;

    const healthBar = enemySprite.healthBar;
    const barWidth = enemySprite.healthBarWidth;
    const barHeight = enemySprite.healthBarHeight;
    healthBar.clear();

    // Position above the enemy
    const x = enemySprite.x - barWidth / 2;
    const y = enemySprite.y - enemySprite.height / 2 - 10;

    // Background (red)
    healthBar.fillStyle(0xff0000, 1);
    healthBar.fillRect(x, y, barWidth, barHeight);

    // Foreground (green, scaled by health percentage)
    const healthPercent = enemyData.health / enemyData.maxHealth;
    const currentWidth = barWidth * healthPercent;
    healthBar.fillStyle(0x00ff00, 1);
    healthBar.fillRect(x, y, currentWidth, barHeight);

    // Border
    healthBar.lineStyle(1, 0x000000, 1);
    healthBar.strokeRect(x, y, barWidth, barHeight);

    // Set depth
    healthBar.setDepth(enemySprite.y + 1);
  }

  showDamageNumber(enemySprite, damage) {
    const x = enemySprite.x;
    const y = enemySprite.y - enemySprite.height / 2;

    const damageText = this.scene.add.text(x, y, `${damage}`, {
      fontSize: "12px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(enemySprite.y + 2);

    this.scene.tweens.add({
      targets: damageText,
      y: y - 20,
      alpha: 0,
      duration: 1000,
      ease: "Power1",
      onComplete: () => damageText.destroy(),
    });
  }

  isPlayerInFOV(enemySprite) {
    const enemyData = enemySprite.getData("enemyData");
    if (!enemyData) return false;

    const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemySprite.x, enemySprite.y);
    if (distance > enemyData.fovRange) return false;

    const playerTile = this.scene.getPlayerTilePosition();
    const enemyTile = this.getEnemyTilePosition(enemySprite);
    if (!enemyTile || isNaN(enemyTile.x) || isNaN(enemyTile.y)) return false;

    const angleToPlayer = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, this.scene.player.x, this.scene.player.y);
    const enemyAngle = enemySprite.body.velocity.length() > 0 ? Phaser.Math.Angle.Between(0, 0, enemySprite.body.velocity.x, enemySprite.body.velocity.y) : angleToPlayer;
    const angleDifference = Math.abs(Phaser.Math.Angle.ShortestBetween(enemyAngle, angleToPlayer));

    if (angleDifference > enemyData.fovAngle / 2) return false;

    const steps = Math.ceil(distance / this.TILE_SIZE);
    const dx = (this.scene.player.x - enemySprite.x) / steps;
    const dy = (this.scene.player.y - enemySprite.y) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = enemySprite.x + dx * i;
      const checkY = enemySprite.y + dy * i;
      const tileX = Math.floor((checkX / this.TILE_SIZE + checkY / (this.TILE_SIZE / 2)) / 2);
      const tileY = Math.floor((checkY / (this.TILE_SIZE / 2) - checkX / this.TILE_SIZE) / 2);

      if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) return false;
      if (this.scene.dungeon[tileY][tileX] === 1) return false;
    }

    return true;
  }

  findPath(startX, startY, endX, endY) {
    const dungeon = this.scene.dungeon;
    if (!dungeon || !dungeon[startY] || typeof dungeon[startY][startX] === "undefined" || typeof dungeon[endY]?.[endX] === "undefined") return [];
    const width = dungeon[0].length;
    const height = dungeon.length;
    const passableCallback = (x, y) => x >= 0 && x < width && y >= 0 && y < height && dungeon[y][x] === 0;
    const dijkstra = new ROT.Path.Dijkstra(endX, endY, passableCallback, { topology: 8 });
    const path = [];
    const callback = (x, y) => path.push({ x, y });
    dijkstra.compute(startX, startY, callback);
    return path.length > 1 ? path.slice(1) : [];
  }

  fireEnemyBullet(enemySprite) {
    const enemyData = enemySprite.getData("enemyData");
    if (!enemyData) return;

    const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, this.scene.player.x, this.scene.player.y);
    const bullet = this.enemyBullets.create(enemySprite.x, enemySprite.y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(enemySprite.y);
    this.scene.physics.velocityFromRotation(angle, 300, bullet.body.velocity);
    bullet.setData('damage', enemyData.damage);
    if (this.scene.hasLighting) bullet.setPipeline('Light2D');

    this.scene.physics.add.overlap(this.scene.player, bullet, (player, bullet) => {
      this.scene.playerHealth -= bullet.getData('damage');
      this.scene.registry.set('playerHealth', this.scene.playerHealth);
      this.scene.registry.events.emit('updateHealth', this.scene.playerHealth);
      bullet.destroy();
      if (this.scene.playerHealth <= 0) this.scene.handlePlayerDeath();
    });

    this.scene.physics.add.collider(bullet, this.scene.wallTiles, () => bullet.destroy());
  }

  updateEnemyAI(time) {
    if (time - this.lastPathUpdate < this.scene.enemyUpdateInterval) {
      this.enemies.getChildren().forEach(enemySprite => {
        const enemyData = enemySprite.getData("enemyData");
        if (!enemyData || !enemySprite.path || enemySprite.path.length === 0) return;

        const nextTile = enemySprite.path[0];
        const targetX = (nextTile.x - nextTile.y) * this.TILE_SIZE;
        const targetY = (nextTile.x + nextTile.y) * (this.TILE_SIZE / 2);
        const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, targetX, targetY);
        const velocityX = Math.cos(angle) * enemyData.speed;
        const velocityY = Math.sin(angle) * enemyData.speed;
        enemySprite.body.setVelocity(velocityX, velocityY);
        if (Phaser.Math.Distance.Between(enemySprite.x, enemySprite.y, targetX, targetY) < 5) enemySprite.path.shift();
      });
      return;
    }

    this.lastPathUpdate = time;

    this.enemies.getChildren().forEach(enemySprite => {
      const enemyData = enemySprite.getData("enemyData");
      if (!enemyData || !enemySprite.active || !enemySprite.visible) return;

      const playerTile = this.scene.getPlayerTilePosition();
      const enemyTile = this.getEnemyTilePosition(enemySprite);
      if (!enemyTile || isNaN(enemyTile.x) || isNaN(enemyTile.y)) return;

      const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemySprite.x, enemySprite.y);
      const playerInFOV = this.isPlayerInFOV(enemySprite);

      if (time - enemyData.lastMoveTime > enemyData.idleTimeout) {
        enemySprite.state = "PATROL";
        enemySprite.path = null;
        enemyData.lastMoveTime = time;
      }

      switch (enemySprite.state) {
        case "PATROL":
          if (playerInFOV) enemySprite.state = "CHASE";
          else this.performSoloBehavior(enemySprite, time, enemyData);
          break;

        case "CHASE":
          if (!playerInFOV && distance > (enemyData.personality === "aggressive" ? 500 : enemyData.personality === "cautious" ? 350 : 400)) {
            enemySprite.state = "PATROL";
          } else if (distance < enemyData.attackRange) {
            enemySprite.state = "ATTACK";
          } else {
            this.chase(enemySprite, playerTile, time, enemyTile, enemyData);
          }
          break;

        case "ATTACK":
          if (distance > enemyData.attackRange * 1.1) enemySprite.state = "CHASE";
          else if (enemyData.health < (enemyData.personality === "cautious" ? 15 : 5)) enemySprite.state = "FLEE";
          else this.attack(enemySprite, time, playerTile, enemyTile, enemyData);
          break;

        case "FLEE":
          if (enemyData.health > (enemyData.personality === "cautious" ? 20 : 10)) enemySprite.state = "CHASE";
          else this.flee(enemySprite, playerTile, time, enemyTile, enemyData);
          break;
      }

      this.returnToMapIfOutOfBounds(enemySprite);
    });
  }

  createSleepParticles(x, y) {
    const zzzzText = this.scene.add.text(x, y - 20, "zzzz", {
      fontSize: "12px",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(2000).setVisible(true);

    this.scene.tweens.add({
      targets: zzzzText,
      alpha: { from: 1, to: 0 },
      y: y - 30,
      duration: 1000,
      onComplete: () => zzzzText.destroy(),
    });
  }

  performSoloBehavior(enemySprite, time, enemyData) {
    if (!enemySprite.active || !enemySprite.visible) return;
    const adjustedTime = time + enemyData.moveOffset;
    const moveInterval = Phaser.Math.Between(2500, 3500);

    const isAlone = this.enemies.getChildren().every(other => other === enemySprite || Phaser.Math.Distance.Between(enemySprite.x, enemySprite.y, other.x, other.y) > 200) &&
                    Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemySprite.x, enemySprite.y) > 400;

    if (isAlone) {
      if (adjustedTime - enemyData.lastRandomMove > moveInterval) {
        this.scene.tweens.add({
          targets: enemySprite,
          y: enemySprite.y + 3,
          duration: 1000,
          yoyo: true,
          ease: "Sine.easeInOut",
          onComplete: () => enemyData.lastMoveTime = adjustedTime,
        });
        enemyData.lastRandomMove = adjustedTime;
      }

      if (adjustedTime - enemyData.lastSleepParticleTime > 1500) {
        this.createSleepParticles(enemySprite.x, enemySprite.y);
        enemyData.lastSleepParticleTime = adjustedTime;
      }
    } else if (adjustedTime - enemyData.lastRandomMove > moveInterval) {
      const behavior = Phaser.Math.Between(0, 1);
      switch (behavior) {
        case 0:
          const dx = Phaser.Math.Between(-1, 1) * this.TILE_SIZE;
          const dy = Phaser.Math.Between(-1, 1) * this.TILE_SIZE;
          this.scene.tweens.add({
            targets: enemySprite,
            x: enemySprite.x + dx,
            y: enemySprite.y + dy,
            duration: 1000,
            ease: "Sine.easeInOut",
            onComplete: () => enemyData.lastMoveTime = adjustedTime,
          });
          break;
        case 1:
          this.scene.tweens.add({
            targets: enemySprite,
            y: enemySprite.y + 3,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            ease: "Sine.easeInOut",
            onComplete: () => {
              enemyData.lastMoveTime = adjustedTime;
              enemySprite.alpha = 1;
            },
          });
          break;
      }
      enemyData.lastRandomMove = adjustedTime;
    }
  }

  chase(enemySprite, playerTile, time, enemyTile, enemyData) {
    let targetX, targetY, speed = enemyData.speed;

    if (enemyData.type === "fast" && time - enemyData.lastFlankTime > 2000) {
      const angleToPlayer = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, this.scene.player.x, this.scene.player.y);
      const flankAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const flankDistance = 100;
      targetX = this.scene.player.x + Math.cos(flankAngle) * flankDistance;
      targetY = this.scene.player.y + Math.sin(flankAngle) * flankDistance;
      enemyData.lastFlankTime = time;
      speed *= 1.2;
    } else if (enemyData.type === "random" && !enemyData.hasRangedAttack && time - enemyData.lastRandomMove > 1000) {
      const randomAngle = Math.random() * Math.PI * 2;
      targetX = enemySprite.x + Math.cos(randomAngle) * 50;
      targetY = enemySprite.y + Math.sin(randomAngle) * 50;
      enemyData.lastRandomMove = time;
    } else {
      const path = this.findPath(enemyTile.x, enemyTile.y, playerTile.x, playerTile.y);
      if (path && path.length > 0) {
        enemySprite.path = path;
        const nextTile = path[0];
        targetX = (nextTile.x - nextTile.y) * this.TILE_SIZE;
        targetY = (nextTile.x + nextTile.y) * (this.TILE_SIZE / 2);
      } else {
        targetX = this.scene.player.x;
        targetY = this.scene.player.y;
      }
    }

    const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, targetX, targetY);
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    enemySprite.body.setVelocity(velocityX, velocityY);
    if (enemySprite.path && Phaser.Math.Distance.Between(enemySprite.x, enemySprite.y, targetX, targetY) < 5) enemySprite.path.shift();
    enemyData.lastMoveTime = time;
  }

  attack(enemySprite, time, playerTile, enemyTile, enemyData) {
    let modifiedDamage = enemyData.damage;
    let modifiedSpeed = enemyData.speed;

    if (enemyData.type === "heavy") {
      modifiedDamage *= 1.3;
      modifiedSpeed *= 0.5;
    }

    if (enemyData.hasRangedAttack) {
      if (time - enemyData.lastAttackTime > enemyData.attackCooldown) {
        this.fireEnemyBullet(enemySprite);
        enemyData.lastAttackTime = time;
      }
    } else {
      if (time - enemyData.lastAttackTime > enemyData.attackCooldown) {
        this.scene.playerHealth -= modifiedDamage;
        this.scene.registry.set('playerHealth', this.scene.playerHealth);
        this.scene.registry.events.emit('updateHealth', this.scene.playerHealth);
        enemyData.lastAttackTime = time;
      }
    }

    const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemySprite.x, enemySprite.y);
    if (!enemyData.hasRangedAttack && distance > enemyData.attackRange * 0.8) {
      const path = this.findPath(enemyTile.x, enemyTile.y, playerTile.x, playerTile.y);
      if (path && path.length > 0) {
        enemySprite.path = path;
        const nextTile = path[0];
        const targetX = (nextTile.x - nextTile.y) * this.TILE_SIZE;
        const targetY = (nextTile.x + nextTile.y) * (this.TILE_SIZE / 2);
        const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, targetX, targetY);
        const velocityX = Math.cos(angle) * modifiedSpeed * (enemyData.personality === "cautious" ? 0.3 : 0.5);
        const velocityY = Math.sin(angle) * modifiedSpeed * (enemyData.personality === "cautious" ? 0.3 : 0.5);
        enemySprite.body.setVelocity(velocityX, velocityY);
        if (Phaser.Math.Distance.Between(enemySprite.x, enemySprite.y, targetX, targetY) < 5) path.shift();
      } else {
        const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, this.scene.player.x, this.scene.player.y);
        const velocityX = Math.cos(angle) * modifiedSpeed * 0.5;
        const velocityY = Math.sin(angle) * modifiedSpeed * 0.5;
        enemySprite.body.setVelocity(velocityX, velocityY);
      }
    } else if (enemyData.hasRangedAttack) {
      if (distance < enemyData.attackRange * 0.5) {
        const fleeX = enemySprite.x + (enemySprite.x - this.scene.player.x) * 0.5;
        const fleeY = enemySprite.y + (enemySprite.y - this.scene.player.y) * 0.5;
        const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, fleeX, fleeY);
        const velocityX = Math.cos(angle) * enemyData.speed;
        const velocityY = Math.sin(angle) * enemyData.speed;
        enemySprite.body.setVelocity(velocityX, velocityY);
      } else {
        enemySprite.body.setVelocity(0, 0);
      }
    }
  }

  flee(enemySprite, playerTile, time, enemyTile, enemyData) {
    const fleeX = enemySprite.x + (enemySprite.x - this.scene.player.x) * (enemyData.personality === "cautious" ? 1.5 : 1);
    const fleeY = enemySprite.y + (enemySprite.y - this.scene.player.y) * (enemyData.personality === "cautious" ? 1.5 : 1);
    const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, fleeX, fleeY);
    const velocityX = Math.cos(angle) * enemyData.speed * 1.5;
    const velocityY = Math.sin(angle) * enemyData.speed * 1.5;
    enemySprite.body.setVelocity(velocityX, velocityY);
    enemyData.lastMoveTime = time;
  }

  handleBulletEnemyCollision(bullet, enemySprite) {
    const damage = bullet.getData('damage') || 1;
    const enemyData = enemySprite.getData("enemyData");

    if (!enemyData) {
      console.error(`Invalid enemy data detected for sprite:`, enemySprite);
      bullet.destroy();
      return;
    }

    console.log(`Pre-collision: Enemy ${enemyData.type} health = ${enemyData.health}, damage applied = ${damage}`);
    enemyData.health = Math.max(0, enemyData.health - damage);
    enemyData.lastDamageTime = this.scene.time.now; // Reset timer on damage
    console.log(`Post-collision: Enemy ${enemyData.type} health reduced to ${enemyData.health}`);

    this.showDamageNumber(enemySprite, damage);
    this.updateHealthBar(enemySprite);
    enemySprite.healthBar.setVisible(true); // Show health bar on damage

    bullet.destroy();

    if (enemyData.health <= 0) {
      console.log(`Enemy ${enemyData.type} killed, awarding ${enemyData.xpValue} XP`);
      if (enemySprite.healthBar) {
        enemySprite.healthBar.destroy();
      }
      enemySprite.destroy();
      this.enemies.remove(enemySprite, true);
      this.scene.addXP(enemyData.xpValue);
    } else {
      console.log(`Enemy ${enemyData.type} survived with ${enemyData.health} health remaining`);
    }
  }

  getEnemyTilePosition(enemySprite) {
    if (!enemySprite || isNaN(enemySprite.x) || isNaN(enemySprite.y)) return null;
    const tileX = Math.floor((enemySprite.x / this.TILE_SIZE + enemySprite.y / (this.TILE_SIZE / 2)) / 2);
    const tileY = Math.floor((enemySprite.y / (this.TILE_SIZE / 2) - enemySprite.x / this.TILE_SIZE) / 2);
    return { x: tileX, y: tileY };
  }

  returnToMapIfOutOfBounds(enemySprite) {
    const enemyTile = this.getEnemyTilePosition(enemySprite);
    if (!enemyTile || enemyTile.x < 0 || enemyTile.x >= this.mapWidth || enemyTile.y < 0 || enemyTile.y >= this.mapHeight) {
      const centerTileX = Math.floor(this.mapWidth / 2);
      const centerTileY = Math.floor(this.mapHeight / 2);
      const targetX = (centerTileX - centerTileY) * this.TILE_SIZE;
      const targetY = (centerTileX + centerTileY) * (this.TILE_SIZE / 2);
      enemySprite.setPosition(targetX, targetY);
      enemySprite.body.setVelocity(0, 0);
      enemySprite.path = null;
    }
  }

  getEnemies() {
    return this.enemies.getChildren();
  }
}