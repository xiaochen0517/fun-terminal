/**
 * 执行器错误文案
 *
 * 集中生成未知命令与内部错误文案，供执行器实现与测试共用，
 * 避免测试重复硬编码。
 */

/** 未知命令提示 */
export function formatUnknownCommand(name: string): string {
  return `${name}: 未找到命令，输入 help 查看可用命令`
}

/** 命令内部错误提示（同步抛错与 Promise reject 共用） */
export function formatInternalError(name: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error)
  return `${name}: 内部错误：${reason || '未知错误'}`
}
