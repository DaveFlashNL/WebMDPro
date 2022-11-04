import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export enum Step {
    NONE = -1,
    READING = 0,
    CALCULATING = 1,
    IDENTIFYING = 2,
}

export interface SongRecognitionProgressDialogFeature {
    visible: boolean;
    totalTracks: number;
    currentTrack: number;
    currentStep: Step;

    cancelled: boolean;
    currentStepCurrent: number;
    currentStepTotal: number;
}

const initialState: SongRecognitionProgressDialogFeature = {
    visible: false,
    totalTracks: -1,
    currentTrack: -1,
    currentStep: Step.NONE,

    cancelled: false,
    currentStepCurrent: -1,
    currentStepTotal: -1,
};

const slice = createSlice({
    name: 'songRecognitionProgressDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setTotalTracks: (state, action: PayloadAction<number>) => {
            state.totalTracks = action.payload;
        },
        setCurrentTrack: (state, action: PayloadAction<number>) => {
            state.currentTrack = action.payload;
        },
        setCurrentStep: (state, action: PayloadAction<Step>) => {
            state.currentStep = action.payload;
        },
        setCancelled: (state, action: PayloadAction<boolean>) => {
            state.cancelled = action.payload;
        },
        setCurrentStepProgress: (state, action: PayloadAction<Step>) => {
            state.currentStepCurrent = action.payload;
        },
        setCurrentStepTotal: (state, action: PayloadAction<Step>) => {
            state.currentStepTotal = action.payload;
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
