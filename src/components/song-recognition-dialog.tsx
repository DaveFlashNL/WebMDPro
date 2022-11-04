import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { belowDesktop, useShallowEqualSelector, forAnyDesktop, forWideDesktop } from '../utils';

import { actions as songRecognitionDialogActions } from '../redux/song-recognition-dialog-feature';
import { recognizeTracks, renameTrack } from '../redux/actions';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import FormControl from '@material-ui/core/FormControl';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { TransitionProps } from '@material-ui/core/transitions';
import Typography from '@material-ui/core/Typography';
import Select from '@material-ui/core/Select';
import Input from '@material-ui/core/Input';
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';
import { sanitizeFullWidthTitle, sanitizeHalfWidthTitle } from 'netmd-js/dist/utils';
import { Link, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import { Capability } from '../services/netmd';
import serviceRegistry from '../services/registry';
import { LineInDeviceSelect } from './line-in-helpers';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
    dialog: {
        margin: 'auto',
        [forAnyDesktop(theme)]: {
            width: 600,
            maxWidth: 600,
        },
        [forWideDesktop(theme)]: {
            width: 700,
            maxWidth: 700,
        },
    },
    container: {
        display: 'flex',
        flexDirection: 'row',
    },
    formControl: {
        minWidth: 60,
    },
    toggleButton: {
        minWidth: 40,
    },
    dialogContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'stretch',
    },
    formatAndTitle: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    rightBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    titleFormControl: {
        minWidth: 170,
        marginTop: 4,
        [belowDesktop(theme)]: {
            width: 114,
            minWidth: 0,
        },
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    checkmarkCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    trackIndex: {
        display: 'inline-block',
    },
    mainTable: {
        '& td': {
            paddingTop: 0,
            paddingBottom: 0,
        },
        '& th': {
            paddingTop: 0,
            paddingBottom: 0,
            borderBottomWidth: 3,
        },
    },
    greyedOut: {
        color: theme.palette.grey[700],
    },
    recognizeFail: {
        color: theme.palette.error.main,
    },
    lineInModule: {
        marginTop: theme.spacing(3),
        marginBottom: theme.spacing(3),
    },
    noFetch: {
        color: theme.palette.error.main,
    },
}));

