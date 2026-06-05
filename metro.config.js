const { getDefaultConfig } = require('expo/metro-config');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const {
  API_BASE_URL,
  LOCAL_URL_BASE,
  METRO_PROXY_ENDPOINTS,
  STAFF_NEWS_FEED_URL,
} = require('./constants/endpoints.ts');

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

function getAbsentRequestUrlSuffix(absentType) {
  switch (absentType) {
    case '1':
      return METRO_PROXY_ENDPOINTS.absent.leave;
    case '2':
      return METRO_PROXY_ENDPOINTS.absent.business;
    case '3':
      return METRO_PROXY_ENDPOINTS.absent.birth;
    case '4':
      return METRO_PROXY_ENDPOINTS.absent.relax;
    case '6':
      return METRO_PROXY_ENDPOINTS.absent.hajj;
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

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.absentInit)) {
        try {
          const localUrl = new URL(req.url, LOCAL_URL_BASE);
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

      if (req.url?.startsWith(METRO_PROXY_ENDPOINTS.routes.absentHistory)) {
        try {
          const localUrl = new URL(req.url, LOCAL_URL_BASE);
          const staffId = localUrl.searchParams.get('staff_id') ?? '';
          const start = localUrl.searchParams.get('start') ?? '0';
          const length = localUrl.searchParams.get('length') ?? '10';
          const phoenixUrl = new URL(METRO_PROXY_ENDPOINTS.absent.history, API_BASE_URL);

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

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
