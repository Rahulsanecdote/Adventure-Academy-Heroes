// KidQuest game server entry point (Phase 2).
// Colyseus rooms + a plain /health endpoint. Auth: every room join needs a
// short-lived game token issued by FastAPI (see docs/MULTIPLAYER.md).
import * as http from 'http';
import { Server } from 'colyseus';
import { WorldRoom } from './WorldRoom';

const PORT = Number(process.env.PORT || 2567);

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'kidquest-game-server' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const gameServer = new Server({ server: httpServer });

// Matchmaking: clients presenting the same world + age band (+ same party
// code, empty for public rooms) land in the same instance.
gameServer
  .define('world', WorldRoom)
  .filterBy(['world', 'ageBand', 'partyCode']);

gameServer.listen(PORT).then(() => {
  console.log(`[kidquest-game-server] listening on ws://localhost:${PORT}`);
});
