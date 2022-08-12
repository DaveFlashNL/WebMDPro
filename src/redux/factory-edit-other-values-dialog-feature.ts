import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface FactoryModeEditOtherValuesDialogState {
    visible: boolean;
}

const initialState: FactoryModeEditOtherValuesDialogState = {
    visible: false,
};

export const slice = createSlice({
    name: 'factoryEditOtherValuesDialog',
    initialState,
    reducers: {
        setVisible: (state: FactoryModeEditOtherValuesDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
