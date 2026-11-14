/**
 * 画廊清单与构建期资源解析
 *
 * 图片是构建期静态资源：清单只描述文件名与可访问文案，真实 URL 由 Vite 的
 * `?url` 生成（带 hash，自动兼容 base 子路径）。`?no-inline` 避免小图被内联成
 * base64，保证 HTML chunk 精简且资源可缓存。
 *
 * 素材来源、许可与处理方式见同目录 README.md；只使用公共领域 / CC0 图片。
 */

/** 画廊条目：文件名、MIME 与展示文案 */
export interface GalleryEntry {
  /** 资源文件名，与 src/data/static/gallery/ 下的文件同名 */
  file: string
  /** 图片 MIME，如 image/png */
  mime: string
  /** 可访问标题（figcaption 主行） */
  title: string
  /** 替代文本（alt），图片加载失败或读屏时使用 */
  alt: string
  /** 可选说明（figcaption 次行） */
  description?: string
  /** 原始像素宽高，用于 <img width height> 预留布局 */
  width: number
  height: number
}

const GALLERY_ASSETS = import.meta.glob<string>(
  './*.{png,jpg,jpeg,gif,webp,svg,bmp,ico,avif}',
  {
    eager: true,
    query: '?url&no-inline',
    import: 'default',
  },
) as Record<string, string>

/** 示例画廊：3 张不同格式的公共领域 / CC0 图片 */
export const galleryEntries: readonly GalleryEntry[] = Object.freeze([
  Object.freeze({
    file: 'domain-name.png',
    mime: 'image/png',
    title: '域名的组成',
    alt: '一张标注域名结构的示意图：example.com 由二级域名 example 与顶级域名 com 组成',
    description: 'PNG 示例图：CC0 的域名结构示意图，带说明文字。',
    width: 977,
    height: 358,
  }),
  Object.freeze({
    file: 'pluto.jpg',
    mime: 'image/jpeg',
    title: '冥王星',
    alt: 'NASA 新视野号拍摄的冥王星彩色图像，表面有明暗不一的纹理与陨石坑',
    description: 'JPEG 示例图：NASA 公共领域的冥王星照片。',
    width: 1280,
    height: 1280,
  }),
  Object.freeze({
    file: 'saturn.webp',
    mime: 'image/webp',
    title: '土星',
    alt: '卡西尼号拍摄的土星与光环，背景为深色太空',
    description: 'WebP 示例图：NASA 公共领域的土星照片，展示现代压缩格式。',
    width: 1280,
    height: 654,
  }),
])

/** 由文件名解析构建期 URL；清单与文件不一致时返回 null */
export function resolveGallerySrc(file: string): string | null {
  return GALLERY_ASSETS[`./${file}`] ?? null
}

/** 供一致性测试使用：当前目录下被 Vite 收录的图片文件名 */
export function galleryAssetFiles(): readonly string[] {
  return Object.keys(GALLERY_ASSETS).map((key) => key.replace(/^\.\//, ''))
}
