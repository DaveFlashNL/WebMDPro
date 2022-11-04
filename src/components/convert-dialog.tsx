import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
    belowDesktop,
    useShallowEqualSelector,
    getMetadataFromFile,
    removeExtension,
    secondsToNormal,
    getATRACWAVEncoding,
    getATRACOMAEncoding,
} from '../utils';

import { actions as convertDialogActions, TitleFormatType, UploadFormat } from '../redux/convert-dialog-feature';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as appActions } from '../redux/app-feature';
import { convertAndUpload } from '../redux/actions';

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
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Slider from '@material-ui/core/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import TitleIcon from '@material-ui/icons/Title';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import { lighten } from '@material-ui/core/styles';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import Radio from '@material-ui/core/Radio';
import { useDropzone } from 'react-dropzone';
import Backdrop from '@material-ui/core/Backdrop';
import { W95ConvertDialog } from './win95/convert-dialog';
import { batchActions } from 'redux-batched-actions';
import { Disc, getCellsForTitle, getRemainingCharactersForTitles, Track } from 'netmd-js';
import { sanitizeFullWidthTitle, sanitizeHalfWidthTitle } from 'netmd-js/dist/utils';
import clsx from 'clsx';
import { Link } from '@material-ui/core';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
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
    spacer: {
        display: 'flex',
        flex: '1 1 auto',
    },
    showTracksOrderBtn: {
        marginLeft: theme.spacing(1),
    },
    tracksOrderAccordion: {
        '&:before': {
            opacity: 0,
        },
    },
    tracksOrderAccordionDetail: {
        maxHeight: '40vh',
        overflow: 'auto',
    },
    toolbarHighlight:
        theme.palette.type === 'light'
            ? {
                color: theme.palette.secondary.main,
                backgroundColor: lighten(theme.palette.secondary.light, 0.85),
            }
            : {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.secondary.dark,
            },
    trackList: {
        flex: '1 1 auto',
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    nameNotFit: {
        color: theme.palette.warning.main,
    },
    durationNotFit: {
        color: theme.palette.error.main,
    },
    timeTooltip: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: '3px',
    },
    durationsSpan: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: theme.spacing(2),
    },
    advancedOptionsAccordion: {
        boxShadow: 'none',
        marginTop: theme.spacing(2),
        '&:before': {
            opacity: 0,
        },
    },
    advancedOptionsAccordionContents: {
        flexDirection: 'column',
    },
    advancedOptionsAccordionSummary: {
        boxShadow: 'none',
        minHeight: '32px !important',
        height: '32px',
        padding: 0,
    },
    advancedOption: {
        width: '100%',
    },
}));

