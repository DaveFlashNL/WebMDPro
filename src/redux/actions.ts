import { batchActions } from 'redux-batched-actions';
import { AppDispatch, RootState } from './store';
import { actions as uploadDialogActions } from './upload-dialog-feature';
import { actions as renameDialogActions } from './rename-dialog-feature';
import { actions as errorDialogAction } from './error-dialog-feature';
import { actions as recordDialogAction } from './record-dialog-feature';
import { actions as appStateActions } from './app-feature';
import { actions as mainActions } from './main-feature';
import { actions as convertDialogActions } from './convert-dialog-feature';
import { actions as songRecognitionDialogActions } from './song-recognition-dialog-feature';
import { actions as songRecognitionProgressDialogActions } from './song-recognition-progress-dialog-feature';
import serviceRegistry from '../services/registry';
import { Wireformat, getTracks, Disc, DiscFormat, getRemainingCharactersForTitles, EncodingName, Encoding } from 'netmd-js';
import { AnyAction } from '@reduxjs/toolkit';
import {
    framesToSec,
    sleepWithProgressCallback,
    sleep,
    askNotificationPermission,
    getGroupedTracks,
    timeToSeekArgs,
    TitledFile,
    downloadBlob,
    createDownloadTrackName,
    secondsToNormal,
    getPublicPathFor,
} from '../utils';
import { UploadFormat } from './convert-dialog-feature';
import NotificationCompleteIconUrl from '../images/record-complete-notification-icon.png';
import { assertNumber, getHalfWidthTitleLength } from 'netmd-js/dist/utils';
import { Capability, NetMDService } from '../services/netmd';
import { getSimpleServices, ServiceConstructionInfo } from '../services/service-manager';
import { AudioServices } from '../services/audio-export-service-manager';
import { checkIfAtracDownloadPossible } from './factory/factory-actions';
import { createWorker } from '@ffmpeg/ffmpeg';
import { Shazam } from 'shazam-api/dist/api';

export function control(action: 'play' | 'stop' | 'next' | 'prev' | 'goto' | 'pause' | 'seek', params?: unknown) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const state = getState();
        switch (action) {
            case 'play':
                await serviceRegistry.netmdService!.play();
                break;
            case 'stop':
                await serviceRegistry.netmdService!.stop();
                break;
            case 'next':
                try {
                    await serviceRegistry.netmdService!.next();
                } catch (e) {
                    // Some devices don't support next() and prev()
                    if (state.main.deviceStatus?.track === state.main.disc?.trackCount! - 1 || !state.main.deviceStatus) return;
                    await serviceRegistry.netmdService!.stop();
                    await serviceRegistry.netmdService!.gotoTrack(state.main.deviceStatus?.track! + 1);
                    await serviceRegistry.netmdService!.play();
                }
                break;
            case 'prev':
                try {
                    await serviceRegistry.netmdService!.prev();
                } catch (e) {
                    // Some devices don't support next() and prev()
                    if (state.main.deviceStatus?.track === 0 || !state.main.deviceStatus) return;
                    await serviceRegistry.netmdService!.stop();
                    await serviceRegistry.netmdService!.gotoTrack(state.main.deviceStatus?.track! - 1);
                    await serviceRegistry.netmdService!.play();
                }
                break;
            case 'pause':
                await serviceRegistry.netmdService!.pause();
                break;
            case 'goto': {
                const trackNumber = assertNumber(params, 'Invalid track number for "goto" command');
                await serviceRegistry.netmdService!.gotoTrack(trackNumber);
                break;
            }
            case 'seek': {
                if (!(params instanceof Object)) {
                    throw new Error('"seek" command has wrong params');
                }
                const typedParams: { trackNumber: number; time: number } = params as any;
                const trackNumber = assertNumber(typedParams.trackNumber, 'Invalid track number for "seek" command');
                const time = assertNumber(typedParams.time, 'Invalid time for "seek" command');
                const timeArgs = timeToSeekArgs(time);
                await serviceRegistry.netmdService!.gotoTime(trackNumber, timeArgs[0], timeArgs[1], timeArgs[2], timeArgs[3]);
                break;
            }
        }
        // CAVEAT: change-track might take a up to a few seconds to complete.
        // We wait 500ms and let the monitor do further updates
        await sleep(500);
        try {
            let deviceStatus = await serviceRegistry.netmdService!.getDeviceStatus();
            dispatch(mainActions.setDeviceStatus(deviceStatus));
        } catch (e) {
            console.log('control: Cannot get device status');
        }
    };
}

export function renameGroup({ groupIndex, newName, newFullWidthName }: { groupIndex: number; newName: string; newFullWidthName?: string }) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        await serviceRegistry!.netmdService?.renameGroup(groupIndex, newName, newFullWidthName);
        listContent()(dispatch);
    };
}

export function groupTracks(indexes: number[]) {
    return async function (dispatch: AppDispatch) {
        let begin = indexes[0];
        let length = indexes[indexes.length - 1] - begin + 1;
        const { netmdService } = serviceRegistry;

        netmdService!.addGroup(begin, length, '');
        listContent()(dispatch);
    };
}

export function deleteGroups(indexes: number[]) {
    return async function (dispatch: AppDispatch) {
        dispatch(appStateActions.setLoading(true));
        const { netmdService } = serviceRegistry;
        let sorted = [...indexes].sort((a, b) => b - a);
        for (let index of sorted) {
            await netmdService!.deleteGroup(index);
        }
        listContent()(dispatch);
    };
}

