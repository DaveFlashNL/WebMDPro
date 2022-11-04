import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { CustomParameters } from '../custom-parameters';

export interface EncoderSetupDialogState {
    visible: boolean;
    selectedServiceIndex: number;
    customParameters: CustomParameters;
}

const initialState: EncoderSetupDialogState = {
    visible: false,
    selectedServiceIndex: 0,
    customParameters: {},
};

export const slice = createSlice({
    name: 'encoderSetupDialog',
    initialState,
    reducers: {
        setVisible: (state: EncoderSetupDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setSelectedServiceIndex: (state: EncoderSetupDialogState, action: PayloadAction<number>) => {
            state.selectedServiceIndex = action.payload;
        },
        setCustomParameters: (state: EncoderSetupDialogState, action: PayloadAction<CustomParameters>) => {
            state.customParameters = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
