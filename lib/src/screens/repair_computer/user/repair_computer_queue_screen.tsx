import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerQueueScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Queue" source="repair_computer/user/repair_computer_queue_screen.dart" kind="repair" subtype="queue" {...props} />;
}

export default RepairComputerQueueScreen;
