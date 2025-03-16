import Phaser from "phaser";

export default class ChestScene extends Phaser.Scene {
  constructor() {
    super("ChestScene");
    this.chest = null;
    this.slots = [];
  }

  init(data) {
    this.chest = data.chest;
  }

  preload() {
    this.createPlaceholderIcons();
  }

  createPlaceholderIcons() {
    // Same as before...
    const rapidFireGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    rapidFireGraphics.fillStyle(0x00BFFF, 1);
    rapidFireGraphics.fillRect(8, 8, 16, 16);
    rapidFireGraphics.lineStyle(2, 0x000000, 1);
    rapidFireGraphics.strokeRect(8, 8, 16, 16);
    rapidFireGraphics.fillStyle(0xff0000, 1);
    rapidFireGraphics.fillCircle(16, 16, 4);
    rapidFireGraphics.generateTexture("rapidFireIcon", 32, 32);
    rapidFireGraphics.destroy();

    const nimbleHandsGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    nimbleHandsGraphics.fillStyle(0x00BFFF, 1);
    nimbleHandsGraphics.fillCircle(16, 16, 12);
    nimbleHandsGraphics.lineStyle(2, 0x000000, 1);
    nimbleHandsGraphics.strokeCircle(16, 16, 12);
    nimbleHandsGraphics.generateTexture("nimbleHandsIcon", 32, 32);
    nimbleHandsGraphics.destroy();

    const bootsGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    bootsGraphics.fillStyle(0x00BFFF, 1);
    bootsGraphics.fillRect(8, 12, 8, 16);
    bootsGraphics.fillRect(16, 12, 8, 16);
    bootsGraphics.lineStyle(2, 0x000000, 1);
    bootsGraphics.strokeRect(8, 12, 8, 16);
    bootsGraphics.strokeRect(16, 12, 8, 16);
    bootsGraphics.generateTexture("bootsIcon", 32, 32);
    bootsGraphics.destroy();

    const spikesGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    spikesGraphics.fillStyle(0x00BFFF, 1);
    spikesGraphics.fillTriangle(8, 24, 16, 8, 24, 24);
    spikesGraphics.lineStyle(2, 0x000000, 1);
    spikesGraphics.strokeTriangle(8, 24, 16, 8, 24, 24);
    spikesGraphics.generateTexture("spikesIcon", 32, 32);
    spikesGraphics.destroy();
  }

