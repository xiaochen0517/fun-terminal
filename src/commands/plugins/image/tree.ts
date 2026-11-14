/**
 * 画廊子树
 *
 * 把清单投影为只读 VFS 子树：`/mnt/gallery/<file>`。
 * 图片二进制不进 VFS，节点 `meta.src` 保存 Vite 生成的构建期 URL；
 * `cat` 由 `mime` 识别为图片并提示使用 `img`，`ls -l` 由 `meta.src` 判断为外部资源。
 *
 * 资源缺失（清单与文件不一致）时跳过该条并告警，不影响其余图片与命令注册；
 * 构建期缺失由 `gallery.spec.ts` 直接失败暴露。
 */

import { buildTree } from '@/fs/build'
import type { TreeSpec } from '@/fs/build'
import type { VfsNode } from '@/fs/vfs'
import type { GalleryEntry } from '@/data/static/gallery'
import { galleryEntries, resolveGallerySrc } from '@/data/static/gallery'

/** 图片插件挂载目标 */
export const GALLERY_MOUNT_TARGET = '/mnt/gallery'

/** 清单 + 资源 URL → 只读子树；空输入返回空目录 */
export function createGalleryTree(
  entries: readonly GalleryEntry[] = galleryEntries,
): VfsNode {
  const spec: TreeSpec = {}

  for (const entry of entries) {
    const src = resolveGallerySrc(entry.file)
    if (!src) {
      console.warn(`[fun-terminal] 画廊资源缺失，已跳过: ${entry.file}`)
      continue
    }

    if (Object.prototype.hasOwnProperty.call(spec, entry.file)) {
      throw new Error(`画廊文件名重复: ${entry.file}`)
    }

    spec[entry.file] = {
      file: '', // 二进制正文不进 VFS；cat 由 mime 识别为图片并提示用 img
      meta: {
        mime: entry.mime,
        src,
        alt: entry.alt,
        title: entry.title,
        ...(entry.description ? { description: entry.description } : {}),
        width: String(entry.width),
        height: String(entry.height),
      },
    }
  }

  return buildTree(spec)
}
