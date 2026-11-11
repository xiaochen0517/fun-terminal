import { describe, expect, it } from 'vitest'

import { createTestContext } from '@/commands/builtin/__tests__/helpers'
import { unmountCommand } from '@/commands/plugins/demo/unmount'
import { createDemoTree, DEMO_MOUNT_TARGET } from '@/commands/plugins/demo/tree'
import type { MountApi } from '@/fs/mount'

function mountDemo(context: ReturnType<typeof createTestContext>['context']): void {
  context.mounts.mount(DEMO_MOUNT_TARGET, createDemoTree())
}

describe('unmount command', () => {
  it('reports a target that is not mounted', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })

    unmountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'unmount: /mnt/demo 未挂载' }])
  })

  it('unmounts the demo content and leaves /mnt empty', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'] })
    mountDemo(context)

    unmountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '已卸载: /mnt/demo' }])
    expect(context.vfs.resolve('/mnt/demo').node).toBeNull()
    expect(context.vfs.readDir('/mnt')).toEqual([])
    expect(context.mounts.list()).toEqual([])
  })

  it('accepts a relative target resolved against cwd', () => {
    const { context, chunks } = createTestContext({ args: ['demo'], cwd: '/mnt' })
    mountDemo(context)

    unmountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '已卸载: /mnt/demo' }])
  })

  it('requires a target', () => {
    const { context, chunks } = createTestContext()

    unmountCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'unmount: 缺少挂载点（用法: unmount <挂载点>）',
      },
    ])
  })

  it('rejects too many arguments', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo', '/mnt/a'] })

    unmountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'unmount: 参数过多（一次只能卸载一个目录）' },
    ])
  })

  it('rejects unknown options', () => {
    const { context, chunks } = createTestContext({ options: { '-f': true } })

    unmountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: 'unmount: 不支持的选项: -f' }])
  })

  it('refuses to unmount other /mnt points', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/blog'] })

    unmountCommand.execute(context)

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'unmount: 示例插件只管理 /mnt/demo，无法卸载: /mnt/blog',
      },
    ])
  })

  it.each(['/home/guest', '/', '/tmp/x'])(
    'rejects %s as an invalid mount target',
    (target) => {
      const { context, chunks } = createTestContext({ args: [target] })

      unmountCommand.execute(context)

      expect(chunks).toEqual([
        {
          type: 'error',
          content: `unmount: 挂载点非法: ${target}（仅支持 /mnt 下的子目录）`,
        },
      ])
    },
  )

  it('rejects ~user forms', () => {
    const { context, chunks } = createTestContext({ args: ['~guest/x'] })

    unmountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'unmount: 不支持 ~user 形式: ~guest/x' },
    ])
  })

  it('reports a missing HOME', () => {
    const { context, chunks } = createTestContext({
      args: ['~'],
      env: { USER: 'guest' },
    })

    unmountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'unmount: 无法确定 home 目录（HOME 未设置）' },
    ])
  })

  it.each(['/mnt/demo', '/mnt/demo/docs'])(
    'adds a system hint when cwd is inside the unmounted target (%s)',
    (cwd) => {
      const { context, chunks } = createTestContext({ args: ['/mnt/demo'], cwd })
      mountDemo(context)

      unmountCommand.execute(context)

      expect(chunks).toEqual([
        { type: 'text', content: '已卸载: /mnt/demo' },
        {
          type: 'system',
          content: '提示：当前目录位于已卸载的挂载点内，请使用 cd 切换到其他目录。',
        },
      ])
      expect(context.cwd).toBe(cwd)
    },
  )

  it('does not add the hint when cwd is outside the target', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'], cwd: '/mnt' })
    mountDemo(context)

    unmountCommand.execute(context)

    expect(chunks).toEqual([{ type: 'text', content: '已卸载: /mnt/demo' }])
    expect(context.cwd).toBe('/mnt')
  })

  it('keeps a defensive branch for unmount failures', () => {
    const mounts: MountApi = {
      mount: () => ({ ok: false, reason: 'duplicate' }),
      unmount: () => false,
      list: () => [{ target: DEMO_MOUNT_TARGET, node: createDemoTree() }],
    }
    const { context, chunks } = createTestContext({
      args: ['/mnt/demo'],
      mounts,
    })

    unmountCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'unmount: 卸载失败: /mnt/demo' },
    ])
  })

  it('only writes text, error or system chunks', () => {
    const { context, chunks } = createTestContext({ args: ['/mnt/demo'], cwd: '/mnt/demo' })
    mountDemo(context)

    unmountCommand.execute(context)

    expect(chunks.map((chunk) => chunk.type)).toEqual(['text', 'system'])
  })
})
