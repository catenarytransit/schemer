<script lang="ts">
	import { loadScheme, type RouteTree, type RouteSync } from '$lib/load';
	import { onMount } from 'svelte';
	let scheme: Promise<RouteTree>;

	export let global_basepath: string = '';
	export let scheme_basepath: string = '';

	export let active_route: RouteSync[] = [];
	export let active_route_name: string = 'RESERVED:SELECT-SCHEME';

	export let active_sync: number = 0;
	export let active_sync_name: string = '---:DEFAULT';

	export let set_sync_mode: boolean = false;

	export let date_time: string = `${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`;

	setInterval(() => {
		date_time = `${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`;
	}, 1000)

	const chime = '/assets/chime.wav';
	const horn = '/assets/horn.mp3';

	let horn_audio: any;
	onMount(() => {
		horn_audio = new Audio(horn);
		horn_audio.volume = 0.2;
		horn_audio.loop = true;
	})

	let audio: HTMLAudioElement;

	const play_audios = (audios: string[]) => {
		audio = new Audio();
		let index = -1;

		const play_next = () => {
			index++;
			if (audios[index].includes('<PAUSE>')) {
				setTimeout(() => {
					play_next();
				}, 400);
				return;
			}
			if (audios[index].includes('<TTS>')) {
				let text = audios[index].split('<TTS>')[1].trim();
				let utterance = new SpeechSynthesisUtterance(text);
				utterance.lang = 'en-US';
				utterance.rate = 0.8;
				utterance.pitch = 1.2;
				speechSynthesis.speak(utterance);
				utterance.onend = () => {
					play_next();
				};
			} else {
				audio.src = audios[index];
				audio.currentTime = 0;
				audio.play();

				if (index < audios.length - 1) {
					let next_audio = new Audio(audios[index + 1]);
					next_audio.preload = 'auto';
					next_audio.load();
					next_audio = new Audio(audios[index + 2]);
					next_audio.preload = 'auto';
					next_audio.load();
				}
			}
		};

		if (audios.length) {
			play_next();

			audio.addEventListener('ended', () => {
				if (index < audios.length) {
					play_next();
				}
			});
		}
	};
</script>

