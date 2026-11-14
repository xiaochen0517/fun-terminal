<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useTerminalStore } from '@/stores/terminal'
import PromptBar from '@/terminal/components/PromptBar.vue'
import TerminalInput from '@/terminal/components/TerminalInput.vue'
import TerminalOutput from '@/terminal/components/TerminalOutput.vue'

// 文件沿用架构文档中的 Terminal 命名，组件名使用多词形式以满足 lint 规则
defineOptions({ name: 'TerminalShell' })

/** 距离底部多少像素内仍视为「贴底」，避免用户轻微滚动后被拉回 */
const NEAR_BOTTOM_PX = 24

const store = useTerminalStore()
const input = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof TerminalInput> | null>(null)
/** 用户是否停留在底部；图片加载等异步高度变化只在贴底时自动跟随 */
const stickToBottom = ref(true)

let resizeObserver: ResizeObserver | null = null

function scrollToBottom() {
  const el = scrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function onScroll() {
  const el = scrollRef.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
}

/** 图片、iframe 等资源加载完成后，输出区高度可能变大，需要再贴底一次 */
function onMediaLoad(event: Event) {
  if (!(event.target instanceof HTMLImageElement)) return
  if (stickToBottom.value) void nextTick(scrollToBottom)
}

function onContentResize() {
  if (stickToBottom.value) void nextTick(scrollToBottom)
}

function focusInput() {
  inputRef.value?.focusEnd()
}

function onSubmit(raw: string) {
  void store.submit(raw) // 执行器内部已兜底，不产生未处理 rejection
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
    // 新命令 / 输入变化时恢复贴底；图片随后加载完成会由 load / ResizeObserver 再滚动
    stickToBottom.value = true
    void nextTick(scrollToBottom)
  },
  { flush: 'post' },
)

onMounted(() => {
  void nextTick(() => {
    focusInput()
    scrollToBottom()

    const scroll = scrollRef.value
    if (scroll) {
      // load / error 不冒泡，使用捕获阶段监听图片加载
      scroll.addEventListener('load', onMediaLoad, true)
      scroll.addEventListener('error', onMediaLoad, true)
    }

    const output = scroll?.querySelector('.terminal-output')
    if (output && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onContentResize)
      resizeObserver.observe(output)
    }
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null

  const scroll = scrollRef.value
  if (scroll) {
    scroll.removeEventListener('load', onMediaLoad, true)
    scroll.removeEventListener('error', onMediaLoad, true)
  }
})
</script>

<template>
  <div class="terminal" @click="onTerminalClick">
    <div ref="scrollRef" class="terminal__scroll" @scroll="onScroll">
      <TerminalOutput :chunks="store.chunks" />
      <div class="terminal__input-line">
        <PromptBar :cwd="store.cwd" />
        <TerminalInput
          ref="inputRef"
          v-model="input"
          :history="store.history"
          :commands="store.commandNames"
          :cwd="store.cwd"
          :vfs="store.vfs"
          :home-dir="store.homeDir"
          @submit="onSubmit"
          @clear-output="store.clearOutput"
          @list-completions="store.showCompletions"
        />
      </div>
    </div>
  </div>
</template>
