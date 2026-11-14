/**
 * 输出上限（M10）
 *
 * 终端输出 chunk 无限增长会导致长时间使用后页面卡顿（D-08）。
 * `capOutput` 在追加后调用：超过上限时丢弃最旧内容，并在首次截断时于
 * 首部插入一条截断提示；`clear` 由 Store 负责复位截断状态。
 */

import type { OutputChunk } from '@/terminal/context/OutputBuffer'

/** 输出 chunk 上限，与 `MAX_HISTORY = 1000` 保持一致 */
export const MAX_OUTPUT_CHUNKS = 1000

/** 首部常驻截断提示 */
export const TRUNCATION_NOTICE = '输出已截断：较早内容已丢弃（仅保留最近 1000 条）'

/**
 * 就地截断输出；返回是否处于「已截断」状态。
 *
 * - 未超限：原样返回；
 * - 首次超限：丢最旧、给截断提示腾出一个位置（index 0），插入提示；
 * - 已截断后再超限：保留 index 0 的提示，从 index 1 起丢最旧。
 */
export function capOutput(
  chunks: OutputChunk[],
  truncated: boolean,
  max = MAX_OUTPUT_CHUNKS,
): boolean {
  if (chunks.length <= max) return truncated

  if (!truncated) {
    chunks.splice(0, chunks.length - (max - 1))
    chunks.unshift({ type: 'system', content: TRUNCATION_NOTICE })
    return true
  }

  chunks.splice(1, chunks.length - max)
  return true
}
