// /src/index.js
import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import gameConfig from './config.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: gameConfig.display.backgroundColor,
  pixelArt: gameConfig.display.pixelArt,
  physics: {
    default: 'arcade',
    arcade: { 
      debug: gameConfig.debug.drawColliders,
      gravity: gameConfig.world.gravity ? { y: 300 } : false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);

// Add FPS counter if debug is enabled
if (gameConfig.debug.showFPS) {
  let fpsText;
  game.events.once('ready', () => {
    fpsText = game.scene.getScene('GameScene').add.text(10, 60, 'FPS: --', {
      fontSize: '14px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(1001);
  });
  
  game.events.on('step', () => {
    if (fpsText) {
      fpsText.setText(`FPS: ${Math.round(game.loop.actualFps)}`);
    }
  });
}

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});