import Phaser from "phaser";

export class WeaponManager {
  constructor(scene, stats) {
    this.scene = scene;
    this.stats = stats;
    this.bullets = scene.bullets;
    this.hasDumbBullets = false;
    this.hasProjectileTaming = false;
    this.hasCloneGenerator = false;
  }

  fireBullet(x, y, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const bullet = this.bullets.create(x, y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(y);
    this.scene.physics.velocityFromRotation(angle, this.stats.velocity, bullet.body.velocity);
    bullet.setData('damage', this.stats.damage);

    if (this.hasDumbBullets && Phaser.Math.Between(0, 99) < 10) {
      bullet.setData('slowEffect', { duration: 2000, speedReduction: 0.5 });
      console.log("Dumb Bullet fired: 10% chance to slow enemies applied");
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
      console.log("Projectile Taming: Bullet homing enabled");
    }

    if (this.hasCloneGenerator && Phaser.Math.Between(0, 99) < 15) {
      const cloneBullet = this.bullets.create(x, y, "bullet-placeholder")
        .setOrigin(0.5, 0.5)
        .setDepth(y);
      const offsetAngle = angle + Phaser.Math.DegToRad(Phaser.Math.Between(-15, 15));
      this.scene.physics.velocityFromRotation(offsetAngle, this.stats.velocity, cloneBullet.body.velocity);
      cloneBullet.setData('damage', this.stats.damage);
      if (this.scene.hasLighting) cloneBullet.setPipeline('Light2D');
      this.scene.time.delayedCall(2000, () => cloneBullet.active && cloneBullet.destroy(), [], this);
      console.log("Clone Generator: Bullet duplicated");
    }

    console.log(`Fired bullet with damage: ${this.stats.damage}, velocity: ${this.stats.velocity}`);
    if (this.scene.hasLighting) bullet.setPipeline('Light2D');

    this.scene.time.delayedCall(2000, () => {
      if (bullet.active) {
        console.log("Bullet lifespan expired, destroying...");
        bullet.destroy();
      }
    }, [], this);

    this.scene.tweens.add({
      targets: bullet,
      onUpdate: () => {
        if (Phaser.Math.Distance.Between(x, y, bullet.x, bullet.y) > 500) {
          console.log("Bullet exceeded max distance (500px), destroying...");
          bullet.destroy();
        }
      },
      duration: 2000,
    });
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

  updateShotStats(newStats) {
    this.stats = newStats;
  }

  handleBulletEnemyCollision(bullet, enemySprite) {
    const damage = bullet.getData('damage') || this.stats.damage;
    const enemyData = enemySprite.getData('enemyData');
    if (!enemyData) return;

    enemyData.health -= damage;
    enemyData.lastDamageTime = this.scene.time.now;
    enemySprite.setData('enemyData', enemyData);

    this.scene.enemyManager.updateHealthBar(enemySprite);
    if (enemySprite.healthBar) {
      enemySprite.healthBar.setVisible(true);
    }

    if (bullet.getData('slowEffect')) {
      const slow = bullet.getData('slowEffect');
      enemyData.speed *= slow.speedReduction;
      this.scene.time.delayedCall(slow.duration, () => {
        enemyData.speed /= slow.speedReduction;
      }, [], this);
      console.log(`Applied slow effect to enemy: ${slow.speedReduction}x speed for ${slow.duration}ms`);
    }

    if (enemyData.health <= 0) {
      if (enemySprite.healthBar) {
        enemySprite.healthBar.destroy(); // Destroy the health bar when enemy is killed
      }
      enemySprite.destroy();
      console.log("Enemy destroyed by bullet");
    }

    bullet.destroy();
  }
}