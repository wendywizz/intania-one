import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerHistoryScreen(props: any) {
  return <ConvertedScreen title="Repair Computer History" source="repair_computer/user/repair_computer_history_screen.dart" kind="repair" subtype="history" {...props} />;
}

export default RepairComputerHistoryScreen;