<div id="app">
	{#if active_route_name === 'RESERVED:SELECT-SCHEME'}
		<div id="home">
			<input type="text" id="schemeinp" placeholder="Scheme">
			<input type="text" id="globalinp" placeholder="Globals (optional)">
			<button
				on:click={() => {
					// @ts-ignore
					scheme = loadScheme(document.getElementById('schemeinp').value, document.getElementById('globalinp').value);
					active_route_name = 'RESERVED:SELECT-ROUTE';
				}}>
				LOAD
			</button>
		</div>
	{:else if active_route_name === 'RESERVED:SELECT-ROUTE'}
		<div id="home">
			{#await scheme}
				<h1>Loading...</h1>
			{:then tree}
				{#each Object.keys(tree.routes) as route}
					<button
						on:click={() => {
							active_route_name = route;
							active_route = tree.routes[route];
							active_sync = 0;
							global_basepath = tree.globalbasepath;
							scheme_basepath = tree.schemebasepath;
						}}
					>
						{route}
					</button>
				{/each}
			{:catch error}
				Error loading scheme: {error.message}
			{/await}
		</div>
	{:else}
		<div id="status">
			<div class="statusvalue">
				<span class="statusfield">SYNC</span>
				<br />
				<span class="statuscontent" style:color="var(--seashore)">{active_sync_name.split(':')[0]}</span>
				<br />
				<span style:color={active_sync_name.split(':')[1] == 'DEFAULT' ? 'black': 'var(--gray)'} class="statussubcontent">{active_sync_name.split(':')[1]}</span>
			</div>
			<div class="statusvalue">
				<span class="statusfield">TIME</span>
				<br />
				<span class="statuscontent">{date_time}</span>
			</div>
			<div class="statusvalue">
				<span class="statusfield">ROUTE</span>
				<br />
				<span class="statuscontent">{active_route_name}</span>
			</div>
            <br />
			{#if set_sync_mode}
                <select
                    on:change={(e) => {
                        active_sync = parseInt(e.currentTarget.value);
                        active_sync_name = '---:DEFAULT';
                        set_sync_mode = false;
                    }}
                >
					<option selected>---</option>
                    {#each Object.keys(active_route) as sync}
                        <option value={sync}>{Object.values(active_route)[parseInt(sync)].name.replace(':', ' - ')}</option>
                    {/each}
                </select>
			{/if}
		</div>
		<div id="controller">
			<button
				on:click={() => {
					if (audio) {
						audio.pause();
					}
					let chime_audio = new Audio(chime);
					chime_audio.play();
				}}
			>
				CHIME
			</button>
			<br />
			<button
				on:click={() => {
					horn_audio.paused ? horn_audio.play() : horn_audio.pause();	
				}}
			>
				HORN ON/OFF
			</button>
			<br />
			<button
				on:click={() => {
					set_sync_mode = !set_sync_mode;
				}}
			>
				SET
			</button>
		</div>
		<button
			id="next"
			on:click={() => {
				if (audio) {
					audio.pause();
				}
				active_sync_name = active_route[active_sync].name;

				let chime_index_global = active_route[active_sync].audio.indexOf(global_basepath + '<CHIME>');
				let chime_index_local = active_route[active_sync].audio.indexOf(scheme_basepath + '<CHIME>');

				if (chime_index_global > -1) {
					active_route[active_sync].audio[chime_index_global] = chime;
				}

				if (chime_index_local > -1) {
					active_route[active_sync].audio[chime_index_local] = chime;
				}

				play_audios(active_route[active_sync].audio);
				if (active_sync < active_route.length - 1) {
					active_sync++;
				}
			}}
		>
			<img src="/assets/next.svg" alt="Next audio" height="90" />
		</button>
	{/if}
</div>

<style>
	:global(:root) {
		--darksky: #0a233f;
		--seashore: #42a7c5;
		--gray: #5e5e5e;
	}

	:global(body) {
		background: black;
		color: white;
		display: flex;
		align-items: center;
		height: 100vh;
		padding: 0;
		margin: 0;
		font-size: 1.3em;
		overflow: hidden;
		cursor: crosshair !important;
	}

	* {
		font-family: VT323, sans-serif !important;
		cursor: crosshair !important;
	}

	:global(button, input) {
		background: var(--darksky);
		border: 3px solid var(--seashore);
		color: white;
		font-size: 1.2em;
		padding: 0.5rem;
		margin: 3px;
		border-radius: 0.5rem;
		font-weight: bold;
	}

	@media (max-width: 900px) {
		:global(body) {
			font-size: 0.8em;
			align-items: flex-start;
			margin-top: 40px;
		}

		#controller button {
			width: 70px !important;
			height: 70px !important;
			margin-top: 0.7rem;
		}
	}

	#home {
		margin-left: 30px;
	}

	#status {
		min-width: 60vw;
		padding: 40px;
		text-align: left;
	}

	.statusfield {
		font-size: 2em;
	}

	.statuscontent {
		font-size: 2.4em;
	}

	.statussubcontent {
		font-size: 1.8em;
		color: var(--gray);
	}

	.statusvalue {
		margin: 25px;
	}

	#controller {
		position: fixed;
		bottom: 20px;
		right: 20px;
	}

	#controller button {
		width: 120px;
		height: 120px;
		margin: 0;
		margin-left: 10px;
		font-size: 1.6em;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	#next {
		position: fixed;
		bottom: 20px;
		left: 20px;
		width: 160px;
		height: 160px;
		margin: 0;
	}

    select {
        margin-top: 20px;
        background-color: var(--blue);
        padding: 10px;
        border-radius: 10px;
        border: 3px solid white;
        color: white;
    }
</style>
