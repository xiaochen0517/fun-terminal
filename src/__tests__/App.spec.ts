import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'

import App from '../App.vue'

describe('App', () => {
  it('mounts the terminal', () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })

    expect(wrapper.find('.terminal').exists()).toBe(true)
    expect(wrapper.text()).toContain('欢迎来到 fun-terminal')

    wrapper.unmount()
  })
})
