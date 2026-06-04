const DEVELOPMENT_API_BASE_URL = 'http://localhost:1337';
const PRODUCTION_API_BASE_URL = 'https://saas.eng.psu.ac.th';

export const API_MODE = process.env.EXPO_PUBLIC_MODE ?? 'development';

export const API_BASE_URL =
  API_MODE === 'production' ? PRODUCTION_API_BASE_URL : DEVELOPMENT_API_BASE_URL;
