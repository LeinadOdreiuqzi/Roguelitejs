import Phaser from "phaser";
import { UIManager } from "../systems/ui/UiManager";

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super("HUDScene");
    this.uiManager = null;
    this.slots = [];
    this.inventory = [undefined, undefined, undefined];
    this.maxSlots = 6;
    this.activePassives = new Map(); // Track active passive effects
  }

  create() {
    const playerHealth = this.registry.get('playerHealth') || 100;
    const noclipMode = this.registry.get('noclipMode') || false;
    const currentRoom = this.registry.get('currentRoom') || { id: 0, width: 0, height: 0 };
    const version = "Version 1.2.3: Items/Skills";

    this.uiManager = new UIManager(this);
    this.uiManager.createUI(playerHealth, noclipMode, version);
    this.uiManager.updateDebugRoom(currentRoom);

    this.renderSlots();

    this.registry.events.on('updateHealth', (health) => this.uiManager.updateHealth(health));
    this.registry.events.on('updateNoclip', (noclip) => this.uiManager.updateNoclip(noclip));
    this.registry.events.on('updateRoom', (room) => this.uiManager.updateDebugRoom(room));
    this.registry.events.on('levelChanged', (level) => {
      console.log(`HUDScene: Player leveled up to ${level}`);
      this.uiManager.updateLevel(level);
    });
    this.registry.events.on('xpChanged', (xp) => {
      this.uiManager.updateXP(xp);
    });
  }

  renderSlots() {
    this.slots.forEach(slot => slot.destroy());
    this.slots = [];

    const slotWidth = 50;
    const slotHeight = 50;
    const slotSpacing = 10;
    const startX = this.cameras.main.width - (this.inventory.length * slotWidth + (this.inventory.length - 1) * slotSpacing);
    const startY = 10;

    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.add.rectangle(startX + i * (slotWidth + slotSpacing), startY, slotWidth, slotHeight, 0x333333)
        .setStrokeStyle(2, 0xffffff)
        .setScrollFactor(0)
        .setDepth(1001)
        .setInteractive();

      slot.on("pointerover", () => {
        if (!this.inventory[i]?.dragging) {
          slot.setFillStyle(0x666666);
        }
      });
      slot.on("pointerout", () => {
        if (!this.inventory[i]?.dragging) {
          slot.setFillStyle(0x333333);
        }
      });

      slot.slotIndex = i;
      this.slots.push(slot);

      if (this.inventory[i] && !this.inventory[i].dragging) {
        this.inventory[i].icon.setPosition(slot.x, slot.y);
      }
    }

    this.input.on("dragstart", (pointer, gameObject) => {
      if (gameObject.itemData) {
        gameObject.itemData.dragging = true;
        gameObject.setDepth(1003);
      }
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      if (gameObject.itemData) {
        gameObject.setPosition(dragX, dragY);
      }
    });

    this.input.on("dragend", (pointer, gameObject) => {
      if (gameObject.itemData) {
        gameObject.itemData.dragging = false;
        gameObject.setDepth(1002);
        const slot = this.slots.find(s => 
          Phaser.Geom.Rectangle.ContainsPoint(s.getBounds(), { x: pointer.x, y: pointer.y })
        );
        if (slot && this.inventory[slot.slotIndex] === undefined) {
          const oldIndex = this.inventory.findIndex(item => item === gameObject.itemData);
          this.inventory[oldIndex] = undefined;
          this.inventory[slot.slotIndex] = gameObject.itemData;
          gameObject.setPosition(slot.x, slot.y);
        } else if (!slot) {
          this.dropItem(gameObject.itemData, pointer.worldX, pointer.worldY);
          const index = this.inventory.findIndex(item => item === gameObject.itemData);
          if (index !== -1) {
            this.removePassiveEffect(gameObject.itemData); // Remove effect when dropped
            this.inventory[index] = undefined;
            gameObject.destroy();
          }
        } else {
          const index = this.inventory.findIndex(item => item === gameObject.itemData);
          gameObject.setPosition(this.slots[index].x, this.slots[index].y);
        }
      }
    });
  }

  addItemToInventory(item) {
    const emptySlotIndex = this.inventory.findIndex(slot => slot === undefined);
    console.log("Current inventory state:", this.inventory.map(i => i ? i.name : "empty"));

    if (emptySlotIndex === -1) {
      console.warn("Inventory full! Item not added:", item.name);
      return false;
    }

    const slot = this.slots[emptySlotIndex];
    if (!this.textures.exists(item.icon)) {
      console.error(`Texture '${item.icon}' not found for item '${item.name}'. Ensure it’s preloaded.`);
      return false;
    }

    const itemIcon = this.add.image(slot.x, slot.y, item.icon)
      .setDisplaySize(40, 40)
      .setScrollFactor(0)
      .setDepth(1002)
      .setInteractive()
      .setVisible(true);

    if (!itemIcon) {
      console.error(`Failed to create itemIcon for '${item.name}' with texture '${item.icon}'`);
      return false;
    }

    this.input.setDraggable(itemIcon);
    itemIcon.itemData = { ...item, dragging: false, icon: itemIcon };
    this.inventory[emptySlotIndex] = itemIcon.itemData;

    // Apply passive effect immediately if not a consumable
    if (!["regeneration", "+1Slot"].includes(item.id)) {
      this.applyPassiveEffect(itemIcon.itemData);
    }

    // Right-click to use consumables
    itemIcon.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown() && !itemIcon.itemData.dragging) {
        if (["regeneration", "+1Slot"].includes(item.id)) {
          this.applyConsumableEffect(itemIcon.itemData);
          const index = this.inventory.findIndex(i => i === itemIcon.itemData);
          if (index !== -1) {
            this.inventory[index] = undefined;
            itemIcon.destroy();
            console.log(`Consumed ${item.name} from slot ${index + 1}`);
            if (item.id === "+1Slot") this.renderSlots(); // Re-render for slot increase
          }
        }
      }
    });

    console.log(`Added ${item.name} to inventory slot ${emptySlotIndex + 1}`);
    return true;
  }

  applyPassiveEffect(item) {
    const gameScene = this.scene.get("GameScene");
    if (!gameScene) {
      console.error("GameScene not found!");
      return;
    }

    if (this.activePassives.has(item.id)) {
      console.log(`${item.name} already active, skipping re-application`);
      return;
    }

    switch (item.id) {
      case "dumbBullets":
        gameScene.weaponManager.enableDumbBullets();
        console.log("Applied Passive: Dumb Bullets (10% slow chance)");
        break;
      case "rapidCharge":
        gameScene.shootCooldown *= 0.8;
        gameScene.weaponManager.stats.shootCooldown = gameScene.shootCooldown;
        console.log(`Applied Passive: Rapid Charge (cooldown ${gameScene.shootCooldown})`);
        break;
      case "vResistance":
        gameScene.damageReduction = (gameScene.damageReduction || 0) + 0.1;
        console.log("Applied Passive: V Resistance (+10% damage reduction)");
        break;
      case "projectileTaming":
        gameScene.weaponManager.enableProjectileTaming();
        console.log("Applied Passive: Projectile Taming (homing bullets)");
        break;
      case "5thAnniversaryBootsOld":
        gameScene.maxHealth *= 1.02;
        gameScene.playerHealth = Math.min(gameScene.maxHealth, gameScene.playerHealth * 1.02);
        gameScene.playerSpeed *= 1.5;
        gameScene.luck = (gameScene.luck || 0) + 0.02;
        console.log("Applied Passive: 5th Anniversary Boots Old (+2% HP, +50% speed, +2% luck)");
        gameScene.registry.set('playerHealth', gameScene.playerHealth);
        gameScene.registry.set('maxHealth', gameScene.maxHealth);
        gameScene.registry.events.emit('updateHealth', gameScene.playerHealth);
        break;
      case "cloneGenerator":
        gameScene.weaponManager.enableCloneGenerator();
        console.log("Applied Passive: Clone Generator (15% shot duplication)");
        break;
      case "3rdAnniversarySwordNerfed":
        gameScene.weaponManager.stats.damage *= 1.04;
        gameScene.playerSpeed *= 1.15;
        gameScene.maxHealth *= 1.02;
        gameScene.playerHealth = Math.min(gameScene.maxHealth, gameScene.playerHealth * 1.02);
        console.log("Applied Passive: 3rd Anniversary Sword Nerfed (+4% damage, +15% speed, +2% HP)");
        gameScene.registry.set('playerHealth', gameScene.playerHealth);
        gameScene.registry.set('maxHealth', gameScene.maxHealth);
        gameScene.registry.events.emit('updateHealth', gameScene.playerHealth);
        break;
      case "thirdAnniversarySword":
        gameScene.weaponManager.stats.damage *= 1.16;
        gameScene.playerSpeed *= 1.40;
        gameScene.maxHealth *= 1.15;
        gameScene.playerHealth = Math.min(gameScene.maxHealth, gameScene.playerHealth * 1.15);
        console.log("Applied Passive: Third Anniversary Sword (+16% damage, +40% speed, +15% HP)");
        gameScene.registry.set('playerHealth', gameScene.playerHealth);
        gameScene.registry.set('maxHealth', gameScene.maxHealth);
        gameScene.registry.events.emit('updateHealth', gameScene.playerHealth);
        break;
      case "enchantedTotem":
        gameScene.hasEnchantedTotem = true;
        console.log("Applied Passive: Enchanted Totem (death prevention)");
        break;
      default:
        if (item.effect) {
          switch (item.effect.type) {
            case "projectileSpeed":
              gameScene.weaponManager.stats.velocity *= (1 + item.effect.value);
              console.log(`Applied Passive: ${item.name} (velocity ${gameScene.weaponManager.stats.velocity})`);
              break;
            case "shootCooldown":
              gameScene.shootCooldown *= (1 - item.effect.value);
              gameScene.weaponManager.stats.shootCooldown = gameScene.shootCooldown;
              console.log(`Applied Passive: ${item.name} (cooldown ${gameScene.shootCooldown})`);
              break;
            case "speed":
              gameScene.playerSpeed *= (1 + item.effect.value);
              console.log(`Applied Passive: ${item.name} (speed ${gameScene.playerSpeed})`);
              break;
            case "damage":
              gameScene.weaponManager.stats.damage *= (1 + item.effect.value);
              console.log(`Applied Passive: ${item.name} (damage ${gameScene.weaponManager.stats.damage})`);
              break;
            default:
              console.warn(`Unknown passive effect type: ${item.effect.type}`);
          }
        }
    }
    this.activePassives.set(item.id, item);
  }

  removePassiveEffect(item) {
    const gameScene = this.scene.get("GameScene");
    if (!gameScene || !this.activePassives.has(item.id)) return;

    switch (item.id) {
      case "dumbBullets":
        gameScene.weaponManager.disableDumbBullets(); // Add this method to WeaponManager
        console.log("Removed Passive: Dumb Bullets");
        break;
      case "rapidCharge":
        gameScene.shootCooldown /= 0.8;
        gameScene.weaponManager.stats.shootCooldown = gameScene.shootCooldown;
        console.log(`Removed Passive: Rapid Charge (cooldown ${gameScene.shootCooldown})`);
        break;
      case "vResistance":
        gameScene.damageReduction = Math.max(0, (gameScene.damageReduction || 0) - 0.1);
        console.log("Removed Passive: V Resistance (-10% damage reduction)");
        break;
      case "projectileTaming":
        gameScene.weaponManager.disableProjectileTaming(); // Add this method to WeaponManager
        console.log("Removed Passive: Projectile Taming");
        break;
      case "5thAnniversaryBootsOld":
        gameScene.maxHealth /= 1.02;
        gameScene.playerHealth = Math.min(gameScene.maxHealth, gameScene.playerHealth / 1.02);
        gameScene.playerSpeed /= 1.5;
        gameScene.luck = Math.max(0, (gameScene.luck || 0) - 0.02);
        console.log("Removed Passive: 5th Anniversary Boots Old");
        gameScene.registry.set('playerHealth', gameScene.playerHealth);
        gameScene.registry.set('maxHealth', gameScene.maxHealth);
        gameScene.registry.events.emit('updateHealth', gameScene.playerHealth);
        break;
      case "cloneGenerator":
        gameScene.weaponManager.disableCloneGenerator(); // Add this method to WeaponManager
        console.log("Removed Passive: Clone Generator");
        break;
      case "3rdAnniversarySwordNerfed":
        gameScene.weaponManager.stats.damage /= 1.04;
        gameScene.playerSpeed /= 1.15;
        gameScene.maxHealth /= 1.02;
        gameScene.playerHealth = Math.min(gameScene.maxHealth, gameScene.playerHealth / 1.02);
        console.log("Removed Passive: 3rd Anniversary Sword Nerfed");
        gameScene.registry.set('playerHealth', gameScene.playerHealth);
        gameScene.registry.set('maxHealth', gameScene.maxHealth);
        gameScene.registry.events.emit('updateHealth', gameScene.playerHealth);
        break;
      case "thirdAnniversarySword":
        gameScene.weaponManager.stats.damage /= 1.16;
        gameScene.playerSpeed /= 1.40;
        gameScene.maxHealth /= 1.15;
        gameScene.playerHealth = Math.min(gameScene.maxHealth, gameScene.playerHealth / 1.15);
        console.log("Removed Passive: Third Anniversary Sword");
        gameScene.registry.set('playerHealth', gameScene.playerHealth);
        gameScene.registry.set('maxHealth', gameScene.maxHealth);
        gameScene.registry.events.emit('updateHealth', gameScene.playerHealth);
        break;
      case "enchantedTotem":
        gameScene.hasEnchantedTotem = false;
        console.log("Removed Passive: Enchanted Totem");
        break;
      default:
        if (item.effect) {
          switch (item.effect.type) {
            case "projectileSpeed":
              gameScene.weaponManager.stats.velocity /= (1 + item.effect.value);
              console.log(`Removed Passive: ${item.name} (velocity ${gameScene.weaponManager.stats.velocity})`);
              break;
            case "shootCooldown":
              gameScene.shootCooldown /= (1 - item.effect.value);
              gameScene.weaponManager.stats.shootCooldown = gameScene.shootCooldown;
              console.log(`Removed Passive: ${item.name} (cooldown ${gameScene.shootCooldown})`);
              break;
            case "speed":
              gameScene.playerSpeed /= (1 + item.effect.value);
              console.log(`Removed Passive: ${item.name} (speed ${gameScene.playerSpeed})`);
              break;
            case "damage":
              gameScene.weaponManager.stats.damage /= (1 + item.effect.value);
              console.log(`Removed Passive: ${item.name} (damage ${gameScene.weaponManager.stats.damage})`);
              break;
          }
        }
    }
    this.activePassives.delete(item.id);
  }

  applyConsumableEffect(item) {
    const gameScene = this.scene.get("GameScene");
    if (!gameScene) {
      console.error("GameScene not found!");
      return;
    }

    switch (item.id) {
      case "regeneration":
        gameScene.startRegeneration();
        console.log("Consumed: Regeneration (+3 health over 8 seconds)");
        break;
      case "+1Slot":
        if (this.inventory.length < this.maxSlots) {
          this.inventory.push(undefined);
          console.log(`Consumed: +1 Slot (slots now ${this.inventory.length})`);
        } else {
          console.log("Max slots reached, +1 Slot not applied");
        }
        break;
      default:
        console.warn(`Item ${item.name} is not a consumable`);
    }
  }

  dropItem(item, x, y) {
    const gameScene = this.scene.get("GameScene");
    if (gameScene) {
      gameScene.spawnDroppedItem(item, x, y);
      this.removePassiveEffect(item); // Remove passive effect when dropped
    } else {
      console.error("GameScene not found for dropping item!");
    }
  }

  isInventoryFull() {
    return this.inventory.every(slot => slot !== undefined);
  }

  update(time, delta) {
    const camera = this.cameras.main;
    this.uiManager.updateUIPosition(0, 0, camera.scrollX, camera.scrollY);

    const slotWidth = 50;
    const slotSpacing = 10;
    const startX = this.cameras.main.width - (this.inventory.length * slotWidth + (this.inventory.length - 1) * slotSpacing);
    const startY = 10;
    this.slots.forEach((slot, i) => {
      slot.setPosition(startX + i * (slotWidth + slotSpacing), startY);
      if (this.inventory[i] && !this.inventory[i].dragging) {
        this.inventory[i].icon.setPosition(slot.x, slot.y);
      }
    });
  }
}