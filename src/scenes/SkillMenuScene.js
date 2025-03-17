import Phaser from "phaser";

export default class SkillMenuScene extends Phaser.Scene {
  constructor() {
    super("SkillMenuScene");
    this.selectedSkill = null;
    this.isInitialSelection = false;
    this.playerLevel = 1;
  }

  init(data) {
    this.isInitialSelection = data.isInitial || false;
    this.playerLevel = data.level || this.registry.get('playerLevel') || 1; // Get level from data or registry
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

    // Define skill branches
    const shotSkills = [
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
    ];

    const explosiveSkills = [
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
    ];

    const defenseSkills = [
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
    ];

    const specialSkills = [
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
    ];

    const ultimateSkills = [
      { id: "titansAwakening", name: "Titan's Awakening", effect: { type: "multiEffect", shootCooldown: 0.2, secondLife: true }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "warNemesis", name: "War Nemesis", effect: { type: "explosiveProjectiles", value: 1 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "starfall", name: "Starfall", effect: { type: "meteorBarrage", interval: 30 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "echoOfTheAbyss", name: "Echo of the Abyss", effect: { type: "areaEffect", radius: 20 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
      { id: "clockworkDivinity", name: "Clockwork Divinity", effect: { type: "invulnerability", duration: 5, interval: 60 }, rarity: "ultimate", color: "#8B0000", branch: "Ultimate" },
    ];

    // Combine all skills
    const allSkills = [...shotSkills, ...explosiveSkills, ...defenseSkills, ...specialSkills, ...(this.playerLevel >= 40 ? ultimateSkills : [])];

    // Select skills based on player level
    const availableSkills = this.getSkillOptions(this.playerLevel, allSkills);

    // Display skill options
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
        color: skill.color,
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

      const descriptionText = this.add.text(this.cameras.main.centerX, yPos + 20, `Branch: ${skill.branch}`, {
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

  getSkillOptions(level, allSkills) {
    let skills = [];
    if (level <= 15) {
      skills.push(...this.getRandomSkills(allSkills.filter(s => s.rarity === "common"), 3));
    } else if (level <= 35) {
      const rarities = level >= 20 ? ["common", "rare"] : ["common"];
      skills.push(...this.getRandomSkills(allSkills.filter(s => rarities.includes(s.rarity)), 3));
    } else {
      const rarities = ["common", "rare", level >= 30 ? "purple" : null, level >= 40 ? "ultimate" : null].filter(r => r);
      skills.push(...this.getRandomSkills(allSkills.filter(s => rarities.includes(s.rarity)), 3));
      if (level >= 40 && level % 4 === 0) {
        skills.push(...this.getRandomSkills(allSkills.filter(s => s.rarity === "ultimate"), 2));
      }
    }
    return Phaser.Utils.Array.Shuffle(skills).slice(0, 3);
  }

  getRandomSkills(skillPool, count) {
    return Phaser.Utils.Array.Shuffle(skillPool).slice(0, count);
  }

  selectSkill(skill) {
    // Extract the effect object and emit it to GameScene via registry
    const skillData = skill.effect; // Use the effect object directly
    this.registry.events.emit("applySkill", skillData);

    // Close the menu after applying the skill
    this.closeMenu();
  }

  closeMenu() {
    this.scene.resume("GameScene");
    this.scene.stop();
  }
}