import * as ROT from "rot-js";
import { TILE_SIZE } from "../../utils/Constants.js";

export class EnemyManager {
  constructor(scene, mapWidth, mapHeight) {
    this.scene = scene;
    this.enemies = [];
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
  }

  getEnemyStats(type) {
    switch (type) {
      case "normal":
        return { health: 20, speed: 100, attackRange: 30, attackCooldown: 1000, damage: 5, hasRangedAttack: false };
      case "fast":
        return { health: 15, speed: 200, attackRange: 25, attackCooldown: 800, damage: 3, hasRangedAttack: false };
      case "heavy":
        return { health: 40, speed: 70, attackRange: 35, attackCooldown: 1200, damage: 10, hasRangedAttack: false };
      case "random":
        const baseTypes = ["normal", "fast", "heavy"];
        const randomType = baseTypes[Math.floor(Math.random() * baseTypes.length)];
        const stats = this.getEnemyStats(randomType);
        stats.health = Math.floor(stats.health * (0.8 + Math.random() * 0.4));
        stats.speed = Math.floor(stats.speed * (0.8 + Math.random() * 0.4));
        stats.attackCooldown = Math.floor(stats.attackCooldown * (0.8 + Math.random() * 0.4));
        stats.hasRangedAttack = Math.random() > 0.5;
        stats.attackRange = stats.hasRangedAttack ? 200 : stats.attackRange;
        stats.damage = stats.hasRangedAttack ? 8 : stats.damage;
        return stats;
      case "marksman":
        return { health: 15, speed: 90, attackRange: 200, attackCooldown: 1500, damage: 8, hasRangedAttack: true };
      default:
        return { health: 20, speed: 100, attackRange: 30, attackCooldown: 1000, damage: 5, hasRangedAttack: false };
    }
  }

  spawnEnemy(x, y, type = "normal") {
    const posX = (x - y) * this.TILE_SIZE;
    const posY = (x + y) * (this.TILE_SIZE / 2);
    const spriteKey = `enemy-placeholder-${type}`;
    const enemy = this.scene.physics.add.sprite(posX, posY, spriteKey)
      .setOrigin(0.5, 0.8)
      .setDepth(posY)
      .setPipeline('Light2D');

    const stats = this.getEnemyStats(type);

    const personalities = ["aggressive", "cautious", "reckless"];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    enemy.health = stats.health;
    enemy.body.setSize(12, 8).setOffset(8, 18);
    enemy.state = "PATROL"; // Initialize state
    enemy.type = type;
    enemy.speed = stats.speed * (personality === "reckless" ? 1.2 : personality === "cautious" ? 0.8 : 1);
    enemy.attackRange = stats.attackRange * (personality === "aggressive" ? 1.2 : personality === "cautious" ? 0.8 : 1);
    enemy.attackCooldown = stats.attackCooldown * (personality === "reckless" ? 0.8 : personality === "cautious" ? 1.2 : 1);
    enemy.damage = stats.damage * (personality === "aggressive" ? 1.2 : personality === "reckless" ? 0.8 : 1);
    enemy.lastAttackTime = 0;
    enemy.personality = personality;
    enemy.lastFlankTime = 0;
    enemy.lastRandomMove = 0;
    enemy.hasRangedAttack = stats.hasRangedAttack;
    enemy.fovRange = 400;
    enemy.fovAngle = Phaser.Math.DegToRad(120);
    enemy.lastMoveTime = 0;
    enemy.idleTimeout = 5000;
    enemy.moveOffset = Phaser.Math.Between(0, 1000);
    enemy.lastSleepParticleTime = 0; // Reintroduce for particle control
    this.enemies.push(enemy);
    return enemy;
  }

  isPlayerInFOV(enemy) {
    const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y);
    if (distance > enemy.fovRange) {
      return false;
    }

    const playerTile = this.scene.getPlayerTilePosition();
    const enemyTile = this.getEnemyTilePosition(enemy);
    if (!enemyTile || isNaN(enemyTile.x) || isNaN(enemyTile.y)) {
      return false;
    }

