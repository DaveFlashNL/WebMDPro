import React from 'react';
import { useShallowEqualSelector } from '../utils';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import LinearProgress from '@material-ui/core/LinearProgress';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { TransitionProps } from '@material-ui/core/transitions';
import { W95RecordDialog } from './win95/record-dialog';
import { Capability } from '../services/netmd';

const useStyles = makeStyles(theme => ({
    progressPerc: {
        marginTop: theme.spacing(1),
    },
    progressBar: {
        marginTop: theme.spacing(3),
    },
}));

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const RecordDialog = (props: {}) => {
    const classes = useStyles();
    const deviceCapabilities = useShallowEqualSelector(state => state.main.deviceCapabilities);
    const isCapable = (capability: Capability) => deviceCapabilities.includes(capability);

    let { visible, trackTotal, trackDone, trackCurrent, titleCurrent } = useShallowEqualSelector(state => state.recordDialog);

    let progressValue = Math.round(trackCurrent);

    const vintageMode = useShallowEqualSelector(state => state.appState.vintageMode);
    if (vintageMode) {
        const p = {
            visible,
            trackTotal,
            trackDone,
            trackCurrent,
            titleCurrent,
            progressValue,
        };
        return <W95RecordDialog {...p} />;
    }

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="record-dialog-slide-title"
            aria-describedby="record-dialog-slide-description"
        >
            <DialogTitle id="record-dialog-slide-title">{isCapable(Capability.trackDownload) ? 'Downloading...' : 'Recording...'}</DialogTitle>
            <DialogContent>
                <DialogContentText id="record-dialog-slide-description">
                    {`${isCapable(Capability.trackDownload) ? 'Downloading' : 'Recording'} track ${trackDone + 1} of ${trackTotal}: ${titleCurrent}`}
                </DialogContentText>
                <LinearProgress
                    className={classes.progressBar}
                    variant={trackCurrent >= 0 ? 'determinate' : 'indeterminate'}
                    color="primary"
                    value={progressValue}
                />
                <Box className={classes.progressPerc}>{progressValue >= 0 ? `${progressValue}%` : ``}</Box>
            </DialogContent>
            <DialogActions></DialogActions>
        </Dialog>
    );
};
