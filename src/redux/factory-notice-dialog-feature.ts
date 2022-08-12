import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export interface FactoryModeNoticeDialogState {
    visible: boolean;
}

const initialState: FactoryModeNoticeDialogState = {
    visible: false,
};

export const slice = createSlice({
    name: 'factoryNoticeDialog',
    initialState,
    reducers: {
        setVisible: (state: FactoryModeNoticeDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
