import Phaser from "phaser";
import { UIManager } from "../systems/ui/UiManager";

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super("HUDScene");
    this.uiManager = null;
  }

  create() {
    const playerHealth = this.registry.get('playerHealth') || 100;
    const noclipMode = this.registry.get('noclipMode') || false;
    const currentRoom = this.registry.get('currentRoom') || { id: 0, width: 0, height: 0 };
    const version = "Version 1.2.2: Random Shooting";

    this.uiManager = new UIManager(this);
    this.uiManager.createUI(playerHealth, noclipMode, version);
    this.uiManager.updateDebugRoom(currentRoom);

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

  update(time, delta) {
    const camera = this.cameras.main;
    this.uiManager.updateUIPosition(0, 0, camera.scrollX, camera.scrollY);
  }
}