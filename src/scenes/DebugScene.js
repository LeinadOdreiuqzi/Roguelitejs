import Phaser from "phaser";

export default class DebugScene extends Phaser.Scene {
  constructor() {
    super("DebugScene");
    this.currentPage = "items";
    this.skillScrollOffset = 0; // Scroll position (in items)
    this.visibleSkills = 13; // Number of skills visible at once
  }

  create() {
    this.gameScene = this.scene.get("GameScene");
    this.hudScene = this.scene.get("HUDScene");

    if (!this.gameScene || !this.hudScene) {
      console.error("Required scenes not found!");
      this.scene.stop();
      return;
    }

    this.scene.pause("GameScene");

    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    ).setScrollFactor(0).setDepth(1000);

    this.add.text(
      this.cameras.main.centerX,
      50,
      "Debug Interface",
      { fontSize: "32px", color: "#ffffff", stroke: "#000000", strokeThickness: 4 }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Full Items List (19 items)
    const allItems = [
      { id: "rapidFire", name: "Rapid Fire", icon: "rapidFireIcon", effect: { type: "projectileSpeed", value: 0.1 }, rarity: "common", color: "#00BFFF" },
      { id: "nimbleHands", name: "Nimble Hands", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.05 }, rarity: "common", color: "#00BFFF" },
      { id: "fifthAnniversaryBoots", name: "Fifth Anniversary Boots", icon: "bootsIcon", effect: { type: "speed", value: 0.05 }, rarity: "common", color: "#00BFFF" },
      { id: "titaniumSpikes", name: "Titanium Spikes", icon: "spikesIcon", effect: { type: "damage", value: 0.08 }, rarity: "common", color: "#00BFFF" },
      { id: "megaBlaster", name: "Mega Blaster", icon: "rapidFireIcon", effect: { type: "damage", value: 0.2 }, rarity: "rare", color: "#FF4500" },
      { id: "swiftGloves", name: "Swift Gloves", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.15 }, rarity: "rare", color: "#FF4500" },
      { id: "jetBoots", name: "Jet Boots", icon: "bootsIcon", effect: { type: "speed", value: 0.15 }, rarity: "rare", color: "#FF4500" },
      { id: "diamondSpikes", name: "Diamond Spikes", icon: "spikesIcon", effect: { type: "damage", value: 0.25 }, rarity: "rare", color: "#FF4500" },
      { id: "dumbBullets", name: "Dumb Bullets", icon: "rapidFireIcon", effect: { type: "dumbBullets", value: true }, rarity: "purple", color: "#800080" },
      { id: "rapidCharge", name: "Rapid Charge", icon: "nimbleHandsIcon", effect: { type: "shootCooldown", value: 0.2 }, rarity: "purple", color: "#800080" },
      { id: "regeneration", name: "Regeneration", icon: "bootsIcon", effect: { type: "regen", value: 0.5 }, rarity: "purple", color: "#800080" },
      { id: "vResistance", name: "V Resistance", icon: "spikesIcon", effect: { type: "damageReduction", value: 0.15 }, rarity: "purple", color: "#800080" },
      { id: "projectileTaming", name: "Projectile Taming", icon: "rapidFireIcon", effect: { type: "projectileTaming", value: true }, rarity: "purple", color: "#800080" },
      { id: "+1Slot", name: "+1 Slot", icon: "nimbleHandsIcon", effect: { type: "extraSlot", value: 1 }, rarity: "excessive", color: "#FFFF00" },
      { id: "5thAnniversaryBootsOld", name: "5th Anniversary Boots (old)", icon: "bootsIcon", effect: { type: "speed", value: 0.1 }, rarity: "excessive", color: "#FFFF00" },
      { id: "cloneGenerator", name: "Clone Generator", icon: "rapidFireIcon", effect: { type: "cloneGenerator", value: true }, rarity: "excessive", color: "#FFFF00" },
      { id: "3rdAnniversarySwordNerfed", name: "3rd Anniversary Sword (nerfed)", icon: "spikesIcon", effect: { type: "damage", value: 0.15 }, rarity: "excessive", color: "#FFFF00" },
      { id: "thirdAnniversarySword", name: "Third Anniversary Sword", icon: "spikesIcon", effect: { type: "damage", value: 0.5 }, rarity: "ultimate", color: "#8B0000" },
      { id: "enchantedTotem", name: "Enchanted Totem", icon: "nimbleHandsIcon", effect: { type: "regenOnKill", value: 0.02 }, rarity: "ultimate", color: "#8B0000" },
    ];

    const itemStartY = 100;
    const itemSpacing = 30;
    this.itemTexts = [];
    allItems.forEach((item, index) => {
      const itemText = this.add.text(
        50,
        itemStartY + index * itemSpacing,
        item.name,
        { fontSize: "16px", color: item.color, stroke: "#000000", strokeThickness: 2 }
      ).setScrollFactor(0).setDepth(1001).setInteractive();

      itemText.on("pointerover", () => itemText.setStyle({ color: "#FFFFFF" }));
      itemText.on("pointerout", () => itemText.setStyle({ color: item.color }));
      itemText.on("pointerdown", () => {
        if (this.hudScene.addItemToInventory(item)) {
          console.log(`Debug: Added ${item.name} to inventory`);
          this.gameScene.applyItemEffect(item); // Pass the full item, not just item.effect
        } else {
          console.log(`Debug: Failed to add ${item.name} - inventory full`);
        }
      });
      this.itemTexts.push(itemText);
    });
    console.log(`Created ${this.itemTexts.length} item texts (expected 19)`);

    // Full Skills List (45 skills)
    const allSkills = [
      { id: "rapidReload", name: "Rapid Reload", effect: { type: "cooldown", value: 0.1 }, rarity: "common", color: "#00BFFF", branch: "Shot" },
      { id: "highDensityBullet", name: "High Density Bullet", effect: { type: "damage", value: 0.15 }, rarity: "common", color: "#00BFFF", branch: "Shot" },
      { id: "piercingAmmo", name: "Piercing Ammo", effect: { type: "pierce", value: 1 }, rarity: "rare", color: "#FF4500", branch: "Shot" },
      { id: "doubleBarrel", name: "Double Barrel", effect: { type: "projectileCount", value: 2, spread: 10 }, rarity: "rare", color: "#FF4500", branch: "Shot" },
      { id: "blitzReload", name: "Blitz Reload", effect: { type: "cooldown", value: 0.2 }, rarity: "rare", color: "#FF4500", branch: "Shot" },
      { id: "chainShot", name: "Chain Shot", effect: { type: "chainShot", value: 4 }, rarity: "purple", color: "#800080", branch: "Shot" },
      { id: "plasmaAmmo", name: "Plasma Ammo", effect: { type: "bounce", value: 1 }, rarity: "purple", color: "#800080", branch: "Shot" },
      { id: "lightMachineGun", name: "Light Machine Gun", effect: { type: "cooldown", value: 0.2, damagePenalty: 0.1 }, rarity: "ultimate", color: "#8B0000", branch: "Shot" },
      { id: "destructiveFire", name: "Destructive Fire", effect: { type: "explosion", value: 0.5 }, rarity: "ultimate", color: "#8B0000", branch: "Shot" },
      { id: "leadStorm", name: "Lead Storm", effect: { type: "projectileCount", value: 4, pattern: "circular" }, rarity: "ultimate", color: "#8B0000", branch: "Shot" },
      { id: "bouncingGrenade", name: "Bouncing Grenade", effect: { type: "grenade", interval: 8 }, rarity: "common", color: "#00BFFF", branch: "Explosives" },
      { id: "proximityMines", name: "Proximity Mines", effect: { type: "mine", interval: 10 }, rarity: "common", color: "#00BFFF", branch: "Explosives" },
      { id: "energyCannon", name: "Energy Cannon", effect: { type: "largeProjectile", explosion: true }, rarity: "rare", color: "#FF4500", branch: "Explosives" },
      { id: "guidedMissile", name: "Guided Missile", effect: { type: "missile", interval: 15 }, rarity: "rare", color: "#FF4500", branch: "Explosives" },
      { id: "pulseBomb", name: "Pulse Bomb", effect: { type: "shockwaveOnDamage", radius: 50 }, rarity: "purple", color: "#800080", branch: "Explosives" },
      { id: "chainBlast", name: "Chain Blast", effect: { type: "chainExplosion", chance: 1 }, rarity: "purple", color: "#800080", branch: "Explosives" },
      { id: "rainOfFire", name: "Rain of Fire", effect: { type: "skyExplosion", interval: 30 }, rarity: "ultimate", color: "#8B0000", branch: "Explosives" },
      { id: "nuclearFire", name: "Nuclear Fire", effect: { type: "fireTrail", duration: 5 }, rarity: "ultimate", color: "#8B0000", branch: "Explosives" },
      { id: "shockCharge", name: "Shock Charge", effect: { type: "areaExplosion", interval: 5 }, rarity: "ultimate", color: "#8B0000", branch: "Explosives" },
      { id: "quantumBurst", name: "Quantum Burst", effect: { type: "multiExplosion", count: 3 }, rarity: "ultimate", color: "#8B0000", branch: "Explosives" },
      { id: "reinforcedArmor", name: "Reinforced Armor", effect: { type: "damageReduction", value: 0.1 }, rarity: "common", color: "#00BFFF", branch: "Defense" },
      { id: "enhancedMobility", name: "Enhanced Mobility", effect: { type: "speed", value: 0.1 }, rarity: "common", color: "#00BFFF", branch: "Defense" },
      { id: "energyShield", name: "Energy Shield", effect: { type: "shield", interval: 30, value: 50 }, rarity: "rare", color: "#FF4500", branch: "Defense" },
      { id: "autoRecharge", name: "Auto Recharge", effect: { type: "regen", value: 0.5 }, rarity: "rare", color: "#FF4500", branch: "Defense" },
      { id: "willpower", name: "Willpower", effect: { type: "survive", uses: 1 }, rarity: "purple", color: "#800080", branch: "Defense" },
      { id: "deflectorField", name: "Deflector Field", effect: { type: "deflect", chance: 0.2 }, rarity: "purple", color: "#800080", branch: "Defense" },
      { id: "energyAbsorption", name: "Energy Absorption", effect: { type: "shockwaveOnDamage", radius: 30 }, rarity: "ultimate", color: "#8B0000", branch: "Defense" },
      { id: "pulseBarrier", name: "Pulse Barrier", effect: { type: "shieldOnKill", duration: 5 }, rarity: "ultimate", color: "#8B0000", branch: "Defense" },
      { id: "combatRegeneration", name: "Combat Regeneration", effect: { type: "regenOnKill", value: 0.01 }, rarity: "ultimate", color: "#8B0000", branch: "Defense" },
      { id: "celestialShield", name: "Celestial Shield", effect: { type: "blockNextHit", interval: 60 }, rarity: "ultimate", color: "#8B0000", branch: "Defense" },
      { id: "temporalAnomaly", name: "Temporal Anomaly", effect: { type: "slowEnemies", value: 0.2 }, rarity: "common", color: "#00BFFF", branch: "Special" },
      { id: "doubleTime", name: "Double Time", effect: { type: "speedBoost", value: 0.5, duration: 5, interval: 30 }, rarity: "common", color: "#00BFFF", branch: "Special" },
      { id: "magneticField", name: "Magnetic Field", effect: { type: "redirectProjectiles", chance: 0.3 }, rarity: "rare", color: "#FF4500", branch: "Special" },
      { id: "chaosControl", name: "Chaos Control", effect: { type: "randomEffect", interval: 20 }, rarity: "rare", color: "#FF4500", branch: "Special" },
      { id: "berserkerMode", name: "Berserker Mode", effect: { type: "damageBoost", value: 0.25, defensePenalty: 0.15 }, rarity: "purple", color: "#800080", branch: "Special" },
      { id: "phaseBurst", name: "Phase Burst", effect: { type: "explosionOnCritical", radius: 50 }, rarity: "purple", color: "#800080", branch: "Special" },
      { id: "annihilationCannon", name: "Annihilation Cannon", effect: { type: "laser", interval: 25 }, rarity: "ultimate", color: "#8B0000", branch: "Special" },
      { id: "quantumCharge", name: "Quantum Charge", effect: { type: "teleport", interval: 60 }, rarity: "ultimate", color: "#8B0000", branch: "Special" },
      { id: "dimensionalDuplicator", name: "Dimensional Duplicator", effect: { type: "clone", chance: 0.1 }, rarity: "ultimate", color: "#8B0000", branch: "Special" },
      { id: "destroyerCycle", name: "Destroyer Cycle", effect: { type: "energyExplosion", interval: 10 }, rarity: "ultimate", color: "#8B0000", branch: "Special" },
      { id: "titansAwakening", name: "Titan's Awakening", effect: { type: "multiEffect", shootCooldown: 0.2, secondLife: true }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "warNemesis", name: "War Nemesis", effect: { type: "explosiveProjectiles", value: 1 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "starfall", name: "Starfall", effect: { type: "meteorBarrage", interval: 30 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "echoOfTheAbyss", name: "Echo of the Abyss", effect: { type: "areaEffect", radius: 20 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "clockworkDivinity", name: "Clockwork Divinity", effect: { type: "invulnerability", duration: 5, interval: 60 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
    ];

    const skillStartY = 100;
    const skillSpacing = 30;
    this.skillTexts = [];
    allSkills.forEach((skill, index) => {
      const skillText = this.add.text(
        50,
        skillStartY + index * skillSpacing,
        skill.name,
        { fontSize: "16px", color: skill.color, stroke: "#000000", strokeThickness: 2 }
      ).setScrollFactor(0).setDepth(1001).setInteractive();

      skillText.on("pointerover", () => skillText.setStyle({ color: "#FFFFFF" }));
      skillText.on("pointerout", () => skillText.setStyle({ color: skill.color }));
      skillText.on("pointerdown", () => {
        try {
          this.gameScene.applySkill(skill.effect);
          console.log(`Debug: Applied skill ${skill.name}`);
        } catch (error) {
          console.warn(`Debug: Failed to apply skill ${skill.name}. Error: ${error.message}`);
        }
      });
      this.skillTexts.push(skillText);
    });
    console.log(`Created ${this.skillTexts.length} skill texts (expected 45)`);

    const navY = 80;
    const itemsButton = this.add.text(
      this.cameras.main.centerX - 100,
      navY,
      "Items",
      { fontSize: "20px", color: this.currentPage === "items" ? "#FFFF00" : "#00FF00", stroke: "#000000", strokeThickness: 2 }
    ).setScrollFactor(0).setDepth(1001).setInteractive();

    const skillsButton = this.add.text(
      this.cameras.main.centerX + 100,
      navY,
      "Skills",
      { fontSize: "20px", color: this.currentPage === "skills" ? "#FFFF00" : "#00FF00", stroke: "#000000", strokeThickness: 2 }
    ).setScrollFactor(0).setDepth(1001).setInteractive();

    itemsButton.on("pointerover", () => itemsButton.setStyle({ color: "#FFFFFF" }));
    itemsButton.on("pointerout", () => itemsButton.setStyle({ color: this.currentPage === "items" ? "#FFFF00" : "#00FF00" }));
    itemsButton.on("pointerdown", () => {
      this.switchPage("items", itemsButton, skillsButton);
      console.log("Switched to Items page");
    });

    skillsButton.on("pointerover", () => skillsButton.setStyle({ color: "#FFFFFF" }));
    skillsButton.on("pointerout", () => skillsButton.setStyle({ color: this.currentPage === "skills" ? "#FFFF00" : "#00FF00" }));
    skillsButton.on("pointerdown", () => {
      this.switchPage("skills", itemsButton, skillsButton);
      console.log("Switched to Skills page");
    });

    // Scroll Buttons for Skills
    this.skillContainerY = 100;
    this.skillContainerHeight = this.visibleSkills * skillSpacing; // 13 * 30 = 390px
    const scrollButtonY = this.skillContainerY + this.skillContainerHeight + 10;

    this.scrollUpButton = this.add.text(
      50,
      scrollButtonY,
      "▲",
      { fontSize: "20px", color: "#00FF00", stroke: "#000000", strokeThickness: 2 }
    ).setScrollFactor(0).setDepth(1001).setInteractive();

    this.scrollDownButton = this.add.text(
      80,
      scrollButtonY,
      "▼",
      { fontSize: "20px", color: "#00FF00", stroke: "#000000", strokeThickness: 2 }
    ).setScrollFactor(0).setDepth(1001).setInteractive();

    this.scrollUpButton.on("pointerover", () => this.scrollUpButton.setStyle({ color: "#FFFFFF" }));
    this.scrollUpButton.on("pointerout", () => this.scrollUpButton.setStyle({ color: "#00FF00" }));
    this.scrollUpButton.on("pointerdown", () => {
      if (this.currentPage === "skills" && this.skillScrollOffset > 0) {
        this.skillScrollOffset--;
        this.updateSkillPositions();
        console.log(`Scrolled up to offset ${this.skillScrollOffset}`);
      }
    });

    this.scrollDownButton.on("pointerover", () => this.scrollDownButton.setStyle({ color: "#FFFFFF" }));
    this.scrollDownButton.on("pointerout", () => this.scrollDownButton.setStyle({ color: "#00FF00" }));
    this.scrollDownButton.on("pointerdown", () => {
      if (this.currentPage === "skills" && this.skillScrollOffset < this.skillTexts.length - this.visibleSkills) {
        this.skillScrollOffset++;
        this.updateSkillPositions();
        console.log(`Scrolled down to offset ${this.skillScrollOffset}`);
      }
    });

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

    this.statTexts = [];
    this.plusButtons = [];
    this.minusButtons = [];
    stats.forEach((stat, index) => {
      const statText = this.add.text(
        statsStartX,
        statsStartY + index * statSpacing,
        `${stat.name}: ${stat.get().toFixed(2)}`,
        { fontSize: "16px", color: "#FFFFFF", stroke: "#000000", strokeThickness: 2 }
      ).setScrollFactor(0).setDepth(1001);

      const plusButton = this.add.text(
        statsStartX + 150,
        statsStartY + index * statSpacing,
        "+",
        { fontSize: "16px", color: "#00FF00", stroke: "#000000", strokeThickness: 2 }
      ).setScrollFactor(0).setDepth(1001).setInteractive();

      const minusButton = this.add.text(
        statsStartX + 180,
        statsStartY + index * statSpacing,
        "-",
        { fontSize: "16px", color: "#FF0000", stroke: "#000000", strokeThickness: 2 }
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
        if (stat.name === "Health" || stat.name === "Max Health") newValue = Math.max(newValue, 1);
        stat.set(newValue);
        statText.setText(`${stat.name}: ${stat.get().toFixed(2)}`);
        if (stat.name.includes("Health")) {
          this.gameScene.registry.set('playerHealth', this.gameScene.playerHealth);
          this.gameScene.registry.set('maxHealth', this.gameScene.maxHealth);
          this.gameScene.registry.events.emit('updateHealth', this.gameScene.playerHealth);
        }
      });

      this.statTexts.push(statText);
      this.plusButtons.push(plusButton);
      this.minusButtons.push(minusButton);
    });

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
      { fontSize: "24px", color: "#FFFFFF", stroke: "#000000", strokeThickness: 2 }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    closeButton.on("pointerover", () => closeButton.setFillStyle(0x555555));
    closeButton.on("pointerout", () => closeButton.setFillStyle(0x333333));
    closeButton.on("pointerdown", () => this.closeDebug());

    this.input.keyboard.on("keydown-O", () => this.closeDebug());

    this.switchPage(this.currentPage, itemsButton, skillsButton);
    console.log(`DebugScene initialized on ${this.currentPage} page`);
  }

  switchPage(page, itemsButton, skillsButton) {
    this.currentPage = page;

    if (!this.itemTexts.length || !this.skillTexts.length) {
      console.error("Item or skill texts not initialized:", this.itemTexts.length, this.skillTexts.length);
      return;
    }

    this.itemTexts.forEach(text => text.setVisible(page === "items"));
    this.skillTexts.forEach(text => text.setVisible(false));
    this.scrollUpButton.setVisible(page === "skills");
    this.scrollDownButton.setVisible(page === "skills");

    if (page === "skills") {
      this.skillScrollOffset = 0;
      this.updateSkillPositions();
    }

    this.statTexts.forEach(text => text.setVisible(true));
    this.plusButtons.forEach(button => button.setVisible(true));
    this.minusButtons.forEach(button => button.setVisible(true));

    itemsButton.setStyle({ color: page === "items" ? "#FFFF00" : "#00FF00" });
    skillsButton.setStyle({ color: page === "skills" ? "#FFFF00" : "#00FF00" });
  }

  updateSkillPositions() {
    const skillSpacing = 30;
    const startY = this.skillContainerY;
    const maxY = startY + this.skillContainerHeight;

    this.skillTexts.forEach((text, index) => {
      const scrollIndex = index - this.skillScrollOffset;
      const yPos = startY + scrollIndex * skillSpacing;
      text.setVisible(this.currentPage === "skills" && yPos >= startY && yPos < maxY);
      text.setY(yPos);
    });

    this.scrollUpButton.setAlpha(this.skillScrollOffset > 0 ? 1 : 0.5);
    this.scrollDownButton.setAlpha(this.skillScrollOffset < this.skillTexts.length - this.visibleSkills ? 1 : 0.5);
  }

  closeDebug() {
    console.log("Closing DebugScene");
    this.scene.resume("GameScene");
    this.scene.stop();
  }
}