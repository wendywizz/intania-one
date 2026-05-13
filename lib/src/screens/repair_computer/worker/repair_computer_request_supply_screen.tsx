import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerRequestSupplyScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Request Supply" source="repair_computer/worker/repair_computer_request_supply_screen.dart" kind="repair" subtype="request_supply" {...props} />;
}

export default RepairComputerRequestSupplyScreen;
