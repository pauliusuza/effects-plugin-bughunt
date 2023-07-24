import {Renderer, el} from '@elemaudio/core';

// This example demonstrates writing a very simple chorus effect in Elementary, with a
// custom Renderer instance that marshals our instruction batches through the __postNativeMessage__
// function injected into the environment from C++.
//
// Below, we establish a __receiveStateChange__ callback function which will be invoked by the
// native PluginProcessor when any relevant state changes and we need to update our signal graph.
/* @ts-ignore */
let core = new Renderer(__getSampleRate__(), (batch) => {
  /* @ts-ignore */
  __postNativeMessage__(JSON.stringify(batch));
});

const engine_2OSC = (name: string, props:any, vfreq: number) => {
  const n = `${name}`;
  let freq = el.sm(el.const({ key: `${name}:freqency`, value: vfreq }));
  return el.add(
    { key: `${n}` },
    el.square({ key: `${name}:triangle` }, freq),
    el.triangle({ key: `${name}:triangle` }, freq)
  )
}

const engine_1OSC = (name: string, props:any, vfreq: number) => {
  const n = `${name}`;
  let freq = el.sm(el.const({ key: `${name}:freqency`, value: vfreq }));
  return el.add(
    { key: `${n}` },
    el.saw({ key: `${name}:saw` }, freq)
  )
}

const engine_zOSC = (name: string, props:any, vfreq: number) => {
  const n = `${name}`;
  let freq = el.sm(el.const({ key: `${name}:freqency`, value: vfreq }));
  return el.add(
    { key: `${n}` },
    el.blepsquare({ key: `${name}:blsq` }, freq)
  )
}

const engines = [
  {name:'1osc', impl: engine_1OSC},
  {name:'2osc', impl: engine_2OSC},
  {name:'blsq', impl: engine_zOSC},
];

// Our state change callback
globalThis.__receiveStateChange__ = (state, _midi) => {

  const props = JSON.parse(state);
  
  let rand = Math.random();
  let randomEngine = engines[ Math.floor(rand * engines.length ) ];

  let synth1 = randomEngine.impl(`voice1`, props, 40 + Math.random() * 400 );
  let synth2 = randomEngine.impl(`voice2`, props, 40 + Math.random() * 400 );

  let synth = el.mul(
    el.add(
      synth1,
      synth2
    ),
    0.5
  )

  let [left, right] = [
    synth, synth
  ];

  // RENDER
  let stats = core.render(
    left,
    right,
  );

  console.log("stat", stats);
};

// And an error callback
globalThis.__receiveError__ = (err) => {
  console.log(`[Error: ${err.name}] ${err.message}`);
};
