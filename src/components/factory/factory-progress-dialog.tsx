import React from 'react';
import { useShallowEqualSelector } from '../../utils';

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

    let { visible, actionName, units, currentProgress, totalProgress, additionalInfo } = useShallowEqualSelector(
        state => state.factoryProgressDialog
    );

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
            <DialogActions></DialogActions>
        </Dialog>
    );
};
