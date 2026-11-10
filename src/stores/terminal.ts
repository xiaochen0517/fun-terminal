import { defineStore } from 'pinia'
import { ref } from 'vue'

import { commandRuntime } from '@/commands'
import { siteConfig } from '@/config/site'
import { createOutputBuffer } from '@/terminal/context/buffer'
import type { OutputChunk } from '@/terminal/context/OutputBuffer'
import { createCommandExecutor } from '@/terminal/executor/CommandExecutor'
import { createCommandContextBuilder } from '@/terminal/executor/context'
import { createCommandParser } from '@/terminal/parser/CommandParser'

export const MAX_HISTORY = 1000

export const useTerminalStore = defineStore('terminal', () => {
  const cwd = ref(siteConfig.homeDir)
  const history = ref<string[]>([])
  const env = ref<Record<string, string>>({
    USER: siteConfig.username,
    HOME: siteConfig.homeDir,
  })
  const chunks = ref<OutputChunk[]>(
    siteConfig.messages.welcome.map(
      (content): OutputChunk => ({ type: 'system', content }),
    ),
  )

  const outputBuffer = createOutputBuffer({
    get chunks() {
      return chunks.value
    },
    append(chunk) {
      chunks.value.push(chunk)
    },
    clear() {
      chunks.value = []
    },
  })

  const executor = createCommandExecutor({
    registry: commandRuntime.registry,
    parser: createCommandParser(),
    output: outputBuffer,
    buildContext: createCommandContextBuilder({
      getCwd: () => cwd.value,
      getEnv: () => env.value,
      setCwd(next) {
        cwd.value = next
      },
      getCommands: () => commandRuntime.commands,
      dataSource: commandRuntime.deps.dataSource,
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

  return { cwd, history, env, chunks, outputBuffer, submit, clearOutput }
})
