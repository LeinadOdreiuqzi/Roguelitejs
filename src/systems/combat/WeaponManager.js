import Phaser from "phaser";

export class WeaponManager {
  constructor(scene, stats) {
    this.scene = scene;
    this.stats = {
      ...stats,
      pierce: 0,
      projectileCount: 1,
      bounce: 0,
      explosionChance: 0,
      chainExplosionChance: 0,
      explosionOnCritical: 0,
      multiExplosionCount: 0,
      redirectChance: 0,
      explosiveProjectiles: 0,
      chainShotCount: 0, // New for chainShot
      damageBoost: 0, // For berserkerMode
      defensePenalty: 0, // For berserkerMode
    };
    this.bullets = scene.bullets;
    this.hasDumbBullets = false;
    this.hasProjectileTaming = false;
    this.hasCloneGenerator = false;
    this.hasGrenade = false;
    this.hasMines = false;
    this.hasLargeProjectile = false;
    this.hasMissile = false;
    this.hasSkyExplosion = false;
    this.hasFireTrail = false;
    this.hasAreaExplosion = false;
    this.hasLaser = false;
    this.hasEnergyExplosion = false;
    this.hasMeteorBarrage = false;
    this.hasShockwaveOnDamage = false; // For pulseBomb, energyAbsorption
    this.lastGrenadeTime = 0;
    this.lastMineTime = 0;
    this.lastMissileTime = 0;
    this.lastSkyExplosionTime = 0;
    this.lastAreaExplosionTime = 0;
    this.lastLaserTime = 0;
    this.lastEnergyExplosionTime = 0;
    this.lastMeteorBarrageTime = 0;
    this.fireTrailDuration = 0;
    this.shockwaveRadius = 0; // For shockwave effects
    this.grenadeInterval = 0;
    this.mineInterval = 0;
    this.missileInterval = 0;
    this.skyExplosionInterval = 0;
    this.areaExplosionInterval = 0;
    this.laserInterval = 0;
    this.energyExplosionInterval = 0;
    this.meteorBarrageInterval = 0;
  }

  fireBullet(x, y, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    let bullets = [];

    // Handle projectileCount with spread or circular pattern
    for (let i = 0; i < this.stats.projectileCount; i++) {
      const bullet = this.bullets.create(x, y, "bullet-placeholder")
        .setOrigin(0.5, 0.5)
        .setDepth(y);
      let adjustedAngle = angle;
      if (this.stats.projectileCount > 1) {
        if (this.stats.pattern === "circular") {
          adjustedAngle = angle + (i * 2 * Math.PI / this.stats.projectileCount);
        } else {
          const spread = this.stats.spread || 10;
          const offset = Phaser.Math.DegToRad((i - (this.stats.projectileCount - 1) / 2) * spread);
          adjustedAngle += offset;
        }
      }
      this.scene.physics.velocityFromRotation(adjustedAngle, this.stats.velocity, bullet.body.velocity);
      const damage = this.stats.damage * (1 + this.stats.damageBoost);
      bullet.setData('damage', damage);
      bullet.setData('pierce', this.stats.pierce || 0);
      bullet.setData('bounce', this.stats.bounce || 0);
      bullet.setData('explosionChance', this.stats.explosionChance || 0);
      bullet.setData('explosiveProjectiles', this.stats.explosiveProjectiles || 0);
      bullet.setData('chainShotCount', this.stats.chainShotCount || 0);
      bullets.push(bullet);

      if (this.hasDumbBullets && Phaser.Math.Between(0, 99) < 10) {
        bullet.setData('slowEffect', { duration: 2000, speedReduction: 0.5 });
      }

      if (this.hasProjectileTaming) {
        this.scene.tweens.add({
          targets: bullet,
          onUpdate: () => {
            const closestEnemy = this.findClosestEnemy(bullet.x, bullet.y);
            if (closestEnemy) {
              const homingAngle = Phaser.Math.Angle.Between(bullet.x, bullet.y, closestEnemy.x, closestEnemy.y);
              const currentVelocity = bullet.body.velocity;
              const targetVelocity = Phaser.Math.Vector2.ZERO;
              this.scene.physics.velocityFromRotation(homingAngle, this.stats.velocity, targetVelocity);
              currentVelocity.lerp(targetVelocity, 0.05);
              bullet.body.velocity.set(currentVelocity.x, currentVelocity.y);
            }
          },
          duration: 2000,
        });
      }

      if (this.hasCloneGenerator && Phaser.Math.Between(0, 99) < 15) {
        const cloneBullet = this.bullets.create(x, y, "bullet-placeholder")
          .setOrigin(0.5, 0.5)
          .setDepth(y);
        const offsetAngle = angle + Phaser.Math.DegToRad(Phaser.Math.Between(-15, 15));
        this.scene.physics.velocityFromRotation(offsetAngle, this.stats.velocity, cloneBullet.body.velocity);
        cloneBullet.setData('damage', damage);
        if (this.scene.hasLighting) cloneBullet.setPipeline('Light2D');
        this.scene.time.delayedCall(2000, () => cloneBullet.active && cloneBullet.destroy(), [], this);
      }

      if (this.hasLargeProjectile) {
        bullet.setScale(2);
        bullet.setData('explosion', this.largeProjectileExplosion);
      }

      if (this.scene.hasLighting) bullet.setPipeline('Light2D');
    }

    bullets.forEach(bullet => {
      if (bullet.getData('bounce') > 0) {
        this.scene.physics.add.collider(bullet, this.scene.wallTiles, (bullet, wall) => {
          let bounceCount = bullet.getData('bounce') || 0;
          if (bounceCount > 0) {
            bullet.setData('bounce', bounceCount - 1);
            const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, wall.x, wall.y);
            bullet.body.velocity.reflect(new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)));
          } else {
            bullet.destroy();
          }
        });
      } else {
        this.scene.physics.add.collider(bullet, this.scene.wallTiles, () => bullet.destroy());
      }

