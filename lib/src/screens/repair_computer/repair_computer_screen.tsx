import React from 'react';
import {ConvertedScreen} from '../converted/ConvertedScreen';

export function RepairComputerScreen(props: any) {
  return <ConvertedScreen title="Repair Computer" source="repair_computer/repair_computer_screen.dart" kind="repair" subtype="current" {...props} />;
}

export default RepairComputerScreen;
