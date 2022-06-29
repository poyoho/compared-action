import * as core from '@actions/core'
import { action } from "./github"

function handleError(err: any): void {
  console.error(err)
  core.setFailed(`Unhandled error: ${err}`)
}

process.on('unhandledRejection', handleError)
action().catch(handleError)
