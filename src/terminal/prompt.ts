/** 去掉路径末尾的斜杠；根路径保持为 / */
function stripTrailingSlash(path: string): string {
  if (path === '/') return '/'
  return path.replace(/\/+$/, '') || '/'
}

/**
 * 将 cwd 转换为提示符中显示的路径：
 * - home 本身显示为 ~
 * - home 之下显示为 ~/子路径
 * - 其他情况保持绝对路径
 *
 * 只处理 home 缩写与末尾斜杠，不负责 . / .. / 重复斜杠的规范化（由 VFS 负责）。
 */
export function formatPromptPath(cwd: string, homeDir: string): string {
  const path = stripTrailingSlash(cwd)
  const home = stripTrailingSlash(homeDir)

  if (path === home) return '~'
  if (home !== '/' && path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`
  if (home === '/' && path !== '/') return `~${path}`
  return path
}
