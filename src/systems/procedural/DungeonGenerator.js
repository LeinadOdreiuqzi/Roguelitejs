import * as ROT from 'rot-js';
import { MAP_WIDTH, MAP_HEIGHT } from '../../utils/Constants.js';

export function generateDungeon() {
  const map = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
    roomWidth: [15, 25],    // Salas más grandes
    roomHeight: [10, 20],
    corridorLength: [3, 6],
    dugPercentage: 0.25     // Menor densidad para salas más grandes
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
    });
  });

  rooms[0].visited = true;

  return { dungeon, rooms, doors };
}