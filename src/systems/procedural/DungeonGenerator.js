import * as ROT from 'rot-js';
import { MAP_WIDTH, MAP_HEIGHT } from '../../utils/Constants.js';

export function generateDungeon() {
  const map = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
    roomWidth: [12, 20],    // Ajustado para el lienzo más grande
    roomHeight: [10, 16],
    corridorLength: [4, 10], // Pasillos más largos para conectar mejor
    dugPercentage: 0.1      // Menor densidad para evitar superposiciones
  });

  const dungeon = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(1));
  const doors = [];

  map.create((x, y, value) => {
    dungeon[y][x] = value;
  });

  const rooms = map.getRooms();
  rooms.forEach((room, index) => {
    room.id = index;
    room.visited = false;
    room.doors = [];
    room.getDoors((x, y) => {
      doors.push({ x, y, roomId: index });
      room.doors.push({ x, y });
      dungeon[y][x] = 0; // Asegurar que las puertas sean accesibles
    });

    // Asegurar que las habitaciones tengan paredes completas
    for (let y = room.getTop() - 1; y <= room.getBottom() + 1; y++) {
      for (let x = room.getLeft() - 1; x <= room.getRight() + 1; x++) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) continue;
        if (x < room.getLeft() || x > room.getRight() || y < room.getTop() || y > room.getBottom()) {
          dungeon[y][x] = 1; // Rellenar con paredes alrededor de la sala
        } else {
          dungeon[y][x] = 0; // Dentro de la sala es suelo
        }
      }
    }
  });

  // Centralizar el mapa
  const centerX = Math.floor(MAP_WIDTH / 2);
  const centerY = Math.floor(MAP_HEIGHT / 2);
  const firstRoom = rooms[0];
  const offsetX = centerX - Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2);
  const offsetY = centerY - Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2);

  const newDungeon = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(1));
  rooms.forEach(room => {
    room.x1 += offsetX;
    room.x2 += offsetX;
    room.y1 += offsetY;
    room.y2 += offsetY;
    for (let y = room.getTop() - 1; y <= room.getBottom() + 1; y++) {
      for (let x = room.getLeft() - 1; x <= room.getRight() + 1; x++) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) continue;
        if (x < room.getLeft() || x > room.getRight() || y < room.getTop() || y > room.getBottom()) {
          newDungeon[y][x] = 1;
        } else {
          newDungeon[y][x] = 0;
        }
      }
    }
  });

  doors.forEach(door => {
    door.x += offsetX;
    door.y += offsetY;
    if (door.x >= 0 && door.x < MAP_WIDTH && door.y >= 0 && door.y < MAP_HEIGHT) {
      newDungeon[door.y][door.x] = 0;
    }
  });

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (dungeon[y][x] === 0) {
        const newX = x + offsetX;
        const newY = y + offsetY;
        if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
          newDungeon[newY][newX] = 0;
        }
      }
    }
  }

  rooms[0].visited = true;

  return { dungeon: newDungeon, rooms, doors };
}

export function findBestSpawnPoint(dungeon, room) {
  const center = {
    x: Math.floor((room.getLeft() + room.getRight()) / 2),
    y: Math.floor((room.getTop() + room.getBottom()) / 2)
  };

  if (isValidSpawnLocation(dungeon, center.x, center.y)) {
    return center;
  }

  const searchRadius = Math.min(room.width, room.height) / 2;
  for (let radius = 1; radius <= searchRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = center.x + dx;
          const y = center.y + dy;
          if (isValidSpawnLocation(dungeon, x, y)) {
            return { x, y };
          }
        }
      }
    }
  }

  return center;
}

export function isValidSpawnLocation(dungeon, x, y) {
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
    return false;
  }

  if (dungeon[y][x] !== 0) {
    return false;
  }

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT || dungeon[ny][nx] !== 0) {
        return false;
      }
    }
  }

  return true;
}