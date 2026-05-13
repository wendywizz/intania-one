import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerCurrentScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Current" source="repair_computer/user/repair_computer_current_screen.dart" kind="repair" subtype="current" {...props} />;
}

export default RepairComputerCurrentScreen;
