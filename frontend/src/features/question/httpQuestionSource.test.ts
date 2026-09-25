import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { toQuestionApiError } from './httpQuestionSource'
import { QuestionApiError } from './questionSource'

function httpError(status: number, detail: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('request failed', 'ERR', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { detail },
  })
}

describe('toQuestionApiError', () => {
  it.each([
    [404, 'not_found', 'not_found'],
    [409, 'content_version_mismatch', 'content_version_mismatch'],
    [409, 'already_submitted', 'already_submitted'],
    [422, 'invalid_submission', 'invalid_submission'],
    [422, [{ loc: ['body'], msg: 'bad' }], 'invalid_submission'],
    [404, 'Not Found', 'not_found'],
  ])('%i %j -> %s', (status, detail, code) => {
    const mapped = toQuestionApiError(httpError(status, detail))
    expect(mapped).toBeInstanceOf(QuestionApiError)
    expect((mapped as QuestionApiError).code).toBe(code)
  })

  it('leaves infrastructure errors untouched for the generic retry path', () => {
    const error = httpError(503, 'qbank_disabled')
    expect(toQuestionApiError(error)).toBe(error)
    const plain = new Error('network')
    expect(toQuestionApiError(plain)).toBe(plain)
  })
})
