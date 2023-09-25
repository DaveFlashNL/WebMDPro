import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { loadPreference } from '../../utils';

export interface FactoryModeEditDialogState {
    address: string;
    count: number;
    visible: boolean;
    remember: boolean;
}

const initialState: FactoryModeEditDialogState = {
    address: '',
    count: 0,
    visible: false,
    remember: loadPreference('factoryBadSectorRememberChoice', false),
};

export const slice = createSlice({
    name: 'factoryBadSectorDialog',
    initialState,
    reducers: {
        setVisible: (state: FactoryModeEditDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setCount: (state: FactoryModeEditDialogState, action: PayloadAction<number>) => {
            state.count = action.payload;
        },
        setAddress: (state: FactoryModeEditDialogState, action: PayloadAction<string>) => {
            state.address = action.payload;
        },
        setRememberChoice: (state: FactoryModeEditDialogState, action: PayloadAction<boolean>) => {
            state.remember = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
