<script lang="ts">
    import Board from "$lib/components/Board.svelte";
    import PlayerPanel from "$lib/components/PlayerPanel.svelte";
    import type {
        Resource,
        Tile,
        GameState,
        Port,
        Player,
        Vertex,
        Edge,
        Settlement,
        Road,
        BuildResource,
        DevCard,
    } from "$lib/types";

    const baseUrl: string = "/pages/2025/vikas/catan";

    const resourceImage: Record<Resource, string | null> = {
        wood: `${baseUrl}/assets/wood.png`,
        brick: `${baseUrl}/assets/brick.png`,
        sheep: `${baseUrl}/assets/sheep.png`,
        wheat: `${baseUrl}/assets/wheat.png`,
        ore: `${baseUrl}/assets/ore.png`,
        desert: `${baseUrl}/assets/desert.png`,
        water: `${baseUrl}/assets/water.png`,
    };

    const hexSize = 60;

    const board = generateBoard();

    const landTiles = board.filter((t) => t.resource !== "water");
    const vertices = generateVertices(landTiles);
    const edges = generateEdges(vertices, landTiles);
    const desert = board.find((t: Tile) => t.resource === "desert")!;
    const ports = generatePorts();

    const COSTS = {
        road: { wood: 1, brick: 1 },
        settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
        city: { wheat: 2, ore: 3 },
        dev: { sheep: 1, wheat: 1, ore: 1 },
    } as const;

    let game = $state<GameState>({
        players: [
            createPlayer(1, "Brandon", "red"),
            createPlayer(2, "Vikas", "blue"),
            createPlayer(3, "Kieran", "green"),
        ],
        currentPlayer: 0,
        board,
        vertices: createVertexState(vertices),
        edges: createEdgeState(edges),
        robber: { q: desert.q, r: desert.r },
        dice: null,
        phase: "setup-settlement",
        discardQueue: new Map<number, number>(),
        ports: generatePorts(),
        longestRoadOwner: null,
        longestRoadLength: 0,
        largestArmyOwner: null,
        largestArmySize: 0,
        winner: null,
    });

    let lastSetupSettlement: string | null = null;
    let setupStep = $state(0);
    // svelte-ignore state_referenced_locally
    let setupOrder = getSetupOrder(game.players.length);

    let devDeck = shuffle([
        ...Array(14).fill("knight"),
        ...Array(5).fill("victory"),
        ...Array(2).fill("road-building"),
        ...Array(2).fill("year-of-plenty"),
        ...Array(2).fill("monopoly"),
    ]);

    let notification = $state<string | null>(null);

    function shuffle<T>(array: T[]): T[] {
        const a = [...array];

        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }

        return a;
    }

    function generateBoard(): Tile[] {
        const landRadius = 2;
        const waterRadius = 3;

        for (let attempt = 0; attempt < 200; attempt++) {
            const tiles: Tile[] = [];

            const resources: Resource[] = shuffle([
                "wood",
                "wood",
                "wood",
                "wood",
                "brick",
                "brick",
                "brick",
                "sheep",
                "sheep",
                "sheep",
                "sheep",
                "wheat",
                "wheat",
                "wheat",
                "wheat",
                "ore",
                "ore",
                "ore",
                "desert",
            ]);

            const numbers = shuffle([
                2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
            ]);

            let rIndex = 0;
            let nIndex = 0;

            for (let q = -waterRadius; q <= waterRadius; q++) {
                for (let r = -waterRadius; r <= waterRadius; r++) {
                    const s = -q - r;
                    const dist = Math.max(
                        Math.abs(q),
                        Math.abs(r),
                        Math.abs(s),
                    );

                    if (dist > waterRadius) continue;

                    if (dist <= landRadius) {
                        const resource = resources[rIndex++];

                        const tile: Tile = { q, r, resource };

                        if (resource !== "desert") {
                            tile.number = numbers[nIndex++];
                        }

                        tiles.push(tile);
                    } else {
                        tiles.push({
                            q,
                            r,
                            resource: "water",
                        });
                    }
                }
            }

            if (validateBoard(tiles)) return tiles;
        }
        throw new Error("board failed to exist :3");
    }

    function validateBoard(tiles: Tile[]) {
        const land = tiles.filter((t) => t.resource !== "water");

        for (const tile of land) {
            const neighbors = getNeighborTiles(tile, land);

            for (const n of neighbors) {
                if (!tile.number || !n.number) continue;

                if (
                    (tile.number === 6 || tile.number === 8) &&
                    (n.number === 6 || n.number === 8)
                )
                    return false;

                if (tile.resource === n.resource) {
                    const cluster = neighbors.filter(
                        (x) => x.resource === tile.resource,
                    );

                    if (cluster.length >= 2) return false;
                }
            }
        }

        return true;
    }

    function getNeighborTiles(tile: Tile, tiles: Tile[]) {
        const dirs = [
            [1, 0],
            [1, -1],
            [0, -1],
            [-1, 0],
            [-1, 1],
            [0, 1],
        ];

        const neighbors: Tile[] = [];

        for (const [dq, dr] of dirs) {
            const q = tile.q + dq;
            const r = tile.r + dr;

            const n = tiles.find((t) => t.q === q && t.r === r);

            if (n) neighbors.push(n);
        }

        return neighbors;
    }

    function generatePorts(): Port[] {
        const portTypes: { ratio: 2 | 3; resource?: BuildResource }[] = shuffle(
            [
                { ratio: 3 },
                { ratio: 3 },
                { ratio: 3 },
                { ratio: 3 },
                { ratio: 2, resource: "wood" },
                { ratio: 2, resource: "brick" },
                { ratio: 2, resource: "sheep" },
                { ratio: 2, resource: "wheat" },
                { ratio: 2, resource: "ore" },
            ],
        );

        const coastalEdges: Edge[] = [];

        for (const e of edges) {
            let landCount = 0;

            for (const tile of board) {
                if (tile.resource === "water") continue;

                const { x, y } = hexToPixel(tile.q, tile.r);
                const corners = hexCorners(x, y) as { x: number; y: number }[];

                const keys = corners.map(
                    (c) => `${Math.round(c.x)},${Math.round(c.y)}`,
                );

                if (keys.includes(e.a.key) && keys.includes(e.b.key)) {
                    landCount++;
                }
            }

            if (landCount === 1) coastalEdges.push(e);
        }

        const shuffledEdges = shuffle(coastalEdges);

        const ports: Port[] = [];
        const usedWater = new Set<string>();

        for (const edge of shuffledEdges) {
            if (ports.length >= portTypes.length) break;

            const mx = (edge.a.x + edge.b.x) / 2;
            const my = (edge.a.y + edge.b.y) / 2;

            let bestTile: Tile | null = null;
            let bestDist = Infinity;

            for (const tile of board) {
                if (tile.resource !== "water") continue;

                const pos = hexToPixel(tile.q, tile.r);
                const wx = pos.x + 450;
                const wy = pos.y + 350;

                const d = (wx - mx) ** 2 + (wy - my) ** 2;

                if (d < bestDist) {
                    bestDist = d;
                    bestTile = tile;
                }
            }

            if (!bestTile) continue;

            const waterKey = `${bestTile.q},${bestTile.r}`;

            if (usedWater.has(waterKey)) continue;

            usedWater.add(waterKey);

            const type = portTypes[ports.length];

            const pos = hexToPixel(bestTile.q, bestTile.r);

            ports.push({
                vertices: [edge.a.key, edge.b.key],
                ratio: type.ratio,
                resource: type.resource,
                water: {
                    x: pos.x + 450,
                    y: pos.y + 350,
                },
            });
        }

        return ports;
    }

    function createPlayer(id: number, name: string, color: string): Player {
        return {
            id,
            name,
            color,
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            roads: 15,
            settlements: 5,
            cities: 4,
            victoryPoints: 0,
            devCards: [],
            newDevCards: [],
            knightsPlayed: 0,
        };
    }

    function hexToPixel(q: number, r: number) {
        const x = hexSize * Math.sqrt(3) * (q + r / 2);
        const y = hexSize * 1.5 * r;
        return { x, y };
    }

    function hexCorners(x: number, y: number, asString: true): string;
    function hexCorners(
        x: number,
        y: number,
        asString?: false,
    ): { x: number; y: number }[];

    function hexCorners(x: number, y: number, asString = false) {
        const pts = [];

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);

            const px = x + hexSize * Math.cos(angle);
            const py = y + hexSize * Math.sin(angle);

            pts.push(asString ? `${px},${py}` : { x: px, y: py });
        }

        return asString ? pts.join(" ") : pts;
    }

    function generateVertices(board: Tile[]): Vertex[] {
        const map = new Map<string, Vertex>();

        for (const tile of board) {
            const { x, y } = hexToPixel(tile.q, tile.r);

            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);

                const vx = x + hexSize * Math.cos(angle);
                const vy = y + hexSize * Math.sin(angle);

                const key = `${Math.round(vx)},${Math.round(vy)}`;

                if (!map.has(key)) {
                    map.set(key, { key, x: vx + 450, y: vy + 350 });
                }
            }
        }

        return [...map.values()];
    }

    function createVertexState(vertices: Vertex[]) {
        const map = new Map<string, Settlement | null>();

        for (const v of vertices) {
            map.set(v.key, null);
        }

        return map;
    }

    function generateEdges(vertices: Vertex[], board: Tile[]): Edge[] {
        const edges: Edge[] = [];
        const seen = new Set<string>();

        for (const tile of board) {
            const { x, y } = hexToPixel(tile.q, tile.r);

            const corners = (
                hexCorners(x, y) as { x: number; y: number }[]
            ).map((c) => {
                const key = `${Math.round(c.x)},${Math.round(c.y)}`;
                return vertices.find((v) => v.key === key)!;
            });

            for (let i = 0; i < 6; i++) {
                const a = corners[i];
                const b = corners[(i + 1) % 6];

                const key = [a.key, b.key].sort().join("|");

                if (!seen.has(key)) {
                    seen.add(key);
                    edges.push({ key, a, b });
                }
            }
        }

        return edges;
    }

    function createEdgeState(edges: Edge[]) {
        const map = new Map<string, Road | null>();

        for (const e of edges) {
            map.set(e.key, null);
        }

        return map;
    }

    function getAdjacentVertices(v: Vertex) {
        const list: Vertex[] = [];

        for (const e of edges) {
            if (e.a.key === v.key) list.push(e.b);
            else if (e.b.key === v.key) list.push(e.a);
        }

        return list;
    }

    function hasAdjacentRoad(v: Vertex, playerId: number) {
        for (const e of edges) {
            if (e.a.key === v.key || e.b.key === v.key) {
                const road = game.edges.get(e.key);
                if (road?.player === playerId) return true;
            }
        }
        return false;
    }

    function getSetupOrder(playerCount: number): number[] {
        const order: number[] = [];

        for (let i = 0; i < playerCount; i++) {
            order.push(i);
        }

        for (let i = playerCount - 1; i >= 0; i--) {
            order.push(i);
        }

        return order;
    }

    function roadTouchesPlayer(edge: Edge, playerId: number) {
        const { a, b } = edge;

        const settlementA = game.vertices.get(a.key);
        const settlementB = game.vertices.get(b.key);

        if (settlementA?.player === playerId) return true;
        if (settlementB?.player === playerId) return true;

        for (const e of edges) {
            if (e.key === edge.key) continue;

            if (
                e.a.key === a.key ||
                e.b.key === a.key ||
                e.a.key === b.key ||
                e.b.key === b.key
            ) {
                const road = game.edges.get(e.key);
                if (road?.player === playerId) return true;
            }
        }

        return false;
    }

    function rollDice() {
        const d =
            Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;

        game.dice = d;

        if (d === 7) {
            const discardMap = new Map<number, number>();

            for (const p of game.players) {
                const total = Object.values(p.resources).reduce(
                    (a, b) => a + b,
                    0,
                );

                if (total > 7) {
                    discardMap.set(p.id, Math.floor(total / 2));
                }
            }

            if (discardMap.size > 0) {
                game.discardQueue = discardMap;
                game.phase = "discard";
            } else {
                game.phase = "robber";
            }
            return;
        }

        for (const tile of game.board) {
            if (tile.number !== d) continue;
            if (tile.q === game.robber.q && tile.r === game.robber.r) continue;

            const { x, y } = hexToPixel(tile.q, tile.r);

            for (const c of hexCorners(x, y)) {
                if (typeof c === "string") continue;

                const key = `${Math.round(c.x)},${Math.round(c.y)}`;

                const s = game.vertices.get(key);
                if (!s) continue;

                const player = game.players.find((p) => p.id === s.player)!;
                const amount = s.city ? 2 : 1;

                if (tile.resource !== "desert" && tile.resource !== "water") {
                    player.resources[tile.resource] += amount;
                }
            }
        }

        game.phase = "build";
    }

    function canAfford(
        player: Player,
        cost: Partial<Record<BuildResource, number>>,
    ) {
        for (const r in cost) {
            const res = r as BuildResource;
            if (player.resources[res] < (cost[res] ?? 0)) return false;
        }
        return true;
    }

    function payCost(
        player: Player,
        cost: Partial<Record<BuildResource, number>>,
    ) {
        for (const r in cost) {
            const res = r as BuildResource;
            player.resources[res] -= cost[res] ?? 0;
        }
    }

    function clickVertex(v: Vertex) {
        const settlement = game.vertices.get(v.key);

        if (!settlement) {
            for (const n of getAdjacentVertices(v)) {
                if (game.vertices.get(n.key)) return;
            }
            if (game.vertices.get(v.key)) return;
            if (
                game.phase === "roll" ||
                game.phase === "setup-road" ||
                game.phase === "robber"
            )
                return;

            const player = game.players[game.currentPlayer];

            if (game.phase === "build") {
                if (!hasAdjacentRoad(v, player.id)) return;
                if (!canAfford(player, COSTS.settlement)) return;
                payCost(player, COSTS.settlement);
            }

            game.vertices.set(v.key, { player: player.id, city: false });
            game.vertices = new Map(game.vertices);

            player.settlements--;
            player.victoryPoints++;
            checkVictory(player);

            if (
                game.phase === "setup-settlement" &&
                setupStep >= game.players.length
            ) {
                giveStartingResources(v);
            }

            if (game.phase === "setup-settlement") {
                lastSetupSettlement = v.key;
                game.phase = "setup-road";
            }
        } else {
            const s = game.vertices.get(v.key);
            if (!s || s.city) return;

            const player = game.players[game.currentPlayer];
            if (s.player !== player.id) return;

            if (!canAfford(player, COSTS.city)) return;

            payCost(player, COSTS.city);

            game.vertices.set(v.key, { ...s, city: true });
            game.vertices = new Map(game.vertices);

            player.cities--;
            player.victoryPoints++;
            checkVictory(player);
        }
    }

    function giveStartingResources(v: Vertex) {
        const settlement = game.vertices.get(v.key);
        if (!settlement) return;

        const player = game.players.find((p) => p.id === settlement.player)!;

        for (const tile of game.board) {
            const { x, y } = hexToPixel(tile.q, tile.r);

            for (const c of hexCorners(x, y)) {
                if (typeof c === "string") continue;

                const key = `${Math.round(c.x)},${Math.round(c.y)}`;

                if (
                    key === v.key &&
                    tile.resource !== "desert" &&
                    tile.resource !== "water"
                ) {
                    player.resources[tile.resource]++;
                }
            }
        }
    }

    function buildRoad(edge: Edge) {
        if (game.edges.get(edge.key)) return;

        const player = game.players[game.currentPlayer];

        if (game.phase === "setup-road") {
            if (
                edge.a.key !== lastSetupSettlement &&
                edge.b.key !== lastSetupSettlement
            ) {
                return;
            }
        }

        if (game.phase === "build") {
            if (!roadTouchesPlayer(edge, player.id)) return;

            if (!canAfford(player, COSTS.road)) return;
            payCost(player, COSTS.road);
        }

        if (
            game.phase === "roll" ||
            game.phase === "setup-settlement" ||
            game.phase === "robber"
        )
            return;

        const sa = game.vertices.get(edge.a.key);
        const sb = game.vertices.get(edge.b.key);

        if (sa && sa.player !== player.id) return;
        if (sb && sb.player !== player.id) return;

        game.edges.set(edge.key, { player: player.id });
        game.edges = new Map(game.edges);

        player.roads--;
        updateLongestRoad(player.id);

        if (game.phase === "setup-road") {
            setupStep++;

            if (setupStep < setupOrder.length) {
                game.currentPlayer = setupOrder[setupStep];
                game.phase = "setup-settlement";
            } else {
                game.phase = "roll";
                game.currentPlayer = 0;
            }
        }
    }

    function moveRobber(tile: Tile) {
        if (game.phase !== "robber") return;
        if (tile.resource === "water") return;
        if (tile.q === game.robber.q && tile.r === game.robber.r) return;

        game.robber = { q: tile.q, r: tile.r };
        game.phase = "build";

        stealResource(tile.q, tile.r);

        game = { ...game };
    }

    function discardResource(playerId: number, res: BuildResource) {
        const player = game.players.find((p) => p.id === playerId)!;

        if (player.resources[res] <= 0) return;

        player.resources[res]--;

        const remaining = (game.discardQueue.get(playerId) ?? 0) - 1;

        if (remaining <= 0) {
            game.discardQueue.delete(playerId);
        } else {
            game.discardQueue.set(playerId, remaining);
        }

        if (game.discardQueue.size === 0) {
            game.phase = "robber";
        }
    }

    function stealResource(q: number, r: number) {
        const victims = new Map<number, Player>();

        const { x, y } = hexToPixel(q, r);

        for (const c of hexCorners(x, y)) {
            if (typeof c === "string") continue;

            const key = `${Math.round(c.x)},${Math.round(c.y)}`;
            const settlement = game.vertices.get(key);

            if (
                settlement &&
                settlement.player !== game.players[game.currentPlayer].id
            ) {
                const victim = game.players.find(
                    (p) => p.id === settlement.player,
                );
                if (victim) victims.set(victim.id, victim);
            }
        }

        const victimList = [...victims.values()];

        if (victimList.length === 0) return;

        const victim =
            victimList[Math.floor(Math.random() * victimList.length)];

        const resources = Object.entries(victim.resources).flatMap(
            ([r, count]) => Array(count).fill(r),
        );

        if (resources.length === 0) return;

        const stolen = resources[
            Math.floor(Math.random() * resources.length)
        ] as BuildResource;

        victim.resources[stolen]--;
        game.players[game.currentPlayer].resources[stolen]++;
    }

    function playerHasPort(player: Player, port: Port) {
        for (const [key, settlement] of game.vertices) {
            if (!settlement) continue;

            if (
                settlement.player === player.id &&
                port.vertices.includes(key)
            ) {
                return true;
            }
        }

        return false;
    }

    function getTradeRatio(player: Player, resource: BuildResource) {
        let best = 4;

        for (const port of ports) {
            if (!playerHasPort(player, port)) continue;

            if (port.ratio === 3) {
                best = Math.min(best, 3);
            }

            if (port.ratio === 2 && port.resource === resource) {
                best = Math.min(best, 2);
            }
        }

        return best;
    }

    function bankTrade(give: BuildResource, receive: BuildResource) {
        const player = game.players[game.currentPlayer];
        const ratio = getTradeRatio(player, give);

        if (player.resources[give] < ratio) return;

        player.resources[give] -= ratio;
        player.resources[receive] += 1;
    }

    function buyDevCard() {
        const player = game.players[game.currentPlayer];

        if (!canAfford(player, COSTS.dev)) return false;
        if (devDeck.length === 0) return false;

        payCost(player, COSTS.dev);

        const card = devDeck.pop()!;

        player.newDevCards.push(card);

        if (card === "victory") {
            player.victoryPoints++;
            checkVictory(player);
        }

        return true;
    }

    function playDevCard(card: DevCard) {
        const player = game.players[game.currentPlayer];
        const index = player.devCards.indexOf(card);

        if (index === -1) return;

        player.devCards.splice(index, 1);

        if (card === "knight") {
            player.knightsPlayed++;
            updateLargestArmy(player);

            game.phase = "robber";
        }

        if (card === "road-building") {
            player.roads += 2;
        }

        if (card === "year-of-plenty") {
            game.phase = "year-of-plenty";
        }

        if (card === "monopoly") {
            game.phase = "monopoly";
        }
    }

    function updateLargestArmy(player: Player) {
        if (player.knightsPlayed < 3) return;

        if (player.knightsPlayed > game.largestArmySize) {
            const previous = game.players.find(
                (p) => p.id === game.largestArmyOwner,
            );

            if (previous) previous.victoryPoints -= 2;

            game.largestArmyOwner = player.id;
            game.largestArmySize = player.knightsPlayed;

            player.victoryPoints += 2;

            notification = "Largest Army!";
            setTimeout(() => (notification = null), 2000);

            checkVictory(player);
        }
    }

    function updateLongestRoad(playerId: number) {
        const playerEdges = edges.filter((e) => {
            const r = game.edges.get(e.key);
            return r?.player === playerId;
        });

        const visited = new Set<string>();

        function dfs(vKey: string, length: number): number {
            let max = length;

            for (const e of playerEdges) {
                if (visited.has(e.key)) continue;

                if (e.a.key === vKey || e.b.key === vKey) {
                    visited.add(e.key);

                    const next = e.a.key === vKey ? e.b.key : e.a.key;

                    max = Math.max(max, dfs(next, length + 1));

                    visited.delete(e.key);
                }
            }

            return max;
        }

        let best = 0;

        for (const v of vertices) {
            best = Math.max(best, dfs(v.key, 0));
        }

        if (best >= 5 && best > game.longestRoadLength) {
            const previous = game.players.find(
                (p) => p.id === game.longestRoadOwner,
            );

            if (previous) previous.victoryPoints -= 2;

            const player = game.players.find((p) => p.id === playerId)!;

            game.longestRoadOwner = playerId;
            game.longestRoadLength = best;

            player.victoryPoints += 2;

            notification = "Longest Road!";
            setTimeout(() => (notification = null), 2000);

            checkVictory(player);
        }
    }

    function yearOfPlenty(res1: BuildResource, res2: BuildResource) {
        const player = game.players[game.currentPlayer];

        player.resources[res1]++;
        player.resources[res2]++;

        game.phase = "build";
    }

    function monopoly(resource: BuildResource) {
        const player = game.players[game.currentPlayer];

        for (const p of game.players) {
            if (p.id === player.id) continue;

            const amount = p.resources[resource];
            p.resources[resource] = 0;
            player.resources[resource] += amount;
        }

        game.phase = "build";
    }

    function endTurn() {
        if (game.phase !== "build") return;

        const player = game.players[game.currentPlayer];

        player.devCards.push(...player.newDevCards);
        player.newDevCards = [];

        game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
        game.phase = "roll";
        game.dice = null;
    }

    function checkVictory(player: Player) {
        if (player.victoryPoints >= 10) {
            game.phase = "game-over";
            game.winner = player.id;

            notification = `Winner: ${game.players.find((p: Player) => p.id === game.winner)?.name}`;
            setTimeout(() => (notification = null), 4000);
        }
    }
</script>

<div class="flex w-full mt-4 mx-2">
    <PlayerPanel
        {game}
        {rollDice}
        {endTurn}
        {discardResource}
        {buyDevCard}
        {playDevCard}
        {bankTrade}
        {getTradeRatio}
        {yearOfPlenty}
        {monopoly}
        {notification}
    />

    <Board
        {game}
        {edges}
        {vertices}
        {clickVertex}
        {buildRoad}
        {moveRobber}
        {hexCorners}
        {hexToPixel}
        {resourceImage}
        {hexSize}
        {ports}
    />
</div>

<style>
    :global(body) {
        height: 100%;
        margin: 0;
    }

    :global(body)::before {
        content: "";
        position: fixed;
        inset: 0;

        background-image: url('/pages/2025/vikas/catan/assets/background.jpg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;

        filter: contrast(50%);
        z-index: -1;
    }
</style>
