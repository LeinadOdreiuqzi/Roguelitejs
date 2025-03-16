import Phaser from "phaser";

export default class SkillMenuScene extends Phaser.Scene {
  constructor() {
    super("SkillMenuScene");
    this.selectedSkill = null;
    this.isInitialSelection = false;
  }

  init(data) {
    this.isInitialSelection = data.isInitial || false;
  }

  create() {
    // Pause the game
    this.scene.pause("GameScene");

    // Create a semi-transparent overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(1000);

    // Title based on context
    const title = this.isInitialSelection ? "Choose Initial Skill" : "Choose a Skill (Level Milestone)";
    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, title, {
      fontSize: "32px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Pool of possible skills
    const skillPool = [
      { id: "damageBoost", name: "Damage Boost", effect: () => this.registry.events.emit("applySkill", { type: "damage", value: 0.2 }) },
      { id: "speedBoost", name: "Speed Boost", effect: () => this.registry.events.emit("applySkill", { type: "speed", value: 20 }) },
      { id: "healthBoost", name: "Health Boost", effect: () => this.registry.events.emit("applySkill", { type: "health", value: 20 }) },
      { id: "cooldownReduce", name: "Faster Reload", effect: () => this.registry.events.emit("applySkill", { type: "cooldown", value: 0.15 }) },
      { id: "dashUpgrade", name: "Dash Upgrade", effect: () => this.registry.events.emit("applySkill", { type: "dash", value: 100 }) },
    ];

    // Randomly select 3 unique skills
    const availableSkills = Phaser.Utils.Array.Shuffle(skillPool).slice(0, 3);

    const buttonGroup = this.add.group();
    availableSkills.forEach((skill, index) => {
      const yPos = this.cameras.main.centerY - 30 + (index * 60);
      const buttonRect = this.add.rectangle(this.cameras.main.centerX, yPos, 250, 50, 0x000000)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(1001)
        .on("pointerover", () => this.tweens.add({ targets: buttonRect, scale: 1.1, duration: 100 }))
        .on("pointerout", () => this.tweens.add({ targets: buttonRect, scale: 1, duration: 100 }))
        .on("pointerdown", () => this.selectSkill(skill));

      const buttonText = this.add.text(this.cameras.main.centerX, yPos, skill.name, {
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

      const descriptionText = this.add.text(this.cameras.main.centerX, yPos + 20, `Boosts ${skill.name.toLowerCase()}`, {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 1,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

      buttonGroup.addMultiple([buttonRect, buttonText, descriptionText]);
    });

    // Add back button only for non-initial selections
    if (!this.isInitialSelection) {
      const backButtonRect = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY + 120, 200, 50, 0x000000)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(1001)
        .on("pointerover", () => this.tweens.add({ targets: backButtonRect, scale: 1.1, duration: 100 }))
        .on("pointerout", () => this.tweens.add({ targets: backButtonRect, scale: 1, duration: 100 }))
        .on("pointerdown", () => this.closeMenu());

      const backButtonText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 120, "Back", {
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

      buttonGroup.addMultiple([backButtonRect, backButtonText]);
    }
  }

  selectSkill(skill) {
    skill.effect();
    this.closeMenu();
  }

  closeMenu() {
    this.scene.resume("GameScene");
    this.scene.stop();
  }
}