import { render } from './render'
import * as core from '@actions/core'
import { context, getOctokit } from '@actions/github'
import type { GitHub } from '@actions/github/lib/utils'

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

async function cache(github: InstanceType<typeof GitHub>, oldPaths: string[]) {
  // TODO
}

function getInputAsArray(name: string, options?: core.InputOptions): string[] {
  return core
    .getInput(name, options)
    .split('\n')
    .map((s) => s.trim())
    .filter((x) => x !== '')
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
  await cache(github, oldPaths)
}
