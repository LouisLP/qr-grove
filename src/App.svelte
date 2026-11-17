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
</script>

<div class='page' style:--sky={palette.sky}>
  <header>
    <a class='mark' href='./' aria-label='QR Grove home'>
      <svg viewBox='0 0 32 32' aria-hidden='true'><rect width='32' height='32' rx='7' fill='currentColor' opacity='.14' /><g fill='currentColor'><rect x='5' y='5' width='9' height='9' rx='1.5' /><rect x='18' y='5' width='9' height='9' rx='1.5' /><rect x='5' y='18' width='9' height='9' rx='1.5' /><rect x='18' y='18' width='4' height='4' rx='1' /><rect x='23' y='23' width='4' height='4' rx='1' /></g></svg>
      QR Grove
    </a>
  </header>

  <main>
    <section class='intro'>
      <h1>A garden that's secretly a QR code</h1>
      <p>Every tree, hedge and rock sits on a dark square of a real QR code. Look at it from above and your phone can scan it.</p>
    </section>

    <section class='stage-card' aria-label='Garden preview'>
      <div class='stage'>
        {#if garden}
          <Stage bind:this={stage} {garden} {palette} {view} />
        {/if}
      </div>
      <div class='stage-bar'>
        <div class='views' role='radiogroup' aria-label='View'>
          <button role='radio' aria-checked={view === 'iso'} onclick={() => (view = 'iso')}>Garden</button>
          <button role='radio' aria-checked={view === 'top'} onclick={() => (view = 'top')}>QR code</button>
        </div>
        <p class='caption'>
          {view === 'top'
            ? 'Point your phone camera at the screen'
            : 'Switch to QR code to see it from above'}
        </p>
      </div>
    </section>

    <section class='controls' aria-label='Garden settings'>
      <div class='field wide'>
        <label class='label' for='text'>Link or text</label>
        <input id='text' type='text' bind:value={text} autocomplete='off' spellcheck='false' placeholder='https://…' />
        {#if qr instanceof Error}
          <p class='err' role='alert'>{qr.message}. Shorten it to plant a garden.</p>
        {:else}
          <p class='meta'>Version {qr.version} · {qr.size}×{qr.size} squares · {garden?.parts.length ?? 0} pieces</p>
        {/if}
      </div>

      <div class='field'>
        <span class='label' id='season-label'>Season</span>
        <div class='seasons' role='radiogroup' aria-labelledby='season-label'>
          {#each SEASONS as s (s)}
            <button role='radio' aria-checked={season === s} onclick={() => (season = s)}>
              <span class='swatch' style:background={PALETTES[s].ground} style:--leaf={PALETTES[s].canopy[0]}></span>
              {PALETTES[s].label}
            </button>
          {/each}
        </div>
      </div>

      <div class='field'>
        <span class='label'>Actions</span>
        <div class='actions'>
          <button class='btn' onclick={() => seed++}>Replant</button>
          <button class='btn primary' onclick={download} disabled={!garden}>Download PNG</button>
          <button class='btn' onclick={copyLink}>Copy link</button>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <p>Dark squares become trees, bushes, rocks and hedges with dark tops. Light squares stay open ground. The three corner squares are hedges around a pond. Error correction level Q lets the code survive up to 25% damage.</p>
  </footer>

  <div class='toast' class:show={toast} role='status' aria-live='polite'>{toast}</div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px));
  }
  header {
    max-width: 1080px;
    width: 100%;
    margin-inline: auto;
    padding-block: 20px;
  }
  .mark {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 1.15rem;
    color: var(--fg);
    text-decoration: none;
    letter-spacing: -0.01em;
  }
  .mark svg {
    width: 28px;
    height: 28px;
    color: var(--accent);
  }
  main {
    max-width: 1080px;
    width: 100%;
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
    flex: 1;
  }
  .intro {
    text-align: center;
    max-width: 40rem;
    margin-inline: auto;
    padding-block: 8px 4px;
  }
  h1 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(1.9rem, 4.6vw, 3.1rem);
    line-height: 1.05;
    letter-spacing: -0.025em;
    margin: 0 0 12px;
    text-wrap: balance;
  }
  .intro p {
    margin: 0;
    color: var(--muted);
    font-size: 1.02rem;
    text-wrap: pretty;
  }
  .stage-card {
    border-radius: 22px;
    overflow: hidden;
    border: 1px solid var(--line);
    background: radial-gradient(120% 90% at 50% 20%, color-mix(in oklab, var(--sky) 100%, white 25%), var(--sky));
    transition: background 0.6s;
  }
  @media (prefers-color-scheme: dark) {
    .stage-card {
      background: radial-gradient(120% 90% at 50% 20%, color-mix(in oklab, var(--sky) 22%, var(--surface)), var(--surface));
    }
  }
  .stage {
    position: relative;
    aspect-ratio: 16 / 10;
    max-height: 72vh;
    width: 100%;
  }
  .stage-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 4px 16px 18px;
  }
  .views {
    display: flex;
    padding: 4px;
    gap: 2px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--line);
  }
  .views button {
    border: 0;
    background: transparent;
    padding: 8px 18px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    color: var(--muted);
    white-space: nowrap;
  }
  .views button[aria-checked='true'] {
    background: var(--fg);
    color: var(--bg);
  }
  .caption {
    margin: 0;
    text-align: center;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .controls {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 20px 28px;
    padding: 24px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--muted);
  }
  input {
    padding: 13px 14px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg);
    font-size: 1rem;
    min-width: 0;
  }
  .meta,
  .err {
    margin: 0;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  .err {
    color: var(--danger);
  }
  .seasons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .seasons button,
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 8px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
  }
  .seasons button[aria-checked='true'] {
    border-color: var(--fg);
    box-shadow: inset 0 0 0 1px var(--fg);
    font-weight: 600;
  }
  .swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    box-shadow: inset 0 0 0 4px var(--leaf);
    flex: none;
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .btn {
    font-weight: 600;
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  footer {
    max-width: 44rem;
    margin: 32px auto 0;
    padding-block: 0 32px;
    text-align: center;
    color: var(--muted);
    font-size: 0.85rem;
  }
  footer p {
    margin: 0;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    transform: translate(-50%, 12px);
    background: var(--fg);
    color: var(--bg);
    padding: 10px 16px;
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
  @media (max-width: 760px) {
    .stage {
      aspect-ratio: 1;
    }
    .controls {
      grid-template-columns: 1fr;
      padding: 18px;
    }
    .seasons {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast,
    .stage-card {
      transition: none;
    }
  }
</style>
