# 画廊示例素材（gallery）

M9 图片插件的示例素材。**全部为下载的公共领域 / CC0 图片**，覆盖 PNG、JPEG、WebP 三种格式；不手绘、不生成图片。

## 文件与来源

| 文件 | 尺寸 | 体积 | 来源 | 许可 / 作者 | 处理 |
| --- | --- | --- | --- | --- | --- |
| `domain-name.png` | 977×358 | 约 72 KB | [An annotated example of a domain name.png](<https://commons.wikimedia.org/wiki/File:An_annotated_example_of_a_domain_name.png>) | CC0 1.0；作者 ComputerUserUser | 原图，PNG `optimize` 无损重编码 |
| `pluto.jpg` | 1280×1280 | 约 296 KB | [Pluto-01 Stern 03 Pluto Color TXT.jpg](<https://commons.wikimedia.org/wiki/File:Pluto-01_Stern_03_Pluto_Color_TXT.jpg>) | 公共领域；NASA / Johns Hopkins University Applied Physics Laboratory / Southwest Research Institute | 1280px 缩略图，JPEG quality 80 重编码 |
| `saturn.webp` | 1280×654 | 约 18 KB | [Saturn from Cassini Orbiter (2004-10-06).jpg](<https://commons.wikimedia.org/wiki/File:Saturn_from_Cassini_Orbiter_(2004-10-06).jpg>) | 公共领域；NASA/JPL/Space Science Institute | 1280px 缩略图，JPEG → WebP quality 80 |

## 清单维护

1. 把图片放进本目录（支持 png / jpg / jpeg / gif / webp / svg / bmp / ico / avif）。
2. 在 `index.ts` 的 `galleryEntries` 登记 `file`、`mime`、`title`、`alt`、`description`、`width`、`height`。
3. 更新本文件的来源、许可与处理方式（仅使用公共领域 / CC0 素材）。
4. 运行 `npm run test:unit -- --run src/data/static/gallery`：漏登记、多放未登记文件、mime 与扩展名不匹配、清单字段非法都会失败。

## 说明

- 图片通过 `import.meta.glob(..., { eager: true, query: '?url&no-inline' })` 解析为构建期 URL，不内联 base64。
- 图片的字节数不进入 VFS；`cat` 按 `meta.mime` 识别为图片并提示使用 `img`，`ls -l` 的大小列显示 `-`。
- 替换素材时同步更新 `galleryEntries` 的尺寸与文案，以及需求文档 `20261113-01-图片查看插件.md` 的演示脚本。
