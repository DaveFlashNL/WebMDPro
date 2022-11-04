import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as songRecognitionDialogActions } from '../redux/song-recognition-progress-dialog-feature';

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
import { Button, Step, StepLabel, Stepper, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
    progressPerc: {
        marginTop: theme.spacing(1),
    },
    progressBar: {
        marginTop: theme.spacing(3),
    },
    uploadLabel: {
        marginTop: theme.spacing(3),
    },
    spacer: {
        flex: '1 1 auto',
    },
    checkBox: {
        marginLeft: 0,
    },
}));

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const SongRecognitionProgressDialog = (props: {}) => {
    const classes = useStyles();
    const dispatch = useDispatch();

    let {
        currentStep,
        currentTrack,
        totalTracks,
        visible,
        cancelled,

        currentStepCurrent,
        currentStepTotal,
    } = useShallowEqualSelector(state => state.songRecognitionProgressDialog);

    const handleCancel = useCallback(() => {
        dispatch(songRecognitionDialogActions.setCancelled(true));
    }, [dispatch]);

    let tracksProgress = Math.floor((currentTrack / totalTracks) * 100);
    let currentStepProgress = Math.floor((currentStepCurrent / currentStepTotal) * 100);

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="recognize-dialog-slide-title"
            aria-describedby="recognize-dialog-slide-description"
        >
            <DialogTitle id="recognize-dialog-slide-title">Recognizing...</DialogTitle>
            <DialogContent>
                <Stepper activeStep={currentStep} orientation="vertical" style={{ paddingTop: 0 }}>
                    <Step>
                        <StepLabel>
                            <Typography>Reading</Typography>
                        </StepLabel>
                    </Step>
                    <Step>
                        <StepLabel>
                            <Typography>Computing checksums</Typography>
                        </StepLabel>
                    </Step>
                    <Step>
                        <StepLabel>
                            <Typography>Identifying song</Typography>
                        </StepLabel>
                    </Step>
                </Stepper>
                <DialogContentText id="recognize-dialog-slide-description">
                    Recognizing {currentTrack + 1} of {totalTracks}
                </DialogContentText>

                <LinearProgress
                    className={classes.progressBar}
                    variant={currentStepProgress === -1 ? 'indeterminate' : 'determinate'}
                    color="primary"
                    value={currentStepProgress}
                />
                <Box className={classes.progressPerc}>{currentStepCurrent !== -1 && `${currentStepProgress}%`}</Box>

                <DialogContentText id="recognize-dialog-slide-description" className={classes.uploadLabel}>
                    {['Reading...', 'Computing checksums...', 'Identifying...'][currentStep]}
                </DialogContentText>
                <LinearProgress className={classes.progressBar} variant="determinate" color="secondary" value={tracksProgress} />
                <Box className={classes.progressPerc}>{tracksProgress}%</Box>
            </DialogContent>
            <DialogActions>
                <Button disabled={cancelled} onClick={handleCancel}>
                    {cancelled ? `Stopping after current track...` : `Cancel Recognizing`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
