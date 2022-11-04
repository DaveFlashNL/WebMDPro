import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as encoderSetupDialogActions } from '../redux/encoder-setup-dialog-feature';
import { actions as appActions } from '../redux/app-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { TransitionProps } from '@material-ui/core/transitions';
import { MenuItem, Select } from '@material-ui/core';
import { batchActions } from 'redux-batched-actions';
import { AudioServices } from '../services/audio-export-service-manager';
import { initializeParameters, isAllValid } from '../custom-parameters';
import { renderCustomParameter } from './custom-parameters-renderer';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
    marginUpDown: {
        marginTop: theme.spacing(3),
        marginBottom: theme.spacing(3),
    },
    select: {
        minWidth: '100%',
        marginBottom: theme.spacing(2),
    },
    fullWidth: {
        minWidth: '100%',
    },
}));

export const EncoderSetupDialog = (props: {}) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    const { visible, customParameters, selectedServiceIndex } = useShallowEqualSelector(state => state.encoderSetupDialog);
    const currentService = AudioServices[selectedServiceIndex];

    const [okButtonDisabled, setOkButtonDisabled] = useState(false);

    const handleClose = useCallback(() => {
        dispatch(
            batchActions([
                encoderSetupDialogActions.setVisible(false),
                appActions.setAudioExportService(selectedServiceIndex),
                appActions.setAudioExportServiceConfig({ ...customParameters }),
            ])
        );
    }, [dispatch, customParameters, selectedServiceIndex]);

    const handleServiceSelectionChanged = useCallback(
        event => {
            dispatch(
                batchActions([
                    encoderSetupDialogActions.setSelectedServiceIndex(event.target.value),
                    encoderSetupDialogActions.setCustomParameters(initializeParameters(AudioServices[event.target.value].customParameters)),
                ])
            );
        },
        [dispatch]
    );

    const handleParameterChange = useCallback(
        (varName, value) => {
            const newData = { ...customParameters };
            newData[varName] = value;
            dispatch(encoderSetupDialogActions.setCustomParameters(newData));
        },
        [dispatch, customParameters]
    );

    useEffect(() => setOkButtonDisabled(!isAllValid(currentService.customParameters, customParameters)), [
        customParameters,
        currentService.customParameters,
    ]);

    return (
        <Dialog
            open={visible}
            maxWidth={'xs'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="encoder-setup-dialog-slide-title"
            aria-describedby="encoder-setup-dialog-slide-description"
        >
            <DialogTitle id="encoder-setup-dialog-slide-title">Encoder Configuration</DialogTitle>
            <DialogContent>
                <Select onChange={handleServiceSelectionChanged} value={selectedServiceIndex} className={classes.select} label="Service">
                    {AudioServices.map((n, i) => (
                        <MenuItem value={i} key={`${i}`}>
                            {n.name}
                        </MenuItem>
                    ))}
                </Select>
                <p>{currentService.description}</p>
                <div className={classes.fullWidth}>
                    {currentService.customParameters?.map(n =>
                        renderCustomParameter(n, customParameters[n.varName], handleParameterChange)
                    )}
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={okButtonDisabled}>
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
};
