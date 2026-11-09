/**
 * 命令解析器（Parser）
 *
 * 将用户输入的原始字符串解析为结构化的命令：
 * 命令名 + 位置参数数组 + 选项。
 *
 * 设计要点：
 * - 支持空格分隔参数
 * - 支持引号（单/双引号）包裹含空格的参数
 * - 支持 `--` / `-` 选项解析
 *
 * 本文件仅定义接口与结果类型，具体实现留待功能开发阶段。
 */

/** 解析结果 */
export interface ParsedCommand {
  /** 命令名 */
  name: string
  /** 位置参数 */
  args: string[]
  /** 选项，如 { '-a': true, '--long': true, '--name': 'xxx' } */
  options: Record<string, string | boolean>
}

/** 命令解析器接口 */
export interface CommandParser {
  /** 解析原始输入，返回结构化命令 */
  parse(input: string): ParsedCommand
}
