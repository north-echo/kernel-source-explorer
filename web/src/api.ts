export async function api<T>(path: string, dataset?: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/' + path, {headers: dataset ? {'X-KSE-Dataset': dataset} : {}, signal});
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json();
}
