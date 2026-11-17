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
  }
  const { garden, palette, view }: Props = $props()

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

<canvas bind:this={canvas} aria-label={view === 'top'
  ? 'Top-down view of the garden, readable as a QR code'
  : 'Isometric view of the garden'}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
