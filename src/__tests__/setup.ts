import { vi } from 'vitest'

/**
 * 测试环境默认 fetch 桩：返回空文章清单，避免应用单例装载博客插件时
 * 发起真实请求或产生告警噪音。需要真实/自定义数据的用例自行覆盖 globalThis.fetch。
 */
vi.stubGlobal(
  'fetch',
  vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ articles: [] }),
    text: async () => '',
  })),
)
