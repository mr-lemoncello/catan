<script lang="ts">
    import type { Game } from "$lib/types";

    let {
        joined = $bindable(),
        gameId = $bindable(),
        playerId = $bindable(),
        game = $bindable(),
        baseUrl,
    } = $props();

    let eventSource: EventSource | null = null;

    export async function createGame(name: string, color: string) {
    const res = await fetch(`${baseUrl}/api/game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            type: "create",
            name,
            color,
        }),
    });

    const data = await res.json();
    console.log("CREATE RESPONSE:", data);

    gameId = data.id;
}

    export async function joinGame(
        gameId: string,
        name: string,
        color: string,
    ) {
        console.log("join button pressed");

        const res = await fetch(`${baseUrl}/api/game`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "join",
                id: gameId,
                name,
                color,
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error);
            return;
        }

        const data = await res.json();

        game = deserializeGame(data.game.state);
        playerId = data.playerId;
        joined = true;

        connect();
        console.log(game);
    }

    export function connect() {
        if (!gameId) return;

        if (eventSource) eventSource.close();

        eventSource = new EventSource(`${baseUrl}/api/game?id=${gameId}`);

        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            game = deserializeGame(data.state);
        };
    }

    export async function sendAction(type: string, payload: any = {}) {
        if (!gameId || !playerId) return;

        await fetch(`${baseUrl}/api/game`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "action",
                action: type,
                payload,
                id: gameId,
                playerId,
            }),
        });
    }

    export function serializeGame(g: any) {
        return {
            ...g,
            vertices: Object.fromEntries(g.vertices),
            edges: Object.fromEntries(g.edges),
            discardQueue: Object.fromEntries(g.discardQueue),
        };
    }

    export function deserializeGame(g: any): Game {
        return {
            ...g,
            vertices: new Map(Object.entries(g.vertices ?? {})),
            edges: new Map(Object.entries(g.edges ?? {})),
            discardQueue: new Map(Object.entries(g.discardQueue ?? {})),
        } as Game;
    }
</script>
