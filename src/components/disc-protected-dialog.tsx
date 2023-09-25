import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as appActions } from '../redux/app-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { TransitionProps } from '@material-ui/core/transitions';
import { ReactComponent as Warning } from '../images/md_lock.svg';
import { Checkbox, FormControlLabel, makeStyles } from '@material-ui/core';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
    svg: {
        '& .text': {
            fill: theme.palette.text.primary,
        },
        margin: 'auto',
        marginBottom: theme.spacing(3),
        display: 'block',
    }
}));

export const DiscProtectedDialog = () => {
    const dispatch = useDispatch();
    const classes = useStyles();

    const visible = useShallowEqualSelector(state => state.appState.discProtectedDialogVisible);
    const [doNotShowAgain, setDoNotShowAgain] = useState<boolean>(false);

    const handleClose = useCallback(() => {
        if (doNotShowAgain) {
            dispatch(appActions.disableDiscProtectedDialog(true));
        }
        dispatch(appActions.showDiscProtectedDialog(false));
    }, [dispatch, doNotShowAgain]);

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="disc-protected-dialog-slide-title"
        >
            <DialogTitle id="disc-protected-dialog-slide-title">Write Protected Disc</DialogTitle>
            <DialogContent>
                <Warning className={classes.svg} />
                <DialogContentText>The disc you have inserted is write protected.</DialogContentText>
                <DialogContentText>You'll be able to use playback transport controls and disc ripping/archival functions, but not write or edit anything.</DialogContentText>
                <DialogContentText>Please eject, then unlock, and re-insert the disc if you need to make changes.</DialogContentText>

                <FormControlLabel label="Do not show again" control={
                    <Checkbox checked={doNotShowAgain} onChange={(val => setDoNotShowAgain(val.target.checked))} />
                } />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>OK</Button>
            </DialogActions>
        </Dialog>
    );
};
