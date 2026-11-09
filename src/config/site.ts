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
    /** 命令层尚未接入时的临时提示 */
    commandUnavailable: string
  }
}

export const siteConfig: SiteConfig = {
  username: 'guest',
  hostname: 'fun-terminal',
  homeDir: '/home/guest',
  messages: {
    welcome: [
      '欢迎来到 fun-terminal —— 一个以终端为入口的个人站点。',
      '当前为终端外壳预览：支持命令回显、历史浏览与 clear 清屏。',
    ],
    commandUnavailable: '命令系统将在下一里程碑接入，当前仅支持 clear 清屏。',
  },
}
