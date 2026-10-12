const textOf = (result) => `${result?.stderr ?? ''}\n${result?.stdout ?? ''}`

export function classifyFailure(result = {}, operation = 'operation') {
  const text = textOf(result)
  if (result.timedOut === true || /timed? ?out|ETIMEDOUT/i.test(text)) {
    return { code: 'TIMEOUT', fixableByModel: true, retryable: true, hint: `Reduce ${operation} complexity or retry with a longer timeout.` }
  }
  if (/HTTP\s*(401|403)|unauthorized|forbidden|invalid.*api.?key/i.test(text)) {
    return { code: 'AUTH_REQUIRED', fixableByModel: false, retryable: false, hint: 'The user must configure or refresh the external-service credential.' }
  }
  if (/HTTP\s*429|rate.?limit|too many requests/i.test(text)) {
    return { code: 'RATE_LIMITED', fixableByModel: true, retryable: true, hint: 'Back off, then retry or use the configured fallback.' }
  }
  if (/ENOSPC|out of memory|ENOMEM|resource.*limit/i.test(text)) {
    return { code: 'RESOURCE_LIMIT', fixableByModel: true, retryable: true, hint: 'Reduce model complexity, polygon count, resolution, or output size.' }
  }
  if (/EINVAL|validation|invalid (input|parameter)|schema/i.test(text)) {
    return { code: 'INVALID_INPUT', fixableByModel: true, retryable: true, hint: 'Correct the parameters according to the tool schema before retrying.' }
  }
  if (/EPERM|EACCES|not permitted|permission denied/i.test(text)) {
    return { code: 'ENV_PERMISSION', fixableByModel: false, retryable: false, hint: 'The runtime or sandbox must be reconfigured by the user.' }
  }
  if (/ENOENT|not found|no such file or directory/i.test(text)) {
    return { code: 'ENV_NOT_FOUND', fixableByModel: false, retryable: false, hint: 'A required executable, file, or runtime is missing.' }
  }
  return { code: 'EXECUTION_FAILED', fixableByModel: false, retryable: false, hint: `Inspect ${operation} stderr and preserve it in the trace.` }
}

export const toolError = (message, classification, details = {}) => ({
  isError: true,
  content: [{ type: 'text', text: message }],
  details: { ...classification, ...details },
})
