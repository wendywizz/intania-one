const String rootRoute = "/";

const String newsDetailRoute = "/news-detail";

const String absentRoute = "${rootRoute}absent";
const String absentNewRoute = "$absentRoute/new";
const String absentLeaveRoute = "$absentRoute/sick";
const String absentBusinessRoute = "$absentRoute/business";
const String absentRelaxRoute = "$absentRoute/relax";
const String absentBirthRoute = "$absentRoute/birth";
const String absentHajjRoute = "$absentRoute/hajj";
const String absentViewRoute = "$rootRoute/view";

const String forgetTimestampRoute = "${rootRoute}forget-timestamp";

const String rcRoute = "${rootRoute}repair-computer";
const String rcUserCurrentRoute = "$rcRoute/user/current";
const String rcUserQueueRoute = "$rcRoute/user/queue";
const String rcUserHistoryRoute = "$rcRoute/user/history";
const String rcUserViewRoute = "$rcRoute/user/view";
const String rcForemanAssignRoute = "$rcRoute/fman/assign";
const String rcForemanManageRoute = "$rcRoute/fman/current";
const String rcForemanSupply = "$rcRoute/fman/supply";
const String rcForemanHistory = "$rcRoute/fman/history";
const String rcForemanViewJob = "$rcRoute/fman/view";

const String personSearchRoute = "${rootRoute}person-search";
const String personDetailRoute = "$personSearchRoute/person-detail";

const String calendarExecutiveRoute = "$rootRoute/calendar-executive";

const String meetingRoute = "$rootRoute/meeting";
const String meetingTodayRoute = "$meetingRoute/today";
const String meetingIncomingRoute = "$meetingRoute/incoming";
const String meetingHistoryRoute = "$meetingRoute/history";
