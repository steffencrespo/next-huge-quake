import { Composition } from 'remotion';
import { HookA, HookB, HookC, HookD } from './Hooks.js';

const common = { width: 1080, height: 1920, fps: 30, durationInFrames: 150 } as const;

export const Root: React.FC = () => (
  <>
    <Composition id="HookA" component={HookA} {...common} />
    <Composition id="HookB" component={HookB} {...common} />
    <Composition id="HookD" component={HookD} {...common} />
    <Composition id="HookC" component={HookC} {...common} />
  </>
);
