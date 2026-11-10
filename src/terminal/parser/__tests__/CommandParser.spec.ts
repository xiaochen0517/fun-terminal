import { describe, expect, it } from 'vitest'

import { createCommandParser } from '@/terminal/parser/CommandParser'

const parser = createCommandParser()

describe('createCommandParser', () => {
  it('returns an empty command for blank input', () => {
    expect(parser.parse('')).toEqual({ name: '', args: [], options: {} })
    expect(parser.parse('   \t\n ')).toEqual({ name: '', args: [], options: {} })
  })

  it('parses the command name and positional arguments', () => {
    expect(parser.parse('echo hello world')).toEqual({
      name: 'echo',
      args: ['hello', 'world'],
      options: {},
    })
  })

  it('collapses consecutive whitespace', () => {
    expect(parser.parse('  ls \t  /mnt  ')).toEqual({
      name: 'ls',
      args: ['/mnt'],
      options: {},
    })
  })

  it('keeps spaces inside double quotes', () => {
    expect(parser.parse('echo "hello   world"').args).toEqual(['hello   world'])
  })

  it('keeps spaces inside single quotes', () => {
    expect(parser.parse("echo 'a  b'").args).toEqual(['a  b'])
  })

  it('does not process escapes inside single quotes', () => {
    expect(parser.parse("echo 'a\\nb'").args).toEqual(['a\\nb'])
  })

  it('escapes double quote and backslash inside double quotes', () => {
    expect(parser.parse('echo "a\\"b"').args).toEqual(['a"b'])
    expect(parser.parse('echo "a\\\\b"').args).toEqual(['a\\b'])
  })

  it('keeps other backslashes literal inside double quotes', () => {
    expect(parser.parse('echo "a\\nb"').args).toEqual(['a\\nb'])
  })

  it('joins adjacent quoted and unquoted segments', () => {
    expect(parser.parse('echo "a"b').args).toEqual(['ab'])
    expect(parser.parse(`echo 'a'"b"`).args).toEqual(['ab'])
    expect(parser.parse('echo a""b').args).toEqual(['ab'])
  })

  it('tolerates unterminated quotes', () => {
    expect(parser.parse('echo "abc').args).toEqual(['abc'])
    expect(parser.parse("echo 'abc").args).toEqual(['abc'])
  })

  it('supports empty quoted arguments', () => {
    expect(parser.parse('echo ""').args).toEqual([''])
    expect(parser.parse("echo ''").args).toEqual([''])
  })

  it('parses merged short options', () => {
    expect(parser.parse('ls -la /mnt')).toEqual({
      name: 'ls',
      args: ['/mnt'],
      options: { '-l': true, '-a': true },
    })
  })

  it('parses separated short options', () => {
    expect(parser.parse('ls -a -l /mnt').options).toEqual({ '-a': true, '-l': true })
  })

  it('parses long options with equals and space forms', () => {
    expect(parser.parse('echo --name=value').options).toEqual({ '--name': 'value' })
    expect(parser.parse('echo --name value').options).toEqual({ '--name': 'value' })
  })

  it('keeps long option values containing equals signs', () => {
    expect(parser.parse('echo --name=a=b').options).toEqual({ '--name': 'a=b' })
    expect(parser.parse('echo --name=').options).toEqual({ '--name': '' })
  })

  it('does not consume an option-like token as a long option value', () => {
    expect(parser.parse('echo --name --other').options).toEqual({
      '--name': true,
      '--other': true,
    })
    expect(parser.parse('echo --name -l').options).toEqual({
      '--name': true,
      '-l': true,
    })
  })

  it('allows quoted tokens as long option values', () => {
    expect(parser.parse('echo --name "-x"').options).toEqual({ '--name': '-x' })
    expect(parser.parse('echo --name "a b"').options).toEqual({ '--name': 'a b' })
  })

  it('treats everything after -- as positional arguments', () => {
    expect(parser.parse('echo -- --name=value').args).toEqual(['--name=value'])
    expect(parser.parse('echo -- -l --').args).toEqual(['-l', '--'])
    expect(parser.parse('echo -- --name=value').options).toEqual({})
  })

  it('never treats quoted option-like tokens as options', () => {
    expect(parser.parse('echo "--name=x"')).toEqual({
      name: 'echo',
      args: ['--name=x'],
      options: {},
    })
    expect(parser.parse('echo "-n"').args).toEqual(['-n'])
  })

  it('treats irregular dash tokens as positional arguments', () => {
    expect(parser.parse('echo -').args).toEqual(['-'])
    expect(parser.parse('echo -x=v').args).toEqual(['-x=v'])
    expect(parser.parse('echo ---x').args).toEqual(['---x'])
    expect(parser.parse('echo -.a').args).toEqual(['-.a'])
    expect(parser.parse('echo --=x').args).toEqual(['--=x'])
  })

  it('lets the last repeated option win', () => {
    expect(parser.parse('echo --name=a --name=b').options).toEqual({ '--name': 'b' })
    expect(parser.parse('echo -a -a').options).toEqual({ '-a': true })
  })

  it('always treats the first token as the command name', () => {
    expect(parser.parse('-l ls')).toEqual({ name: '-l', args: ['ls'], options: {} })
  })

  it('supports unicode arguments', () => {
    expect(parser.parse('echo 你好 世界').args).toEqual(['你好', '世界'])
    expect(parser.parse('echo "你好 世界"').args).toEqual(['你好 世界'])
  })

  it('parses a command without arguments', () => {
    expect(parser.parse('help')).toEqual({ name: 'help', args: [], options: {} })
  })
})
