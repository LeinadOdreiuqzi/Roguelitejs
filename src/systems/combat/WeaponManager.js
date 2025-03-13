export class WeaponManager {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.bullets;
  }

  fireBullet(playerX, playerY, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
    const velocityX = Math.cos(angle) * 400;
    const velocityY = Math.sin(angle) * 400;

    const bullet = this.bullets.create(playerX, playerY, "bullet-placeholder")
      .setDisplaySize(8, 8)
      .setOrigin(0.5, 0.5);
    bullet.body.setVelocity(velocityX, velocityY);
    bullet.setDepth(playerY);

    // Removed light creation for bullets
    // if (this.scene.hasLighting) {
    //   bullet.light = this.scene.lights.addLight(playerX, playerY, 20, 0xff0000, 0.5);
    // }
  }
}