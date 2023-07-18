import {Renderer, el} from '@elemaudio/core';
import {Voice, VoiceManager} from './voices';
import {parseStream} from './midi';

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

const polyphony = (props:any, allVoices: Voice[], activeVoices: Voice[]) => {
  let e = Math.round(Math.random());
  const synthVoices:any[] = allVoices.map((v) => {
    let fq = el.smooth({key: "freq"+v.idx}, el.tau2pole(0.004), el.const({key: `v${v.idx}`, value: v.freq}));
    let vc = (e > 0.5) ? el.saw({key: v.id}, fq) : el.square({key: v.id}, fq);
    return el.mul(
      el.const({ key: `gate${v.gate}`, value: v.gate}),
      vc
    );
  });
  return el.mul({key: 'voices'}, 
    0.5,
    synthVoices.reduce((voiceStack, v, i) => {
      return el.add(voiceStack, v);
    }, 0)
  );
}

// Global voice manager
const vcm = VoiceManager({});

// Our state change callback
globalThis.__receiveStateChange__ = (state, _midi) => {

  const midi = JSON.parse(_midi);
  const props = JSON.parse(state);
  
  const num_voices = 8;
  // SET VOICE COUNT
  vcm.setVoiceCount(num_voices);
  // PARSE MIDI NOTES INTO VOICES AND TRIGGER EVENTS
  vcm.streamMIDI(parseStream(midi));

  // ALL VOICES
  let allVoices = vcm.getVoices();
  // ACTIVE VOICES
  let activeVoices = allVoices.filter((v)=>{
    return v.gate > 0;
  });

  // SYNTH
  let signal = polyphony(props, allVoices, activeVoices);
  // MAKE STEREO
  let [left, right] = [ signal, signal ];

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
