<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { complete } from '@/terminal/completion'
import type { Vfs } from '@/fs/vfs'

const INPUT_MAX_LENGTH = 1000
const COMPOSITION_ENTER_GUARD_MS = 50

const props = defineProps<{
  modelValue: string
  history: readonly string[]
  commands: readonly string[]
  cwd: string
  vfs: Vfs
  homeDir: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [value: string]
  'clear-output': []
  'list-completions': [candidates: readonly string[]]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isFocused = ref(false)
const isComposing = ref(false)
const caret = ref(0)
const selectionEnd = ref(0)
const navIndex = ref<number | null>(null)
const draft = ref('')

let compositionEndedAt = 0

const hasSelection = computed(() => selectionEnd.value > caret.value)
const showCursor = computed(() => isFocused.value && !isComposing.value && !hasSelection.value)
const beforeCaret = computed(() => props.modelValue.slice(0, caret.value))
const atCaret = computed(() => props.modelValue.slice(caret.value, caret.value + 1) || ' ')
const afterCaret = computed(() => props.modelValue.slice(caret.value + 1))

function syncSelection() {
  const el = textareaRef.value
  if (!el) return
  caret.value = el.selectionStart ?? 0
  selectionEnd.value = el.selectionEnd ?? caret.value
}

function normalizeTextarea(el: HTMLTextAreaElement) {
  const raw = el.value
  const normalized = raw.replace(/\r\n?|\n/g, ' ').slice(0, INPUT_MAX_LENGTH)
  if (normalized === raw) return

  const start = el.selectionStart ?? raw.length
  const end = el.selectionEnd ?? start
  const nextStart = raw.slice(0, start).replace(/\r\n?|\n/g, ' ').length
  const nextEnd = raw.slice(0, end).replace(/\r\n?|\n/g, ' ').length

  el.value = normalized
  const safeStart = Math.min(nextStart, normalized.length)
  const safeEnd = Math.min(nextEnd, normalized.length)
  el.setSelectionRange(safeStart, safeEnd)
}

function onInput(event: Event) {
  const el = event.target as HTMLTextAreaElement
  if (!isComposing.value) {
    normalizeTextarea(el)
  }
  emit('update:modelValue', el.value)
  syncSelection()
}

function onCompositionStart() {
  isComposing.value = true
}

function onCompositionEnd() {
  isComposing.value = false
  compositionEndedAt = Date.now()
  const el = textareaRef.value
  if (el) {
    normalizeTextarea(el)
    emit('update:modelValue', el.value)
  }
  syncSelection()
}

function submit() {
  navIndex.value = null
  draft.value = ''
  emit('submit', props.modelValue)
}

function completeInput() {
  const result = complete(props.modelValue, {
    commands: props.commands,
    cwd: props.cwd,
    vfs: props.vfs,
    homeDir: props.homeDir,
  })
  if (result.type === 'none') return

  emit('update:modelValue', result.value)
  if (result.type === 'list') emit('list-completions', result.candidates)
  void nextTick(focusEnd)
}

function cancelInput() {
  navIndex.value = null
  draft.value = ''
  emit('update:modelValue', '')
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.keyCode === 229) return

  if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
    event.preventDefault()
    emit('clear-output')
    return
  }

  if (event.ctrlKey && (event.key === 'c' || event.key === 'C')) {
    event.preventDefault()
    cancelInput()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    if (Date.now() - compositionEndedAt < COMPOSITION_ENTER_GUARD_MS) {
      compositionEndedAt = 0
      return
    }
    submit()
    return
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return

  if (event.key === 'Tab') {
    event.preventDefault()
    completeInput()
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    navigate(-1)
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    navigate(1)
  }
}

function navigate(direction: -1 | 1) {
  const length = props.history.length
  if (length === 0) return

  if (navIndex.value === null) {
    if (direction === 1) return
    draft.value = props.modelValue
    navIndex.value = length - 1
  } else {
    const next = navIndex.value + direction
    if (next < 0) {
      navIndex.value = 0
    } else if (next >= length) {
      navIndex.value = null
      emit('update:modelValue', draft.value)
      void nextTick(focusEnd)
      return
    } else {
      navIndex.value = next
    }
  }

  const index = navIndex.value
  if (index === null) return
  const command = props.history[index]
  if (command !== undefined) {
    emit('update:modelValue', command)
    void nextTick(focusEnd)
  }
}

function focus() {
  textareaRef.value?.focus()
}

function focusEnd() {
  const el = textareaRef.value
  if (!el) return
  el.focus()
  const end = el.value.length
  el.setSelectionRange(end, end)
  syncSelection()
}

function onFocus() {
  isFocused.value = true
  syncSelection()
}

function onBlur() {
  isFocused.value = false
}

function onDocumentSelectionChange() {
  if (document.activeElement === textareaRef.value) syncSelection()
}

watch(
  () => props.modelValue,
  (value) => {
    if (caret.value <= value.length) return
    caret.value = value.length
    selectionEnd.value = Math.min(selectionEnd.value, value.length)
  },
)

watch(
  () => props.history.length,
  (length) => {
    if (navIndex.value !== null && navIndex.value >= length) navIndex.value = null
  },
)

onMounted(() => {
  document.addEventListener('selectionchange', onDocumentSelectionChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onDocumentSelectionChange)
})

defineExpose({ focus, focusEnd })
</script>

<template>
  <div class="terminal-input">
    <div class="terminal-input__mirror" aria-hidden="true">
      <template v-if="showCursor">
        <span>{{ beforeCaret }}</span>
        <span class="terminal-cursor">{{ atCaret }}</span>
        <span>{{ afterCaret }}</span>
      </template>
      <template v-else>{{ modelValue }}</template>
    </div>
    <textarea
      ref="textareaRef"
      class="terminal-input__capture"
      :value="modelValue"
      :maxlength="INPUT_MAX_LENGTH"
      aria-label="终端命令输入"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      rows="1"
      @input="onInput"
      @keydown="onKeydown"
      @keyup="syncSelection"
      @click="syncSelection"
      @select="syncSelection"
      @focus="onFocus"
      @blur="onBlur"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />
  </div>
</template>
