import { batchActions } from 'redux-batched-actions';
import { AppDispatch, RootState } from './store';
import { actions as uploadDialogActions } from './upload-dialog-feature';
import { actions as renameDialogActions } from './rename-dialog-feature';
import { actions as errorDialogAction } from './error-dialog-feature';
import { actions as recordDialogAction } from './record-dialog-feature';
import { actions as factoryActions } from './factory-feature';
import { actions as appStateActions } from './app-feature';
import { actions as mainActions } from './main-feature';
import { actions as convertDialogActions } from './convert-dialog-feature';
import { actions as factoryProgressDialogActions } from './factory-progress-dialog-feature';
import serviceRegistry from '../services/registry';
import { Wireformat, getTracks, Disc, DiscFormat, getRemainingCharactersForTitles, Track, Encoding } from 'netmd-js';
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
} from '../utils';
import { UploadFormat } from './convert-dialog-feature';
import NotificationCompleteIconUrl from '../images/record-complete-notification-icon.png';
import { assertNumber, concatUint8Arrays, getHalfWidthTitleLength } from 'netmd-js/dist/utils';
import { NetMDService, NetMDFactoryService, ExploitCapability } from '../services/netmd';
import { getSimpleServices, ServiceConstructionInfo } from '../services/service-manager';
import { parseTOC, getTitleByTrackNumber, reconstructTOC } from 'netmd-tocmanip';

export function control(action: 'play' | 'stop' | 'next' | 'prev' | 'goto' | 'pause' | 'seek', params?: unknown) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        await serviceRegistry!.netmdService?.renameGroup(groupIndex, newName, newFullWidthName);
        listContent()(dispatch);
    };
}

export function groupTracks(indexes: number[]) {
    return async function(dispatch: AppDispatch) {
        let begin = indexes[0];
        let length = indexes[indexes.length - 1] - begin + 1;
        const { netmdService } = serviceRegistry;

        netmdService!.addGroup(begin, length, '');
        listContent()(dispatch);
    };
}

export function deleteGroups(indexes: number[]) {
    return async function(dispatch: AppDispatch) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        const { availableServices } = getState().appState;
        dispatch(appStateActions.setAvailableServices([...availableServices, info]));
    };
}

export function deleteService(index: number) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        if (index < getSimpleServices().length) return;
        let availableServices = [...getState().appState.availableServices];
        availableServices.splice(index, 1);
        dispatch(appStateActions.setLastSelectedService(0));
        dispatch(appStateActions.setAvailableServices(availableServices));
    };
}

export function pair(serviceInstance: NetMDService) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(batchActions([appStateActions.setPairingFailed(false), appStateActions.setFactoryModeRippingInMainUi(false)]));

        serviceRegistry.mediaSessionService?.init(); // no need to await
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
                dispatch(appStateActions.setMainView('MAIN'));
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

