<script setup lang="ts">
import PromptBar from '@/terminal/components/PromptBar.vue'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'

defineProps<{ chunks: readonly OutputChunk[] }>()

function textOf(chunk: OutputChunk): string {
  return chunk.type === 'command' ? '' : chunk.content
}

function commandCwd(chunk: OutputChunk): string {
  return chunk.type === 'command' ? chunk.cwd : ''
}

function commandInput(chunk: OutputChunk): string {
  return chunk.type === 'command' ? chunk.input : ''
}
</script>

<template>
  <div class="terminal-output">
    <div
      v-for="(chunk, index) in chunks"
      :key="index"
      class="terminal-chunk"
      :class="`terminal-chunk--${chunk.type}`"
    >
      <template v-if="chunk.type === 'command'">
        <PromptBar :cwd="commandCwd(chunk)" />
        <span class="terminal-chunk__command">{{ commandInput(chunk) }}</span>
      </template>
      <div v-else-if="chunk.type === 'html'" class="terminal-chunk__html" v-html="textOf(chunk)" />
      <template v-else>{{ textOf(chunk) }}</template>
    </div>
  </div>
</template>
