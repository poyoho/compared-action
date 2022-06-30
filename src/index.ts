import * as core from '@actions/core'
import { getOctokit } from '@actions/github'
import {
  getInputAsArray,
  comment,
  restoreFiles,
  cacheFiles,
  getInputAsInt
} from './action'
import { render } from './render'

function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}

async function action() {
  const token = core.getInput('token', { required: true })
  const oldPaths = getInputAsArray('old-paths', { required: true })
  const newPaths = getInputAsArray('new-paths', { required: true })
  const fields = getInputAsArray('fields')
  const title = core.getInput('title')
  const needCache = core.getBooleanInput('need-cache')
  const uploadChunkSize = getInputAsInt('upload-chunk-size')
  const github = getOctokit(token)

  if (oldPaths.length !== newPaths.length) {
    throw new Error('input old-paths, new-paths should had the same length')
  }

  core.info('input: ')
  core.info(`old-paths: ${oldPaths}`)
  core.info(`new-paths: ${newPaths}`)
  core.info(`fields: ${fields}`)
  core.info(`title: ${title}`)
  core.info(`force-cache: ${needCache}`)
  core.info(`upload-chunk-size: ${uploadChunkSize}`)

  // use the cache overwrite the oldPaths if had the cache
  await restoreFiles(title, oldPaths)
  await comment(github, render(oldPaths, newPaths, fields, title))
  // cache the oldPaths if not had the cache or config force cache
  if (needCache) {
    await cacheFiles(title, oldPaths, { uploadChunkSize })
  }
}

process.on('unhandledRejection', handleError)
action().catch(handleError)
