import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { commandRuntime } from '@/commands'
import { siteConfig } from '@/config/site'
import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'
import { createCommandExecutor } from '@/terminal/executor/CommandExecutor'
import { createCommandContextBuilder } from '@/terminal/executor/context'
import { capOutput } from '@/terminal/output-limit'
import { createCommandParser } from '@/terminal/parser/CommandParser'

export const MAX_HISTORY = 1000

export const useTerminalStore = defineStore('terminal', () => {
  const cwd = ref(siteConfig.homeDir)
  const history = ref<string[]>([])
  const env = ref<Record<string, string>>({
    USER: siteConfig.username,
    HOME: siteConfig.homeDir,
  })
  const chunks = ref<OutputChunk[]>([
    ...siteConfig.banner.map((line): OutputChunk => ({ type: 'system', content: line })),
    ...siteConfig.messages.welcome.map(
      (content): OutputChunk => ({ type: 'system', content }),
    ),
  ])

  /** 输出是否已截断；clear 时复位 */
  let truncated = false

  const outputBuffer = createOutputBuffer({
    get chunks() {
      return chunks.value
    },
    append(chunk) {
      chunks.value.push(chunk)
      truncated = capOutput(chunks.value, truncated)
    },
    clear() {
      chunks.value = []
      truncated = false
    },
  })

  const executor = createCommandExecutor({
    registry: commandRuntime.registry,
    parser: createCommandParser(),
    output: outputBuffer,
    ready: commandRuntime.ready,
    buildContext: createCommandContextBuilder({
      getCwd: () => cwd.value,
      getEnv: () => env.value,
      setCwd(next) {
        cwd.value = next
      },
      getCommands: () => commandRuntime.commands,
      getHistory: () => history.value,
      dataSource: commandRuntime.deps.dataSource,
      vfs: commandRuntime.deps.vfs,
      mounts: commandRuntime.deps.mounts,
    }),
  })

  function recordHistory(command: string) {
    if (history.value[history.value.length - 1] === command) return
    history.value.push(command)
    if (history.value.length > MAX_HISTORY) {
      history.value.splice(0, history.value.length - MAX_HISTORY)
    }
  }

  async function submit(raw: string): Promise<void> {
    const command = raw.trim()
    if (!command) return

    recordHistory(command)
    outputBuffer.push({ type: 'command', cwd: cwd.value, input: command })
    await executor.execute(command)
  }

  function clearOutput() {
    outputBuffer.clear()
  }

  /** 命令名快照（补全使用），随插件注册实时变化 */
  const commandNames = computed(() => commandRuntime.commands.map((command) => command.name))

  function showCompletions(candidates: readonly string[]) {
    outputBuffer.push({ type: 'system', content: `候选：${candidates.join('  ')}` })
  }

  return {
    cwd,
    history,
    env,
    chunks,
    outputBuffer,
    submit,
    clearOutput,
    commandNames,
    vfs: commandRuntime.deps.vfs,
    homeDir: siteConfig.homeDir,
    showCompletions,
  }
})
