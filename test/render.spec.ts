import { describe, test, expect, vitest } from 'vitest'
import { render } from '../src/render'

vitest.mock('@actions/core')

describe('render', () => {
  const oldPaths = ['./sample/case1.json', './sample/case2.json']
  const newPaths = ['./sample/new.case1.json', './sample/new.case2.json']
  const title = 'compared action'

  test('table with fields', () => {
    const table = render(oldPaths, newPaths, ['fields'], title)
    expect(table).toMatchSnapshot()
  })

  test('table no fields', () => {
    const table = render(oldPaths, newPaths, [], title)
    expect(table).toMatchSnapshot()
  })
})
