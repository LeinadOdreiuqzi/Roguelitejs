import Phaser from "phaser";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data) {
    const { x, y } = data;

    // Create a group to manage game over elements
    this.gameOverGroup = this.add.group();

    // Add blur effect using a semi-transparent overlay
    const blurOverlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(1000);
    this.gameOverGroup.add(blurOverlay);

    // Game Over text
    const gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, "Game Over!", {
      fontSize: "64px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.gameOverGroup.add(gameOverText);

    // Seed text
    const seed = this.registry.get('seed');
    const seedText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 20, `Seed: ${seed}`, {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.gameOverGroup.add(seedText);

    // Back to Menu button
    const menuButtonRect = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY + 100, 200, 50, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1001)
      .on("pointerover", () => this.tweens.add({ targets: menuButtonRect, scale: 1.1, duration: 100 }))
      .on("pointerout", () => this.tweens.add({ targets: menuButtonRect, scale: 1, duration: 100 }))
      .on("pointerdown", () => {
        this.gameOverGroup.destroy(true);
        this.scene.stop();
        this.scene.start("MenuScene");
      });
    this.gameOverGroup.add(menuButtonRect);

    const menuButtonText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 100, "Back to Menu", {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
    this.gameOverGroup.add(menuButtonText);
  }
}