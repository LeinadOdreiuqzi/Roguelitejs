import Phaser from "phaser";

export default class DebugScene extends Phaser.Scene {
  constructor() {
    super("DebugScene");
  }

  create() {
    this.gameScene = this.scene.get("GameScene");
    this.hudScene = this.scene.get("HUDScene");

    if (!this.gameScene || !this.hudScene) {
      console.error("Required scenes not found!");
      this.scene.stop();
      return;
    }

    // Pause GameScene
    this.scene.pause("GameScene");

    // Overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    ).setScrollFactor(0).setDepth(1000);

    // Title
    this.add.text(
      this.cameras.main.centerX,
      50,
      "Debug Interface",
      {
        fontSize: "32px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Item List
    const allItems = [
      // Common
      { id: "rapidFire", name: "Rapid Fire", icon: "rapidFireIcon", effect: { type: "projectileSpeed", value: 0.1 }, rarity: "common", color: "#00BFFF" },
      { id: "nimbleHands", name: "Nimble Hands", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.05 }, rarity: "common", color: "#00BFFF" },
      { id: "fifthAnniversaryBoots", name: "Fifth Anniversary Boots", icon: "bootsIcon", effect: { type: "speed", value: 0.05 }, rarity: "common", color: "#00BFFF" },
      { id: "titaniumSpikes", name: "Titanium Spikes", icon: "spikesIcon", effect: { type: "damage", value: 0.08 }, rarity: "common", color: "#00BFFF" },
      // Rare
      { id: "megaBlaster", name: "Mega Blaster", icon: "rapidFireIcon", effect: { type: "damage", value: 0.2 }, rarity: "rare", color: "#FF4500" },
      { id: "swiftGloves", name: "Swift Gloves", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.15 }, rarity: "rare", color: "#FF4500" },
      { id: "jetBoots", name: "Jet Boots", icon: "bootsIcon", effect: { type: "speed", value: 0.15 }, rarity: "rare", color: "#FF4500" },
      { id: "diamondSpikes", name: "Diamond Spikes", icon: "spikesIcon", effect: { type: "damage", value: 0.25 }, rarity: "rare", color: "#FF4500" },
      // Purple Rare
      { id: "dumbBullets", name: "Dumb Bullets", icon: "rapidFireIcon", rarity: "purple", color: "#800080" },
      { id: "rapidCharge", name: "Rapid Charge", icon: "nimbleHandsIcon", rarity: "purple", color: "#800080" },
      { id: "regeneration", name: "Regeneration", icon: "bootsIcon", rarity: "purple", color: "#800080" },
      { id: "vResistance", name: "V Resistance", icon: "spikesIcon", rarity: "purple", color: "#800080" },
      { id: "projectileTaming", name: "Projectile Taming", icon: "rapidFireIcon", rarity: "purple", color: "#800080" },
      // Excessive
      { id: "+1Slot", name: "+1 Slot", icon: "nimbleHandsIcon", rarity: "excessive", color: "#FFFF00" },
      { id: "5thAnniversaryBootsOld", name: "5th Anniversary Boots (old)", icon: "bootsIcon", rarity: "excessive", color: "#FFFF00" },
      { id: "cloneGenerator", name: "Clone Generator", icon: "rapidFireIcon", rarity: "excessive", color: "#FFFF00" },
      { id: "3rdAnniversarySwordNerfed", name: "3rd Anniversary Sword (nerfed)", icon: "spikesIcon", rarity: "excessive", color: "#FFFF00" },
      // Ultimate
      { id: "thirdAnniversarySword", name: "Third Anniversary Sword", icon: "spikesIcon", rarity: "ultimate", color: "#8B0000" },
      { id: "enchantedTotem", name: "Enchanted Totem", icon: "nimbleHandsIcon", rarity: "ultimate", color: "#8B0000" },
    ];

    const itemStartY = 100;
    const itemSpacing = 30;
    allItems.forEach((item, index) => {
      const itemText = this.add.text(
        50,
        itemStartY + index * itemSpacing,
        item.name,
        {
          fontSize: "16px",
          color: item.color,
          stroke: "#000000",
          strokeThickness: 2,
        }
      ).setScrollFactor(0).setDepth(1001).setInteractive();

      itemText.on("pointerover", () => itemText.setStyle({ color: "#FFFFFF" }));
      itemText.on("pointerout", () => itemText.setStyle({ color: item.color }));
      itemText.on("pointerdown", () => {
        if (this.hudScene.addItemToInventory(item)) {
          console.log(`Debug: Added ${item.name} to inventory`);
        } else {
          console.log(`Debug: Failed to add ${item.name} - inventory full`);
        }
      });
    });

    // Player Stats
    const statsStartX = this.cameras.main.centerX + 50;
    const statsStartY = 100;
    const statSpacing = 40;

    const stats = [
      { name: "Health", get: () => this.gameScene.playerHealth, set: (val) => this.gameScene.playerHealth = val, max: () => this.gameScene.maxHealth },
      { name: "Max Health", get: () => this.gameScene.maxHealth, set: (val) => this.gameScene.maxHealth = val },
      { name: "Speed", get: () => this.gameScene.playerSpeed, set: (val) => this.gameScene.playerSpeed = val },
      { name: "Damage", get: () => this.gameScene.weaponManager.stats.damage, set: (val) => this.gameScene.weaponManager.stats.damage = val },
      { name: "Shoot Cooldown", get: () => this.gameScene.shootCooldown, set: (val) => { this.gameScene.shootCooldown = val; this.gameScene.weaponManager.stats.shootCooldown = val; } },
      { name: "Luck", get: () => this.gameScene.luck || 0, set: (val) => this.gameScene.luck = val },
    ];

    stats.forEach((stat, index) => {
      const statText = this.add.text(
        statsStartX,
        statsStartY + index * statSpacing,
        `${stat.name}: ${stat.get().toFixed(2)}`,
        {
          fontSize: "16px",
          color: "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 2,
        }
      ).setScrollFactor(0).setDepth(1001);

      const plusButton = this.add.text(
        statsStartX + 150,
        statsStartY + index * statSpacing,
        "+",
        {
          fontSize: "16px",
          color: "#00FF00",
          stroke: "#000000",
          strokeThickness: 2,
        }
      ).setScrollFactor(0).setDepth(1001).setInteractive();

      const minusButton = this.add.text(
        statsStartX + 180,
        statsStartY + index * statSpacing,
        "-",
        {
          fontSize: "16px",
          color: "#FF0000",
          stroke: "#000000",
          strokeThickness: 2,
        }
      ).setScrollFactor(0).setDepth(1001).setInteractive();

      plusButton.on("pointerover", () => plusButton.setStyle({ color: "#FFFFFF" }));
      plusButton.on("pointerout", () => plusButton.setStyle({ color: "#00FF00" }));
      plusButton.on("pointerdown", () => {
        let newValue = stat.get() + (stat.name === "Health" || stat.name === "Max Health" ? 10 : stat.name === "Shoot Cooldown" ? -0.05 : 1);
        if (stat.name === "Health") newValue = Math.min(newValue, stat.max());
        stat.set(newValue);
        statText.setText(`${stat.name}: ${stat.get().toFixed(2)}`);
        if (stat.name.includes("Health")) {
          this.gameScene.registry.set('playerHealth', this.gameScene.playerHealth);
          this.gameScene.registry.set('maxHealth', this.gameScene.maxHealth);
          this.gameScene.registry.events.emit('updateHealth', this.gameScene.playerHealth);
        }
      });

      minusButton.on("pointerover", () => minusButton.setStyle({ color: "#FFFFFF" }));
      minusButton.on("pointerout", () => minusButton.setStyle({ color: "#FF0000" }));
      minusButton.on("pointerdown", () => {
        let newValue = stat.get() - (stat.name === "Health" || stat.name === "Max Health" ? 10 : stat.name === "Shoot Cooldown" ? 0.05 : 1);
        if (stat.name === "Health" || stat.name === "Max Health") newValue = Math.max(newValue, 1); // Prevent negative or zero
        stat.set(newValue);
        statText.setText(`${stat.name}: ${stat.get().toFixed(2)}`);
        if (stat.name.includes("Health")) {
          this.gameScene.registry.set('playerHealth', this.gameScene.playerHealth);
          this.gameScene.registry.set('maxHealth', this.gameScene.maxHealth);
          this.gameScene.registry.events.emit('updateHealth', this.gameScene.playerHealth);
        }
      });
    });

    // Close Button
    const closeButton = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.height - 50,
      200,
      50,
      0x333333
    ).setStrokeStyle(2, 0xffffff).setScrollFactor(0).setDepth(1001).setInteractive();

    this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 50,
      "Close [O]",
      {
        fontSize: "24px",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    closeButton.on("pointerover", () => closeButton.setFillStyle(0x555555));
    closeButton.on("pointerout", () => closeButton.setFillStyle(0x333333));
    closeButton.on("pointerdown", () => this.closeDebug());

    this.input.keyboard.on("keydown-O", () => this.closeDebug());
  }

  closeDebug() {
    this.scene.resume("GameScene");
    this.scene.stop();
  }
}