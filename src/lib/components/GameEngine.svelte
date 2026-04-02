<script lang="ts">
    import type {
        Game,
        Tile,
        Vertex,
        Edge,
        BuildResource,
        DevCard,
    } from "$lib/types";

    let {
        playerId,
        sendAction
    } = $props();

    function guard() {
        if (!playerId) return false;
        return true;
    }

    export function rollDice(game: Game) {
        if (!guard()) return;
        sendAction("rollDice");
    }

    export function clickVertex(game: Game, v: Vertex) {
        if (!guard()) return;
        sendAction("buildSettlement", { vertex: v });
    }

    export function buildRoad(game: Game, edge: Edge) {
        if (!guard()) return;
        sendAction("buildRoad", { edge });
    }

    export function moveRobber(
        game: Game,
        tile: Tile,
        playerId: string,
        hexSize: number,
    ) {
        if (!guard()) return;
        sendAction("moveRobber", {
            tile: { q: tile.q, r: tile.r },
        });
    }

    export function discardResource(
        game: Game,
        playerId: string,
        res: BuildResource,
    ) {
        if (!guard()) return;
        sendAction("discardResources", {
            playerId,
            resource: res,
        });
    }

    export function bankTrade(
        game: Game,
        give: BuildResource,
        receive: BuildResource,
    ) {
        if (!guard()) return;
        sendAction("bankTrade", { give, receive });
    }

    export function buyDevCard(game: Game, playerId: string) {
        if (!guard()) return;
        sendAction("buyDevCard");
    }

    export function playDevCard(game: Game, card: DevCard, playerId: string) {
        if (!guard()) return;
        sendAction("playDevCard", { card });
    }

    export function yearOfPlenty(
        game: Game,
        res1: BuildResource,
        res2: BuildResource,
    ) {
        if (!guard()) return;
        sendAction("yearOfPlenty", { res1, res2 });
    }

    export function monopoly(game: Game, resource: BuildResource) {
        if (!guard()) return;
        sendAction("monopoly", { resource });
    }

    export function endTurn(game: Game) {
        if (!guard()) return;
        sendAction("endTurn");
    }

    // PURE helpers (safe to keep client-side)
    export function hexToPixel(q: number, r: number, hexSize: number) {
        const x = hexSize * Math.sqrt(3) * (q + r / 2);
        const y = hexSize * 1.5 * r;
        return { x, y };
    }

    export function hexCornersPoints(x: number, y: number, hexSize: number) {
        const pts = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            pts.push({
                x: x + hexSize * Math.cos(angle),
                y: y + hexSize * Math.sin(angle),
            });
        }
        return pts;
    }

    export function hexCornersString(x: number, y: number, hexSize: number) {
        return hexCornersPoints(x, y, hexSize)
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
    }
</script>