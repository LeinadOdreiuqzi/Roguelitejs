import * as ROT from "rot-js";
import { MAP_WIDTH, MAP_HEIGHT } from "../../utils/Constants.js";

export function generateDungeon() {
  const map = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
    roomWidth: [8, 15],
    roomHeight: [6, 12],
    corridorLength: [3, 6],
    dugPercentage: 0.1,
    roomDugPercentage: 0.2,
  });

  const dungeon = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(1));
  const doors = [];
  const corridorPaths = new Map();

  map.create((x, y, value) => {
    dungeon[y][x] = value;
    if (value === 0) corridorPaths.set(`${x},${y}`, []);
  });

  const rooms = map.getRooms();
  const validRooms = [];
  const disconnectedRooms = [];

  const quadrantWidth = Math.floor(MAP_WIDTH / 2);
  const quadrantHeight = Math.floor(MAP_HEIGHT / 2);
  const quadrants = [
    { minX: 0, maxX: quadrantWidth, minY: 0, maxY: quadrantHeight, rooms: 0 },
    { minX: quadrantWidth, maxX: MAP_WIDTH, minY: 0, maxY: quadrantHeight, rooms: 0 },
    { minX: 0, maxX: quadrantWidth, minY: quadrantHeight, maxY: MAP_HEIGHT, rooms: 0 },
    { minX: quadrantWidth, maxX: MAP_WIDTH, minY: quadrantHeight, maxY: MAP_HEIGHT, rooms: 0 }
  ];

  const canvasBoundary = { minX: 0, maxX: MAP_WIDTH - 1, minY: 0, maxY: MAP_HEIGHT - 1 };
  const secondaryBoundary = { minX: 2, maxX: MAP_WIDTH - 3, minY: 2, maxY: MAP_HEIGHT - 3 };
  const MAX_ROOM_WIDTH = 15;
  const MAX_ROOM_HEIGHT = 12;

  // Precompute door positions to avoid recalculating in getDoors
  const getDoorPositions = (room) => [
    { x: Math.floor((room.x1 + room.x2) / 2), y: room.y1 - 1 },
    { x: Math.floor((room.x1 + room.x2) / 2), y: room.y2 + 1 },
    { x: room.x1 - 1, y: Math.floor((room.y1 + room.y2) / 2) },
    { x: room.x2 + 1, y: Math.floor((room.y1 + room.y2) / 2) },
  ];

  rooms.forEach((room, index) => {
    room.id = index;
    room.visited = false;
    room.doors = [];
    room.markerColor = Phaser.Display.Color.RandomRGB().color;

    let left = Math.max(secondaryBoundary.minX + 2, room.getLeft());
    let right = Math.min(secondaryBoundary.maxX - 2, room.getRight());
    let top = Math.max(secondaryBoundary.minY + 2, room.getTop());
    let bottom = Math.min(secondaryBoundary.maxY - 2, room.getBottom());

    if (right - left < 5 || bottom - top < 5) return;
    if (Math.abs((right - left) - (bottom - top)) > 8) return;

    if (
      left < secondaryBoundary.minX ||
      right > secondaryBoundary.maxX ||
      top < secondaryBoundary.minY ||
      bottom > secondaryBoundary.maxY
    ) {
      disconnectedRooms.push(room);
      return;
    }

    room.x1 = left;
    room.x2 = right;
    room.y1 = top;
    room.y2 = bottom;

    const roomWidth = right - left + 1;
    const roomHeight = bottom - top + 1;

    if (roomWidth > MAX_ROOM_WIDTH || roomHeight > MAX_ROOM_HEIGHT) {
      const splitRooms = splitRoom(room, dungeon, MAX_ROOM_WIDTH, MAX_ROOM_HEIGHT);
      
      splitRooms.forEach((splitRoom, splitIndex) => {
        const doorPositions = getDoorPositions(splitRoom);
        doorPositions.forEach((pos) => {
          if (
            pos.x >= secondaryBoundary.minX &&
            pos.x <= secondaryBoundary.maxX &&
            pos.y >= secondaryBoundary.minY &&
            pos.y <= secondaryBoundary.maxY
          ) {
            doors.push({ x: pos.x, y: pos.y, roomId: splitRoom.id });
            splitRoom.doors.push({ x: pos.x, y: pos.y });
            dungeon[pos.y][pos.x] = 0;
          }
        });

        if (splitIndex > 0) {
          const prevRoom = splitRooms[splitIndex - 1];
          const doorX = Math.floor((prevRoom.x2 + splitRoom.x1) / 2);
          const doorY = Math.floor((prevRoom.y1 + prevRoom.y2) / 2);
          if (
            doorX >= secondaryBoundary.minX &&
            doorX <= secondaryBoundary.maxX &&
            doorY >= secondaryBoundary.minY &&
            doorY <= secondaryBoundary.maxY
          ) {
            doors.push({ x: doorX, y: doorY, roomId: prevRoom.id });
            doors.push({ x: doorX, y: doorY, roomId: splitRoom.id });
            prevRoom.doors.push({ x: doorX, y: doorY });
            splitRoom.doors.push({ x: doorX, y: doorY });
            dungeon[doorY][doorX] = 0;
          }
        }
      });

      validRooms.push(...splitRooms);
    } else {
      const doorPositions = getDoorPositions(room);
      doorPositions.forEach((pos) => {
        if (
          pos.x >= secondaryBoundary.minX &&
          pos.x <= secondaryBoundary.maxX &&
          pos.y >= secondaryBoundary.minY &&
          pos.y <= secondaryBoundary.maxY
        ) {
          doors.push({ x: pos.x, y: pos.y, roomId: room.id });
          room.doors.push({ x: pos.x, y: pos.y });
          dungeon[pos.y][pos.x] = 0;
        }
      });
      validRooms.push(room);
    }
  });

  const minRoomsPerQuadrant = 1;
  quadrants.forEach((quadrant) => {
    while (quadrant.rooms < minRoomsPerQuadrant && validRooms.length < 15) {
      const roomWidth = Phaser.Math.Between(8, 15);
      const roomHeight = Phaser.Math.Between(6, 12);
      const x = Phaser.Math.Between(
        Math.max(quadrant.minX + 2, secondaryBoundary.minX),
        Math.min(quadrant.maxX - roomWidth - 2, secondaryBoundary.maxX - roomWidth)
      );
      const y = Phaser.Math.Between(
        Math.max(quadrant.minY + 2, secondaryBoundary.minY),
        Math.min(quadrant.maxY - roomHeight - 2, secondaryBoundary.maxY - roomHeight)
      );

      const paddedX = Math.max(secondaryBoundary.minX + 2, x);
      const paddedY = Math.max(secondaryBoundary.minY + 2, y);
      const paddedWidth = Math.min(roomWidth, secondaryBoundary.maxX - paddedX - 2);
      const paddedHeight = Math.min(roomHeight, secondaryBoundary.maxY - paddedY - 2);

      if (paddedWidth < 6 || paddedHeight < 4) continue;

      const newRoom = {
        x1: paddedX,
        y1: paddedY,
        x2: paddedX + paddedWidth - 1,
        y2: paddedY + paddedHeight - 1,
        id: validRooms.length,
        visited: false,
        doors: [],
        markerColor: Phaser.Display.Color.RandomRGB().color,
        getLeft: function () { return this.x1; },
        getRight: function () { return this.x2; },
        getTop: function () { return this.y1; },
        getBottom: function () { return this.y2; },
        getDoors: function (callback) {
          const doorPositions = getDoorPositions(this);
          doorPositions.forEach((pos) => {
            if (
              pos.x >= secondaryBoundary.minX &&
              pos.x <= secondaryBoundary.maxX &&
              pos.y >= secondaryBoundary.minY &&
              pos.y <= secondaryBoundary.maxY
            ) {
              callback(pos.x, pos.y);
            }
          });
        },
      };

      let overlaps = false;
      for (const validRoom of validRooms) {
        if (
          newRoom.getLeft() - 2 <= validRoom.getRight() &&
          newRoom.getRight() + 2 >= validRoom.getLeft() &&
          newRoom.getTop() - 2 <= validRoom.getBottom() &&
          newRoom.getBottom() + 2 >= validRoom.getTop()
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        validRooms.push(newRoom);
        quadrant.rooms++;

        const doorPositions = getDoorPositions(newRoom);
        doorPositions.forEach((pos) => {
          if (
            pos.x >= secondaryBoundary.minX &&
            pos.x <= secondaryBoundary.maxX &&
            pos.y >= secondaryBoundary.minY &&
            pos.y <= secondaryBoundary.maxY
          ) {
            doors.push({ x: pos.x, y: pos.y, roomId: newRoom.id });
            newRoom.doors.push({ x: pos.x, y: pos.y });
            dungeon[pos.y][pos.x] = 0;
          }
        });

        for (let y = newRoom.getTop() - 1; y <= newRoom.getBottom() + 1; y++) {
          for (let x = newRoom.getLeft() - 1; x <= newRoom.getRight() + 1; x++) {
            if (x < canvasBoundary.minX || x > canvasBoundary.maxX || y < canvasBoundary.minY || y > canvasBoundary.maxY) continue;
            dungeon[y][x] = 1;
          }
        }

        for (let y = newRoom.getTop(); y <= newRoom.getBottom(); y++) {
          for (let x = newRoom.getLeft(); x <= newRoom.getRight(); x++) {
            dungeon[y][x] = 0;
          }
        }

        if (
          newRoom.getLeft() - 1 === secondaryBoundary.minX - 1 ||
          newRoom.getRight() + 1 === secondaryBoundary.maxX + 1 ||
          newRoom.getTop() - 1 === secondaryBoundary.minY - 1 ||
          newRoom.getBottom() + 1 === secondaryBoundary.maxY + 1
        ) {
          for (let y = secondaryBoundary.minY - 1; y <= secondaryBoundary.maxY + 1; y++) {
            dungeon[y][secondaryBoundary.minX - 1] = 1;
            dungeon[y][secondaryBoundary.maxX + 1] = 1;
          }
          for (let x = secondaryBoundary.minX - 1; x <= secondaryBoundary.maxX + 1; x++) {
            dungeon[secondaryBoundary.minY - 1][x] = 1;
            dungeon[secondaryBoundary.maxY + 1][x] = 1;
          }
        }
      }
    }
  });

  validRooms.forEach((room) => {
    const left = room.getLeft();
    const right = room.getRight();
    const top = room.getTop();
    const bottom = room.getBottom();

    for (let y = top - 1; y <= bottom + 1; y++) {
      for (let x = left - 1; x <= right + 1; x++) {
        if (x < canvasBoundary.minX || x > canvasBoundary.maxX || y < canvasBoundary.minY || y > canvasBoundary.maxY) continue;
        dungeon[y][x] = 1;
      }
    }

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        dungeon[y][x] = 0;
      }
    }
  });

  const visited = new Set();
  const parentMap = new Map();
  let loopCount = 0;
  const checkLoop = (x, y) => {
    const key = `${x},${y}`;
    if (visited.has(key)) {
      const parentKey = parentMap.get(key);
      if (parentKey) {
        const [px, py] = parentKey.split(",").map(Number);
        dungeon[py][px] = 1;
        corridorPaths.delete(parentKey);
        loopCount++;
      }
      return true;
    }
    visited.add(key);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (
        nx >= secondaryBoundary.minX &&
        nx <= secondaryBoundary.maxX &&
        ny >= secondaryBoundary.minY &&
        ny <= secondaryBoundary.maxY &&
        dungeon[ny][nx] === 0
      ) {
        const nextKey = `${nx},${ny}`;
        if (!visited.has(nextKey) && corridorPaths.has(nextKey)) {
          parentMap.set(nextKey, key);
          if (checkLoop(nx, ny)) return true;
        } else if (parentMap.get(key) !== nextKey && corridorPaths.has(nextKey)) {
          dungeon[y][x] = 1;
          corridorPaths.delete(key);
          loopCount++;
          return true;
        }
      }
    }
    return false;
  };

  corridorPaths.forEach((_, key) => {
    const [x, y] = key.split(",").map(Number);
    if (!visited.has(key)) {
      parentMap.clear();
      checkLoop(x, y);
    }
  });

  const fillEmptySpaces = () => {
    const visitedTiles = new Set();
    const roomTiles = new Set();

    validRooms.forEach(room => {
      for (let y = room.getTop(); y <= room.getBottom(); y++) {
        for (let x = room.getLeft(); x <= room.getRight(); x++) {
          roomTiles.add(`${x},${y}`);
        }
      }
    });

    const floodFill = (startX, startY) => {
      const stack = [[startX, startY]];
      const tiles = new Set();
      tiles.add(`${startX},${startY}`);
      let isRoomPart = false;

      while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (roomTiles.has(`${x},${y}`)) {
          isRoomPart = true;
          break;
        }

        const directions = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];

        for (const dir of directions) {
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          const key = `${nx},${ny}`;
          if (
            nx >= secondaryBoundary.minX &&
            nx <= secondaryBoundary.maxX &&
            ny >= secondaryBoundary.minY &&
            ny <= secondaryBoundary.maxY &&
            dungeon[ny][nx] === 0 &&
            !visitedTiles.has(key)
          ) {
            stack.push([nx, ny]);
            tiles.add(key);
            visitedTiles.add(key);
          }
        }
      }

      return { tiles, isRoomPart };
    };

    for (let y = secondaryBoundary.minY; y <= secondaryBoundary.maxY; y++) {
      for (let x = secondaryBoundary.minX; x <= secondaryBoundary.maxX; x++) {
        const key = `${x},${y}`;
        if (dungeon[y][x] === 0 && !visitedTiles.has(key)) {
          const { tiles, isRoomPart } = floodFill(x, y);
          if (!isRoomPart && tiles.size > 50) {
            tiles.forEach(tile => {
              const [tx, ty] = tile.split(',').map(Number);
              dungeon[ty][tx] = 1;
            });
          }
        }
      }
    }
  };

  fillEmptySpaces();

  const cleanupWalls = () => {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 },
    ];

    for (let y = secondaryBoundary.minY; y <= secondaryBoundary.maxY; y++) {
      for (let x = secondaryBoundary.minX; x <= secondaryBoundary.maxX; x++) {
        if (dungeon[y][x] !== 1) continue;

        let adjacentFloors = 0;
        let adjacentWalls = 0;
        let isNearRoom = false;
        let isCorridorBlock = false;
        let isPartOfPath = false;

        for (const dir of directions) {
          const nx = x + dir.dx;
          const ny = y + dir.dy;
          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
          if (dungeon[ny][nx] === 0) {
            adjacentFloors++;
            let floorNeighbors = 0;
            let floorDirections = [];
            for (const d of directions) {
              const nnx = nx + d.dx;
              const nny = ny + d.dy;
              if (nnx < 0 || nnx >= MAP_WIDTH || nny < 0 || nny >= MAP_HEIGHT) continue;
              if (dungeon[nny][nnx] === 0) {
                floorNeighbors++;
                floorDirections.push({ dx: d.dx, dy: d.dy });
              }
            }
            if (floorNeighbors <= 2) {
              isCorridorBlock = true;
              if (floorNeighbors === 2) {
                let dir1 = floorDirections[0];
                let dir2 = floorDirections[1];
                if (dir1.dx === -dir2.dx && dir1.dy === -dir2.dy) {
                  isPartOfPath = true;
                }
              }
            }
          } else {
            adjacentWalls++;
          }
        }

        for (const room of validRooms) {
          if (
            x >= room.getLeft() - 2 &&
            x <= room.getRight() + 2 &&
            y >= room.getTop() - 2 &&
            y <= room.getBottom() + 2
          ) {
            isNearRoom = true;
            break;
          }
        }

        if (
          (adjacentFloors >= 4 && adjacentWalls <= 4 && !isNearRoom) ||
          (isCorridorBlock && adjacentFloors >= 2 && !isPartOfPath) ||
          (adjacentFloors >= 3 && !isNearRoom && !isPartOfPath)
        ) {
          dungeon[y][x] = 0;
        }
      }
    }

    for (let y = secondaryBoundary.minY - 1; y <= secondaryBoundary.maxY + 1; y++) {
      dungeon[y][secondaryBoundary.minX - 1] = 1;
      dungeon[y][secondaryBoundary.maxX + 1] = 1;
    }
    for (let x = secondaryBoundary.minX - 1; x <= secondaryBoundary.maxX + 1; x++) {
      dungeon[secondaryBoundary.minY - 1][x] = 1;
      dungeon[secondaryBoundary.maxY + 1][x] = 1;
    }
  };

  cleanupWalls();

  const ensureAccessibility = () => {
    validRooms.forEach((room, index) => {
      if (room.doors.length === 0) {
        let closestRoom = null;
        let minDistance = Infinity;

        for (let i = 0; i < validRooms.length; i++) {
          if (i === index) continue;
          const otherRoom = validRooms[i];
          const dx = (room.getLeft() + room.getRight()) / 2 - (otherRoom.getLeft() + otherRoom.getRight()) / 2;
          const dy = (room.getTop() + room.getBottom()) / 2 - (otherRoom.getTop() + otherRoom.getBottom()) / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            closestRoom = otherRoom;
          }
        }

        if (closestRoom) {
          const doorX = Math.floor((room.getRight() + closestRoom.getLeft()) / 2);
          const doorY = Math.floor((room.getTop() + closestRoom.getBottom()) / 2);
          if (
            doorX >= secondaryBoundary.minX &&
            doorX <= secondaryBoundary.maxX &&
            doorY >= secondaryBoundary.minY &&
            doorY <= secondaryBoundary.maxY
          ) {
            doors.push({ x: doorX, y: doorY, roomId: room.id });
            doors.push({ x: doorX, y: doorY, roomId: closestRoom.id });
            room.doors.push({ x: doorX, y: doorY });
            closestRoom.doors.push({ x: doorX, y: doorY });
            dungeon[doorY][doorX] = 0;
          }
        }
      }
    });
  };

  ensureAccessibility();

  const roomConnections = new Map();
  const seenDoors = new Set();
  validRooms.forEach((room, index) => {
    const uniqueDoors = [];
    room.doors.forEach((door) => {
      const doorKey = `${door.x},${door.y}`;
      if (!seenDoors.has(doorKey)) {
        seenDoors.add(doorKey);
        uniqueDoors.push(door);
        if (corridorPaths.has(doorKey)) {
          for (let otherIndex = 0; otherIndex < validRooms.length; otherIndex++) {
            if (otherIndex === index) continue;
            const otherRoom = validRooms[otherIndex];
            let connects = false;
            otherRoom.doors.forEach((otherDoor) => {
              if (otherDoor.x === door.x && otherDoor.y === door.y) {
                connects = true;
              }
            });
            if (connects) {
              const connectionKey = `${Math.min(index, otherIndex)}-${Math.max(index, otherIndex)}`;
              if (roomConnections.has(connectionKey)) {
                room.doors = room.doors.filter(d => d.x !== door.x || d.y !== door.y);
                doors.splice(doors.findIndex(d => d.x === door.x && d.y === door.y && d.roomId === room.id), 1);
              } else {
                roomConnections.set(connectionKey, { door: doorKey });
              }
            }
          }
        }
      }
    });
    room.doors = uniqueDoors;
  });

  const connectionGraph = new Map();
  validRooms.forEach((room) => {
    connectionGraph.set(room.id, new Set());
  });

  doors.forEach((door) => {
    const doorKey = `${door.x},${door.y}`;
    const connectedRooms = [];
    validRooms.forEach((room) => {
      room.doors.forEach((d) => {
        if (d.x === door.x && d.y === door.y) {
          connectedRooms.push(room.id);
        }
      });
    });

    if (connectedRooms.length === 2) {
      const [roomA, roomB] = connectedRooms;
      connectionGraph.get(roomA).add(roomB);
      connectionGraph.get(roomB).add(roomA);
    }
  });

  const centerX = Math.floor(MAP_WIDTH / 2);
  const centerY = Math.floor(MAP_HEIGHT / 2);
  const firstRoom = validRooms[0] || {
    getLeft: () => centerX,
    getRight: () => centerX,
    getTop: () => centerY,
    getBottom: () => centerY,
  };

  let offsetX = centerX - Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2);
  let offsetY = centerY - Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  validRooms.forEach(room => {
    minX = Math.min(minX, room.getLeft());
    maxX = Math.max(maxX, room.getRight());
    minY = Math.min(minY, room.getTop());
    maxY = Math.max(maxY, room.getBottom());
  });

  if (minX + offsetX < secondaryBoundary.minX) offsetX = secondaryBoundary.minX - minX;
  if (maxX + offsetX > secondaryBoundary.maxX) offsetX = secondaryBoundary.maxX - maxX;
  if (minY + offsetY < secondaryBoundary.minY) offsetY = secondaryBoundary.minY - minY;
  if (maxY + offsetY > secondaryBoundary.maxY) offsetY = secondaryBoundary.maxY - maxY;

  const newDungeon = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(1));
  const newDoors = [];
  validRooms.forEach((room) => {
    room.x1 += offsetX;
    room.x2 += offsetX;
    room.y1 += offsetY;
    room.y2 += offsetY;

    room.x1 = Math.max(secondaryBoundary.minX, Math.min(secondaryBoundary.maxX, room.x1));
    room.x2 = Math.max(secondaryBoundary.minX, Math.min(secondaryBoundary.maxX, room.x2));
    room.y1 = Math.max(secondaryBoundary.minY, Math.min(secondaryBoundary.maxY, room.y1));
    room.y2 = Math.max(secondaryBoundary.minY, Math.min(secondaryBoundary.maxY, room.y2));

    for (let y = room.y1 - 1; y <= room.y2 + 1; y++) {
      for (let x = room.x1 - 1; x <= room.x2 + 1; x++) {
        if (x < canvasBoundary.minX || x > canvasBoundary.maxX || y < canvasBoundary.minY || y > canvasBoundary.maxY) continue;
        if (x < room.x1 || x > room.x2 || y < room.y1 || y > room.y2) {
          newDungeon[y][x] = 1;
        } else {
          newDungeon[y][x] = 0;
        }
      }
    }
  });

  doors.forEach((door) => {
    if (typeof door.x === "undefined" || typeof door.y === "undefined") return;
    door.x += offsetX;
    door.y += offsetY;
    if (
      door.x >= secondaryBoundary.minX &&
      door.x <= secondaryBoundary.maxX &&
      door.y >= secondaryBoundary.minY &&
      door.y <= secondaryBoundary.maxY
    ) {
      newDoors.push(door);
      newDungeon[door.y][door.x] = 0;
    }
  });

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (dungeon[y][x] === 0) {
        const newX = x + offsetX;
        const newY = y + offsetY;
        if (
          newX >= secondaryBoundary.minX &&
          newX <= secondaryBoundary.maxX &&
          newY >= secondaryBoundary.minY &&
          newY <= secondaryBoundary.maxY
        ) {
          newDungeon[newY][newX] = 0;
        }
      }
    }
  }

  for (let x = 0; x < MAP_WIDTH; x++) {
    newDungeon[0][x] = 1;
    newDungeon[MAP_HEIGHT - 1][x] = 1;
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    newDungeon[y][0] = 1;
    newDungeon[y][MAP_WIDTH - 1] = 1;
  }

  if (validRooms.length > 0) {
    validRooms[0].visited = true;
  }

  return { dungeon: newDungeon, rooms: validRooms, doors: newDoors, disconnectedRooms };
}

