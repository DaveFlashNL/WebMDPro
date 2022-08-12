import { Disc, DeviceStatus } from 'netmd-js';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { Capability } from '../services/netmd';

export interface MainState {
    disc: Disc | null;
    deviceName: string;
    deviceStatus: DeviceStatus | null;
    deviceCapabilities: Capability[];
}

const initialState: MainState = {
    disc: null,
    deviceName: '',
    deviceStatus: null,
    deviceCapabilities: [Capability.contentList], // Prevent the UI from collapsing when loading.
};

export const slice = createSlice({
    name: 'main',
    initialState,
    reducers: {
        setDisc: (state, action: PayloadAction<Disc | null>) => {
            state.disc = action.payload;
        },
        setDeviceName: (state, action: PayloadAction<string>) => {
            state.deviceName = action.payload;
        },
        setDeviceStatus: (state, action: PayloadAction<DeviceStatus | null>) => {
            state.deviceStatus = action.payload;
        },
        setDeviceCapabilities: (state, action: PayloadAction<Capability[]>) => {
            state.deviceCapabilities = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
