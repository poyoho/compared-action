import * as path from 'path'
import * as fs from 'fs'
import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import { formatComment } from './render'
import type { GitHub } from '@actions/github/lib/utils'
import type { Records } from './render'

async function comment(github: InstanceType<typeof GitHub>, body: string) {
  const comment = {
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body
  }
  let commentId: number | null = null
  const comments = (
    await github.rest.issues.listComments({
      ...context.repo,
      issue_number: context.issue.number
    })
  ).data
  for (const c of comments) {
    if (c.user?.type === 'Bot' && c.body?.includes('<!--report-->')) {
      commentId = c.id
      break
    }
  }
  if (commentId) {
    await github.rest.issues.updateComment({
      comment_id: commentId,
      ...comment
    })
  } else {
    await github.rest.issues.createComment(comment)
  }
}

function loadJSONFile(path: string) {
  return JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }))
}

export function render(
  oldPaths: string[],
  newPaths: string[],
  fields: string[]
): string {
  return [
    '<!--report-->',
    '## 🏆 compress report',
    oldPaths
      .map((oldPath, idx) => ({
        name: path.basename(oldPath).replace('.json', ''),
        o: loadJSONFile(path.resolve(oldPath)) as Records,
        n: loadJSONFile(path.resolve(newPaths[idx])) as Records
      }))
      .map((info) =>
        [
          `\n### ${info.name}\n`,
          formatComment(info.o, info.n, fields),
          '\n'
        ].join('\n')
      )
      .join('\n')
  ].join('\n')
}

function getInputAsArray(
  name: string,
  options?: core.InputOptions
): string[] {
  return core
    .getInput(name, options)
    .split("\n")
    .map(s => s.trim())
    .filter(x => x !== "");
}

export async function action() {
  const token = core.getInput('token', { required: true })
  const oldPaths = getInputAsArray('old-paths', { required: true })
  const newPaths = getInputAsArray('new-paths', { required: true })
  const fields = getInputAsArray('fields')
  const github = getOctokit(token)

  if (oldPaths.length !== newPaths.length) {
    throw new Error('input old-paths, new-paths should had the same length')
  }

  await comment(github, render(oldPaths, newPaths, fields))
}
