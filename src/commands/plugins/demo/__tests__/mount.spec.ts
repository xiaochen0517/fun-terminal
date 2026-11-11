import { describe, expect, it, vi } from 'vitest'

import { createTestContext } from '@/commands/builtin/__tests__/helpers'
import { mountCommand } from '@/commands/plugins/demo/mount'
import { createDemoTree, DEMO_MOUNT_TARGET } from '@/commands/plugins/demo/tree'
import type { MountApi, MountFailReason, MountResult } from '@/fs/mount'

function fakeMounts(result: MountResult): MountApi {
  return {
    mount: () => result,
    unmount: () => false,
    list: () => [],
  }
}

describe('mount command', () => {
  it('lists mounted points when called without arguments', () => {
    const { context, chunks } = createTestContext()
    context.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())

    mountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'text', content: '已挂载的目录（1）：\n  /mnt/demo' },
    ])
  })

  it('reports an empty mount list', () => {
    const { context, chunks } = createTestContext()

    mountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '当前没有挂载点。' }])
  })

  it('mounts the demo content on /mnt/demo', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })

    mountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '已挂载: /mnt/demo' }])
    expect(context.vfs.readFile('/mnt/demo/notes.txt')).toContain('示例笔记')
    expect(context.mounts.list().map((point) => point.target)).toEqual([DEMO_MOUNT_TARGET])
  })

  it('rejects an already mounted target without calling MountApi', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })
    context.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())
    const mount = vi.spyOn(context.mounts, 'mount')

    mountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'mount: /mnt/demo 已挂载' }])
    expect(mount).not.toHaveBeenCalled()
  })

  it('accepts a relative target resolved against cwd', () => {
    const { context, chunks } = createTestContext({ args: ['demo'], cwd: '/mnt' })

    mountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '已挂载: /mnt/demo' }])
  })

  it('reports a /mnt subdirectory without demo content', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/blog'] })

    mountCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content:
          'mount: 示例插件没有该挂载点的内容: /mnt/blog（当前仅提供 /mnt/demo）',
      },
    ])
    expect(context.mounts.list()).toEqual([])
  })

  it.each(['/home/guest', '/', '/tmp/x', '~'])(
    'rejects %s as an invalid mount target',
    (target) => {
      const { context, chunks } = createTestContext({ args: [target] })

      mountCommand.execute(context)

      expect(chunks).toEqual([
        {
          type: 'error',
          content: `mount: 挂载点非法: ${target}（仅支持 /mnt 下的子目录）`,
        },
      ])
      expect(context.mounts.list()).toEqual([])
    },
  )

  it('rejects too many arguments', () => {
    const { context, chunks } = createTestContext({
      args: ['/mnt/demo', '/mnt/blog'],
    })

    mountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'mount: 参数过多（一次只能挂载一个目录）' },
    ])
  })

  it('rejects unknown options', () => {
    const { context, chunks } = createTestContext({ options: { '-l': true } })

    mountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'mount: 不支持的选项: -l' }])
  })

  it('rejects ~user forms', () => {
    const { context, chunks } = createTestContext({ args: ['~guest/x'] })

    mountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'mount: 不支持 ~user 形式: ~guest/x' },
    ])
  })

  it('reports a missing HOME', () => {
    const { context, chunks } = createTestContext({
      args: ['~'],
      env: { USER: 'guest' },
    })

    mountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'mount: 无法确定 home 目录（HOME 未设置）' },
    ])
  })

  it.each([
    ['parent-missing', '父目录不存在'],
    ['invalid-tree', '内容树无效'],
    ['nested', '与已有挂载点构成嵌套'],
    ['invalid-target', '挂载点非法'],
  ] satisfies Array<[MountFailReason, string]>)(
    'maps the %s mount failure to a readable message',
    (reason, text) => {
      const { context, chunks } = createTestContext({
        args: ['/mnt/demo'],
        mounts: fakeMounts({ ok: false, reason }),
      })

      mountCommand.execute(context)

      expect(chunks).toEqual([
        { type: 'error', content: `mount: 挂载失败: /mnt/demo（${text}）` },
      ])
    },
  )

  it('keeps the duplicate failure as a defensive branch', () => {
    const { context, chunks } = createTestContext({
      args: ['/mnt/demo'],
      mounts: fakeMounts({ ok: false, reason: 'duplicate' }),
    })

    mountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'mount: /mnt/demo 已挂载' }])
  })

  it('only writes text or error chunks', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })

    mountCommand.execute(context)
    mountCommand.execute(context)

    expect(chunks.map((chunk) => chunk.type)).toEqual(['text', 'error'])
  })
})
