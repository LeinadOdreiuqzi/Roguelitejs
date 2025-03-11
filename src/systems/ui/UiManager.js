export class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.playerHealthText = null;
    this.healthBar = null;
    this.healthBarBorder = null;
    this.noclipText = null;
    this.debugRoomText = null;
    this.versionText = null;
  }

  createUI(playerHealth, noclipMode, version) {
    // Health Bar
    this.healthBarBorder = this.scene.add.rectangle(0, 0, 102, 12, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1002)
      .setStrokeStyle(2, 0xffffff);
    this.healthBar = this.scene.add.rectangle(0, 0, 100, 10, 0xff0000)
      .setOrigin(0, 0)
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1001);

    // Health Text
    this.playerHealthText = this.scene.add.text(0, 0, `Health: ${Math.floor(playerHealth)}`, {
      fontSize: "16px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1001);

    // Noclip Text
    this.noclipText = this.scene.add.text(0, 0, `Noclip: ${noclipMode ? "ON" : "OFF"}`, {
      fontSize: "16px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    })
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1001);

    // Version Text
    this.versionText = this.scene.add.text(0, 0, version, {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1001);

    // Ensure initial UI position is set
    this.updateUIPosition(0, 0, 0, 0); // Initial call with dummy values
  }

  updateHealth(health) {
    if (this.playerHealthText && this.healthBar) {
      const healthPercentage = Math.max(0, Math.min(1, health / 100));
      this.playerHealthText.setText(`Health: ${Math.floor(health)}`);
      this.healthBar.width = 100 * healthPercentage; // Update health bar width
      this.healthBar.setFillStyle(healthPercentage > 0.3 ? 0xff0000 : 0xff4500); // Red to Orange below 30%
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
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1001);
  }

  showGameOver(playerX, playerY) {
    const gameOverText = this.scene.add.text(playerX, playerY - 50, "Game Over!", {
      fontSize: "32px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setScrollFactor(0) // Fixed to screen
      .setDepth(1001);
    this.scene.time.delayedCall(2000, () => {
      this.scene.scene.restart();
    });
  }

  // Update UI position to follow player's view
  updateUIPosition(playerX, playerY, cameraScrollX, cameraScrollY) {
    const offsetX = cameraScrollX + 50; // Adjusted to 50 pixels from left edge
    const offsetY = cameraScrollY + 50;  // Adjusted to 50 pixels from top edge

    // Update positions of UI elements
    if (this.healthBarBorder) {
      this.healthBarBorder.setPosition(offsetX, offsetY);
    }
    if (this.healthBar) {
      this.healthBar.setPosition(offsetX + 1, offsetY + 1); // Slight offset to align inside border
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
  }
}