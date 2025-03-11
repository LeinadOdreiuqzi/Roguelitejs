import Phaser from "phaser";

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super("HUDScene");
    this.playerHealth = 100;
    this.noclipMode = false;
    this.currentRoom = null;
    this.version = "Version 1.2.1: Large Rooms & Markers";

    // UI Elements
    this.healthBarBorder = null;
    this.healthBar = null;
    this.playerHealthText = null;
    this.noclipText = null;
    this.versionText = null;
    this.debugRoomText = null;
  }

  create() {
    // Health Bar
    this.healthBarBorder = this.add.rectangle(50, 50, 102, 12, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002)
      .setStrokeStyle(2, 0xffffff);
    this.healthBar = this.add.rectangle(51, 51, 100, 10, 0xff0000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001);

    // Health Text
    this.playerHealthText = this.add.text(160, 45, `Health: ${Math.floor(this.playerHealth)}`, {
      fontSize: "16px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // Noclip Text
    this.noclipText = this.add.text(50, 25, `Noclip: ${this.noclipMode ? "ON" : "OFF"}`, {
      fontSize: "16px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // Version Text
    this.versionText = this.add.text(50, 75, this.version, {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);

    // Debug Room Text (initially null until updated)
    this.debugRoomText = null;

    // Listen for game events to update HUD
    this.registry.events.on('updateHealth', (health) => this.updateHealth(health));
    this.registry.events.on('updateNoclip', (noclip) => this.updateNoclip(noclip));
    this.registry.events.on('updateRoom', (room) => this.updateDebugRoom(room));
  }

  updateHealth(health) {
    this.playerHealth = health;
    if (this.playerHealthText && this.healthBar) {
      const healthPercentage = Math.max(0, Math.min(1, health / 100));
      this.playerHealthText.setText(`Health: ${Math.floor(health)}`);
      this.healthBar.width = 100 * healthPercentage;
      this.healthBar.setFillStyle(healthPercentage > 0.3 ? 0xff0000 : 0xff4500);
    }
  }

  updateNoclip(noclipMode) {
    this.noclipMode = noclipMode;
    if (this.noclipText) {
      this.noclipText.setText(`Noclip: ${noclipMode ? "ON" : "OFF"}`);
    }
  }

  updateDebugRoom(room) {
    this.currentRoom = room;
    if (this.debugRoomText) this.debugRoomText.destroy();
    this.debugRoomText = this.add.text(50, 95, `Room ${room.id} (${room.width}x${room.height})`, {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })
      .setScrollFactor(0)
      .setDepth(1001);
  }
}