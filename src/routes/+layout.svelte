<script lang="ts">
	import './layout.css';
	import favicon from '/assets/favicon.svg?url';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}