export function listContent() {
    return async function(dispatch: AppDispatch) {
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
                disc = await serviceRegistry.netmdService!.listContent();
            } catch (err) {
                console.log(err);
                if (!(err as any).message.startsWith('Rejected')) {
                    if (
                        window.confirm(
                            "This disc's title seems to be corrupted, do you wish to erase it?\nNone of the tracks will be deleted."
                        )
                    ) {
                        await serviceRegistry.netmdService!.wipeDiscTitleInfo();
                        disc = await serviceRegistry.netmdService!.listContent();
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

export function renameTrack({ index, newName, newFullWidthName }: { index: number; newName: string; newFullWidthName?: string }) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        dispatch(renameDialogActions.setVisible(false));
        try {
            await netmdService!.renameTrack(index, newName, newFullWidthName);
        } catch (err) {
            console.error(err);
            dispatch(batchActions([errorDialogAction.setVisible(true), errorDialogAction.setErrorMessage(`Rename failed.`)]));
        }
        listContent()(dispatch);
    };
}

export function renameDisc({ newName, newFullWidthName }: { newName: string; newFullWidthName?: string }) {
    return async function(dispatch: AppDispatch) {
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
    return async function(dispatch: AppDispatch) {
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
    return async function(dispatch: AppDispatch) {
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
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        netmdService!.ejectDisc();
        dispatch(mainActions.setDisc(null));
    };
}

export function moveTrack(srcIndex: number, destIndex: number) {
    return async function(dispatch: AppDispatch) {
        const { netmdService } = serviceRegistry;
        await netmdService!.moveTrack(srcIndex, destIndex);
        listContent()(dispatch);
    };
}

function createDownloadTrackName(track: Track) {
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
    const fileName = title + ([Encoding.lp2, Encoding.lp4].includes(track.encoding) ? '.wav' : '.aea');
    return fileName;
}

export function downloadTracks(indexes: number[]) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
            const arrayShallowEquals = <T>(a: T[], b: T[]) => a.length === b.length && a.every((n, i) => b[i] === n);
            while (position === null || !arrayShallowEquals(expected, position)) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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

export const WireformatDict: { [k: string]: Wireformat } = {
    SP: Wireformat.pcm,
    LP2: Wireformat.lp2,
    LP105: Wireformat.l105kbps,
    LP4: Wireformat.lp4,
};

export function convertAndUpload(files: TitledFile[], format: UploadFormat) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
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

        const updateProgressCallback = ({ written, encrypted, total }: { written: number; encrypted: number; total: number }) => {
            dispatch(uploadDialogActions.setWriteProgress({ written, encrypted, total }));
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
            notification.onclick = function() {
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

        let conversionIterator = async function*(files: TitledFile[]) {
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
                                data = await audioExportService!.export({ format });
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
                    debugger;
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

async function loadFactoryMode() {
    if (serviceRegistry.netmdFactoryService === undefined) {
        serviceRegistry.netmdFactoryService = (await serviceRegistry.netmdService!.factory()) as NetMDFactoryService;
    }
}

export function readToc() {
    return async function(dispatch: AppDispatch) {
        await loadFactoryMode();
        dispatch(appStateActions.setLoading(true));
        let newToc = parseTOC(
            await serviceRegistry.netmdFactoryService!.readUTOCSector(0),
            await serviceRegistry.netmdFactoryService!.readUTOCSector(1),
            await serviceRegistry.netmdFactoryService!.readUTOCSector(2)
        );
        const firmwareVersion = await serviceRegistry.netmdFactoryService!.getDeviceFirmware();
        const capabilities = await serviceRegistry.netmdFactoryService!.getExploitCapabilities();
        dispatch(
            batchActions([
                factoryActions.setToc(newToc),
                factoryActions.setExploitCapabilities(capabilities),
                factoryActions.setFirmwareVersion(firmwareVersion),
                factoryActions.setModified(false),
                appStateActions.setLoading(false),
            ])
        );
    };
}

export function editFragmentMode(index: number, mode: number) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        const toc = JSON.parse(JSON.stringify(getState().factory.toc));
        if (toc.trackFragmentList[index].mode !== mode) {
            dispatch(factoryActions.setModified(true));
        }
        toc.trackFragmentList[index].mode = mode;
        dispatch(factoryActions.setToc(toc));
    };
}

export function writeModifiedTOC() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(appStateActions.setLoading(true));
        const toc = getState().factory.toc!;
        const sectors = reconstructTOC(toc);
        for (let i = 0; i < 3; i++) {
            await serviceRegistry.netmdFactoryService!.writeUTOCSector(i, sectors[i]!);
        }
        await serviceRegistry.netmdFactoryService!.flushUTOCCacheToDisc();
        dispatch(batchActions([appStateActions.setLoading(false), factoryActions.setModified(false)]));
    };
}

export function runTetris() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        await serviceRegistry.netmdFactoryService!.runTetris();
    };
}

export function downloadRam() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        const firmwareVersion = getState().factory.firmwareVersion;
        dispatch(
            batchActions([
                factoryProgressDialogActions.setDetails({
                    name: 'Transferring RAM',
                    units: 'bytes',
                }),
                factoryProgressDialogActions.setProgress({
                    current: 0,
                    total: 0,
                    additionalInfo: '',
                }),
                factoryProgressDialogActions.setVisible(true),
            ])
        );
        const ramData = await serviceRegistry.netmdFactoryService!.readRAM(
            ({ readBytes, totalBytes }: { readBytes: number; totalBytes: number }) => {
                dispatch(
                    factoryProgressDialogActions.setProgress({
                        current: readBytes,
                        total: totalBytes,
                    })
                );
            }
        );

        const fileName = `ram_${getState().main.deviceName}_${firmwareVersion}.bin`;
        downloadBlob(new Blob([ramData]), fileName);
        dispatch(factoryProgressDialogActions.setVisible(false));
    };
}

export function downloadRom() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(
            batchActions([
                factoryProgressDialogActions.setDetails({
                    name: 'Transferring Firmware',
                    units: 'bytes',
                }),
                factoryProgressDialogActions.setVisible(true),
            ])
        );
        const firmwareData = await serviceRegistry.netmdFactoryService!.readFirmware(
            ({ type, readBytes, totalBytes }: { type: 'RAM' | 'ROM'; readBytes: number; totalBytes: number }) => {
                if (readBytes % 0x200 === 0)
                    dispatch(
                        factoryProgressDialogActions.setProgress({
                            current: readBytes,
                            total: totalBytes,
                            additionalInfo: type,
                        })
                    );
            }
        );
        const firmwareVersion = getState().factory.firmwareVersion;
        const fileName = `firmware_${getState().main.deviceName}_${firmwareVersion}.bin`;
        downloadBlob(new Blob([firmwareData]), fileName);
        dispatch(factoryProgressDialogActions.setVisible(false));
    };
}

