/**
 * 路径工具（纯函数）
 *
 * VFS 内部一律使用 POSIX 绝对路径。本模块只做字符串运算，不认识节点、不依赖
 * 任何项目其他模块，因此可在任意环境直接单测。
 *
 * 规范化规则（与需求 20261110-02 第 3.2 节一致）：
 * - 反斜杠先归一化为 `/`（宽容 Windows 输入习惯），节点名本身不允许 `\`；
 * - 重复斜杠折叠、`.` 丢弃、`..` 回退且越界停留根、结尾斜杠去除（根除外）；
 * - 空串归一为 `/`；相对输入被视为相对根，输出恒为以 `/` 开头的绝对路径；
 * - 大小写不转换；`~` 不展开（由命令层基于 home 目录负责）。
 */

/** 是否以 `/` 开头（反斜杠前缀按 Windows 习惯同样视为绝对路径） */
export function isAbsolute(path: string): boolean {
  return path.startsWith('/') || path.startsWith('\\')
}

/** 规范化为绝对路径 */
export function normalize(path: string): string {
  const segments = path.replace(/\\/g, '/').split('/')
  const stack: string[] = []

  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      stack.pop()
      continue
    }
    stack.push(segment)
  }

  return `/${stack.join('/')}`
}

/** 拼接多段路径并规范化；无参数时为根 */
export function join(...parts: string[]): string {
  return normalize(parts.join('/'))
}

/** 把 target 解析为绝对路径：绝对路径直接规范化，否则相对 base 解析 */
export function resolve(base: string, target: string): string {
  if (isAbsolute(target)) return normalize(target)
  if (target === '') return normalize(base)
  return normalize(`${base}/${target}`)
}

/** 父目录；根返回根 */
export function dirname(path: string): string {
  const normalized = normalize(path)
  if (normalized === '/') return '/'
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '/' : normalized.slice(0, index)
}

/** 末段名；根返回空串 */
export function basename(path: string): string {
  const normalized = normalize(path)
  if (normalized === '/') return ''
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}
