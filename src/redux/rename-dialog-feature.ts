import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';

export enum RenameType {
    TRACK,
    DISC,
    GROUP,
    HIMD,
    HIMD_DISC,
    TRACK_CONVERT_DIALOG,
    TRACK_CONVERT_DIALOG_HIMD,
    SONG_RECOGNITION_TITLE,
}

export interface RenameDialogState {
    visible: boolean;
    title: string;
    fullWidthTitle: string;

    renameType: RenameType;
    index: number;

    himdTitle: string;
    himdAlbum: string;
    himdArtist: string;
}

const initialState: RenameDialogState = {
    visible: false,
    title: '',
    fullWidthTitle: '',

    renameType: RenameType.DISC,
    index: 0,

    himdTitle: '',
    himdAlbum: '',
    himdArtist: '',
};

export const slice = createSlice({
    name: 'renameDialog',
    initialState,
    reducers: {
        setVisible: (state: RenameDialogState, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setCurrentName: (state: RenameDialogState, action: PayloadAction<string>) => {
            state.title = action.payload;
        },
        setCurrentFullWidthName: (state: RenameDialogState, action: PayloadAction<string>) => {
            state.fullWidthTitle = action.payload;
        },

        setRenameType: (state: RenameDialogState, action: PayloadAction<RenameType>) => {
            state.renameType = action.payload;
        },
        setIndex: (state: RenameDialogState, action: PayloadAction<number>) => {
            state.index = action.payload;
        },

        setHimdTitle: (state: RenameDialogState, action: PayloadAction<string>) => {
            state.himdTitle = action.payload;
        },
        setHimdArtist: (state: RenameDialogState, action: PayloadAction<string>) => {
            state.himdArtist = action.payload;
        },
        setHimdAlbum: (state: RenameDialogState, action: PayloadAction<string>) => {
            state.himdAlbum = action.payload;
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
