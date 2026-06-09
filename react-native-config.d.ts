declare module 'react-native-config' {
  interface ConfigType {
    [key: string]: string | undefined;
  }

  const Config: ConfigType;
  export default Config;
}