    const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y);
    const enemyAngle = enemy.body.velocity.length() > 0 ? Phaser.Math.Angle.Between(0, 0, enemy.body.velocity.x, enemy.body.velocity.y) : angleToPlayer;
    const angleDifference = Math.abs(Phaser.Math.Angle.ShortestBetween(enemyAngle, angleToPlayer));

    if (angleDifference > enemy.fovAngle / 2) {
      return false;
    }

    const steps = Math.ceil(distance / this.TILE_SIZE);
    const dx = (this.scene.player.x - enemy.x) / steps;
    const dy = (this.scene.player.y - enemy.y) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = enemy.x + dx * i;
      const checkY = enemy.y + dy * i;

      const tileX = Math.floor((checkX / this.TILE_SIZE + checkY / (this.TILE_SIZE / 2)) / 2);
      const tileY = Math.floor((checkY / (this.TILE_SIZE / 2) - checkX / this.TILE_SIZE) / 2);

      if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
        return false;
      }

      if (this.scene.dungeon[tileY][tileX] === 1) {
        return false;
      }
    }

    return true;
  }

  findPath(startX, startY, endX, endY) {
    const dungeon = this.scene.dungeon;
    if (!dungeon || !dungeon[startY] || typeof dungeon[startY][startX] === "undefined" || typeof dungeon[endY]?.[endX] === "undefined") {
      return [];
    }
    const width = dungeon[0].length;
    const height = dungeon.length;
    const passableCallback = (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return dungeon[y][x] === 0;
    };
    const dijkstra = new ROT.Path.Dijkstra(endX, endY, passableCallback, { topology: 8 });
    const path = [];
    const callback = (x, y) => path.push({ x, y });

    dijkstra.compute(startX, startY, callback);
    return path.length > 1 ? path.slice(1) : [];
  }

  fireEnemyBullet(enemy) {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y);
    const bullet = this.enemyBullets.create(enemy.x, enemy.y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(enemy.y);
    this.scene.physics.velocityFromRotation(angle, 300, bullet.body.velocity);
    bullet.setData('damage', enemy.damage);
    if (this.scene.hasLighting) bullet.setPipeline('Light2D');

    this.scene.physics.add.overlap(this.scene.player, bullet, (player, bullet) => {
      this.scene.playerHealth -= bullet.getData('damage');
      this.scene.registry.set('playerHealth', this.scene.playerHealth);
      this.scene.registry.events.emit('updateHealth', this.scene.playerHealth);
      bullet.destroy();
      if (this.scene.playerHealth <= 0) {
        this.scene.handlePlayerDeath();
      }
    });

    this.scene.physics.add.collider(bullet, this.scene.wallTiles, () => bullet.destroy());
  }

  updateEnemyAI(time) {
    if (time - this.lastPathUpdate < this.scene.enemyUpdateInterval) {
      this.enemies.forEach(enemy => {
        if (enemy.path && enemy.path.length > 0) {
          const nextTile = enemy.path[0];
          const targetX = (nextTile.x - nextTile.y) * this.TILE_SIZE;
          const targetY = (nextTile.x + nextTile.y) * (this.TILE_SIZE / 2);
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
          const velocityX = Math.cos(angle) * enemy.speed;
          const velocityY = Math.sin(angle) * enemy.speed;
          enemy.body.setVelocity(velocityX, velocityY);
          if (Phaser.Math.Distance.Between(enemy.x, enemy.y, targetX, targetY) < 5) {
            enemy.path.shift();
            enemy.lastMoveTime = time;
          }
        }
        this.returnToMapIfOutOfBounds(enemy);
      });
      return;
    }

    this.lastPathUpdate = time;

    this.enemies.forEach(enemy => {
      if (!enemy.active || !enemy.visible) {
        return;
      }

      const playerTile = this.scene.getPlayerTilePosition();
      const enemyTile = this.getEnemyTilePosition(enemy);
      if (!enemyTile || isNaN(enemyTile.x) || isNaN(enemyTile.y)) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y);
      const playerInFOV = this.isPlayerInFOV(enemy);

      if (time - enemy.lastMoveTime > enemy.idleTimeout) {
        enemy.state = "PATROL";
        enemy.path = null;
        enemy.lastMoveTime = time;
      }

      switch (enemy.state) {
        case "PATROL":
          if (playerInFOV) {
            enemy.state = "CHASE";
          } else {
            this.performSoloBehavior(enemy, time);
          }
          break;

        case "CHASE":
          if (!playerInFOV && distance > (enemy.personality === "aggressive" ? 500 : enemy.personality === "cautious" ? 350 : 400)) {
            enemy.state = "PATROL";
          } else if (distance < enemy.attackRange) {
            enemy.state = "ATTACK";
          } else {
            this.chase(enemy, playerTile, time, enemyTile);
          }
          break;

        case "ATTACK":
          if (distance > enemy.attackRange * 1.1) enemy.state = "CHASE";
          else if (enemy.health < (enemy.personality === "cautious" ? 15 : 5)) enemy.state = "FLEE";
          else this.attack(enemy, time, playerTile, enemyTile);
          break;

        case "FLEE":
          if (enemy.health > (enemy.personality === "cautious" ? 20 : 10)) enemy.state = "CHASE";
          else this.flee(enemy, playerTile, time, enemyTile);
          break;
      }

      this.returnToMapIfOutOfBounds(enemy);
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
      onComplete: () => {
        zzzzText.destroy();
      },
    });
  }

  performSoloBehavior(enemy, time) {
    if (!enemy.active || !enemy.visible) return;
    const adjustedTime = time + enemy.moveOffset;
    const moveInterval = Phaser.Math.Between(2500, 3500);

    const isAlone = this.enemies.every(other => other === enemy || Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y) > 200) &&
                    Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y) > 400;

    if (isAlone) {
      if (adjustedTime - enemy.lastRandomMove > moveInterval) {
        this.scene.tweens.add({
          targets: enemy,
          y: enemy.y + 3,
          duration: 1000,
          yoyo: true,
          ease: "Sine.easeInOut",
          onComplete: () => {
            enemy.lastMoveTime = adjustedTime;
          },
        });
        enemy.lastRandomMove = adjustedTime;
      }

      if (adjustedTime - enemy.lastSleepParticleTime > 1500) { // Control particle frequency
        this.createSleepParticles(enemy.x, enemy.y);
        enemy.lastSleepParticleTime = adjustedTime;
      }
    } else if (adjustedTime - enemy.lastRandomMove > moveInterval) {
      const behavior = Phaser.Math.Between(0, 1);
      switch (behavior) {
        case 0:
          const dx = Phaser.Math.Between(-1, 1) * this.TILE_SIZE;
          const dy = Phaser.Math.Between(-1, 1) * this.TILE_SIZE;
          this.scene.tweens.add({
            targets: enemy,
            x: enemy.x + dx,
            y: enemy.y + dy,
            duration: 1000,
            ease: "Sine.easeInOut",
            onComplete: () => enemy.lastMoveTime = adjustedTime,
          });
          break;
        case 1:
          this.scene.tweens.add({
            targets: enemy,
            y: enemy.y + 3,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            ease: "Sine.easeInOut",
            onComplete: () => {
              enemy.lastMoveTime = adjustedTime;
              enemy.alpha = 1;
            },
          });
          break;
      }
      enemy.lastRandomMove = adjustedTime;
    }
  }

  chase(enemy, playerTile, time, enemyTile) {
    let targetX, targetY, speed = enemy.speed;

    if (enemy.type === "fast" && time - enemy.lastFlankTime > 2000) {
      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y);
      const flankAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const flankDistance = 100;
      targetX = this.scene.player.x + Math.cos(flankAngle) * flankDistance;
      targetY = this.scene.player.y + Math.sin(flankAngle) * flankDistance;
      enemy.lastFlankTime = time;
      speed *= 1.2;
    } else if (enemy.type === "random" && !enemy.hasRangedAttack && time - enemy.lastRandomMove > 1000) {
      const randomAngle = Math.random() * Math.PI * 2;
      targetX = enemy.x + Math.cos(randomAngle) * 50;
      targetY = enemy.y + Math.sin(randomAngle) * 50;
      enemy.lastRandomMove = time;
    } else {
      const path = this.findPath(
        enemyTile.x,
        enemyTile.y,
        playerTile.x,
        playerTile.y
      );
      if (path && path.length > 0) {
        enemy.path = path;
        const nextTile = path[0];
        targetX = (nextTile.x - nextTile.y) * this.TILE_SIZE;
        targetY = (nextTile.x + nextTile.y) * (this.TILE_SIZE / 2);
      } else {
        targetX = this.scene.player.x;
        targetY = this.scene.player.y;
      }
    }

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;
    enemy.body.setVelocity(velocityX, velocityY);
    if (enemy.path && Phaser.Math.Distance.Between(enemy.x, enemy.y, targetX, targetY) < 5) {
      enemy.path.shift();
      enemy.lastMoveTime = time;
    }
    enemy.lastMoveTime = time;
  }

  attack(enemy, time, playerTile, enemyTile) {
    let modifiedDamage = enemy.damage;
    let modifiedSpeed = enemy.speed;

    if (enemy.type === "heavy") {
      modifiedDamage *= 1.3;
      modifiedSpeed *= 0.5;
    }

    if (enemy.hasRangedAttack) {
      if (time - enemy.lastAttackTime > enemy.attackCooldown) {
        this.fireEnemyBullet(enemy);
        enemy.lastAttackTime = time;
      }
    } else {
      if (time - enemy.lastAttackTime > enemy.attackCooldown) {
        this.scene.playerHealth -= modifiedDamage;
        this.scene.registry.set('playerHealth', this.scene.playerHealth);
        this.scene.registry.events.emit('updateHealth', this.scene.playerHealth);
        enemy.lastAttackTime = time;
      }
    }

    const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y);
    if (!enemy.hasRangedAttack && distance > enemy.attackRange * 0.8) {
      const path = this.findPath(
        enemyTile.x,
        enemyTile.y,
        playerTile.x,
        playerTile.y
      );
      if (path && path.length > 0) {
        enemy.path = path;
        const nextTile = path[0];
        const targetX = (nextTile.x - nextTile.y) * this.TILE_SIZE;
        const targetY = (nextTile.x + nextTile.y) * (this.TILE_SIZE / 2);
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
        const velocityX = Math.cos(angle) * modifiedSpeed * (enemy.personality === "cautious" ? 0.3 : 0.5);
        const velocityY = Math.sin(angle) * modifiedSpeed * (enemy.personality === "cautious" ? 0.3 : 0.5);
        enemy.body.setVelocity(velocityX, velocityY);
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, targetX, targetY) < 5) {
          path.shift();
          enemy.lastMoveTime = time;
        }
      } else {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y);
        const velocityX = Math.cos(angle) * modifiedSpeed * 0.5;
        const velocityY = Math.sin(angle) * modifiedSpeed * 0.5;
        enemy.body.setVelocity(velocityX, velocityY);
        enemy.lastMoveTime = time;
      }
    } else if (enemy.hasRangedAttack) {
      if (distance < enemy.attackRange * 0.5) {
        const fleeX = enemy.x + (enemy.x - this.scene.player.x) * 0.5;
        const fleeY = enemy.y + (enemy.y - this.scene.player.y) * 0.5;
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, fleeX, fleeY);
        const velocityX = Math.cos(angle) * enemy.speed;
        const velocityY = Math.sin(angle) * enemy.speed;
        enemy.body.setVelocity(velocityX, velocityY);
        enemy.lastMoveTime = time;
      } else {
        enemy.body.setVelocity(0, 0);
      }
    }
  }

  flee(enemy, playerTile, time, enemyTile) {
    const fleeX = enemy.x + (enemy.x - this.scene.player.x) * (enemy.personality === "cautious" ? 1.5 : 1);
    const fleeY = enemy.y + (enemy.y - this.scene.player.y) * (enemy.personality === "cautious" ? 1.5 : 1);
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, fleeX, fleeY);
    const velocityX = Math.cos(angle) * enemy.speed * 1.5;
    const velocityY = Math.sin(angle) * enemy.speed * 1.5;
    enemy.body.setVelocity(velocityX, velocityY);
    enemy.lastMoveTime = time;
  }

  handleBulletEnemyCollision(bullet, enemy) {
    bullet.destroy();
    enemy.health -= 10;
    if (enemy.health <= 0) {
      enemy.destroy();
      this.enemies = this.enemies.filter(e => e !== enemy);
    }
  }

  getEnemyTilePosition(enemy) {
    if (!enemy || isNaN(enemy.x) || isNaN(enemy.y)) {
      return null;
    }
    const tileX = Math.floor((enemy.x / this.TILE_SIZE + enemy.y / (this.TILE_SIZE / 2)) / 2);
    const tileY = Math.floor((enemy.y / (this.TILE_SIZE / 2) - enemy.x / this.TILE_SIZE) / 2);
    return { x: tileX, y: tileY };
  }

  returnToMapIfOutOfBounds(enemy) {
    const enemyTile = this.getEnemyTilePosition(enemy);
    if (!enemyTile || enemyTile.x < 0 || enemyTile.x >= this.mapWidth || enemyTile.y < 0 || enemyTile.y >= this.mapHeight) {
      const centerTileX = Math.floor(this.mapWidth / 2);
      const centerTileY = Math.floor(this.mapHeight / 2);
      const targetX = (centerTileX - centerTileY) * this.TILE_SIZE;
      const targetY = (centerTileX + centerTileY) * (this.TILE_SIZE / 2);
      enemy.setPosition(targetX, targetY);
      enemy.body.setVelocity(0, 0);
      enemy.path = null;
    }
  }

  getEnemies() {
    return this.enemies;
  }
}