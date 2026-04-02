<script lang="ts">
    import PlayerPanel from "$lib/components/PlayerPanel.svelte";
    import Board from "$lib/components/Board.svelte";
    import GameEngine from "$lib/components/GameEngine.svelte";
    import Multiplayer from "$lib/components/Multiplayer.svelte";
    import type MultiplayerType from "$lib/components/Multiplayer.svelte";
    import GameEngineType from "$lib/components/GameEngine.svelte";
    import type { Resource, Game } from "$lib/types";
    import { hexSize } from "$lib/types";
    import { generateVertices, generateEdges, getTradeRatio } from "$lib/gameEngine.svelte";

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

    let playerName = $state("");
    let playerColor = $state("red");
    let game = $state<Game | null>(null);
    let playerId = $state<string | null>(null);
    let gameId = $state<string | null>(null);

    let vertices = $derived(() =>
        game
            ? generateVertices(
                  game.board.filter((t) => t.resource !== "water"),
                  hexSize,
              )
            : [],
    );

    let edges = $derived(() =>
        game
            ? generateEdges(
                  vertices(),
                  game.board.filter((t) => t.resource !== "water"),
                  hexSize,
              )
            : [],
    );

    let multiplayerComp = $state<MultiplayerType | null>(null);
    let gameEngineComp = $state<GameEngineType | null>(null);
    let joined = $state(false);

    function copyGameId() {
        if (!gameId) return;
        navigator.clipboard.writeText(gameId);
    }
</script>

<GameEngine
    bind:this={gameEngineComp}
    {playerId}
    sendAction={multiplayerComp?.sendAction}
/>

<Multiplayer
    bind:this={multiplayerComp}
    bind:joined={joined}
    bind:gameId={gameId}
    bind:playerId={playerId}
    bind:game={game}
    {baseUrl}
/>

{#if !joined}
    <div class="flex flex-col gap-4 p-6 rounded-lg w-80">
        <input
            placeholder="Your Name"
            bind:value={playerName}
            class="px-3 py-2 rounded text-black w-full"
        />
        <select
            bind:value={playerColor}
            class="px-3 py-2 rounded text-black w-full"
        >
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="orange">Orange</option>
            <option value="purple">Purple</option>
        </select>
        <input
            placeholder="Game ID (leave empty to create)"
            bind:value={gameId}
            onclick={copyGameId}
            class="px-3 py-2 rounded text-black w-full"
        />

        <div class="flex gap-2 mt-4">
            <button
                onclick={() => {
                    if (!multiplayerComp) return;

                    gameId
                        ? multiplayerComp.joinGame(
                              gameId,
                              playerName,
                              playerColor,
                          )
                        : multiplayerComp.createGame(playerName, playerColor);
                }}
            >
                {gameId ? "Join Game" : "Create Game"}
            </button>
        </div>
    </div>
{:else if game && playerId}
    <div class="flex flex-row p-4">
        <PlayerPanel
            {game}
            endTurn={gameEngineComp.endTurn}
            discardResource={gameEngineComp.discardResource}
            buyDevCard={gameEngineComp.buyDevCard}
            playDevCard={gameEngineComp.playDevCard}
            bankTrade={gameEngineComp.bankTrade}
            yearOfPlenty={gameEngineComp.yearOfPlenty}
            monopoly={gameEngineComp.monopoly}
            rollDice={gameEngineComp.rollDice}
            getTradeRatio={getTradeRatio}
        />

        <Board
            {game}
            edges={edges()}
            vertices={vertices()}
            clickVertex={gameEngineComp.clickVertex}
            buildRoad={gameEngineComp.buildRoad}
            moveRobber={gameEngineComp.moveRobber}
            hexCornersString={gameEngineComp.hexCornersString}
            hexToPixel={gameEngineComp?.hexToPixel}
            {resourceImage}
            {hexSize}
            {playerId}
            ports={game.ports}
        />
    </div>
{/if}

<style>
    :global(body) {
        height: 100%;
        margin: 0;
    }

    :global(body)::before {
        content: "";
        position: fixed;
        inset: 0;

        background-image: url("/pages/2025/vikas/catan/assets/background.jpg");
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;

        filter: contrast(50%);
        z-index: -1;
    }
</style>
