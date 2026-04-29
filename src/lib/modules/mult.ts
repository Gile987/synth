import { BaseModule } from '$core/base-module';
import type { ModuleDefinition } from '$types';

export const MULT_HELP = {
  title: 'Multiple',
  description: 'Splits one signal into four identical copies. Essential for sending one modulation source to multiple destinations.',
  usage: 'Connect a signal (LFO, envelope, oscillator) to the input, then connect any of the four outputs to different modules. All outputs carry the same signal.',
  tips: [
    'Split one LFO to modulate both filter cutoff and VCA',
    'Distribute a clock signal to multiple sequencers',
    'Send one oscillator to multiple effects',
    'No signal degradation - all outputs are identical',
    'Passive mult - uses no CPU',
  ],
  related: ['lfo', 'adsr', 'oscillator', 'filter', 'vca'],
};

export const MULT_DEFINITION: ModuleDefinition = {
  type: 'mult',
  label: 'Mult',
  category: 'utility',
  version: '1.0.0',
  ports: [
    { name: 'input', type: 'audio', direction: 'input' },
    { name: 'out1', type: 'audio', direction: 'output' },
    { name: 'out2', type: 'audio', direction: 'output' },
    { name: 'out3', type: 'audio', direction: 'output' },
    { name: 'out4', type: 'audio', direction: 'output' },
  ],
  params: [],
  help: MULT_HELP,
};

export class MultModule extends BaseModule {
  private inputNode: GainNode | undefined;
  private outputNodes: GainNode[] = [];

  constructor(id: string) {
    super(id, MULT_DEFINITION);
  }

  protected createNodes(): void {
    const ctx = this.context;
    
    // Create input node
    this.inputNode = ctx.createGain();
    this.inputNode.gain.value = 1; // Unity gain
    
    // Create 4 output nodes, all connected to input
    for (let i = 0; i < 4; i++) {
      const outputGain = ctx.createGain();
      outputGain.gain.value = 1; // Unity gain
      this.inputNode.connect(outputGain);
      this.outputNodes.push(outputGain);
    }

    // Register ports
    this.registerPort({
      name: 'input',
      type: 'audio',
      direction: 'input',
      node: this.inputNode,
    });

    this.registerPort({
      name: 'out1',
      type: 'audio',
      direction: 'output',
      node: this.outputNodes[0],
    });

    this.registerPort({
      name: 'out2',
      type: 'audio',
      direction: 'output',
      node: this.outputNodes[1],
    });

    this.registerPort({
      name: 'out3',
      type: 'audio',
      direction: 'output',
      node: this.outputNodes[2],
    });

    this.registerPort({
      name: 'out4',
      type: 'audio',
      direction: 'output',
      node: this.outputNodes[3],
    });
  }

  protected destroyNodes(): void {
    if (this.inputNode !== undefined) {
      this.inputNode.disconnect();
      this.inputNode = undefined;
    }
    
    this.outputNodes.forEach(node => {
      node.disconnect();
    });
    this.outputNodes = [];
  }
}