export function dragDropTrack(sourceList: number, sourceIndex: number, targetList: number, targetIndex: number) {
    // This code is here, because it would need to be duplicated in both netmd and netmd-mock.
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        if (sourceList === targetList && sourceIndex === targetIndex) return;
        dispatch(appStateActions.setLoading(true));
        const groupedTracks = getGroupedTracks(await serviceRegistry.netmdService!.listContent());
        // Remove the moved item from its current list
        let movedItem = groupedTracks[sourceList].tracks.splice(sourceIndex, 1)[0];
        let newIndex: number;

        // Calculate bounds
        let boundsStartList, boundsEndList, boundsStartIndex, boundsEndIndex, offset;

        if (sourceList < targetList) {
            boundsStartList = sourceList;
            boundsStartIndex = sourceIndex;
            boundsEndList = targetList;
            boundsEndIndex = targetIndex;
            offset = -1;
        } else if (sourceList > targetList) {
            boundsStartList = targetList;
            boundsStartIndex = targetIndex;
            boundsEndList = sourceList;
            boundsEndIndex = sourceIndex;
            offset = 1;
        } else {
            if (sourceIndex < targetIndex) {
                boundsStartList = boundsEndList = sourceList;
                boundsStartIndex = sourceIndex;
                boundsEndIndex = targetIndex;
                offset = -1;
            } else {
                boundsStartList = boundsEndList = targetList;
                boundsStartIndex = targetIndex;
                boundsEndIndex = sourceIndex;
                offset = 1;
            }
        }

        // Shift indices
        for (let i = boundsStartList; i <= boundsEndList; i++) {
            let startingIndex = i === boundsStartList ? boundsStartIndex : 0;
            let endingIndex = i === boundsEndList ? boundsEndIndex : groupedTracks[i].tracks.length;
            for (let j = startingIndex; j < endingIndex; j++) {
                groupedTracks[i].tracks[j].index += offset;
            }
        }

        // Calculate the moved track's destination index
        if (targetList === 0) {
            newIndex = targetIndex;
        } else {
            if (targetIndex === 0) {
                let prevList = groupedTracks[targetList - 1];
                let i = 2;
                while (prevList && prevList.tracks.length === 0) {
                    // Skip past all the empty lists
                    prevList = groupedTracks[targetList - i++];
                }
                if (prevList) {
                    // If there's a previous list, make this tracks's index previous list's last item's index + 1
                    let lastIndexOfPrevList = prevList.tracks[prevList.tracks.length - 1].index;
                    newIndex = lastIndexOfPrevList + 1;
                } else newIndex = 0; // Else default to index 0
            } else {
                newIndex = groupedTracks[targetList].tracks[0].index + targetIndex;
            }
        }

        if (movedItem.index !== newIndex) {
            await serviceRegistry!.netmdService!.moveTrack(movedItem.index, newIndex, false);
        }

        movedItem.index = newIndex;
        groupedTracks[targetList].tracks.splice(targetIndex, 0, movedItem);
        let ungrouped = [];

        // Recompile the groups and update them on the player
        let normalGroups = [];
        for (let group of groupedTracks) {
            if (group.tracks.length === 0) continue;
            if (group.index === -1) ungrouped.push(...group.tracks);
            else normalGroups.push(group);
        }
        if (ungrouped.length)
            normalGroups.unshift({
                index: 0,
                title: null,
                fullWidthTitle: null,
                tracks: ungrouped,
            });
        await serviceRegistry.netmdService!.rewriteGroups(normalGroups);
        listContent()(dispatch);
    };
}

export function addService(info: ServiceConstructionInfo) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const { availableServices } = getState().appState;
        dispatch(appStateActions.setAvailableServices([...availableServices, info]));
    };
}

export function deleteService(index: number) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        if (index < getSimpleServices().length) return;
        let availableServices = [...getState().appState.availableServices];
        availableServices.splice(index, 1);
        dispatch(appStateActions.setLastSelectedService(0));
        dispatch(appStateActions.setAvailableServices(availableServices));
    };
}

export function pair(serviceInstance: NetMDService) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        dispatch(batchActions([appStateActions.setPairingFailed(false), appStateActions.setFactoryModeRippingInMainUi(false)]));

        serviceRegistry.mediaSessionService?.init(); // no need to await

        serviceRegistry.audioExportService = new AudioServices[getState().appState.audioExportService].create(
            getState().appState.audioExportServiceConfig
        );
        await serviceRegistry.audioExportService!.init();

        serviceRegistry.netmdService = serviceInstance;
        serviceRegistry.netmdFactoryService = undefined;

        try {
            let connected = await serviceRegistry.netmdService!.connect();
            if (connected) {
                dispatch(appStateActions.setMainView('MAIN'));
                return;
            }
        } catch (err) {
            console.error(err);
            // In case of error, just log and try to pair
        }

        try {
            let paired = await serviceRegistry.netmdService!.pair();
            if (paired) {
                dispatch(
                    batchActions([
                        appStateActions.setMainView('MAIN'),
                        errorDialogAction.setErrorMessage(''),
                        errorDialogAction.setVisible(false),
                    ])
                );
                return;
            }
            dispatch(batchActions([appStateActions.setPairingMessage(`Connection Failed`), appStateActions.setPairingFailed(true)]));
        } catch (err) {
            console.error(err);
            let message = (err as Error).message;
            dispatch(batchActions([appStateActions.setPairingMessage(message), appStateActions.setPairingFailed(true)]));
        }
    };
}

