import Phaser from 'phaser';
import { generateDungeon } from '../systems/procedural/DungeonGenerator.js';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, ROOM_WIDTH, ROOM_HEIGHT } from '../utils/Constants.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {}

  create() {
    const { dungeon, rooms, doors } = generateDungeon();

    this.dungeon = dungeon;
    this.rooms = rooms;
    this.floorTiles = this.add.group();
    this.wallTiles = this.physics.add.staticGroup();
    this.doorTiles = this.add.group();
    this.fogTiles = this.add.group();

    this.currentRoom = rooms[0];
    this.renderRoom(this.currentRoom);

    doors.forEach(door => {
      const posX = (door.x - door.y) * TILE_SIZE;
      const posY = (door.x + door.y) * (TILE_SIZE / 2);
      this.doorTiles.create(posX, posY, null)
        .setDisplaySize(TILE_SIZE / 2, TILE_SIZE / 2)
        .setOrigin(0.5, 1)
        .setTint(0x00ff00)
        .setDepth(posY)
        .roomId = door.roomId;
    });

    const roomCenterX = (this.currentRoom.getLeft() + this.currentRoom.getRight()) / 2;
    const roomCenterY = (this.currentRoom.getTop() + this.currentRoom.getBottom()) / 2;
    const playerX = (roomCenterX - roomCenterY) * TILE_SIZE;
    const playerY = (roomCenterX + roomCenterY) * (TILE_SIZE / 2);

    this.player = this.add.rectangle(playerX, playerY, 16, 24, 0xff0000)
      .setOrigin(0.5, 1);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(12, 20); // Ajustar el tamaño del cuerpo físico
    this.player.setDepth(1000); // Asegurar que el jugador esté visible

    this.playerShadow = this.add.ellipse(0, 0, 20, 10, 0x000000, 0.3)
      .setOrigin(0.5, 1)
      .setDepth(this.player.y - 1);

    this.light = this.add.circle(400, 200, 100, 0xffffff)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(0.8)
      .setDepth(1000);

    this.keys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      C: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)
    };

    this.noclipMode = false;
    this.noclipText = this.add.text(10, 10, 'Noclip: OFF', { fontSize: '16px', color: '#ffffff' })
      .setDepth(1001);

    this.physics.add.collider(this.player, this.wallTiles);
    this.updateCameraBounds();
    this.physics.add.overlap(this.player, this.doorTiles, this.handleDoorTransition, null, this);
  }

  renderRoom(room) {
    this.floorTiles.clear(true, true);
    this.wallTiles.clear(true, true);
    this.fogTiles.clear(true, true);

    const margin = Math.max(ROOM_WIDTH, ROOM_HEIGHT);
    const left = Math.max(room.getLeft() - margin, 0);
    const right = Math.min(room.getRight() + margin, MAP_WIDTH - 1);
    const top = Math.max(room.getTop() - margin, 0);
    const bottom = Math.min(room.getBottom() + margin, MAP_HEIGHT - 1);

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const posX = (x - y) * TILE_SIZE;
        const posY = (x + y) * (TILE_SIZE / 2);

        if (this.dungeon[y][x] === 0) {
          this.floorTiles.create(posX, posY, null)
            .setDisplaySize(TILE_SIZE, TILE_SIZE / 2)
            .setOrigin(0.5, 1)
            .setTint(0x333333)
            .setDepth(posY);
        } else {
          this.wallTiles.create(posX, posY - TILE_SIZE / 2, null)
            .setDisplaySize(TILE_SIZE, TILE_SIZE * 1.5)
            .setOrigin(0.5, 1)
            .setTint(0x888888)
            .setDepth(posY + 1);
        }
      }
    }

    this.rooms.forEach(otherRoom => {
      if (!otherRoom.visited && otherRoom !== room) {
        const otherLeft = otherRoom.getLeft();
        const otherRight = otherRoom.getRight();
        const otherTop = otherRoom.getTop();
        const otherBottom = otherRoom.getBottom();

        if (otherRight >= left && otherLeft <= right && otherBottom >= top && otherTop <= bottom) {
          for (let y = otherTop; y <= otherBottom; y++) {
            for (let x = otherLeft; x <= otherRight; x++) {
              const posX = (x - y) * TILE_SIZE;
              const posY = (x + y) * (TILE_SIZE / 2);
              this.fogTiles.create(posX, posY, null)
                .setDisplaySize(TILE_SIZE, TILE_SIZE)
                .setOrigin(0.5, 1)
                .setTint(0x000000)
                .setAlpha(0.9)
                .setDepth(posY + 2)
                .roomId = otherRoom.id;
            }
          }
        }
      }
    });

    this.wallTiles.refresh();
  }

  updateCameraBounds() {
    const room = this.currentRoom;
    const margin = Math.max(ROOM_WIDTH, ROOM_HEIGHT);
    const left = (room.getLeft() - room.getTop() - margin) * TILE_SIZE;
    const right = (room.getRight() - room.getBottom() + margin) * TILE_SIZE;
    const top = (room.getLeft() + room.getTop() - margin) * (TILE_SIZE / 2);
    const bottom = (room.getRight() + room.getBottom() + margin) * (TILE_SIZE / 2);

    this.cameras.main.setBounds(left, top, right - left, bottom - top);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
  }

  handleDoorTransition(player, door) {
    const nextRoomId = door.roomId;
    const nextRoom = this.rooms[nextRoomId];

    if (nextRoom !== this.currentRoom) {
      nextRoom.visited = true;

      this.fogTiles.getChildren().forEach(fogTile => {
        if (fogTile.roomId === nextRoomId) {
          fogTile.destroy();
        }
      });

      this.cameras.main.fadeOut(250, 0, 0, 0, (camera, progress) => {
        if (progress === 1) {
          this.currentRoom = nextRoom;

          const roomCenterX = (nextRoom.getLeft() + nextRoom.getRight()) / 2;
          const roomCenterY = (nextRoom.getTop() + nextRoom.getBottom()) / 2;
          const playerX = (roomCenterX - roomCenterY) * TILE_SIZE;
          const playerY = (roomCenterX + roomCenterY) * (TILE_SIZE / 2);
          this.player.setPosition(playerX, playerY);

          this.renderRoom(nextRoom);
          this.updateCameraBounds();
          this.cameras.main.fadeIn(250);
        }
      });
    }
  }

  update() {
    const speed = 200;
    let velocityX = 0;
    let velocityY = 0;

    if (this.keys.W.isDown) {
      velocityX -= speed * 0.7;
      velocityY -= speed * 0.3;
    }
    if (this.keys.S.isDown) {
      velocityX += speed * 0.7;
      velocityY += speed * 0.3;
    }
    if (this.keys.A.isDown) {
      velocityX -= speed * 0.3;
      velocityY += speed * 0.7;
    }
    if (this.keys.D.isDown) {
      velocityX += speed * 0.3;
      velocityY -= speed * 0.7;
    }

    if (velocityX !== 0 && velocityY !== 0) {
      const magnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      velocityX = (velocityX / magnitude) * speed;
      velocityY = (velocityY / magnitude) * speed;
    }

    this.player.body.setVelocity(velocityX, velocityY);

    this.playerShadow.setPosition(this.player.x, this.player.y + 5);
    this.playerShadow.setDepth(this.player.y - 1);

    this.player.setDepth(this.player.y);

    this.light.setPosition(this.player.x, this.player.y - 50);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.tweens.add({
        targets: this.player,
        scale: 0.8,
        duration: 200,
        yoyo: true,
        onUpdate: () => {
          this.playerShadow.setAlpha(0.1);
        },
        onComplete: () => {
          this.playerShadow.setAlpha(0.3);
        }
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.noclipMode = !this.noclipMode;
      this.noclipText.setText(`Noclip: ${this.noclipMode ? 'ON' : 'OFF'}`);
      this.physics.world.colliders.getActive().forEach(collider => {
        if (collider.object1 === this.player || collider.object2 === this.player) {
          collider.active = !this.noclipMode;
        }
      });
    }

    this.wallTiles.getChildren().forEach(wall => {
      wall.setAlpha(1);
    });
  }
}