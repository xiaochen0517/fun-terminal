import { describe, expect, it } from 'vitest'

import { cdCommand } from '@/commands/builtin/cd'
import { createFileSystem } from '@/fs'
import { buildTree } from '@/fs/build'

import { createTestContext } from './helpers'

const DEFAULT_ENV = { USER: 'guest', HOME: '/home/guest' }

interface SuccessCase {
  name: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  expected: string
}

const successCases: SuccessCase[] = [
  { name: '无参数回到 home', expected: '/home/guest' },
  { name: '~ 回到 home', args: ['~'], expected: '/home/guest' },
  { name: '~/.. 展开后规范化', args: ['~/..'], expected: '/home' },
  { name: '绝对路径', args: ['/mnt'], expected: '/mnt' },
  { name: '相对路径基于 cwd', args: ['guest'], cwd: '/home', expected: '/home/guest' },
  { name: '从根出发的相对路径', args: ['mnt'], cwd: '/', expected: '/mnt' },
  { name: '当前目录 .', args: ['.'], expected: '/home/guest' },
  { name: '上级目录 ..', args: ['..'], expected: '/home' },
  { name: '根越界停留根', args: ['../../..'], cwd: '/mnt', expected: '/' },
  { name: '根目录的 ..', args: ['..'], cwd: '/', expected: '/' },
  { name: '重复与结尾斜杠', args: ['////mnt/'], expected: '/mnt' },
  {
    name: '点段与尾斜杠组合',
    args: ['/mnt/../home/./guest/'],
    expected: '/home/guest',
  },
  { name: '反斜杠绝对路径', args: ['\\mnt'], expected: '/mnt' },
  { name: '空字符串等于当前目录', args: [''], expected: '/home/guest' },
  {
    name: '自定义 HOME',
    args: ['~'],
    env: { USER: 'guest', HOME: '/mnt' },
    expected: '/mnt',
  },
]

interface ErrorCase {
  name: string
  args?: string[]
  options?: Record<string, string | boolean>
  env?: Record<string, string>
  cwd?: string
  message: string
}

const MISSING_HOME_MESSAGE = 'cd: 无法确定 home 目录（HOME 未设置）'

const errorCases: ErrorCase[] = [
  { name: '目录不存在', args: ['nope'], message: 'cd: 目录不存在: nope' },
  { name: '绝对路径不存在', args: ['/mnt/nope'], message: 'cd: 目录不存在: /mnt/nope' },
  {
    name: '家目录子路径不存在（展开生效）',
    args: ['~/nope'],
    message: 'cd: 目录不存在: ~/nope',
  },
  { name: '参数过多', args: ['a', 'b'], message: 'cd: 参数过多（一次只能进入一个目录）' },
  { name: '单个不支持的选项', options: { '-P': true }, message: 'cd: 不支持的选项: -P' },
  {
    name: '多个不支持的选项',
    options: { '-L': true, '-P': true },
    message: 'cd: 不支持的选项: -L -P',
  },
  { name: 'cd -', args: ['-'], message: 'cd: 不支持 cd -（返回上一次目录）' },
  { name: '~user', args: ['~guest'], message: 'cd: 不支持 ~user 形式: ~guest' },
  {
    name: '~user 子路径',
    args: ['~guest/x'],
    message: 'cd: 不支持 ~user 形式: ~guest/x',
  },
  {
    name: 'HOME 缺失（无参数）',
    env: { USER: 'guest' },
    message: MISSING_HOME_MESSAGE,
  },
  {
    name: 'HOME 为空字符串',
    args: ['~'],
    env: { USER: 'guest', HOME: '' },
    message: MISSING_HOME_MESSAGE,
  },
]

describe('cd 命令', () => {
  it.each(successCases)('成功：$name', ({ args = [], cwd, env, expected }) => {
    const { context, chunks } = createTestContext({
      args,
      cwd: cwd ?? '/home/guest',
      env: env ?? DEFAULT_ENV,
    })

    cdCommand.execute(context)

    expect(chunks).toEqual([])
    expect(context.setCwd).toHaveBeenCalledTimes(1)
    expect(context.setCwd).toHaveBeenCalledWith(expected)
  })

  it.each(errorCases)('失败：$name', ({ args = [], options, env, cwd, message }) => {
    const { context, chunks } = createTestContext({
      args,
      ...(options ? { options } : {}),
      cwd: cwd ?? '/home/guest',
      env: env ?? DEFAULT_ENV,
    })

    cdCommand.execute(context)

    expect(chunks).toEqual([{ type: 'error', content: message }])
    expect(context.setCwd).not.toHaveBeenCalled()
  })

  it('失败：目标是文件时提示不是目录', () => {
    const fileSystem = createFileSystem()
    fileSystem.mounts.mount('/mnt/demo', buildTree({ 'notes.md': '正文' }))
    const { context, chunks } = createTestContext({
      vfs: fileSystem.vfs,
      mounts: fileSystem.mounts,
      args: ['/mnt/demo/notes.md'],
    })

    cdCommand.execute(context)

    expect(chunks).toEqual([
      { type: 'error', content: 'cd: 不是目录: /mnt/demo/notes.md' },
    ])
    expect(context.setCwd).not.toHaveBeenCalled()
  })

  it('可以进入挂载后的目录', () => {
    const fileSystem = createFileSystem()
    fileSystem.mounts.mount('/mnt/demo', buildTree({ 'notes.md': '正文' }))
    const { context, chunks } = createTestContext({
      vfs: fileSystem.vfs,
      mounts: fileSystem.mounts,
      args: ['/mnt/demo'],
    })

    cdCommand.execute(context)

    expect(chunks).toEqual([])
    expect(context.setCwd).toHaveBeenCalledWith('/mnt/demo')
  })
})