export const ConvertDialog = (props: { files: File[] }) => {
    const dispatch = useDispatch();
    const classes = useStyles();

    let { visible, format, titleFormat, titles } = useShallowEqualSelector(state => state.convertDialog);
    let { fullWidthSupport } = useShallowEqualSelector(state => state.appState);
    let { disc } = useShallowEqualSelector(state => state.main);

    type FileWithMetadata = {
        file: File;
        title: string;
        album: string;
        artist: string;
        duration: number;
        forcedEncoding: UploadFormat | null;
        bytesToSkip: number;
    };
    const [files, setFiles] = useState<FileWithMetadata[]>([]);
    const [selectedTrackIndex, setSelectedTrack] = useState(-1);
    const [availableCharacters, setAvailableCharacters] = useState<{ halfWidth: number; fullWidth: number }>({
        fullWidth: 0,
        halfWidth: 0,
    });
    const [beforeConversionAvailableCharacters, setBeforeConversionAvailableCharacters] = useState<{
        halfWidth: number;
        fullWidth: number;
    }>({ fullWidth: 0, halfWidth: 0 });
    const [beforeConversionAvailableSeconds, setBeforeConversionAvailableSeconds] = useState(0);
    const [availableSeconds, setAvailableSeconds] = useState(0);
    const [availableSPSeconds, setAvailableSPSeconds] = useState(0);
    const [loadingMetadata, setLoadingMetadata] = useState(true);

    const fullWidthCharactersUsed = useMemo(() => {
        return (
            files
                .map(
                    e =>
                        (e.title + e.album + e.artist)
                            .split('')
                            .map(n => n.charCodeAt(0))
                            .filter(
                                n =>
                                    (n >= 0x3040 && n <= 0x309f) || // Hiragana
                                    (n >= 0x4e00 && n <= 0x9faf) || // Kanji
                                    (n >= 0x3400 && n <= 0x4dbf) // Rare kanji
                            ).length
                )
                .filter(e => e > 0).length > 0
        );
    }, [files]);

    const loadMetadataFromFiles = async (files: File[]): Promise<FileWithMetadata[]> => {
        setLoadingMetadata(true);
        let titledFiles = [];
        for (let file of files) {
            let metadata = await getMetadataFromFile(file);
            let forcedEncoding: null | 'ILLEGAL' | { format: 'LP2' | 'LP4'; headerLength: number } = await getATRACWAVEncoding(file);
            if (forcedEncoding === null) {
                forcedEncoding = await getATRACOMAEncoding(file);
            }

            if (forcedEncoding === 'ILLEGAL') {
                window.alert(`Cannot transfer file ${file.name}.`);
            } else {
                titledFiles.push({
                    file,
                    ...metadata,
                    forcedEncoding: forcedEncoding?.format ?? null,
                    bytesToSkip: forcedEncoding?.headerLength ?? 0,
                });
            }
        }
        setLoadingMetadata(false);
        return titledFiles;
    };

    const refreshTitledFiles = useCallback(
        (files: FileWithMetadata[], format: TitleFormatType) => {
            dispatch(
                convertDialogActions.setTitles(
                    files.map(file => {
                        let rawTitle = '';
                        switch (format) {
                            case 'title': {
                                rawTitle = file.title;
                                break;
                            }
                            case 'artist-title': {
                                rawTitle = `${file.artist} - ${file.title}`;
                                break;
                            }
                            case 'title-artist': {
                                rawTitle = `${file.title} - ${file.artist}`;
                                break;
                            }
                            case 'album-title': {
                                rawTitle = `${file.album} - ${file.title}`;
                                break;
                            }
                            case 'artist-album-title': {
                                rawTitle = `${file.artist} - ${file.album} - ${file.title}`;
                                break;
                            }
                            case 'filename': {
                                rawTitle = removeExtension(file.file.name);
                                break;
                            }
                        }
                        const halfWidth = sanitizeHalfWidthTitle(rawTitle);
                        const fullWidth = sanitizeFullWidthTitle(rawTitle);
                        const halfAsFull = sanitizeFullWidthTitle(halfWidth);
                        return {
                            title: halfWidth,
                            fullWidthTitle: fullWidthSupport && fullWidth !== halfAsFull ? fullWidth : '', // If there are no differences between half and full width, skip the full width
                            duration: file.duration,
                            forcedEncoding: file.forcedEncoding as 'LP2' | 'LP4' | null,
                            bytesToSkip: file.bytesToSkip,
                        };
                    })
                )
            );
        },
        [fullWidthSupport, dispatch]
    );

    const renameTrackManually = useCallback(
        index => {
            let track = titles[index];
            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setGroupIndex(null),
                    renameDialogActions.setCurrentName(track.title),
                    renameDialogActions.setCurrentFullWidthName(track.fullWidthTitle),
                    renameDialogActions.setIndex(index),
                    renameDialogActions.setOfConvert(true),
                ])
            );
        },
        [titles, dispatch]
    );

    // Track reordering
    const moveFile = useCallback(
        (offset: number) => {
            const targetIndex = selectedTrackIndex + offset;
            if (targetIndex >= files.length || targetIndex < 0) {
                return; // This should not be allowed by the UI
            }

            const newFileArray = files.slice();

            // Swap trakcs
            let tmp = newFileArray[selectedTrackIndex];
            newFileArray[selectedTrackIndex] = newFileArray[targetIndex];
            newFileArray[targetIndex] = tmp;

            setFiles(newFileArray);
            setSelectedTrack(targetIndex);
        },
        [files, selectedTrackIndex]
    );

    const moveFileUp = useCallback(() => {
        moveFile(-1);
    }, [moveFile]);

    const moveFileDown = useCallback(() => {
        moveFile(1);
    }, [moveFile]);

    const handleClose = useCallback(() => {
        dispatch(convertDialogActions.setVisible(false));
    }, [dispatch]);

    const handleChangeFormat = useCallback(
        (ev, newFormat) => {
            if (newFormat === null) {
                return;
            }
            dispatch(convertDialogActions.setFormat(newFormat));
        },
        [dispatch]
    );

    const handleChangeTitleFormat = useCallback(
        (event: React.ChangeEvent<{ value: any }>) => {
            dispatch(convertDialogActions.setTitleFormat(event.target.value));
        },
        [dispatch]
    );

    const [tracksOrderVisible, setTracksOrderVisible] = useState(false);
    const handleToggleTracksOrder = useCallback(() => {
        setTracksOrderVisible(tracksOrderVisible => !tracksOrderVisible);
    }, [setTracksOrderVisible]);

    const [enableReplayGain, setEnableReplayGain] = useState(false);
    const [enableNormalization, setEnableNormalization] = useState(false);
    const [normalizationTarget, setNormalizationTarget] = useState<number>(-5);

    const handleToggleReplayGain = useCallback(() => {
        setEnableReplayGain(enableReplayGain => !enableReplayGain);
        setEnableNormalization(false);
    }, [setEnableReplayGain, setEnableNormalization]);

    const handleToggleNormalization = useCallback(() => {
        setEnableNormalization(enableNormalization => !enableNormalization);
        setEnableReplayGain(false);
    }, [setEnableNormalization]);
    const handleNormalizationSliderChange = useCallback(
        (evt: any, newValue: number | number[]) => {
            setNormalizationTarget(newValue as number);
        },
        [setNormalizationTarget]
    );

    const handleToggleFullWidthSupport = useCallback(() => {
        dispatch(appActions.setFullWidthSupport(!fullWidthSupport));
    }, [dispatch, fullWidthSupport]);

    const handleConvert = useCallback(() => {
        handleClose();
        setEnableReplayGain(false);
        setEnableNormalization(false);
        dispatch(
            convertAndUpload(
                titles.map((n, i) => ({ ...n, file: files[i].file })),
                format,
                {
                    loudnessTarget: enableNormalization ? normalizationTarget : undefined,
                    enableReplayGain,
                }
            )
        );
    }, [dispatch, handleClose, titles, format, files, normalizationTarget, enableNormalization, enableReplayGain]);

    // Dialog init on new files
    useEffect(() => {
        const newFiles = Array.from(props.files);
        setFiles(newFiles.map(n => ({ file: n, artist: '', album: '', title: '', duration: 0, forcedEncoding: null, bytesToSkip: 0 }))); // If this line isn't present, the dialog doesn't show up
        loadMetadataFromFiles(newFiles)
            .then(withMetadata => {
                setFiles(withMetadata);
            })
            .catch(console.error);
        setSelectedTrack(-1);
        setTracksOrderVisible(false);
        setAvailableCharacters({ halfWidth: 1785, fullWidth: 1785 });
        setAvailableSeconds(1);
        setBeforeConversionAvailableCharacters({ halfWidth: 1, fullWidth: 1 });
        setBeforeConversionAvailableSeconds(1);
    }, [props.files]);

    useEffect(() => {
        if (!disc) return;
        const durationMultiplier = {
            SP: 1,
            LP2: 2,
            LP4: 4,
        }[format];

        let testedDisc = JSON.parse(JSON.stringify(disc)) as Disc;
        let ungrouped = testedDisc.groups.find(n => n.title === null);
        if (!ungrouped) {
            ungrouped = {
                title: null,
                fullWidthTitle: null,
                index: -1,
                tracks: [],
            };
            testedDisc.groups.push(ungrouped);
        }
        for (let track of titles) {
            ungrouped.tracks.push({
                title: track.title,
                fullWidthTitle: track.fullWidthTitle,
            } as Track);
        }
        setAvailableCharacters(getRemainingCharactersForTitles(testedDisc));
        let secondsLeft = (disc.left / 512) * durationMultiplier;
        let totalTracksDuration = titles.reduce((a, b) => a + b.duration, 0);
        setAvailableSeconds(secondsLeft - totalTracksDuration);
        setAvailableSPSeconds(disc.left / 512 - totalTracksDuration / durationMultiplier);
        setBeforeConversionAvailableSeconds(secondsLeft);
        setBeforeConversionAvailableCharacters(getRemainingCharactersForTitles(disc));
    }, [disc, setAvailableCharacters, titles, format]);

    // Reload titles when files changed
    useEffect(() => {
        refreshTitledFiles(files, titleFormat);
    }, [refreshTitledFiles, files, titleFormat]);

    const handleRenameSelectedTrack = useCallback(() => {
        renameTrackManually(selectedTrackIndex);
    }, [selectedTrackIndex, renameTrackManually]);

    // scroll selected track into view
    const selectedTrackRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        selectedTrackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedTrackRef, selectedTrackIndex]);

    const renderTracks = useCallback(() => {
        let currentSeconds = beforeConversionAvailableSeconds;
        let { halfWidth: currentHalfWidthTextLeft, fullWidth: currentFullWidthTextLeft } = beforeConversionAvailableCharacters;
        return titles.map((file, i) => {
            const isSelected = selectedTrackIndex === i;
            const ref = isSelected ? selectedTrackRef : null;
            currentSeconds -= file.duration;
            const { halfWidth, fullWidth } = getCellsForTitle(file as any);
            currentHalfWidthTextLeft -= halfWidth * 7;
            currentFullWidthTextLeft -= fullWidth * 7;
            return (
                <ListItem
                    key={`${i}`}
                    disableGutters={true}
                    onDoubleClick={() => renameTrackManually(i)}
                    onClick={() => setSelectedTrack(i)}
                    ref={ref}
                    button
                >
                    <ListItemIcon>
                        <Radio checked={isSelected} value={`track-${i}`} size="small" />
                    </ListItemIcon>
                    <ListItemText
                        className={
                            currentSeconds <= 0
                                ? classes.durationNotFit
                                : currentHalfWidthTextLeft < 0 || currentFullWidthTextLeft < 0
                                    ? classes.nameNotFit
                                    : undefined
                        }
                        primary={`${file.fullWidthTitle && file.fullWidthTitle + ' / '}${file.title}`}
                        secondary={`${secondsToNormal(file.duration)} ${file.forcedEncoding ? `(${file.forcedEncoding})` : ''}`}
                    />
                </ListItem>
            );
        });
    }, [
        titles,
        selectedTrackIndex,
        setSelectedTrack,
        selectedTrackRef,
        renameTrackManually,
        beforeConversionAvailableCharacters,
        beforeConversionAvailableSeconds,
        classes.durationNotFit,
        classes.nameNotFit,
    ]);

    // Add/Remove tracks
    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: File[]) => {
            const bannedTypes = ['audio/mpegurl', 'audio/x-mpegurl'];
            const accepted = acceptedFiles.filter(n => !bannedTypes.includes(n.type));
            if (accepted.length > 0) {
                loadMetadataFromFiles(accepted)
                    .then(acceptedTitledFiles => {
                        setFiles(files => files.slice().concat(acceptedTitledFiles));
                    })
                    .catch(console.error);
            }
        },
        [setFiles]
    );
    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: [`audio/*`, `video/mp4`, `video/webm`, `.oma`, `.at3`],
        noClick: true,
    });
    const disableRemove = selectedTrackIndex < 0 || selectedTrackIndex >= files.length;
    const handleRemoveSelectedTrack = useCallback(() => {
        const newFileArray = files.filter((f, i) => i !== selectedTrackIndex);
        setFiles(newFileArray);
        if (selectedTrackIndex >= newFileArray.length) {
            setSelectedTrack(newFileArray.length - 1);
        }
    }, [selectedTrackIndex, files, setFiles]);

    const dialogVisible = useShallowEqualSelector(state => state.convertDialog.visible);
    useEffect(() => {
        if (dialogVisible && files.length === 0) {
            handleClose();
        }
    }, [files, dialogVisible, handleClose]);

    const vintageMode = useShallowEqualSelector(state => state.appState.vintageMode);
    if (vintageMode) {
        const p = {
            visible,
            format,
            titleFormat,

            titles,
            selectedTrackIndex,
            setSelectedTrack,

            availableCharacters,
            availableSeconds,
            loadingMetadata,

            renameTrackManually,

            moveFileUp,
            moveFileDown,

            handleClose,
            handleChangeFormat,
            handleChangeTitleFormat,
            handleConvert,

            tracksOrderVisible,
            setTracksOrderVisible,
            handleToggleTracksOrder,
            selectedTrackRef,

            getRootProps,
            getInputProps,
            isDragActive,
            open,

            disableRemove,
            handleRemoveSelectedTrack,
            handleRenameSelectedTrack,
            dialogVisible,
        };
        return <W95ConvertDialog {...p} />;
    }

    return (
        <Dialog
            open={visible}
            maxWidth={'xs'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="convert-dialog-slide-title"
            aria-describedby="convert-dialog-slide-description"
        >
            <DialogTitle id="convert-dialog-slide-title">Upload Settings</DialogTitle>
            <DialogContent className={classes.dialogContent}>
                <div className={classes.formatAndTitle}>
                    <FormControl>
                        <Typography component="label" variant="caption" color="textSecondary">
                            Recording Mode
                        </Typography>
                        <ToggleButtonGroup value={format} exclusive onChange={handleChangeFormat} size="small">
                            <ToggleButton className={classes.toggleButton} value="SP">
                                SP
                            </ToggleButton>
                            <ToggleButton className={classes.toggleButton} value="LP2">
                                LP2
                            </ToggleButton>
                            <ToggleButton className={classes.toggleButton} value="LP4">
                                LP4
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </FormControl>
                    <div className={classes.rightBlock}>
                        <FormControl className={classes.formControl}>
                            <Typography component="label" variant="caption" color="textSecondary">
                                Track title
                            </Typography>
                            <FormControl className={classes.titleFormControl}>
                                <Select value={titleFormat} color="secondary" input={<Input />} onChange={handleChangeTitleFormat}>
                                    <MenuItem value={`filename`}>Filename</MenuItem>
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
                <div></div>
                <Typography
                    component="h3"
                    className={classes.nameNotFit}
                    hidden={availableCharacters.halfWidth > 0 && availableCharacters.fullWidth > 0}
                    style={{ marginTop: '1em' }}
                    align="center"
                >
                    Warning: You have used up all the available{' '}
                    {[availableCharacters.halfWidth > 0 ? 'half' : null, availableCharacters.fullWidth > 0 ? 'full' : null]
                        .filter(n => n !== null)
                        .join(' and ')}{' '}
                    width characters. Some titles might get cut off.
                </Typography>
                <Typography
                    component="h3"
                    className={classes.durationNotFit}
                    hidden={availableSeconds >= 0}
                    style={{ marginTop: '1em' }}
                    align="center"
                >
                    Warning: You have used up all the available space on the disc.
                </Typography>
                <span className={classes.durationsSpan}>
                    <Typography component="h3" align="center" hidden={loadingMetadata}>
                        Total:{' '}
                        <Tooltip
                            title={
                                <React.Fragment>
                                    <span>{`${secondsToNormal(((disc?.left ?? 0) / 512 - availableSPSeconds) * 2)} in LP2 Mode`}</span>
                                    <br />
                                    <span>{`${secondsToNormal(((disc?.left ?? 0) / 512 - availableSPSeconds) * 4)} in LP4 Mode`}</span>
                                </React.Fragment>
                            }
                            arrow
                        >
                            <span className={classes.timeTooltip}>
                                {secondsToNormal((disc?.left ?? 0) / 512 - availableSPSeconds)} SP time{' '}
                            </span>
                        </Tooltip>
                    </Typography>
                    <Typography
                        component="h3"
                        align="center"
                        hidden={loadingMetadata}
                        className={clsx({ [classes.durationNotFit]: availableSPSeconds <= 0 })}
                    >
                        Remaining:{' '}
                        <Tooltip
                            title={
                                <React.Fragment>
                                    <span>{`${secondsToNormal(availableSPSeconds * 2)} in LP2 Mode`}</span>
                                    <br />
                                    <span>{`${secondsToNormal(availableSPSeconds * 4)} in LP4 Mode`}</span>
                                </React.Fragment>
                            }
                            arrow
                        >
                            <span className={classes.timeTooltip}>{secondsToNormal(availableSPSeconds)} SP time </span>
                        </Tooltip>
                    </Typography>
                </span>
                {!fullWidthSupport && fullWidthCharactersUsed ? (
                    <Typography color="error" component="p">
                        You seem to be trying to enter full-width text into the half-width slot.{' '}
                        <Link onClick={handleToggleFullWidthSupport} color="error" underline="always" style={{ cursor: 'pointer' }}>
                            Enable full-width title support
                        </Link>
                        ?
                    </Typography>
                ) : null}

                <Typography component="h3" color="error" hidden={!loadingMetadata} style={{ marginTop: '1em' }} align="center">
                    Reading Metadata...
                </Typography>
                <Accordion expanded={tracksOrderVisible} className={classes.tracksOrderAccordion} square={true}>
                    <div></div>
                    <div {...getRootProps()} style={{ outline: 'none' }}>
                        <Toolbar variant="dense" className={classes.toolbarHighlight}>
                            <IconButton edge="start" aria-label="add track" onClick={open}>
                                <AddIcon />
                            </IconButton>
                            <IconButton edge="start" aria-label="remove track" onClick={handleRemoveSelectedTrack} disabled={disableRemove}>
                                <RemoveIcon />
                            </IconButton>
                            <IconButton edge="start" aria-label="rename track" onClick={handleRenameSelectedTrack} disabled={disableRemove}>
                                <TitleIcon />
                            </IconButton>
                            <div className={classes.spacer}></div>
                            <IconButton edge="end" aria-label="move up" onClick={moveFileDown}>
                                <ExpandMoreIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="move down" onClick={moveFileUp}>
                                <ExpandLessIcon />
                            </IconButton>
                        </Toolbar>
                        <AccordionDetails className={classes.tracksOrderAccordionDetail}>
                            <List dense={true} disablePadding={false} className={classes.trackList}>
                                {renderTracks()}
                            </List>
                        </AccordionDetails>
                        <Backdrop className={classes.backdrop} open={isDragActive}>
                            Drop your Music to add it to the queue
                        </Backdrop>
                        <input {...getInputProps()} />
                    </div>
                </Accordion>
                <Accordion className={classes.advancedOptionsAccordion} square={true}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.advancedOptionsAccordionSummary}>
                        Advanced Options
                    </AccordionSummary>
                    <AccordionDetails className={classes.advancedOptionsAccordionContents}>
                        <FormControlLabel
                            label={`Enable full width titles support`}
                            className={classes.advancedOption}
                            control={<Checkbox checked={fullWidthSupport} onChange={handleToggleFullWidthSupport} />}
                        />

                        <FormControlLabel
                            label={`Use ReplayGain`}
                            className={classes.advancedOption}
                            control={<Checkbox checked={enableReplayGain} onChange={handleToggleReplayGain} />}
                        />
                        <FormControlLabel
                            label={`Normalize tracks${enableNormalization ? ` to ${normalizationTarget} dB` : ''}`}
                            className={classes.advancedOption}
                            control={<Checkbox checked={enableNormalization} onChange={handleToggleNormalization} />}
                        />
                        <Slider
                            min={-70}
                            max={-5}
                            step={0.2}
                            marks={[
                                { value: -70, label: '-70dB' },
                                { value: -5, label: '-5dB' },
                            ]}
                            className={classes.advancedOption}
                            value={normalizationTarget}
                            onChange={handleNormalizationSliderChange}
                            disabled={!enableNormalization}
                        />
                    </AccordionDetails>
                </Accordion>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleToggleTracksOrder} disabled={loadingMetadata} className={classes.showTracksOrderBtn}>
                    {`${tracksOrderVisible ? 'Hide' : 'Show'} Tracks`}
                </Button>
                <div className={classes.spacer}></div>
                <Button onClick={handleClose} disabled={loadingMetadata}>
                    Cancel
                </Button>
                <Button onClick={handleConvert} disabled={loadingMetadata || availableSeconds < 0}>
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    );
};
