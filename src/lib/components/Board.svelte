<script lang="ts">
    import type { Player, Edge, Resource, Game } from "../types";

    import { fade } from "svelte/transition";

    let {
        game,
        edges,
        vertices,
        clickVertex,
        buildRoad,
        moveRobber,
        hexCornersString,
        hexToPixel,
        resourceImage,
        hexSize,
        playerId,
        ports,
    }: {
        game: any;
        edges: Edge[];
        vertices: Vertex[];
        clickVertex: (game: Game, v: Vertex) => void;
        buildRoad: (game: Game, e: Edge) => void;
        moveRobber: (game: Game, tile: any, playerId: string, hexSize: number) => void;
        hexCornersString: (x: number, y: number, hexSize: number) => string;
        hexToPixel: (q: number, r: number, hexSize: number) => { x: number; y: number };
        resourceImage: Record<Resource, string | null>;
        hexSize: number;
        playerId: string;
        ports: any[];
    } = $props();

    const vertexMap = $derived(() => new Map(vertices.map((v) => [v.key, v])));
    const OFFSET_X = 450;
    const OFFSET_Y = 350;

    type Vertex = {
        key: string;
        x: number;
        y: number;
    };

    const edgeLookup = $derived(() => game.edges);
    const vertexLookup = $derived(() => game.vertices);
</script>

