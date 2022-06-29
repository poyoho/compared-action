import { describe, test, expect, vitest } from 'vitest'
import { render } from '../src/render'

vitest.mock('@actions/core')

describe('render', () => {
  test('table with fields', () => {
    const oldPaths = ['./sample/case1.json', './sample/case2.json']
    const newPaths = ['./sample/new.case1.json', './sample/new.case2.json']
    const table = render(oldPaths, newPaths, ['fields'])
    expect(table).toMatchSnapshot()
  })

  test('table no fields', () => {
    const oldPaths = ['./sample/case1.json', './sample/case2.json']
    const newPaths = ['./sample/new.case1.json', './sample/new.case2.json']
    const table = render(oldPaths, newPaths, [])
    expect(table).toMatchSnapshot()
  })
})
