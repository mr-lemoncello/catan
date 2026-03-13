<script lang="ts">
    import type { Player, Resource } from "../types";

    import { fade, scale, fly } from "svelte/transition";

    let {
        game,
        rollDice,
        endTurn,
        discardResource,
        buyDevCard,
        playDevCard,
        bankTrade,
        getTradeRatio,
        yearOfPlenty,
        monopoly,
        notification,
    } = $props();

    const resources: Resource[] = ["wood", "brick", "sheep", "wheat", "ore"];

    let give: Resource = $state("wood");
    let want: Resource = $state("wood");
    let rolling = $state(false);

    const current = $derived(() => game.players[game.currentPlayer]);

    const giveAmount = $derived(() => getTradeRatio(current(), give));

    const others = $derived(() =>
        game.players.filter((_: Player, i: number) => i !== game.currentPlayer),
    );

    function doTrade() {
        bankTrade(give, want);
    }

    function animatedRoll() {
        rolling = true;
        rollDice();

        setTimeout(() => {
            rolling = false;
        }, 500);
    }
</script>

<div class="flex flex-col gap-5 w-80">
    <div class="flex flex-col gap-2 w-32">
        <h2 class="text-lg font-semibold text-amber-50">
            {current().name}'s turn
        </h2>

        <p in:fly={{ y: -8, duration: 150 }} class="text-amber-50">
            {game.phase}
        </p>

        {#if game.phase === "roll"}
            <button
                class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                onclick={animatedRoll}
            >
                Roll Dice
            </button>
        {/if}

        <p class="text-amber-50" class:shake={rolling}>
            Dice: {game.dice ?? "-"}
        </p>

        <button
            class="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
            onclick={endTurn}
        >
            End Turn
        </button>

        {#if game.phase === "discard"}
            <div class="bg-red-200 p-3 rounded mt-2">
                <p>Discard down to 7 cards</p>

                {#each [...game.discardQueue.entries()] as [pid, remaining]}
                    {@const player = game.players.find(
                        (p: Player) => p.id === pid,
                    )}

                    {#if player}
                        <p class="font-semibold">
                            {player.name} (discard {remaining})
                        </p>

                        {#each Object.keys(player.resources) as r}
                            <button
                                class="mr-1 mt-1 px-2 py-1 bg-red-500 text-white rounded"
                                onclick={() =>
                                    discardResource(player.id, r as Resource)}
                            >
                                discard {r}
                            </button>
                        {/each}
                    {/if}
                {/each}
            </div>
        {/if}

        {#if game.phase === "year-of-plenty"}
            <div class="bg-blue-200 p-3 rounded mt-2 flex flex-col gap-2">
                <p class="font-semibold">Year of Plenty</p>
                <p>Choose two resources</p>

                <div class="flex gap-2 flex-wrap">
                    {#each resources as r1}
                        {#each resources as r2}
                            <button
                                class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onclick={() => yearOfPlenty(r1, r2)}
                            >
                                {r1} + {r2}
                            </button>
                        {/each}
                    {/each}
                </div>
            </div>
        {/if}

        {#if game.phase === "monopoly"}
            <div class="bg-purple-200 p-3 rounded mt-2 flex flex-col gap-2">
                <p class="font-semibold">Monopoly</p>
                <p>Choose a resource to take from all players</p>

                <div class="flex gap-2 flex-wrap">
                    {#each resources as r}
                        <button
                            class="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                            onclick={() => monopoly(r)}
                        >
                            {r}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <div class="flex flex-col gap-4">
        <div
            in:fly={{ y: 10, duration: 200 }}
            out:fade
            class="p-3 border border-amber-950 bg-amber-50 rounded"
        >
            <h3 class="font-semibold text-lg" style="color:{current().color}">
                {current().name}
            </h3>

            <p class="font-medium">VP: {current().victoryPoints}</p>

            <div class="mt-2">
                <h4 class="font-semibold">Resources</h4>

                {#each Object.entries(current().resources) as [r, v]}
                    <div class="flex justify-between">
                        <span>{r}</span>
                        <span>{v}</span>
                    </div>
                {/each}
            </div>

            <button
                class="mt-3 text-white px-3 py-1 rounded"
                style="background-color:{current().color}"
                onclick={buyDevCard}
            >
                Buy Dev Card
            </button>
        </div>

        <div>
            <h3 class="text-amber-50 font-semibold">Dev Cards</h3>

            <div class="flex flex-wrap gap-2 mt-2">
                {#each current().devCards as card, i (card + i)}
                    <button
                        class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                        onclick={() => playDevCard(card)}
                    >
                        {card}
                    </button>
                {/each}
            </div>
        </div>

        <div>
            <h3 class="text-amber-50 font-semibold">Bank Trade</h3>

            <div class="flex gap-2 mt-2 items-center">
                <p class="w-3 px-1 py-1 rounded text-amber-50">
                    {giveAmount()}
                </p>

                <select bind:value={give} class="py-1 rounded text-amber-50">
                    {#each resources as r}
                        <option value={r}>{r}</option>
                    {/each}
                </select>

                <span class="text-amber-50">→</span>

                <select bind:value={want} class="py-1 rounded text-amber-50">
                    {#each resources as r}
                        <option value={r}>{r}</option>
                    {/each}
                </select>

                <button
                    class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                    onclick={doTrade}
                >
                    Trade
                </button>
            </div>
        </div>
    </div>

    <div class="flex flex-col gap-2 pb-10">
        {#each others() as p}
            <div class="p-3 border border-amber-950 bg-amber-50 rounded">
                <h3 class="font-semibold" style="color:{p.color}">
                    {p.name}
                </h3>

                <p>VP: {p.victoryPoints}</p>

                <div class="mt-1 text-sm">
                    {#each Object.entries(p.resources) as [r, v]}
                        <div class="flex justify-between resource-row">
                            <span>{r}</span>
                            <span>{v}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>

    {#if notification}
        <div
            in:scale={{ duration: 200 }}
            class="fixed inset-0 bg-black/70 flex items-center justify-center"
        >
            <div class="bg-white p-8 rounded text-xl">
                {notification}
            </div>
        </div>
    {/if}
</div>

<style>
    .shake {
        animation: shake 0.4s;
    }

    @keyframes shake {
        0% {
            transform: rotate(-6deg);
        }
        25% {
            transform: rotate(6deg);
        }
        50% {
            transform: rotate(-3deg);
        }
        75% {
            transform: rotate(3deg);
        }
        100% {
            transform: rotate(0);
        }
    }
</style>
