<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

import { useTerminalStore } from '@/stores/terminal'
import PromptBar from '@/terminal/components/PromptBar.vue'
import TerminalInput from '@/terminal/components/TerminalInput.vue'
import TerminalOutput from '@/terminal/components/TerminalOutput.vue'

// 文件沿用架构文档中的 Terminal 命名，组件名使用多词形式以满足 lint 规则
defineOptions({ name: 'TerminalShell' })

const store = useTerminalStore()
const input = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof TerminalInput> | null>(null)

function scrollToBottom() {
  const el = scrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function focusInput() {
  inputRef.value?.focusEnd()
}

function onSubmit(raw: string) {
  store.submit(raw)
  input.value = ''
  void nextTick(() => focusInput())
}

function onTerminalClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('a, button, textarea')) return
  if (window.getSelection()?.toString()) return
  focusInput()
}

watch(
  () => [store.chunks.length, input.value.length] as const,
  () => {
    void nextTick(scrollToBottom)
  },
  { flush: 'post' },
)

onMounted(() => {
  void nextTick(() => {
    focusInput()
    scrollToBottom()
  })
})
</script>

<template>
  <div class="terminal" @click="onTerminalClick">
    <div ref="scrollRef" class="terminal__scroll">
      <TerminalOutput :chunks="store.chunks" />
      <div class="terminal__input-line">
        <PromptBar :cwd="store.cwd" />
        <TerminalInput ref="inputRef" v-model="input" :history="store.history" @submit="onSubmit" />
      </div>
    </div>
  </div>
</template>
