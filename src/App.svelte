<script lang='ts'>
  import type { Garden } from './lib/garden'
  import type { QrMatrix } from './lib/qr'
  import type { View } from './lib/scene'
  import type { Season } from './lib/seasons'
  import Stage from './components/Stage.svelte'
  import { plantGarden } from './lib/garden'
  import { makeQr, QrTooLongError } from './lib/qr'
  import { PALETTES, SEASONS } from './lib/seasons'
  import { readState, writeState } from './lib/share'

  const initial = readState(location.search)
  let text = $state(initial.text)
  let season = $state<Season>(initial.season)
  let seed = $state(initial.seed)
  let view = $state<View>('iso')
  let debounced = $state(initial.text)
  let stage = $state<ReturnType<typeof Stage>>()
  let toast = $state('')
  let toastTimer: ReturnType<typeof setTimeout>

  $effect(() => {
    const value = text
    const id = setTimeout(() => (debounced = value), 300)
    return () => clearTimeout(id)
  })

  const qr = $derived.by((): QrMatrix | Error => {
    try {
      return makeQr(debounced)
    }
    catch (e) {
      return e instanceof QrTooLongError
        ? e
        : new Error('Could not make a code from that text')
    }
  })
  const garden = $derived<Garden | null>(qr instanceof Error
    ? null
    : plantGarden(qr, season, seed))
  const palette = $derived(PALETTES[season])

  $effect(() => {
    history.replaceState(null, '', writeState({ text: debounced, season, seed }))
  })

  function say(msg: string) {
    toast = msg
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast = ''), 2200)
  }

  async function download() {
    if (!stage)
      return
    try {
      const blob = await stage.exportPng(view)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `qr-grove-${season}-${view === 'top'
        ? 'code'
        : 'garden'}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      say('Saved PNG')
    }
    catch {
      say('Could not save the image')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href)
      say('Link copied')
    }
    catch {
      say('Copy failed. Use the address bar instead')
    }
  }

  const ICONS: Record<Season, string> = {
    spring: 'M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5M12 2c1.7 0 2.5 2 2.5 3.4M12 2c-1.7 0-2.5 2-2.5 3.4M21 9.5c-.5-1.6-2.7-1.8-4-1.3M21 9.5c.5 1.6-1.2 3-2.6 3.4M17.6 19.6c-1.4 1-3.2-.3-3.9-1.5M17.6 19.6c-1.4 1-3.4.3-4.3-.9M6.4 19.6c1.4 1 3.2-.3 3.9-1.5M6.4 19.6c-1.4-1-.9-3.2 0-4.3M3 9.5c.5-1.6 2.7-1.8 4-1.3M3 9.5c-.5 1.6 1.2 3 2.6 3.4',
    summer: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    autumn: 'M7 16a4 4 0 0 1-.9-7.9A6 6 0 0 1 17.6 7a4.5 4.5 0 0 1 .4 9M8 19l-1 2M12 19l-1 2M16 19l-1 2',
    winter: 'M12 2v20M4.2 7l15.6 10M4.2 17L19.8 7M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5',
  }
</script>

<div class='app' style:--sky={palette.sky}>
  <header>
    <svg class='logo' viewBox='0 0 32 32' aria-hidden='true'><rect width='32' height='32' rx='7' fill='currentColor' opacity='.14' /><g fill='currentColor'><rect x='5' y='5' width='9' height='9' rx='1.5' /><rect x='18' y='5' width='9' height='9' rx='1.5' /><rect x='5' y='18' width='9' height='9' rx='1.5' /><rect x='18' y='18' width='4' height='4' rx='1' /><rect x='23' y='23' width='4' height='4' rx='1' /></g></svg>
    <h1>QR Grove</h1>
  </header>

  <main class='stage'>
    {#if garden}
      <Stage bind:this={stage} {garden} {palette} {view} ontoggle={() => (view = view === 'iso'
        ? 'top'
        : 'iso')} />
    {/if}
  </main>

  <section class='controls' aria-label='Garden settings'>
    <div class='row'>
      <div class='seg' role='radiogroup' aria-label='View'>
        <button role='radio' aria-checked={view === 'iso'} onclick={() => (view = 'iso')}>Garden</button>
        <button role='radio' aria-checked={view === 'top'} onclick={() => (view = 'top')}>QR code</button>
      </div>
      <div class='seg' role='radiogroup' aria-label='Season'>
        {#each SEASONS as s (s)}
          <button role='radio' aria-checked={season === s} onclick={() => (season = s)} title={PALETTES[s].label}>
            <svg viewBox='0 0 24 24' aria-hidden='true'><path d={ICONS[s]} /></svg>
            <span class='season-label'>{PALETTES[s].label}</span>
          </button>
        {/each}
      </div>
    </div>
    <div class='row'>
      <input id='text' type='text' bind:value={text} autocomplete='off' spellcheck='false' placeholder='Paste a link' aria-label='Link or text' aria-invalid={qr instanceof Error} />
      <div class='icons'>
        <button class='icon' onclick={() => seed++} aria-label='Replant' title='Replant'>
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5' /></svg>
        </button>
        <button class='icon' onclick={copyLink} aria-label='Copy link' title='Copy link'>
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7' /></svg>
        </button>
        <button class='icon primary' onclick={download} disabled={!garden} aria-label='Download PNG' title='Download PNG'>
          <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3v12M7 10l5 5l5-5M5 21h14' /></svg>
        </button>
      </div>
    </div>
    {#if qr instanceof Error}
      <p class='err' role='alert'>{qr.message}. Shorten it to plant a garden.</p>
    {/if}
  </section>

  <div class='toast' class:show={toast} role='status' aria-live='polite'>{toast}</div>
</div>

<style>
  .app {
    height: 100dvh;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-columns: minmax(0, 1fr);
    padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px));
    padding-block: max(14px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-bottom, 0px));
    background: radial-gradient(90% 70% at 50% 45%, color-mix(in oklab, var(--sky) 70%, white), var(--sky));
    transition: background 0.6s;
  }
  @media (prefers-color-scheme: dark) {
    .app {
      background: radial-gradient(90% 70% at 50% 45%, color-mix(in oklab, var(--sky) 20%, var(--surface)), var(--bg));
    }
  }
  header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .logo {
    width: 30px;
    height: 30px;
    color: var(--accent);
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.35rem;
    letter-spacing: -0.015em;
  }
  .stage {
    position: relative;
    min-height: 0;
  }
  .controls {
    width: 100%;
    max-width: 640px;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .row {
    display: flex;
    gap: 10px;
    min-width: 0;
  }
  .row:first-child {
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .seg {
    display: flex;
    padding: 4px;
    gap: 2px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--line);
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: transparent;
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--muted);
    cursor: pointer;
    white-space: nowrap;
  }
  .seg button[aria-checked='true'] {
    background: var(--fg);
    color: var(--bg);
  }
  svg path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .seg svg {
    width: 16px;
    height: 16px;
    flex: none;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 12px 18px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    font-size: 0.98rem;
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .icons {
    display: flex;
    gap: 6px;
  }
  .icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    cursor: pointer;
  }
  .icon svg {
    width: 19px;
    height: 19px;
  }
  .icon.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg);
  }
  .icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .err {
    margin: 0;
    text-align: center;
    font-size: 0.82rem;
    color: var(--danger);
  }
  .toast {
    position: fixed;
    left: 50%;
    top: calc(16px + env(safe-area-inset-top, 0px));
    transform: translate(-50%, -8px);
    background: var(--fg);
    color: var(--bg);
    padding: 9px 16px;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 500;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.2s,
      transform 0.2s;
  }
  .toast.show {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  @media (max-width: 560px) {
    .season-label {
      display: none;
    }
    .seg button {
      padding: 8px 11px;
    }
    .icon {
      width: 42px;
      height: 42px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast,
    .app {
      transition: none;
    }
  }
</style>
