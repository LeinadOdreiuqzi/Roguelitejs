export class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.playerHealthText = null;
    this.healthBar = null;
    this.healthBarBorder = null;
    this.noclipText = null;
    this.debugRoomText = null;
    this.versionText = null;
    this.levelText = null;
    this.xpText = null;
    this.xpBar = null;
    this.xpBarBorder = null;
  }

  createUI(playerHealth, noclipMode, version) {
    // Health UI
    this.healthBarBorder = this.scene.add.rectangle(0, 0, 102, 12, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002)
      .setStrokeStyle(2, 0xffffff);
    this.healthBar = this.scene.add.rectangle(0, 0, 100, 10, 0xff0000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001);
    this.playerHealthText = this.scene.add.text(0, 0, `Health: ${Math.floor(playerHealth)}`, {
      fontSize: "16px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // Noclip UI
    this.noclipText = this.scene.add.text(0, 0, `Noclip: ${noclipMode ? "ON" : "OFF"}`, {
      fontSize: "16px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // Version UI
    this.versionText = this.scene.add.text(0, 0, version, {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // Level UI
    const playerLevel = this.scene.registry.get('playerLevel') || 1;
    this.levelText = this.scene.add.text(0, 0, `Level: ${playerLevel}`, {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // XP UI
    const playerXP = this.scene.registry.get('playerXP') || 0;
    const xpNeeded = this.scene.scene.get("GameScene").getXPForNextLevel();
    this.xpBarBorder = this.scene.add.rectangle(0, 0, 102, 12, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002)
      .setStrokeStyle(2, 0xffffff);
    this.xpBar = this.scene.add.rectangle(0, 0, 100, 10, 0x00ff00)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001);
    this.xpText = this.scene.add.text(0, 0, `XP: ${Math.floor(playerXP)}/${xpNeeded}`, {
      fontSize: "14px",
      color: "#00ff00",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    this.updateUIPosition(0, 0, 0, 0);
  }

  updateHealth(health) {
    if (this.playerHealthText && this.healthBar) {
      const healthPercentage = Math.max(0, Math.min(1, health / 100));
      this.playerHealthText.setText(`Health: ${Math.floor(health)}`);
      this.healthBar.width = 100 * healthPercentage;
      this.healthBar.setFillStyle(healthPercentage > 0.3 ? 0xff0000 : 0xff4500);
    }
  }

  updateNoclip(noclipMode) {
    if (this.noclipText) {
      this.noclipText.setText(`Noclip: ${noclipMode ? "ON" : "OFF"}`);
    }
  }

  updateDebugRoom(room) {
    if (this.debugRoomText) this.debugRoomText.destroy();
    this.debugRoomText = this.scene.add.text(0, 0, `Room ${room.id} (${room.width}x${room.height})`, {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);
  }

  updateLevel(level) {
    if (this.levelText) {
      console.log(`UIManager: Updating level to ${level}`);
      this.levelText.setText(`Level: ${level}`);
      this.levelUpNotification();
    }
  }

  updateXP(xp) {
    if (this.xpText && this.xpBar) {
      const xpNeeded = this.scene.scene.get("GameScene").getXPForNextLevel();
      const xpPercentage = Math.max(0, Math.min(1, xp / xpNeeded));
      this.xpText.setText(`XP: ${Math.floor(xp)}/${xpNeeded}`);
      this.xpBar.width = 100 * xpPercentage;
      console.log(`UIManager: Updated XP to ${Math.floor(xp)}/${xpNeeded} (${(xpPercentage * 100).toFixed(1)}%)`);
    }
  }

  levelUpNotification() {
    const levelUpText = this.scene.add.text(this.scene.cameras.main.scrollX + 400, this.scene.cameras.main.scrollY + 300, "Level Up!", {
      fontSize: "32px",
      color: "#00ff00",
      stroke: "#000000",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);
    this.scene.tweens.add({
      targets: levelUpText,
      alpha: 0,
      y: levelUpText.y - 50,
      duration: 2000,
      onComplete: () => levelUpText.destroy(),
    });
  }

  showGameOver(playerX, playerY) {
    const gameOverText = this.scene.add.text(playerX, playerY - 50, "Game Over!", {
      fontSize: "32px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);
    this.scene.time.delayedCall(2000, () => {
      this.scene.scene.restart();
    });
  }

  updateUIPosition(playerX, playerY, cameraScrollX, cameraScrollY) {
    const offsetX = cameraScrollX + 50;
    const offsetY = cameraScrollY + 50;

    if (this.healthBarBorder) {
      this.healthBarBorder.setPosition(offsetX, offsetY);
    }
    if (this.healthBar) {
      this.healthBar.setPosition(offsetX + 1, offsetY + 1);
    }
    if (this.playerHealthText) {
      this.playerHealthText.setPosition(offsetX + 110, offsetY - 5);
    }
    if (this.noclipText) {
      this.noclipText.setPosition(offsetX, offsetY - 25);
    }
    if (this.versionText) {
      this.versionText.setPosition(offsetX, offsetY + 25);
    }
    if (this.debugRoomText) {
      this.debugRoomText.setPosition(offsetX, offsetY + 45);
    }
    if (this.levelText) {
      this.levelText.setPosition(offsetX, offsetY + 65);
    }
    if (this.xpBarBorder) {
      this.xpBarBorder.setPosition(offsetX, offsetY + 85);
    }
    if (this.xpBar) {
      this.xpBar.setPosition(offsetX + 1, offsetY + 86);
    }
    if (this.xpText) {
      this.xpText.setPosition(offsetX + 110, offsetY + 80);
    }
  }
}