import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import GameScene from "./scenes/GameScene";
import HUDScene from "./scenes/HUDScene";
import GameOverScene from "./scenes/GameOverScene";
import SkillMenuScene from "./scenes/SkillMenuScene.js"; // New scene
import ChestScene from "./scenes/ChestScene.js"; // New scene
import DebugScene from './scenes/DebugScene.js'; // New scene

const config = {
  type: Phaser.WEBGL,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [MenuScene, GameScene, HUDScene, GameOverScene, SkillMenuScene, ChestScene, DebugScene], 
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  callbacks: {
    postBoot: () => {
      window.addEventListener("resize", () => {
        config.width = window.innerWidth;
        config.height = window.innerHeight;
        game.scale.resize(window.innerWidth, window.innerHeight);
        game.canvas.setAttribute("width", window.innerWidth);
        game.canvas.setAttribute("height", window.innerHeight);
      });
    },
  },
};

const game = new Phaser.Game(config);

game.events.on("ready", () => {
  console.log("Renderer:", game.renderer);
  console.log("Pipelines:", game.renderer.pipelines);
  if (game.renderer && game.renderer.pipelines) {
    const light2DPipeline = game.renderer.pipelines.get('Light2D');
    console.log("Light2D Pipeline Available:", !!light2DPipeline);
  } else {
    console.warn("Pipelines or renderer not properly initialized.");
  }
});
