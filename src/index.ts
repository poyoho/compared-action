import * as core from '@actions/core'
import { getOctokit } from '@actions/github'
import { getInputAsArray, comment } from './action'
import { render } from "./render"

function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}

async function action() {
  const token = core.getInput('token', { required: true })
  const oldPaths = getInputAsArray('old-paths', { required: true })
  const newPaths = getInputAsArray('new-paths', { required: true })
  const fields = getInputAsArray('fields')
  const github = getOctokit(token)

  if (oldPaths.length !== newPaths.length) {
    throw new Error('input old-paths, new-paths should had the same length')
  }

  await comment(github, render(oldPaths, newPaths, fields))
  // await cache(github, oldPaths)
}

process.on('unhandledRejection', handleError)
action().catch(handleError)
