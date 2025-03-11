import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    // Background and title with black/white design
    this.cameras.main.setBackgroundColor("#000000");
    this.add.text(this.cameras.main.centerX, 100, "RogueliteJS", {
      fontSize: "64px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Start Button
    const startButtonRect = this.add.rectangle(this.cameras.main.centerX, 200, 200, 50, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
      .on("pointerover", () => this.tweens.add({ targets: this.children.list[1], scale: 1.1, duration: 100 }))
      .on("pointerout", () => this.tweens.add({ targets: this.children.list[1], scale: 1, duration: 100 }))
      .on("pointerdown", () => this.startGame());

    this.add.text(this.cameras.main.centerX, 200, "Start", {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Settings Button
    this.add.rectangle(this.cameras.main.centerX, 260, 200, 50, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
      .on("pointerover", () => this.tweens.add({ targets: this.children.list[3], scale: 1.1, duration: 100 }))
      .on("pointerout", () => this.tweens.add({ targets: this.children.list[3], scale: 1, duration: 100 }))
      .on("pointerdown", () => console.log("Settings clicked"));

    this.add.text(this.cameras.main.centerX, 260, "Settings", {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Seed Input and Button (optional input, random if empty)
    const seedInput = this.add.dom(this.cameras.main.centerX, 330, "input", {
      type: "text",
      placeholder: "Enter Seed (optional)",
      width: "200px",
      height: "30px",
      style: "text-align: center; font-size: 16px; background: #000000; color: #ffffff; border: 2px solid #ffffff;",
    }).setOrigin(0.5);

    const setSeedButtonRect = this.add.rectangle(this.cameras.main.centerX, 370, 200, 50, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
      .on("pointerover", () => this.tweens.add({ targets: this.children.list[5], scale: 1.1, duration: 100 }))
      .on("pointerout", () => this.tweens.add({ targets: this.children.list[5], scale: 1, duration: 100 }))
      .on("pointerdown", () => {
        const seed = seedInput.node.value || Math.floor(Math.random() * 1000000).toString();
        this.startGame(seed);
        console.log("Seed set to:", seed);
      });

    this.add.text(this.cameras.main.centerX, 370, "Set Seed", {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5);
  }

  startGame(seed = null) {
    this.scene.start("GameScene", { seed: seed || Math.floor(Math.random() * 1000000).toString() });
  }
}