import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToC } from 'netmd-tocmanip';
import { enableBatching } from 'redux-batched-actions';
import { ExploitCapability } from '../services/netmd';

export interface FactoryState {
    toc?: ToC;
    modified: boolean;
    firmwareVersion: string;
    exploitCapabilities: ExploitCapability[];
}

const initialState: FactoryState = {
    modified: false,
    firmwareVersion: '',
    exploitCapabilities: [],
};

export const slice = createSlice({
    name: 'factory',
    initialState,
    reducers: {
        setToc: (state, action: PayloadAction<ToC>) => {
            state.toc = action.payload;
        },
        setModified: (state, action: PayloadAction<boolean>) => {
            state.modified = action.payload;
        },
        setFirmwareVersion: (state, action: PayloadAction<string>) => {
            state.firmwareVersion = action.payload;
        },
        setExploitCapabilities: (state, action: PayloadAction<ExploitCapability[]>) => {
            state.exploitCapabilities = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
