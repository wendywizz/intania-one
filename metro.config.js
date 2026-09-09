const { getDefaultConfig } = require('expo/metro-config');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');

const EXPO_OS = process.env.EXPO_OS ?? '';
const APP_MODE = process.env.EXPO_PUBLIC_MODE ?? 'development';

const API_DOMAINS = {
  development: 'http://localhost:1337',
  production: 'https://apis.eng.psu.ac.th/scooba',
};

const AUTH_REDIRECT_DOMAINS = {
  development: 'http://localhost:8081',
  native: process.env.EXPO_PUBLIC_AUTH_NATIVE_REDIRECT_DOMAIN || 'th.ac.psu.eng.scooba',
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (APP_MODE === 'production'
    ? API_DOMAINS.production
    : EXPO_OS === 'android'
    ? 'http://10.0.2.2:1337'
    : API_DOMAINS.development);

const LOCAL_URL_BASE = 'http://localhost';
const OPENID_BASE_URL = 'https://psusso.psu.ac.th';
const OPENID_TOKEN_URL = `${OPENID_BASE_URL}/application/o/token/`;
const OPENID_USERINFO_URL = `${OPENID_BASE_URL}/application/o/userinfo/`;
const STAFF_NEWS_FEED_URL =
  'https://www.eng.psu.ac.th/index.php?option=com_content&view=category&id=15&format=feed&type=rss';

const METRO_PROXY_ENDPOINTS = {
  routes: {
    staffNewsFeed: '/api/staff-news-feed',
    absenceInit: '/api/absence/init',
    absenceHistory: '/api/absence/history',
    meetingList: '/api/meeting/list',
    repairComputerPrivilege: '/api/repair-computer/privilege',
    openIdToken: '/api/openid/token',
    openIdUserInfo: '/api/openid/userinfo',
  },
  absence: {
    leave: '/personnel/apis/absence/leave/',
    business: '/personnel/apis/absence/business/',
    birth: '/personnel/apis/absence/birth/',
    relax: '/personnel/apis/absence/relax/',
    hajj: '/personnel/apis/absence/hajj/',
    history: '/personnel/apis/absence/history',
  },
  meeting: {
    list: '/meetingv2/api/index.php/meeting/list',
  },
  repairComputer: {
    privilege: '/repairComputer/api/privilege',
  },
};

const config = getDefaultConfig(__dirname);
const parser = new XMLParser({ ignoreAttributes: false });

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

function getabsenceRequestUrlSuffix(absenceType) {
  switch (absenceType) {
    case '1':
      return METRO_PROXY_ENDPOINTS.absence.leave;
    case '2':
      return METRO_PROXY_ENDPOINTS.absence.business;
    case '3':
      return METRO_PROXY_ENDPOINTS.absence.birth;
    case '4':
      return METRO_PROXY_ENDPOINTS.absence.relax;
    case '6':
      return METRO_PROXY_ENDPOINTS.absence.hajj;
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

function postTextWithLegacyTls(url, headers, body) {
  const targetUrl = new URL(url);
  const client = targetUrl.protocol === 'http:' ? http : https;
  const agent = new https.Agent({
    ciphers: 'DEFAULT@SECLEVEL=0',
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  });

  return new Promise((resolve, reject) => {
    const request = client.request(targetUrl, {
      method: 'POST',
      agent: client === https ? agent : undefined,
      headers,
    }, (response) => {
      let responseBody = '';

      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        resolve({
          body: responseBody,
          statusCode: response.statusCode ?? 500,
        });
      });
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error('Unable to connect to OpenID server'));
    });
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return async (req, res, next) => {
      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.staffNewsFeed)) {
        try {
          const response = await fetchTextWithLegacyTls(STAFF_NEWS_FEED_URL);
          const news = parseNewsFeed(response.body);

          writeJson(res, response.statusCode, news);
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.absenceInit)) {
        try {
          const localUrl = new URL(req.url, LOCAL_URL_BASE);
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const absenceType = localUrl.searchParams.get('ABSENCE_type') ?? '';
          const suffixUrl = getabsenceRequestUrlSuffix(absenceType);
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

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.absenceHistory)) {
        try {
          const localUrl = new URL(req.url, LOCAL_URL_BASE);
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const start = localUrl.searchParams.get('start') ?? '0';
          const length = localUrl.searchParams.get('length') ?? '10';
          const phoenixUrl = new URL(METRO_PROXY_ENDPOINTS.absence.history, API_BASE_URL);

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

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.meetingList)) {
        try {
          const localUrl = new URL(req.url, LOCAL_URL_BASE);
          const userId = localUrl.searchParams.get('user_id') ?? '';
          const type = localUrl.searchParams.get('type') ?? '';
          const phoenixUrl = new URL(METRO_PROXY_ENDPOINTS.meeting.list, API_BASE_URL);

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

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.repairComputerPrivilege)) {
        try {
          const localUrl = new URL(req.url, LOCAL_URL_BASE);
          const appId = localUrl.searchParams.get('app_id') ?? '';
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const inforUrl = new URL(METRO_PROXY_ENDPOINTS.repairComputer.privilege, API_BASE_URL);

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

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.openIdToken)) {
        try {
          const body = await readRequestBody(req);
          const response = await postTextWithLegacyTls(OPENID_TOKEN_URL, {
            Accept: 'application/json',
            'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
          }, body);

          res.statusCode = response.statusCode;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({ message: 'No data returned from OpenID server' }));
        } catch (error) {
          writeJson(res, 500, {
            message: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.openIdUserInfo)) {
        try {
          const response = await fetchTextWithLegacyTls(OPENID_USERINFO_URL, {
            Accept: 'application/json',
            Authorization: req.headers.authorization || '',
          });

          res.statusCode = response.statusCode;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');
          res.end(response.body || JSON.stringify({ message: 'No data returned from OpenID server' }));
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

// Allow Metro to process .mjs ESM files (required by lucide-react-native)
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// lucide-react-native only declares "." and "./icons" in its package "exports",
// so the per-icon deep imports in components/ui/icon-symbol.tsx (used to avoid
// Metro queuing 1000+ .mjs barrel files) trip a package-exports warning and fall
// back to file-based resolution. Rather than disabling package exports globally
// (which reverts every dependency to legacy resolution and can break other SDK 54
// packages), bypass exports resolution only for lucide's deep icon imports.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('lucide-react-native/dist/')) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform,
    );
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
