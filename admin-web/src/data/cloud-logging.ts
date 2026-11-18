export function reservationCloudLoggingUrl(projectId: string) {
  const project = projectId.trim()
  const query = [
    '(',
    '  resource.type="cloud_function"',
    '  resource.labels.function_name="reservationCommand"',
    ') OR (',
    '  resource.type="cloud_run_revision"',
    '  resource.labels.service_name="reservationcommand"',
    ') OR jsonPayload.action=~"^reservation[.]"',
  ].join('\n')
  const destination = `https://console.cloud.google.com/logs/query;query=${encodeURIComponent(query)};duration=PT24H`
  return project ? `${destination}?project=${encodeURIComponent(project)}` : destination
}
