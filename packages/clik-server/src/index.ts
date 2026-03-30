import { ClikServer } from './ClikServer.js';

const server = new ClikServer({
  port: parseInt(process.env.PORT ?? '8080'),
  maxRooms: parseInt(process.env.MAX_ROOMS ?? '100'),
  roomTimeoutMs: parseInt(process.env.ROOM_TIMEOUT_MS ?? '300000'),
});

server.start();
