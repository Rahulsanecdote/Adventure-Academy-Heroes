// Phase 2 smoke test: boots the game server, connects TWO colyseus.js
// clients with valid game tokens, and verifies presence, movement sync,
// teleport clamping, phrase chat validation, the co-op boss flow, and
// rejection of invalid/expired tokens.
//
// Run: npm run build && npm run smoke
import { spawn } from 'node:child_process';
import jwt from 'jsonwebtoken';
import { Client } from 'colyseus.js';

const SECRET = 'smoke-secret';
const PORT = 2567;
const ENDPOINT = `ws://localhost:${PORT}`;

const results = [];
function check(name, cond, extra = '') {
  results.push([name, Boolean(cond)]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mintToken(childId, name, ageBand, expiresIn = '10m') {
  return jwt.sign(
    {
      type: 'game',
      child_id: childId,
      display_name: name,
      age_band: ageBand,
      avatar: { skin_tone: 'medium', hair_style: 'curly', hair_color: 'black', outfit: 'casual_blue', outfit_color: 'red', accessory: null },
    },
    SECRET,
    { algorithm: 'HS256', expiresIn }
  );
}

function solve(prompt) {
  const m = prompt.match(/(\d+)\s*([+\-×])\s*(\d+)/);
  if (!m) return NaN;
  const [_, a, op, b] = m;
  const x = Number(a), y = Number(b);
  return op === '+' ? x + y : op === '-' ? x - y : x * y;
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fn()) return true;
    await sleep(100);
  }
  throw new Error(`timeout waiting for: ${label}`);
}

