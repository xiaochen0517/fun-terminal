/**
 * 命令解析器（Parser）
 *
 * 将用户输入的原始字符串解析为结构化的命令：
 * 命令名 + 位置参数数组 + 选项。
 *
 * 解析规则（20261110 M2 冻结）：
 * - 空白（空格/制表符/换行）分隔 token，连续空白折叠；
 * - 单引号内字符原样保留；双引号内仅 `\"` 与 `\\` 为转义；
 * - 相邻引号段与非引号段拼接为同一 token（`"a"b` → `ab`）；
 * - 未闭合引号宽容处理：到输入结尾全部作为该 token，不抛错；
 * - 带引号的 token 一律视为位置参数，不参与选项识别；
 * - `--` 之后全部视为位置参数；
 * - `--name=value`、`--name value`（下一 token 非选项时）、`-abc` → `-a -b -c`；
 * - `-`、`-x=v`、`---x` 等非常规形态按位置参数处理；
 * - 第一个 token 恒为命令名（即使以 `-` 开头）；
 * - 同一选项重复出现时后者覆盖前者。
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

/** 词法阶段的 token：`quoted` 表示该 token 是否来自引号（含拼接段） */
interface RawToken {
  text: string
  quoted: boolean
}

const WHITESPACE = /[ \t\r\n]/
const SHORT_CLUSTER = /^[A-Za-z0-9]+$/
const LONG_OPTION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

/**
 * 单遍扫描把输入切成 token。
 *
 * 引号内不切分；双引号内 `\"` / `\\` 消耗转义；未闭合引号直接吃到结尾。
 */
function tokenize(input: string): RawToken[] {
  const tokens: RawToken[] = []
  let text = ''
  let quoted = false
  let started = false

  function flush() {
    if (!started) return
    tokens.push({ text, quoted })
    text = ''
    quoted = false
    started = false
  }

  let index = 0
  while (index < input.length) {
    const char = input[index]!

    if (WHITESPACE.test(char)) {
      flush()
      index += 1
      continue
    }

    started = true

    if (char === "'") {
      quoted = true
      index += 1
      while (index < input.length && input[index] !== "'") {
        text += input[index]
        index += 1
      }
      // 跳过闭合引号；未闭合时 index 已到结尾
      if (index < input.length) index += 1
      continue
    }

    if (char === '"') {
      quoted = true
      index += 1
      while (index < input.length && input[index] !== '"') {
        if (
          input[index] === '\\' &&
          index + 1 < input.length &&
          (input[index + 1] === '"' || input[index + 1] === '\\')
        ) {
          text += input[index + 1]
          index += 2
          continue
        }
        text += input[index]
        index += 1
      }
      // 跳过闭合引号；未闭合时 index 已到结尾
      if (index < input.length) index += 1
      continue
    }

    text += char
    index += 1
  }

  flush()
  return tokens
}

/** 判断某个 token 是否可作为 `--name value` 的值 */
function canBeOptionValue(token: RawToken | undefined): token is RawToken {
  if (!token) return false
  if (token.text === '--') return false
  // 带引号的 token 即使以 `-` 开头也按值处理
  if (token.quoted) return true
  return !token.text.startsWith('-')
}

function parse(input: string): ParsedCommand {
  const trimmed = input.trim()
  if (!trimmed) {
    return { name: '', args: [], options: {} }
  }

  const tokens = tokenize(trimmed)
  const name = tokens[0]?.text ?? ''
  const args: string[] = []
  const options: Record<string, string | boolean> = {}
  let positionalOnly = false

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index]!

    if (!positionalOnly && !token.quoted && token.text === '--') {
      positionalOnly = true
      continue
    }

    if (!positionalOnly && !token.quoted && token.text.startsWith('--')) {
      const body = token.text.slice(2)
      const equalsIndex = body.indexOf('=')

      if (equalsIndex > 0) {
        options[`--${body.slice(0, equalsIndex)}`] = body.slice(equalsIndex + 1)
        continue
      }

      if (LONG_OPTION_NAME.test(body)) {
        const next = tokens[index + 1]
        if (canBeOptionValue(next)) {
          options[`--${body}`] = next.text
          index += 1
        } else {
          options[`--${body}`] = true
        }
        continue
      }

      args.push(token.text)
      continue
    }

    if (
      !positionalOnly &&
      !token.quoted &&
      token.text.length > 1 &&
      token.text.startsWith('-')
    ) {
      const cluster = token.text.slice(1)
      if (SHORT_CLUSTER.test(cluster)) {
        for (const flag of cluster) {
          options[`-${flag}`] = true
        }
        continue
      }
      args.push(token.text)
      continue
    }

    args.push(token.text)
  }

  return { name, args, options }
}

/** 创建命令解析器 */
export function createCommandParser(): CommandParser {
  return { parse }
}
