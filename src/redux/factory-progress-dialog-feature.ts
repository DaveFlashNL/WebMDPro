import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface FactoryModeEditDialogState {
    visible: boolean;
    actionName: string;
    units: string;
    totalProgress: number;
    currentProgress: number;
    additionalInfo: string;
}

const initialState: FactoryModeEditDialogState = {
    visible: false,
    actionName: '',
    units: '',
    totalProgress: 0,
    currentProgress: 0,
    additionalInfo: '',
};

export const slice = createSlice({
    name: 'factoryProgressDialog',
    initialState,
    reducers: {
        setVisible: (state: FactoryModeEditDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setDetails: (state: FactoryModeEditDialogState, action: PayloadAction<{ name: string; units: string }>) => {
            state.actionName = action.payload.name;
            state.units = action.payload.units;
            state.additionalInfo = '';
        },
        setProgress: (
            state: FactoryModeEditDialogState,
            action: PayloadAction<{ current: number; total: number; additionalInfo?: string }>
        ) => {
            state.currentProgress = action.payload.current;
            state.totalProgress = action.payload.total;
            if (action.payload.additionalInfo !== undefined) state.additionalInfo = action.payload.additionalInfo;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
