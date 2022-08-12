/* eslint no-restricted-globals: 0 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import * as serviceWorker from './serviceWorker';
import serviceRegistry from './services/registry';

import { store } from './redux/store';
import { actions as appActions } from './redux/app-feature';
import { actions as mainActions } from './redux/main-feature';

import App from './components/app';

import './index.css';
import './fonts/fonts.css';

import { FFMpegAudioExportService } from './services/audio-export';
import { MediaRecorderService } from './services/mediarecorder';
import { BrowserMediaSessionService } from './services/media-session';
import { listContent } from './redux/actions';

// serviceRegistry.netmdService = (window as any).native?.interface || new NetMDUSBService({ debug: true });
// serviceRegistry.netmdService = new NetMDMockService(); // Uncomment to work without a device attached
serviceRegistry.netmdService = undefined;
serviceRegistry.audioExportService = new FFMpegAudioExportService();
serviceRegistry.mediaRecorderService = new MediaRecorderService();
serviceRegistry.mediaSessionService = new BrowserMediaSessionService(store);

Object.defineProperty(window, 'wmdVersion', {
    value: '1.2.2',
    writable: false,
});

if (localStorage.getItem('version') !== (window as any).wmdVersion) {
    store.dispatch(appActions.showChangelogDialog(true));
}

(function setupEventHandlers() {
    window.addEventListener('beforeunload', ev => {
        let isUploading = store.getState().uploadDialog.visible;
        if (!isUploading) {
            return;
        }
        ev.preventDefault();
        ev.returnValue = `Warning! Recording will be interrupted`;
    });

    if (navigator && navigator.usb) {
        navigator.usb.ondisconnect = function() {
            store.dispatch(appActions.setMainView('WELCOME'));
        };
    } else {
        store.dispatch(appActions.setBrowserSupported(false));
    }

    if (!('Notification' in window) || Notification.permission === 'denied') {
        store.dispatch(appActions.setNotificationSupport(false));
        store.dispatch(appActions.setNotifyWhenFinished(false));
    }

    // eslint-disable-next-line
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        deferredPrompt = e;
    });
})();

(function statusMonitorManager() {
    // Polls the device for its state while playing tracks
    //let statusMonitorInterval: ReturnType<typeof setInterval> | null = null;
    let exceptionOccurred: boolean = false;

    function shouldMonitorBeRunning(state: ReturnType<typeof store.getState>): boolean {
        return (
            !exceptionOccurred &&
            // App ready
            state.appState.mainView === 'MAIN' &&
            state.appState.loading === false &&
            // Disc playing
            // (state.main.deviceStatus?.state === 'playing' || state.main.disc === null) &&
            // No operational dialogs running
            state.convertDialog.visible === false &&
            state.uploadDialog.visible === false &&
            state.recordDialog.visible === false &&
            state.panicDialog.visible === false &&
            state.errorDialog.visible === false &&
            state.dumpDialog.visible === false
        );
    }

    async function monitor() {
        const state = store.getState();
        if (shouldMonitorBeRunning(state)) {
            try {
                let deviceStatus;
                try {
                    deviceStatus = await serviceRegistry.netmdService!.getDeviceStatus();
                } catch (ex) {
                    // In invalid state - wait it out.
                    setTimeout(monitor, 5000);
                    return;
                }
                if (!deviceStatus.discPresent && state.main.disc !== null) store.dispatch(mainActions.setDisc(null));
                if (deviceStatus.discPresent && state.main.disc === null) await listContent()(store.dispatch);
                if (JSON.stringify(deviceStatus) !== JSON.stringify(state.main.deviceStatus)) {
                    store.dispatch(mainActions.setDeviceStatus(deviceStatus));
                }
            } catch (e) {
                console.error(e);
                exceptionOccurred = true; // Stop monitor on exception
            }
        }
        setTimeout(monitor, 5000);
    }
    monitor();
})();

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);

if (process.env.REACT_APP_NO_GA_RELEASE !== 'true') {
    serviceWorker.register();
    // serviceWorker.unregister();
}
