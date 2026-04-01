import { Grid2D } from '../../utils/structures';
import { findPath } from '../../utils/pathfinding';
import type { SeededRandom } from '../../utils/random';
import type { Vec2 } from '../../utils/vector';
import { TileType } from '../PCGTypes';
import type { LevelGenerator, PCGConfig, GeneratedLevel, EntityPlacement } from '../PCGTypes';
import { shuffleArray } from '../SeededUtils';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

/**
 * BSP (Binary Space Partition) dungeon generator.
 * Recursively splits the grid, places rooms in leaf nodes, connects with L-shaped corridors.
 */
export class DungeonGenerator implements LevelGenerator {
  readonly name = 'dungeon';

  generate(config: PCGConfig, random: SeededRandom): GeneratedLevel {
    const { width, height } = config;
    const difficulty = config.difficulty ?? 5;
    const params = config.params ?? {};
    const minRoomSize = (params.minRoomSize as number) ?? 4;
    const maxRoomSize = (params.maxRoomSize as number) ?? Math.min(12, Math.floor(width / 3));
    const corridorWidth = (params.corridorWidth as number) ?? 1;
    const roomPadding = (params.roomPadding as number) ?? 1;

    const grid = new Grid2D<TileType>(width, height, TileType.WALL);

    // BSP split
    const root: BSPNode = { x: 1, y: 1, w: width - 2, h: height - 2 };
    splitNode(root, minRoomSize, random);

    // Place rooms in leaf nodes
    const rooms: Room[] = [];
    placeRooms(root, rooms, minRoomSize, maxRoomSize, roomPadding, random);

    // Carve rooms into grid
    for (const room of rooms) {
      carveRoom(grid, room);
    }

    // Connect rooms via BSP tree
    connectRooms(root, grid, corridorWidth, random);

    // Choose spawn (first room) and exit (farthest room by path distance)
    const spawn = roomCenter(rooms[0]);
    grid.set(spawn.x, spawn.y, TileType.SPAWN);

    let exit = roomCenter(rooms[rooms.length - 1]);
    let maxDist = 0;
    for (let i = 1; i < rooms.length; i++) {
      const center = roomCenter(rooms[i]);
      const path = findPath(grid, (t) => t !== TileType.WALL, spawn, center);
      if (path.length > maxDist) {
        maxDist = path.length;
        exit = center;
      }
    }
    grid.set(exit.x, exit.y, TileType.EXIT);

    // Place entities
    const entities = placeEntities(rooms, spawn, exit, difficulty, random);

    // Place doors at room entrances (where corridor meets room edge)
    placeDoors(grid, rooms);

    return {
      grid,
      entities,
      spawn,
      exit,
      metadata: {
        seed: config.seed ?? 0,
        generator: this.name,
        difficulty,
        roomCount: rooms.length,
        pathLength: maxDist,
        generationTimeMs: 0,
      },
    };
  }
}

function splitNode(node: BSPNode, minSize: number, random: SeededRandom): void {
  const minDim = minSize * 2 + 3;
  if (node.w < minDim && node.h < minDim) return;

  const splitH = node.w < minDim ? true : node.h < minDim ? false : random.next() > 0.5;

  if (splitH) {
    if (node.h < minDim) return;
    const split = random.nextInt(minSize + 1, node.h - minSize - 1);
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    if (node.w < minDim) return;
    const split = random.nextInt(minSize + 1, node.w - minSize - 1);
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }

  splitNode(node.left!, minSize, random);
  splitNode(node.right!, minSize, random);
}

function placeRooms(
  node: BSPNode, rooms: Room[],
  minSize: number, maxSize: number, padding: number,
  random: SeededRandom,
): void {
  if (node.left && node.right) {
    placeRooms(node.left, rooms, minSize, maxSize, padding, random);
    placeRooms(node.right, rooms, minSize, maxSize, padding, random);
    return;
  }

  const w = random.nextInt(minSize, Math.min(maxSize, node.w - padding * 2));
  const h = random.nextInt(minSize, Math.min(maxSize, node.h - padding * 2));
  const x = random.nextInt(node.x + padding, node.x + node.w - w - padding);
  const y = random.nextInt(node.y + padding, node.y + node.h - h - padding);

  const room: Room = { x, y, w, h };
  node.room = room;
  rooms.push(room);
}

function carveRoom(grid: Grid2D<TileType>, room: Room): void {
  for (let ry = room.y; ry < room.y + room.h; ry++) {
    for (let rx = room.x; rx < room.x + room.w; rx++) {
      grid.set(rx, ry, TileType.FLOOR);
    }
  }
}

