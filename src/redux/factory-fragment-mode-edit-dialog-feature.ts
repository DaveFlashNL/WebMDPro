import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface FactoryModeEditDialogState {
    visible: boolean;
    mode: number;
    fragmentIndex: number;
}

const initialState: FactoryModeEditDialogState = {
    visible: false,
    mode: 0,
    fragmentIndex: -1,
};

export const slice = createSlice({
    name: 'factoryFragmentModeDialog',
    initialState,
    reducers: {
        setVisible: (state: FactoryModeEditDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setMode: (state: FactoryModeEditDialogState, action: PayloadAction<number>) => {
            state.mode = action.payload;
        },
        setFragmentIndex: (state: FactoryModeEditDialogState, action: PayloadAction<number>) => {
            state.fragmentIndex = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
