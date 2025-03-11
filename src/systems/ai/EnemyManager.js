export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.TILE_SIZE = scene.TILE_SIZE;
  }

  spawnEnemy(x, y) {
    const posX = (x - y) * this.TILE_SIZE;
    const posY = (x + y) * (this.TILE_SIZE / 2);
    const enemy = this.scene.physics.add.sprite(posX, posY, "enemy-placeholder")
      .setOrigin(0.5, 0.8)
      .setDepth(posY)
      .setPipeline('Light2D');
    enemy.health = 20; // Increased health for balance
    enemy.body.setSize(16, 12).setOffset(6, 16);
    this.enemies.push(enemy);
    return enemy;
  }

  updateEnemyAI() {
    this.enemies.forEach(enemy => {
      if (!enemy.active) return;
      const distance = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y);
      if (distance < 200) {
        this.scene.physics.moveToObject(enemy, this.scene.player, 100);
        if (distance < 20) enemy.setVelocity(0);
      } else {
        enemy.setVelocity(0);
      }
    });
  }

  handleBulletEnemyCollision(bullet, enemy) {
    bullet.destroy();
    enemy.health -= 10; // Increased damage to 10 per hit
    if (enemy.health <= 0) {
      enemy.destroy();
      this.enemies = this.enemies.filter(e => e !== enemy);
      console.log("Enemy defeated!");
    }
  }

  getEnemies() {
    return this.enemies;
  }
}