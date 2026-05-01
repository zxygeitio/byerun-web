export class ApiBusinessError extends Error {
  constructor(envelope) {
    super(envelope?.message || `API business error: ${envelope?.code}`);
    this.name = 'ApiBusinessError';
    this.envelope = envelope;
  }
}

export class AutorunClient {
  /**
   * @param {{ baseURL: string, headers?: Record<string, string>, fetchImpl?: typeof fetch, timeoutMs?: number }} options
   */
  constructor(options) {
    this.baseURL = options.baseURL.replace(/\/+$/, '');
    this.headers = options.headers || {};
    this.timeoutMs = Number(options.timeoutMs || 8000);
    const rawFetch = options.fetchImpl || globalThis.fetch;
    this.fetchImpl = (...args) => rawFetch.call(globalThis, ...args);
  }

  ping(requestId) {
    return this.request('/ping', { method: 'GET' }, requestId);
  }

  getMaps(requestId) {
    return this.request('/api/maps', { method: 'GET' }, requestId);
  }

  login(body, requestId) {
    return this.request('/api/login', { method: 'POST', body: JSON.stringify(body) }, requestId);
  }

  register(token, body, requestId) {
    return this.request(
      '/api/register',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify(body) },
      requestId,
    );
  }

  getConfig(token, requestId) {
    return this.request(
      '/api/config',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify({}) },
      requestId,
    );
  }

  getStatus(token, requestId) {
    return this.request(
      '/api/status',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify({}) },
      requestId,
    );
  }

  setClubAutoConfig(token, body, requestId) {
    return this.request(
      '/api/club/config',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify(body) },
      requestId,
    );
  }

  getClubAutoStatus(token, requestId) {
    return this.request(
      '/api/club/status',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify({}) },
      requestId,
    );
  }

  triggerClubAuto(token, requestId) {
    return this.request(
      '/api/club/trigger',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify({}) },
      requestId,
    );
  }

  rushClub(token, body, requestId) {
    return this.request(
      '/api/club/rush',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify(body) },
      requestId,
    );
  }

  getClubRushStatus(token, requestId) {
    return this.request(
      '/api/club/rush/status',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify({}) },
      requestId,
    );
  }

  cancelClubRush(token, body, requestId) {
    return this.request(
      '/api/club/rush/cancel',
      { method: 'POST', headers: this.authHeaders(token), body: JSON.stringify(body) },
      requestId,
    );
  }

  getRandom(token, query = {}, requestId) {
    const params = new URLSearchParams();
    const mapId = String(query?.map_id ?? '').trim();
    const mapIdCompat = String(query?.mapid ?? '').trim();
    if (mapId) params.set('map_id', mapId);
    if (!mapId && mapIdCompat) params.set('mapid', mapIdCompat);

    const suffix = params.toString();
    const path = suffix ? `/api/random?${suffix}` : '/api/random';

    return this.request(path, { method: 'GET', headers: this.authHeaders(token) }, requestId);
  }

  authHeaders(token) {
    return { Authorization: `Bearer ${token}` };
  }

  async request(path, init, requestId) {
    const hasBody = init.body !== undefined && init.body !== null;
    const headers = {
      ...this.headers,
      ...(init.headers || {}),
    };
    if (hasBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (requestId) {
      headers['X-Request-Id'] = requestId;
    }

    const controller =
      typeof AbortController !== 'undefined' && this.timeoutMs > 0 ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : null;

    let resp;
    try {
      resp = await this.fetchImpl(`${this.baseURL}${path}`, {
        ...init,
        headers,
        signal: controller?.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Scheduled task service request timed out');
      }
      throw new Error(error?.message || 'Scheduled task service is unavailable');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!resp.ok) {
      throw new Error(`HTTP error: ${resp.status}`);
    }

    const envelope = await resp.json();
    if (!envelope.success) {
      throw new ApiBusinessError(envelope);
    }
    return envelope;
  }

}
