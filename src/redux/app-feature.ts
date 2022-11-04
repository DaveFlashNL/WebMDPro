import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { enableBatching } from 'redux-batched-actions';
import { CustomParameters } from '../custom-parameters';
import { filterOutCorrupted, getSimpleServices, ServiceConstructionInfo } from '../services/service-manager';
import { savePreference, loadPreference } from '../utils';

export type Views = 'WELCOME' | 'MAIN' | 'FACTORY';

export interface AppState {
    mainView: Views;
    loading: boolean;
    pairingFailed: boolean;
    pairingMessage: string;
    browserSupported: boolean;
    darkMode: boolean;
    vintageMode: boolean;
    aboutDialogVisible: boolean;
    changelogDialogVisible: boolean;
    notifyWhenFinished: boolean;
    hasNotificationSupport: boolean;
    fullWidthSupport: boolean;
    availableServices: ServiceConstructionInfo[];
    lastSelectedService: number;
    factoryModeRippingInMainUi: boolean;
    audioExportService: number;
    audioExportServiceConfig: CustomParameters;
}

export const buildInitialState = (): AppState => {
    return {
        mainView: 'WELCOME',
        loading: false,
        pairingFailed: false,
        pairingMessage: ``,
        browserSupported: true,
        darkMode: loadPreference('darkMode', true),
        vintageMode: loadPreference('vintageMode', false),
        changelogDialogVisible: false,
        aboutDialogVisible: false,
        notifyWhenFinished: loadPreference('notifyWhenFinished', false),
        hasNotificationSupport: true,
        fullWidthSupport: loadPreference('fullWidthSupport', false),
        availableServices: getSimpleServices().concat(filterOutCorrupted(loadPreference('customServices', []))),
        lastSelectedService: loadPreference('lastSelectedService', 0),
        factoryModeRippingInMainUi: false, // As this value is heavily device-dependent and not really that stable yet
        // it should not be stored in the preferences, and should default to false.
        audioExportService: loadPreference('audioExportService', 0),
        audioExportServiceConfig: loadPreference('audioExportServiceConfig', {}),
    };
};

const initialState: AppState = buildInitialState();

export const slice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setMainView: (state, action: PayloadAction<Views>) => {
            // CAVEAT: There's a middleware that resets the state when mainView is set to WELCOME
            state.mainView = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setPairingFailed: (state, action: PayloadAction<boolean>) => {
            state.pairingFailed = action.payload;
        },
        setPairingMessage: (state, action: PayloadAction<string>) => {
            state.pairingMessage = action.payload;
        },
        setBrowserSupported: (state, action: PayloadAction<boolean>) => {
            state.browserSupported = action.payload;
        },
        setDarkMode: (state, action: PayloadAction<boolean>) => {
            state.darkMode = action.payload;
            savePreference('darkMode', state.darkMode);
        },
        setNotifyWhenFinished: (state, action: PayloadAction<boolean>) => {
            state.notifyWhenFinished = action.payload;
            savePreference('notifyWhenFinished', action.payload);
        },
        setNotificationSupport: (state, action: PayloadAction<boolean>) => {
            state.hasNotificationSupport = action.payload;
        },
        setVintageMode: (state, action: PayloadAction<boolean>) => {
            state.vintageMode = action.payload;
            savePreference('vintageMode', action.payload);
        },
        showAboutDialog: (state, action: PayloadAction<boolean>) => {
            state.aboutDialogVisible = action.payload;
        },
        showChangelogDialog: (state, action: PayloadAction<boolean>) => {
            state.changelogDialogVisible = action.payload;
        },
        setFullWidthSupport: (state, action: PayloadAction<boolean>) => {
            state.fullWidthSupport = action.payload;
            savePreference('fullWidthSupport', state.fullWidthSupport);
        },
        setAvailableServices: (state, action: PayloadAction<ServiceConstructionInfo[]>) => {
            state.availableServices = action.payload;
            const simpleServices = getSimpleServices().map(n => n.name);
            savePreference(
                'customServices',
                action.payload.filter(n => !simpleServices.includes(n.name))
            ); // Only write the custom services
        },
        setLastSelectedService: (state, action: PayloadAction<number>) => {
            state.lastSelectedService = action.payload;
            savePreference('lastSelectedService', state.lastSelectedService);
        },
        setFactoryModeRippingInMainUi: (state, action: PayloadAction<boolean>) => {
            state.factoryModeRippingInMainUi = action.payload;
        },
        setAudioExportService: (state, action: PayloadAction<number>) => {
            state.audioExportService = action.payload;
            savePreference('audioExportService', state.audioExportService);
        },
        setAudioExportServiceConfig: (state, action: PayloadAction<CustomParameters>) => {
            state.audioExportServiceConfig = action.payload;
            savePreference('audioExportServiceConfig', state.audioExportServiceConfig);
        },
    },
});

export const { reducer, actions } = slice;
export default enableBatching(reducer);
