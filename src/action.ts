import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { context } from '@actions/github'
import type { GitHub } from '@actions/github/lib/utils'

export function getInputAsInt(
  name: string,
  options?: core.InputOptions
): number | undefined {
  const value = parseInt(core.getInput(name, options))
  if (isNaN(value) || value < 0) {
    return undefined
  }
  return value
}

export function getInputAsArray(
  name: string,
  options?: core.InputOptions
): string[] {
  return core
    .getInput(name, options)
    .split('\n')
    .map((s) => s.trim())
    .filter((x) => x !== '')
}

function logWarning(message: string): void {
  const warningPrefix = '[warning]'
  core.info(`${warningPrefix}${message}`)
}

function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  )
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM'
}

// Cache token authorized for all events that are tied to a ref
// See GitHub Context https://help.github.com/actions/automating-your-workflow-with-github-actions/contexts-and-expression-syntax-for-github-actions#github-context
function isValidEvent(): boolean {
  return 'GITHUB_REF' in process.env && Boolean(process.env['GITHUB_REF'])
}

function isExactKeyMatch(key: string, cacheKey?: string): boolean {
  return !!(
    cacheKey &&
    cacheKey.localeCompare(key, undefined, {
      sensitivity: 'accent'
    }) === 0
  )
}

function setCacheState(state: string): void {
  core.saveState('COMPARED_CACHE_RESULT', state)
}

function getCacheState(): string | undefined {
  const cacheKey = core.getState('COMPARED_CACHE_RESULT')
  if (cacheKey) {
    core.debug(`Cache state/key: ${cacheKey}`)
    return cacheKey
  }

  return undefined
}

function isCacheFeatureAvailable(): boolean {
  if (!cache.isFeatureAvailable()) {
    if (isGhes()) {
      logWarning(
        'Cache action is only supported on GHES version >= 3.5. If you are on version >=3.5 Please check with GHES admin if Actions cache service is enabled or not.'
      )
    } else {
      logWarning(
        'An internal error has occurred in cache backend. Please check https://www.githubstatus.com/ for any ongoing issue in actions.'
      )
    }
    return false
  }
  return true
}

export async function comment(
  github: InstanceType<typeof GitHub>,
  body: string
) {
  if (!isValidEvent()) {
    logWarning(
      `Event Validation Error: The event type ${process.env.GITHUB_EVENT_NAME} is not supported because it's not tied to a branch or tag ref.`
    )
    return
  }
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

export async function restoreFiles(primaryKey: string, cachePaths: string[]) {
  try {
    if (!isCacheFeatureAvailable()) {
      return
    }

    // Validate inputs, this can cause task failure
    if (!isValidEvent()) {
      logWarning(
        `Event Validation Error: The event type ${process.env.GITHUB_EVENT_NAME} is not supported because it's not tied to a branch or tag ref.`
      )
      return
    }

    try {
      const cacheKey = await cache.restoreCache(cachePaths, primaryKey)
      if (!cacheKey) {
        core.info(`Cache not found for input keys: ${primaryKey}`)
        return
      }

      setCacheState(cacheKey)
      core.info(`Cache restored from key: ${cacheKey}`)
      core.info(`Cache restored from path: ${cachePaths.join(', ')}`)
    } catch (error: unknown) {
      const typedError = error as Error
      if (typedError.name === cache.ValidationError.name) {
        throw error
      } else {
        logWarning(typedError.message)
      }
    }
  } catch (error: unknown) {
    core.setFailed((error as Error).message)
  }
}

export async function cacheFiles(primaryKey: string, cachePaths: string[], opts: {
  force?: boolean,
  uploadChunkSize?: number
}) {
  try {
    if (!isCacheFeatureAvailable()) {
      return
    }

    if (!isValidEvent()) {
      logWarning(
        `Event Validation Error: The event type ${process.env.GITHUB_EVENT_NAME} is not supported because it's not tied to a branch or tag ref.`
      )
      return
    }

    if (!opts?.force) {
      const state = getCacheState()
      if (isExactKeyMatch(primaryKey, state)) {
        core.info(
          `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
        )
        return
      }
    }

    try {
      await cache.saveCache(cachePaths, primaryKey, {
        uploadChunkSize: opts?.uploadChunkSize
      })
      core.info(`Cache saved with key: ${primaryKey}`)
      core.info(`Cache saved with path: ${cachePaths.join(', ')}`)
    } catch (error: unknown) {
      const typedError = error as Error
      if (typedError.name === cache.ValidationError.name) {
        throw error
      } else if (typedError.name === cache.ReserveCacheError.name) {
        core.info(typedError.message)
      } else {
        logWarning(typedError.message)
      }
    }
  } catch (error: unknown) {
    logWarning((error as Error).message)
  }
}