export function listContent(dropCache: boolean = false) {
    return async function (dispatch: AppDispatch) {
        // Issue loading
        dispatch(appStateActions.setLoading(true));
        let disc = null;
        let deviceStatus = null;
        try {
            deviceStatus = await serviceRegistry.netmdService!.getDeviceStatus();
        } catch (e) {
            console.log('listContent: Cannot get device status');
        }
        let deviceName = await serviceRegistry.netmdService!.getDeviceName();
        let deviceCapabilities = await serviceRegistry.netmdService!.getServiceCapabilities();

        if (deviceStatus?.discPresent) {
            try {
                disc = await serviceRegistry.netmdService!.listContent(dropCache);
            } catch (err) {
                console.log(err);
                if (!(err as any).message.startsWith('Rejected')) {
                    if (
                        window.confirm(
                            "This disc's title seems to be corrupted, do you wish to erase it?\nNone of the tracks will be deleted."
                        )
                    ) {
                        await serviceRegistry.netmdService!.wipeDiscTitleInfo();
                        disc = await serviceRegistry.netmdService!.listContent(true);
                    } else throw err;
                }
            }
        }
        dispatch(
            batchActions([
                mainActions.setDisc(disc),
                mainActions.setDeviceName(deviceName),
                mainActions.setDeviceStatus(deviceStatus),
                mainActions.setDeviceCapabilities(deviceCapabilities),
                appStateActions.setLoading(false),
            ])
        );
    };
}

export function renameTrack(...entries: { index: number; newName: string; newFullWidthName?: string }[]) {
    return async function (dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        dispatch(batchActions([renameDialogActions.setVisible(false), appStateActions.setLoading(true)]));
        try {
            for (const { index, newName, newFullWidthName } of entries) {
                await netmdService!.renameTrack(index, newName, newFullWidthName);
            }
        } catch (err) {
            console.error(err);
            dispatch(
                batchActions([
                    errorDialogAction.setVisible(true),
                    errorDialogAction.setErrorMessage(`Rename failed.`),
                    appStateActions.setLoading(false),
                ])
            );
        }
        listContent()(dispatch);
    };
}

export function renameDisc({ newName, newFullWidthName }: { newName: string; newFullWidthName?: string }) {
    return async function (dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        await netmdService!.renameDisc(
            newName.replace(/\/\//g, ' /'), // Make sure the title doesn't interfere with the groups
            newFullWidthName?.replace(/／／/g, '／')
        );
        dispatch(renameDialogActions.setVisible(false));
        listContent()(dispatch);
    };
}

export function deleteTracks(indexes: number[]) {
    return async function (dispatch: AppDispatch) {
        const confirmation = window.confirm(
            `Proceed with Delete Track${indexes.length !== 1 ? 's' : ''}? This operation cannot be undone.`
        );
        if (!confirmation) {
            return;
        }
        const { netmdService } = serviceRegistry;
        dispatch(appStateActions.setLoading(true));
        await netmdService!.deleteTracks(indexes);
        listContent()(dispatch);
    };
}

export function wipeDisc() {
    return async function (dispatch: AppDispatch) {
        const confirmation = window.confirm(`Proceed with Wipe Disc? This operation cannot be undone.`);
        if (!confirmation) {
            return;
        }
        const { netmdService } = serviceRegistry;
        dispatch(appStateActions.setLoading(true));
        await netmdService!.wipeDisc();
        listContent()(dispatch);
    };
}

export function ejectDisc() {
    return async function (dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        netmdService!.ejectDisc();
        dispatch(mainActions.setDisc(null));
    };
}

export function moveTrack(srcIndex: number, destIndex: number) {
    return async function (dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        await netmdService!.moveTrack(srcIndex, destIndex);
        listContent()(dispatch);
    };
}

export function downloadTracks(indexes: number[]) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        dispatch(
            batchActions([
                recordDialogAction.setVisible(true),
                recordDialogAction.setProgress({ trackTotal: indexes.length, trackDone: 0, trackCurrent: 0, titleCurrent: '' }),
            ])
        );

        let disc = getState().main.disc;
        let tracks = getTracks(disc!).filter(t => indexes.indexOf(t.index) >= 0);

        const { netmdService } = serviceRegistry;

        for (let [i, track] of tracks.entries()) {
            dispatch(
                recordDialogAction.setProgress({
                    trackTotal: tracks.length,
                    trackDone: i,
                    trackCurrent: -1,
                    titleCurrent: track.title ?? '',
                })
            );
            try {
                const { data } = (await netmdService!.download(track.index, ({ read, total }) => {
                    dispatch(
                        recordDialogAction.setProgress({
                            trackTotal: tracks.length,
                            trackDone: i,
                            trackCurrent: (100 * read) / total,
                            titleCurrent: track.title ?? '',
                        })
                    );
                })) as { format: DiscFormat; data: Uint8Array };
                const fileName = createDownloadTrackName(track);
                downloadBlob(new Blob([data], { type: 'application/octet-stream' }), fileName);
            } catch (err) {
                console.error(err);
                dispatch(
                    batchActions([
                        recordDialogAction.setVisible(false),
                        errorDialogAction.setVisible(true),
                        errorDialogAction.setErrorMessage(`Download failed. Are you using a disc recorded by SonicStage?`),
                    ])
                );
            }
        }

        dispatch(recordDialogAction.setVisible(false));
    };
}

