import pkg from '../../package.json'

export interface SiteConfig {
  /** 提示符左侧的用户名 */
  username: string
  /** 提示符左侧的主机名 */
  hostname: string
  /** 虚拟 home 目录，必须是 POSIX 绝对路径且不以 / 结尾 */
  homeDir: string
  /** 站点版本号：banner 与 help 头部共用，唯一来源为 package.json */
  version: string
  /** 页面标题（document.title 与 index.html 回退保持一致） */
  title: string
  /** 冷启动横幅：纯 ASCII、单行 ≤ 40 字符、等宽对齐 */
  banner: readonly string[]
  messages: {
    /** 冷启动欢迎语，每条渲染为一个 system 输出块 */
    welcome: readonly string[]
  }
}

const hostname = 'fun-terminal'
const version = pkg.version

/** 生成等宽居中的 ASCII 横幅（纯 ASCII、单行 ≤ 40 字符，Just for fun） */
function buildBanner(host: string, ver: string): readonly string[] {
  const width = 34
  const border = `+${'-'.repeat(width + 2)}+`
  const centered = (text: string): string => {
    const total = width - text.length
    const left = Math.floor(total / 2)
    return `| ${' '.repeat(left)}${text}${' '.repeat(total - left)} |`
  }
  return [border, centered(host), centered(`v${ver}`), border]
}

export const siteConfig: SiteConfig = {
  username: 'guest',
  hostname,
  homeDir: '/home/guest',
  version,
  title: 'fun-terminal',
  banner: buildBanner(hostname, version),
  messages: {
    welcome: [
      '欢迎来到 fun-terminal —— 一个以终端为入口的个人站点。',
      '输入 help 查看可用命令。',
    ],
  },
}
