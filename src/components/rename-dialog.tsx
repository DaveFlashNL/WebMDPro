import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as appActions } from '../redux/app-feature';
import { renameTrack, renameDisc, renameGroup, renameInConvertDialog } from '../redux/actions';

import { makeStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { TransitionProps } from '@material-ui/core/transitions';
import { W95RenameDialog } from './win95/rename-dialog';
import { Link, Typography } from '@material-ui/core';
import { batchActions } from 'redux-batched-actions';
import { sanitizeFullWidthTitle } from 'netmd-js/dist/utils';

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

export const RenameDialog = (props: {}) => {
    let dispatch = useDispatch();
    let classes = useStyles();

    let renameDialogVisible = useShallowEqualSelector(state => state.renameDialog.visible);
    let renameDialogTitle = useShallowEqualSelector(state => state.renameDialog.title);
    let renameDialogFullWidthTitle = useShallowEqualSelector(state => state.renameDialog.fullWidthTitle);
    let renameDialogIndex = useShallowEqualSelector(state => state.renameDialog.index);
    let renameDialogGroupIndex = useShallowEqualSelector(state => state.renameDialog.groupIndex);
    let renameDialogIsOfConvert = useShallowEqualSelector(state => state.renameDialog.ofConvert);
    let allowFullWidth = useShallowEqualSelector(state => state.appState.fullWidthSupport);

    const what = renameDialogGroupIndex !== null ? `Group` : renameDialogIndex < 0 ? `Disc` : `Track`;

    const handleCancelRename = useCallback(() => {
        dispatch(renameDialogActions.setVisible(false));
    }, [dispatch]);

    const handleDoRename = useCallback(() => {
        if (renameDialogIsOfConvert) {
            dispatch(
                renameInConvertDialog({
                    index: renameDialogIndex,
                    newName: renameDialogTitle,
                    newFullWidthName: renameDialogFullWidthTitle,
                })
            );
        } else if (renameDialogGroupIndex !== null) {
            // Just rename the group with this range
            dispatch(
                renameGroup({
                    newName: renameDialogTitle,
                    newFullWidthName: renameDialogFullWidthTitle,
                    groupIndex: renameDialogGroupIndex,
                })
            );
        } else if (renameDialogIndex < 0) {
            dispatch(
                renameDisc({
                    newName: renameDialogTitle,
                    newFullWidthName: renameDialogFullWidthTitle,
                })
            );
        } else {
            dispatch(
                renameTrack({
                    index: renameDialogIndex,
                    newName: renameDialogTitle,
                    newFullWidthName: renameDialogFullWidthTitle,
                })
            );
        }
        handleCancelRename(); // Close the dialog
    }, [
        dispatch,
        handleCancelRename,
        renameDialogFullWidthTitle,
        renameDialogGroupIndex,
        renameDialogIndex,
        renameDialogTitle,
        renameDialogIsOfConvert,
    ]);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            dispatch(renameDialogActions.setCurrentName(event.target.value.substring(0, 120))); // MAX title length
        },
        [dispatch]
    );

    const handleFullWidthChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            dispatch(renameDialogActions.setCurrentFullWidthName(sanitizeFullWidthTitle(event.target.value.substring(0, 105))));
        },
        [dispatch]
    );

    const handleEnterKeyEvent = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === `Enter`) {
                event.stopPropagation();
                event.preventDefault();
                handleDoRename();
            }
        },
        [handleDoRename]
    );

    const handleSwitchToFullWidth = useCallback(
        (event: React.MouseEvent) => {
            dispatch(
                batchActions([
                    appActions.setFullWidthSupport(true),
                    renameDialogActions.setCurrentFullWidthName(sanitizeFullWidthTitle(renameDialogTitle)),
                    renameDialogActions.setCurrentName(''),
                ])
            );
        },
        [renameDialogTitle, dispatch]
    );

    const { vintageMode } = useShallowEqualSelector(state => state.appState);
    if (vintageMode) {
        const p = {
            renameDialogVisible,
            renameDialogTitle,
            renameDialogIndex,
            what,
            handleCancelRename,
            handleDoRename,
            handleChange,
        };
        return <W95RenameDialog {...p} />;
    }

    return (
        <Dialog
            open={renameDialogVisible}
            onClose={handleCancelRename}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="rename-dialog-title"
        >
            <DialogTitle id="rename-dialog-title">Rename {what}</DialogTitle>
            <DialogContent>
                {!allowFullWidth &&
                    renameDialogTitle
                        .split('')
                        .map(n => n.charCodeAt(0))
                        .filter(
                            n =>
                                (n >= 0x3040 && n <= 0x309f) || // Hiragana
                                (n >= 0x4e00 && n <= 0x9faf) || // Kanji
                                (n >= 0x3400 && n <= 0x4dbf) // Rare kanji
                        ).length ? (
                    <Typography color="error" component="p">
                        You seem to be trying to enter full-width text into the half-width slot.{' '}
                        <Link onClick={handleSwitchToFullWidth} color="error" underline="always" style={{ cursor: 'pointer' }}>
                            Enable full-width title editing
                        </Link>
                        ?
                    </Typography>
                ) : null}
                <TextField
                    autoFocus
                    id="name"
                    label={`${what} Name`}
                    type="text"
                    fullWidth
                    value={renameDialogTitle}
                    onKeyDown={handleEnterKeyEvent}
                    onChange={handleChange}
                />
                {allowFullWidth && (
                    <TextField
                        id="fullWidthTitle"
                        label={`Full-Width ${what} Name`}
                        type="text"
                        fullWidth
                        className={classes.marginUpDown}
                        value={renameDialogFullWidthTitle}
                        onKeyDown={handleEnterKeyEvent}
                        onChange={handleFullWidthChange}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancelRename}>Cancel</Button>
                <Button color={'primary'} onClick={handleDoRename}>
                    Rename
                </Button>
            </DialogActions>
        </Dialog>
    );
};