export function recordTracks(indexes: number[], deviceId: string) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        dispatch(
            batchActions([
                recordDialogAction.setVisible(true),
                recordDialogAction.setProgress({ trackTotal: indexes.length, trackDone: 0, trackCurrent: 0, titleCurrent: '' }),
            ])
        );

        let disc = getState().main.disc;
        let tracks = getTracks(disc!).filter(t => indexes.indexOf(t.index) >= 0);

        const { netmdService, mediaRecorderService } = serviceRegistry;
        await serviceRegistry.netmdService!.stop();

        for (let [i, track] of tracks.entries()) {
            dispatch(
                recordDialogAction.setProgress({
                    trackTotal: tracks.length,
                    trackDone: i,
                    trackCurrent: -1,
                    titleCurrent: track.title ?? '',
                })
            );

            // Wait for the track to be ready to play from 0:00
            await netmdService!.gotoTrack(track.index);
            await netmdService!.play();
            console.log('Waiting for track to be ready to play');
            let position = await netmdService!.getPosition();
            let expected = [track.index, 0, 0, 1];
            while (position === null || !expected.every((_, i) => expected[i] === position![i])) {
                await sleep(250);
                position = await netmdService!.getPosition();
            }
            await netmdService!.pause();
            await netmdService?.gotoTrack(track.index);
            console.log('Track is ready to play');

            // Start recording and play track
            await mediaRecorderService?.initStream(deviceId);
            await mediaRecorderService?.startRecording();
            await netmdService!.play();

            // Wait until track is finished
            let durationInSec = framesToSec(track.duration);
            // await sleep(durationInSec * 1000);
            await sleepWithProgressCallback(durationInSec * 1000, (perc: number) => {
                dispatch(
                    recordDialogAction.setProgress({
                        trackTotal: tracks.length,
                        trackDone: i,
                        trackCurrent: perc,
                        titleCurrent: track.title ?? '',
                    })
                );
            });

            // Stop recording and download the wav
            await mediaRecorderService?.stopRecording();
            let title;
            if (track.title) {
                title = `${track.index + 1}. ${track.title}`;
                if (track.fullWidthTitle) {
                    title += ` (${track.fullWidthTitle})`;
                }
            } else if (track.fullWidthTitle) {
                title = `${track.index + 1}. ${track.fullWidthTitle}`;
            } else {
                title = `Track ${track.index + 1}`;
            }
            mediaRecorderService?.downloadRecorded(`${title}`);

            await mediaRecorderService?.closeStream();
        }

        await netmdService!.stop();
        dispatch(recordDialogAction.setVisible(false));
    };
}

export function renameInConvertDialog({ index, newName, newFullWidthName }: { index: number; newName: string; newFullWidthName: string }) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        let newTitles = [...getState().convertDialog.titles];
        newTitles.splice(index, 1, {
            ...newTitles[index],
            title: newName,
            fullWidthTitle: newFullWidthName,
        });
        dispatch(convertDialogActions.setTitles(newTitles));
    };
}

