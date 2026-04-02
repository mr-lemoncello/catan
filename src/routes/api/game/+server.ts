import { db } from "$lib/server/db";
import { randomUUID } from "crypto";
import { applyAction } from "$lib/gameEngine.svelte";
import * as Engine from "$lib/gameEngine.svelte";
import { hexSize } from "$lib/types";
import type { Game, GameInstance, Player } from "$lib/types";

const games = new Map<string, GameInstance>();
const listeners = new Map<string, Set<ReadableStreamDefaultController>>();

const board = Engine.generateBoard();
const vertices = Engine.generateVertices(
    board.filter(t => t.resource !== "water"),
    hexSize
);
const edges = Engine.generateEdges(
    vertices,
    board.filter(t => t.resource !== "water"),
    hexSize
);
const ports = Engine.generatePorts(board, edges, hexSize);

const desert = board.find(t => t.resource === "desert")!;

const state = {
    board,
    vertices: new Map(),
    edges: new Map(),
    players: [],
    currentPlayer: 0,
    robber: { q: desert.q, r: desert.r },
    ports,
    phase: "setup-settlement",
    devDeck: Engine.shuffle([
        ...Array(14).fill("knight"),
        ...Array(5).fill("victory"),
        ...Array(2).fill("road-building"),
        ...Array(2).fill("year-of-plenty"),
        ...Array(2).fill("monopoly"),
    ]),
    discardQueue: new Map(),
    longestRoadLength: 0,
    largestArmySize: 0,
};

function broadcast(gameId: string) {
    const game = games.get(gameId);
    if (!game) return;

    const set = listeners.get(gameId);
    if (!set) return;

    const msg = `data: ${JSON.stringify({
        ...game,
        state: {
            ...game.state,
            vertices: Object.fromEntries(game.state.vertices),
            edges: Object.fromEntries(game.state.edges),
            discardQueue: Object.fromEntries(game.state.discardQueue)
        }
    })}\n\n`;

    for (const c of set) c.enqueue(msg);
}

async function loadGame(id: string) {
    if (games.has(id)) return games.get(id);

    const [rows]: any = await db.query(
        "SELECT state FROM games WHERE id=?",
        [id]
    );

    if (!rows.length) return null;

    const state = typeof rows[0].state === "string"
        ? JSON.parse(rows[0].state)
        : rows[0].state;

    state.vertices = new Map(Object.entries(state.vertices ?? {}));
    state.edges = new Map(Object.entries(state.edges ?? {}));
    state.discardQueue = new Map(Object.entries(state.discardQueue ?? {}));

    const game: GameInstance = {
        id,
        state,
    };

    games.set(id, game);

    return game;
}

function toObject(v: any) {
    if (v instanceof Map) {
        return Object.fromEntries(v);
    }
    return v ?? {};
}

async function saveGame(game: GameInstance) {
    const state = {
        ...game,
        vertices: toObject(game.state.vertices),
        edges: toObject(game.state.edges),
        discardQueue: toObject(game.state.discardQueue)
    };

    await db.query(
        "UPDATE games SET state=? WHERE id=?",
        [JSON.stringify(state), game.id]
    );
}

export async function POST({ request }) {

    const body = await request.json();
    if (body.type === "create") {
        const id = crypto.randomUUID();

        const board = Engine.generateBoard();

        const vertices = Engine.generateVertices(
            board.filter(t => t.resource !== "water"),
            hexSize
        );

        const edges = Engine.generateEdges(
            vertices,
            board.filter(t => t.resource !== "water"),
            hexSize
        );

        const ports = Engine.generatePorts(board, edges, hexSize);

        const desert = board.find(t => t.resource === "desert")!;

        const state: Game = {
            board,
            vertices: new Map(),
            edges: new Map(),
            players: [],
            currentPlayer: 0,
            robber: { q: desert.q, r: desert.r },
            ports,
            phase: "setup-settlement",
            devDeck: Engine.shuffle([
                ...Array(14).fill("knight"),
                ...Array(5).fill("victory"),
                ...Array(2).fill("road-building"),
                ...Array(2).fill("year-of-plenty"),
                ...Array(2).fill("monopoly"),
            ]),
            discardQueue: new Map(),
            longestRoadLength: 0,
            largestArmySize: 0,
            notification: '',
        };

        const game: GameInstance = {
            id,
            state,
        };

        games.set(id, game);

        return new Response(
            JSON.stringify({ id }),
            { headers: { "Content-Type": "application/json" } }
        );
    }

    if (body.type === "join") {
        const game = await loadGame(body.id);

        if (!game)
            return new Response(
                JSON.stringify({ error: "game not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );

        const nameTaken = game.state.players.some(
            (p) => p.name.toLowerCase() === body.name.toLowerCase()
        );

        const colorTaken = game.state.players.some(
            (p) => p.color === body.color
        );

        if (nameTaken)
            return new Response(
                JSON.stringify({ error: "name already taken" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );

        if (colorTaken)
            return new Response(
                JSON.stringify({ error: "color already taken" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        if (game.state.players.length >= 4)
            return new Response(
                JSON.stringify({ error: "game full" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );

        const player = {
            id: randomUUID(),
            name: body.name,
            color: body.color
        };

        game.state.players.push({
            id: player.id,
            name: player.name,
            color: player.color,
            resources: {
                wood: 0,
                brick: 0,
                sheep: 0,
                wheat: 0,
                ore: 0
            },
            devCards: [],
            newDevCards: [],
            victoryPoints: 0,
            roadsBuilt: 0,
            settlementsBuilt: 0,
            citiesBuilt: 0,
            freeRoads: 0,
            knightsPlayed: 0,
        });

        broadcast(game.id);
        await saveGame(game);

        return new Response(
            JSON.stringify({
                playerId: player.id,
                game
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    }

    if (body.type === "action") {
        const game = games.get(body.id);
        if (!game) {
            return new Response(
                JSON.stringify({ error: "game not found" }),
                { status: 400 }
            );
        }

        applyAction(
            game.state,
            body.action,
            body.playerId,
            body.payload,
            hexSize
        );

        broadcast(game.id);
        await saveGame(game);

        return new Response("ok");
    }

    return new Response("invalid", { status: 400 });
}

export async function GET({ url }) {

    const gameId = url.searchParams.get("id");

    if (!gameId)
        return new Response("missing id", { status: 400 });

    let controllerRef: ReadableStreamDefaultController;

    const stream = new ReadableStream({
        start(controller) {

            controllerRef = controller;

            if (!listeners.has(gameId))
                listeners.set(gameId, new Set());

            listeners.get(gameId)!.add(controller);

            const game = games.get(gameId);
            if (game) {
                controller.enqueue(`data: ${JSON.stringify(game)}\n\n`);
            }
        },

        cancel() {
            listeners.get(gameId)?.delete(controllerRef);
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    });
}