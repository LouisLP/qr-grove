<script lang='ts'>
  import type { Garden } from '../lib/garden'
  import type { View } from '../lib/scene'
  import type { Palette } from '../lib/seasons'
  import { onMount } from 'svelte'
  import { GardenScene } from '../lib/scene'

  interface Props {
    garden: Garden
    palette: Palette
    view: View
    ontoggle: () => void
  }
  const { garden, palette, view, ontoggle }: Props = $props()

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      ontoggle()
    }
  }

  let canvas: HTMLCanvasElement
  let scene = $state<GardenScene>()

  onMount(() => {
    scene = new GardenScene(canvas)
    return () => scene?.destroy()
  })

  $effect(() => {
    scene?.setGarden(garden, palette)
  })

  $effect(() => {
    scene?.setView(view)
  })

  export function exportPng(v: View) {
    if (!scene)
      return Promise.reject(new Error('Scene not ready'))
    return scene.exportPng(v)
  }
</script>

<canvas
  bind:this={canvas}
  role='button'
  tabindex='0'
  onclick={ontoggle}
  onkeydown={handleKey}
  aria-label={view === 'top'
    ? 'QR code view. Activate to show the garden'
    : 'Garden view. Activate to show the QR code'}
></canvas>

<style>
  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;
    border-radius: 18px;
  }
</style>