export function selfTest() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        if (!window.confirm('Warning - This is a destructive self test. THE DISC WILL BE ERASED! Continue?')) return;

        const { netmdService } = serviceRegistry;

        const allTracks = (disc: Disc) => disc.groups.sort((a, b) => a.tracks[0].index - b.tracks[0].index).flatMap(n => n.tracks);

        const compareOrThrow = (a: any, b: any) => {
            if (a === b) return true;
            throw new Error(`Compare: ${a} and ${b} is not the same.`);
        };

        const tests = [
            {
                name: 'Reload TOC',
                func: async () => {
                    await netmdService!.listContent();
                    return true;
                },
            },
            {
                name: 'Rename Disc',
                func: async () => {
                    const titleToSet = 'Self-Test Half-Width';
                    await netmdService!.renameDisc(titleToSet);
                    return compareOrThrow((await netmdService!.listContent()).title, titleToSet);
                },
            },
            {
                name: 'Full-Width Rename Disc',
                func: async () => {
                    const titleToSet = 'Ｓｅｌｆ－Ｔｅｓｔ\u3000Ｆｕｌｌ－Ｗｉｄｔｈ';
                    await netmdService!.renameDisc('1', titleToSet);
                    return compareOrThrow((await netmdService!.listContent()).fullWidthTitle, titleToSet);
                },
            },
            {
                name: 'Rename Track 1, 2',
                func: async () => {
                    await netmdService!.renameTrack(0, '1');
                    await netmdService!.renameTrack(1, '2');
                    const content = allTracks(await netmdService!.listContent());
                    return compareOrThrow(content[0].title, '1') && compareOrThrow(content[1].title, '2');
                },
            },
            {
                name: 'Full-Width Rename Track 1',
                func: async () => {
                    const titleToSet = 'Ｓｅｌｆ－Ｔｅｓｔ\u3000Ｔｒａｃｋ\u3000Ｆｕｌｌ－Ｗｉｄｔｈ';
                    await netmdService!.renameTrack(1, '2', titleToSet);
                    return compareOrThrow(allTracks(await netmdService!.listContent())[1].fullWidthTitle, titleToSet);
                },
            },
            {
                name: 'Move Track 1 to 2',
                func: async () => {
                    await netmdService!.moveTrack(0, 1, false);
                    const content = allTracks(await netmdService!.listContent());
                    return compareOrThrow(content[0].title, '2') && compareOrThrow(content[1].title, '1');
                },
            },
            {
                name: 'Play Track 1',
                func: async () => {
                    await netmdService!.gotoTrack(0);
                    await netmdService!.play();
                    await sleep(1000);
                    return true;
                },
            },
            {
                name: 'Next Track',
                func: async () => {
                    await netmdService!.next();
                    await sleep(1000);
                    return true;
                },
            },
            {
                name: 'Previous Track',
                func: async () => {
                    await netmdService!.prev();
                    await sleep(1000);
                    return true;
                },
            },
            {
                name: 'Go To Track 2',
                func: async () => {
                    await netmdService!.gotoTrack(1);
                    await sleep(1000);
                    return true;
                },
            },
            {
                name: 'Pause',
                func: async () => {
                    await netmdService!.pause();
                    await sleep(1000);
                    return true;
                },
            },
            {
                name: 'Stop',
                func: async () => {
                    await netmdService!.stop();
                    await sleep(1000);
                    return true;
                },
            },
            {
                name: 'Delete Track 1',
                func: async () => {
                    const beforeDelete = allTracks(await netmdService!.listContent()).length;
                    await netmdService!.deleteTracks([0]);
                    const afterDelete = allTracks(await netmdService!.listContent()).length;
                    return compareOrThrow(beforeDelete, afterDelete + 1);
                },
            },
            {
                name: 'Erase Disc',
                func: async () => {
                    await netmdService!.wipeDisc();
                    return compareOrThrow(allTracks(await netmdService!.listContent()).length, 0);
                },
            },
        ];

        const progress = { trackTotal: tests.length, trackDone: 0, trackCurrent: 0, titleCurrent: '' };

        // As this isn't a feature that's going to be used a lot, I decided to just use the recording dialog for it
        // And not define a new one.
        dispatch(batchActions([recordDialogAction.setVisible(true), recordDialogAction.setProgress(progress)]));

        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            progress.trackCurrent = (i / (tests.length - 1)) * 100;
            progress.trackDone = i;
            progress.titleCurrent = `Self-Test: ${test.name}`;
            dispatch(recordDialogAction.setProgress(progress));
            console.group(`Test: ${test.name}`);
            let success = false;
            try {
                success = await test.func();
            } catch (ex) {
                console.log(ex);
            }
            if (!success) {
                console.log('FAIL');
                console.groupEnd();
                progress.titleCurrent = `Self-Test: ${test.name} - FAILED`;
                dispatch(recordDialogAction.setProgress(progress));
                alert(`Test '${test.name}' has failed. There's more info in the console.`);
                return;
            }
            console.log('PASS');
            console.groupEnd();
            progress.titleCurrent = `Self-Test: ${test.name} - PASSED`;
            dispatch(recordDialogAction.setProgress(progress));
            await sleep(250); //Just to see what's happening
        }
        alert('All tests have passed. The page will now reload');
        await sleep(1000);
        window.location.reload();
        dispatch(recordDialogAction.setVisible(false));
    };
}
export function setNotifyWhenFinished(value: boolean) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        if (Notification.permission !== 'granted') {
            const confirmation = window.confirm(`Enable Notification on recording completed?`);
            if (!confirmation) {
                return;
            }
            const result = await askNotificationPermission();
            if (result !== 'granted') {
                dispatch(appStateActions.setNotificationSupport(false));
                dispatch(appStateActions.setNotifyWhenFinished(false));
                return;
            }
        }
        dispatch(appStateActions.setNotifyWhenFinished(value));
    };
}

const csvHeader = ['INDEX', 'GROUP RANGE', 'GROUP NAME', 'GROUP FULL WIDTH NAME', 'NAME', 'FULL WIDTH NAME', 'DURATION', 'ENCODING'];

export function exportCSV() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        dispatch(appStateActions.setLoading(true));
        const disc = await serviceRegistry.netmdService!.listContent();
        const rows: any[][] = [];
        rows.push([
            0, // track index - 0 is disc title
            '0-0', // No group range
            '', // No group name
            '', // No group fw name
            disc.title ?? '',
            disc.fullWidthTitle ?? '',
            Math.round(framesToSec(disc.used)),
            '',
        ]);
        for (const group of disc.groups) {
            const groupStart = Math.min(...group.tracks.map(e => e.index));
            const groupEnd = Math.max(...group.tracks.map(e => e.index));
            const groupRange = group.index === 0 ? '' : `${groupStart}-${groupEnd}`;
            for (const track of group.tracks) {
                rows.push([
                    track.index + 1,
                    groupRange,
                    group.title ?? '',
                    group.fullWidthTitle ?? '',
                    track.title ?? '',
                    track.fullWidthTitle ?? '',
                    Math.round(framesToSec(track.duration)),
                    EncodingName[track.encoding],
                ]);
            }
        }
        let csvDocument = [csvHeader, ...rows].map(e => e.map(q => q.toString().replace(/,/g, '\\,')).join(',')).join('\n');

        let title;
        if (disc.title) {
            title = disc.title;
            if (disc.fullWidthTitle) {
                title += ` (${disc.fullWidthTitle})`;
            }
        } else if (disc.fullWidthTitle) {
            title = disc.fullWidthTitle;
        } else {
            title = 'Disc';
        }

        downloadBlob(new Blob([csvDocument]), title + '.csv');
        dispatch(appStateActions.setLoading(false));
    };
}

