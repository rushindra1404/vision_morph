import axios from 'axios'

export function getBackendUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL
  if (envUrl && envUrl.trim().length > 0) return envUrl.replace(/\/$/, '')
  return ''
}

export async function postDepthEstimation({ file, mode }) {
  const backend = getBackendUrl()
  const url = backend ? `${backend}/api/depth` : '/api/depth'
  const form = new FormData()
  form.append('image', file)
  if (mode) form.append('mode', mode)

  const response = await axios.post(url, form, {
    responseType: 'json',
    headers: { 'Accept': 'application/json' },
    onUploadProgress: () => {},
    timeout: 120000,
  })

  return response.data
}