function roomCenter(room: Room): Vec2 {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function getNodeRoom(node: BSPNode): Room | undefined {
  if (node.room) return node.room;
  if (node.left) {
    const r = getNodeRoom(node.left);
    if (r) return r;
  }
  if (node.right) return getNodeRoom(node.right);
  return undefined;
}

function connectRooms(
  node: BSPNode, grid: Grid2D<TileType>, corridorWidth: number, random: SeededRandom,
): void {
  if (!node.left || !node.right) return;

  connectRooms(node.left, grid, corridorWidth, random);
  connectRooms(node.right, grid, corridorWidth, random);

  const roomA = getNodeRoom(node.left);
  const roomB = getNodeRoom(node.right);
  if (!roomA || !roomB) return;

  const a = roomCenter(roomA);
  const b = roomCenter(roomB);

  // L-shaped corridor
  if (random.next() > 0.5) {
    carveCorridor(grid, a.x, a.y, b.x, a.y, corridorWidth);
    carveCorridor(grid, b.x, a.y, b.x, b.y, corridorWidth);
  } else {
    carveCorridor(grid, a.x, a.y, a.x, b.y, corridorWidth);
    carveCorridor(grid, a.x, b.y, b.x, b.y, corridorWidth);
  }
}

function carveCorridor(
  grid: Grid2D<TileType>, x1: number, y1: number, x2: number, y2: number, width: number,
): void {
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let x = x1;
  let y = y1;
  const halfW = Math.floor(width / 2);

  while (x !== x2 || y !== y2) {
    for (let w = -halfW; w <= halfW; w++) {
      if (dx !== 0) grid.set(x, y + w, TileType.FLOOR);
      else grid.set(x + w, y, TileType.FLOOR);
    }
    if (x !== x2) x += dx;
    else if (y !== y2) y += dy;
  }
  // Carve final cell
  for (let w = -halfW; w <= halfW; w++) {
    grid.set(x + w, y, TileType.FLOOR);
    grid.set(x, y + w, TileType.FLOOR);
  }
}

function placeDoors(grid: Grid2D<TileType>, rooms: Room[]): void {
  for (const room of rooms) {
    // Check room border cells — if adjacent to corridor FLOOR outside room, mark as DOOR
    for (let rx = room.x; rx < room.x + room.w; rx++) {
      checkDoor(grid, rx, room.y - 1, room);
      checkDoor(grid, rx, room.y + room.h, room);
    }
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      checkDoor(grid, room.x - 1, ry, room);
      checkDoor(grid, room.x + room.w, ry, room);
    }
  }
}

function checkDoor(grid: Grid2D<TileType>, x: number, y: number, _room: Room): void {
  const tile = grid.get(x, y);
  if (tile === TileType.FLOOR) {
    // This is a corridor tile adjacent to the room — could be a door
    // Only place door if it's a chokepoint (walls on two opposite sides)
    const left = grid.get(x - 1, y);
    const right = grid.get(x + 1, y);
    const up = grid.get(x, y - 1);
    const down = grid.get(x, y + 1);
    const verticalWalls = left === TileType.WALL && right === TileType.WALL;
    const horizontalWalls = up === TileType.WALL && down === TileType.WALL;
    if (verticalWalls || horizontalWalls) {
      grid.set(x, y, TileType.DOOR);
    }
  }
}

function placeEntities(
  rooms: Room[], spawn: Vec2, exit: Vec2,
  difficulty: number, random: SeededRandom,
): EntityPlacement[] {
  const entities: EntityPlacement[] = [];
  const enemyCount = Math.max(1, Math.round(difficulty * 2));
  const itemCount = Math.max(1, Math.round(difficulty * 0.8));

  // Skip first room (spawn) for enemies — place in remaining rooms
  const enemyRooms = shuffleArray(rooms.slice(1), random);

  let placed = 0;
  for (const room of enemyRooms) {
    if (placed >= enemyCount) break;
    const ex = random.nextInt(room.x + 1, room.x + room.w - 2);
    const ey = random.nextInt(room.y + 1, room.y + room.h - 2);
    if (ex === exit.x && ey === exit.y) continue;
    entities.push({ type: 'enemy', x: ex, y: ey, properties: { difficulty } });
    placed++;
  }

  // Items in random rooms (prefer dead-end / small rooms)
  const itemRooms = shuffleArray([...rooms], random);
  let itemsPlaced = 0;
  for (const room of itemRooms) {
    if (itemsPlaced >= itemCount) break;
    const ix = random.nextInt(room.x + 1, room.x + room.w - 2);
    const iy = random.nextInt(room.y + 1, room.y + room.h - 2);
    if (ix === spawn.x && iy === spawn.y) continue;
    if (ix === exit.x && iy === exit.y) continue;
    entities.push({ type: 'item', x: ix, y: iy });
    itemsPlaced++;
  }

  return entities;
}
