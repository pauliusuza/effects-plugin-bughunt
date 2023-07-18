import { MIDI_EVENT_TYPE, midiToNote, MIDINote, MIDINumber, Hertz, Note } from './midi';

export type Voice = {
    id: string, 
    idx: number,
    gate: number, 
    freq: Hertz,
    note: Note,
    midi: MIDINumber,
    vel: number, 
    aft: number,
    last: number
}

export type MIDINoteAttributes = {
    aft: number,
    vel: number
}

export type LiveMidiNote = MIDINote & MIDINoteAttributes;

interface VoiceManagerProps {
    noteOn?: (note:LiveMidiNote)=>void
    noteOff?: (note:LiveMidiNote)=>void
    noteAft?: (note:LiveMidiNote)=>void
}

export const VoiceManager = ({
    noteOn,
    noteOff,
    noteAft
}: VoiceManagerProps) => {
    const __voices: Map<string, Voice> = new Map();
    const __notesToVoices: Map<string, string> = new Map();
    const __state: Map<string, LiveMidiNote> = new Map();
    const streamMIDI = (midiEvents) => {
        midiEvents.forEach(midi => {
            switch(midi.type) {
                case MIDI_EVENT_TYPE.NOTE_ON:
                    let note = midiToNote(midi.data[0]);
                    const n1 = Object.assign(note, {vel: midi.data[1], aft: 0});
                    __state.set(midi.data[0], n1);
                    handleNoteOn(n1);
                    if(noteOn) {
                        noteOn(n1);
                    }
                    break;
                case MIDI_EVENT_TYPE.NOTE_AFTERTOUCH:
                    let existing_note = __state.get(midi.data[0]);
                    if(existing_note) {
                        const n2 = Object.assign(existing_note, {vel: existing_note.vel, aft: midi.data[1]});
                        __state.set(midi.data[0], n2);
                        handleNoteAft(n2);
                        if(noteAft) {
                            noteAft(n2);
                        }
                    }
                    break;
                case MIDI_EVENT_TYPE.NOTE_OFF:
                    const n3 = __state.get(midi.data[0]);
                    if(n3) {
                        handleNoteOff(n3);
                        if(noteOff) {
                            noteOff(n3);
                        }
                    }
                    __state.delete(midi.data[0]);
                    break;
            }
        });
        return Object.fromEntries(__state);
    }
    const getOldestVoice = () => {
        const varr = Array.from(__voices.values());
        const sorted = varr.sort((a, b)=> {
            if (a.gate === b.gate){
            return a.last < b.last ? -1 : 1;
            } else {
            return a.gate < b.gate ? -1 : 1;
            }
        })
        return sorted[0];
    }
    const handleNoteOn = (n: LiveMidiNote) => {
        let oldestVoiceId = getOldestVoice().id;
        const oldestVoice = __voices.get(oldestVoiceId);
        if(oldestVoiceId) {
            __voices.set(oldestVoiceId, Object.assign({}, oldestVoice, {
                gate: 1,
                freq: n.herz,
                note: n.note,
                midi: n.number,
                aft: n.aft,
                vel: n.vel,
                last: Date.now()
            }));
            __notesToVoices.set(n.note, oldestVoiceId);
        }
    }
    const handleNoteOff = (n: LiveMidiNote) => {
        const voiceId = __notesToVoices.get(n.note);
        if(voiceId) {
            const active_voice = __voices.get(voiceId);
            console.log(active_voice, active_voice?.note, n.note)
            if(active_voice?.note == n.note) {
                console.log('setting noteoff', voiceId)
                __voices.set(voiceId, Object.assign({}, active_voice, {
                    gate: 0
                }));
            }
            __notesToVoices.delete(n.note);
        }
    }
    const handleNoteAft = (n: LiveMidiNote) => {
        const voiceId = __notesToVoices.get(n.note);
        if(voiceId) {
            const active_voice = __voices.get(voiceId);
            __voices.set(voiceId, Object.assign({}, active_voice, { 
                aft: n.aft,
                last: Date.now()
            }));
        }
    }
    const setVoiceCount = (num_voices) => {
        if(__voices.size != num_voices) {
            __voices.clear();
            __notesToVoices.clear();
            for (let vc = 1; vc <= num_voices; vc++) {
                const voiceId = "voice:" + vc;
                __voices.set(voiceId, {id: voiceId, idx: vc, gate: 0, freq:0.001, vel:0, aft:0, midi: 0, note: 'None', last: 0});
            }
        }
    }
    const getVoices = () => {
        return Array.from(__voices.values());
    }
    return {
        streamMIDI,
        getOldestVoice,
        getVoices,
        setVoiceCount
    }
}