import { locales } from './navigator';

import en from './languages/en.json';
import nl from './languages/nl.json';
import de from './languages/de.json';
import pl from './languages/pl.json';
//import pl from './languages/pl.json';

var locale = locales.toString();

function getLocale() {
    if (locale.indexOf('nl')) {
        return nl
    } else if (locale.indexOf('de')) {
        return de
    } else if (locale.indexOf('pl')) {
        return pl
    } else {
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

// Use the function in a React Native component
export const lproj = setLocale();