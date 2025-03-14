import Phaser from "phaser";

export class WeaponManager {
  constructor(scene, stats) {
    this.scene = scene;
    this.stats = stats;
    this.bullets = scene.bullets;
  }

  fireBullet(x, y, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const bullet = this.bullets.create(x, y, "bullet-placeholder")
      .setOrigin(0.5, 0.5)
      .setDepth(y);
    this.scene.physics.velocityFromRotation(angle, this.stats.velocity, bullet.body.velocity);
    bullet.setData('damage', this.stats.damage);
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

  updateShotStats(newStats) {
    this.stats = newStats;
  }
}