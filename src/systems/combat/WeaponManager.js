export class WeaponManager {
  constructor(scene) {
    this.scene = scene;
    this.bullets = scene.bullets; // Reference to the bullets group
    this.bulletSpeed = 600; // Increased speed for visibility
    this.shootCooldown = 200; // Matches GameScene cooldown
    if (!this.bullets) {
      console.error("Bullets group is undefined in WeaponManager!");
      this.bullets = scene.physics.add.group(); // Fallback initialization
    }
    this.hasLighting = scene.hasLighting; // Sync lighting flag
  }

  fireBullet(x, y, targetX, targetY) {
    if (!this.bullets) {
      console.error("Cannot fire bullet: bullets group is undefined!");
      return;
    }

    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const velocityX = Math.cos(angle) * this.bulletSpeed;
    const velocityY = Math.sin(angle) * this.bulletSpeed;

    // Use bullet-placeholder directly
    const bullet = this.bullets.create(x, y, "bullet-placeholder")
      .setScale(2) // Make bullet larger for visibility
      .setDepth(100);
    if (this.hasLighting) bullet.setPipeline('Light2D');

    bullet.body.setVelocity(velocityX, velocityY);
    bullet.body.setCollideWorldBounds(false);

    // Attach light to bullet only if lighting is enabled
    if (this.hasLighting) {
      const bulletLight = this.scene.lights.addLight(x, y, 50, 0xffff00, 2.0); // Increased radius to 50, intensity to 2.0
      bulletLight.setScrollFactor(1); // Ensure light moves with the world
      bullet.setData('light', bulletLight); // Store light reference in bullet data
      console.log("Bullet light created at", x, y, "with radius 50 and intensity 2.0");
    }
  }
}