export function importCSV(file: File) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const text = new TextDecoder('utf-8').decode(await file.arrayBuffer());
        const records = text
            .split('\n')
            .map(e => e.trim())
            .filter(e => e.length !== 0)
            .map(e => e.split(/(?<!\\),/g));

        if (records.length === 0 || records[0].some((e, i) => e !== csvHeader[i])) {
            alert('Malformed CSV file');
            return;
        }

        let addedGroupRanges = new Set<string>();

        const isTimeDifferenceAcceptable = (a: number, b: number) => Math.abs(a - b) < 2;

        // Make sure the CSV matches the disc
        dispatch(appStateActions.setLoading(true));
        const disc = await serviceRegistry.netmdService!.listContent();
        const ungroupedTracks = getTracks(disc).sort((a, b) => a.index - b.index);
        if (disc.trackCount !== records.length - 2) {
            // - 2 - one for the header, second for the disc title / info
            if (
                !window.confirm(
                    `The CSV file describes a disc with ${records.length - 2} tracks.\nThe disc inserted has ${disc.trackCount
                    } tracks.\nContinue importing?`
                )
            ) {
                dispatch(appStateActions.setLoading(false));
                return;
            }
        }

        await serviceRegistry.netmdService!.wipeDiscTitleInfo();

        for (let [sIndex, gRange, groupName, groupFullWidthName, name, fwName, sDuration, encoding] of records.slice(1)) {
            let index = parseInt(sIndex),
                duration = parseInt(sDuration);
            gRange = gRange.replace(/ /g, '');
            if (index === 0) {
                // Disc title info
                await serviceRegistry.netmdService!.renameDisc(name, fwName);
                continue;
            }

            let currentTrackEncoding = EncodingName[ungroupedTracks[index - 1].encoding];
            if (
                !isTimeDifferenceAcceptable(framesToSec(ungroupedTracks[index - 1].duration), duration) ||
                currentTrackEncoding !== encoding
            ) {
                if (
                    !window.confirm(
                        `
                    The CSV file describes track ${index} as a ${secondsToNormal(duration)} ${encoding} track.
                    The actual track${index} is a ${secondsToNormal(
                            framesToSec(ungroupedTracks[index - 1].duration)
                        )} ${currentTrackEncoding} track.
                    Label it according to the file?
                `.trim()
                    )
                ) {
                    continue;
                }
            }

            if (gRange !== '') {
                // Is part of group
                if (!addedGroupRanges.has(gRange)) {
                    addedGroupRanges.add(gRange);
                    const [startS, endS] = gRange.split('-');
                    let start = parseInt(startS),
                        end = parseInt(endS),
                        length = end - start + 1;
                    await serviceRegistry.netmdService!.addGroup(start, length, groupName, groupFullWidthName);
                }
            }

            await serviceRegistry.netmdService!.renameTrack(index - 1, name, fwName);
        }

        listContent()(dispatch);
    };
}

export const WireformatDict: { [k: string]: Wireformat } = {
    SP: Wireformat.pcm,
    LP2: Wireformat.lp2,
    LP105: Wireformat.l105kbps,
    LP4: Wireformat.lp4,
};

export function openRecognizeTrackDialog() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const { deviceCapabilities } = getState().main;
        if (deviceCapabilities.length > 0 && !deviceCapabilities.includes(Capability.factoryMode)) {
            dispatch(songRecognitionDialogActions.setImportMethod('line-in'));
        }

        dispatch(
            batchActions([
                songRecognitionDialogActions.setTitles(
                    getTracks(getState().main.disc!)
                        .sort((a, b) => a.index - b.index)
                        .map(track => ({
                            originalTitle: track.title ?? '',
                            originalFullWidthTitle: track.fullWidthTitle ?? '',
                            index: track.index,

                            newTitle: '',
                            newFullWidthTitle: '',

                            songAlbum: '',
                            songArtist: '',
                            songTitle: '',

                            alreadyRecognized: false,
                            recognizeFail: false,
                        }))
                ),
                songRecognitionDialogActions.setVisible(true),
            ])
        );
    };
}

