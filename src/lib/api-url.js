const API_PREFIX = '/api';

function buildApiUrl(baseUrl, path) {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
  const apiBaseUrl = normalizedBaseUrl.endsWith(API_PREFIX)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}${API_PREFIX}`;

  return `${apiBaseUrl}${normalizedPath}`;
}

module.exports = { buildApiUrl };
