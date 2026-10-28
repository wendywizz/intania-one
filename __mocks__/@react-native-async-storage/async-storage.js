// Jest: the official in-memory AsyncStorage mock for every suite (needed since
// services/api.ts -> services/appHeaders.ts reads the install id, T9).
module.exports = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