<svg width="900" height="700">
    <defs>
        {#each game.board as tile, i}
            {@const pos = hexToPixel(tile.q, tile.r, hexSize)}
            {@const x = pos.x + OFFSET_X}
            {@const y = pos.y + OFFSET_Y}
            <clipPath id={"hex-" + i}>
                <polygon points={hexCornersString(x, y, hexSize)} />
            </clipPath>
        {/each}
    </defs>
    {#each game.board as tile, i}
        {@const pos = hexToPixel(tile.q, tile.r, hexSize)}
        {@const x = pos.x + OFFSET_X}
        {@const y = pos.y + OFFSET_Y}
        {@const img = resourceImage[tile.resource as Resource]}
        {#if img}
            <image
                href={img}
                x={x - hexSize}
                y={y - hexSize}
                width={hexSize * 2}
                height={hexSize * 2}
                clip-path={"url(#hex-" + i + ")"}
                class="cursor-pointer"
                preserveAspectRatio="xMidYMid slice"
            />
        {/if}
        <polygon
            points={hexCornersString(x, y, hexSize)}
            fill="transparent"
            stroke="#451a03"
            stroke-width="1"
            onclick={() => moveRobber(game, tile, playerId, hexSize)}
            onkeydown={() => moveRobber(game, tile, playerId, hexSize)}
            role="button"
            tabindex="-1"
        />
        {#if tile.number}
            <circle cx={x} cy={y} r="16" fill="white" stroke="black" />
            <text
                {x}
                y={y + 5}
                text-anchor="middle"
                font-weight="bold"
                font-size="14"
            >
                {tile.number}
            </text>
        {/if}
        {#if game.robber.q === tile.q && game.robber.r === tile.r}
            <circle cx={x} cy={y} r="16" fill="white" stroke="black" />
            <circle cx={x} cy={y} r="12" fill="black" />
        {/if}
    {/each}
    {#each edges as e}
        {@const road = edgeLookup().get(e.key)}
        <line
            class="cursor-pointer"
            x1={e.a.x + OFFSET_X}
            y1={e.a.y + OFFSET_Y}
            x2={e.b.x + OFFSET_X}
            y2={e.b.y + OFFSET_Y}
            stroke="#451a03"
            stroke-width="8"
            stroke-linecap="round"
        />
        <line
            in:fade={{ duration: 200 }}
            class="cursor-pointer transition-colors duration-200 road-build"
            x1={e.a.x + OFFSET_X}
            y1={e.a.y + OFFSET_Y}
            x2={e.b.x + OFFSET_X}
            y2={e.b.y + OFFSET_Y}
            stroke={road
                ? game.players.find((p: Player) => p.id === road.player)?.color
                : "#fef3c7"}
            stroke-width="6"
            stroke-linecap="round"
            onclick={() => buildRoad(game, e)}
            onkeydown={() => buildRoad(game, e)}
            role="button"
            tabindex="-1"
        />
    {/each}
    {#each vertices as v}
        {@const settlement = vertexLookup().get(v.key)}
        {@const color = settlement
            ? game.players.find((p: Player) => p.id === settlement.player)
                  ?.color
            : "#fffbeb"}
        {#if settlement?.city}
            <rect
                class="cursor-pointer transition-colors duration-200"
                x={v.x + OFFSET_X - 9}
                y={v.y + OFFSET_Y - 9}
                width="18"
                height="18"
                fill={color}
                stroke="#451a03"
                stroke-width="1.5"
                onclick={() => clickVertex(game, v)}
                onkeydown={() => clickVertex(game, v)}
                role="button"
                tabindex="-1"
            />
        {:else}
            <circle
                class="cursor-pointer transition-colors duration-200"
                cx={v.x + OFFSET_X}
                cy={v.y + OFFSET_Y}
                r="8"
                fill={color}
                stroke="#451a03"
                stroke-width="1.5"
                onclick={() => clickVertex(game, v)}
                onkeydown={() => clickVertex(game, v)}
                role="button"
                tabindex="-1"
            />
        {/if}
    {/each}
    {#each ports as port}
        {@const v1 = vertexMap().get(port.vertices[0])}
        {@const v2 = vertexMap().get(port.vertices[1])}

        {#if v1 && v2}
            {@const water = port.water}

            {#if water}
                {@const mx = (v1.x + v2.x) / 2}
                {@const my = (v1.y + v2.y) / 2}

                {@const wx = water.x}
                {@const wy = water.y}

                {@const cx = (mx + wx) / 2}
                {@const cy = (my + wy) / 2}

                {@const dx = wx - mx}
                {@const dy = wy - my}

                {@const len = Math.sqrt(dx * dx + dy * dy) || 1}
                {@const ux = dx / len}
                {@const uy = dy / len}

                {@const labelX = cx + ux * 18}
                {@const labelY = cy + uy * 18}

                {@const anchor =
                    ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle"}
                <g>
                    <circle
                        cx={cx + OFFSET_X}
                        cy={cy + OFFSET_Y}
                        r="10"
                        fill="white"
                        stroke="#451a03"
                        stroke-width="1.5"
                    />

                    <line
                        x1={v1.x + OFFSET_X}
                        y1={v1.y + OFFSET_Y}
                        x2={cx + OFFSET_X}
                        y2={cy + OFFSET_Y}
                        stroke="white"
                        stroke-width="4"
                    />

                    <line
                        x1={v2.x + OFFSET_X}
                        y1={v2.y + OFFSET_Y}
                        x2={cx + OFFSET_X}
                        y2={cy + OFFSET_Y}
                        stroke="white"
                        stroke-width="4"
                    />

                    <text
                        x={labelX + OFFSET_X}
                        y={labelY + OFFSET_Y}
                        text-anchor={anchor}
                        font-size="12"
                        font-weight="bold"
                        fill="#fffbeb"
                    >
                        <tspan x={labelX + OFFSET_X}>{port.ratio}:1</tspan>
                        {#if port.resource}
                            <tspan
                                x={labelX + OFFSET_X}
                                dy="12"
                                style="text-transform:uppercase"
                            >
                                {port.resource}
                            </tspan>
                        {/if}
                    </text>
                </g>
            {/if}
        {/if}
    {/each}
</svg>

<style>
    .road-build {
        stroke-dasharray: 50;
        stroke-dashoffset: 50;
        animation: roadDraw 0.25s ease forwards;
    }

    @keyframes roadDraw {
        to {
            stroke-dashoffset: 0;
        }
    }
</style>
