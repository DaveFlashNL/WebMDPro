import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { downloadTracks, recordTracks } from '../redux/actions';
import { actions as dumpDialogActions } from '../redux/dump-dialog-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import serviceRegistry from '../services/registry';
import { TransitionProps } from '@material-ui/core/transitions';
import { W95DumpDialog } from './win95/dump-dialog';
import { exploitDownloadTracks } from '../redux/factory/factory-actions';
import { LineInDeviceSelect } from './line-in-helpers';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
    head: {
        textShadow: '0px 0px 12px rgba(150, 150, 150, 1)',
        fontSize: theme.typography.h2.fontSize,
        textAlign: 'center',
        marginBottom: theme.spacing(2),
    },
}));

export const DumpDialog = ({
    trackIndexes,
    isCapableOfDownload,
    isExploitDownload,
}: {
    trackIndexes: number[];
    isCapableOfDownload: boolean;
    isExploitDownload: boolean;
}) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    const [inputDeviceId, setInputDeviceId] = useState<string>('');

    let { visible } = useShallowEqualSelector(state => state.dumpDialog);
    let { deviceCapabilities } = useShallowEqualSelector(state => state.main);

    const handleClose = useCallback(() => {
        setInputDeviceId('');
        serviceRegistry.mediaRecorderService?.stopTestInput();
        dispatch(dumpDialogActions.setVisible(false));
    }, [dispatch]);

    const handleChange = useCallback(
        (ev: React.ChangeEvent<{ value: unknown }>) => {
            if (isCapableOfDownload) return;
            const deviceId = ev.target.value as string;
            setInputDeviceId(deviceId);
            serviceRegistry.mediaRecorderService?.stopTestInput();
            serviceRegistry.mediaRecorderService?.playTestInput(deviceId);
        },
        [setInputDeviceId, isCapableOfDownload]
    );

    const handleStartTransfer = useCallback(() => {
        if (isCapableOfDownload) {
            if (isExploitDownload) {
                dispatch(exploitDownloadTracks(trackIndexes));
            } else {
                dispatch(downloadTracks(trackIndexes));
            }
        } else {
            dispatch(recordTracks(trackIndexes, inputDeviceId));
        }
        handleClose();
    }, [trackIndexes, inputDeviceId, dispatch, handleClose, isCapableOfDownload, isExploitDownload]);

    const vintageMode = useShallowEqualSelector(state => state.appState.vintageMode);

    if (vintageMode) {
        const p = {
            handleClose,
            handleChange,
            handleStartTransfer,
            visible,
            deviceCapabilities,
            inputDeviceId,
            isCapableOfDownload,
        };
        return <W95DumpDialog {...p} />;
    }

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="dump-dialog-slide-title"
            aria-describedby="dump-dialog-slide-description"
        >
            <DialogTitle id="dump-dialog-slide-title">{isCapableOfDownload ? 'Download' : 'Record'} Selected Tracks</DialogTitle>
            <DialogContent>
                <Typography component="p" variant="h2" className={classes.head}>
                    {`💻 ⬅ 💽`}
                </Typography>
                {isCapableOfDownload ? (
                    <React.Fragment>
                        {isExploitDownload ? (
                            <React.Fragment>
                                <Typography component="p" variant="body2">
                                    You have enabled the NetMD exploit, tracks will be ripped from the inserted minidisc just like a CD and download via USB.
                                </Typography>
                                <Typography component="p" variant="body2">
                                    Please keep in mind that tracks download "as is" in a container file, use an ffmpeg-based player, such as VLC to play them.
                                </Typography>
                                <Typography component="p" variant="body2">
                                    Also, be advised, as this is using an exploit not all devices may be fully compatible nor may such usage be stable across all of the current supported devices.
                                </Typography>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <Typography component="p" variant="body2">
                                    You're Sony MZ-RH1 support direct ripping of minidiscs via NetMD.  Tracks will download via USB.
                                </Typography>
                                <Typography component="p" variant="body2">
                                    Please keep in mind that tracks download "as is" in a container file, use an ffmpeg-based player, such as VLC to play them.
                                </Typography>
                            </React.Fragment>
                        )}
                    </React.Fragment>
                ) : (
                    <LineInDeviceSelect inputDeviceId={inputDeviceId} handleChange={handleChange} />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleStartTransfer} disabled={inputDeviceId === '' && !isCapableOfDownload}>
                    Start {isCapableOfDownload ? 'Download' : 'Record'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
