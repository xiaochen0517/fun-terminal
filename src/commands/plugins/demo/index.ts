/**
 * 示例插件（demo）
 *
 * 验证 M6 的完整链路：插件在 `install(api)` 中通过 `api.mounts` 挂载只读内容树
 * `/mnt/demo`，并通过 `commands` 声明 `mount` / `unmount` 两条插件命令。
 *
 * 挂载失败（重复 / 目标非法）不抛错：MountApi 已告警，插件其余能力（命令）
 * 仍可注册；这与 M8 的语义一致——命令能力与挂载状态解耦。
 */

import type { CommandPlugin } from '@/commands/CommandPlugin'

import { mountCommand } from './mount'
import { unmountCommand } from './unmount'
import { DEMO_MOUNT_TARGET, createDemoTree } from './tree'

export const demoPlugin: CommandPlugin = {
  id: 'demo',
  commands: [mountCommand, unmountCommand],
  install(api) {
    api.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())
  },
}