export const SongRecognitionDialog = (props: { trackIndexes: number[] }) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    const { visible, titles, titleFormat, importMethod } = useShallowEqualSelector(state => state.songRecognitionDialog);
    const { fullWidthSupport } = useShallowEqualSelector(state => state.appState);
    const { deviceCapabilities, disc } = useShallowEqualSelector(state => state.main);

    const [selected, setSelected] = useState<number[]>([]);

    // Line in section
    const [inputDeviceId, setInputDeviceId] = useState<string>('');
    const handleInputDeviceChange = useCallback(
        (ev: React.ChangeEvent<{ value: unknown }>) => {
            const deviceId = ev.target.value as string;
            setInputDeviceId(deviceId);
            serviceRegistry.mediaRecorderService?.stopTestInput();
            serviceRegistry.mediaRecorderService?.playTestInput(deviceId);
        },
        [setInputDeviceId]
    );

    const canApplyTitles = useMemo(() => {
        return titles.filter(e => selected.includes(e.index)).every(e => e.alreadyRecognized) && selected.length > 0;
    }, [titles, selected]);

    const stopAudioInput = useCallback(() => {
        setInputDeviceId('');
        serviceRegistry.mediaRecorderService?.stopTestInput();
    }, []);

    const handleChangeImportMethod = useCallback(
        (e, newFormat) => {
            newFormat && dispatch(songRecognitionDialogActions.setImportMethod(newFormat));
            if (newFormat !== 'line-in') {
                stopAudioInput();
            }
        },
        [dispatch, stopAudioInput]
    );

    const handleChangeTitleFormat = useCallback(
        e => {
            dispatch(songRecognitionDialogActions.setTitleFormat(e.target.value));
        },
        [dispatch]
    );

    const handleClose = useCallback(() => {
        stopAudioInput();
        dispatch(songRecognitionDialogActions.setVisible(false));
    }, [dispatch, stopAudioInput]);

    const handleApplyTitles = useCallback(() => {
        handleClose();
        dispatch(
            renameTrack(
                ...titles
                    .filter(e => e.alreadyRecognized && selected.includes(e.index) && !e.recognizeFail)
                    .map(e => ({ index: e.index, newName: e.newTitle, newFullWidthName: e.newFullWidthTitle }))
            )
        );
    }, [dispatch, handleClose, titles, selected]);

    const handleRecognize = useCallback(() => {
        dispatch(
            recognizeTracks(
                titles.filter(e => selected.includes(e.index) && !e.alreadyRecognized).map(e => e.index),
                importMethod,
                {
                    deviceId: inputDeviceId,
                }
            )
        );
    }, [dispatch, titles, importMethod, selected, inputDeviceId]);

    const handleToggleRecognize = useCallback(
        (i: number) => {
            setSelected(old => {
                let newArr = [...old];
                if (old.includes(i)) {
                    newArr.splice(old.indexOf(i), 1);
                } else {
                    newArr.push(i);
                }
                return newArr;
            });
        },
        [setSelected]
    );

    const handleToggleSelectAll = useCallback(() => {
        setSelected(old => {
            if (old.length > titles.length / 2) {
                return [];
            } else {
                return Array(titles.length)
                    .fill(0)
                    .map((_, i) => i);
            }
        });
    }, [titles, setSelected]);

    useEffect(() => {
        setSelected(props.trackIndexes);
    }, [props.trackIndexes, setSelected]);

    useEffect(() => {
        let changed = false;
        let newArray = [...titles];
        for (let i = 0; i < newArray.length; i++) {
            const title = newArray[i];

            let newRawTitle;
            switch (titleFormat) {
                case 'title': {
                    newRawTitle = title.songTitle;
                    break;
                }
                case 'artist-title': {
                    newRawTitle = `${title.songArtist} - ${title.songTitle}`;
                    break;
                }
                case 'title-artist': {
                    newRawTitle = `${title.songTitle} - ${title.songArtist}`;
                    break;
                }
                case 'album-title': {
                    newRawTitle = `${title.songAlbum} - ${title.songTitle}`;
                    break;
                }
                case 'artist-album-title': {
                    newRawTitle = `${title.songArtist} - ${title.songAlbum} - ${title.songTitle}`;
                    break;
                }
            }

            let halfWidth = sanitizeHalfWidthTitle(newRawTitle);
            let fullWidth = sanitizeFullWidthTitle(newRawTitle);

            if (sanitizeHalfWidthTitle(fullWidth) === halfWidth) fullWidth = ''; // Save space - if the titles are the same, don't write full width

            changed = changed || title.newFullWidthTitle !== fullWidth || title.newTitle !== halfWidth;
            newArray[i] = {
                ...newArray[i],
                newFullWidthTitle: fullWidth,
                newTitle: halfWidth,
            };
        }

        if (changed) dispatch(songRecognitionDialogActions.setTitles(newArray));
    }, [dispatch, titleFormat, titles]);

    useEffect(() => {
        if (!disc) handleClose();
    }, [handleClose, disc]);

    return (
        <Dialog
            open={visible}
            maxWidth={'xs'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="song-recognition-dialog-slide-title"
            aria-describedby="song-recognition-dialog-slide-description"
            classes={{ paperScrollPaper: classes.dialog }}
        >
            <DialogTitle id="convert-dialog-slide-title">Song Recognition Settings</DialogTitle>
            <DialogContent className={classes.dialogContent}>
                <div className={classes.formatAndTitle}>
                    <Typography
                        component="h3"
                        className={classes.noFetch}
                        hidden={window.native?.unrestrictedFetchJSON !== undefined}
                        style={{ marginTop: '1em' }}
                        align="center"
                    >
                        To use this functionality you either need to import a{' '}
                        <Link href="https://raw.githubusercontent.com/asivery/webminidisc/master/webminidisc-song-recognition.user.js">
                            userscript
                        </Link>{' '}
                        or use <Link href="https://github.com/asivery/ElectronWMD">ElectronWMD</Link> instead.
                    </Typography>

                    <FormControl>
                        <Typography component="label" variant="caption" color="textSecondary">
                            Import Method
                        </Typography>
                        <ToggleButtonGroup value={importMethod} exclusive onChange={handleChangeImportMethod} size="small">
                            <ToggleButton className={classes.toggleButton} value="line-in">
                                Line-In
                            </ToggleButton>
                            <ToggleButton
                                className={classes.toggleButton}
                                value="exploits"
                                disabled={!deviceCapabilities.includes(Capability.factoryMode)}
                            >
                                Exploits
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </FormControl>
                    <div className={classes.rightBlock}>
                        <FormControl className={classes.formControl}>
                            <Typography component="label" variant="caption" color="textSecondary">
                                Track title format
                            </Typography>
                            <FormControl className={classes.titleFormControl}>
                                <Select value={titleFormat} color="secondary" input={<Input />} onChange={handleChangeTitleFormat}>
                                    <MenuItem value={`title`}>Title</MenuItem>
                                    <MenuItem value={`album-title`}>Album - Title</MenuItem>
                                    <MenuItem value={`artist-title`}>Artist - Title</MenuItem>
                                    <MenuItem value={`title-artist`}>Title - Artist</MenuItem>
                                    <MenuItem value={`artist-album-title`}>Artist - Album - Title</MenuItem>
                                </Select>
                            </FormControl>
                        </FormControl>
                    </div>
                </div>
                {importMethod === 'line-in' && (
                    <div className={classes.lineInModule}>
                        <LineInDeviceSelect handleChange={handleInputDeviceChange} inputDeviceId={inputDeviceId} />
                    </div>
                )}
                <Table className={classes.mainTable}>
                    <TableHead>
                        <TableRow>
                            <TableCell className={classes.checkmarkCell}>
                                <Checkbox checked={titles.length === selected.length} onClick={handleToggleSelectAll} />
                            </TableCell>
                            <TableCell className={classes.indexCell}>#</TableCell>
                            <TableCell>Original Title</TableCell>
                            <TableCell>New Title</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {titles.map(title => (
                            <TableRow hover key={`title-${title.index}`} onClick={e => handleToggleRecognize(title.index)}>
                                <TableCell>
                                    <Checkbox checked={selected.includes(title.index)} />
                                </TableCell>
                                <TableCell>
                                    <span className={classes.trackIndex}>{title.index + 1}</span>
                                </TableCell>
                                <TableCell>
                                    {(title.originalTitle || 'No Title') +
                                        (title.originalFullWidthTitle ? ` / ${title.originalFullWidthTitle}` : '')}
                                </TableCell>
                                <TableCell
                                    className={
                                        title.recognizeFail ? classes.recognizeFail : !title.alreadyRecognized ? classes.greyedOut : ``
                                    }
                                >
                                    {title.recognizeFail
                                        ? 'Could not recognize'
                                        : !title.alreadyRecognized
                                            ? 'Not recognized'
                                            : (title.newTitle || 'No Title') +
                                            (title.newFullWidthTitle && fullWidthSupport ? ` / ${title.newFullWidthTitle}` : '')}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    onClick={handleRecognize}
                    disabled={
                        canApplyTitles ||
                        selected.length === 0 ||
                        (importMethod === 'line-in' && inputDeviceId === '') ||
                        window.native?.unrestrictedFetchJSON === undefined
                    }
                >
                    Recognize
                </Button>
                <Button onClick={handleApplyTitles} disabled={!canApplyTitles || !deviceCapabilities.includes(Capability.metadataEdit)}>
                    Apply New Titles
                </Button>
            </DialogActions>
        </Dialog>
    );
};
