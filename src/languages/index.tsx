import { locales } from './navigator';

import en from './en.json';
import nl from './nl.json';
import de from './de.json';
import pl from './pl.json';
//import xx from './xx.json';

const locale = locales();

function getLocale() {
    if (locale.includes('nl')) {
        return nl
    } else if (locale.includes('de')) {
        return de
    } else if (locale.includes('pl')) {
        return pl
    } else if (locale.includes('en')) {
        return en
    } else {
        //if no translation exists, defaults to english
        return en
    }
}
export function setUserLang(e: any) {
    const json = e;
    return json;
}

function setLocale() {
    // Get user's current browser or OS language
    // Try to find a matching language tag in our json files
    const json = getLocale();
    return json;
}

// Exports translations for the components
export const lproj = setLocale();
export const AboutTranslations = lproj.about;
export const AppTranslations = lproj.app;
export const ChangelogDialogTranslations = lproj['changelog-dialog'];
export const ControlsTranslations = lproj.controls;
export const ConvertDialogTranslations = lproj['convert-dialog'];
export const DumpDialogTranslations = lproj['dump-dialog'];
export const ErrorDialogTranslations = lproj['error-dialog'];
export const LineInHelpersTranslations = lproj['line-in-helpers'];
export const MainRowsTranslations = lproj['main-rows'];
export const MaintsxTranslations = lproj.main;
export const DeviceDialogTranslations = lproj['other-device-dialog'];
export const PanicDialogTranslations = lproj['panic-dialog'];
export const RecordDialogTranslations = lproj['record-dialog'];
export const RenameDialogTranslations = lproj['rename-dialog'];
export const SettingsDialogTranslations = lproj['settings-dialog'];
export const ShazamDialogTranslations = lproj['song-recognition-dialog'];
export const ShazamProgressTranslations = lproj['song-recognition-progress-dialog'];
export const SplitButtonTranslations = lproj['split-button'];
export const TopmenuTranslations = lproj.topmenu;
export const UploadDialogTranslations = lproj['upload-dialog'];
export const WelcomeTranslations = lproj.welcome;