  create() {
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(1000).setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 300,
      ease: "Power2",
    });
  
    const title = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 150,
      "Chest Contents",
      {
        fontSize: "32px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0);
    this.tweens.add({
      targets: title,
      alpha: 1,
      duration: 300,
      ease: "Power2",
    });
  
    const commonItems = [
      { id: "rapidFire", name: "Rapid Fire", icon: "rapidFireIcon", effect: { type: "projectileSpeed", value: 0.1 }, rarity: "common", color: "#00BFFF" },
      { id: "nimbleHands", name: "Nimble Hands", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.05 }, rarity: "common", color: "#00BFFF" },
      { id: "fifthAnniversaryBoots", name: "Fifth Anniversary Boots", icon: "bootsIcon", effect: { type: "speed", value: 0.05 }, rarity: "common", color: "#00BFFF" },
      { id: "titaniumSpikes", name: "Titanium Spikes", icon: "spikesIcon", effect: { type: "damage", value: 0.08 }, rarity: "common", color: "#00BFFF" },
    ];
    const rareItems = [
      { id: "megaBlaster", name: "Mega Blaster", icon: "rapidFireIcon", effect: { type: "damage", value: 0.2 }, rarity: "rare", color: "#FF4500" },
      { id: "swiftGloves", name: "Swift Gloves", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.15 }, rarity: "rare", color: "#FF4500" },
      { id: "jetBoots", name: "Jet Boots", icon: "bootsIcon", effect: { type: "speed", value: 0.15 }, rarity: "rare", color: "#FF4500" },
      { id: "diamondSpikes", name: "Diamond Spikes", icon: "spikesIcon", effect: { type: "damage", value: 0.25 }, rarity: "rare", color: "#FF4500" },
    ];
    const purpleRareItems = [
      { id: "dumbBullets", name: "Dumb Bullets", icon: "rapidFireIcon", rarity: "purple", color: "#800080" },
      { id: "rapidCharge", name: "Rapid Charge", icon: "nimbleHandsIcon", rarity: "purple", color: "#800080" },
      { id: "regeneration", name: "Regeneration", icon: "bootsIcon", rarity: "purple", color: "#800080" },
      { id: "vResistance", name: "V Resistance", icon: "spikesIcon", rarity: "purple", color: "#800080" },
      { id: "projectileTaming", name: "Projectile Taming", icon: "rapidFireIcon", rarity: "purple", color: "#800080" },
    ];
    const excessiveItems = [
      { id: "+1Slot", name: "+1 Slot", icon: "nimbleHandsIcon", rarity: "excessive", color: "#FFFF00" },
      { id: "5thAnniversaryBootsOld", name: "5th Anniversary Boots (old)", icon: "bootsIcon", rarity: "excessive", color: "#FFFF00" },
      { id: "cloneGenerator", name: "Clone Generator", icon: "rapidFireIcon", rarity: "excessive", color: "#FFFF00" },
      { id: "3rdAnniversarySwordNerfed", name: "3rd Anniversary Sword (nerfed)", icon: "spikesIcon", rarity: "excessive", color: "#FFFF00" },
    ];
    const ultimateItems = [
      { id: "thirdAnniversarySword", name: "Third Anniversary Sword", icon: "spikesIcon", rarity: "ultimate", color: "#8B0000" },
      { id: "enchantedTotem", name: "Enchanted Totem", icon: "nimbleHandsIcon", rarity: "ultimate", color: "#8B0000" },
    ];
  
    const itemCount = this.chest.getData("itemCount") || 1;
  
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      const roll = Phaser.Math.Between(0, 999);
      let itemPool;
      if (roll < 500) itemPool = commonItems; // 0-499: 50%
      else if (roll < 750) itemPool = rareItems; // 500-749: 25%
      else if (roll < 950) itemPool = purpleRareItems; // 750-949: 20%
      else if (roll < 985) itemPool = excessiveItems; // 950-984: 3.5%
      else itemPool = ultimateItems; // 985-999: 1.5%
      const item = Phaser.Utils.Array.GetRandom(itemPool);
      items.push(item);
    }
  
    const slotWidth = 80;
    const slotHeight = 80;
    const slotSpacing = 20;
    const startX = this.cameras.main.centerX - ((itemCount - 1) * (slotWidth + slotSpacing)) / 2;
    const startY = this.cameras.main.centerY - 50;
  
    this.slots = [];
    items.forEach((item, i) => {
      const slot = this.add.rectangle(
        startX + i * (slotWidth + slotSpacing),
        startY,
        slotWidth,
        slotHeight,
        0x333333
      )
        .setStrokeStyle(2, 0xffffff)
        .setScrollFactor(0)
        .setDepth(1001)
        .setInteractive()
        .setAlpha(0);
  
      this.tweens.add({
        targets: slot,
        alpha: 1,
        duration: 300,
        delay: i * 100,
        ease: "Power2",
      });
  
      slot.on("pointerover", () => {
        if (slot.isInteractive) slot.setFillStyle(0x555555);
      });
      slot.on("pointerout", () => {
        if (slot.isInteractive) slot.setFillStyle(0x333333);
      });
  
      const itemIcon = this.add.image(slot.x, slot.y - 10, item.icon)
        .setDisplaySize(40, 40)
        .setScrollFactor(0)
        .setDepth(1002)
        .setAlpha(0);
      const itemText = this.add.text(slot.x, slot.y + 30, item.name, {
        fontSize: "14px",
        color: item.color,
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1002).setAlpha(0);
  
      this.tweens.add({
        targets: [itemIcon, itemText],
        alpha: 1,
        duration: 300,
        delay: i * 100 + 100,
        ease: "Power2",
      });
  
      slot.isInteractive = true;
      slot.on("pointerdown", () => {
        if (slot.isInteractive) {
          const hudScene = this.scene.get("HUDScene");
          if (!hudScene) {
            console.error("HUDScene not found!");
            return;
          }
  
          if (hudScene.isInventoryFull()) {
            const fullText = this.add.text(
              slot.x,
              slot.y - 40,
              "Inventory Full!",
              {
                fontSize: "16px",
                color: "#ff0000",
                stroke: "#000000",
                strokeThickness: 3,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                padding: { x: 5, y: 2 },
              }
            ).setOrigin(0.5).setDepth(1003).setAlpha(0);
  
            this.tweens.add({
              targets: fullText,
              alpha: 1,
              duration: 300,
              yoyo: true,
              hold: 1000,
              onComplete: () => fullText.destroy(),
            });
            console.log(`Cannot collect ${item.name}: Inventory full`);
            return;
          }
  
          if (hudScene.addItemToInventory(item)) {
            const particles = this.add.particles(slot.x, slot.y, null, {
              frame: null,
              color: [0xffff00, 0xffd700],
              colorEase: "linear",
              lifespan: 500,
              scale: { start: 0.5, end: 0 },
              speed: 100,
              quantity: 10,
              blendMode: "ADD",
            });
            this.time.delayedCall(500, () => particles.destroy());
  
            this.tweens.add({
              targets: [itemIcon, itemText],
              alpha: 0.3,
              duration: 300,
              ease: "Power2",
            });
            itemText.setColor("#808080");
            slot.setFillStyle(0x666666);
            slot.disableInteractive();
            slot.isInteractive = false;
            console.log(`Collected ${item.name} (Rarity: ${item.rarity}) from slot ${i + 1} and added to inventory`);
          }
        }
      });
  
      this.slots.push(slot);
    });
  
    const closeButton = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 120,
      200,
      50,
      0x000000
    )
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0)
      .on("pointerdown", () => this.closeChest())
      .on("pointerover", () => closeButton.setFillStyle(0x333333))
      .on("pointerout", () => closeButton.setFillStyle(0x000000));
  
    const closeText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 120,
      "Close [E]",
      {
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1002).setAlpha(0);
  
    this.tweens.add({
      targets: [closeButton, closeText],
      alpha: 1,
      duration: 300,
      delay: 300,
      ease: "Power2",
    });
  
    this.input.keyboard.on("keydown-E", () => this.closeChest());
  }

  applyItem(type, value) {
    const gameScene = this.scene.get("GameScene");
    if (!gameScene) {
      console.error("GameScene not found!");
      return;
    }

    switch (type) {
      case "projectileSpeed":
        gameScene.weaponManager.stats.velocity *= (1 + value);
        console.log(`Applied ${type} item, new projectile speed = ${gameScene.weaponManager.stats.velocity}`);
        break;
      case "shootCooldown":
        gameScene.shootCooldown *= (1 - value);
        gameScene.weaponManager.stats.shootCooldown = gameScene.shootCooldown;
        console.log(`Applied ${type} item, new shoot cooldown = ${gameScene.shootCooldown}`);
        break;
      case "speed":
        gameScene.playerSpeed *= (1 + value);
        console.log(`Applied ${type} item, new speed = ${gameScene.playerSpeed}`);
        break;
      case "damage":
        gameScene.weaponManager.stats.damage *= (1 + value);
        console.log(`Applied ${type} item, new damage = ${gameScene.weaponManager.stats.damage}`);
        break;
      default:
        console.warn(`Unknown item type: ${type}`);
    }
  }

  closeChest() {
    if (this.chest) {
      this.chest.setData("opened", true);
    }
    const gameScene = this.scene.get("GameScene");
    if (gameScene && this.scene.isPaused("GameScene")) {
      this.scene.resume("GameScene");
    }
    this.scene.stop();
  }
}