export function recognizeTracks(indices: number[], mode: 'exploits' | 'line-in', inputModeConfiguration?: { deviceId?: string }) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const shazam = new Shazam();

        // Bypass CORS
        shazam.endpoint.sendRecognizeRequest = async (url: string, body: string) => {
            return await window.native!.unrestrictedFetchJSON(url, {
                method: 'POST',
                body,
                headers: shazam.endpoint.headers(),
            });
        };

        const tracks = [...getState().songRecognitionDialog.titles];

        dispatch(
            batchActions([
                songRecognitionProgressDialogActions.setCancelled(false),
                songRecognitionProgressDialogActions.setVisible(true),
                songRecognitionProgressDialogActions.setCurrentTrack(0),
                songRecognitionProgressDialogActions.setTotalTracks(indices.length),
            ])
        );

        let i = 0;
        for (let index of indices) {
            dispatch(songRecognitionProgressDialogActions.setCurrentTrack(i++));

            // 6 tries to get the song right:
            const track = getTracks(getState().main.disc!).find(e => e.index === index)!;

            const transcodeAnyToValid = async (data: Uint8Array, extension: string) => {
                let ffmpegProcess = createWorker({
                    logger: (payload: any) => {
                        console.log(payload.action, payload.message);
                    },
                    corePath: getPublicPathFor('ffmpeg-core.js'),
                    workerPath: getPublicPathFor('worker.min.js'),
                });
                await ffmpegProcess.load();

                await ffmpegProcess.write(`audio.${extension}`, data);
                try {
                    await ffmpegProcess.transcode(`audio.${extension}`, `raw`, '-ar 16000 -ac 1 -f s16le');
                } catch (er) {
                    console.log(er);
                }
                const rawSamples = (await ffmpegProcess.read(`raw`)).data;
                await ffmpegProcess.worker.terminate();
                return rawSamples;
            };

            for (let offset = 0; offset < 48; offset += 8) {
                let rawSamples: Uint8Array;
                dispatch(
                    batchActions([
                        songRecognitionProgressDialogActions.setCurrentStep(0),
                        songRecognitionProgressDialogActions.setCurrentStepProgress(0),
                        songRecognitionProgressDialogActions.setCurrentStepTotal(1),
                    ])
                );

                const optimalStartSeconds = Math.floor(framesToSec(track.duration) / 2) + offset;

                if (mode === 'exploits') {
                    if (!(await checkIfAtracDownloadPossible())) {
                        window.alert(
                            'Cannot enable homebrew mode ripping in main UI.\nThis device is not supported yet.\nStay tuned for future updates.'
                        );
                        dispatch(songRecognitionProgressDialogActions.setVisible(false));
                        return;
                    }
                    // Download the track

                    let atracData = await serviceRegistry.netmdFactoryService!.exploitDownloadTrack(
                        index,
                        e =>
                            dispatch(
                                batchActions([
                                    songRecognitionProgressDialogActions.setCurrentStepProgress(e.read),
                                    songRecognitionProgressDialogActions.setCurrentStepTotal(e.total),
                                ])
                            ),
                        {
                            secondsToRead: 16,
                            startSeconds: optimalStartSeconds,
                            writeHeader: true,
                        }
                    );

                    dispatch(
                        batchActions([
                            songRecognitionProgressDialogActions.setCurrentStepProgress(-1),
                            songRecognitionProgressDialogActions.setCurrentStepTotal(0),
                            songRecognitionProgressDialogActions.setCurrentStep(1),
                        ])
                    );

                    let extension = [Encoding.lp2, Encoding.lp4].includes(track.encoding) ? 'wav' : 'aea';
                    rawSamples = await transcodeAnyToValid(atracData, extension);
                } else {
                    const deviceId = inputModeConfiguration!.deviceId!;
                    dispatch(songRecognitionProgressDialogActions.setCurrentStepTotal(100));

                    const { mediaRecorderService, netmdService } = serviceRegistry;
                    await netmdService?.stop();
                    await netmdService?.gotoTrack(track.index);
                    await netmdService?.gotoTime(
                        track.index,
                        Math.floor(optimalStartSeconds / 3600),
                        Math.floor((optimalStartSeconds % 3600) / 60),
                        optimalStartSeconds % 60,
                        0
                    );
                    await netmdService?.play();
                    await mediaRecorderService?.initStream(deviceId);
                    await mediaRecorderService?.startRecording();
                    await sleepWithProgressCallback(16 * 1000, (perc: number) => {
                        dispatch(songRecognitionProgressDialogActions.setCurrentStepProgress(perc));
                    });
                    await mediaRecorderService?.stopRecording();
                    await netmdService?.stop();
                    dispatch(
                        batchActions([
                            songRecognitionProgressDialogActions.setCurrentStepProgress(-1),
                            songRecognitionProgressDialogActions.setCurrentStepTotal(0),
                            songRecognitionProgressDialogActions.setCurrentStep(1),
                        ])
                    );
                    const rawWav = await new Promise<Uint8Array>(res =>
                        mediaRecorderService!.recorder.exportWAV(async (blob: Blob) => res(new Uint8Array(await blob.arrayBuffer())))
                    );
                    rawSamples = await transcodeAnyToValid(rawWav, 'wav');
                    await mediaRecorderService?.closeStream();
                }
                dispatch(batchActions([songRecognitionProgressDialogActions.setCurrentStepProgress(-1)]));

                const samplesArray = [];
                for (let i = 0; i < rawSamples.length / 2; i++) {
                    samplesArray.push(rawSamples[2 * i] | (rawSamples[2 * i + 1] << 8));
                }
                const songData = await shazam.recognizeSong(samplesArray, state =>
                    dispatch(songRecognitionProgressDialogActions.setCurrentStep(state === 'generating' ? 1 : 2))
                );
                if (songData !== null) {
                    tracks[index] = {
                        ...tracks[index],
                        alreadyRecognized: true,
                        recognizeFail: false,

                        songTitle: songData.title,
                        songArtist: songData.artist,
                        songAlbum: songData.album ?? 'Unknown',
                    };
                    break;
                } else {
                    tracks[index] = {
                        ...tracks[index],
                        recognizeFail: true,
                    };
                }
                if (getState().songRecognitionProgressDialog.cancelled) break;
            }
        }

        dispatch(batchActions([songRecognitionDialogActions.setTitles(tracks), songRecognitionProgressDialogActions.setVisible(false)]));
    };
}