export function downloadToc() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(
            batchActions([
                factoryProgressDialogActions.setDetails({
                    name: 'Transferring TOC',
                    units: 'sectors',
                }),
                factoryProgressDialogActions.setProgress({
                    total: 6,
                    current: 0,
                }),
                factoryProgressDialogActions.setVisible(true),
            ])
        );
        let readSlices: Uint8Array[] = [];
        for (let i = 0; i < 6; i += 1) {
            dispatch(factoryProgressDialogActions.setProgress({ current: i + 1, total: 6 }));
            readSlices.push(await serviceRegistry.netmdFactoryService!.readUTOCSector(i));
        }
        const fileName = `toc_${getTitleByTrackNumber(getState().factory.toc!, 0 /* Disc */)}.bin`;
        downloadBlob(new Blob([concatUint8Arrays(...readSlices)]), fileName);
        dispatch(factoryProgressDialogActions.setVisible(false));
    };
}

export function uploadToc(file: File) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        if (file.size !== 2352 * 6) {
            window.alert('Not a valid TOC file');
            return;
        }
        dispatch(appStateActions.setLoading(true));

        const data = new Uint8Array(await file.arrayBuffer());

        for (let i = 0; i < 6; i++) {
            let sectorStart = i * 2352;
            await serviceRegistry.netmdFactoryService!.writeUTOCSector(i, data.slice(sectorStart, sectorStart + 2352));
        }
        await serviceRegistry.netmdFactoryService!.flushUTOCCacheToDisc();
        readToc()(dispatch);
    };
}

export function exploitDownloadTracks(trackIndexes: number[]) {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        // Verify if there even exists a track of that number
        const disc = getState().main.disc!;
        const tracks = getTracks(disc);
        try {
            await serviceRegistry.netmdService!.stop();
        } catch (ex) {
            /* Ignore */
        }

        dispatch(factoryProgressDialogActions.setVisible(true));
        for (let trackIndex of trackIndexes) {
            if (trackIndex >= disc.trackCount) {
                window.alert("This track does not exist. Make sure you've read the instructions on how to use the factory mode.");
                return;
            }
            const track = tracks.find(n => n.index === trackIndex)!;
            dispatch(
                batchActions([
                    factoryProgressDialogActions.setDetails({
                        name: `Transferring track ${trackIndex + 1}`,
                        units: 'sectors',
                    }),
                    factoryProgressDialogActions.setProgress({
                        current: -1,
                        total: 0,
                        additionalInfo: 'Rewriting firmware...',
                    }),
                ])
            );

            const trackData = await serviceRegistry.netmdFactoryService!.exploitDownloadTrack(
                trackIndex,
                ({
                    totalSectors,
                    sectorsRead,
                    action,
                    sector,
                }: {
                    sectorsRead: number;
                    totalSectors: number;
                    action: 'READ' | 'SEEK';
                    sector?: string;
                }) => {
                    dispatch(
                        factoryProgressDialogActions.setProgress({
                            current: action === 'SEEK' ? -1 : sectorsRead,
                            total: totalSectors,
                            additionalInfo: action === 'SEEK' ? 'Seeking...' : `Reading sector ${sector!}...`,
                        })
                    );
                }
            );
            const filename = createDownloadTrackName(track);
            downloadBlob(new Blob([trackData]), filename);
        }
        dispatch(factoryProgressDialogActions.setVisible(false));
    };
}

export function enableFactoryRippingModeInMainUi() {
    return async function(dispatch: AppDispatch, getState: () => RootState) {
        dispatch(appStateActions.setLoading(true));
        await serviceRegistry.netmdService!.stop();
        await loadFactoryMode();

        const capabilities = await serviceRegistry.netmdFactoryService!.getExploitCapabilities();
        if (!capabilities.includes(ExploitCapability.downloadAtrac)) {
            dispatch(appStateActions.setLoading(false));
            window.alert(
                'Cannot enable factory mode ripping in main UI.\nThis device is not supported yet.\nStay tuned for future updates.'
            );
            return;
        }

        // At this point we're in the factory mode, and CSAR is allowed.
        // It's safe to enable this functionality.

        dispatch(batchActions([appStateActions.setFactoryModeRippingInMainUi(true), appStateActions.setLoading(false)]));
    };
}
