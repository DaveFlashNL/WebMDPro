import { actions as factoryProgressDialogActions } from './factory-progress-dialog-feature';
import { actions as factoryActions } from '../factory/factory-feature';
import { batchActions } from 'redux-batched-actions';
import { AppDispatch, RootState } from '../store';
import { actions as appStateActions } from '../app-feature';
import serviceRegistry from '../../services/registry';
import { getTracks } from 'netmd-js';
import { createDownloadTrackName, downloadBlob } from '../../utils';
import { concatUint8Arrays } from 'netmd-js/dist/utils';
import { NetMDFactoryService, ExploitCapability } from '../../services/netmd';
import { parseTOC, getTitleByTrackNumber, reconstructTOC, updateFlagAllFragmentsOfTrack, ModeFlag } from 'netmd-tocmanip';

async function loadFactoryMode() {
    if (serviceRegistry.netmdFactoryService === undefined) {
        serviceRegistry.netmdFactoryService = (await serviceRegistry.netmdService!.factory()) as NetMDFactoryService;
    }
}

export function readToc() {
    return async function (dispatch: AppDispatch) {
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
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const toc = JSON.parse(JSON.stringify(getState().factory.toc));
        if (toc.trackFragmentList[index].mode !== mode) {
            dispatch(factoryActions.setModified(true));
        }
        toc.trackFragmentList[index].mode = mode;
        dispatch(factoryActions.setToc(toc));
    };
}

export function writeModifiedTOC() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        dispatch(appStateActions.setLoading(true));
        const toc = getState().factory.toc!;
        const sectors = reconstructTOC(toc, false);
        for (let i = 0; i < 3; i++) {
            await serviceRegistry.netmdFactoryService!.writeUTOCSector(i, sectors[i]!);
        }
        await serviceRegistry.netmdFactoryService!.flushUTOCCacheToDisc();
        dispatch(batchActions([appStateActions.setLoading(false), factoryActions.setModified(false)]));
    };
}

export function runTetris() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        await serviceRegistry.netmdFactoryService!.runTetris();
    };
}

export function downloadRam() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
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
    return async function (dispatch: AppDispatch, getState: () => RootState) {
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
    return async function (dispatch: AppDispatch, getState: () => RootState) {
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
            dispatch(factoryProgressDialogActions.setProgress({ current: i, total: 6 }));
            readSlices.push(await serviceRegistry.netmdFactoryService!.readUTOCSector(i));
        }
        const fileName = `toc_${getTitleByTrackNumber(getState().factory.toc!, 0 /* Disc */)}.bin`;
        downloadBlob(new Blob([concatUint8Arrays(...readSlices)]), fileName);
        dispatch(factoryProgressDialogActions.setVisible(false));
    };
}

export function uploadToc(file: File) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        if (file.size !== 2352 * 6) {
            window.alert('Not a valid TOC file');
            return;
        }
        dispatch(appStateActions.setLoading(true));

        const data = new Uint8Array(await file.arrayBuffer());
        const sectors = [];
        for (let i = 0; i < 6; i++) {
            sectors.push(data.slice(i * 2352, (i + 1) * 2352));
        }
        const toc = parseTOC(...sectors);
        dispatch(batchActions([factoryActions.setModified(true), factoryActions.setToc(toc), appStateActions.setLoading(false)]));
    };
}

export function exploitDownloadTracks(trackIndexes: number[]) {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
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
                window.alert("This track does not exist. Make sure you've read the instructions on how to use the homebrew mode.");
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
                        additionalInfo: 'Uploading code...',
                    }),
                ])
            );

            let timeout: ReturnType<typeof setTimeout> | null = null;

            const trackData = await serviceRegistry.netmdFactoryService!.exploitDownloadTrack(
                trackIndex,
                ({ total, read, action, sector }: { read: number; total: number; action: 'READ' | 'SEEK' | 'CHUNK'; sector?: string }) => {
                    if (timeout !== null) clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        dispatch(
                            factoryProgressDialogActions.setProgress({
                                current: action === 'SEEK' ? -1 : Math.min(read, total),
                                total: total,
                                additionalInfo: {
                                    SEEK: 'Seeking...',
                                    CHUNK: 'Receiving...',
                                    READ: `Reading sector ${sector!}...`,
                                }[action],
                            })
                        );
                    }, 20);
                }
            );
            const filename = createDownloadTrackName(track);
            downloadBlob(new Blob([trackData]), filename);
        }
        dispatch(factoryProgressDialogActions.setVisible(false));
    };
}

export async function checkIfAtracDownloadPossible() {
    await serviceRegistry.netmdService!.stop();
    await loadFactoryMode();

    const capabilities = await serviceRegistry.netmdFactoryService!.getExploitCapabilities();
    return capabilities.includes(ExploitCapability.downloadAtrac);
}

export function enableFactoryRippingModeInMainUi() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        dispatch(appStateActions.setLoading(true));
        if (!(await checkIfAtracDownloadPossible())) {
            dispatch(appStateActions.setLoading(false));
            window.alert(
                'Cannot enable homebrew mode ripping in main UI.\nThis device is not supported yet.\nStay tuned for future updates.'
            );
            return;
        }

        // At this point we're in the homebrew mode, and CSAR is allowed.
        // It's safe to enable this functionality.

        dispatch(batchActions([appStateActions.setFactoryModeRippingInMainUi(true), appStateActions.setLoading(false)]));
    };
}

export function stripSCMS() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        const toc = JSON.parse(JSON.stringify(getState().factory.toc));
        for (let track = 0; track < toc?.nTracks; track++) {
            updateFlagAllFragmentsOfTrack(toc, track, ModeFlag.F_SCMS_DIG_COPY | ModeFlag.F_SCMS_UNRESTRICTED, true);
        }
        dispatch(batchActions([
            factoryActions.setModified(true),
            factoryActions.setToc(toc)
        ]));
    };
}

export function archiveDisc() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        await downloadToc()(dispatch, getState);
        await exploitDownloadTracks(
            Array(getState().factory.toc!.nTracks)
                .fill(0)
                .map((_, i) => i)
        )(dispatch, getState);
    };
}

export function toggleSPUploadSpeedup() {
    return async function (dispatch: AppDispatch, getState: () => RootState) {
        let spUploadSpeedupActive = getState().factory.spUploadSpeedupActive;
        await serviceRegistry.netmdFactoryService!.setSPSpeedupActive(!spUploadSpeedupActive);
        dispatch(factoryActions.setSPUploadSpedUp(!spUploadSpeedupActive));
    };
}
