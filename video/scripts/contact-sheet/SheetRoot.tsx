import { Still } from 'remotion';
import { ContactSheet, sheetSize } from './ContactSheet.js';
import { ROWS } from './rows.js';

const size = sheetSize( ROWS.length );

export const SheetRoot: React.FC = () => (
  <Still id="ContactSheet" component={ContactSheet} {...size} defaultProps={{ title: 'M2.1 Gate B · DesignBoard contact sheet', rows: ROWS }} />
);
