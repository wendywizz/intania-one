import type {News, Person, RepairComputer} from '../models/types';

export type RootStackParamList = {
  Home: undefined;
  NewsDetail: {item: News};
  Absent: undefined;
  AbsentForm: {type: string; title: string};
  ForgetTimestamp: undefined;
  RepairComputer: {initialTab?: string} | undefined;
  RepairComputerDetail: {item: RepairComputer};
  PersonSearch: undefined;
  PersonDetail: {person: Person};
  CalendarExecutive: undefined;
  Meeting: {initialType?: string} | undefined;
};