export function convertAndUpload(
    files: TitledFile[],
    format: UploadFormat,
    additionalParameters?: { loudnessTarget?: number; enableReplayGain: boolean }
) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const { audioExportService, netmdService } = serviceRegistry;
        const wireformat = WireformatDict[format];

        let screenWakeLock: any = null;
        if ('wakeLock' in navigator) {
            try {
                screenWakeLock = await (navigator as any).wakeLock.request('screen');
            } catch (ex) {
                console.log(ex);
            }
        }

        await netmdService?.stop();
        dispatch(batchActions([uploadDialogActions.setVisible(true), uploadDialogActions.setCancelUpload(false)]));

        let lastProgress = new Date().getTime();
        const updateProgressCallback = ({ written, encrypted, total }: { written: number; encrypted: number; total: number }) => {
            let now = new Date().getTime();
            if (now - lastProgress > 200) {
                queueMicrotask(() => dispatch(uploadDialogActions.setWriteProgress({ written, encrypted, total })));
                lastProgress = now;
            }
        };

        const hasUploadBeenCancelled = () => {
            return getState().uploadDialog.cancelled;
        };

        const releaseScreenLockIfPresent = () => {
            if (screenWakeLock) {
                screenWakeLock.release();
            }
        };

        function showFinishedNotificationIfNeeded() {
            const { notifyWhenFinished, hasNotificationSupport } = getState().appState;
            if (!hasNotificationSupport || !notifyWhenFinished) {
                return;
            }
            const notification = new Notification('MiniDisc recording completed', {
                icon: NotificationCompleteIconUrl,
            });
            notification.onclick = function () {
                window.focus();
                this.close();
            };
        }

        let trackUpdate: {
            current: number;
            converting: number;
            total: number;
            titleCurrent: string;
            titleConverting: string;
        } = {
            current: 0,
            converting: 0,
            total: files.length,
            titleCurrent: '',
            titleConverting: '',
        };
        const updateTrack = () => {
            dispatch(uploadDialogActions.setTrackProgress(trackUpdate));
        };

        let conversionIterator = async function* (files: TitledFile[]) {
            let converted: Promise<{ file: TitledFile; data: ArrayBuffer }>[] = [];

            let i = 0;
            function convertNext() {
                if (i === files.length || hasUploadBeenCancelled()) {
                    trackUpdate.converting = i;
                    trackUpdate.titleConverting = ``;
                    updateTrack();
                    return;
                }

                let f = files[i];
                trackUpdate.converting = i;
                trackUpdate.titleConverting = f.title;
                updateTrack();
                i++;

                if (f.forcedEncoding === null) {
                    // This is not an ATRAC file
                    converted.push(
                        new Promise(async (resolve, reject) => {
                            let data: ArrayBuffer;
                            try {
                                await audioExportService!.prepare(f.file);
                                data = await audioExportService!.export({
                                    format,
                                    loudnessTarget: additionalParameters?.loudnessTarget,
                                    enableReplayGain: additionalParameters?.enableReplayGain,
                                });
                                convertNext();
                                resolve({ file: f, data: data });
                            } catch (err) {
                                error = err;
                                errorMessage = `${f.file.name}: Unsupported or unrecognized format`;
                                reject(err);
                            }
                        })
                    );
                } else {
                    // This is already an ATRAC file - don't reencode.
                    converted.push(
                        new Promise(async resolve => {
                            // Remove the WAV header.
                            convertNext();
                            resolve({ file: f, data: (await f.file.arrayBuffer()).slice(f.bytesToSkip) });
                        })
                    );
                }
            }
            convertNext();

            let j = 0;
            while (j < converted.length) {
                yield await converted[j];
                delete converted[j];
                j++;
            }
        };

        let disc = getState().main.disc;
        let useFullWidth = getState().appState.fullWidthSupport;
        let { halfWidth: availableHalfWidthCharacters, fullWidth: availableFullWidthCharacters } = getRemainingCharactersForTitles(disc!);

        let error: any;
        let errorMessage = ``;
        let i = 1;
        await netmdService?.prepareUpload();
        for await (let item of conversionIterator(files)) {
            if (hasUploadBeenCancelled()) {
                break;
            }

            const { file, data } = item;

            let title = file.title;

            const fixLength = (l: number) => Math.max(Math.ceil(l / 7) * 7, 7);
            let halfWidthTitle = title.substring(0, Math.min(getHalfWidthTitleLength(title), availableHalfWidthCharacters));
            availableHalfWidthCharacters -= fixLength(getHalfWidthTitleLength(halfWidthTitle));

            let fullWidthTitle = file.fullWidthTitle;
            if (useFullWidth) {
                fullWidthTitle = fullWidthTitle.substring(
                    0,
                    Math.min(fullWidthTitle.length * 2, availableFullWidthCharacters, 210 /* limit is 105 */) / 2
                );
                availableFullWidthCharacters -= fixLength(fullWidthTitle.length * 2);
            }

            trackUpdate.current = i++;
            trackUpdate.titleCurrent = halfWidthTitle;
            updateTrack();
            updateProgressCallback({ written: 0, encrypted: 0, total: 100 });
            try {
                let formatOverride = file.forcedEncoding === null ? wireformat : WireformatDict[file.forcedEncoding];
                await netmdService?.upload(halfWidthTitle, fullWidthTitle, data, formatOverride, updateProgressCallback);
            } catch (err) {
                error = err;
                errorMessage = `${file.file.name}: Error uploading to device. There might not be enough space left, or an unknown error occurred.`;
                break;
            }
        }
        await netmdService?.finalizeUpload();

        let actionToDispatch: AnyAction[] = [uploadDialogActions.setVisible(false)];

        if (error) {
            console.error(error);
            actionToDispatch = actionToDispatch.concat([
                errorDialogAction.setVisible(true),
                errorDialogAction.setErrorMessage(errorMessage),
            ]);
        }

        dispatch(batchActions(actionToDispatch));
        showFinishedNotificationIfNeeded();
        releaseScreenLockIfPresent();
        listContent()(dispatch);
    };
}
