import * as ROT from "rot-js";
import { MAP_WIDTH, MAP_HEIGHT } from "../../utils/Constants.js";

export function generateDungeon() {
  const map = new ROT.Map.Digger(MAP_WIDTH, MAP_HEIGHT, {
    roomWidth: [8, 20],
    roomHeight: [6, 16],
    corridorLength: [3, 8],
    dugPercentage: 0.15,
    roomDugPercentage: 0.3,
  });

  const dungeon = Array(MAP_HEIGHT)
    .fill()
    .map(() => Array(MAP_WIDTH).fill(1));
  const doors = [];
  const corridorPaths = new Map();

  map.create((x, y, value) => {
    dungeon[y][x] = value;
    if (value === 0) {
      corridorPaths.set(`${x},${y}`, []);
    }
  });

  const rooms = map.getRooms();
  const validRooms = [];
  const disconnectedRooms = []; // Para almacenar habitaciones fuera del mapa

  const quadrantWidth = Math.floor(MAP_WIDTH / 2);
  const quadrantHeight = Math.floor(MAP_HEIGHT / 2);
  const quadrants = [
    { minX: 0, maxX: quadrantWidth, minY: 0, maxY: quadrantHeight, rooms: 0 },
    { minX: quadrantWidth, maxX: MAP_WIDTH, minY: 0, maxY: quadrantHeight, rooms: 0 },
    { minX: 0, maxX: quadrantWidth, minY: quadrantHeight, maxY: MAP_HEIGHT, rooms: 0 },
    { minX: quadrantWidth, maxX: MAP_WIDTH, minY: quadrantHeight, maxY: MAP_HEIGHT, rooms: 0 }
  ];

  // Definir los límites
  const canvasBoundary = { minX: 0, maxX: MAP_WIDTH - 1, minY: 0, maxY: MAP_HEIGHT - 1 };
  const secondaryBoundary = { minX: 2, maxX: MAP_WIDTH - 3, minY: 2, maxY: MAP_HEIGHT - 3 };

  // Definir tamaños máximos para las habitaciones
  const MAX_ROOM_WIDTH = 20;
  const MAX_ROOM_HEIGHT = 16;

  rooms.forEach((room, index) => {
    room.id = index;
    room.visited = false;
    room.doors = [];
    room.markerColor = Phaser.Display.Color.RandomRGB().color;

    // Validar y ajustar la habitación para que no cruce el límite secundario
    let left = Math.max(secondaryBoundary.minX + 2, room.getLeft());
    let right = Math.min(secondaryBoundary.maxX - 2, room.getRight());
    let top = Math.max(secondaryBoundary.minY + 2, room.getTop());
    let bottom = Math.min(secondaryBoundary.maxY - 2, room.getBottom());

    // Si la habitación no tiene espacio suficiente después del ajuste, descartarla
    if (right - left < 5 || bottom - top < 5) {
      return;
    }

    // Verificar forma de la habitación para evitar paredes diagonales
    if (Math.abs((right - left) - (bottom - top)) > 8) {
      return; // Evitar habitaciones muy rectangulares que tienden a crear paredes diagonales
    }

    // Verificar que la habitación esté completamente dentro de los límites
    if (
      left < secondaryBoundary.minX ||
      right > secondaryBoundary.maxX ||
      top < secondaryBoundary.minY ||
      bottom > secondaryBoundary.maxY
    ) {
      // Si la habitación está completamente fuera del mapa, marcarla como desconectada
      disconnectedRooms.push(room);
      return;
    }

    // Actualizar las propiedades de la habitación
    room.x1 = left;
    room.x2 = right;
    room.y1 = top;
    room.y2 = bottom;

    // Verificar el tamaño de la habitación
    let roomWidth = right - left + 1;
    let roomHeight = bottom - top + 1;

    if (roomWidth > MAX_ROOM_WIDTH || roomHeight > MAX_ROOM_HEIGHT) {
      // Dividir la habitación en habitaciones más pequeñas
      const splitRooms = splitRoom(room, dungeon, MAX_ROOM_WIDTH, MAX_ROOM_HEIGHT);
      
      // Asegurar que las habitaciones divididas tengan puertas y estén conectadas
      splitRooms.forEach((splitRoom, splitIndex) => {
        splitRoom.getDoors((x, y) => {
          doors.push({ x, y, roomId: splitRoom.id });
          splitRoom.doors.push({ x, y });
          dungeon[y][x] = 0;
        });

        // Conectar las habitaciones divididas entre sí
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
      room.getDoors((x, y) => {
        doors.push({ x, y, roomId: room.id });
        room.doors.push({ x, y });
        dungeon[y][x] = 0;
      });
      validRooms.push(room);
    }
  });

  // Asegurar que cada cuadrante tenga al menos una habitación
  const minRoomsPerQuadrant = 1;
  quadrants.forEach((quadrant) => {
    while (quadrant.rooms < minRoomsPerQuadrant && validRooms.length < 20) {
      const roomWidth = Phaser.Math.Between(8, 20);
      const roomHeight = Phaser.Math.Between(6, 16);
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

      if (paddedWidth < 6 || paddedHeight < 4) {
        continue;
      }

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

        newRoom.getDoors((x, y) => {
          doors.push({ x, y, roomId: newRoom.id });
          newRoom.doors.push({ x, y });
          dungeon[y][x] = 0;
        });

        // Redibujar la habitación para evitar diagonales extrañas
        for (let y = newRoom.getTop() - 1; y <= newRoom.getBottom() + 1; y++) {
          for (let x = newRoom.getLeft() - 1; x <= newRoom.getRight() + 1; x++) {
            if (
              x < canvasBoundary.minX ||
              x > canvasBoundary.maxX ||
              y < canvasBoundary.minY ||
              y > canvasBoundary.maxY
            )
              continue;

            dungeon[y][x] = 1; // Primero marcar todo como pared
          }
        }

        // Luego dibujar el espacio vacío de la habitación
        for (let y = newRoom.getTop(); y <= newRoom.getBottom(); y++) {
          for (let x = newRoom.getLeft(); x <= newRoom.getRight(); x++) {
            dungeon[y][x] = 0; // Marcar el interior como espacio vacío
          }
        }

        // Asegurar que los bordes del mapa estén siempre como paredes
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

  // Redibujar todas las habitaciones para evitar diagonales
  validRooms.forEach((room) => {
    const left = room.getLeft();
    const right = room.getRight();
    const top = room.getTop();
    const bottom = room.getBottom();

    // Primero marcar todo el área como paredes
    for (let y = top - 1; y <= bottom + 1; y++) {
      for (let x = left - 1; x <= right + 1; x++) {
        if (
          x < canvasBoundary.minX ||
          x > canvasBoundary.maxX ||
          y < canvasBoundary.minY ||
          y > canvasBoundary.maxY
        )
          continue;
        dungeon[y][x] = 1;
      }
    }

    // Luego dibujar el espacio vacío de la habitación
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        dungeon[y][x] = 0;
      }
    }
  });

  // Detectar y eliminar pasillos que forman bucles cerrados
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
          if (checkLoop(nx, ny)) {
            return true;
          }
        } else if (
          parentMap.get(key) !== nextKey &&
          corridorPaths.has(nextKey)
        ) {
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

  // Identificar áreas vacías grandes que no son parte de una habitación y convertirlas en paredes
  const fillEmptySpaces = () => {
    const visitedTiles = new Set();
    const roomTiles = new Set();

    // Marcar todas las tiles que pertenecen a habitaciones
    validRooms.forEach(room => {
      for (let y = room.getTop(); y <= room.getBottom(); y++) {
        for (let x = room.getLeft(); x <= room.getRight(); x++) {
          roomTiles.add(`${x},${y}`);
        }
      }
    });

    // Realizar un flood fill para identificar áreas vacías grandes
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

        for (const Dir of directions) {
          const nx = x + Dir.dx;
          const ny = y + Dir.dy;
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

    // Identificar todas las áreas vacías
    for (let y = secondaryBoundary.minY; y <= secondaryBoundary.maxY; y++) {
      for (let x = secondaryBoundary.minX; x <= secondaryBoundary.maxX; x++) {
        const key = `${x},${y}`;
        if (dungeon[y][x] === 0 && !visitedTiles.has(key)) {
          const { tiles, isRoomPart } = floodFill(x, y);
          if (!isRoomPart && tiles.size > 50) { // Umbral para considerar un área "grande"
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

  // Limpieza de paredes excesivas que bloquean pasajes
  const cleanupWalls = () => {
    for (let y = secondaryBoundary.minY; y <= secondaryBoundary.maxY; y++) {
      for (let x = secondaryBoundary.minX; x <= secondaryBoundary.maxX; x++) {
        if (dungeon[y][x] === 1) {
          let adjacentFloors = 0;
          let adjacentWalls = 0;
          let isNearRoom = false;
          let isCorridorBlock = false;
          let isPartOfPath = false;

          // Contar pisos y paredes adyacentes
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                if (dungeon[ny][nx] === 0) {
                  adjacentFloors++;
                  let floorNeighbors = 0;
                  let floorDirections = [];
                  for (let ddy = -1; ddy <= 1; ddy++) {
                    for (let ddx = -1; ddx <= 1; ddx++) {
                      if (ddx === 0 && ddy === 0) continue;
                      const nnx = nx + ddx;
                      const nny = ny + ddy;
                      if (
                        nnx >= 0 &&
                        nnx < MAP_WIDTH &&
                        nny >= 0 &&
                        nny < MAP_HEIGHT &&
                        dungeon[nny][nnx] === 0
                      ) {
                        floorNeighbors++;
                        floorDirections.push({ dx: ddx, dy: ddy });
                      }
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
            }
          }

          // Verificar si la pared está cerca de una habitación
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

          // Eliminar paredes que bloquean pasillos o entradas
          if (
            (adjacentFloors >= 4 && adjacentWalls <= 4 && !isNearRoom) ||
            (isCorridorBlock && adjacentFloors >= 2 && !isPartOfPath) ||
            (adjacentFloors >= 3 && !isNearRoom && !isPartOfPath)
          ) {
            dungeon[y][x] = 0;
          }
        }
      }
    }

    // Asegurar que los bordes del límite secundario tengan paredes
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

  // Asegurar que todas las habitaciones sean accesibles
  const ensureAccessibility = () => {
    validRooms.forEach((room, index) => {
      if (room.doors.length === 0) {
        // Si la habitación no tiene puertas, añadir una puerta hacia la habitación más cercana
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

  // Detectar pasillos dobles y conexiones mal calculadas
  const roomConnections = new Map();
  validRooms.forEach((room, index) => {
    room.doors.forEach((door) => {
      const doorKey = `${door.x},${door.y}`;
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
              console.log(
                `Double corridor detected between rooms ${index} and ${otherIndex} at door (${door.x}, ${door.y})`,
              );
            } else {
              roomConnections.set(connectionKey, { door: doorKey });
            }
          }
        }
      }
    });
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

    if (connectedRooms.length > 2) {
      console.log(
        `Miscalculated connection at door (${door.x}, ${door.y}): connects to rooms ${connectedRooms.join(", ")}`,
      );
    } else if (connectedRooms.length === 2) {
      const [roomA, roomB] = connectedRooms;
      connectionGraph.get(roomA).add(roomB);
      connectionGraph.get(roomB).add(roomA);
    }
  });

  // Centralizar el mapa
  const centerX = Math.floor(MAP_WIDTH / 2);
  const centerY = Math.floor(MAP_HEIGHT / 2);
  const firstRoom = validRooms[0] || {
    getLeft: () => centerX,
    getRight: () => centerX,
    getTop: () => centerY,
    getBottom: () => centerY,
  };

  // Calcular cuánto tenemos que mover para centrar el mapa
  let offsetX = centerX - Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2);
  let offsetY = centerY - Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2);

  // Verificar que el desplazamiento no cause que las habitaciones salgan de los límites
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  validRooms.forEach(room => {
    minX = Math.min(minX, room.getLeft());
    maxX = Math.max(maxX, room.getRight());
    minY = Math.min(minY, room.getTop());
    maxY = Math.max(maxY, room.getBottom());
  });

  // Ajustar offset para asegurar que todas las habitaciones queden dentro de los límites secundarios
  if (minX + offsetX < secondaryBoundary.minX) {
    offsetX = secondaryBoundary.minX - minX;
  }
  if (maxX + offsetX > secondaryBoundary.maxX) {
    offsetX = secondaryBoundary.maxX - maxX;
  }
  if (minY + offsetY < secondaryBoundary.minY) {
    offsetY = secondaryBoundary.minY - minY;
  }
  if (maxY + offsetY > secondaryBoundary.maxY) {
    offsetY = secondaryBoundary.maxY - maxY;
  }

  const newDungeon = Array(MAP_HEIGHT)
    .fill()
    .map(() => Array(MAP_WIDTH).fill(1));
  const newDoors = [];
  validRooms.forEach((room) => {
    // Actualizar las coordenadas de la habitación con el offset
    room.x1 += offsetX;
    room.x2 += offsetX;
    room.y1 += offsetY;
    room.y2 += offsetY;

    // Asegurar que las coordenadas estén dentro de los límites secundarios
    room.x1 = Math.max(secondaryBoundary.minX, Math.min(secondaryBoundary.maxX, room.x1));
    room.x2 = Math.max(secondaryBoundary.minX, Math.min(secondaryBoundary.maxX, room.x2));
    room.y1 = Math.max(secondaryBoundary.minY, Math.min(secondaryBoundary.maxY, room.y1));
    room.y2 = Math.max(secondaryBoundary.minY, Math.min(secondaryBoundary.maxY, room.y2));

    // Redibujar la habitación en newDungeon
    for (let y = room.y1 - 1; y <= room.y2 + 1; y++) {
      for (let x = room.x1 - 1; x <= room.x2 + 1; x++) {
        if (
          x < canvasBoundary.minX ||
          x > canvasBoundary.maxX ||
          y < canvasBoundary.minY ||
          y > canvasBoundary.maxY
        )
          continue;
        if (x < room.x1 || x > room.x2 || y < room.y1 || y > room.y2) {
          newDungeon[y][x] = 1;
        } else {
          newDungeon[y][x] = 0;
        }
      }
    }
  });

  doors.forEach((door) => {
    if (door && typeof door.x !== "undefined" && typeof door.y !== "undefined") {
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

  // Asegurar que los bordes del lienzo tengan paredes
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

// Función para dividir una habitación grande en habitaciones más pequeñas
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

      // Asegurar que la nueva habitación sea lo suficientemente grande
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

        // Redibujar la nueva habitación
        for (let y = newRoom.getTop() - 1; y <= newRoom.getBottom() + 1; y++) {
          for (let x = newRoom.getLeft() - 1; x <= newRoom.getRight() + 1; x++) {
            if (
              x < canvasBoundary.minX ||
              x > canvasBoundary.maxX ||
              y < canvasBoundary.minY ||
              y > canvasBoundary.maxY
            )
              continue;
            dungeon[y][x] = 1; // Primero marcar como pared
          }
        }

        for (let y = newRoom.getTop(); y <= newRoom.getBottom(); y++) {
          for (let x = newRoom.getLeft(); x <= newRoom.getRight(); x++) {
            dungeon[y][x] = 0; // Marcar el interior como espacio vacío
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
      if (
        nx < 0 ||
        nx >= MAP_WIDTH ||
        ny < 0 ||
        ny >= MAP_HEIGHT ||
        dungeon[ny][nx] !== 0
      ) {
        return false;
      }
    }
  }

  return true;
}