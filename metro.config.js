const { getDefaultConfig } = require('expo/metro-config');
const { XMLParser } = require('fast-xml-parser');
const crypto = require('node:crypto');
const https = require('node:https');

const config = getDefaultConfig(__dirname);
const parser = new XMLParser({ ignoreAttributes: false });
const STAFF_NEWS_FEED =
  'https://www.eng.psu.ac.th/index.php?option=com_content&view=category&id=15&format=feed&type=rss';
const PHOENIX_URL = 'phoenix.eng.psu.ac.th';

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

function fetchTextWithLegacyTls(url, headers) {
  const agent = new https.Agent({
    ciphers: 'DEFAULT@SECLEVEL=0',
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  });

  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent, headers }, (response) => {
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
          const phoenixUrl = new URL(`https://${PHOENIX_URL}${suffixUrl}init/`);

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

      return middleware(req, res, next);
    };
  },
};

module.exports = config;
