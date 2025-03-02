// /src/systems/combat/WeaponManager.js
export class WeaponManager {
    constructor(scene) {
      this.scene = scene;
      this.bullets = this.scene.physics.add.group({
        maxSize: 50,
        defaultKey: 'bullet',
        createMultiple: { quantity: 50, active: false, visible: false }
      });
    }
  
    fireBullet(x, y, direction) {
      const bullet = this.bullets.get(x, y);
      if (bullet) {
        bullet.setActive(true).setVisible(true);
        bullet.setVelocityX(direction * 400);
        bullet.setDepth(bullet.y);
  
        // Simular trayectoria 3D
        this.scene.tweens.add({
          targets: bullet,
          scale: 0.5,
          duration: 500,
          onUpdate: () => {
            bullet.setScale(1.2 - bullet.y / 600); // Efecto parabólico
          },
          onComplete: () => {
            bullet.setActive(false).setVisible(false);
          }
        });
      }
    }
  }