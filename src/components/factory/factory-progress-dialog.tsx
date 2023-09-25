import React, { useCallback } from 'react';
import { useShallowEqualSelector } from '../../utils';

import { actions as factoryProgressDialogActions } from '../../redux/factory/factory-progress-dialog-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import { TransitionProps } from '@material-ui/core/transitions';
import { useDispatch } from 'react-redux';

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

export const FactoryModeProgressDialog = (props: {}) => {
    const classes = useStyles();
    const dispatch = useDispatch();

    let { visible, actionName, units, currentProgress, totalProgress, additionalInfo, canBeCancelled, cancelled } = useShallowEqualSelector(
        state => state.factoryProgressDialog
    );

    const handleCancel = useCallback(() => {
        dispatch(factoryProgressDialogActions.setCancelled(true));
    }, [dispatch]);

    let progressValue = Math.round((100 / (totalProgress || 1)) * currentProgress);

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="factory-dialog-slide-title"
            aria-describedby="factory-dialog-slide-description"
        >
            <DialogTitle id="factory-dialog-slide-title">{actionName}...</DialogTitle>
            <DialogContent>
                <DialogContentText id="factory-dialog-slide-description">
                    {currentProgress >= 0
                        ? `${currentProgress} ${units} of ${totalProgress} done ${additionalInfo && `(${additionalInfo})`}`
                        : additionalInfo}
                </DialogContentText>
                <LinearProgress
                    className={classes.progressBar}
                    variant={currentProgress >= 0 ? 'determinate' : 'indeterminate'}
                    color="primary"
                    value={progressValue}
                />
                <Box className={classes.progressPerc}>{currentProgress >= 0 ? `${progressValue}%` : ``}</Box>
            </DialogContent>
            <DialogActions>
                {canBeCancelled && (
                    <Button disabled={cancelled} onClick={handleCancel}>
                        {cancelled ? `Finalizing...` : `Cancel`}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
