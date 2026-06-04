import { API_BASE_URL } from './apiConfig';

// Centralized single API host (scooba-service). All requests should go through
// this host — do not split into separate infor/phoenix hosts.
// EXPO_PUBLIC_MODE=development uses localhost:1337; production uses saas.eng.psu.ac.th.
export const ENDPOINTS = {
  // Primary API host for the client (scooba-service).
  scooba: API_BASE_URL,
  scooba_dev: API_BASE_URL,

  // Scooba-service fetches and parses the RSS feed.
  staffNewsFeed: `${API_BASE_URL}/api/news`,
  forgotTimestamp: `${API_BASE_URL}/api/forget_timestamp`,
  absent: `${API_BASE_URL}/api/absent`,
  repairComputer: `${API_BASE_URL}/repairComputer/api`,
  person: `${API_BASE_URL}/personnel`,
  meeting: `${API_BASE_URL}/api/meeting`,
  photoBase: `${API_BASE_URL}/personnel/v1/photo/`,
};
