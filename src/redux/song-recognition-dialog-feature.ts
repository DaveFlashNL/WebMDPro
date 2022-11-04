import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { savePreference, loadPreference } from '../utils';

export type RecognitionTitleFormatType = 'title' | 'album-title' | 'artist-title' | 'artist-album-title' | 'title-artist';
export type ImportMethod = 'exploits' | 'line-in';

export interface TitleEntry {
    originalTitle: string;
    originalFullWidthTitle: string;

    songTitle: string;
    songAlbum: string;
    songArtist: string;

    alreadyRecognized: boolean;
    recognizeFail: boolean;

    index: number;

    newTitle: string;
    newFullWidthTitle: string;
}

export interface SongRecognitionDialogFeature {
    visible: boolean;
    titleFormat: RecognitionTitleFormatType;
    titles: TitleEntry[];
    importMethod: ImportMethod;
}

const initialState: SongRecognitionDialogFeature = {
    visible: false,
    titleFormat: loadPreference('recognitionTrackTitleFormat', 'title') as RecognitionTitleFormatType,
    titles: [],
    importMethod: loadPreference('recognitionImportMethod', 'line-in') as ImportMethod,
};

const slice = createSlice({
    name: 'songRecognitionDialog',
    initialState,
    reducers: {
        setVisible: (state, action: PayloadAction<boolean>) => {
            state.visible = action.payload;
        },
        setTitles: (state, action: PayloadAction<TitleEntry[]>) => {
            state.titles = action.payload;
        },
        setTitleFormat: (state, action: PayloadAction<RecognitionTitleFormatType>) => {
            savePreference('recognitionTrackTitleFormat', action.payload);
            state.titleFormat = action.payload;
        },
        setImportMethod: (state, action: PayloadAction<ImportMethod>) => {
            savePreference('recognitionImportMethod', action.payload);
            state.importMethod = action.payload;
        },
    },
});

export const { actions, reducer } = slice;
export default enableBatching(reducer);