      if (this.stats.redirectChance > 0 && Phaser.Math.Between(0, 99) < this.stats.redirectChance * 100) {
        this.scene.tweens.add({
          targets: bullet,
          onUpdate: () => {
            const closestEnemy = this.findClosestEnemy(bullet.x, bullet.y);
            if (closestEnemy) {
              const homingAngle = Phaser.Math.Angle.Between(bullet.x, bullet.y, closestEnemy.x, closestEnemy.y);
              const currentVelocity = bullet.body.velocity;
              const targetVelocity = Phaser.Math.Vector2.ZERO;
              this.scene.physics.velocityFromRotation(homingAngle, this.stats.velocity, targetVelocity);
              currentVelocity.lerp(targetVelocity, 0.1);
              bullet.body.velocity.set(currentVelocity.x, currentVelocity.y);
            }
          },
          duration: 2000,
        });
      }

      this.scene.time.delayedCall(2000, () => bullet.active && bullet.destroy(), [], this);
      this.scene.tweens.add({
        targets: bullet,
        onUpdate: () => {
          if (Phaser.Math.Distance.Between(x, y, bullet.x, bullet.y) > 500) bullet.destroy();
        },
        duration: 2000,
      });
    });

    if (this.hasGrenade && this.scene.time.now - this.lastGrenadeTime > this.grenadeInterval * 1000) {
      this.fireGrenade(x, y, targetX, targetY);
      this.lastGrenadeTime = this.scene.time.now;
    }

    if (this.hasMines && this.scene.time.now - this.lastMineTime > this.mineInterval * 1000) {
      this.dropMine(x, y);
      this.lastMineTime = this.scene.time.now;
    }

    if (this.hasMissile && this.scene.time.now - this.lastMissileTime > this.missileInterval * 1000) {
      this.fireMissile(x, y);
      this.lastMissileTime = this.scene.time.now;
    }

    if (this.hasSkyExplosion && this.scene.time.now - this.lastSkyExplosionTime > this.skyExplosionInterval * 1000) {
      this.triggerSkyExplosion();
      this.lastSkyExplosionTime = this.scene.time.now;
    }

    if (this.hasAreaExplosion && this.scene.time.now - this.lastAreaExplosionTime > this.areaExplosionInterval * 1000) {
      this.triggerAreaExplosion(x, y);
      this.lastAreaExplosionTime = this.scene.time.now;
    }

    if (this.hasLaser && this.scene.time.now - this.lastLaserTime > this.laserInterval * 1000) {
      this.fireLaser(x, y, targetX, targetY);
      this.lastLaserTime = this.scene.time.now;
    }

    if (this.hasEnergyExplosion && this.scene.time.now - this.lastEnergyExplosionTime > this.energyExplosionInterval * 1000) {
      this.triggerEnergyExplosion(x, y);
      this.lastEnergyExplosionTime = this.scene.time.now;
    }

    if (this.hasMeteorBarrage && this.scene.time.now - this.lastMeteorBarrageTime > this.meteorBarrageInterval * 1000) {
      this.triggerMeteorBarrage();
      this.lastMeteorBarrageTime = this.scene.time.now;
    }
  }
  applySkillEffect(effect) {
    switch (effect.type) {
      case "cooldown":
        this.stats.shootCooldown = Math.max(0.05, this.stats.shootCooldown - effect.value);
        if (effect.damagePenalty) this.stats.damage *= (1 - effect.damagePenalty);
        console.log(`Applied ${effect.type}: shootCooldown=${this.stats.shootCooldown}`);
        break;
      case "damage":
        this.stats.damage += effect.value;
        console.log(`Applied ${effect.type}: damage=${this.stats.damage}`);
        break;
      case "pierce":
        this.stats.pierce += effect.value;
        console.log(`Applied ${effect.type}: pierce=${this.stats.pierce}`);
        break;
      case "projectileCount":
        this.stats.projectileCount = effect.value;
        if (effect.spread) this.stats.spread = effect.spread;
        if (effect.pattern) this.stats.pattern = effect.pattern;
        console.log(`Applied ${effect.type}: projectileCount=${this.stats.projectileCount}`);
        break;
      case "chainShot":
        this.stats.chainShotCount = effect.value;
        console.log(`Applied ${effect.type}: chainShotCount=${this.stats.chainShotCount}`);
        break;
      case "bounce":
        this.stats.bounce += effect.value;
        console.log(`Applied ${effect.type}: bounce=${this.stats.bounce}`);
        break;
      case "explosion":
        this.stats.explosionChance = effect.value;
        console.log(`Applied ${effect.type}: explosionChance=${this.stats.explosionChance}`);
        break;
      case "grenade":
        this.enableGrenade(effect.interval);
        console.log(`Applied ${effect.type}: grenade enabled`);
        break;
      case "mine":
        this.enableMines(effect.interval);
        console.log(`Applied ${effect.type}: mines enabled`);
        break;
      case "largeProjectile":
        this.enableLargeProjectile(effect.explosion);
        console.log(`Applied ${effect.type}: largeProjectile enabled`);
        break;
      case "missile":
        this.enableMissile(effect.interval);
        console.log(`Applied ${effect.type}: missile enabled`);
        break;
      case "shockwaveOnDamage":
        // Handled in GameScene
        break;
      case "chainExplosion":
        this.stats.chainExplosionChance = effect.chance;
        console.log(`Applied ${effect.type}: chainExplosionChance=${this.stats.chainExplosionChance}`);
        break;
      case "skyExplosion":
        this.enableSkyExplosion(effect.interval);
        console.log(`Applied ${effect.type}: skyExplosion enabled`);
        break;
      case "fireTrail":
        this.enableFireTrail(effect.duration);
        console.log(`Applied ${effect.type}: fireTrail enabled`);
        break;
      case "areaExplosion":
        this.enableAreaExplosion(effect.interval);
        console.log(`Applied ${effect.type}: areaExplosion enabled`);
        break;
      case "multiExplosion":
        this.stats.multiExplosionCount = effect.count;
        console.log(`Applied ${effect.type}: multiExplosionCount=${this.stats.multiExplosionCount}`);
        break;
      case "deflect":
        this.stats.redirectChance = effect.chance;
        console.log(`Applied ${effect.type}: redirectChance=${this.stats.redirectChance}`);
        break;
      case "explosionOnCritical":
        this.stats.explosionOnCritical = effect.radius;
        console.log(`Applied ${effect.type}: explosionOnCritical=${this.stats.explosionOnCritical}`);
        break;
      case "laser":
        this.enableLaser(effect.interval);
        console.log(`Applied ${effect.type}: laser enabled`);
        break;
      case "energyExplosion":
        this.enableEnergyExplosion(effect.interval);
        console.log(`Applied ${effect.type}: energyExplosion enabled`);
        break;
      case "meteorBarrage":
        this.enableMeteorBarrage(effect.interval);
        console.log(`Applied ${effect.type}: meteorBarrage enabled`);
        break;
      case "damageBoost":
        this.stats.damageBoost = effect.value;
        this.stats.defensePenalty = effect.defensePenalty || 0;
        console.log(`Applied ${effect.type}: damageBoost=${this.stats.damageBoost}`);
        break;
      case "explosiveProjectiles":
        this.stats.explosiveProjectiles = effect.value;
        console.log(`Applied ${effect.type}: explosiveProjectiles=${this.stats.explosiveProjectiles}`);
        break;
      case "areaEffect":
        this.enableAreaExplosion(5);
        console.log(`Applied ${effect.type}: areaEffect as areaExplosion`);
        break;
      case "randomEffect":
        const randomEffects = ["damage", "pierce", "projectileCount"];
        const randomEffect = randomEffects[Math.floor(Math.random() * randomEffects.length)];
        this.applySkillEffect({ type: randomEffect, value: 0.1 });
        console.log(`Applied ${effect.type}: random effect ${randomEffect}`);
        break;
      default:
        console.log(`Skill ${effect.type} passed to GameScene`);
    }
  }
  fireGrenade(x, y, targetX, targetY) {
    const grenade = this.bullets.create(x, y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(y);
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    this.scene.physics.velocityFromRotation(angle, this.stats.velocity * 0.5, grenade.body.velocity);
    grenade.setData('damage', this.stats.damage * 2);
    grenade.setData('explosion', true);
    if (this.scene.hasLighting) grenade.setPipeline('Light2D');
    this.scene.time.delayedCall(3000, () => {
      if (grenade.active) {
        this.explode(grenade, 50);
        grenade.destroy();
      }
    }, [], this);
    console.log("Grenade fired with explosion on impact");
  }

  dropMine(x, y) {
    const mine = this.bullets.create(x, y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(y);
    mine.setData('damage', this.stats.damage * 1.5);
    mine.setData('explosion', true);
    if (this.scene.hasLighting) mine.setPipeline('Light2D');
    this.scene.physics.add.overlap(mine, this.scene.enemyManager.getEnemies(), (mine, enemy) => {
      this.explode(mine, 40);
      mine.destroy();
    });
    this.scene.time.delayedCall(10000, () => mine.active && mine.destroy(), [], this);
    console.log("Proximity mine dropped");
  }

  enableLargeProjectile(explosion) {
    this.hasLargeProjectile = true;
    this.largeProjectileExplosion = explosion;
    console.log("Large Projectile enabled with explosion:", explosion);
  }

  fireMissile(x, y) {
    const missile = this.bullets.create(x, y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(y);
    missile.setData('damage', this.stats.damage * 3);
    missile.setData('explosion', true);
    if (this.scene.hasLighting) missile.setPipeline('Light2D');
    this.scene.tweens.add({
      targets: missile,
      onUpdate: () => {
        const closestEnemy = this.findClosestEnemy(missile.x, missile.y);
        if (closestEnemy) {
          const angle = Phaser.Math.Angle.Between(missile.x, missile.y, closestEnemy.x, closestEnemy.y);
          this.scene.physics.velocityFromRotation(angle, this.stats.velocity * 0.8, missile.body.velocity);
        }
      },
      duration: 5000,
    });
    this.scene.time.delayedCall(5000, () => {
      if (missile.active) {
        this.explode(missile, 60);
        missile.destroy();
      }
    }, [], this);
    console.log("Guided Missile fired");
  }

  triggerSkyExplosion() {
    const enemies = this.scene.enemyManager.getEnemies().getChildren();
    const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
    if (!targetEnemy) return;
    const explosion = this.scene.add.circle(targetEnemy.x, targetEnemy.y, 50, 0xff0000, 0.5)
      .setDepth(targetEnemy.y);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      duration: 500,
      onComplete: () => explosion.destroy(),
    });
    this.scene.physics.add.overlap(explosion, this.scene.enemyManager.getEnemies(), (explosion, enemy) => {
      const enemyData = enemy.getData('enemyData');
      enemyData.health -= this.stats.damage * 2;
      if (enemyData.health <= 0) enemy.destroy();
    });
    console.log("Sky Explosion triggered");
  }

  enableFireTrail(duration) {
    this.hasFireTrail = true;
    this.fireTrailDuration = duration;
    console.log("Fire Trail enabled with duration:", duration);
  }

  triggerAreaExplosion(x, y) {
    const explosion = this.scene.add.circle(x, y, 70, 0xff0000, 0.5)
      .setDepth(y);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      duration: 500,
      onComplete: () => explosion.destroy(),
    });
    this.scene.physics.add.overlap(explosion, this.scene.enemyManager.getEnemies(), (explosion, enemy) => {
      const enemyData = enemy.getData('enemyData');
      enemyData.health -= this.stats.damage * 1.5;
      if (enemyData.health <= 0) enemy.destroy();
    });
    console.log("Area Explosion triggered");
  }

  fireLaser(x, y, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const laser = this.scene.add.rectangle(x, y, 1000, 5, 0x00ff00)
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setDepth(y);
    if (this.scene.hasLighting) laser.setPipeline('Light2D');
    this.scene.tweens.add({
      targets: laser,
      alpha: 0,
      duration: 300,
      onComplete: () => laser.destroy(),
    });
    this.scene.physics.add.overlap(laser, this.scene.enemyManager.getEnemies(), (laser, enemy) => {
      const enemyData = enemy.getData('enemyData');
      enemyData.health -= this.stats.damage * 2;
      if (enemyData.health <= 0) enemy.destroy();
    });
    console.log("Laser fired");
  }

  triggerEnergyExplosion(x, y) {
    const explosion = this.scene.add.circle(x, y, 80, 0x00ffff, 0.5)
      .setDepth(y);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      duration: 500,
      onComplete: () => explosion.destroy(),
    });
    this.scene.physics.add.overlap(explosion, this.scene.enemyManager.getEnemies(), (explosion, enemy) => {
      const enemyData = enemy.getData('enemyData');
      enemyData.health -= this.stats.damage * 2.5;
      if (enemyData.health <= 0) enemy.destroy();
    });
    console.log("Energy Explosion triggered");
  }

  triggerMeteorBarrage() {
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 500, () => {
        const x = Phaser.Math.Between(this.scene.cameras.main.worldView.left, this.scene.cameras.main.worldView.right);
        const y = this.scene.cameras.main.worldView.top;
        const meteor = this.bullets.create(x, y, "bullet-placeholder")
          .setOrigin(0.5, 0.5)
          .setDepth(y);
        this.scene.physics.velocityFromRotation(Phaser.Math.DegToRad(90), this.stats.velocity, meteor.body.velocity);
        meteor.setData('damage', this.stats.damage * 2);
        meteor.setData('explosion', true);
        if (this.scene.hasLighting) meteor.setPipeline('Light2D');
        this.scene.physics.add.collider(meteor, this.scene.wallTiles, () => {
          this.explode(meteor, 50);
          meteor.destroy();
        });
      }, [], this);
    }
    console.log("Meteor Barrage triggered");
  }

  explode(bullet, radius) {
    const explosion = this.scene.add.circle(bullet.x, bullet.y, radius, 0xff0000, 0.5)
      .setDepth(bullet.y);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      duration: 500,
      onComplete: () => explosion.destroy(),
    });
    this.scene.physics.add.overlap(explosion, this.scene.enemyManager.getEnemies(), (explosion, enemy) => {
      const enemyData = enemy.getData('enemyData');
      enemyData.health -= bullet.getData('damage');
      if (enemyData.health <= 0) {
        enemy.destroy();
        if (this.stats.chainExplosionChance > 0 && Phaser.Math.Between(0, 99) < this.stats.chainExplosionChance * 100) {
          this.chainExplosion(enemy, radius * 0.8);
        }
      }
    });
  }

  chainExplosion(enemy, radius) {
    const explosion = this.scene.add.circle(enemy.x, enemy.y, radius, 0xff0000, 0.5)
      .setDepth(enemy.y);
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      duration: 500,
      onComplete: () => explosion.destroy(),
    });
    this.scene.physics.add.overlap(explosion, this.scene.enemyManager.getEnemies(), (explosion, enemy) => {
      const enemyData = enemy.getData('enemyData');
      enemyData.health -= this.stats.damage * 0.8;
      if (enemyData.health <= 0) enemy.destroy();
    });
    console.log("Chain Explosion triggered");
  }

  findClosestEnemy(bulletX, bulletY) {
    const enemies = this.scene.enemyManager.getEnemies().getChildren();
    let closestEnemy = null;
    let minDistance = Infinity;

    enemies.forEach(enemy => {
      if (enemy.active) {
        const distance = Phaser.Math.Distance.Between(bulletX, bulletY, enemy.x, enemy.y);
        if (distance < minDistance && distance < 300) {
          minDistance = distance;
          closestEnemy = enemy;
        }
      }
    });

    return closestEnemy;
  }

  enableDumbBullets() {
    this.hasDumbBullets = true;
  }

  disableDumbBullets() {
    this.hasDumbBullets = false;
  }

  enableProjectileTaming() {
    this.hasProjectileTaming = true;
  }

  disableProjectileTaming() {
    this.hasProjectileTaming = false;
  }

  enableCloneGenerator() {
    this.hasCloneGenerator = true;
  }

  disableCloneGenerator() {
    this.hasCloneGenerator = false;
  }

  enableGrenade(interval) {
    this.hasGrenade = true;
    this.grenadeInterval = interval;
  }

  enableMines(interval) {
    this.hasMines = true;
    this.mineInterval = interval;
  }

  enableMissile(interval) {
    this.hasMissile = true;
    this.missileInterval = interval;
  }

  enableSkyExplosion(interval) {
    this.hasSkyExplosion = true;
    this.skyExplosionInterval = interval;
  }

  enableFireTrail(duration) {
    this.hasFireTrail = true;
    this.fireTrailDuration = duration;
  }

  enableAreaExplosion(interval) {
    this.hasAreaExplosion = true;
    this.areaExplosionInterval = interval;
  }

  enableLaser(interval) {
    this.hasLaser = true;
    this.laserInterval = interval;
  }

  enableEnergyExplosion(interval) {
    this.hasEnergyExplosion = true;
    this.energyExplosionInterval = interval;
  }

  enableMeteorBarrage(interval) {
    this.hasMeteorBarrage = true;
    this.meteorBarrageInterval = interval;
  }

  updateShotStats(newStats) {
    this.stats = { ...this.stats, ...newStats };
  }

  handleBulletEnemyCollision(bullet, enemySprite) {
    let pierceCount = bullet.getData('pierce') || 0;
    const damage = bullet.getData('damage') || this.stats.damage;
    const enemyData = enemySprite.getData('enemyData');
    if (!enemyData) return;

    enemyData.health -= damage;
    enemyData.lastDamageTime = this.scene.time.now;
    enemySprite.setData('enemyData', enemyData);

    this.scene.enemyManager.updateHealthBar(enemySprite);
    if (enemySprite.healthBar) enemySprite.healthBar.setVisible(true);

    if (bullet.getData('slowEffect')) {
      const slow = bullet.getData('slowEffect');
      enemyData.speed *= slow.speedReduction;
      this.scene.time.delayedCall(slow.duration, () => {
        enemyData.speed /= slow.speedReduction;
      }, [], this);
    }

    if (this.hasShockwaveOnDamage) {
      this.explode(bullet, this.shockwaveRadius);
    }

    if (this.stats.explosionOnCritical > 0 && Phaser.Math.Between(0, 99) < 10) {
      this.explode(bullet, this.stats.explosionOnCritical);
    }

    if (bullet.getData('explosionChance') > 0 && Phaser.Math.Between(0, 99) < bullet.getData('explosionChance') * 100) {
      this.explode(bullet, 30);
    }

    if (bullet.getData('explosiveProjectiles') > 0) {
      this.explode(bullet, 40);
    }

    if (bullet.getData('chainShotCount') > 0 && enemyData.health <= 0) {
      const chainCount = bullet.getData('chainShotCount');
      bullet.setData('chainShotCount', chainCount - 1);
      const closestEnemy = this.findClosestEnemy(enemySprite.x, enemySprite.y);
      if (closestEnemy) {
        const newBullet = this.bullets.create(enemySprite.x, enemySprite.y, "bullet-placeholder")
          .setOrigin(0.5, 0.5)
          .setDepth(enemySprite.y);
        const angle = Phaser.Math.Angle.Between(enemySprite.x, enemySprite.y, closestEnemy.x, closestEnemy.y);
        this.scene.physics.velocityFromRotation(angle, this.stats.velocity, newBullet.body.velocity);
        newBullet.setData('damage', damage);
        newBullet.setData('chainShotCount', chainCount - 1);
        if (this.scene.hasLighting) newBullet.setPipeline('Light2D');
        this.scene.time.delayedCall(2000, () => newBullet.active && newBullet.destroy(), [], this);
      }
    }

    if (enemyData.health <= 0) {
      if (enemySprite.healthBar) enemySprite.healthBar.destroy();
      enemySprite.destroy();

      if (this.stats.chainExplosionChance > 0 && Phaser.Math.Between(0, 99) < this.stats.chainExplosionChance * 100) {
        this.chainExplosion(enemySprite, 30);
      }

      if (this.stats.multiExplosionCount > 0) {
        for (let i = 0; i < this.stats.multiExplosionCount; i++) {
          this.scene.time.delayedCall(i * 200, () => this.explode(bullet, 30), [], this);
        }
      }
    }

    if (pierceCount > 0) {
      bullet.setData('pierce', pierceCount - 1);
    } else if (bullet.getData('explosion')) {
      this.explode(bullet, 50);
      bullet.destroy();
    } else {
      bullet.destroy();
    }
  }
}