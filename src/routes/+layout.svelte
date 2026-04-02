<script lang="ts">
	import "./layout.css";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/pages/2025/vikas/catan/assets/favicon.svg" />
</svelte:head>

{@render children()}