const server = spawn('node', ['dist/index.js'], {
  env: { ...process.env, PORT: String(PORT), GAME_JWT_SECRET: SECRET },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stdout.write(`[server-err] ${d}`));

let roomA, roomB, roomC;
try {
  // wait for health
  await waitFor(async () => true, 1, 'tick');
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/health`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    await sleep(200);
  }

  const clientA = new Client(ENDPOINT);
  const clientB = new Client(ENDPOINT);

  // Invalid + expired tokens must be rejected before anything else.
  let rejected = false;
  try {
    await clientA.joinOrCreate('world', { token: 'garbage', world: 'hub', ageBand: '7-9', partyCode: '' });
  } catch { rejected = true; }
  check('invalid token rejected', rejected);

  rejected = false;
  try {
    await clientA.joinOrCreate('world', { token: mintToken('cX', 'Ghost', '7-9', '-10s'), world: 'hub', ageBand: '7-9', partyCode: '' });
  } catch { rejected = true; }
  check('expired token rejected', rejected);

  // Two clients, same party room in Math Jungle.
  const joinOpts = (token) => ({ token, world: 'math_jungle', ageBand: '7-9', partyCode: 'SMOKE1' });
  roomA = await clientA.joinOrCreate('world', joinOpts(mintToken('child-A', 'Asha', '7-9')));
  roomB = await clientB.joinOrCreate('world', joinOpts(mintToken('child-B', 'Bela', '7-9')));

  check('both clients in same room', roomA.roomId === roomB.roomId, `room=${roomA.roomId}`);

  const playersOf = (room) => {
    const out = {};
    room.state.players.forEach((p, sid) => { out[sid] = p; });
    return out;
  };

  await waitFor(() => Object.keys(playersOf(roomA)).length === 2, 5000, 'A sees 2 players');
  await waitFor(() => Object.keys(playersOf(roomB)).length === 2, 5000, 'B sees 2 players');
  check('presence: both clients see 2 players', true);

  const bViewOfA = () => playersOf(roomB)[roomA.sessionId];
  const aViewOfB = () => playersOf(roomA)[roomB.sessionId];
  check('B sees A displayName', bViewOfA()?.displayName === 'Asha', `got ${bViewOfA()?.displayName}`);
  check('A sees B avatar config', (aViewOfB()?.avatarJson || '').includes('curly'));

  // Movement sync: A walks; B must observe it.
  await sleep(300);
  roomA.send('move', { x: 3, y: 0, z: 12, rotY: 0.5, anim: 'walk' });
  await waitFor(() => Math.abs((bViewOfA()?.x ?? 0) - 3) < 0.6, 5000, 'B sees A move');
  check('movement sync A -> B', true, `B sees A at x=${bViewOfA().x.toFixed(2)}, z=${bViewOfA().z.toFixed(2)}`);

  // Teleport attempt must be clamped by the server.
  roomA.send('move', { x: 110, y: 0, z: 12, rotY: 0, anim: 'walk' });
  await sleep(600);
  check('teleport clamped', Math.abs(bViewOfA().x) < 40, `B sees A at x=${bViewOfA().x.toFixed(2)} (sent 110)`);

  // Phrase chat: valid ID relays through state.
  roomA.send('phrase', { phraseId: 'hello' });
  await waitFor(() => bViewOfA()?.phraseId === 'hello', 5000, 'B sees A phrase');
  check('phrase chat: valid ID relayed', true);

  // Phrase chat: invalid payload rejected, state unchanged.
  let rejection = null;
  roomA.onMessage('phrase_rejected', (msg) => { rejection = msg; });
  roomA.send('phrase', { phraseId: 'this is free text, hack!' });
  await sleep(500);
  check('phrase chat: invalid ID rejected', rejection?.reason === 'unknown_phrase', JSON.stringify(rejection));
  roomA.send('phrase', { text: 'free text field' });
  await sleep(500);
  check('phrase state unchanged after invalid sends', bViewOfA()?.phraseId === 'hello');

  // Co-op boss: A starts, everyone answers their own prompts, HP falls
  // to defeat. REGRESSION COVERAGE for the PR #23 Codex finding: B must
  // get a question WITHOUT ever sending boss_start — the frontend's join
  // path is boss_join (auto-sent when the boss is active and the local
  // player has no question). C joins the room MID-FIGHT and must also be
  // able to get a question via boss_join.
  const questions = new Map();
  const bossEvents = [];
  for (const [room, key] of [[roomA, 'A'], [roomB, 'B']]) {
    room.onMessage('boss_question', (msg) => questions.set(key, msg.prompt));
    room.onMessage('boss_event', (msg) => bossEvents.push(msg));
  }
  roomA.send('boss_start');
  await waitFor(() => roomA.state.boss.active === true, 5000, 'boss active');
  check('boss fight started', roomA.state.boss.hp === 10, `hp=${roomA.state.boss.hp}`);
  await waitFor(() => questions.has('A'), 5000, 'A got a boss question');

  // B joins through boss_join only — no boss_start from B, ever.
  roomB.send('boss_join');
  await waitFor(() => questions.has('B'), 5000, 'B got a boss question via boss_join');
  check('boss join: B gets a question via boss_join without boss_start', true);

  // boss_join is idempotent: a repeat must not replace B's question.
  const bPromptBefore = questions.get('B');
  roomB.send('boss_join');
  await sleep(500);
  check('boss join: duplicate boss_join does not replace B question',
    questions.get('B') === bPromptBefore, `prompt=${questions.get('B')}`);

  // C joins the room mid-fight, then joins the fight via boss_join.
  const clientC = new Client(ENDPOINT);
  roomC = await clientC.joinOrCreate('world', joinOpts(mintToken('child-C', 'Carla', '7-9')));
  check('mid-fight join: C lands in same room', roomC.roomId === roomA.roomId, `room=${roomC.roomId}`);
  roomC.onMessage('boss_question', (msg) => questions.set('C', msg.prompt));
  roomC.onMessage('boss_event', (msg) => bossEvents.push(msg));
  roomC.send('boss_join');
  await waitFor(() => questions.has('C'), 5000, 'C got a boss question via boss_join');
  check('mid-fight join: C gets a question via boss_join', true);

  let sawHpDrop = false;
  for (let i = 0; i < 40 && roomA.state.boss.hp > 0; i++) {
    for (const [room, key] of [[roomA, 'A'], [roomB, 'B'], [roomC, 'C']]) {
      const prompt = questions.get(key);
      if (prompt) {
        questions.delete(key);
        room.send('boss_answer', { answer: solve(prompt) });
      }
    }
    await sleep(120);
    if (roomA.state.boss.hp < 10) sawHpDrop = true;
  }
  check('correct answers damage the boss', sawHpDrop, `hp now ${roomA.state.boss.hp}`);
  await waitFor(() => bossEvents.some((e) => e.type === 'defeated'), 5000, 'defeated broadcast');
  const defeated = bossEvents.find((e) => e.type === 'defeated');
  check('boss defeated broadcast', true);
  check('defeat lists all participants (starter, boss_join, mid-fight join)',
    defeated.participants.includes('child-A') && defeated.participants.includes('child-B') &&
      defeated.participants.includes('child-C'),
    JSON.stringify(defeated.participants));
  check('boss inactive after defeat', roomA.state.boss.active === false);

  // Wrong answer does not damage: restart fight, answer wrong once.
  questions.clear();
  roomA.send('boss_start');
  await waitFor(() => questions.has('A'), 5000, 'A got question in fight 2');
  const hpBefore = roomA.state.boss.hp;
  roomA.send('boss_answer', { answer: -99999 });
  await sleep(500);
  check('wrong answer does not damage boss', roomA.state.boss.hp === hpBefore, `hp=${roomA.state.boss.hp}`);
} catch (err) {
  check(`smoke run completed without exception (${err.message})`, false);
} finally {
  try { roomA?.leave(); roomB?.leave(); roomC?.leave(); } catch { /* ignore */ }
  server.kill('SIGTERM');
}

const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`);
process.exit(failed.length ? 1 : 0);
