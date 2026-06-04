const { getDefaultConfig } = require('expo/metro-config');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');

const config = getDefaultConfig(__dirname);
const parser = new XMLParser({ ignoreAttributes: false });
const API_BASE_URL = 'http://localhost:1337';
const STAFF_NEWS_FEED = 'https://www.eng.psu.ac.th/index.php?option=com_content&view=category&id=15&format=feed&type=rss';
const OPENID_DISCOVERY_URL = `${API_BASE_URL}/application/o/coe-mobile-app/.well-known/openid-configuration`;

function parseNewsFeed(xml) {
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return list.map((item) => ({
    title: item.title ?? '',
    link: item.link ?? '',
    guid: item.guid ?? '',
    description: item.description ?? '',
    category: item.category ?? '',
    pubDate: item.pubDate ?? '',
  }));
}

function getAbsentRequestUrlSuffix(absentType) {
  switch (absentType) {
    case '1':
      return '/personnel/apis/absent/leave/';
    case '2':
      return '/personnel/apis/absent/business/';
    case '3':
      return '/personnel/apis/absent/birth/';
    case '4':
      return '/personnel/apis/absent/relax/';
    case '6':
      return '/personnel/apis/absent/hajj/';
    default:
      return '';
  }
}

function writeJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function fetchTextWithLegacyTls(url, headers) {
  const targetUrl = new URL(url);
  const client = targetUrl.protocol === 'http:' ? http : https;
  const agent = new https.Agent({
    ciphers: 'DEFAULT@SECLEVEL=0',
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  });

  return new Promise((resolve, reject) => {
    const request = client.get(targetUrl, { agent: client === https ? agent : undefined, headers }, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({
          body,
          statusCode: response.statusCode ?? 500,
        });
      });
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'));
    });
  });
}

function requestTextWithLegacyTls(url, options = {}) {
  const targetUrl = new URL(url);
  const client = targetUrl.protocol === 'http:' ? http : https;
  const agent = new https.Agent({
    ciphers: 'DEFAULT@SECLEVEL=0',
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  });

  return new Promise((resolve, reject) => {
    const request = client.request(
      targetUrl,
      {
        agent: client === https ? agent : undefined,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (response) => {
        let body = '';

        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({
            body,
            headers: response.headers,
            statusCode: response.statusCode ?? 500,
          });
        });
      },
    );

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error('Unable to connect to server'));
    });

    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return async (req, res, next) => {
      if (req.method === 'OPTIONS' && req.url?.startsWith('/api/openid/')) {
        setCorsHeaders(res);
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.url?.startsWith('/api/openid/discovery')) {
        try {
          const response = await requestTextWithLegacyTls(OPENID_DISCOVERY_URL);

          setCorsHeaders(res);
          res.statusCode = response.statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({}));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/openid/token')) {
        try {
          const discoveryResponse = await requestTextWithLegacyTls(OPENID_DISCOVERY_URL);
          const discovery = JSON.parse(discoveryResponse.body || '{}');
          const tokenEndpoint = discovery.token_endpoint || `${API_BASE_URL}/application/o/token/`;
          const body = await readRequestBody(req);
          const response = await requestTextWithLegacyTls(tokenEndpoint, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(body),
            },
            body,
          });

          setCorsHeaders(res);
          res.statusCode = response.statusCode;
          res.setHeader('Content-Type', response.headers['content-type'] || 'application/json');
          res.end(response.body || JSON.stringify({}));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/openid/userinfo')) {
        try {
          const discoveryResponse = await requestTextWithLegacyTls(OPENID_DISCOVERY_URL);
          const discovery = JSON.parse(discoveryResponse.body || '{}');
          const userInfoEndpoint = discovery.userinfo_endpoint || `${API_BASE_URL}/application/o/userinfo/`;
          const response = await requestTextWithLegacyTls(userInfoEndpoint, {
            headers: {
              Accept: 'application/json',
              Authorization: req.headers.authorization || '',
            },
          });

          setCorsHeaders(res);
          res.statusCode = response.statusCode;
          res.setHeader('Content-Type', response.headers['content-type'] || 'application/json');
          res.end(response.body || JSON.stringify({}));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/staff-news-feed')) {
        try {
          const response = await fetchTextWithLegacyTls(STAFF_NEWS_FEED);
          const news = parseNewsFeed(response.body);

          writeJson(res, response.statusCode, news);
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/absent/init')) {
        try {
          const localUrl = new URL(req.url, 'http://localhost');
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const absentType = localUrl.searchParams.get('absent_type') ?? '';
          const suffixUrl = getAbsentRequestUrlSuffix(absentType);
          const phoenixUrl = new URL(`${suffixUrl}init/`, API_BASE_URL);

          phoenixUrl.searchParams.set('staff_id', staffId);

          const response = await fetchTextWithLegacyTls(phoenixUrl.toString(), {
              'Content-Type': 'application/json',
          });

          res.statusCode = response.statusCode;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({ message: 'ไม่พบข้อมูลจากเซิร์ฟเวอร์' }));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/absent/history')) {
        try {
          const localUrl = new URL(req.url, 'http://localhost');
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const start = localUrl.searchParams.get('start') ?? '0';
          const length = localUrl.searchParams.get('length') ?? '10';
          const phoenixUrl = new URL('/personnel/apis/absent/history', API_BASE_URL);

          phoenixUrl.searchParams.set('staff_id', staffId);
          phoenixUrl.searchParams.set('start', start);
          phoenixUrl.searchParams.set('length', length);

          const response = await fetchTextWithLegacyTls(phoenixUrl.toString(), {
            'Content-Type': 'application/json',
          });

          res.statusCode = response.statusCode;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({ data: [] }));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/meeting/list')) {
        try {
          const localUrl = new URL(req.url, 'http://localhost');
          const userId = localUrl.searchParams.get('user_id') ?? '';
          const type = localUrl.searchParams.get('type') ?? '';
          const phoenixUrl = new URL('/meetingv2/api/index.php/meeting/list', API_BASE_URL);

          phoenixUrl.searchParams.set('user_id', userId);
          phoenixUrl.searchParams.set('type', type);

          const response = await fetchTextWithLegacyTls(phoenixUrl.toString(), {
            'Content-Type': 'application/json',
          });

          res.statusCode = response.statusCode;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({ message: 'No data returned from server' }));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith('/api/repair-computer/privilege')) {
        try {
          const localUrl = new URL(req.url, 'http://localhost');
          const appId = localUrl.searchParams.get('app_id') ?? '';
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const inforUrl = new URL('/repairComputer/api/privilege', API_BASE_URL);

          inforUrl.searchParams.set('app_id', appId);
          inforUrl.searchParams.set('staff_id', staffId);

          const response = await fetchTextWithLegacyTls(inforUrl.toString(), {
            'Content-Type': 'application/json',
            Authorization: '',
          });

          res.statusCode = response.statusCode;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({ data: '' }));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
