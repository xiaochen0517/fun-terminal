/**
 * 图片插件（image）
 *
 * `install` 阶段把构建期确定的示例画廊挂载到 `/mnt/gallery`，并注册 `img` 命令。
 * 素材 URL 在构建期已确定，`install` 同步完成，不发起网络请求；
 * 挂载失败只由 MountApi 告警，不阻断 `img` 命令注册。
 */

import type { CommandPlugin } from '@/commands/CommandPlugin'

import { imgCommand } from './img'
import { createGalleryTree, GALLERY_MOUNT_TARGET } from './tree'

export const imagePlugin: CommandPlugin = {
  id: 'image',
  commands: [imgCommand],
  install(api) {
    api.mounts.mount(GALLERY_MOUNT_TARGET, createGalleryTree())
  },
}
