import React, { useCallback } from 'react';
import { useShallowEqualSelector } from '../../utils';

import { actions as factoryBadSectorDialogActions } from '../../redux/factory/factory-bad-sector-dialog-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { TransitionProps } from '@material-ui/core/transitions';
import { useDispatch } from 'react-redux';
import { BadSectorResponse, reportBadSectorReponse } from '../../redux/factory/factory-actions';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const FactoryModeBadSectorDialog = (props: {}) => {
    const dispatch = useDispatch();

    let { visible, address, count, remember } = useShallowEqualSelector(state => state.factoryBadSectorDialog);

    const handleReturnValue = useCallback(
        (data: BadSectorResponse) => {
            dispatch(reportBadSectorReponse(data, remember));
        },
        [dispatch, remember]
    );

    const handleRememberChoiceChange = useCallback(
        (e: any) => {
            dispatch(factoryBadSectorDialogActions.setRememberChoice(e.target.checked));
        },
        [dispatch]
    );

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="factory-bad-sector-dialog-slide-title"
            aria-describedby="factory-bad-sector-dialog-slide-description"
        >
            <DialogTitle id="factory-bad-sector-dialog-slide-title">Bad Sector Encountered!</DialogTitle>
            <DialogContent>
                <DialogContentText id="factory-bad-sector-dialog-slide-description">
                    A bad sector was encountered on address {address} ({count} sector of this block)
                </DialogContentText>
                <Box>
                    <FormControl>
                        <FormControlLabel
                            control={<Checkbox checked={remember} onChange={handleRememberChoiceChange} />}
                            label="Remember my choice"
                        />
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleReturnValue('abort')}>Stop reading</Button>
                <Button onClick={() => handleReturnValue('reload')}>Reload current block</Button>
                <Button onClick={() => handleReturnValue('skip')}>Skip this sector</Button>
                <Button onClick={() => handleReturnValue('yieldanyway')}>Ignore</Button>
            </DialogActions>
        </Dialog>
    );
};