function splitRoom(room, dungeon, maxWidth, maxHeight) {
  const splitRooms = [];
  let left = room.getLeft();
  let top = room.getTop();
  let currentX = left;
  let currentY = top;

  while (currentY <= room.getBottom()) {
    let height = Math.min(maxHeight, room.getBottom() - currentY + 1);
    currentX = left;

    while (currentX <= room.getRight()) {
      let width = Math.min(maxWidth, room.getRight() - currentX + 1);

      if (width >= 5 && height >= 5) {
        const newRoom = {
          x1: currentX,
          y1: currentY,
          x2: currentX + width - 1,
          y2: currentY + height - 1,
          id: splitRooms.length + validRooms.length,
          visited: false,
          doors: [],
          markerColor: room.markerColor,
          getLeft: function () { return this.x1; },
          getRight: function () { return this.x2; },
          getTop: function () { return this.y1; },
          getBottom: function () { return this.y2; },
          getDoors: function (callback) {
            const doorPositions = [
              { x: Math.floor((this.x1 + this.x2) / 2), y: this.y1 - 1 },
              { x: Math.floor((this.x1 + this.x2) / 2), y: this.y2 + 1 },
              { x: this.x1 - 1, y: Math.floor((this.y1 + this.y2) / 2) },
              { x: this.x2 + 1, y: Math.floor((this.y1 + this.y2) / 2) },
            ];
            doorPositions.forEach((pos) => {
              if (
                pos.x >= secondaryBoundary.minX &&
                pos.x <= secondaryBoundary.maxX &&
                pos.y >= secondaryBoundary.minY &&
                pos.y <= secondaryBoundary.maxY
              ) {
                callback(pos.x, pos.y);
              }
            });
          },
        };

        for (let y = newRoom.getTop() - 1; y <= newRoom.getBottom() + 1; y++) {
          for (let x = newRoom.getLeft() - 1; x <= newRoom.getRight() + 1; x++) {
            if (x < canvasBoundary.minX || x > canvasBoundary.maxX || y < canvasBoundary.minY || y > canvasBoundary.maxY) continue;
            dungeon[y][x] = 1;
          }
        }

        for (let y = newRoom.getTop(); y <= newRoom.getBottom(); y++) {
          for (let x = newRoom.getLeft(); x <= newRoom.getRight(); x++) {
            dungeon[y][x] = 0;
          }
        }

        splitRooms.push(newRoom);
      }
      currentX += width;
    }
    currentY += height;
  }

  return splitRooms;
}

export function findBestSpawnPoint(dungeon, room) {
  const center = {
    x: Math.floor((room.getLeft() + room.getRight()) / 2),
    y: Math.floor((room.getTop() + room.getBottom()) / 2)
  };

  if (isValidSpawnLocation(dungeon, center.x, center.y)) {
    return center;
  }

  const searchRadius = Math.min(room.width || (room.x2 - room.x1 + 1), room.height || (room.y2 - room.y1 + 1)) / 2;
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
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT || dungeon[y][x] !== 0) {
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