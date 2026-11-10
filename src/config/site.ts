export interface SiteConfig {
  /** 提示符左侧的用户名 */
  username: string
  /** 提示符左侧的主机名 */
  hostname: string
  /** 虚拟 home 目录，必须是 POSIX 绝对路径且不以 / 结尾 */
  homeDir: string
  messages: {
    /** 冷启动欢迎语，每条渲染为一个 system 输出块 */
    welcome: readonly string[]
  }
}

export const siteConfig: SiteConfig = {
  username: 'guest',
  hostname: 'fun-terminal',
  homeDir: '/home/guest',
  messages: {
    welcome: [
      '欢迎来到 fun-terminal —— 一个以终端为入口的个人站点。',
      '输入 help 查看可用命令。',
    ],
  },
}
