import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../../utils';

import { makeStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import { TransitionProps } from '@material-ui/core/transitions';
import { actions as fragmentModeEditActions } from '../../redux/factory/factory-fragment-mode-edit-dialog-feature';
import { ModeFlag } from 'netmd-tocmanip';
import { editFragmentMode } from '../../redux/factory/factory-actions';

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
}));

export const FactoryModeEditDialog = (props: {}) => {
    let dispatch = useDispatch();
    let classes = useStyles();

    const { visible, fragmentIndex, mode } = useShallowEqualSelector(state => state.factoryFragmentModeEditDialog);

    const [format, setFormat] = useState('sp-mono');
    const [scms, setSCMS] = useState('no-copies');

    useEffect(() => {
        const fSP = (mode & ModeFlag.F_SP_MODE) !== 0;
        const fStereo = (mode & ModeFlag.F_STEREO) !== 0;
        let formatStr = '';
        if (fSP) {
            if (fStereo) {
                formatStr = 'sp-stereo';
            } else {
                formatStr = 'sp-mono';
            }
        } else {
            if (fStereo) {
                formatStr = 'lp2';
            } else {
                formatStr = 'lp4';
            }
        }
        setFormat(formatStr);

        const fSCMSUnrestricted = (mode & ModeFlag.F_SCMS_UNRESTRICTED) !== 0;
        const fSCMSDigitalCopy = (mode & ModeFlag.F_SCMS_DIG_COPY) !== 0;

        let scmsStr = '';
        if (fSCMSDigitalCopy && fSCMSUnrestricted) scmsStr = 'unlimited';
        else if (fSCMSDigitalCopy) scmsStr = 'no-copies';
        else scmsStr = 'one-copy';
        setSCMS(scmsStr);
    }, [mode, setSCMS]);

    const handleClose = useCallback(() => {
        dispatch(fragmentModeEditActions.setVisible(false));
    }, [dispatch]);

    const handleUpdate = useCallback(() => {
        dispatch(editFragmentMode(fragmentIndex, mode));
        handleClose();
    }, [dispatch, fragmentIndex, mode, handleClose]);

    const handleUpdateCheckbox = useCallback(
        (index: number, event: any) => {
            let newMode = mode;
            if (event.target.checked) {
                newMode |= 1 << index;
            } else {
                newMode &= ~(1 << index);
            }
            dispatch(fragmentModeEditActions.setMode(newMode));
        },
        [dispatch, mode]
    );

    const handleFormatSelectChange = useCallback(
        (event: any) => {
            let fSP = false,
                fStereo = false;
            switch (event.target.value) {
                case 'sp-mono':
                    fSP = true;
                    fStereo = false;
                    break;
                case 'sp-stereo':
                    fSP = true;
                    fStereo = true;
                    break;
                case 'lp2':
                    fSP = false;
                    fStereo = true;
                    break;
                case 'lp4':
                    fSP = false;
                    fStereo = false;
                    break;
            }
            let newMode = mode;
            if (fSP) {
                newMode |= ModeFlag.F_SP_MODE;
            } else {
                newMode &= ~ModeFlag.F_SP_MODE;
            }
            if (fStereo) {
                newMode |= ModeFlag.F_STEREO;
            } else {
                newMode &= ~ModeFlag.F_STEREO;
            }

            dispatch(fragmentModeEditActions.setMode(newMode));
        },
        [dispatch, mode]
    );

    const handleSCMSSelectChange = useCallback(
        (event: any) => {
            let fSCMSDigitalCopy = false,
                fSCMSUnrestricted = false;
            switch (event.target.value) {
                case 'one-copy':
                    fSCMSDigitalCopy = false;
                    fSCMSUnrestricted = false;
                    break;
                case 'no-copies':
                    fSCMSDigitalCopy = true;
                    fSCMSUnrestricted = false;
                    break;
                case 'unlimited':
                    fSCMSDigitalCopy = true;
                    fSCMSUnrestricted = true;
                    break;
            }

            let newMode = mode;
            if (fSCMSDigitalCopy) {
                newMode |= ModeFlag.F_SCMS_DIG_COPY;
            } else {
                newMode &= ~ModeFlag.F_SCMS_DIG_COPY;
            }
            if (fSCMSUnrestricted) {
                newMode |= ModeFlag.F_SCMS_UNRESTRICTED;
            } else {
                newMode &= ~ModeFlag.F_SCMS_UNRESTRICTED;
            }

            dispatch(fragmentModeEditActions.setMode(newMode));
        },
        [dispatch, mode]
    );

    return (
        <Dialog
            open={visible}
            onClose={handleClose}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="factory-fragment-mode-dialog-title"
        >
            <DialogTitle id="factory-fragment-mode-dialog-title">Edit Fragment Mode</DialogTitle>
            <DialogContent>
                <FormControl fullWidth>
                    <InputLabel>Fragment format</InputLabel>
                    <Select value={format} onChange={handleFormatSelectChange} className={classes.marginUpDown}>
                        <MenuItem value="sp-mono">SP Mono</MenuItem>
                        <MenuItem value="sp-stereo">SP Stereo</MenuItem>
                        <MenuItem value="lp2">LP2</MenuItem>
                        <MenuItem value="lp4">LP4</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel>SCMS status</InputLabel>
                    <Select value={scms} onChange={handleSCMSSelectChange} className={classes.marginUpDown}>
                        <MenuItem value="unlimited">Unlimited Copies Allowed</MenuItem>
                        <MenuItem value="no-copies">No Copies Allowed</MenuItem>
                        <MenuItem value="one-copy">Allow One Generation</MenuItem>
                    </Select>
                </FormControl>
                {Array(32)
                    .fill(0)
                    .map((n, i) => (
                        <div key={`control-${i}`}>
                            <FormControlLabel
                                control={<Checkbox onChange={e => handleUpdateCheckbox(i, e)} checked={(mode & (1 << i)) !== 0} />}
                                label={ModeFlag[1 << i] ?? `Bit ${i}`}
                            />
                        </div>
                    ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button color={'primary'} onClick={handleUpdate}>
                    Update
                </Button>
            </DialogActions>
        </Dialog>
    );
};
